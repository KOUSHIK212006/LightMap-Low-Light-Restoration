import numpy as np
import cv2

def check_quality(original, enhanced, analysis=None):
    """
    Checks the enhanced image for artifacts against measurable thresholds.
    Returns a report with pass/fail and warnings.
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
    
    checks["noise_ratio"] = float(enh_noise / (orig_noise + 1e-5))
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

    # Final Pass/Fail Logic
    passed = len(warnings) == 0

    return {
        "passed": passed,
        "checks": checks,
        "warnings": warnings
    }