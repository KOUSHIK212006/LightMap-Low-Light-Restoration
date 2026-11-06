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

    image_float = image_rgb.astype(np.float32) / 255.0
    corrected = np.power(np.clip(image_float, 1e-4, 1.0), gamma)
    corrected = np.clip(corrected * 255.0, 0, 255).astype(np.uint8)
    return np.ascontiguousarray(corrected, dtype=np.uint8)


def _apply_clahe(image_rgb: np.ndarray, clip_limit: float = 2.0, tile_grid: tuple[int, int] = (8, 8)) -> np.ndarray:
    bgr = _rgb_to_bgr(image_rgb)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=float(clip_limit), tileGridSize=(int(tile_grid[0]), int(tile_grid[1])))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    enhanced_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return _bgr_to_rgb(enhanced_bgr)


def _apply_multiscale_retinex(image_rgb: np.ndarray, scales: tuple[int, ...] = (15, 80, 200)) -> np.ndarray:
    rgb = image_rgb.astype(np.float32) / 255.0
    rgb = np.clip(rgb, 1e-4, 1.0)
    retinex = np.zeros_like(rgb)

    for scale in scales:
        gaussian = cv2.GaussianBlur(rgb, (0, 0), sigmaX=float(scale), sigmaY=float(scale))
        log_rgb = np.log(rgb + 1e-3)
        log_blur = np.log(gaussian + 1e-3)
        retinex += (log_rgb - log_blur)

    enhanced = np.clip((retinex / max(len(scales), 1)) + 0.25, 0.0, 1.0)
    enhanced = np.clip(enhanced * 1.2, 0.0, 1.0)
    return (enhanced * 255.0).astype(np.uint8)


def _apply_bilateral_denoise(image_rgb: np.ndarray, strength: int = 12) -> np.ndarray:
    sigma = max(5, strength)
    return cv2.bilateralFilter(image_rgb, d=9, sigmaColor=float(sigma), sigmaSpace=float(sigma))


def _apply_colour_correction(image_rgb: np.ndarray, bias_strength: float = 0.12) -> np.ndarray:
    image_float = image_rgb.astype(np.float32)
    channel_means = image_float.mean(axis=(0, 1))
    target_mean = float(np.mean(channel_means))
    corrected = image_float.copy()

    for channel_index in range(3):
        channel_mean = float(channel_means[channel_index])
        if channel_mean > 0:
            gain = (target_mean / channel_mean) * (1.0 + bias_strength)
            corrected[:, :, channel_index] = np.clip(corrected[:, :, channel_index] * gain, 0, 255)

    return np.clip(corrected, 0, 255).astype(np.uint8)


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
        "is_noisy": bool(noise_score >= thresholds["noise_threshold"]),
        "has_strong_edges": bool(edge_strength >= thresholds["edge_threshold"]),
    }

    return {
        "mean_brightness": mean_brightness,
        "brightness_distribution": brightness_distribution.tolist(),
        "contrast_score": contrast_score,
        "underexposed_ratio": underexposed_ratio,
        "overexposed_ratio": overexposed_ratio,
        "noise_score": noise_score,
        "edge_strength": edge_strength,
        "colour_distribution": colour_distribution,
        "clipping_ratio": clipping_ratio,
        "image_dimensions": {"height": int(height), "width": int(width), "channels": 3},
        "conditions": conditions,
        "thresholds": thresholds,
        "source": "classical_cv",
    }


def enhance_classical(image, analysis=None, profile="natural"):
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

    mean_brightness = float(analysis.get("mean_brightness", np.mean(_luminance(current))))
    contrast_score = float(analysis.get("contrast_score", np.std(_luminance(current))))
    underexposed_ratio = float(analysis.get("underexposed_ratio", 0.0))
    overexposed_ratio = float(analysis.get("overexposed_ratio", 0.0))
    noise_score = float(analysis.get("noise_score", 0.0))
    edge_strength = float(analysis.get("edge_strength", 0.0))
    clipping_ratio = float(analysis.get("clipping_ratio", 0.0))

    profile_config = {
        "natural": {"gamma": 1.10, "clahe_clip": 2.0, "tile_grid": (8, 8), "denoise_strength": 11, "retinex": False, "color_bias": 0.06},
        "maximum_visibility": {"gamma": 1.35, "clahe_clip": 2.5, "tile_grid": (8, 8), "denoise_strength": 15, "retinex": True, "color_bias": 0.10},
        "detail_preservation": {"gamma": 1.18, "clahe_clip": 1.8, "tile_grid": (10, 10), "denoise_strength": 7, "retinex": True, "color_bias": 0.04},
    }[normalized_profile]

    gamma_value = float(profile_config["gamma"])
    if mean_brightness < 70:
        gamma_value = gamma_value + (70.0 - mean_brightness) / 150.0
    elif mean_brightness > 180:
        gamma_value = max(1.0, gamma_value - (mean_brightness - 180.0) / 250.0)

    if mean_brightness < 100 or underexposed_ratio > 0.15:
        current = _apply_gamma_correction(current, gamma_value)
        gamma_applied = True
    else:
        current = _apply_gamma_correction(current, max(1.0, gamma_value * 0.9))
        gamma_applied = False

    if contrast_score < 55.0 or normalized_profile == "maximum_visibility":
        current = _apply_clahe(current, clip_limit=profile_config["clahe_clip"], tile_grid=profile_config["tile_grid"])
        clahe_applied = True
    else:
        clahe_applied = False

    if (mean_brightness < 120 or underexposed_ratio > 0.18 or normalized_profile == "maximum_visibility") and (edge_strength > 10.0 or not analysis.get("conditions", {}).get("is_low_contrast", False)):
        current = _apply_multiscale_retinex(current)
        retinex_applied = True
    else:
        retinex_applied = False

    if noise_score > 10.0 or normalized_profile == "natural":
        denoise_strength = int(profile_config["denoise_strength"])
        if normalized_profile == "detail_preservation":
            denoise_strength = max(5, denoise_strength - 4)
        current = _apply_bilateral_denoise(current, strength=denoise_strength)
        denoising_applied = True
    else:
        denoising_applied = False

    if clipping_ratio > 0.05 or overexposed_ratio > 0.05 or normalized_profile == "maximum_visibility":
        current = _apply_colour_correction(current, bias_strength=profile_config["color_bias"])
        colour_correction_applied = True
    else:
        colour_correction_applied = False

    output = _validate_output_image(current, reference_shape)
    summary = {
        "profile": normalized_profile,
        "gamma_applied": gamma_applied,
        "clahe_applied": clahe_applied,
        "retinex_applied": retinex_applied,
        "denoising_applied": denoising_applied,
        "colour_correction_applied": colour_correction_applied,
        "metrics": {
            "mean_brightness": mean_brightness,
            "contrast_score": contrast_score,
            "underexposed_ratio": underexposed_ratio,
            "overexposed_ratio": overexposed_ratio,
            "noise_score": noise_score,
            "edge_strength": edge_strength,
            "clipping_ratio": clipping_ratio,
        },
        "warning": None,
    }

    return {
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
            "denoise_strength": int(profile_config["denoise_strength"]),
            "profile": normalized_profile,
        },
        "processing_summary": summary,
    }


__all__ = ["analyze_image", "enhance_classical"]
