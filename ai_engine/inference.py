from __future__ import annotations

import os
import sys
import time
import cv2
import numpy as np

# Global cached model and device to prevent reloading per inference
_model = None
_device = None


def get_weights_path() -> str:
    """Return the canonical path to the Retinexformer pretrained weights."""
    return os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "pretrained_weights",
            "retinexformer-lol-v2-real.pth",
        )
    )


def is_model_available() -> tuple[bool, str]:
    """Check if PyTorch and Retinexformer weights are available."""
    try:
        import torch  # noqa: F401
    except ImportError:
        return False, "PyTorch is not installed in the Python environment."

    weights_path = get_weights_path()
    if not os.path.exists(weights_path):
        return (
            False,
            f"Pretrained weights not found at '{weights_path}'. "
            "Please download 'retinexformer-lol-v2-real.pth' from Hugging Face into 'pretrained_weights/'.",
        )

    return True, "Ready"


def _load_model():
    """Load the Retinexformer model architecture and pretrained weights once.

    Caches the loaded model globally.
    Raises:
        RuntimeError: If PyTorch is unavailable.
        FileNotFoundError: If checkpoint file is not present.
    """
    global _model, _device
    if _model is not None:
        return _model

    try:
        import torch
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch is not installed. To run Retinexformer deep restoration, "
            "install PyTorch and required dependencies."
        ) from exc

    weights_path = get_weights_path()
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"Pretrained weights not found at {weights_path}. "
            "Please download 'retinexformer-lol-v2-real.pth' from Hugging Face."
        )

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Locate RetinexFormer architecture definition
    # 1. First check local basicsr in Retinexformer clone if present
    retinex_repo = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "Retinexformer")
    )
    if os.path.exists(retinex_repo) and retinex_repo not in sys.path:
        sys.path.insert(0, retinex_repo)

    try:
        from basicsr.models.archs.RetinexFormer_arch import RetinexFormer
    except ImportError as exc:
        raise RuntimeError(
            "RetinexFormer architecture definition could not be imported from basicsr. "
            "Ensure the Retinexformer repository is cloned or basicsr is installed."
        ) from exc

    # Instantiate architecture with LOL-v2 Real default configuration
    model = RetinexFormer(
        in_channels=3,
        out_channels=3,
        n_feat=40,
        stage=1,
        num_blocks=[1, 2, 2],
    ).to(_device)

    # Load weights
    checkpoint = torch.load(weights_path, map_location=_device)
    state_dict = checkpoint.get("params", checkpoint)
    model.load_state_dict(state_dict, strict=True)
    model.eval()

    _model = model
    return _model


def enhance_deep(image: np.ndarray, model_name: str = "retinexformer") -> dict:
    """Deep learning restoration using Retinexformer.

    Args:
        image: RGB uint8 NumPy array of shape (H, W, 3).
        model_name: Model identifier (default: "retinexformer").

    Returns:
        dict containing:
            - 'image': Enhanced RGB uint8 array (H, W, 3)
            - 'model': Model name
            - 'inference_time_ms': Execution latency in milliseconds

    Raises:
        FileNotFoundError: If weights are missing.
        RuntimeError: If PyTorch or model architecture is missing.
        ValueError: If input image is invalid.
    """
    if image is None or not isinstance(image, np.ndarray) or image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Invalid image input: expected RGB uint8 array of shape (H, W, 3).")

    if model_name != "retinexformer":
        raise ValueError(f"Unsupported deep-learning model: '{model_name}'. Supported: 'retinexformer'.")

    # This will raise FileNotFoundError or RuntimeError with a clear message if unavailable
    model = _load_model()
    import torch

    h, w, c = image.shape
    start_time = time.time()

    # Preprocessing: RGB uint8 -> BGR float32 in [0, 1] -> Tensor [1, 3, H, W]
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    img_float = image_bgr.astype(np.float32) / 255.0
    img_tensor = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(_device)

    with torch.no_grad():
        output_tensor = model(img_tensor)

    inference_time_ms = round((time.time() - start_time) * 1000, 2)

    # Postprocessing: Tensor [1, 3, H, W] -> NumPy HWC -> BGR to RGB uint8
    output_np = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    output_np = np.clip(output_np * 255.0, 0, 255).astype(np.uint8)
    output_rgb = cv2.cvtColor(output_np, cv2.COLOR_BGR2RGB)

    if output_rgb.shape != (h, w, c):
        output_rgb = cv2.resize(output_rgb, (w, h), interpolation=cv2.INTER_LANCZOS4)

    return {
        "image": output_rgb,
        "model": "retinexformer",
        "inference_time_ms": inference_time_ms,
    }


__all__ = ["enhance_deep", "is_model_available", "get_weights_path"]
