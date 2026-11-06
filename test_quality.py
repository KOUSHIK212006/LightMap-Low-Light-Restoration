import cv2
import numpy as np
from ai_engine.inference import enhance_deep
from ai_engine.quality_guardian import check_quality

print("Loading test image...")
img_bgr = cv2.imread('test_dark.jpg')
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

print("Running Deep Learning inference...")
dl_result = enhance_deep(img_rgb)
dl_image = dl_result['image']

print("\n--- Checking Deep Learning Output ---")
dl_quality = check_quality(img_rgb, dl_image)
print(f"Passed: {dl_quality['passed']}")
print(f"Warnings: {dl_quality['warnings']}")
print(f"Checks: {dl_quality['checks']}")

print("\n--- Checking a 'Perfect' Image (Original == Enhanced) ---")
perfect_quality = check_quality(img_rgb, img_rgb)
print(f"Passed: {perfect_quality['passed']}")
print(f"Warnings: {perfect_quality['warnings']}")