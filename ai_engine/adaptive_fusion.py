from __future__ import annotations

import cv2
import numpy as np


def adaptive_fusion(
    original: np.ndarray,
    classical_output: np.ndarray,
    deep_output: np.ndarray,
    analysis: dict | None = None,
) -> dict[str, np.ndarray]:
    """Adaptive Hybrid Fusion (Illumination-Aware Adaptive Fusion - IAAF).

    Combines Classical CV and Deep Learning restoration outputs using a
    spatially varying weight map derived from the original illumination.

    Mathematical formulation:
        I_H(x, y) = W(x, y) * I_D(x, y) + (1 - W(x, y)) * I_C(x, y)

    Where:
        - I_H = Hybrid restored output (RGB uint8)
        - I_D = Deep learning restored output (RGB uint8)
        - I_C = Classical CV restored output (RGB uint8)
        - W(x, y) = Spatially smoothed adaptive weight map in [0.2, 0.9]

    Behavior:
        - Dark shadow regions (illumination < 0.2): Weight tilts towards Deep Learning (W -> 0.9)
          for aggressive shadow reconstruction and detail emergence.
        - Well-lit regions (illumination > 0.5): Weight tilts towards Classical CV (W -> 0.2)
          to preserve natural colors, texture, and avoid neural over-smoothing.
        - Transition zones: Smooth Gaussian roll-off prevents visual boundary artifacts.
    """
    orig_f = np.asarray(original, dtype=np.float32) / 255.0
    classical_f = np.asarray(classical_output, dtype=np.float32) / 255.0
    deep_f = np.asarray(deep_output, dtype=np.float32) / 255.0

    # Ensure all shapes match
    if orig_f.shape != classical_f.shape or orig_f.shape != deep_f.shape:
        raise ValueError(
            f"Shape mismatch in adaptive fusion: original={orig_f.shape}, "
            f"classical={classical_f.shape}, deep={deep_f.shape}"
        )

    # 1. Compute Illumination Map via standard perceptual luminance: 0.299*R + 0.587*G + 0.114*B
    illumination = (
        0.299 * orig_f[:, :, 0] + 0.587 * orig_f[:, :, 1] + 0.114 * orig_f[:, :, 2]
    )

    # 2. Compute Raw Weight Map W:
    # Inverse illumination mapping: darker areas get higher weight (up to 0.9) for DL branch.
    raw_w = np.clip((0.5 - illumination) * 2.0, 0.2, 0.9)

    # 3. Spatial Smoothing: Apply Gaussian blur to prevent seam or block artifacts
    # Ensure kernel size is odd and does not exceed image dimensions
    h, w = orig_f.shape[:2]
    ksize = min(31, max(3, (min(h, w) // 4) * 2 + 1))
    if ksize % 2 == 0:
        ksize += 1

    w_smooth = cv2.GaussianBlur(raw_w.astype(np.float32), (ksize, ksize), 0)

    # Expand to 3 channels for broadcasting with RGB: (H, W, 1) -> (H, W, 3)
    w_3c = np.expand_dims(w_smooth, axis=-1)

    # 4. Apply Fusion Equation: I_H = W * I_D + (1 - W) * I_C
    fused_f = (w_3c * deep_f) + ((1.0 - w_3c) * classical_f)
    fused_img = np.clip(fused_f * 255.0, 0, 255).astype(np.uint8)

    # 5. Compute Branch Disagreement Map: |I_C - I_D|
    disagreement = np.mean(np.abs(classical_f - deep_f), axis=-1)
    disagreement_uint8 = np.clip(disagreement * 255.0, 0, 255).astype(np.uint8)

    # Convert smoothed weight map to uint8 (0-255) for visual display
    w_vis = np.clip(w_smooth * 255.0, 0, 255).astype(np.uint8)

    return {
        "image": fused_img,
        "fusion_map": w_vis,
        "branch_disagreement_map": disagreement_uint8,
    }


__all__ = ["adaptive_fusion"]
