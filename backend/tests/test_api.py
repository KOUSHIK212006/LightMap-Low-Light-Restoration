from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services import restoration_service as restoration_service_module

client = TestClient(app)


def make_image_bytes(file_format: str = "PNG", size=(64, 64), color=(18, 25, 35)) -> bytes:
    image = Image.new("RGB", size, color)
    buffer = io.BytesIO()
    image.save(buffer, format=file_format)
    return buffer.getvalue()


def test_backend_starts():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "LightMap" in response.json()["service"]


def test_valid_jpeg_upload():
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.jpg", make_image_bytes("JPEG"), "image/jpeg")},
        data={"profile": "natural"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["final_image"].startswith("data:image/")
    assert payload["warnings"]


def test_valid_png_upload():
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.png", make_image_bytes("PNG"), "image/png")},
        data={"profile": "visibility"},
    )
    assert response.status_code == 200
    assert response.json()["profile"] == "visibility"


def test_unsupported_file_type():
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.txt", b"not an image", "text/plain")},
        data={"profile": "natural"},
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_invalid_or_corrupt_image():
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("broken.jpg", b"NotAValidImageFile", "image/jpeg")},
        data={"profile": "natural"},
    )
    assert response.status_code == 400
    assert "Invalid or corrupt image file" in response.json()["detail"]


def test_oversized_image():
    oversized = b"x" * (11 * 1024 * 1024)
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("large.png", oversized, "image/png")},
        data={"profile": "natural"},
    )
    assert response.status_code == 413


def test_missing_optional_restoration_modules(monkeypatch):
    def fake_import_optional_module(module_path: str, symbol_name: str):
        return None

    monkeypatch.setattr(restoration_service_module, "import_optional_module", fake_import_optional_module)
    service = restoration_service_module.RestorationService()
    image = Image.new("RGB", (32, 32), (20, 15, 10))
    payload = service.enhance(image)

    assert payload["warnings"]
    assert payload["demo_mode"] is True


def test_api_error_handling():
    response = client.post("/api/v1/analyze", files=[])
    assert response.status_code in {400, 422}


def test_empty_image_upload_rejected():
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("empty.png", b"", "image/png")},
        data={"profile": "natural"},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_classical_enhancement_selected_over_placeholders():
    dark_bytes = make_image_bytes("PNG", size=(64, 64), color=(15, 15, 15))
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("dark.png", dark_bytes, "image/png")},
        data={"profile": "natural"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_method"] == "classical"
    assert payload["processing_status"] == "success"
    assert payload["final_image"] is not None
    assert "restored_analysis" in payload


def test_image_analysis_endpoint_returns_metrics():
    sample_bytes = make_image_bytes("PNG", size=(64, 64), color=(50, 60, 70))
    response = client.post(
        "/api/v1/analyze",
        files={"image": ("sample.png", sample_bytes, "image/png")},
        data={"profile": "natural"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "mean_brightness" in payload
    assert "contrast_score" in payload
    assert "noise_score" in payload
    assert "image_dimensions" in payload
    assert payload["image_dimensions"]["width"] == 64
    assert payload["image_dimensions"]["height"] == 64


@pytest.mark.parametrize("profile", ["natural", "maximum_visibility", "detail_preservation", "visibility", "detail"])
def test_all_profiles_api_response(profile):
    sample_bytes = make_image_bytes("PNG", size=(48, 48), color=(20, 20, 20))
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.png", sample_bytes, "image/png")},
        data={"profile": profile},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_method"] == "classical"
    assert payload["final_image"].startswith("data:image/png;base64,")


def test_method_classical_explicit():
    sample_bytes = make_image_bytes("PNG", size=(32, 32), color=(25, 25, 25))
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.png", sample_bytes, "image/png")},
        data={"profile": "natural", "method": "classical"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_method"] == "classical"
    assert payload["method"] == "classical"
    assert payload["processing_status"] == "success"
    assert payload["final_image"] is not None


def test_method_deep_missing_weights_reported_honestly():
    sample_bytes = make_image_bytes("PNG", size=(32, 32), color=(25, 25, 25))
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.png", sample_bytes, "image/png")},
        data={"profile": "natural", "method": "deep"},
    )
    assert response.status_code == 200
    payload = response.json()
    # When Retinexformer weights are missing, deep method must report failure, not fabricate an image
    assert payload["status"] == "failed"
    assert payload["final_image"] is None
    assert "unavailable" in payload["message"].lower() or "missing" in payload["message"].lower()


def test_hybrid_fusion_when_both_branches_available(monkeypatch):
    import numpy as np

    def fake_deep_branch(self, image, profile):
        # Simulate working deep learning output (brightened)
        return np.clip(image.astype(float) * 2.0, 0, 255).astype(np.uint8), None

    monkeypatch.setattr(restoration_service_module.RestorationService, "_call_deep_branch", fake_deep_branch)

    sample_bytes = make_image_bytes("PNG", size=(32, 32), color=(25, 25, 25))
    response = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.png", sample_bytes, "image/png")},
        data={"profile": "natural", "method": "hybrid"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_method"] == "hybrid"
    assert payload["status"] == "success"
    assert payload["final_image"] is not None
    assert payload["fusion_map"] is not None
    assert payload["branch_disagreement_map"] is not None
    assert payload["fusion_map"].startswith("data:image/png;base64,")
    assert payload["branch_disagreement_map"].startswith("data:image/png;base64,")
