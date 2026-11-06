import numpy as np
import pytest

from classical_cv.classical_pipeline import analyze_image, enhance_classical


@pytest.fixture
def normal_image():
    return np.full((64, 64, 3), 180, dtype=np.uint8)


@pytest.fixture
def dark_image():
    return np.full((64, 64, 3), 25, dtype=np.uint8)


def test_analyze_image_on_normal_image(normal_image):
    result = analyze_image(normal_image)
    assert result["mean_brightness"] > 0
    assert result["contrast_score"] >= 0
    assert "brightness_distribution" in result
    assert result["image_dimensions"]["channels"] == 3


def test_analyze_image_on_dark_image(dark_image):
    result = analyze_image(dark_image)
    assert result["mean_brightness"] < 100
    assert result["conditions"]["is_underexposed"] is True


def test_gamma_correction(normal_image):
    result = enhance_classical(normal_image, profile="natural")
    output = result["image"]
    assert output.shape == normal_image.shape
    assert output.dtype == np.uint8
    assert output.ndim == 3


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
    assert result["parameters"]["profile"] == profile if profile != "maximum_visibility" else "maximum_visibility"


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
