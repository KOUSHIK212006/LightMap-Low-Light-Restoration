import numpy as np
import pytest

from ai_engine.adaptive_fusion import adaptive_fusion
from ai_engine.inference import is_model_available, enhance_deep
from ai_engine.quality_guardian import check_quality


def test_adaptive_fusion_mathematical_correctness():
    h, w = 64, 64
    # Create test original with dark left half and bright right half
    orig = np.zeros((h, w, 3), dtype=np.uint8)
    orig[:, :32] = 20   # Dark region (illumination ~ 0.08)
    orig[:, 32:] = 200  # Bright region (illumination ~ 0.78)

    # Classical output: moderate lift
    classical = np.full((h, w, 3), 80, dtype=np.uint8)
    # Deep output: high lift
    deep = np.full((h, w, 3), 160, dtype=np.uint8)

    res = adaptive_fusion(orig, classical, deep)

    assert "image" in res
    assert "fusion_map" in res
    assert "branch_disagreement_map" in res

    fused = res["image"]
    w_map = res["fusion_map"]
    disagreement = res["branch_disagreement_map"]

    assert fused.shape == (h, w, 3)
    assert fused.dtype == np.uint8
    assert w_map.shape == (h, w)
    assert disagreement.shape == (h, w)

    # In dark region, W should be higher (more deep learning)
    # In bright region, W should be lower (more classical)
    mean_w_dark = np.mean(w_map[:, :25])
    mean_w_bright = np.mean(w_map[:, 39:])
    assert mean_w_dark > mean_w_bright

    # Fused image in dark region should be closer to deep (160) than classical (80)
    # In bright region, fused should be closer to classical (80) than deep (160)
    assert np.mean(fused[:, :25]) > np.mean(fused[:, 39:])

    # Disagreement should be |160 - 80| = 80
    assert abs(np.mean(disagreement) - 80.0) < 5.0


def test_quality_guardian_validates_metrics():
    orig = np.full((50, 50, 3), 40, dtype=np.uint8)

    # 1. Acceptable enhancement
    good = np.full((50, 50, 3), 80, dtype=np.uint8)
    res_good = check_quality(orig, good)
    assert res_good["passed"] is True
    assert len(res_good["warnings"]) == 0

    # 2. Excessive brightness (> 0.78 * 255 = 198.9)
    blown_out = np.full((50, 50, 3), 220, dtype=np.uint8)
    res_blow = check_quality(orig, blown_out)
    assert res_blow["passed"] is False
    assert any("excessively bright" in w.lower() for w in res_blow["warnings"])

    # 3. Highlight clipping
    clipped = good.copy()
    clipped[:15, :] = 255  # 30% pure white
    res_clip = check_quality(orig, clipped)
    assert res_clip["passed"] is False
    assert any("clipping" in w.lower() for w in res_clip["warnings"])


def test_model_availability_and_clear_error_when_weights_missing():
    avail, reason = is_model_available()
    # In this environment without PyTorch or without weights, availability should be False
    assert avail is False
    assert len(reason) > 0

    # Calling enhance_deep directly without weights must raise FileNotFoundError or RuntimeError
    img = np.full((32, 32, 3), 30, dtype=np.uint8)
    with pytest.raises((FileNotFoundError, RuntimeError)):
        enhance_deep(img)
