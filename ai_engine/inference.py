import os
import sys
import time

import cv2
import numpy as np

RETINEXFORMER_REPO_PATH = os.getenv(
    "LIGHTMAP_RETINEXFORMER_REPO_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Retinexformer")),
)
if RETINEXFORMER_REPO_PATH and os.path.isdir(RETINEXFORMER_REPO_PATH):
    RETINEXFORMER_REPO_PATH = os.path.abspath(RETINEXFORMER_REPO_PATH)
    if RETINEXFORMER_REPO_PATH not in sys.path:
        sys.path.insert(0, RETINEXFORMER_REPO_PATH)

try:
    import torch
except ImportError:
    torch = None

try:
    from basicsr.models.archs.RetinexFormer_arch import RetinexFormer
except (ImportError, ModuleNotFoundError):
    RetinexFormer = None

TORCH_AVAILABLE = torch is not None

_model = None
_device = None


def _candidate_checkpoint_paths() -> list[str]:
    configured = os.getenv("LIGHTMAP_DEEP_CHECKPOINT_PATH", "").strip()
    paths: list[str] = []
    if configured:
        paths.append(configured)
    paths.extend(
        [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pretrained_weights", "retinexformer-lol-v2-real.pth")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pretrained_weights", "LOL_v2_real.pth")),
        ]
    )
    return paths


def _load_model():
    """Loads the Retinexformer model and weights once, using CPU by default when no GPU is available."""
    global _model, _device

    if not TORCH_AVAILABLE:
        raise RuntimeError(
            "PyTorch is not installed in this environment. Deep-learning restoration is unavailable "
            "until torch is installed."
        )

    if RetinexFormer is None:
        raise RuntimeError(
            "Retinexformer model implementation is unavailable. Install the BasicSR/Retinexformer "
            "dependency or set LIGHTMAP_RETINEXFORMER_REPO_PATH to the correct repo path."
        )

    if _model is not None:
        return _model

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading Retinexformer on {_device}...")

    model = RetinexFormer(
        in_channels=3,
        out_channels=3,
        n_feat=40,
        stage=1,
        num_blocks=[1, 2, 2],
    ).to(_device)

    weights_path = None
    for candidate in _candidate_checkpoint_paths():
        if os.path.exists(candidate):
            weights_path = candidate
            break

    if weights_path is None:
        raise FileNotFoundError(
            "Deep model checkpoint is missing. Expected a Retinexformer checkpoint at "
            "pretrained_weights/retinexformer-lol-v2-real.pth or via LIGHTMAP_DEEP_CHECKPOINT_PATH. "
            "Classic CV remains available; deep mode is disabled until the checkpoint is added."
        )

    checkpoint = torch.load(weights_path, map_location=_device)
    if isinstance(checkpoint, dict) and "params" in checkpoint:
        state_dict = checkpoint["params"]
    elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        state_dict = checkpoint["state_dict"]
    else:
        state_dict = checkpoint

    model.load_state_dict(state_dict, strict=True)
    model.eval()

    _model = model
    print("Retinexformer model loaded successfully.")
    return _model


def enhance_deep(image: np.ndarray, model_name="retinexformer"):
    """Deep learning inference using Retinexformer. Returns meaningful errors if the model is unavailable."""
    if model_name != "retinexformer":
        return {"image": image, "model": "placeholder", "inference_time_ms": 0.0}

    model = _load_model()

    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    img_float = image_bgr.astype(np.float32) / 255.0
    img_tensor = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(_device)

    start_time = time.time()
    with torch.no_grad():
        output_tensor = model(img_tensor)
    inference_time_ms = (time.time() - start_time) * 1000

    output_np = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    output_np = np.clip(output_np * 255.0, 0, 255).astype(np.uint8)
    output_np = cv2.cvtColor(output_np, cv2.COLOR_BGR2RGB)

    return {
        "image": output_np,
        "model": "retinexformer",
        "inference_time_ms": inference_time_ms,
    }
