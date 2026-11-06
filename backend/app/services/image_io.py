from __future__ import annotations

import base64
import io

import numpy as np
from PIL import Image


def ensure_rgb_uint8(image: np.ndarray) -> np.ndarray:
    array = np.asarray(image, dtype=np.uint8)
    if array.ndim != 3 or array.shape[2] != 3:
        raise ValueError("Image must have shape (height, width, 3) with RGB channels.")
    return array


def encode_image_to_data_url(image: np.ndarray, image_format: str = "PNG") -> str:
    rgb_image = ensure_rgb_uint8(image)
    pillow_image = Image.fromarray(rgb_image, mode="RGB")
    buffer = io.BytesIO()
    pillow_image.save(buffer, format=image_format)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/{image_format.lower()};base64,{encoded}"
