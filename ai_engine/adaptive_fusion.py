import cv2
import numpy as np


def adaptive_fusion_v1_legacy(original, classical_output, deep_output, analysis=None):
    """Legacy fixed-rule fusion for ablation and historical comparison."""
    original_f = original.astype(np.float32) / 255.0
    classical_f = classical_output.astype(np.float32) / 255.0
    deep_f = deep_output.astype(np.float32) / 255.0

    illumination = np.dot(original_f[..., :3], [0.299, 0.587, 0.114])
    W = np.clip((0.5 - illumination) * 2.0, 0.2, 0.9)
    W_smooth = cv2.GaussianBlur(W, (31, 31), 0)
    W_3c = np.expand_dims(W_smooth, axis=-1)

    fused_f = (W_3c * deep_f) + ((1.0 - W_3c) * classical_f)
    fused_img = np.clip(fused_f * 255.0, 0, 255).astype(np.uint8)

    disagreement = np.mean(np.abs(classical_f - deep_f), axis=-1)
    disagreement_uint8 = np.clip(disagreement * 255.0, 0, 255).astype(np.uint8)
    W_vis = np.clip(W_smooth * 255.0, 0, 255).astype(np.uint8)

    return {
        "image": fused_img,
        "fusion_map": W_vis,
        "branch_disagreement_map": disagreement_uint8,
    }


def adaptive_fusion(original, classical_output, deep_output, analysis=None):
    """Production Deep-First Illumination-Adaptive Hybrid Fusion.

    Uses deep learning as the baseline and dynamically applies classical
    highlight protection, edge-aware sharpening, guided texture preservation,
    and chromatic stabilization in regions where deep learning exhibits
    measurable flaws. The fusion weight W adapts per-pixel based on three
    independent signal detectors: highlight clipping, noise amplification,
    and edge structure loss.
    """
    orig_f = original.astype(np.float32) / 255.0
    c_f = classical_output.astype(np.float32) / 255.0
    d_f = deep_output.astype(np.float32) / 255.0

    # 1. Luminance computation (BT.601 perceptual weights)
    d_luma = 0.299 * d_f[..., 0] + 0.587 * d_f[..., 1] + 0.114 * d_f[..., 2]
    c_luma = 0.299 * c_f[..., 0] + 0.587 * c_f[..., 1] + 0.114 * c_f[..., 2]
    orig_luma = 0.299 * orig_f[..., 0] + 0.587 * orig_f[..., 1] + 0.114 * orig_f[..., 2]

    # 2. Problem Signal A: Highlight clipping & over-exposure in deep output
    # Deep models saturate light sources into flat white patches; classical preserves gradients.
    clip_signal = np.clip((d_luma - 0.82) / 0.18, 0.0, 1.0)

    # 3. Problem Signal B: Noise amplification in flat dark regions
    # High-frequency noise in deep output not supported by the original raw sensor capture
    d_blur = cv2.GaussianBlur(d_luma, (5, 5), 0)
    orig_blur = cv2.GaussianBlur(orig_luma, (5, 5), 0)
    d_hf = np.abs(d_luma - d_blur)
    orig_hf = np.abs(orig_luma - orig_blur)
    noise_signal = np.clip((d_hf - orig_hf * 1.5) * 5.0, 0.0, 1.0)

    # 4. Problem Signal C: Edge structure loss in deep output
    # Detect strong edges in the original that the deep model may have smoothed over.
    # Sobel gradient magnitude on original vs deep — where deep lost sharpness,
    # classical's edges are blended in to restore structural fidelity.
    orig_grad_x = cv2.Sobel(orig_luma, cv2.CV_32F, 1, 0, ksize=3)
    orig_grad_y = cv2.Sobel(orig_luma, cv2.CV_32F, 0, 1, ksize=3)
    orig_edges = np.sqrt(orig_grad_x ** 2 + orig_grad_y ** 2)

    deep_grad_x = cv2.Sobel(d_luma, cv2.CV_32F, 1, 0, ksize=3)
    deep_grad_y = cv2.Sobel(d_luma, cv2.CV_32F, 0, 1, ksize=3)
    deep_edges = np.sqrt(deep_grad_x ** 2 + deep_grad_y ** 2)

    # Edge loss: original had a strong edge but deep smoothed it away
    edge_loss = np.clip((orig_edges - deep_edges * 0.8) * 3.0, 0.0, 1.0)
    edge_signal = cv2.GaussianBlur(edge_loss, (7, 7), 0)

    # 5. Spatially Continuous Weight Map W (1.0 = 100% Deep, 0.0 = 100% Classical)
    # Default is deep-first (0.95), reducing in clipped, noisy, or edge-lost zones
    W = 0.95 - 0.45 * clip_signal - 0.15 * noise_signal - 0.20 * edge_signal
    W = np.clip(W, 0.35, 1.0)
    W_smooth = cv2.GaussianBlur(W, (11, 11), 0)

    # 6. Detail preservation using guided texture from original raw input
    # Fast box-guided smoothing to eliminate flat-area blotches while preserving structure
    r = 3
    eps = 0.002
    mean_I = cv2.boxFilter(orig_luma, cv2.CV_32F, (r, r))
    mean_p = cv2.boxFilter(d_luma, cv2.CV_32F, (r, r))
    mean_Ip = cv2.boxFilter(orig_luma * d_luma, cv2.CV_32F, (r, r))
    cov_Ip = mean_Ip - mean_I * mean_p
    mean_II = cv2.boxFilter(orig_luma * orig_luma, cv2.CV_32F, (r, r))
    var_I = mean_II - mean_I * mean_I
    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I
    guided_luma = cv2.boxFilter(a, cv2.CV_32F, (r, r)) * orig_luma + cv2.boxFilter(b, cv2.CV_32F, (r, r))

    # 7. Fused Luminance
    # Combines deep base, highlight-recovered classical, and noise-stabilized guided luma
    target_luma = W_smooth * d_luma + (1.0 - W_smooth) * (0.55 * c_luma + 0.45 * guided_luma)

    # Ratio transfer to RGB channels to strictly preserve color balance and avoid hue shifts
    ratio = (target_luma + 1e-4) / (d_luma + 1e-4)
    ratio = np.clip(ratio, 0.65, 1.30)
    fused_f = d_f * np.expand_dims(ratio, axis=-1)

    # 8. Chromatic balancing: blend with classical chrominance in deep clipped highlights
    clip_mask_3c = np.expand_dims(cv2.GaussianBlur(clip_signal, (15, 15), 0), axis=-1)
    fused_f = (1.0 - 0.20 * clip_mask_3c) * fused_f + (0.20 * clip_mask_3c) * c_f

    # 9. Edge-Aware Unsharp Masking (Hybrid-exclusive sharpening pass)
    # Extract the fused luminance, apply structure-preserving sharpening guided by
    # the original image's edge map. This gives hybrid a visible crispness advantage.
    fused_luma = 0.299 * fused_f[..., 0] + 0.587 * fused_f[..., 1] + 0.114 * fused_f[..., 2]
    fused_blur = cv2.GaussianBlur(fused_luma, (3, 3), 1.0)
    high_freq = fused_luma - fused_blur

    # Sharpening strength adapts to local edge importance from the original
    edge_strength = np.clip(orig_edges * 4.0, 0.0, 1.0)
    edge_strength_smooth = cv2.GaussianBlur(edge_strength, (5, 5), 0)

    # Apply sharpening only where the original had meaningful structure
    sharpen_amount = 0.6 * edge_strength_smooth
    sharpened_luma = fused_luma + sharpen_amount * high_freq

    # Transfer the sharpened luminance back to RGB via ratio mapping
    sharp_ratio = (sharpened_luma + 1e-4) / (fused_luma + 1e-4)
    sharp_ratio = np.clip(sharp_ratio, 0.90, 1.10)
    fused_f = fused_f * np.expand_dims(sharp_ratio, axis=-1)

    fused_img = np.clip(fused_f * 255.0, 0, 255).astype(np.uint8)

    # 10. Maps for full-resolution explainability
    disagreement = np.mean(np.abs(c_f - d_f), axis=-1)
    p98 = float(np.percentile(disagreement, 98))
    scale = max(p98, 0.08)
    disagreement_uint8 = np.clip((disagreement / scale) * 255.0, 0, 255).astype(np.uint8)
    W_vis = np.clip(W_smooth * 255.0, 0, 255).astype(np.uint8)

    return {
        "image": fused_img,
        "fusion_map": W_vis,
        "branch_disagreement_map": disagreement_uint8,
        "fusion_weight_raw": W_smooth,
    }
