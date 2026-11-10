"""SNR-Aware Low Light Image Enhancement Module.

Estimates local Signal-to-Noise Ratio (SNR) to guide restoration and
prevent noise amplification in extremely dark regions containing heavy sensor noise.
"""
from __future__ import annotations

import cv2
import numpy as np


def compute_snr_map(image_rgb: np.ndarray, window_size: int = 7) -> np.ndarray:
    """Compute local Signal-to-Noise Ratio (SNR) map across spatial neighborhoods.
    SNR(x, y) = mu_local / (sigma_local + eps)
    Higher values = clear feature/signal; lower values = noise-dominated shadow.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    r = window_size

    # Local mean
    mean = cv2.boxFilter(gray, cv2.CV_32F, (r, r))
    # Local variance
    mean_sq = cv2.boxFilter(gray * gray, cv2.CV_32F, (r, r))
    var = np.maximum(mean_sq - mean * mean, 0.0)
    std = np.sqrt(var)

    # SNR map
    snr = mean / (std + 1e-3)
    return np.clip(snr, 0.0, 15.0)


def enhance_snr_aware(
    image_rgb: np.ndarray,
    deep_enhanced_rgb: np.ndarray,
    noise_threshold: float = 2.0,
) -> tuple[np.ndarray, np.ndarray]:
    """SNR-Aware Enhancement that modulates deep-learning output using the raw input's SNR map.

    In regions with high SNR (clear features): preserves 100% of deep neural textures.
    In regions with low SNR (noise-dominated shadows): applies guided structural
    regularization to prevent the neural network from hallucinating or amplifying sensor grain.
    """
    snr_map = compute_snr_map(image_rgb)
    norm_snr = np.clip(snr_map / 5.0, 0.0, 1.0)  # normalized to [0, 1]

    # Guided luminance from raw input to stabilize low-SNR zones
    raw_luma = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    deep_luma = cv2.cvtColor(deep_enhanced_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0

    # Low-pass stabilized luma
    stabilized_luma = cv2.bilateralFilter(deep_luma, d=7, sigmaColor=0.15, sigmaSpace=5.0)

    # Blend factor: low SNR -> use more stabilized luma
    blend_weight = np.expand_dims(cv2.GaussianBlur(norm_snr, (9, 9), 0), -1)

    fused = blend_weight * deep_enhanced_rgb.astype(np.float32) + (1.0 - blend_weight) * (
        deep_enhanced_rgb.astype(np.float32) * np.expand_dims(stabilized_luma / (deep_luma + 1e-4), -1)
    )

    out = np.clip(fused, 0, 255).astype(np.uint8)
    return out, snr_map
