import cv2
import numpy as np
from ai_engine.inference import enhance_deep

print("Loading test image...")
# Load image and convert BGR to RGB (OpenCV default is BGR)
img_bgr = cv2.imread('test_dark.jpg')
if img_bgr is None:
    raise ValueError("Could not find test_dark.jpg. Please add an image to the root folder.")
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

print("Running inference (this may take 10-30 seconds on CPU)...")
result = enhance_deep(img_rgb)

print(f"Model: {result['model']}")
print(f"Inference Time: {result['inference_time_ms']:.2f} ms")

# Save output (convert back to BGR for OpenCV)
output_bgr = cv2.cvtColor(result['image'], cv2.COLOR_RGB2BGR)
cv2.imwrite('enhanced_output.jpg', output_bgr)
print("Success! Saved as enhanced_output.jpg")