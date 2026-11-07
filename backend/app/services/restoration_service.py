from __future__ import annotations

import importlib
import time
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageEnhance

from app.services.image_io import encode_image_to_data_url


def _sanitize_analysis_payload(value):
    if isinstance(value, np.ndarray):
        if value.size == 0:
            return None
        return value.tolist()
    if isinstance(value, dict):
        return {str(key): _sanitize_analysis_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_analysis_payload(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_analysis_payload(item) for item in value]
    if isinstance(value, (np.floating, float, np.integer, int)):
        return float(value)
    if isinstance(value, np.bool_):
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
        self.deep_enhancer = import_optional_module("ai_engine.inference", "enhance_deep")
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

    def _extract_image_result(self, result: Any) -> np.ndarray | None:
        if result is None:
            return None

        if isinstance(result, np.ndarray):
            return self._normalize_image(result)

        if isinstance(result, dict):
            for key in ("image", "output", "enhanced", "final"):
                value = result.get(key)
                extracted = self._extract_image_result(value)
                if extracted is not None:
                    return extracted
            return None

        if isinstance(result, (list, tuple)) and result:
            for item in result:
                extracted = self._extract_image_result(item)
                if extracted is not None:
                    return extracted

        return self._normalize_image(result)

    def analyze(self, image: np.ndarray, profile: str = "natural") -> dict[str, Any]:
        array = self._normalize_image(image)
        if array is None:
            raise ValueError("Image must have shape (height, width, 3) with RGB channels.")

        measurements = {
            "mean_brightness": float(np.mean(array)),
            "contrast_score": float(np.std(array)),
            "noise_score": float(np.std(array[:, :, 0] - array[:, :, 1])),
            "highlight_clipping_ratio": 0.0,
            "edge_score": float(np.std(np.abs(np.gradient(array[:, :, 0])))),
            "profile": profile,
            "source": "demo_analysis",
        }

        if self.classical_analyzer is not None:
            try:
                result = self.classical_analyzer(array)
                if isinstance(result, dict):
                    measurements = {**measurements, **result}
            except Exception:
                measurements["warnings"] = [
                    "Classical image analyzer was present but raised an exception during analysis."
                ]

        return _sanitize_analysis_payload(measurements)

    def _demo_enhance(self, image: np.ndarray, profile: str = "natural") -> np.ndarray:
        image_array = self._normalize_image(image)
        if image_array is None:
            raise ValueError("Image must have shape (height, width, 3) with RGB channels.")

        pil_image = Image.fromarray(image_array, mode="RGB")
        enhanced = ImageEnhance.Contrast(pil_image).enhance(1.25)
        enhanced = ImageEnhance.Brightness(enhanced).enhance(1.1)

        if profile == "visibility":
            enhanced = ImageEnhance.Brightness(enhanced).enhance(1.25)
        elif profile == "detail":
            enhanced = ImageEnhance.Contrast(enhanced).enhance(1.4)

        return np.asarray(enhanced, dtype=np.uint8)

    def _call_classical_branch(self, image, profile, analysis):
        if self.classical_enhancer is None:
            return None, [], "Classical enhancement module is not available."

        try:
            try:
                result = self.classical_enhancer(image, analysis=analysis, profile=profile, return_stages=True)
            except TypeError:
                result = self.classical_enhancer(image, analysis=analysis, profile=profile)
            output = self._extract_image_result(result)
            stages = []
            if isinstance(result, dict) and "stages" in result:
                for st in result["stages"]:
                    img_data = encode_image_to_data_url(st["image"])
                    stages.append({
                        "name": st["name"],
                        "description": st.get("description", ""),
                        "image": img_data,
                        "params": st.get("params", {}),
                        "metrics": st.get("metrics", {}),
                    })
            return output, stages, None
        except Exception as exc:  # pragma: no cover - defensive handling
            return None, [], f"Classical enhancement failed: {exc}"

    def _call_deep_branch(self, image, profile):
        if self.deep_enhancer is None:
            return None, "Deep-learning enhancement module is not available."

        try:
            kwargs = {"model_name": "retinexformer"}
            try:
                result = self.deep_enhancer(image, **kwargs, profile=profile)
            except TypeError:
                result = self.deep_enhancer(image, **kwargs)
            output = self._extract_image_result(result)
            return output, None
        except Exception as exc:  # pragma: no cover - defensive handling
            return None, f"Deep-learning enhancement failed: {exc}"

    def _validate_map(self, map_data):
        if map_data is None:
            return None
        arr = np.asarray(map_data, dtype=np.uint8)
        if arr.ndim == 2:
            return np.ascontiguousarray(np.stack([arr, arr, arr], axis=-1))
        elif arr.ndim == 3 and arr.shape[2] == 1:
            return np.ascontiguousarray(np.repeat(arr, 3, axis=2))
        elif arr.ndim == 3 and arr.shape[2] == 3:
            return np.ascontiguousarray(arr)
        return None

    def _call_fusion_branch(self, image, classical_output, deep_output, analysis):
        if self.fusion_fn is None:
            return None, None, None, "Adaptive fusion module is not available."
        if classical_output is None or deep_output is None:
            return None, None, None, "Fusion requires both branch outputs."

        try:
            result = self.fusion_fn(image, classical_output, deep_output, analysis=analysis)
            output = self._extract_image_result(result)
            fusion_map = None
            disagreement_map = None
            if isinstance(result, dict):
                fusion_map = self._validate_map(result.get("fusion_map"))
                raw_disagreement = result.get("branch_disagreement_map")
                if raw_disagreement is None:
                    raw_disagreement = result.get("disagreement_map")
                disagreement_map = self._validate_map(raw_disagreement)
            return output, fusion_map, disagreement_map, None
        except Exception as exc:  # pragma: no cover - exercise defensive handling
            return None, None, None, f"Adaptive fusion failed: {exc}"

    def _call_quality_check(self, image, final_output, analysis):
        if self.quality_fn is None:
            return {"status": "quality_check_unavailable", "warnings": ["Quality check module is not available."]}

        try:
            result = self.quality_fn(image, final_output, analysis=analysis)
            if isinstance(result, dict):
                return _sanitize_analysis_payload(result)
            return {"status": "quality_check_not_available", "warnings": ["Quality check returned no payload."]}
        except Exception as exc:  # pragma: no cover - exercise defensive handling
            return {"status": "quality_check_failed", "warnings": [f"Quality check failed: {exc}"]}

    def _apply_bounded_correction(self, original, candidate_output, analysis, max_retries=3):
        """
        Bounded correction mechanism (Section 6.4 of implementation.md).
        1. Evaluate candidate output against quality constraints.
        2. If constraints are violated, adjust parameters.
        3. Re-evaluate.
        4. Bounded to a maximum number of attempts (max_retries).
        5. Returns the best output and the updated quality report.
        """
        current_img = candidate_output.copy()
        corrections = []
        best_report = self._call_quality_check(original, current_img, analysis)
        retries = 0

        for attempt in range(1, max_retries + 1):
            if best_report.get("passed", False):
                break

            checks = best_report.get("checks", {})
            warnings = best_report.get("warnings", [])
            adjusted = False

            # Check 1: Excessive brightness
            if checks.get("brightness_increase", 0) > 0.45 or any("bright" in str(w).lower() for w in warnings):
                factor = 0.92
                current_img = np.clip(current_img.astype(np.float32) * factor, 0, 255).astype(np.uint8)
                corrections.append(f"Attempt {attempt}: Applied brightness damping factor {factor}")
                adjusted = True

            # Check 2: Highlight clipping
            if checks.get("clipping_increase", 0) > 0.04 or any("clipping" in str(w).lower() for w in warnings):
                mask = current_img >= 245
                current_img[mask] = np.clip(current_img[mask].astype(np.float32) * 0.95, 0, 255).astype(np.uint8)
                corrections.append(f"Attempt {attempt}: Soft-clipped highlights above threshold")
                adjusted = True

            if not adjusted:
                break

            retries = attempt
            best_report = self._call_quality_check(original, current_img, analysis)

        if isinstance(best_report, dict):
            best_report["retry_count"] = retries
            best_report["corrections_applied"] = corrections

        return current_img, best_report

    def _validate_output(self, output):
        if output is None:
            return None
        array = self._normalize_image(output)
        if array is None:
            return None
        return array

    def _compute_change_map(self, original: np.ndarray, restored: np.ndarray) -> np.ndarray:
        diff = np.abs(restored.astype(np.float32) - original.astype(np.float32))
        diff_luma = 0.299 * diff[:, :, 0] + 0.587 * diff[:, :, 1] + 0.114 * diff[:, :, 2]
        max_val = float(np.max(diff_luma))
        if max_val > 0:
            norm = (diff_luma / max_val * 255.0).astype(np.uint8)
        else:
            norm = diff_luma.astype(np.uint8)
        heatmap = cv2.applyColorMap(norm, cv2.COLORMAP_VIRIDIS)
        return cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    def _compute_change_stats(self, original: np.ndarray, restored: np.ndarray) -> dict[str, Any]:
        orig_luma = 0.299 * original[:, :, 0] + 0.587 * original[:, :, 1] + 0.114 * original[:, :, 2]
        rest_luma = 0.299 * restored[:, :, 0] + 0.587 * restored[:, :, 1] + 0.114 * restored[:, :, 2]
        delta = rest_luma - orig_luma
        total_pixels = max(1.0, float(delta.size))
        brightened = float(np.sum(delta > 3.0)) / total_pixels * 100.0
        darkened = float(np.sum(delta < -3.0)) / total_pixels * 100.0
        unchanged = max(0.0, 100.0 - brightened - darkened)
        return {
            "pct_brightened": round(brightened, 1),
            "pct_unchanged": round(unchanged, 1),
            "pct_darkened": round(darkened, 1),
            "mean_delta": round(float(np.mean(np.abs(delta))), 2),
            "max_delta": round(float(np.max(np.abs(delta))), 2),
        }

    def _compute_histograms(self, original: np.ndarray, restored: np.ndarray) -> dict[str, Any]:
        def get_hist(arr):
            r = np.histogram(arr[:, :, 0], bins=256, range=(0, 256))[0].tolist()
            g = np.histogram(arr[:, :, 1], bins=256, range=(0, 256))[0].tolist()
            b = np.histogram(arr[:, :, 2], bins=256, range=(0, 256))[0].tolist()
            luma = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
            l = np.histogram(luma, bins=256, range=(0, 256))[0].tolist()
            return {"r": r, "g": g, "b": b, "luma": l}
        return {
            "original": get_hist(original),
            "restored": get_hist(restored),
        }

    def _compute_grid_stats(self, original: np.ndarray, restored: np.ndarray, grid_size: int = 4) -> list[dict[str, Any]]:
        h, w, _ = original.shape
        cell_h = max(1, h // grid_size)
        cell_w = max(1, w // grid_size)
        cells = []
        for r in range(grid_size):
            for c in range(grid_size):
                y1 = r * cell_h
                y2 = (r + 1) * cell_h if r < grid_size - 1 else h
                x1 = c * cell_w
                x2 = (c + 1) * cell_w if c < grid_size - 1 else w
                orig_patch = original[y1:y2, x1:x2]
                rest_patch = restored[y1:y2, x1:x2]
                o_lum = 0.299 * orig_patch[:, :, 0] + 0.587 * orig_patch[:, :, 1] + 0.114 * orig_patch[:, :, 2]
                r_lum = 0.299 * rest_patch[:, :, 0] + 0.587 * rest_patch[:, :, 1] + 0.114 * rest_patch[:, :, 2]
                b_before = float(np.mean(o_lum))
                b_after = float(np.mean(r_lum))
                c_before = float(np.std(o_lum))
                c_after = float(np.std(r_lum))
                cells.append({
                    "row": r,
                    "col": c,
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                    "brightness_before": round(b_before, 1),
                    "brightness_after": round(b_after, 1),
                    "brightness_gain": round(b_after - b_before, 1),
                    "contrast_before": round(c_before, 1),
                    "contrast_after": round(c_after, 1),
                    "noise_before": round(float(cv2.Laplacian(o_lum.astype(np.float32), cv2.CV_32F).var()), 1),
                    "noise_after": round(float(cv2.Laplacian(r_lum.astype(np.float32), cv2.CV_32F).var()), 1),
                })
        return cells

    def _compute_method_metrics(self, original: np.ndarray, outputs: dict[str, np.ndarray | None]) -> dict[str, Any]:
        metrics = {}
        for name, arr in outputs.items():
            if arr is None:
                continue
            lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
            clip = float(np.mean((arr >= 250) | (arr <= 5))) * 100.0
            edge = float(cv2.Laplacian(lum.astype(np.float32), cv2.CV_32F).std())
            metrics[name] = {
                "mean_brightness": round(float(np.mean(lum)), 1),
                "contrast": round(float(np.std(lum)), 1),
                "noise": round(float(cv2.Laplacian(lum.astype(np.float32), cv2.CV_32F).var()), 1),
                "clipping": round(clip, 2),
                "edge": round(edge, 1),
            }
        return metrics

    def enhance(self, image: np.ndarray, profile: str = "natural", mode: str = "hybrid") -> dict[str, Any]:
        start_time = time.time()
        warnings: list[str] = []

        normalized_image = self._normalize_image(image)
        if normalized_image is None:
            raise ValueError("Image must have shape (height, width, 3) with RGB channels.")

        analysis = self.analyze(normalized_image, profile=profile)

        t_c0 = time.time()
        classical_output, classical_stages, classical_warning = self._call_classical_branch(normalized_image, profile, analysis)
        classical_ms = round((time.time() - t_c0) * 1000, 2)
        if classical_warning:
            warnings.append(classical_warning)
        classical_output = self._validate_output(classical_output)

        t_d0 = time.time()
        deep_output, deep_warning = self._call_deep_branch(normalized_image, profile)
        deep_ms = round((time.time() - t_d0) * 1000, 2)
        if deep_warning:
            warnings.append(deep_warning)
        deep_output = self._validate_output(deep_output)

        hybrid_output = None
        fusion_map = None
        disagreement_map = None
        hybrid_warning = None
        fusion_ms = 0.0
        if classical_output is not None and deep_output is not None:
            t_f0 = time.time()
            hybrid_output, fusion_map, disagreement_map, hybrid_warning = self._call_fusion_branch(
                normalized_image, classical_output, deep_output, analysis
            )
            fusion_ms = round((time.time() - t_f0) * 1000, 2)
            if hybrid_warning:
                warnings.append(hybrid_warning)
            hybrid_output = self._validate_output(hybrid_output)

        # Mode-aware selection
        if mode == "classical" and classical_output is not None:
            final_output = classical_output
            selected_method = "classical"
            processing_status = "success"
        elif mode == "deep" and deep_output is not None:
            final_output = deep_output
            selected_method = "deep"
            processing_status = "success"
        elif (mode == "hybrid" or mode is None) and hybrid_output is not None:
            final_output = hybrid_output
            selected_method = "hybrid"
            processing_status = "success"
        elif hybrid_output is not None:
            final_output = hybrid_output
            selected_method = "hybrid"
            processing_status = "success"
        elif classical_output is not None:
            final_output = classical_output
            selected_method = "classical"
            processing_status = "partial_success"
            if mode == "deep":
                warnings.append("Deep mode requested but deep-learning output was unavailable; falling back to classical.")
            elif mode == "hybrid":
                warnings.append("Hybrid mode requested but fusion was unavailable; falling back to classical.")
        elif deep_output is not None:
            final_output = deep_output
            selected_method = "deep"
            processing_status = "partial_success"
            warnings.append("Classical branch was unavailable; using deep-learning branch.")
        else:
            final_output = self._demo_enhance(normalized_image, profile=profile)
            selected_method = "demo"
            processing_status = "demo_fallback"
            warnings.append("Neither restoration branch produced a valid output; using the documented demo fallback.")

        # Bounded Correction Mechanism
        t_q0 = time.time()
        if final_output is not None:
            final_output, quality_report = self._apply_bounded_correction(normalized_image, final_output, analysis)
        else:
            quality_report = self._call_quality_check(normalized_image, final_output, analysis)
        quality_ms = round((time.time() - t_q0) * 1000, 2)

        if quality_report.get("warnings"):
            warnings.extend(quality_report["warnings"])

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Explainability & Diagnostic payloads
        change_map_b64 = None
        change_stats = None
        histograms = None
        grid_stats = None
        method_metrics = None
        if final_output is not None:
            try:
                change_map_rgb = self._compute_change_map(normalized_image, final_output)
                change_map_b64 = encode_image_to_data_url(change_map_rgb)
                change_stats = self._compute_change_stats(normalized_image, final_output)
                histograms = self._compute_histograms(normalized_image, final_output)
                grid_stats = self._compute_grid_stats(normalized_image, final_output)
                method_metrics = self._compute_method_metrics(
                    normalized_image,
                    {"classical": classical_output, "deep": deep_output, "hybrid": hybrid_output}
                )
            except Exception:
                pass

        timing_breakdown = {
            "total_ms": elapsed_ms,
            "classical_ms": classical_ms,
            "deep_ms": deep_ms,
            "fusion_ms": fusion_ms,
            "quality_ms": quality_ms,
            "processing_ms": elapsed_ms,
        }

        response = {
            "status": "success",
            "message": "Image upload and enhancement pipeline accepted.",
            "profile": profile,
            "analysis": _sanitize_analysis_payload(analysis),
            "final_image": encode_image_to_data_url(final_output),
            "classical_image": encode_image_to_data_url(classical_output) if classical_output is not None else None,
            "deep_image": encode_image_to_data_url(deep_output) if deep_output is not None else None,
            "hybrid_image": encode_image_to_data_url(hybrid_output) if hybrid_output is not None else None,
            "classical_output": encode_image_to_data_url(classical_output) if classical_output is not None else None,
            "deep_output": encode_image_to_data_url(deep_output) if deep_output is not None else None,
            "hybrid_output": encode_image_to_data_url(hybrid_output) if hybrid_output is not None else None,
            "fusion_map": encode_image_to_data_url(fusion_map) if fusion_map is not None else None,
            "disagreement_map": encode_image_to_data_url(disagreement_map) if disagreement_map is not None else None,
            "change_map": change_map_b64,
            "change_stats": change_stats,
            "histograms": histograms,
            "grid_stats": grid_stats,
            "method_metrics": method_metrics,
            "classical_stages": classical_stages,
            "quality_report": _sanitize_analysis_payload(quality_report),
            "timings": timing_breakdown,
            "timing": timing_breakdown,
            "warnings": warnings,
            "selected_method": selected_method,
            "processing_status": processing_status,
            "demo_mode": selected_method == "demo",
        }
        return response

    def compare(self, image: np.ndarray, profile: str = "natural", mode: str = "hybrid") -> dict[str, Any]:
        result = self.enhance(image, profile=profile, mode=mode)
        return {
            "message": "Comparison request accepted.",
            "profile": profile,
            "original_image": encode_image_to_data_url(self._normalize_image(image)),
            "final_image": result.get("final_image"),
            "classical_image": result.get("classical_image"),
            "deep_image": result.get("deep_image"),
            "hybrid_image": result.get("hybrid_image"),
            "fusion_map": result.get("fusion_map"),
            "disagreement_map": result.get("disagreement_map"),
            "analysis": result.get("analysis"),
            "quality_report": result.get("quality_report"),
            "warnings": result.get("warnings", []),
            "timings": result.get("timings", result.get("timing", {})),
            "selected_method": result.get("selected_method"),
            "processing_status": result.get("processing_status"),
        }
