"""Evaluation Metrics for LightMap Restoration.

Provides reference-based and no-reference evaluation indicators:
- PSNR (Peak Signal-to-Noise Ratio) [Full Reference]
- SSIM (Structural Similarity Index) [Full Reference]
- LPIPS interface [Full Reference perceptual]
- NIQE notes & interface [No-Reference indicator]
- Noise Reduction [Full/No Reference]
- Edge Preservation Ratio [Full/No Reference]
- Latency (Processing Time in milliseconds)

IMPORTANT METHODOLOGICAL NOTE:
PSNR, SSIM, and LPIPS require paired ground-truth reference images with exact
alignment.
NIQE is an empirical no-reference indicator and must NOT be used as proof of
restoration quality in isolation.
"""

from __future__ import annotations

import cv2
import numpy as np


def compute_psnr(image_true: np.ndarray, image_test: np.ndarray, data_range: float = 255.0) -> float:
    """Compute Peak Signal-to-Noise Ratio (PSNR) in dB.

    Requires: Paired ground-truth reference image.
    Formula: 10 * log10(MAX_I^2 / MSE)
    """
    true_f = np.asarray(image_true, dtype=np.float64)
    test_f = np.asarray(image_test, dtype=np.float64)

    if true_f.shape != test_f.shape:
        raise ValueError(f"Shape mismatch for PSNR: {true_f.shape} vs {test_f.shape}")

    mse = np.mean((true_f - test_f) ** 2)
    if mse == 0:
        return float("inf")

    return float(10.0 * np.log10((data_range ** 2) / mse))


def compute_ssim(
    image_true: np.ndarray,
    image_test: np.ndarray,
    data_range: float = 255.0,
    k1: float = 0.01,
    k2: float = 0.03,
) -> float:
    """Compute Structural Similarity Index (SSIM) across RGB or Grayscale images.

    Requires: Paired ground-truth reference image.
    Formula: (2*mu_x*mu_y + C1)(2*sigma_xy + C2) / ((mu_x^2 + mu_y^2 + C1)(sigma_x^2 + sigma_y^2 + C2))
    """
    true_f = np.asarray(image_true, dtype=np.float64)
    test_f = np.asarray(image_test, dtype=np.float64)

    if true_f.shape != test_f.shape:
        raise ValueError(f"Shape mismatch for SSIM: {true_f.shape} vs {test_f.shape}")

    # Convert to grayscale luminance if RGB
    if true_f.ndim == 3 and true_f.shape[2] == 3:
        true_f = 0.299 * true_f[:, :, 0] + 0.587 * true_f[:, :, 1] + 0.114 * true_f[:, :, 2]
        test_f = 0.299 * test_f[:, :, 0] + 0.587 * test_f[:, :, 1] + 0.114 * test_f[:, :, 2]

    c1 = (k1 * data_range) ** 2
    c2 = (k2 * data_range) ** 2

    # Gaussian window weights
    kernel = cv2.getGaussianKernel(11, 1.5)
    window = np.outer(kernel, kernel.transpose())

    mu1 = cv2.filter2D(true_f, -1, window)[5:-5, 5:-5]
    mu2 = cv2.filter2D(test_f, -1, window)[5:-5, 5:-5]

    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.filter2D(true_f ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
    sigma2_sq = cv2.filter2D(test_f ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
    sigma12 = cv2.filter2D(true_f * test_f, -1, window)[5:-5, 5:-5] - mu1_mu2

    ssim_map = ((2.0 * mu1_mu2 + c1) * (2.0 * sigma12 + c2)) / (
        (mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2) + 1e-10
    )
    return float(np.mean(ssim_map))


def compute_noise_reduction(original: np.ndarray, enhanced: np.ndarray) -> dict[str, float]:
    """Compute Laplacian variance noise reduction ratio."""
    orig_gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY) if original.ndim == 3 else original
    enh_gray = cv2.cvtColor(enhanced, cv2.COLOR_RGB2GRAY) if enhanced.ndim == 3 else enhanced

    orig_noise = float(cv2.Laplacian(orig_gray, cv2.CV_64F).var())
    enh_noise = float(cv2.Laplacian(enh_gray, cv2.CV_64F).var())

    reduction_ratio = float((orig_noise - enh_noise) / (orig_noise + 1e-5))
    return {
        "orig_noise": round(orig_noise, 2),
        "enh_noise": round(enh_noise, 2),
        "reduction_ratio": round(reduction_ratio, 4),
    }


def compute_edge_preservation(original: np.ndarray, enhanced: np.ndarray) -> dict[str, float]:
    """Compute Sobel edge preservation ratio between original and enhanced images."""
    orig_gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY).astype(np.float32) if original.ndim == 3 else original.astype(np.float32)
    enh_gray = cv2.cvtColor(enhanced, cv2.COLOR_RGB2GRAY).astype(np.float32) if enhanced.ndim == 3 else enhanced.astype(np.float32)

    sobel_orig = np.hypot(cv2.Sobel(orig_gray, cv2.CV_32F, 1, 0), cv2.Sobel(orig_gray, cv2.CV_32F, 0, 1))
    sobel_enh = np.hypot(cv2.Sobel(enh_gray, cv2.CV_32F, 1, 0), cv2.Sobel(enh_gray, cv2.CV_32F, 0, 1))

    mean_orig = float(np.mean(sobel_orig))
    mean_enh = float(np.mean(sobel_enh))
    ratio = float(mean_enh / (mean_orig + 1e-4))

    return {
        "orig_edge_energy": round(mean_orig, 2),
        "enh_edge_energy": round(mean_enh, 2),
        "preservation_ratio": round(ratio, 4),
    }


def compute_niqe_stub(image: np.ndarray) -> dict[str, str | None]:
    """NIQE (Naturalness Image Quality Evaluator) interface.

    NOTE: NIQE is an empirical no-reference image statistical model.
    It does NOT provide proof of restoration quality or signal reconstruction
    accuracy, as over-sharpened or contrast-distorted artifacts can artificially
    lower NIQE scores.
    """
    return {
        "score": None,
        "indicator_type": "no_reference",
        "notice": "NIQE is a no-reference indicator; use paired PSNR/SSIM for quantitative benchmarks.",
    }


def compute_lpips_stub(image_true: np.ndarray, image_test: np.ndarray) -> dict[str, str | None]:
    """LPIPS interface (requires lpips PyTorch library and pretrained AlexNet/VGG weights)."""
    try:
        import lpips  # noqa: F401
        import torch  # noqa: F401
        available = True
    except ImportError:
        available = False

    return {
        "score": None,
        "available": str(available),
        "notice": "Requires 'lpips' and PyTorch installed with torchvision pretrained models.",
    }

