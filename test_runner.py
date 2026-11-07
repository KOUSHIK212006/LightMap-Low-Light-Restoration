import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.join(ROOT, "backend") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT, "backend"))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import io
import json
import base64
import numpy as np
from PIL import Image

def log(msg):
    print(msg, flush=True)
from fastapi.testclient import TestClient

from app.main import app
from classical_cv.classical_pipeline import analyze_image, enhance_classical

TEST_DIR = os.path.join(os.path.dirname(__file__), "test-results")
os.makedirs(TEST_DIR, exist_ok=True)

def generate_images():
    images = {}
    
    # 1. Very dark image (256x256)
    np.random.seed(42)
    dark = np.clip(np.random.normal(20, 5, (256, 256, 3)), 5, 45).astype(np.uint8)
    # Add a slightly lighter center object
    dark[100:150, 100:150] = np.clip(dark[100:150, 100:150] + 25, 0, 255)
    img_dark = Image.fromarray(dark)
    path_dark = os.path.join(TEST_DIR, "1_very_dark.png")
    img_dark.save(path_dark)
    images["1_very_dark"] = {"path": path_dark, "array": dark, "desc": "Very dark image (256x256, mean ~20-25)"}

    # 2. Dark noisy image (300x200 landscape)
    base_noisy = np.full((200, 300, 3), 35, dtype=np.float32)
    noise = np.random.normal(0, 18, (200, 300, 3))
    noisy = np.clip(base_noisy + noise, 0, 255).astype(np.uint8)
    img_noisy = Image.fromarray(noisy)
    path_noisy = os.path.join(TEST_DIR, "2_dark_noisy.png")
    img_noisy.save(path_noisy)
    images["2_dark_noisy"] = {"path": path_noisy, "array": noisy, "desc": "Dark noisy image (300x200, noise sigma 18)"}

    # 3. Low-contrast image (200x300 portrait)
    base_lc = np.full((300, 200, 3), 80, dtype=np.float32)
    grad = np.linspace(-8, 8, 300)[:, None, None]
    low_contrast = np.clip(base_lc + grad, 0, 255).astype(np.uint8)
    img_lc = Image.fromarray(low_contrast)
    path_lc = os.path.join(TEST_DIR, "3_low_contrast.png")
    img_lc.save(path_lc)
    images["3_low_contrast"] = {"path": path_lc, "array": low_contrast, "desc": "Low-contrast image (200x300, std ~10)"}

    # 4. Overexposed image (256x256)
    overexposed = np.full((256, 256, 3), 210, dtype=np.uint8)
    overexposed[40:220, 40:220] = 254  # clipped region
    overexposed[:50, :50] = 120
    img_over = Image.fromarray(overexposed)
    path_over = os.path.join(TEST_DIR, "4_overexposed.png")
    img_over.save(path_over)
    images["4_overexposed"] = {"path": path_over, "array": overexposed, "desc": "Overexposed image (256x256, highlight clipping > 250)"}

    # 5. Normally illuminated image (256x256)
    x = np.linspace(0, 1, 256)
    y = np.linspace(0, 1, 256)
    xx, yy = np.meshgrid(x, y)
    normal = np.zeros((256, 256, 3), dtype=np.uint8)
    normal[:, :, 0] = (xx * 180 + 30).astype(np.uint8)
    normal[:, :, 1] = (yy * 160 + 40).astype(np.uint8)
    normal[:, :, 2] = ((xx * yy) * 150 + 50).astype(np.uint8)
    img_normal = Image.fromarray(normal)
    path_normal = os.path.join(TEST_DIR, "5_normally_illuminated.png")
    img_normal.save(path_normal)
    images["5_normally_illuminated"] = {"path": path_normal, "array": normal, "desc": "Normally illuminated image (256x256, well distributed)"}

    return images

def run_tests():
    images = generate_images()
    client = TestClient(app)
    results = {"images": {}, "api": {}, "errors": {}, "profiles": {}}

    # Test 1: Health check
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.status_code}"
    health_data = health_resp.json()
    results["api"]["health"] = health_data
    log(f"[TEST 1] Health: {health_data}")

    # Root endpoint
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    results["api"]["root"] = root_resp.json()

    profiles_to_test = ["natural", "maximum_visibility", "detail_preservation"]

    for name, img_info in images.items():
        log(f"\n--- Testing image: {name} ---")
        path = img_info["path"]
        orig_array = img_info["array"]
        orig_h, orig_w, orig_c = orig_array.shape

        with open(path, "rb") as f:
            img_bytes = f.read()

        # Phase 3: Image analysis endpoint
        analyze_resp = client.post(
            "/api/v1/analyze",
            files={"image": (os.path.basename(path), img_bytes, "image/png")},
            data={"profile": "natural"}
        )
        assert analyze_resp.status_code == 200, f"Analyze failed for {name}: {analyze_resp.status_code} {analyze_resp.text}"
        analysis_data = analyze_resp.json()
        log(f"Analysis for {name}: mean_brightness={analysis_data.get('mean_brightness'):.2f}, "
              f"contrast={analysis_data.get('contrast_score'):.2f}, "
              f"noise={analysis_data.get('noise_score'):.2f}, "
              f"edge={analysis_data.get('edge_strength', analysis_data.get('edge_score')):.2f}, "
              f"underexposed={analysis_data.get('underexposed_ratio'):.2f}, "
              f"overexposed={analysis_data.get('overexposed_ratio'):.2f}, "
              f"clipping={analysis_data.get('clipping_ratio'):.2f}, "
              f"dims={analysis_data.get('image_dimensions')}")

        results["images"][name] = {
            "dimensions": f"{orig_w}x{orig_h}x{orig_c}",
            "description": img_info["desc"],
            "analysis": analysis_data,
            "profile_runs": {}
        }

        # Phase 4: Classical CV enhancement for all profiles
        for prof in profiles_to_test:
            enhance_resp = client.post(
                "/api/v1/enhance",
                files={"image": (os.path.basename(path), img_bytes, "image/png")},
                data={"profile": prof}
            )
            assert enhance_resp.status_code == 200, f"Enhance failed for {name} with {prof}: {enhance_resp.status_code}"
            enh_data = enhance_resp.json()

            assert enh_data["status"] == "success"
            assert enh_data["selected_method"] == "classical", f"Expected classical method, got {enh_data.get('selected_method')}"
            assert enh_data["final_image"] is not None

            # Phase 5 & 6: Decode output image and verify
            data_url = enh_data["final_image"]
            assert data_url.startswith("data:image/png;base64,")
            raw_b64 = data_url.split(",", 1)[1]
            decoded_bytes = base64.b64decode(raw_b64)
            restored_img = Image.open(io.BytesIO(decoded_bytes))
            restored_array = np.asarray(restored_img)

            # Verification assertions
            assert restored_img.format == "PNG", f"Expected PNG format, got {restored_img.format}"
            assert restored_array.dtype == np.uint8, f"Expected uint8 dtype, got {restored_array.dtype}"
            assert restored_array.shape == (orig_h, orig_w, orig_c), f"Dimension mismatch: expected {(orig_h, orig_w, orig_c)}, got {restored_array.shape}"
            assert (restored_array >= 0).all() and (restored_array <= 255).all(), "Pixel values out of range"

            # Check if image was modified by restoration
            pixels_changed = not np.array_equal(orig_array, restored_array)
            diff_mean = float(np.mean(np.abs(restored_array.astype(float) - orig_array.astype(float))))

            # Save restored image for inspection
            out_filename = f"restored_{name}_{prof}.png"
            out_path = os.path.join(TEST_DIR, out_filename)
            restored_img.save(out_path)

            restored_analysis = enh_data.get("restored_analysis", {})
            b_delta = None
            if restored_analysis and "mean_brightness" in restored_analysis and "mean_brightness" in analysis_data:
                b_delta = round(restored_analysis["mean_brightness"] - analysis_data["mean_brightness"], 2)

            log(f"Profile {prof} on {name}: pixels_changed={pixels_changed}, mean_abs_diff={diff_mean:.2f}, "
                  f"brightness_delta={b_delta}, method={enh_data['selected_method']}, time={enh_data['timing']['processing_ms']}ms")

            results["images"][name]["profile_runs"][prof] = {
                "pixels_changed": pixels_changed,
                "mean_abs_diff": round(diff_mean, 2),
                "brightness_delta": b_delta,
                "selected_method": enh_data["selected_method"],
                "processing_status": enh_data["processing_status"],
                "output_dimensions": f"{restored_img.width}x{restored_img.height}",
                "output_file": out_filename,
                "processing_ms": enh_data["timing"]["processing_ms"]
            }

    # Phase 8: Error cases
    log("\n--- Testing Error Cases ---")
    
    # 1. Invalid file extension (.txt)
    err_txt = client.post(
        "/api/v1/enhance",
        files={"image": ("sample.txt", b"plain text content", "text/plain")},
        data={"profile": "natural"}
    )
    assert err_txt.status_code == 400
    assert "Unsupported file type" in err_txt.json()["detail"]
    results["errors"]["invalid_extension"] = {"status": err_txt.status_code, "detail": err_txt.json()["detail"]}
    log(f"Invalid extension error: {err_txt.status_code} -> {err_txt.json()['detail']}")

    # 2. Corrupted image
    err_corrupt = client.post(
        "/api/v1/enhance",
        files={"image": ("broken.png", b"NotAPNGImageFileGarbageData", "image/png")},
        data={"profile": "natural"}
    )
    assert err_corrupt.status_code == 400
    assert "Invalid or corrupt" in err_corrupt.json()["detail"]
    results["errors"]["corrupt_image"] = {"status": err_corrupt.status_code, "detail": err_corrupt.json()["detail"]}
    log(f"Corrupt image error: {err_corrupt.status_code} -> {err_corrupt.json()['detail']}")

    # 3. Empty upload (0 bytes)
    err_empty = client.post(
        "/api/v1/enhance",
        files={"image": ("empty.png", b"", "image/png")},
        data={"profile": "natural"}
    )
    assert err_empty.status_code == 400
    assert "empty" in err_empty.json()["detail"].lower()
    results["errors"]["empty_upload"] = {"status": err_empty.status_code, "detail": err_empty.json()["detail"]}
    log(f"Empty upload error: {err_empty.status_code} -> {err_empty.json()['detail']}")

    # 4. Oversized upload (> 10MB)
    huge_bytes = b"0" * (11 * 1024 * 1024)
    err_oversized = client.post(
        "/api/v1/enhance",
        files={"image": ("large.png", huge_bytes, "image/png")},
        data={"profile": "natural"}
    )
    assert err_oversized.status_code == 413
    assert "exceeds" in err_oversized.json()["detail"].lower()
    results["errors"]["oversized_upload"] = {"status": err_oversized.status_code, "detail": err_oversized.json()["detail"]}
    log(f"Oversized upload error: {err_oversized.status_code} -> {err_oversized.json()['detail']}")

    # Save summary report
    summary_path = os.path.join(TEST_DIR, "test_verification_summary.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)
    log(f"\nAll verification tests passed successfully! Results saved to {summary_path}")

if __name__ == "__main__":
    run_tests()
