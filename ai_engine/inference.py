import numpy as np
import torch
import cv2
import time
import sys
import os

# --- IMPORTANT: Force Python to prioritize the local Retinexformer repo ---
RETINEXFORMER_REPO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Retinexformer'))
if RETINEXFORMER_REPO_PATH not in sys.path:
    sys.path.insert(0, RETINEXFORMER_REPO_PATH) # Use insert(0) instead of append

# --- FIXED IMPORT ---
# Import directly from the cloned repository's basicsr folder
from basicsr.models.archs.RetinexFormer_arch import RetinexFormer

# Global model variable (loaded once)
_model = None
_device = None

def _load_model():
    """Loads the Retinexformer model and weights once."""
    global _model, _device
    if _model is not None:
        return _model
    
    _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Loading Retinexformer on {_device}...")
    
    # Instantiate the architecture (LOL-v2 Real default config)
    model = RetinexFormer(
        in_channels=3,
        out_channels=3,
        n_feat=40,
        stage=1,
        num_blocks=[1, 2, 2]
    ).to(_device)
    
    # Path to the downloaded weights
    weights_path = os.path.join(
    os.path.dirname(__file__), '..', 'pretrained_weights', 'retinexformer-lol-v2-real.pth'
    )
    
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"Pretrained weights not found at {weights_path}. "
            "Please download 'retinexformer-lol-v2-real.pth' from Hugging Face."
        )
    
    # Load weights
    checkpoint = torch.load(weights_path, map_location=_device)
    # Handle if the weights are nested under 'params'
    state_dict = checkpoint.get('params', checkpoint)
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    
    _model = model
    print("Model loaded successfully!")
    return _model

def enhance_deep(image: np.ndarray, model_name="retinexformer"):
    """
    Deep learning inference using Retinexformer.
    Input: RGB uint8 NumPy array (H, W, 3)
    Output: Dictionary with 'image', 'model', 'inference_time_ms'
    """
    if model_name != "retinexformer":
        return {"image": image, "model": "placeholder", "inference_time_ms": 0.0}
    
    model = _load_model()
    
    # Preprocessing: HWC (RGB uint8) -> CHW (float tensor)
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    img_float = image_bgr.astype(np.float32) / 255.0
    img_tensor = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(_device)
    
    # Inference
    start_time = time.time()
    with torch.no_grad():
        output_tensor = model(img_tensor)
    inference_time_ms = (time.time() - start_time) * 1000
    
    # Postprocessing: CHW (float tensor) -> HWC (RGB uint8)
    output_np = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    output_np = np.clip(output_np * 255.0, 0, 255).astype(np.uint8)
    output_np = cv2.cvtColor(output_np, cv2.COLOR_BGR2RGB)
    
    return {
        "image": output_np,
        "model": "retinexformer",
        "inference_time_ms": inference_time_ms
    }