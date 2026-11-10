from __future__ import annotations

from typing import Any

import cv2
import numpy as np


_SUPPORTED_PROFILES = {"natural", "maximum_visibility", "detail_preservation", "visibility", "detail"}


def _normalize_profile(profile: str | None) -> str:
    if profile is None:
        return "natural"

    profile_key = str(profile).strip().lower()
    aliases = {
        "visibility": "maximum_visibility",
        "maximum-visibility": "maximum_visibility",
        "max_visibility": "maximum_visibility",
        "detail": "detail_preservation",
        "detail-preservation": "detail_preservation",
        "preserve_detail": "detail_preservation",
    }
    if profile_key in aliases:
        return aliases[profile_key]
    if profile_key not in _SUPPORTED_PROFILES:
        return "natural"
    return profile_key


def _validate_rgb_image(image: Any, *, allow_empty: bool = False) -> np.ndarray:
    if image is None:
        raise ValueError("Image input is required.")

    array = np.asarray(image)
    if array.size == 0:
        if allow_empty:
            return array.astype(np.uint8)
        raise ValueError("Input image is empty.")

    if array.ndim != 3 or array.shape[2] != 3:
        raise ValueError("Image must have shape (height, width, 3) with RGB channels.")

    if not np.isfinite(array).all():
        raise ValueError("Input image contains NaN or infinity values.")

    if array.dtype != np.uint8:
        array = np.clip(array, 0, 255).astype(np.uint8)

    return np.ascontiguousarray(array, dtype=np.uint8)


def _validate_output_image(image: np.ndarray, reference_shape: tuple[int, int, int] | None = None) -> np.ndarray:
    image_array = np.asarray(image)
    if image_array.size == 0:
        raise ValueError("Enhancement output is empty.")
    if image_array.ndim != 3 or image_array.shape[2] != 3:
        raise ValueError("Enhancement output must have shape (height, width, 3).")
    if reference_shape is not None and image_array.shape[:2] != reference_shape[:2]:
        raise ValueError("Enhanced output must preserve the original image dimensions.")
    if not np.isfinite(image_array).all():
        raise ValueError("Enhanced output contains NaN or infinity values.")

    image_array = np.clip(image_array, 0, 255).astype(np.uint8)
    if image_array.dtype != np.uint8:
        image_array = image_array.astype(np.uint8)
    return np.ascontiguousarray(image_array, dtype=np.uint8)


def _rgb_to_bgr(image_rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)


def _bgr_to_rgb(image_bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)


def _luminance(image_rgb: np.ndarray) -> np.ndarray:
    rgb = image_rgb.astype(np.float32)
    return 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]


def _apply_gamma_correction(image_rgb: np.ndarray, gamma: float) -> np.ndarray:
    if not np.isfinite(gamma) or gamma <= 0:
        raise ValueError("Gamma must be a finite positive number.")

    # Low-light brightening: exponent < 1.0 smoothly lifts shadows.
    # If gamma > 1.0 (standard photographic divisor parameter), exponent = 1.0 / gamma.
    # Clamped to safe range [0.55, 0.95] to prevent crushing shadows or burning out midtones.
    exponent = 1.0 / gamma if gamma > 1.0 else gamma
    exponent = float(np.clip(exponent, 0.55, 0.95))

    image_float = image_rgb.astype(np.float32) / 255.0
    corrected = np.power(np.clip(image_float, 1e-4, 1.0), exponent)
    corrected = np.clip(corrected * 255.0, 0, 255).astype(np.uint8)
    return np.ascontiguousarray(corrected, dtype=np.uint8)


def _apply_clahe(image_rgb: np.ndarray, clip_limit: float = 1.5, tile_grid: tuple[int, int] = (8, 8)) -> np.ndarray:
    bgr = _rgb_to_bgr(image_rgb)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=float(clip_limit), tileGridSize=(int(tile_grid[0]), int(tile_grid[1])))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    enhanced_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return _bgr_to_rgb(enhanced_bgr)


def _apply_multiscale_retinex(image_rgb: np.ndarray, scales: tuple[int, ...] = (15, 80, 200)) -> np.ndarray:
    # Apply Multiscale Retinex in LAB Luminance channel to preserve 100% chromatic fidelity
    # and eliminate color distortion/oversaturation
    bgr = _rgb_to_bgr(image_rgb)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0].astype(np.float32) / 255.0
    l_channel = np.clip(l_channel, 1e-4, 1.0)

    retinex = np.zeros_like(l_channel)
    log_l = np.log(l_channel + 1e-3)
    for scale in scales:
        gaussian = cv2.GaussianBlur(l_channel, (0, 0), sigmaX=float(scale), sigmaY=float(scale))
        log_blur = np.log(gaussian + 1e-3)
        retinex += (log_l - log_blur)

    retinex_mean = retinex / max(len(scales), 1)
    # Perceptual soft compression: avoids harsh linear offset/multiply clipping
    norm_retinex = (retinex_mean - np.min(retinex_mean)) / (np.max(retinex_mean) - np.min(retinex_mean) + 1e-5)
    # Dynamic range blend: 60% Retinex detail + 40% input luminance preserves smooth light gradients
    enhanced_l = 0.60 * norm_retinex + 0.40 * l_channel
    lab[:, :, 0] = np.clip(enhanced_l * 255.0, 0, 255).astype(np.uint8)

    enhanced_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return _bgr_to_rgb(enhanced_bgr)


def _apply_bilateral_denoise(image_rgb: np.ndarray, strength: int = 10) -> np.ndarray:
    sigma = max(4, min(14, strength))
    return cv2.bilateralFilter(image_rgb, d=7, sigmaColor=float(sigma), sigmaSpace=float(sigma))


def _apply_colour_correction(image_rgb: np.ndarray, bias_strength: float = 0.04) -> np.ndarray:
    image_float = image_rgb.astype(np.float32)
    channel_means = image_float.mean(axis=(0, 1))
    target_mean = float(np.mean(channel_means))
    corrected = image_float.copy()

    for channel_index in range(3):
        channel_mean = float(channel_means[channel_index])
        if channel_mean > 0:
            raw_gain = target_mean / channel_mean
            # Soft gray-world: damp gain towards 1.0 to prevent oversaturation
            damped_gain = float(np.clip(1.0 + (raw_gain - 1.0) * 0.45, 0.85, 1.20))
            corrected[:, :, channel_index] = np.clip(corrected[:, :, channel_index] * damped_gain, 0, 255)

    return np.clip(corrected, 0, 255).astype(np.uint8)


def _estimate_noise_variance(image_rgb: np.ndarray) -> float:
    """Immerkaer (1996) fast noise variance estimation via Laplacian masking.
    Returns estimated standard deviation of additive Gaussian noise sigma_n.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY).astype(np.float64)
    h, w = gray.shape
    if h < 5 or w < 5:
        return 0.0
    kernel = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float64)
    filtered = cv2.filter2D(gray, -1, kernel, borderType=cv2.BORDER_REFLECT)
    sigma = np.sum(np.abs(filtered)) * np.sqrt(0.5 * np.pi) / (6.0 * (w - 2) * (h - 2))
    return float(sigma)


def _apply_msrcr(
    image_rgb: np.ndarray,
    scales: tuple[int, ...] = (15, 80, 200),
    alpha: float = 125.0,
    beta: float = 46.0,
) -> np.ndarray:
    """Multi-Scale Retinex with Color Restoration (MSRCR, Jobson et al. 1997)."""
    img_f = image_rgb.astype(np.float32) + 1.0
    sum_channels = np.sum(img_f, axis=-1, keepdims=True)
    c_rf = beta * (np.log(alpha * img_f) - np.log(sum_channels))

    msr = np.zeros_like(img_f)
    for s in scales:
        blur = cv2.GaussianBlur(img_f, (0, 0), float(s))
        msr += (np.log(img_f) - np.log(blur + 1e-4))
    msr = msr / max(len(scales), 1)

    msrcr = c_rf * msr
    msrcr_norm = np.zeros_like(msrcr)
    for i in range(3):
        ch = msrcr[:, :, i]
        p1, p99 = np.percentile(ch, 1), np.percentile(ch, 99)
        if p99 > p1:
            msrcr_norm[:, :, i] = np.clip((ch - p1) / (p99 - p1) * 255.0, 0, 255)
        else:
            msrcr_norm[:, :, i] = np.clip(ch, 0, 255)
    return np.ascontiguousarray(msrcr_norm, dtype=np.uint8)


def _apply_lime(image_rgb: np.ndarray, gamma: float = 0.60) -> np.ndarray:
    """LIME: Low-light Image Enhancement via Illumination Map Estimation (Guo et al. 2017)."""
    img_f = image_rgb.astype(np.float32) / 255.0
    t_init = np.max(img_f, axis=-1)
    t_refined = cv2.GaussianBlur(t_init, (15, 15), 0)
    t_refined = np.maximum(t_refined, t_init * 0.7)
    t_gamma = np.clip(np.power(t_refined + 1e-4, gamma), 0.08, 1.0)
    enhanced = img_f / np.expand_dims(t_gamma, axis=-1)
    return np.clip(enhanced * 255.0, 0, 255).astype(np.uint8)


def _apply_unsharp_mask(image_rgb: np.ndarray, strength: float = 0.4, radius: int = 3) -> np.ndarray:
    """Adaptive edge-preserving unsharp mask."""
    blur = cv2.GaussianBlur(image_rgb, (radius * 2 + 1, radius * 2 + 1), 0)
    high_freq = image_rgb.astype(np.float32) - blur.astype(np.float32)
    sharpened = image_rgb.astype(np.float32) + strength * high_freq
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def _apply_highlight_protection(original_rgb: np.ndarray, enhanced_rgb: np.ndarray, threshold: float = 210.0) -> np.ndarray:
    """Preserve physical highlights and lamp filament textures from over-expansion."""
    max_ch = np.max(original_rgb, axis=-1).astype(np.float32)
    weight = np.clip((max_ch - threshold) / (255.0 - threshold + 1e-4), 0.0, 1.0)
    weight_smooth = cv2.GaussianBlur(weight, (9, 9), 0)
    weight_3c = np.expand_dims(weight_smooth, -1)
    protected = (1.0 - weight_3c * 0.70) * enhanced_rgb.astype(np.float32) + (weight_3c * 0.70) * original_rgb.astype(np.float32)
    return np.clip(protected, 0, 255).astype(np.uint8)


def _condition_thresholds() -> dict[str, float]:
    return {
        "underexposed_threshold": 0.30,
        "overexposed_threshold": 0.08,
        "low_contrast_threshold": 0.18,
        "noise_threshold": 8.0,
        "edge_threshold": 20.0,
    }


def analyze_image(image):
    """Compute a structured image-condition report for classical restoration decisions.

    The thresholds are intentionally explicit and transparent so the pipeline can adapt
    to the observed exposure, contrast, noise and clipping conditions rather than
    applying a fixed transformation blindly.
    """
    rgb = _validate_rgb_image(image)
    height, width, _ = rgb.shape
    luminance = _luminance(rgb)
    luminance_float = luminance.astype(np.float32)

    brightness_distribution = np.histogram(luminance_float, bins=16, range=(0, 255))[0].astype(float)
    brightness_distribution = brightness_distribution / max(np.sum(brightness_distribution), 1.0)

    mean_brightness = float(np.mean(luminance_float))
    contrast_score = float(np.std(luminance_float))
    underexposed_ratio = float(np.mean(luminance_float < 60.0))
    overexposed_ratio = float(np.mean(luminance_float > 220.0))
    noise_score = float(cv2.Laplacian(luminance_float, cv2.CV_32F).var())
    estimated_noise_sigma = float(_estimate_noise_variance(rgb))
    edge_strength = float(cv2.Laplacian(luminance_float, cv2.CV_32F).std())
    clipping_ratio = float(np.mean((rgb[:, :, 0] < 5) | (rgb[:, :, 1] < 5) | (rgb[:, :, 2] < 5) | (rgb[:, :, 0] > 250) | (rgb[:, :, 1] > 250) | (rgb[:, :, 2] > 250)))

    channel_means = rgb.mean(axis=(0, 1)).astype(float)
    colour_distribution = {
        "r_mean": float(channel_means[0]),
        "g_mean": float(channel_means[1]),
        "b_mean": float(channel_means[2]),
        "channel_std": float(rgb.std(axis=(0, 1)).mean()),
    }

    thresholds = _condition_thresholds()
    conditions = {
        "is_underexposed": bool(underexposed_ratio >= thresholds["underexposed_threshold"]),
        "is_overexposed": bool(overexposed_ratio >= thresholds["overexposed_threshold"]),
        "is_low_contrast": bool(contrast_score < thresholds["low_contrast_threshold"] * 255.0),
        "is_noisy": bool(noise_score >= thresholds["noise_threshold"] or estimated_noise_sigma > 2.0),
        "has_sensor_noise": bool(estimated_noise_sigma > 2.0),
        "has_strong_edges": bool(edge_strength >= thresholds["edge_threshold"]),
    }

    return {
        "mean_brightness": mean_brightness,
        "brightness_distribution": brightness_distribution.tolist(),
        "contrast_score": contrast_score,
        "underexposed_ratio": underexposed_ratio,
        "overexposed_ratio": overexposed_ratio,
        "noise_score": noise_score,
        "estimated_noise_sigma": estimated_noise_sigma,
        "edge_strength": edge_strength,
        "colour_distribution": colour_distribution,
        "clipping_ratio": clipping_ratio,
        "image_dimensions": {"height": int(height), "width": int(width), "channels": 3},
        "conditions": conditions,
        "thresholds": thresholds,
        "source": "classical_cv",
    }


def enhance_classical(image, analysis=None, profile="natural", return_stages=False):
    """Apply classical low-light enhancement using profile-aware adaptive operations.

    The pipeline is intentionally modular and data-driven. It adapts the intensity of
    gamma correction, CLAHE, Retinex and denoising based on measured exposure,
    contrast, noise and clipping conditions. The returned dict contains the final
    image and metadata describing which techniques were effective for that sample.
    """
    rgb = _validate_rgb_image(image)
    normalized_profile = _normalize_profile(profile)
    if analysis is None:
        analysis = analyze_image(rgb)
    elif not isinstance(analysis, dict):
        analysis = analyze_image(rgb)

    reference_shape = rgb.shape
    current = rgb.copy()
    current = _validate_output_image(current, reference_shape)

    stages = []

    def _calc_stage_metrics(img_arr: np.ndarray) -> dict[str, float]:
        lum = _luminance(img_arr).astype(np.float32)
        return {
            "mean_brightness": round(float(np.mean(lum)), 2),
            "contrast_score": round(float(np.std(lum)), 2),
            "noise_score": round(float(cv2.Laplacian(lum, cv2.CV_32F).var()), 2),
        }

    if return_stages:
        stages.append({
            "name": "Input",
            "description": "Original raw low-light image capture",
            "image": current.copy(),
            "params": {"source": "raw_capture"},
            "metrics": _calc_stage_metrics(current),
        })

    mean_brightness = float(analysis.get("mean_brightness", np.mean(_luminance(current))))
    contrast_score = float(analysis.get("contrast_score", np.std(_luminance(current))))
    underexposed_ratio = float(analysis.get("underexposed_ratio", 0.0))
    overexposed_ratio = float(analysis.get("overexposed_ratio", 0.0))
    noise_score = float(analysis.get("noise_score", 0.0))
    edge_strength = float(analysis.get("edge_strength", 0.0))
    clipping_ratio = float(analysis.get("clipping_ratio", 0.0))

    profile_config = {
        "natural": {"gamma": 1.25, "clahe_clip": 1.2, "tile_grid": (8, 8), "denoise_strength": 9, "retinex": False, "color_bias": 0.02},
        "maximum_visibility": {"gamma": 1.45, "clahe_clip": 1.8, "tile_grid": (8, 8), "denoise_strength": 12, "retinex": True, "color_bias": 0.04},
        "detail_preservation": {"gamma": 1.20, "clahe_clip": 1.4, "tile_grid": (10, 10), "denoise_strength": 7, "retinex": True, "color_bias": 0.02},
    }[normalized_profile]

    gamma_value = float(profile_config["gamma"])
    if mean_brightness < 70:
        gamma_value = gamma_value + (70.0 - mean_brightness) / 250.0
    elif mean_brightness > 180:
        gamma_value = max(1.05, gamma_value - (mean_brightness - 180.0) / 300.0)

    if mean_brightness < 100 or underexposed_ratio > 0.15:
        current = _apply_gamma_correction(current, gamma_value)
        gamma_applied = True
    else:
        current = _apply_gamma_correction(current, max(1.0, gamma_value * 0.9))
        gamma_applied = False

    if return_stages:
        stages.append({
            "name": "Gamma Correction",
            "description": "Non-linear tone curve expansion for shadows",
            "image": current.copy(),
            "params": {"gamma": round(float(gamma_value), 2), "applied": gamma_applied},
            "metrics": _calc_stage_metrics(current),
        })

    if contrast_score < 55.0 or normalized_profile == "maximum_visibility":
        current = _apply_clahe(current, clip_limit=profile_config["clahe_clip"], tile_grid=profile_config["tile_grid"])
        clahe_applied = True
    else:
        clahe_applied = False

    if return_stages:
        stages.append({
            "name": "CLAHE",
            "description": "Contrast-limited adaptive histogram equalization",
            "image": current.copy(),
            "params": {"clip_limit": profile_config["clahe_clip"], "tile_grid": list(profile_config["tile_grid"]), "applied": clahe_applied},
            "metrics": _calc_stage_metrics(current),
        })

    if (mean_brightness < 120 or underexposed_ratio > 0.18 or normalized_profile == "maximum_visibility") and (edge_strength > 10.0 or not analysis.get("conditions", {}).get("is_low_contrast", False)):
        current = _apply_multiscale_retinex(current)
        retinex_applied = True
    else:
        retinex_applied = False

    if return_stages:
        stages.append({
            "name": "Multiscale Retinex",
            "description": "Illumination-reflectance decomposition across spatial scales",
            "image": current.copy(),
            "params": {"scales": [15, 80, 200], "applied": retinex_applied},
            "metrics": _calc_stage_metrics(current),
        })

    estimated_noise_sigma = float(analysis.get("estimated_noise_sigma", 0.0))
    if estimated_noise_sigma > 1.8 or noise_score > 10.0 or normalized_profile == "natural":
        if estimated_noise_sigma > 0:
            denoise_strength = int(np.clip(round(estimated_noise_sigma * 3.5), 4, 14))
        else:
            denoise_strength = int(profile_config["denoise_strength"])
        if normalized_profile == "detail_preservation":
            denoise_strength = max(4, denoise_strength - 4)
        current = _apply_bilateral_denoise(current, strength=denoise_strength)
        denoising_applied = True
    else:
        denoise_strength = 0
        denoising_applied = False

    if return_stages:
        stages.append({
            "name": "Bilateral Denoising",
            "description": "Noise-adaptive spatial smoothing based on estimated sensor noise",
            "image": current.copy(),
            "params": {"strength": denoise_strength, "applied": denoising_applied, "estimated_noise_sigma": round(estimated_noise_sigma, 2)},
            "metrics": _calc_stage_metrics(current),
        })

    if clipping_ratio > 0.05 or overexposed_ratio > 0.05 or normalized_profile == "maximum_visibility":
        current = _apply_colour_correction(current, bias_strength=profile_config["color_bias"])
        colour_correction_applied = True
    else:
        colour_correction_applied = False

    if return_stages:
        stages.append({
            "name": "Colour Correction",
            "description": "Gray-world chromatic balancing across RGB channels",
            "image": current.copy(),
            "params": {"bias_strength": profile_config["color_bias"], "applied": colour_correction_applied},
            "metrics": _calc_stage_metrics(current),
        })

    # Unsharp Masking for detail-preservation profile
    if normalized_profile == "detail_preservation":
        current = _apply_unsharp_mask(current, strength=0.35, radius=3)
        unsharp_applied = True
        if return_stages:
            stages.append({
                "name": "Unsharp Masking",
                "description": "Adaptive high-frequency edge enhancement",
                "image": current.copy(),
                "params": {"strength": 0.35, "radius": 3, "applied": True},
                "metrics": _calc_stage_metrics(current),
            })
    else:
        unsharp_applied = False

    # Highlight Protection: preserve light filaments and bright elements from clipping
    current = _apply_highlight_protection(rgb, current, threshold=210.0)
    if return_stages:
        stages.append({
            "name": "Highlight Protection",
            "description": "Soft gradient blend to preserve original specular highlights",
            "image": current.copy(),
            "params": {"threshold": 210.0, "applied": True},
            "metrics": _calc_stage_metrics(current),
        })

    output = _validate_output_image(current, reference_shape)
    summary = {
        "profile": normalized_profile,
        "gamma_applied": gamma_applied,
        "clahe_applied": clahe_applied,
        "retinex_applied": retinex_applied,
        "denoising_applied": denoising_applied,
        "colour_correction_applied": colour_correction_applied,
        "unsharp_applied": unsharp_applied,
        "highlight_protection_applied": True,
        "metrics": {
            "mean_brightness": mean_brightness,
            "contrast_score": contrast_score,
            "underexposed_ratio": underexposed_ratio,
            "overexposed_ratio": overexposed_ratio,
            "noise_score": noise_score,
            "estimated_noise_sigma": estimated_noise_sigma,
            "edge_strength": edge_strength,
            "clipping_ratio": clipping_ratio,
        },
        "warning": None,
    }

    result_payload = {
        "image": output,
        "analysis": analysis,
        "maps": {
            "illumination": np.ones_like(output[:, :, 0], dtype=np.float32),
            "noise": np.zeros_like(output[:, :, 0], dtype=np.float32),
            "colour": np.ones_like(output[:, :, 0], dtype=np.float32),
        },
        "parameters": {
            "gamma": float(gamma_value),
            "clahe_clip_limit": float(profile_config["clahe_clip"]),
            "tile_grid": list(profile_config["tile_grid"]),
            "denoise_strength": int(denoise_strength),
            "profile": normalized_profile,
        },
        "processing_summary": summary,
    }

    if return_stages:
        result_payload["stages"] = stages

    return result_payload


def enhance_lime(image: np.ndarray, gamma: float = 0.60) -> dict[str, Any]:
    """Enhance using LIME (Illumination Map Estimation)."""
    rgb = _validate_rgb_image(image)
    out = _apply_lime(rgb, gamma=gamma)
    return {"image": out, "method": "LIME"}


def enhance_msrcr(image: np.ndarray, scales=(15, 80, 200), alpha: float = 125.0, beta: float = 46.0) -> dict[str, Any]:
    """Enhance using MSRCR (Multi-Scale Retinex with Color Restoration)."""
    rgb = _validate_rgb_image(image)
    out = _apply_msrcr(rgb, scales=scales, alpha=alpha, beta=beta)
    return {"image": out, "method": "MSRCR"}


def estimate_noise_variance(image: np.ndarray) -> float:
    """Public export for Immerkaer noise variance estimation."""
    rgb = _validate_rgb_image(image)
    return _estimate_noise_variance(rgb)


__all__ = [
    "analyze_image",
    "enhance_classical",
    "enhance_lime",
    "enhance_msrcr",
    "estimate_noise_variance",
]
