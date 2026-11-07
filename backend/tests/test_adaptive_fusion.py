import numpy as np
import pytest
from ai_engine.adaptive_fusion import adaptive_fusion, adaptive_fusion_v1_legacy


def test_fusion_output_shape_and_dtype():
    orig = np.full((100, 100, 3), 20, dtype=np.uint8)
    classic = np.full((100, 100, 3), 80, dtype=np.uint8)
    deep = np.full((100, 100, 3), 120, dtype=np.uint8)

    res = adaptive_fusion(orig, classic, deep)
    assert res["image"].shape == (100, 100, 3)
    assert res["image"].dtype == np.uint8
    assert res["fusion_map"].shape == (100, 100)
    assert res["fusion_map"].dtype == np.uint8
    assert res["branch_disagreement_map"].shape == (100, 100)
    assert res["branch_disagreement_map"].dtype == np.uint8


def test_fusion_weight_bounds():
    orig = np.random.randint(0, 50, (64, 64, 3), dtype=np.uint8)
    classic = np.random.randint(40, 150, (64, 64, 3), dtype=np.uint8)
    deep = np.random.randint(60, 200, (64, 64, 3), dtype=np.uint8)

    res = adaptive_fusion(orig, classic, deep)
    w = res["fusion_map"]
    assert np.all(w >= 0)
    assert np.all(w <= 255)


def test_highlight_recovery_on_synthetic_overexposed_patch():
    # Synthetic scenario: deep model over-saturates highlights (e.g. lamp) to 255
    orig = np.full((50, 50, 3), 30, dtype=np.uint8)
    # Deep is completely burnt out at 255
    deep = np.full((50, 50, 3), 255, dtype=np.uint8)
    # Classical preserved tone and has gradient around 180
    classic = np.full((50, 50, 3), 180, dtype=np.uint8)

    res = adaptive_fusion(orig, classic, deep)
    fused = res["image"]

    # Fused image should NOT stay burnt out at 255; classical highlight recovery dampens it
    assert np.mean(fused) < 255
    assert np.mean(fused) >= 180


def test_legacy_fusion_backward_compatibility():
    orig = np.full((40, 40, 3), 25, dtype=np.uint8)
    classic = np.full((40, 40, 3), 90, dtype=np.uint8)
    deep = np.full((40, 40, 3), 130, dtype=np.uint8)

    res = adaptive_fusion_v1_legacy(orig, classic, deep)
    assert res["image"].shape == (40, 40, 3)
    assert "fusion_map" in res
    assert "branch_disagreement_map" in res
