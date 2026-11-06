import cv2
import numpy as np
from ai_engine.inference import enhance_deep
from ai_engine.adaptive_fusion import adaptive_fusion

print("Loading test image...")
img_bgr = cv2.imread('test_dark.jpg')
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

print("Running Deep Learning inference...")
dl_result = enhance_deep(img_rgb)
dl_image = dl_result['image']

print("Simulating Classical Output (CLAHE)...")
# Convert to LAB to apply CLAHE to Luminance only
lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
l, a, b = cv2.split(lab)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
l_clahe = clahe.apply(l)
classical_image = cv2.cvtColor(cv2.merge((l_clahe, a, b)), cv2.COLOR_LAB2RGB)

print("Running Adaptive Fusion...")
fusion_result = adaptive_fusion(
    original=img_rgb,
    classical_output=classical_image,
    deep_output=dl_image
)

# Save the results
# Convert back to BGR for OpenCV saving
cv2.imwrite('out_classical.jpg', cv2.cvtColor(classical_image, cv2.COLOR_RGB2BGR))
cv2.imwrite('out_deep.jpg', cv2.cvtColor(dl_image, cv2.COLOR_RGB2BGR))
cv2.imwrite('out_fused.jpg', cv2.cvtColor(fusion_result['image'], cv2.COLOR_RGB2BGR))

# Save maps (grayscale)
cv2.imwrite('map_fusion_weight.jpg', fusion_result['fusion_map'])
cv2.imwrite('map_disagreement.jpg', fusion_result['branch_disagreement_map'])

print("Success! Check out_fused.jpg, map_fusion_weight.jpg, and map_disagreement.jpg")