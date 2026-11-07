import numpy as np
import cv2
import time
import sys
import os

# --- IMPORTANT: Force Python to prioritize the local Retinexformer repo ---
RETINEXFORMER_REPO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Retinexformer'))
if RETINEXFORMER_REPO_PATH not in sys.path:
    sys.path.insert(0, RETINEXFORMER_REPO_PATH)

# --- IMPORT BASICS ARCH ---
try:
    import torch
    import torch.nn.functional as F
    from basicsr.models.archs.RetinexFormer_arch import RetinexFormer
    TORCH_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    torch = None
    F = None
    RetinexFormer = None
    TORCH_AVAILABLE = False

# Global model variable (loaded once)
_model = None
_device = None

def _load_model():
    """Loads the Retinexformer model and weights once with device auto-detection."""
    global _model, _device
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch or Retinexformer (basicsr) is not installed.")

    if _model is not None:
        return _model
    
    # Priority: CUDA -> Apple Silicon MPS -> CPU
    if torch.cuda.is_available():
        _device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        _device = torch.device('mps')
    else:
        _device = torch.device('cpu')
        
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
    state_dict = checkpoint.get('params', checkpoint)
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    
    _model = model
    print(f"Retinexformer loaded successfully on {_device}!")
    return _model

def enhance_deep(image: np.ndarray, model_name="retinexformer", profile="natural"):
    """
    Enhanced deep learning inference using Retinexformer.
    
    Features:
    - Auto device selection (CUDA / Apple Silicon MPS / CPU)
    - Reflection padding to multiples of 8 (prevents boundary shearing on arbitrary image dimensions)
    - Highlight gradient preservation for direct light sources (lamps, neon)
    - Profile-aware exposure adaptation ('natural', 'visibility', 'detail')
    
    Input: RGB uint8 NumPy array (H, W, 3)
    Output: Dictionary with 'image', 'model', 'inference_time_ms', 'device'
    """
    if model_name != "retinexformer":
        return {"image": image, "model": "placeholder", "inference_time_ms": 0.0}
    
    model = _load_model()
    h, w, c = image.shape
    
    # 1. Preprocessing: HWC (RGB uint8) -> BGR float tensor
    t_start = time.time()
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    img_float = image_bgr.astype(np.float32) / 255.0
    img_tensor = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(_device)
    
    # Pad to multiple of 8 (required by multi-stage downsampling/upsampling blocks)
    factor = 8
    padh = ((h + factor - 1) // factor) * factor - h
    padw = ((w + factor - 1) // factor) * factor - w
    if padh > 0 or padw > 0:
        img_padded = F.pad(img_tensor, (0, padw, 0, padh), mode='reflect')
    else:
        img_padded = img_tensor
        
    t_prep = time.time()
    
    # 2. Forward inference
    with torch.no_grad():
        output_tensor = model(img_padded)
        if str(_device) == 'mps':
            torch.mps.synchronize()
        elif str(_device).startswith('cuda'):
            torch.cuda.synchronize()
            
    t_forward = time.time()
    
    # 3. Postprocessing & Unpadding
    if padh > 0 or padw > 0:
        output_tensor = output_tensor[:, :, :h, :w]
        
    output_np = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    output_np = np.clip(output_np * 255.0, 0, 255).astype(np.uint8)
    output_rgb = cv2.cvtColor(output_np, cv2.COLOR_BGR2RGB)
    
    # 4. Highlight gradient recovery
    # Deep networks often saturate bright light sources (lamps, neon) to pure 255 white blobs.
    # Where deep output saturates (>= 245) while original capture had unsaturated gradients (< 235),
    # smoothly blend original high-frequency details to recover filaments and glass housing.
    orig_luma = 0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]
    out_luma = 0.299 * output_rgb[:, :, 0] + 0.587 * output_rgb[:, :, 1] + 0.114 * output_rgb[:, :, 2]
    
    saturated_mask = (out_luma >= 242) & (orig_luma >= 150)
    if np.any(saturated_mask):
        blur_mask = cv2.GaussianBlur(saturated_mask.astype(np.float32), (9, 9), 0)
        blur_mask_3c = np.expand_dims(np.clip(blur_mask * 0.75, 0.0, 0.75), axis=-1)
        # Ratio scale to preserve lamp filaments without abrupt borders
        output_rgb = np.clip(
            (1.0 - blur_mask_3c) * output_rgb.astype(np.float32) + 
            blur_mask_3c * image.astype(np.float32) * 1.08,
            0, 255
        ).astype(np.uint8)
    
    # 5. Profile-guided tonal adjustments
    if profile == "visibility":
        # Lift deep shadows moderately for surveillance/forensics
        shadow_mask = out_luma < 50
        if np.any(shadow_mask):
            lift = np.clip((50 - out_luma) / 50.0, 0, 1.0)
            lift_3c = np.expand_dims(cv2.GaussianBlur(lift * 15.0, (7, 7), 0), axis=-1)
            output_rgb = np.clip(output_rgb.astype(np.float32) + lift_3c, 0, 255).astype(np.uint8)
    elif profile == "detail":
        # Micro-contrast enhancement on structural edges
        gaussian_blur = cv2.GaussianBlur(output_rgb, (0, 0), 2.0)
        unsharp = cv2.addWeighted(output_rgb, 1.25, gaussian_blur, -0.25, 0)
        output_rgb = np.clip(unsharp, 0, 255).astype(np.uint8)
        
    total_time_ms = (time.time() - t_start) * 1000
    forward_time_ms = (t_forward - t_prep) * 1000
    
    return {
        "image": output_rgb,
        "model": "retinexformer",
        "device": str(_device),
        "inference_time_ms": round(total_time_ms, 1),
        "forward_ms": round(forward_time_ms, 1),
    }
