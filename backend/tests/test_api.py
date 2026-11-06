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
