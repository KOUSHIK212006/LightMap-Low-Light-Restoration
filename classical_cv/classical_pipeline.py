from __future__ import annotations

import time
from typing import Any

import cv2
import numpy as np


_SUPPORTED_PROFILES = {"natural", "maximum_visibility", "detail_preservation", "visibility", "detail"}


def _normalize_profile(profile: str | None) -> str:
    """Map profile names and common aliases to canonical keys."""
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
    """Validate that input is a valid 3-channel RGB uint8 image array without modifying original."""
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

    # Return a contiguous copy to guarantee immutability of the caller's array
    return np.ascontiguousarray(array.copy(), dtype=np.uint8)


def _validate_output_image(image: np.ndarray, reference_shape: tuple[int, int, int] | None = None) -> np.ndarray:
    """Verify output image dimensions, channel count, finite values and uint8 dtype."""
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
    return np.ascontiguousarray(image_array, dtype=np.uint8)


def _rgb_to_bgr(image_rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)


def _bgr_to_rgb(image_bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)


def _luminance(image_rgb: np.ndarray) -> np.ndarray:
    """Compute perceptual luminance (REC.601 standard: 0.299 R + 0.587 G + 0.114 B)."""
    rgb = image_rgb.astype(np.float32)
    return 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]


def _condition_thresholds() -> dict[str, float]:
    """Empirical thresholds for low-light and image condition classification."""
    return {
        "underexposed_threshold": 0.30,
        "overexposed_threshold": 0.08,
        "low_contrast_threshold": 25.0,
        "noise_threshold": 15.0,
        "edge_threshold": 20.0,
        "very_dark_brightness": 35.0,
        "dark_brightness": 75.0,
        "overexposed_brightness": 180.0,
    }


def analyze_image(image: Any) -> dict[str, Any]:
    """Compute a comprehensive, explainable image condition report.

    Calculates:
    - Average brightness, median brightness, and intensity standard deviation.
    - Global and local contrast metrics.
    - Underexposed and overexposed pixel ratios.
    - Highlight clipping and shadow clipping ratios.
    - Laplacian noise score and robust noise standard deviation.
    - Edge strength via gradient magnitude.
    - Per-channel color distribution (means and standard deviations).
    - HSV saturation statistics.
    - Image dimensions.
    - Multi-class condition classification (very dark, dark, low contrast,
      noisy low-light, mixed lighting, overexposed, normally illuminated).
    """
    rgb = _validate_rgb_image(image)
    height, width, _ = rgb.shape
    luminance = _luminance(rgb)
    luminance_float = luminance.astype(np.float32)

    # 1. Intensity statistics
    mean_brightness = float(np.mean(luminance_float))
    median_brightness = float(np.median(luminance_float))
    std_brightness = float(np.std(luminance_float))
    contrast_score = std_brightness  # Global contrast (standard deviation of luminance)

    # 2. Local contrast: average standard deviation across sliding neighborhoods
    k_size = int(min(15, max(3, (min(height, width) // 16) * 2 + 1)))
    local_mean = cv2.boxFilter(luminance_float, -1, (k_size, k_size))
    local_sq_mean = cv2.boxFilter(luminance_float ** 2, -1, (k_size, k_size))
    local_var = np.maximum(local_sq_mean - local_mean ** 2, 0.0)
    local_contrast = float(np.mean(np.sqrt(local_var)))

    # 3. Brightness distribution histogram (16 bins)
    hist, _ = np.histogram(luminance_float, bins=16, range=(0, 255))
    brightness_distribution = (hist.astype(float) / max(float(np.sum(hist)), 1.0)).tolist()

    # 4. Exposure & clipping analysis
    underexposed_ratio = float(np.mean(luminance_float < 60.0))
    overexposed_ratio = float(np.mean(luminance_float > 220.0))
    highlight_clipping_ratio = float(
        np.mean((rgb[:, :, 0] >= 252) | (rgb[:, :, 1] >= 252) | (rgb[:, :, 2] >= 252))
    )
    shadow_clipping_ratio = float(
        np.mean((rgb[:, :, 0] <= 4) & (rgb[:, :, 1] <= 4) & (rgb[:, :, 2] <= 4))
    )
    clipping_ratio = float(np.clip(highlight_clipping_ratio + shadow_clipping_ratio, 0.0, 1.0))

    # 5. Noise & edge estimation
    lap = cv2.Laplacian(luminance_float, cv2.CV_32F)
    noise_score = float(lap.var())
    edge_strength = float(lap.std())
    edge_score = edge_strength

    # Fast gradient magnitude for fine edge detection
    grad_x = cv2.Sobel(luminance_float, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(luminance_float, cv2.CV_32F, 0, 1, ksize=3)
    gradient_magnitude = float(np.mean(np.sqrt(grad_x ** 2 + grad_y ** 2)))

    # 6. Colour & saturation distribution
    channel_means = rgb.mean(axis=(0, 1)).astype(float)
    channel_stds = rgb.std(axis=(0, 1)).astype(float)
    colour_distribution = {
        "r_mean": float(channel_means[0]),
        "g_mean": float(channel_means[1]),
        "b_mean": float(channel_means[2]),
        "r_std": float(channel_stds[0]),
        "g_std": float(channel_stds[1]),
        "b_std": float(channel_stds[2]),
        "channel_std": float(channel_stds.mean()),
    }

    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1].astype(np.float32) / 255.0
    mean_saturation = float(np.mean(sat))
    std_saturation = float(np.std(sat))

    # 7. Condition classification
    thresholds = _condition_thresholds()

    is_very_dark = bool(
        mean_brightness < thresholds["very_dark_brightness"]
        or (median_brightness < 25.0 and underexposed_ratio > 0.80)
    )
    is_overexposed = bool(
        mean_brightness > thresholds["overexposed_brightness"]
        or overexposed_ratio > 0.25
        or highlight_clipping_ratio > 0.15
    )
    is_mixed_lighting = bool(
        (underexposed_ratio > 0.15 and overexposed_ratio > 0.05)
        or (contrast_score > 60.0 and underexposed_ratio > 0.20)
    )
    is_noisy_low_light = bool(
        (mean_brightness < thresholds["dark_brightness"] or underexposed_ratio > 0.35)
        and noise_score >= thresholds["noise_threshold"]
    )
    is_dark = bool(
        mean_brightness < thresholds["dark_brightness"]
        and not is_very_dark
        and not is_overexposed
    )
    is_low_contrast = bool(
        contrast_score < thresholds["low_contrast_threshold"]
        and not is_very_dark
        and not is_overexposed
    )
    is_normally_illuminated = bool(
        not is_very_dark
        and not is_dark
        and not is_overexposed
        and not is_mixed_lighting
        and not is_low_contrast
        and not is_noisy_low_light
    )

    # Determine primary condition label
    if is_very_dark:
        condition_label = "very_dark"
    elif is_noisy_low_light:
        condition_label = "noisy_low_light"
    elif is_dark:
        condition_label = "dark"
    elif is_overexposed:
        condition_label = "overexposed"
    elif is_mixed_lighting:
        condition_label = "mixed_lighting"
    elif is_low_contrast:
        condition_label = "low_contrast"
    else:
        condition_label = "normally_illuminated"

    conditions = {
        "is_underexposed": bool(underexposed_ratio >= thresholds["underexposed_threshold"]),
        "is_overexposed": is_overexposed,
        "is_low_contrast": bool(contrast_score < thresholds["low_contrast_threshold"]),
        "is_noisy": bool(noise_score >= thresholds["noise_threshold"]),
        "has_strong_edges": bool(edge_strength >= thresholds["edge_threshold"]),
        "is_very_dark": is_very_dark,
        "is_dark": is_dark,
        "is_noisy_low_light": is_noisy_low_light,
        "is_mixed_lighting": is_mixed_lighting,
        "is_normally_illuminated": is_normally_illuminated,
        "condition_label": condition_label,
    }

    return {
        "mean_brightness": mean_brightness,
        "median_brightness": median_brightness,
        "std_brightness": std_brightness,
        "contrast_score": contrast_score,
        "global_contrast": contrast_score,
        "local_contrast": local_contrast,
        "brightness_distribution": brightness_distribution,
        "underexposed_ratio": underexposed_ratio,
        "overexposed_ratio": overexposed_ratio,
        "highlight_clipping_ratio": highlight_clipping_ratio,
        "shadow_clipping_ratio": shadow_clipping_ratio,
        "clipping_ratio": clipping_ratio,
        "noise_score": noise_score,
        "edge_strength": edge_strength,
        "edge_score": edge_score,
        "gradient_magnitude": gradient_magnitude,
        "colour_distribution": colour_distribution,
        "mean_saturation": mean_saturation,
        "std_saturation": std_saturation,
        "image_dimensions": {"height": int(height), "width": int(width), "channels": 3},
        "conditions": conditions,
        "thresholds": thresholds,
        "source": "classical_cv",
    }


def _apply_adaptive_gamma(
    image_rgb: np.ndarray,
    gamma_inv: float,
    highlight_protect: bool = True,
    compress_highlights: bool = False,
) -> np.ndarray:
    """Apply adaptive gamma curve with smooth highlight protection.

    Mathematical formulation:
        x = I / 255.0 in [0, 1]
        x_gamma = x^(gamma_inv)
        w(x) = cos((pi / 2) * x)
        I_out = (1 - w(x)) * x + w(x) * x_gamma

    This formulation guarantees:
    1. Maximum shadow expansion at x = 0 (w(0) = 1).
    2. Zero highlight blowout at x = 1 (w(1) = 0), matching original brightness.
    3. Monotonic, continuous tone curve without clipping artifacts.
    """
    if not np.isfinite(gamma_inv) or gamma_inv <= 0:
        raise ValueError("Gamma parameter must be a finite positive number.")

    image_float = image_rgb.astype(np.float32) / 255.0
    clamped = np.clip(image_float, 0.0, 1.0)

    if abs(gamma_inv - 1.0) < 1e-4 and not compress_highlights:
        return image_rgb.copy()

    # Gamma expansion
    gamma_mapped = np.power(np.maximum(clamped, 1e-4), gamma_inv)

    if highlight_protect:
        # Smooth cosine rolloff weight: 1.0 at black, 0.0 at white
        w = np.cos((np.pi / 2.0) * clamped)
        out = (1.0 - w) * clamped + w * gamma_mapped
    else:
        out = gamma_mapped

    # Optional highlight compression for overexposed scenes to avoid harsh clipping
    if compress_highlights:
        high_mask = out > 0.85
        out[high_mask] = 0.85 + (out[high_mask] - 0.85) * 0.65

    out_uint8 = np.clip(out * 255.0, 0, 255).astype(np.uint8)
    return np.ascontiguousarray(out_uint8, dtype=np.uint8)


def _apply_clahe_luminance(
    image_rgb: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid: tuple[int, int] = (8, 8),
    blend: float = 1.0,
) -> np.ndarray:
    """Apply CLAHE strictly to the LAB luminance channel to prevent color distortion.

    Adapts tile grid size if the image dimensions are smaller than standard tile sizes.
    Smoothly blends enhanced luminance with original luminance based on blend weight.
    """
    height, width = image_rgb.shape[:2]
    grid_y = int(min(max(2, tile_grid[0]), max(2, height // 8)))
    grid_x = int(min(max(2, tile_grid[1]), max(2, width // 8)))

    bgr = _rgb_to_bgr(image_rgb)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_orig = lab[:, :, 0].copy()

    clahe = cv2.createCLAHE(clipLimit=float(clip_limit), tileGridSize=(grid_x, grid_y))
    l_enhanced = clahe.apply(l_orig)

    if blend < 0.999:
        l_final = np.clip((1.0 - blend) * l_orig.astype(np.float32) + blend * l_enhanced.astype(np.float32), 0, 255).astype(np.uint8)
        lab[:, :, 0] = l_final
    else:
        lab[:, :, 0] = l_enhanced

    enhanced_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return _bgr_to_rgb(enhanced_bgr)


def _apply_multiscale_retinex_luminance(
    image_rgb: np.ndarray,
    scales: tuple[int, ...] = (15, 80, 250),
    weight: float = 0.40,
    beta: float = 0.75,
) -> np.ndarray:
    """Luminance-based Multi-Scale Retinex with color-ratio preservation.

    Mathematical formulation:
        L = 0.299 R + 0.587 G + 0.114 B
        R_k = log(L + 1.0) - log(G_sigma_k * L + 1.0)
        R_ms = sum_k (w_k * R_k)
        L_norm = 1.0 / (1.0 + exp(-2.5 * R_ms))  [Sigmoidal tone mapping]
        C_out = C_in * (L_norm / (L / 255.0 + 1e-3))^beta

    Advantages over channel-independent Retinex:
    1. Operates on luminance only, eliminating gray-world color bleaching.
    2. Uses sigmoidal normalization to eliminate halo artifacts.
    3. Fully stable against dark/zero pixels using +1.0 log offset.
    """
    height, width = image_rgb.shape[:2]
    luminance = _luminance(image_rgb)
    l_norm = luminance.astype(np.float32) / 255.0
    l_safe = np.clip(l_norm, 1e-4, 1.0)

    # Filter out scales that exceed image dimensions
    valid_scales = [s for s in scales if s < min(height, width)]
    if not valid_scales:
        valid_scales = [max(3, min(height, width) // 4)]

    w_k = 1.0 / len(valid_scales)
    retinex_acc = np.zeros_like(l_safe)

    for scale in valid_scales:
        gaussian_blur = cv2.GaussianBlur(l_safe, (0, 0), sigmaX=float(scale), sigmaY=float(scale))
        log_orig = np.log(l_safe + 1.0)
        log_blur = np.log(gaussian_blur + 1.0)
        retinex_acc += w_k * (log_orig - log_blur)

    # Sigmoid mapping to bound output to [0, 1] without harsh linear stretching
    l_enhanced = 1.0 / (1.0 + np.exp(-3.0 * retinex_acc))

    # Scale color channels proportionally to restored luminance
    rgb_float = image_rgb.astype(np.float32)
    ratio = np.power(np.clip(l_enhanced / (l_safe + 1e-3), 0.1, 8.0), beta)
    ratio_3ch = ratio[:, :, None]

    retinex_rgb = np.clip(rgb_float * ratio_3ch, 0.0, 255.0)

    # Blend with input image according to weight
    blended = np.clip((1.0 - weight) * rgb_float + weight * retinex_rgb, 0.0, 255.0).astype(np.uint8)
    return np.ascontiguousarray(blended, dtype=np.uint8)


def _apply_adaptive_bilateral_denoise(
    image_rgb: np.ndarray,
    noise_score: float,
    profile: str,
    base_strength: int = 12,
) -> np.ndarray:
    """Apply bilateral filtering adapted to estimated noise level and profile.

    Adapts sigma_color and sigma_space according to measured high-frequency noise variance.
    Suppresses noise while preserving edge boundaries.
    """
    if noise_score < 4.0:
        # Minimal noise: apply subtle smoothing or skip to preserve pristine detail
        d = 5
        sigma = 8.0
    elif noise_score < 25.0:
        d = 7
        sigma = float(base_strength)
    elif noise_score < 100.0:
        d = 7
        sigma = float(base_strength) * 1.3
    else:
        # High noise scene
        d = 9
        sigma = float(base_strength) * 1.8

    if profile == "detail_preservation":
        d = max(3, d - 2)
        sigma = max(5.0, sigma * 0.65)
    elif profile == "maximum_visibility":
        d = min(9, d + 2)
        sigma = min(40.0, sigma * 1.25)

    return cv2.bilateralFilter(image_rgb, d=d, sigmaColor=sigma, sigmaSpace=sigma)


def _apply_adaptive_colour_correction(
    image_rgb: np.ndarray,
    analysis: dict[str, Any],
    bias_strength: float = 0.06,
) -> np.ndarray:
    """Damped Gray-World colour cast correction with protection for saturated and monochrome scenes.

    Protection guards:
    1. If scene saturation > 0.35, colors are intentional (e.g. sunsets, foliage); do not alter.
    2. If standard deviation of channel means is large (e.g. pure red or blue), skip correction.
    3. Damped correction factor avoids neutral gray wash-out.
    """
    mean_sat = float(analysis.get("mean_saturation", 0.0))
    if mean_sat > 0.35:
        # High natural saturation: preserve original hue
        return image_rgb.copy()

    image_float = image_rgb.astype(np.float32)
    channel_means = image_float.mean(axis=(0, 1))

    # Guard against zero channels or single-color dominant images
    min_mean = float(np.min(channel_means))
    max_mean = float(np.max(channel_means))
    if min_mean < 5.0 or (max_mean / max(min_mean, 1e-3)) > 3.0:
        # High monochromaticity or single-color scene: preserve identity
        return image_rgb.copy()

    target_mean = float(np.mean(channel_means))
    corrected = image_float.copy()

    # Damped adaptation factor (alpha <= 0.30) to avoid artificial desaturation
    alpha = min(0.30, max(0.02, bias_strength))

    for c in range(3):
        c_mean = float(channel_means[c])
        gain = 1.0 + alpha * ((target_mean / c_mean) - 1.0)
        gain_clamped = float(np.clip(gain, 0.80, 1.25))
        corrected[:, :, c] = np.clip(corrected[:, :, c] * gain_clamped, 0.0, 255.0)

    return np.ascontiguousarray(corrected.astype(np.uint8), dtype=np.uint8)


def validate_restoration_quality(
    original: np.ndarray,
    restored: np.ndarray,
    analysis: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate restoration quality against objective Classical CV degradation criteria.

    Evaluates:
    - Brightness delta and contrast change ratio.
    - Noise delta.
    - Edge preservation ratio.
    - Highlight clipping increase and shadow clipping increase.
    - Color deviation (mean chromatic difference).
    - Output validity (dimensions, dtype, finiteness).
    - Flags potential degradation and recommends fallback if unacceptable.
    """
    orig_rgb = _validate_rgb_image(original)
    rest_rgb = _validate_output_image(restored, orig_rgb.shape)

    orig_lum = _luminance(orig_rgb).astype(np.float32)
    rest_lum = _luminance(rest_rgb).astype(np.float32)

    orig_mean = float(np.mean(orig_lum))
    rest_mean = float(np.mean(rest_lum))
    brightness_delta = rest_mean - orig_mean

    orig_contrast = float(np.std(orig_lum))
    rest_contrast = float(np.std(rest_lum))
    contrast_ratio = rest_contrast / max(orig_contrast, 1e-3)

    orig_lap = cv2.Laplacian(orig_lum, cv2.CV_32F)
    rest_lap = cv2.Laplacian(rest_lum, cv2.CV_32F)
    orig_noise = float(orig_lap.var())
    rest_noise = float(rest_lap.var())
    noise_delta = rest_noise - orig_noise

    orig_edges = float(orig_lap.std())
    rest_edges = float(rest_lap.std())
    edge_preservation_ratio = rest_edges / max(orig_edges, 1e-3)

    orig_clip = float(np.mean((orig_rgb >= 252).any(axis=2)))
    rest_clip = float(np.mean((rest_rgb >= 252).any(axis=2)))
    highlight_clipping_increase = max(0.0, rest_clip - orig_clip)

    orig_shadow_clip = float(np.mean((orig_rgb <= 4).all(axis=2)))
    rest_shadow_clip = float(np.mean((rest_rgb <= 4).all(axis=2)))
    shadow_clipping_increase = max(0.0, rest_shadow_clip - orig_shadow_clip)

    # Chromatic difference
    color_diff = float(np.mean(np.abs(rest_rgb.astype(float) - orig_rgb.astype(float))))

    flags: list[str] = []
    if highlight_clipping_increase > 0.18:
        flags.append("excessive_highlight_clipping")
    if rest_contrast < orig_contrast * 0.40 and orig_contrast > 20.0:
        flags.append("severe_contrast_loss")
    if (noise_delta > 1000.0 and rest_noise > orig_noise * 2.0) or noise_delta > 3000.0:
        flags.append("excessive_noise_amplification")
    if edge_preservation_ratio < 0.30 and orig_edges > 15.0:
        flags.append("excessive_edge_loss")

    conds = analysis.get("conditions", {}) if analysis else {}
    if color_diff > 55.0 and not conds.get("is_very_dark", False):
        flags.append("colour_distortion")

    is_acceptable = len(flags) == 0

    return {
        "is_acceptable": is_acceptable,
        "flags": flags,
        "brightness_delta": round(brightness_delta, 2),
        "contrast_ratio": round(contrast_ratio, 2),
        "edge_preservation_ratio": round(edge_preservation_ratio, 2),
        "noise_delta": round(noise_delta, 2),
        "highlight_clipping_increase": round(highlight_clipping_increase, 4),
        "shadow_clipping_increase": round(shadow_clipping_increase, 4),
        "color_diff": round(color_diff, 2),
        "status": "passed" if is_acceptable else "flagged_degradation",
    }


def enhance_classical(image: Any, analysis: dict[str, Any] | None = None, profile: str = "natural") -> dict[str, Any]:
    """Apply explainable, condition-aware classical restoration.

    Execution sequence:
    1. Validate input RGB uint8 image and ensure input immutability.
    2. Analyze image condition metrics if not precomputed.
    3. Profile & condition-driven parameter adaptation.
    4. Adaptive gamma with highlight protection.
    5. Luminance CLAHE with noise-aware clip limits.
    6. Luminance Multi-Scale Retinex with color-ratio preservation.
    7. Edge-preserving bilateral denoising.
    8. Damped colour correction.
    9. Quality validation stage with automated fallback if degraded.
    10. Return verified output array and full diagnostics metadata.
    """
    start_time = time.time()
    rgb = _validate_rgb_image(image)
    normalized_profile = _normalize_profile(profile)

    if analysis is None or not isinstance(analysis, dict):
        analysis = analyze_image(rgb)

    reference_shape = rgb.shape
    current = rgb.copy()

    cond = analysis.get("conditions", {})
    condition_label = cond.get("condition_label", "normally_illuminated")
    mean_b = float(analysis.get("mean_brightness", 100.0))
    contrast = float(analysis.get("contrast_score", 30.0))
    noise = float(analysis.get("noise_score", 10.0))
    underexposed = float(analysis.get("underexposed_ratio", 0.0))
    overexposed = float(analysis.get("overexposed_ratio", 0.0))
    highlight_clip = float(analysis.get("highlight_clipping_ratio", 0.0))

    # --- Profile Base Parameter Configurations ---
    profile_configs = {
        "natural": {
            "gamma_base": 0.82,
            "clahe_clip": 1.6,
            "clahe_grid": (8, 8),
            "clahe_blend": 0.85,
            "retinex_weight": 0.35,
            "denoise_strength": 12,
            "color_bias": 0.06,
        },
        "maximum_visibility": {
            "gamma_base": 0.68,
            "clahe_clip": 2.2,
            "clahe_grid": (8, 8),
            "clahe_blend": 1.0,
            "retinex_weight": 0.55,
            "denoise_strength": 16,
            "color_bias": 0.09,
        },
        "detail_preservation": {
            "gamma_base": 0.90,
            "clahe_clip": 1.3,
            "clahe_grid": (10, 10),
            "clahe_blend": 0.70,
            "retinex_weight": 0.20,
            "denoise_strength": 7,
            "color_bias": 0.03,
        },
    }
    cfg = profile_configs[normalized_profile]

    # --- Phase 7: Condition-Aware Parameter Adaptation ---
    applied_gamma = False
    applied_clahe = False
    applied_retinex = False
    applied_denoising = False
    applied_colour_correction = False
    highlight_compression_applied = False
    irrecoverable_clipping = highlight_clip > 0.08

    # 1. Adaptive Gamma Selection
    if condition_label == "overexposed":
        # Do NOT brighten overexposed images; apply highlight compression if needed
        gamma_inv = 1.0
        highlight_compress = True
        highlight_compression_applied = True
    elif condition_label == "very_dark":
        # Strong shadow recovery
        gamma_inv = cfg["gamma_base"] * 0.85
        highlight_compress = False
    elif condition_label == "noisy_low_light":
        # Conservative gamma to avoid amplifying sensor noise
        gamma_inv = max(0.78, cfg["gamma_base"] * 1.10)
        highlight_compress = False
    elif condition_label == "dark":
        gamma_inv = cfg["gamma_base"]
        highlight_compress = False
    elif condition_label == "low_contrast":
        # Low contrast needs gentle gamma; contrast will be restored via CLAHE
        gamma_inv = max(0.88, cfg["gamma_base"])
        highlight_compress = False
    elif condition_label == "normally_illuminated":
        # Minimal intervention on already well-exposed images
        gamma_inv = 1.0 if normalized_profile != "maximum_visibility" else 0.92
        highlight_compress = False
    else:  # mixed_lighting
        gamma_inv = max(0.80, cfg["gamma_base"])
        highlight_compress = overexposed > 0.05
        highlight_compression_applied = highlight_compress

    # Apply Gamma
    if abs(gamma_inv - 1.0) > 0.01 or highlight_compress:
        current = _apply_adaptive_gamma(
            current,
            gamma_inv=gamma_inv,
            highlight_protect=True,
            compress_highlights=highlight_compress,
        )
        applied_gamma = True

    # 2. Adaptive CLAHE
    clahe_clip = cfg["clahe_clip"]
    if condition_label == "noisy_low_light":
        # Reduce clip limit to avoid amplifying noise grain
        clahe_clip = max(1.0, clahe_clip * 0.65)
    elif condition_label == "low_contrast":
        # Boost contrast expansion for flat scenes
        clahe_clip = clahe_clip * 1.25

    should_apply_clahe = (
        condition_label in {"very_dark", "dark", "low_contrast"}
        or (contrast < 30.0 and condition_label != "normally_illuminated")
        or (underexposed > 0.20 and condition_label != "normally_illuminated")
        or normalized_profile == "maximum_visibility"
    ) and condition_label != "overexposed"

    if should_apply_clahe:
        current = _apply_clahe_luminance(
            current,
            clip_limit=clahe_clip,
            tile_grid=cfg["clahe_grid"],
            blend=cfg["clahe_blend"],
        )
        applied_clahe = True

    # 3. Luminance Multi-Scale Retinex
    retinex_weight = cfg["retinex_weight"]
    should_apply_retinex = (
        condition_label in {"very_dark", "dark", "mixed_lighting"}
        or (normalized_profile == "maximum_visibility" and condition_label != "overexposed")
        or (underexposed > 0.20 and condition_label != "overexposed")
    ) and (condition_label != "normally_illuminated" or normalized_profile == "maximum_visibility")

    if should_apply_retinex:
        if condition_label == "noisy_low_light":
            retinex_weight *= 0.50  # attenuate Retinex in heavy noise
        current = _apply_multiscale_retinex_luminance(
            current,
            scales=(15, 80, 250),
            weight=retinex_weight,
            beta=0.75,
        )
        applied_retinex = True

    # 4. Adaptive Bilateral Denoising
    should_denoise = (
        noise > 12.0
        or condition_label in {"noisy_low_light", "very_dark"}
        or normalized_profile == "natural"
    ) and (condition_label != "low_contrast" or noise > 20.0)

    if should_denoise:
        current = _apply_adaptive_bilateral_denoise(
            current,
            noise_score=noise,
            profile=normalized_profile,
            base_strength=cfg["denoise_strength"],
        )
        applied_denoising = True

    # 5. Damped Colour Correction
    should_color_correct = (
        condition_label in {"very_dark", "dark"}
        or highlight_clip > 0.05
        or normalized_profile == "maximum_visibility"
    ) and condition_label not in {"normally_illuminated", "overexposed"}

    if should_color_correct:
        current = _apply_adaptive_colour_correction(
            current,
            analysis=analysis,
            bias_strength=cfg["color_bias"],
        )
        applied_colour_correction = True

    # Validate output geometry and values
    output = _validate_output_image(current, reference_shape)

    # 6. Quality Validation Stage
    quality_report = validate_restoration_quality(rgb, output, analysis)

    # Automated Fallback Guard: if restoration caused severe degradation, fall back gracefully
    fallback_applied = False
    if not quality_report["is_acceptable"]:
        fallback_applied = True
        # Conservative fallback: mild highlight-protected gamma only
        fallback_output = _apply_adaptive_gamma(rgb, gamma_inv=0.90, highlight_protect=True)
        fallback_output = _validate_output_image(fallback_output, reference_shape)

        # Re-evaluate the fallback itself to ensure the fallback does not degrade the image
        fallback_report = validate_restoration_quality(rgb, fallback_output, analysis)
        fallback_report["fallback_applied"] = True
        if fallback_report["is_acceptable"]:
            quality_report = fallback_report
            quality_report["status"] = "fallback_conservative"
            output = fallback_output
        else:
            # Fallback also has degradation issues: report honestly
            quality_report = fallback_report
            quality_report["status"] = "flagged_degradation"
            quality_report["is_acceptable"] = False
            output = fallback_output

    elapsed_ms = round((time.time() - start_time) * 1000.0, 2)

    summary = {
        "profile": normalized_profile,
        "condition_label": condition_label,
        "gamma_applied": applied_gamma,
        "clahe_applied": applied_clahe,
        "retinex_applied": applied_retinex,
        "denoising_applied": applied_denoising,
        "colour_correction_applied": applied_colour_correction,
        "highlight_compression_applied": highlight_compression_applied,
        "irrecoverable_clipping_detected": irrecoverable_clipping,
        "fallback_applied": fallback_applied,
        "metrics": {
            "mean_brightness": mean_b,
            "contrast_score": contrast,
            "underexposed_ratio": underexposed,
            "overexposed_ratio": overexposed,
            "noise_score": noise,
            "edge_strength": float(analysis.get("edge_strength", 0.0)),
            "clipping_ratio": float(analysis.get("clipping_ratio", 0.0)),
        },
        "quality_report": quality_report,
        "warning": (
            "Irrecoverable highlight clipping was detected in the original image. "
            "Clipped details cannot be physically reconstructed from the single exposure."
            if irrecoverable_clipping
            else None
        ),
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
            "gamma_inv": float(gamma_inv),
            "clahe_clip_limit": float(clahe_clip),
            "tile_grid": list(cfg["clahe_grid"]),
            "denoise_strength": int(cfg["denoise_strength"]),
            "profile": normalized_profile,
            "condition_label": condition_label,
        },
        "quality_report": quality_report,
        "processing_summary": summary,
        "timings": {"processing_ms": elapsed_ms},
    }


__all__ = ["analyze_image", "enhance_classical", "validate_restoration_quality"]
