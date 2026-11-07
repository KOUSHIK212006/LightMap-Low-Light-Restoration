import numpy as np
import pytest

from scripts.metrics import (
    compute_psnr,
    compute_ssim,
    compute_noise_reduction,
    compute_edge_preservation,
    compute_niqe_stub,
    compute_lpips_stub,
)


def test_psnr_identical_images():
    img = np.full((32, 32, 3), 120, dtype=np.uint8)
    psnr = compute_psnr(img, img)
    assert psnr == float("inf")


def test_psnr_different_images():
    img1 = np.full((32, 32, 3), 100, dtype=np.uint8)
    img2 = np.full((32, 32, 3), 110, dtype=np.uint8)
    # MSE is 100, 10 * log10(255^2 / 100) = 28.13 dB
    psnr = compute_psnr(img1, img2)
    assert 28.0 < psnr < 28.3


def test_ssim_identical_images():
    img = np.random.randint(0, 255, (48, 48, 3), dtype=np.uint8)
    ssim = compute_ssim(img, img)
    assert abs(ssim - 1.0) < 1e-3


def test_noise_reduction_metric():
    base = np.full((40, 40, 3), 80, dtype=np.uint8)
    noisy = np.clip(base.astype(float) + np.random.normal(0, 20, (40, 40, 3)), 0, 255).astype(np.uint8)
    res = compute_noise_reduction(noisy, base)
    assert res["orig_noise"] > res["enh_noise"]
    assert res["reduction_ratio"] > 0.5


def test_edge_preservation_metric():
    img = np.zeros((40, 40, 3), dtype=np.uint8)
    img[:, 20:] = 200
    res = compute_edge_preservation(img, img)
    assert abs(res["preservation_ratio"] - 1.0) < 1e-2


def test_metric_stubs():
    img = np.zeros((32, 32, 3), dtype=np.uint8)
    niqe = compute_niqe_stub(img)
    assert niqe["indicator_type"] == "no_reference"
    lpips = compute_lpips_stub(img, img)
    assert "lpips" in lpips["notice"].lower()
