import numpy as np
import cv2

def adaptive_fusion(original, classical_output, deep_output, analysis=None):
    """
    Adaptive Hybrid Fusion (IAAF).
    Combines classical and deep learning outputs using a spatially varying weight map.
    """
    # Ensure images are float32 for math operations
    original_f = original.astype(np.float32) / 255.0
    classical_f = classical_output.astype(np.float32) / 255.0
    deep_f = deep_output.astype(np.float32) / 255.0

    # 1. Create an Illumination Map (Brightness of the original image)
    # We use the standard luminosity formula: 0.299*R + 0.587*G + 0.114*B
    illumination = np.dot(original_f[..., :3], [0.299, 0.587, 0.114])

    # 2. Generate the Weight Map (W)
    # Rule: In dark regions (illumination < 0.2), we want more Deep Learning (W -> 1.0).
    # In bright regions (illumination > 0.5), we want more Classical (W -> 0.0).
    # We use np.clip to bound the weights between 0.2 and 0.9 so we always have a mix.
    W = np.clip((0.5 - illumination) * 2.0, 0.2, 0.9)

    # 3. Smooth the Weight Map to avoid patchy boundaries
    # We apply a Gaussian blur to the weight map
    W_smooth = cv2.GaussianBlur(W, (31, 31), 0)

    # Expand dimensions of W to match the 3 color channels (H, W, 1) -> (H, W, 3)
    W_3c = np.expand_dims(W_smooth, axis=-1)

    # 4. Apply the Fusion Formula: I_H = W * I_D + (1 - W) * I_C
    fused_f = (W_3c * deep_f) + ((1.0 - W_3c) * classical_f)

    # Convert back to uint8 RGB
    fused_img = np.clip(fused_f * 255.0, 0, 255).astype(np.uint8)

    # 5. Generate the Disagreement Map
    # Absolute difference between classical and deep outputs, averaged across channels
    disagreement = np.mean(np.abs(classical_f - deep_f), axis=-1)
    disagreement_uint8 = np.clip(disagreement * 255.0, 0, 255).astype(np.uint8)

    # Convert weight map to uint8 for visualization (0 to 255)
    W_vis = np.clip(W_smooth * 255.0, 0, 255).astype(np.uint8)

    return {
        "image": fused_img,
        "fusion_map": W_vis,
        "branch_disagreement_map": disagreement_uint8
    }

def enhance_with_retry(original, classical_func, deep_func, fusion_func, quality_func, max_retries=2):
    """
    A bounded wrapper that runs the pipeline and retries if quality fails.
    """
    attempt = 0
    best_result = None
    best_quality = None
    
    # Simple retry strategy: if it fails, we could adjust fusion weights, 
    # but since our fusion is fixed right now, we will just return the best we have.
    while attempt < max_retries:
        # 1. Run Models
        classical = classical_func(original)
        deep = deep_func(original)
        
        # 2. Fuse
        fused = fusion_func(original, classical['image'], deep['image'])
        
        # 3. Check Quality
        quality = quality_func(original, fused['image'])
        
        # Keep the best result
        if best_quality is None or len(quality['warnings']) < len(best_quality['warnings']):
            best_result = fused
            best_quality = quality
            
        # If it passes, stop retrying!
        if quality['passed']:
            break
            
        attempt += 1
        print(f"Quality check failed. Retrying... (Attempt {attempt}/{max_retries})")
        
    return {
        "result": best_result,
        "quality_report": best_quality
    }