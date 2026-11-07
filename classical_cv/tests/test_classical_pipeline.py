import numpy as np
import pytest

from classical_cv.classical_pipeline import analyze_image, enhance_classical, validate_restoration_quality


@pytest.fixture
def normal_image():
    # Gradient image for normal illumination testing
    x = np.linspace(50, 180, 64, dtype=np.uint8)
    img = np.tile(x, (64, 1))
    return np.stack([img, img, img], axis=-1)


@pytest.fixture
def dark_image():
    # Low-light image with subtle object
    img = np.full((64, 64, 3), 25, dtype=np.uint8)
    img[20:40, 20:40] = 45
    return img


def test_analyze_image_on_normal_image(normal_image):
    result = analyze_image(normal_image)
    assert result["mean_brightness"] > 0
    assert result["contrast_score"] >= 0
    assert "brightness_distribution" in result
    assert result["image_dimensions"]["channels"] == 3
    assert "local_contrast" in result
    assert "median_brightness" in result
    assert "mean_saturation" in result
    assert "highlight_clipping_ratio" in result
    assert "shadow_clipping_ratio" in result
    assert "condition_label" in result["conditions"]


def test_analyze_image_on_dark_image(dark_image):
    result = analyze_image(dark_image)
    assert result["mean_brightness"] < 100
    assert result["conditions"]["is_underexposed"] is True
    assert result["conditions"]["is_very_dark"] is True or result["conditions"]["is_dark"] is True


def test_gamma_correction(normal_image):
    result = enhance_classical(normal_image, profile="natural")
    output = result["image"]
    assert output.shape == normal_image.shape
    assert output.dtype == np.uint8
    assert output.ndim == 3
    assert np.isfinite(output).all()


def test_clahe_on_dark_image(dark_image):
    result = enhance_classical(dark_image, profile="natural")
    assert result["image"].shape == dark_image.shape
    assert result["processing_summary"]["clahe_applied"] in {True, False}


def test_retinex_on_dark_image(dark_image):
    result = enhance_classical(dark_image, profile="maximum_visibility")
    assert result["image"].shape == dark_image.shape
    assert result["processing_summary"]["retinex_applied"] in {True, False}


def test_denoising(normal_image):
    noisy = normal_image.copy()
    noisy[::2, ::2] = 0
    result = enhance_classical(noisy, profile="natural")
    assert result["image"].shape == noisy.shape
    assert result["image"].dtype == np.uint8


def test_colour_correction(normal_image):
    image = normal_image.copy()
    image[:, :, 0] = 30
    result = enhance_classical(image, profile="natural")
    assert result["image"].shape == image.shape
    assert result["processing_summary"]["colour_correction_applied"] in {True, False}


@pytest.mark.parametrize("profile", ["natural", "maximum_visibility", "detail_preservation"])
def test_all_profiles(normal_image, profile):
    result = enhance_classical(normal_image, profile=profile)
    assert result["image"].shape == normal_image.shape
    assert result["parameters"]["profile"] == profile


def test_rgb_channel_preservation(normal_image):
    result = enhance_classical(normal_image, profile="natural")
    assert result["image"].shape[2] == 3
    assert np.array_equal(result["image"][..., 0].shape, normal_image[..., 0].shape)


def test_output_dimensions_and_dtype(normal_image):
    result = enhance_classical(normal_image, profile="detail_preservation")
    assert result["image"].shape == normal_image.shape
    assert result["image"].dtype == np.uint8


def test_invalid_image_input():
    with pytest.raises(ValueError):
        analyze_image(np.zeros((32, 32), dtype=np.uint8))


def test_empty_image_input():
    with pytest.raises(ValueError):
        analyze_image(np.empty((0, 0, 3), dtype=np.uint8))


# --- Comprehensive Condition-Aware and Edge Case Tests (Phase 11) ---

def test_condition_1_extremely_dark_image():
    ext_dark = np.random.randint(0, 6, size=(48, 48, 3), dtype=np.uint8)
    analysis = analyze_image(ext_dark)
    assert analysis["conditions"]["is_very_dark"] is True

    result = enhance_classical(ext_dark, profile="natural")
    output = result["image"]
    assert output.shape == ext_dark.shape
    assert output.dtype == np.uint8
    assert np.isfinite(output).all()
    # Shadow recovery should raise mean intensity without artifacts
    assert np.mean(output) >= np.mean(ext_dark)


def test_condition_2_dark_noisy_image():
    np.random.seed(42)
    base = np.full((64, 64, 3), 30, dtype=np.float32)
    noise = np.random.normal(0, 15, size=(64, 64, 3))
    noisy = np.clip(base + noise, 0, 255).astype(np.uint8)

    analysis = analyze_image(noisy)
    assert analysis["conditions"]["is_noisy"] is True

    result = enhance_classical(noisy, profile="natural")
    output = result["image"]
    assert output.shape == noisy.shape
    assert result["processing_summary"]["denoising_applied"] is True


def test_condition_3_low_contrast_image():
    # Flat image with minimal variance
    low_contrast = np.full((60, 60, 3), 85, dtype=np.uint8)
    low_contrast[::2, :] = 87
    analysis = analyze_image(low_contrast)
    assert analysis["conditions"]["is_low_contrast"] is True

    result = enhance_classical(low_contrast, profile="natural")
    assert result["image"].shape == low_contrast.shape
    assert result["processing_summary"]["clahe_applied"] is True


def test_condition_4_mixed_lighting_image():
    mixed = np.zeros((64, 64, 3), dtype=np.uint8)
    mixed[:, :32] = 20   # Dark shadow half
    mixed[:, 32:] = 230  # Bright highlight half

    analysis = analyze_image(mixed)
    assert analysis["conditions"]["is_mixed_lighting"] is True

    result = enhance_classical(mixed, profile="natural")
    output = result["image"]
    assert output.shape == mixed.shape
    # Dark side should be lifted
    assert np.mean(output[:, :32]) > np.mean(mixed[:, :32])


def test_condition_5_overexposed_image():
    overexposed = np.full((64, 64, 3), 235, dtype=np.uint8)
    overexposed[10:30, 10:30] = 254
    analysis = analyze_image(overexposed)
    assert analysis["conditions"]["is_overexposed"] is True
    assert analysis["highlight_clipping_ratio"] > 0

    result = enhance_classical(overexposed, profile="natural")
    output = result["image"]
    # Overexposed image must not be brightened further
    assert np.mean(output) <= np.mean(overexposed) + 1.0
    assert result["processing_summary"]["highlight_compression_applied"] is True


def test_condition_6_normally_illuminated_image():
    normal = np.linspace(60, 180, 64 * 64 * 3, dtype=np.uint8).reshape((64, 64, 3))
    analysis = analyze_image(normal)
    assert analysis["conditions"]["is_normally_illuminated"] is True

    result = enhance_classical(normal, profile="natural")
    output = result["image"]
    # Normal image receives minimal modification, preserving natural tones
    diff = np.mean(np.abs(output.astype(float) - normal.astype(float)))
    assert diff < 15.0


def test_condition_7_constant_intensity_image():
    # Tests mathematical stability when variance is exactly zero
    constant = np.full((40, 40, 3), 90, dtype=np.uint8)
    analysis = analyze_image(constant)
    assert analysis["contrast_score"] == 0.0
    assert np.isfinite(analysis["mean_brightness"])

    result = enhance_classical(constant, profile="natural")
    output = result["image"]
    assert output.shape == constant.shape
    assert np.isfinite(output).all()
    assert not np.isnan(output).any()


def test_condition_8_single_colour_image():
    # Pure red image should preserve its hue without being forced to gray
    red_img = np.zeros((48, 48, 3), dtype=np.uint8)
    red_img[:, :, 0] = 220
    analysis = analyze_image(red_img)
    assert analysis["mean_saturation"] > 0.5

    result = enhance_classical(red_img, profile="natural")
    output = result["image"]
    # Red channel must remain dominant over green and blue
    assert np.mean(output[:, :, 0]) > 2 * np.mean(output[:, :, 1])
    assert np.mean(output[:, :, 0]) > 2 * np.mean(output[:, :, 2])


def test_condition_9_high_contrast_image():
    # Checkerboard image with stark black-and-white transitions
    high_contrast = np.zeros((64, 64, 3), dtype=np.uint8)
    high_contrast[::16, :] = 250
    high_contrast[:, ::16] = 250
    analysis = analyze_image(high_contrast)
    assert analysis["edge_strength"] > 0

    result = enhance_classical(high_contrast, profile="detail_preservation")
    output = result["image"]
    assert output.shape == high_contrast.shape
    assert np.isfinite(output).all()


@pytest.mark.parametrize("shape", [(40, 160, 3), (160, 40, 3), (55, 55, 3)])
def test_condition_10_different_aspect_ratios(shape):
    test_img = np.full(shape, 35, dtype=np.uint8)
    result = enhance_classical(test_img, profile="natural")
    assert result["image"].shape == shape
    assert result["image"].dtype == np.uint8


def test_profile_meaningful_differences():
    # On a dark image, the three profiles must produce measurably different outputs
    dark = np.full((64, 64, 3), 28, dtype=np.uint8)
    dark[20:40, 20:40] = 50

    res_natural = enhance_classical(dark, profile="natural")
    res_visibility = enhance_classical(dark, profile="maximum_visibility")
    res_detail = enhance_classical(dark, profile="detail_preservation")

    out_nat = res_natural["image"]
    out_vis = res_visibility["image"]
    out_det = res_detail["image"]

    # Must not be identical arrays
    assert not np.array_equal(out_nat, out_vis)
    assert not np.array_equal(out_nat, out_det)
    assert not np.array_equal(out_vis, out_det)

    # Maximum visibility lifts shadows more aggressively than detail preservation
    mean_vis = np.mean(out_vis)
    mean_det = np.mean(out_det)
    assert mean_vis > mean_det


def test_input_immutability(dark_image):
    original_copy = dark_image.copy()
    _ = analyze_image(dark_image)
    _ = enhance_classical(dark_image, profile="maximum_visibility")
    # Original array passed in by caller must remain strictly unmodified
    assert np.array_equal(dark_image, original_copy)


def test_quality_validation_function(dark_image):
    result = enhance_classical(dark_image, profile="natural")
    report = validate_restoration_quality(dark_image, result["image"])

    assert "is_acceptable" in report
    assert "brightness_delta" in report
    assert "contrast_ratio" in report
    assert "edge_preservation_ratio" in report
    assert "status" in report
    assert report["is_acceptable"] is True
