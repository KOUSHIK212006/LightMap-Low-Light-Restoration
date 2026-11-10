import numpy as np
import cv2
from scipy import stats


def check_quality(original, enhanced, analysis=None):
    """
    Checks the enhanced image for artifacts against measurable thresholds.
    Returns a report with pass/fail, warnings, and normalized quality_scores.
    """
    warnings = []
    checks = {}

    # Convert to float for math
    orig_f = original.astype(np.float32) / 255.0
    enh_f = enhanced.astype(np.float32) / 255.0

    # 1. Excessive Brightness Check
    orig_brightness = np.mean(orig_f)
    enh_brightness = np.mean(enh_f)
    brightness_increase = enh_brightness - orig_brightness
    
    checks["brightness_increase"] = float(brightness_increase)
    if enh_brightness > 0.75: # Image is too bright overall
        warnings.append("Image is excessively bright.")
    elif brightness_increase > 0.5:
        warnings.append("Brightness was increased too aggressively.")

    # 2. Highlight Clipping Check
    # Count pixels that are pure white (255) in the enhanced image
    orig_clipped = np.mean(np.all(original >= 250, axis=-1))
    enh_clipped = np.mean(np.all(enhanced >= 250, axis=-1))
    clipping_increase = enh_clipped - orig_clipped
    
    checks["clipping_increase"] = float(clipping_increase)
    if clipping_increase > 0.05: # If more than 5% of the image is now pure white
        warnings.append(f"Highlight clipping increased by {clipping_increase*100:.1f}%.")

    # 3. Noise Amplification Check (using Laplacian variance as a proxy for high-frequency noise)
    orig_gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY)
    enh_gray = cv2.cvtColor(enhanced, cv2.COLOR_RGB2GRAY)
    
    orig_noise = cv2.Laplacian(orig_gray, cv2.CV_64F).var()
    enh_noise = cv2.Laplacian(enh_gray, cv2.CV_64F).var()
    
    noise_ratio = float(enh_noise / (orig_noise + 1e-5))
    checks["noise_ratio"] = noise_ratio
    if enh_noise > orig_noise * 3.0: # Noise tripled
        warnings.append("Significant noise amplification detected.")

    # 4. Unnatural Colour Shift Check
    # Compare mean color channels
    orig_color = np.mean(orig_f, axis=(0, 1))
    enh_color = np.mean(enh_f, axis=(0, 1))
    color_shift = np.linalg.norm(enh_color - orig_color)
    
    checks["color_shift"] = float(color_shift)
    if color_shift > 0.15:
        warnings.append("Potential unnatural colour shift detected.")

    # ---- New Metrics ----

    # 5. Highlight Clipping Percentage (absolute, on enhanced image)
    highlight_clipping_pct = float(np.mean(np.all(enhanced > 250, axis=-1)) * 100.0)
    checks["highlight_clipping_pct"] = highlight_clipping_pct

    # 6. Shadow Clipping Percentage (pixels where ALL channels < 5 in enhanced)
    shadow_clipping_pct = float(np.mean(np.all(enhanced < 5, axis=-1)) * 100.0)
    checks["shadow_clipping_pct"] = shadow_clipping_pct
    if shadow_clipping_pct > 15.0:
        warnings.append(
            f"Shadow clipping is excessive ({shadow_clipping_pct:.1f}% of pixels)."
        )

    # 7. Noise Amplification Ratio – per-channel variant
    per_channel_noise_ratio = []
    for ch in range(original.shape[2]):
        orig_ch_noise = cv2.Laplacian(original[:, :, ch], cv2.CV_64F).var()
        enh_ch_noise = cv2.Laplacian(enhanced[:, :, ch], cv2.CV_64F).var()
        per_channel_noise_ratio.append(float(enh_ch_noise / (orig_ch_noise + 1e-5)))
    checks["noise_amplification_ratio"] = noise_ratio
    checks["noise_amplification_ratio_per_channel"] = per_channel_noise_ratio

    # 8. Edge Preservation Score (Sobel-based Pearson correlation)
    orig_sobel_x = cv2.Sobel(orig_gray, cv2.CV_64F, 1, 0, ksize=3)
    orig_sobel_y = cv2.Sobel(orig_gray, cv2.CV_64F, 0, 1, ksize=3)
    orig_edges = np.sqrt(orig_sobel_x ** 2 + orig_sobel_y ** 2)

    enh_sobel_x = cv2.Sobel(enh_gray, cv2.CV_64F, 1, 0, ksize=3)
    enh_sobel_y = cv2.Sobel(enh_gray, cv2.CV_64F, 0, 1, ksize=3)
    enh_edges = np.sqrt(enh_sobel_x ** 2 + enh_sobel_y ** 2)

    # Pearson correlation between flattened edge maps (with zero-variance safety)
    std_orig = float(np.std(orig_edges))
    std_enh = float(np.std(enh_edges))
    if std_orig > 1e-4 and std_enh > 1e-4:
        edge_corr, _ = stats.pearsonr(orig_edges.ravel(), enh_edges.ravel())
        edge_preservation_score = float(max(0.0, edge_corr)) if np.isfinite(edge_corr) else 1.0
    else:
        edge_preservation_score = 1.0  # Constant flat inputs preserve structural edges trivially
    checks["edge_preservation_score"] = edge_preservation_score
    if edge_preservation_score < 0.7:
        warnings.append(
            f"Edge preservation is low ({edge_preservation_score:.2f}). "
            "Structural detail may be lost."
        )

    # 9. Colour Deviation Score (mean angular deviation in Lab space, in degrees)
    orig_lab = cv2.cvtColor(original, cv2.COLOR_RGB2Lab).astype(np.float64)
    enh_lab = cv2.cvtColor(enhanced, cv2.COLOR_RGB2Lab).astype(np.float64)

    # Reshape to (N, 3) for vectorised angular deviation
    orig_lab_flat = orig_lab.reshape(-1, 3)
    enh_lab_flat = enh_lab.reshape(-1, 3)

    # Cosine of angle between each pair of Lab vectors
    dot_product = np.sum(orig_lab_flat * enh_lab_flat, axis=1)
    orig_norm = np.linalg.norm(orig_lab_flat, axis=1) + 1e-10
    enh_norm = np.linalg.norm(enh_lab_flat, axis=1) + 1e-10
    cos_angle = np.clip(dot_product / (orig_norm * enh_norm), -1.0, 1.0)
    angular_deviation_rad = np.arccos(cos_angle)
    colour_deviation_score = float(np.degrees(np.mean(angular_deviation_rad)))
    checks["colour_deviation_score"] = colour_deviation_score
    if colour_deviation_score > 8.0:
        warnings.append(
            f"Colour deviation is high ({colour_deviation_score:.1f}°). "
            "Colours may appear unnatural."
        )

    # ---- Quality Scores (normalized 0-100) ----

    highlight_safety = float(np.clip(100.0 - highlight_clipping_pct * 10.0, 0.0, 100.0))
    shadow_safety = float(np.clip(100.0 - shadow_clipping_pct * 5.0, 0.0, 100.0))

    # noise_control: 100 if ratio < 1.5, linearly down to 0 at ratio 5.0
    if noise_ratio < 1.5:
        noise_control = 100.0
    elif noise_ratio >= 5.0:
        noise_control = 0.0
    else:
        noise_control = 100.0 * (1.0 - (noise_ratio - 1.5) / (5.0 - 1.5))
    noise_control = float(np.clip(noise_control, 0.0, 100.0))

    edge_fidelity = float(np.clip(edge_preservation_score * 100.0, 0.0, 100.0))

    # colour_fidelity: 100 if deviation < 2, linearly down to 0 at 15 degrees
    if colour_deviation_score < 2.0:
        colour_fidelity = 100.0
    elif colour_deviation_score >= 15.0:
        colour_fidelity = 0.0
    else:
        colour_fidelity = 100.0 * (1.0 - (colour_deviation_score - 2.0) / (15.0 - 2.0))
    colour_fidelity = float(np.clip(colour_fidelity, 0.0, 100.0))

    # Weighted average (equal weights)
    overall = float(np.mean([
        highlight_safety, shadow_safety, noise_control,
        edge_fidelity, colour_fidelity
    ]))

    quality_scores = {
        "highlight_safety": highlight_safety,
        "shadow_safety": shadow_safety,
        "noise_control": noise_control,
        "edge_fidelity": edge_fidelity,
        "colour_fidelity": colour_fidelity,
        "overall": overall,
    }

    # Final Pass/Fail Logic
    passed = len(warnings) == 0

    return {
        "passed": passed,
        "checks": checks,
        "warnings": warnings,
        "quality_scores": quality_scores,
    }
