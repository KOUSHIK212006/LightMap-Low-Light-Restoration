from __future__ import annotations

import io
from typing import Any

import numpy as np
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

from app.core.config import get_settings


def validate_file_extension(filename: str | None) -> None:
    if not filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    settings = get_settings()
    if extension not in settings.allowed_extensions:
        supported = ", ".join(settings.allowed_extensions)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension}'. Supported formats: {supported}.",
        )


def validate_file_size(file: UploadFile, max_size_bytes: int) -> None:
    if file is None:
        raise HTTPException(status_code=400, detail="Image upload is missing.")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Image exceeds the maximum supported size of {max_size_bytes / (1024 * 1024):.1f} MB. "
                "Please upload a smaller image."
            ),
        )


def validate_and_decode_image(file: UploadFile, max_size_bytes: int | None = None) -> np.ndarray:
    settings = get_settings()
    validate_file_extension(file.filename)

    if max_size_bytes is None:
        max_size_bytes = settings.max_upload_size_bytes

    validate_file_size(file, max_size_bytes)

    file.file.seek(0)
    raw_bytes = file.file.read()
    file.file.seek(0)

    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image = ImageOps.exif_transpose(image)
        image.load()
        rgb_image = image.convert("RGB")
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=400, detail="Invalid or corrupt image file.") from exc

    rgb_array = np.asarray(rgb_image, dtype=np.uint8)
    if rgb_array.ndim != 3 or rgb_array.shape[2] != 3:
        raise HTTPException(status_code=400, detail="Image must be a valid RGB image.")

    height, width = rgb_array.shape[:2]
    if height > settings.max_image_height or width > settings.max_image_width:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Image dimensions are too large. Maximum supported size is {settings.max_image_width}x"
                f"{settings.max_image_height} pixels."
            ),
        )

    return rgb_array


def convert_bgr_to_rgb(image: Any) -> np.ndarray:
    array = np.asarray(image, dtype=np.uint8)
    if array.ndim != 3 or array.shape[2] != 3:
        raise ValueError("Expected an RGB or BGR image array with three channels.")
    return array[..., ::-1].copy()
