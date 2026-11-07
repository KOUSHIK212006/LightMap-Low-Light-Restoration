from __future__ import annotations

import importlib
import time
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance

from app.services.image_io import encode_image_to_data_url


def _sanitize_analysis_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _sanitize_analysis_payload(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_sanitize_analysis_payload(item) for item in value]
    if isinstance(value, (np.floating, float, np.integer, int)):
        return float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    return value


def import_optional_module(module_path: str, symbol_name: str):
    try:
        module = importlib.import_module(module_path)
        return getattr(module, symbol_name)
    except (ImportError, AttributeError, ModuleNotFoundError):
        return None


class RestorationService:
    def __init__(self) -> None:
        self.classical_analyzer = import_optional_module("classical_cv.classical_pipeline", "analyze_image")
        self.classical_enhancer = import_optional_module("classical_cv.classical_pipeline", "enhance_classical")
        self.classical_quality_fn = import_optional_module("classical_cv.classical_pipeline", "validate_restoration_quality")
        self.deep_enhancer = import_optional_module("ai_engine.inference", "enhance_deep")
        self.deep_availability_fn = import_optional_module("ai_engine.inference", "is_model_available")
        self.fusion_fn = import_optional_module("ai_engine.adaptive_fusion", "adaptive_fusion")
        self.quality_fn = import_optional_module("ai_engine.quality_guardian", "check_quality")

    def _normalize_image(self, image: np.ndarray | Image.Image) -> np.ndarray | None:
        if image is None:
            return None

        if isinstance(image, Image.Image):
            array = np.asarray(image.convert("RGB"), dtype=np.uint8)
        else:
            array = np.asarray(image, dtype=np.uint8)

        if array.ndim != 3 or array.shape[2] != 3:
            return None
        return np.ascontiguousarray(array, dtype=np.uint8)

    def _validate_output(self, output: Any, expected_shape: tuple[int, int, int] | None = None) -> np.ndarray | None:
        if output is None:
            return None
        normalized = self._normalize_image(output)
        if normalized is None:
            return None
        if expected_shape is not None and normalized.shape != expected_shape:
            return None
        if not np.isfinite(normalized).all():
            return None
        return normalized

    def _extract_image_result(self, result: Any) -> np.ndarray | None:
        if isinstance(result, np.ndarray):
            return result
        if isinstance(result, dict) and "image" in result:
            return result["image"]
        return None

    def analyze(self, image: np.ndarray, profile: str = "natural") -> dict[str, Any]:
        normalized_image = self._normalize_image(image)
        if normalized_image is None:
            return {}

        if self.classical_analyzer is not None:
            try:
                analysis = self.classical_analyzer(normalized_image)
                analysis["profile"] = profile
                analysis["source"] = "classical_cv"
                return _sanitize_analysis_payload(analysis)
            except Exception:
                pass

        # Fallback minimal analysis if classical_analyzer is unavailable
        gray = np.dot(normalized_image[..., :3].astype(float), [0.299, 0.587, 0.114])
        mean_b = float(np.mean(gray))
        contrast = float(np.std(gray))
        return {
            "mean_brightness": mean_b,
            "contrast_score": contrast,
            "noise_score": 0.0,
            "highlight_clipping_ratio": float(np.mean(gray >= 252)),
            "profile": profile,
            "source": "fallback",
            "image_dimensions": {
                "height": normalized_image.shape[0],
                "width": normalized_image.shape[1],
                "channels": 3,
            },
        }

    def _demo_enhance(self, image: np.ndarray, profile: str = "natural") -> np.ndarray:
        pil_image = Image.fromarray(image)
        enhanced = ImageEnhance.Brightness(pil_image).enhance(1.4)
        enhanced = ImageEnhance.Contrast(enhanced).enhance(1.2)
        if profile in ("visibility", "maximum_visibility"):
            enhanced = ImageEnhance.Brightness(enhanced).enhance(1.25)
        elif profile in ("detail", "detail_preservation"):
            enhanced = ImageEnhance.Contrast(enhanced).enhance(1.4)
        return np.asarray(enhanced, dtype=np.uint8)

    def _call_classical_branch(self, image: np.ndarray, profile: str, analysis: dict | None) -> tuple[np.ndarray | None, str | None]:
        if self.classical_enhancer is None:
            return None, "Classical enhancement module is not available."

        try:
            result = self.classical_enhancer(image, analysis=analysis, profile=profile)
            output = self._extract_image_result(result)
            return output, None
        except Exception as exc:
            return None, f"Classical enhancement failed: {exc}"

    def _call_deep_branch(self, image: np.ndarray, profile: str) -> tuple[np.ndarray | None, str | None]:
        if self.deep_enhancer is None:
            return None, "Deep-learning module is not available in the environment."

        if self.deep_availability_fn is not None:
            available, reason = self.deep_availability_fn()
            if not available:
                return None, f"Deep-learning model unavailable: {reason}"

        try:
            result = self.deep_enhancer(image, model_name="retinexformer")
            output = self._extract_image_result(result)
            return output, None
        except Exception as exc:
            return None, f"Deep-learning enhancement failed: {exc}"

    def _call_fusion_branch(
        self, image: np.ndarray, classical_output: np.ndarray, deep_output: np.ndarray, analysis: dict | None
    ) -> tuple[np.ndarray | None, np.ndarray | None, np.ndarray | None, str | None]:
        if self.fusion_fn is None:
            return None, None, None, "Adaptive fusion module is not available."
        if classical_output is None or deep_output is None:
            return None, None, None, "Fusion requires both classical and deep branch outputs."

        try:
            result = self.fusion_fn(image, classical_output, deep_output, analysis=analysis)
            output = self._extract_image_result(result)
            fusion_map = result.get("fusion_map") if isinstance(result, dict) else None
            disagreement = result.get("branch_disagreement_map") if isinstance(result, dict) else None
            return output, fusion_map, disagreement, None
        except Exception as exc:
            return None, None, None, f"Adaptive fusion failed: {exc}"

    def _call_quality_check(self, original: np.ndarray, enhanced: np.ndarray, analysis: dict | None) -> dict[str, Any]:
        report: dict[str, Any] = {"is_acceptable": True, "passed": True, "warnings": [], "checks": {}}

        # Run Krishank's Quality Guardian if available
        if self.quality_fn is not None:
            try:
                q_res = self.quality_fn(original, enhanced, analysis=analysis)
                if isinstance(q_res, dict):
                    report["passed"] = q_res.get("passed", True)
                    report["checks"] = q_res.get("checks", {})
                    if q_res.get("warnings"):
                        report["warnings"].extend(q_res["warnings"])
            except Exception:
                pass

        # Run Classical quality validation function
        if self.classical_quality_fn is not None:
            try:
                c_res = self.classical_quality_fn(original, enhanced, analysis=analysis)
                if isinstance(c_res, dict):
                    report["is_acceptable"] = c_res.get("is_acceptable", True)
                    report["classical_status"] = c_res.get("status", "unknown")
                    if c_res.get("flags"):
                        report["classical_flags"] = c_res["flags"]
                        for flag in c_res["flags"]:
                            report["warnings"].append(f"Quality Guardian flag: {flag.replace('_', ' ')}.")
            except Exception:
                pass

        report["status"] = "passed" if (report["is_acceptable"] and report["passed"]) else "flagged_degradation"
        return _sanitize_analysis_payload(report)

    def enhance(self, image: np.ndarray, profile: str = "natural", method: str = "hybrid") -> dict[str, Any]:
        start_time = time.time()
        normalized_image = self._normalize_image(image)
        if normalized_image is None:
            raise ValueError("Invalid image input: expected a valid RGB image.")

        expected_shape = normalized_image.shape
        analysis = self.analyze(normalized_image, profile=profile)
        warnings: list[str] = []

        norm_method = method.strip().lower() if method else "hybrid"
        if norm_method not in ("classical", "deep", "hybrid"):
            norm_method = "hybrid"

        norm_profile = profile.strip().lower() if profile else "natural"

        classical_output: np.ndarray | None = None
        deep_output: np.ndarray | None = None
        hybrid_output: np.ndarray | None = None
        fusion_map: np.ndarray | None = None
        branch_disagreement_map: np.ndarray | None = None

        retry_count = 0
        retry_applied = False
        demo_mode = False
        retry_applied = False

        # --- 1. Execute Classical Branch (if requested or for hybrid) ---
        if norm_method in ("classical", "hybrid"):
            c_out, c_warn = self._call_classical_branch(normalized_image, norm_profile, analysis)
            if c_warn:
                warnings.append(c_warn)
            classical_output = self._validate_output(c_out, expected_shape)

        # --- 2. Execute Deep Learning Branch (if requested or for hybrid) ---
        if norm_method in ("deep", "hybrid"):
            d_out, d_warn = self._call_deep_branch(normalized_image, norm_profile)
            if d_warn:
                warnings.append(d_warn)
            deep_output = self._validate_output(d_out, expected_shape)

        # --- 3. Evaluate Method Selection & Fallback Handling ---
        if norm_method == "deep":
            if deep_output is None:
                # Deep learning explicitly requested but failed/unavailable: report clear failure
                elapsed_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "status": "failed",
                    "message": "Deep learning restoration failed: Retinexformer model or weights unavailable.",
                    "profile": norm_profile,
                    "method": "deep",
                    "selected_method": "deep",
                    "processing_status": "failed",
                    "analysis": _sanitize_analysis_payload(analysis),
                    "restored_analysis": None,
                    "final_image": None,
                    "classical_output": None,
                    "deep_output": None,
                    "hybrid_output": None,
                    "fusion_map": None,
                    "branch_disagreement_map": None,
                    "quality_report": None,
                    "timings": {"processing_ms": elapsed_ms},
                    "timing": {"processing_ms": elapsed_ms},
                    "warnings": warnings,
                    "retry_count": 0,
                    "retry_applied": False,
                    "demo_mode": demo_mode,
                }
            final_output = deep_output
            selected_method = "deep"
            processing_status = "success"

        elif norm_method == "classical":
            if classical_output is None:
                raise RuntimeError("Classical restoration failed to generate a valid output.")
            final_output = classical_output
            selected_method = "classical"
            processing_status = "success"

        else:
            # Hybrid mode: attempt fusion if both branches succeed
            if classical_output is not None and deep_output is not None:
                h_out, f_map, d_map, h_warn = self._call_fusion_branch(
                    normalized_image, classical_output, deep_output, analysis
                )
                if h_warn:
                    warnings.append(h_warn)
                hybrid_output = self._validate_output(h_out, expected_shape)
                fusion_map = f_map
                branch_disagreement_map = d_map

            if hybrid_output is not None:
                final_output = hybrid_output
                selected_method = "hybrid"
                processing_status = "success"
            elif classical_output is not None:
                final_output = classical_output
                selected_method = "classical"
                processing_status = "success"
                warnings.append(
                    "Deep-learning model unavailable or checkpoint missing; fallen back to Classical CV. "
                    "This is NOT a hybrid result."
                )
            elif deep_output is not None:
                final_output = deep_output
                selected_method = "deep"
                processing_status = "fallback_deep"
                warnings.append("Classical restoration unavailable; using deep learning output.")
            else:
                demo_output = self._demo_enhance(normalized_image, profile=norm_profile)
                warnings.append("Neither restoration branch produced a valid output; using the documented demo fallback.")
                final_output = demo_output
                selected_method = "demo"
                processing_status = "demo_fallback"
                demo_mode = True

        # --- 4. Quality Guardian Check ---
        quality_report = self._call_quality_check(normalized_image, final_output, analysis)

        # --- 5. Bounded Retry Logic ---
        # If quality failed and profile was non-natural, retry once with "natural" profile
        if not quality_report.get("is_acceptable", True) and norm_profile not in ("natural", "default"):
            retry_count = 1
            retry_c_out, _ = self._call_classical_branch(normalized_image, "natural", analysis)
            retry_validated = self._validate_output(retry_c_out, expected_shape)
            if retry_validated is not None:
                retry_q = self._call_quality_check(normalized_image, retry_validated, analysis)
                if retry_q.get("is_acceptable", True):
                    final_output = retry_validated
                    selected_method = "classical"
                    processing_status = "retry_success"
                    retry_applied = True
                    quality_report = retry_q
                    warnings.append(
                        f"Quality degradation detected on '{norm_profile}' profile; "
                        "bounded retry automatically stabilized restoration with 'natural' profile."
                    )

        if quality_report.get("warnings"):
            for w in quality_report["warnings"]:
                if w not in warnings:
                    warnings.append(w)

        # --- 6. Post-Restoration Analysis & Serialization ---
        restored_analysis = self.analyze(final_output, profile=norm_profile)
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "status": "success",
            "message": "Restoration pipeline completed successfully.",
            "profile": norm_profile,
            "method": norm_method,
            "selected_method": selected_method,
            "processing_status": processing_status,
            "analysis": _sanitize_analysis_payload(analysis),
            "restored_analysis": _sanitize_analysis_payload(restored_analysis),
            "final_image": encode_image_to_data_url(final_output),
            "classical_output": encode_image_to_data_url(classical_output) if classical_output is not None else None,
            "deep_output": encode_image_to_data_url(deep_output) if deep_output is not None else None,
            "hybrid_output": encode_image_to_data_url(hybrid_output) if hybrid_output is not None else None,
            "fusion_map": encode_image_to_data_url(fusion_map) if fusion_map is not None else None,
            "branch_disagreement_map": encode_image_to_data_url(branch_disagreement_map) if branch_disagreement_map is not None else None,
            "quality_report": quality_report,
            "timings": {"processing_ms": elapsed_ms},
            "timing": {"processing_ms": elapsed_ms},
            "warnings": warnings,
            "retry_count": retry_count,
            "retry_applied": retry_applied,
            "demo_mode": demo_mode,
        }

    def compare(self, image: np.ndarray, profile: str = "natural", method: str = "hybrid") -> dict[str, Any]:
        result = self.enhance(image, profile=profile, method=method)
        return {
            "message": "Comparison request accepted.",
            "profile": profile,
            "method": method,
            "selected_method": result.get("selected_method", "classical"),
            "processing_status": result.get("processing_status", "success"),
            "original_image": encode_image_to_data_url(self._normalize_image(image)),
            "final_image": result.get("final_image"),
            "classical_image": result.get("classical_output"),
            "deep_image": result.get("deep_output"),
            "hybrid_image": result.get("hybrid_output"),
            "fusion_map": result.get("fusion_map"),
            "branch_disagreement_map": result.get("branch_disagreement_map"),
            "analysis": result.get("analysis"),
            "warnings": result.get("warnings", []),
            "timings": result.get("timings", result.get("timing", {})),
            "timing": result.get("timing", {}),
        }
