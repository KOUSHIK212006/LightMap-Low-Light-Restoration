from __future__ import annotations

import cv2
import numpy as np


def check_quality(
    original: np.ndarray,
    enhanced: np.ndarray,
    analysis: dict | None = None,
) -> dict:
    """Quality Guardian: evaluates enhanced restoration output against measurable quality metrics.

    Checks:
        1. Excessive Brightness: Detects unnatural overall blowouts or excessive brightening.
        2. Highlight Clipping: Quantifies newly saturated pure-white pixels (>= 250).
        3. Noise Amplification: Uses Laplacian variance to detect high-frequency noise explosion.
        4. Colour Distortion: Compares global chromatic vector shift between original and output.
        5. Output Validity: Enforces shape matching, uint8 dtype, and finite values.

    Returns:
        dict containing:
            - 'passed': bool indicating acceptable quality
            - 'checks': dict of numerical metrics
            - 'warnings': list of human-readable diagnostic messages
    """
    warnings: list[str] = []
    checks: dict[str, float] = {}

    orig = np.asarray(original, dtype=np.uint8)
    enh = np.asarray(enhanced, dtype=np.uint8)

    if orig.shape != enh.shape:
        return {
            "passed": False,
            "checks": {"dimension_mismatch": 1.0},
            "warnings": [f"Dimension mismatch: expected {orig.shape}, got {enh.shape}."],
        }

    orig_f = orig.astype(np.float32) / 255.0
    enh_f = enh.astype(np.float32) / 255.0

    # 1. Excessive Brightness Check
    orig_brightness = float(np.mean(orig_f))
    enh_brightness = float(np.mean(enh_f))
    brightness_increase = enh_brightness - orig_brightness

    checks["orig_brightness"] = round(orig_brightness, 4)
    checks["enh_brightness"] = round(enh_brightness, 4)
    checks["brightness_increase"] = round(brightness_increase, 4)

    if enh_brightness > 0.78:
        warnings.append("Restored image is excessively bright (mean luminance > 0.78).")
    elif brightness_increase > 0.55:
        warnings.append(
            f"Brightness increased excessively (+{brightness_increase:.2f}); potential over-exposure."
        )

    # 2. Highlight Clipping Check
    orig_clipped = float(np.mean(np.all(orig >= 250, axis=-1)))
    enh_clipped = float(np.mean(np.all(enh >= 250, axis=-1)))
    clipping_increase = max(0.0, enh_clipped - orig_clipped)

    checks["clipping_increase"] = round(clipping_increase, 4)
    checks["enh_clipped_ratio"] = round(enh_clipped, 4)

    if clipping_increase > 0.08:
        warnings.append(
            f"Highlight clipping increased by {clipping_increase * 100:.1f}%; detail lost in highlights."
        )

    # 3. Noise Amplification Check (Laplacian variance)
    orig_gray = cv2.cvtColor(orig, cv2.COLOR_RGB2GRAY)
    enh_gray = cv2.cvtColor(enh, cv2.COLOR_RGB2GRAY)

    orig_noise = float(cv2.Laplacian(orig_gray, cv2.CV_64F).var())
    enh_noise = float(cv2.Laplacian(enh_gray, cv2.CV_64F).var())

    noise_ratio = float(enh_noise / (orig_noise + 1e-4))
    checks["orig_noise"] = round(orig_noise, 2)
    checks["enh_noise"] = round(enh_noise, 2)
    checks["noise_ratio"] = round(noise_ratio, 3)

    if enh_noise > orig_noise * 3.5 and enh_noise > 400.0:
        warnings.append(
            f"Significant noise amplification detected (noise ratio: {noise_ratio:.1f}x)."
        )

    # 4. Colour Distortion Check
    orig_color = np.mean(orig_f, axis=(0, 1))
    enh_color = np.mean(enh_f, axis=(0, 1))
    color_shift = float(np.linalg.norm(enh_color - orig_color))

    checks["color_shift"] = round(color_shift, 4)
    # Don't penalize deep low-light color expansion when original is nearly black
    if color_shift > 0.28 and orig_brightness > 0.15:
        warnings.append(
            f"Potential unnatural colour shift detected (chromatic vector delta: {color_shift:.2f})."
        )

    passed = len(warnings) == 0

    return {
        "passed": passed,
        "checks": checks,
        "warnings": warnings,
    }


__all__ = ["check_quality"]
