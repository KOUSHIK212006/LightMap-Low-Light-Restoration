from __future__ import annotations

import base64
import io

import numpy as np
from PIL import Image


def ensure_rgb_uint8(image: np.ndarray) -> np.ndarray:
    array = np.asarray(image, dtype=np.uint8)
    if array.ndim == 2:
        # Convert 2D grayscale/visualization map to 3-channel RGB
        return np.ascontiguousarray(np.stack([array, array, array], axis=-1), dtype=np.uint8)
    if array.ndim == 3 and array.shape[2] == 1:
        # 1-channel with dimension (H, W, 1)
        squeezed = array.squeeze(axis=-1)
        return np.ascontiguousarray(np.stack([squeezed, squeezed, squeezed], axis=-1), dtype=np.uint8)
    if array.ndim != 3 or array.shape[2] != 3:
        raise ValueError("Image must have shape (height, width, 3) or (height, width) for 2D maps.")
    return np.ascontiguousarray(array, dtype=np.uint8)


def encode_image_to_data_url(image: np.ndarray, image_format: str = "PNG") -> str:
    rgb_image = ensure_rgb_uint8(image)
    pillow_image = Image.fromarray(rgb_image, mode="RGB")
    buffer = io.BytesIO()
    pillow_image.save(buffer, format=image_format)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/{image_format.lower()};base64,{encoded}"
