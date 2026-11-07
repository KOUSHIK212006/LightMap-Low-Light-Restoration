import os
import sys
import io
import time
import json
import base64
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.join(ROOT, "backend") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT, "backend"))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.main import app
from fastapi.testclient import TestClient
from classical_cv.classical_pipeline import (
    analyze_image,
    enhance_classical,
    validate_restoration_quality,
    _apply_adaptive_gamma,
    _apply_clahe_luminance,
    _apply_multiscale_retinex_luminance,
    _apply_adaptive_bilateral_denoise,
    _apply_adaptive_colour_correction
)

TEST_DIR = os.path.join(ROOT, "test-results", "comprehensive_audit")
os.makedirs(TEST_DIR, exist_ok=True)

def log(msg):
    print(msg, flush=True)

def generate_12_condition_images():
    np.random.seed(42)
    images = {}

    # 1. Extremely dark (mean < 25)
    dark = np.clip(np.random.normal(12, 4, (256, 256, 3)), 0, 35).astype(np.uint8)
    dark[100:150, 100:150] = np.clip(dark[100:150, 100:150] + 15, 0, 255)
    images["1_extremely_dark"] = {"array": dark, "desc": "Extremely dark image (mean < 25)"}

    # 2. Dark noisy (mean ~35, noise sigma 20)
    base_noisy = np.full((256, 256, 3), 35, dtype=np.float32)
    noise = np.random.normal(0, 20, (256, 256, 3))
    noisy = np.clip(base_noisy + noise, 0, 255).astype(np.uint8)
    images["2_dark_noisy"] = {"array": noisy, "desc": "Dark noisy image (noise std ~20)"}

    # 3. Low contrast (std < 15, mean ~100)
    lc = np.clip(np.random.normal(100, 8, (256, 256, 3)), 0, 255).astype(np.uint8)
    images["3_low_contrast"] = {"array": lc, "desc": "Low contrast image (std < 15, mean ~100)"}

    # 4. Mixed lighting (dark shadows + bright window)
    mixed = np.clip(np.random.normal(30, 8, (256, 256, 3)), 0, 255).astype(np.uint8)
    mixed[20:100, 150:240] = np.clip(np.random.normal(230, 10, (80, 90, 3)), 0, 255).astype(np.uint8)
    images["4_mixed_lighting"] = {"array": mixed, "desc": "Mixed lighting (shadows + bright window)"}

    # 5. Overexposed (mean > 200, clipping > 0.08)
    over = np.full((256, 256, 3), 215, dtype=np.uint8)
    over[30:230, 30:230] = 254
    images["5_overexposed"] = {"array": over, "desc": "Overexposed image (mean > 200, highlight clipping)"}

    # 6. Normally illuminated (mean 128, std 45)
    x = np.linspace(0, 1, 256)
    y = np.linspace(0, 1, 256)
    xx, yy = np.meshgrid(x, y)
    norm = np.zeros((256, 256, 3), dtype=np.uint8)
    norm[:, :, 0] = (xx * 180 + 30).astype(np.uint8)
    norm[:, :, 1] = (yy * 160 + 40).astype(np.uint8)
    norm[:, :, 2] = ((xx * yy) * 150 + 50).astype(np.uint8)
    images["6_normally_illuminated"] = {"array": norm, "desc": "Normally illuminated image"}

    # 7. Constant intensity
    const_img = np.full((128, 128, 3), 40, dtype=np.uint8)
    images["7_constant_intensity"] = {"array": const_img, "desc": "Constant intensity image (uniform 40)"}

    # 8. Single colour (pure green varying intensity)
    green_img = np.zeros((128, 128, 3), dtype=np.uint8)
    green_img[:, :, 1] = np.tile(np.linspace(20, 120, 128, dtype=np.uint8), (128, 1))
    images["8_single_colour"] = {"array": green_img, "desc": "Single-colour (green channel gradient)"}

    # 9. High contrast (bimodal: 0 and 255 checkerboard)
    high_contrast = np.zeros((256, 256, 3), dtype=np.uint8)
    high_contrast[::32, :] = 255
    high_contrast[:, ::32] = 255
    high_contrast[128:, 128:] = 240
    images["9_high_contrast"] = {"array": high_contrast, "desc": "High contrast scene (large dynamic range)"}

    # 10. Portrait aspect ratio (320x180)
    portrait = np.clip(np.random.normal(40, 15, (320, 180, 3)), 0, 255).astype(np.uint8)
    images["10_portrait_aspect"] = {"array": portrait, "desc": "Portrait aspect ratio (320x180, h > w)"}

    # 11. Landscape aspect ratio (180x360)
    landscape = np.clip(np.random.normal(45, 12, (180, 360, 3)), 0, 255).astype(np.uint8)
    images["11_landscape_aspect"] = {"array": landscape, "desc": "Landscape aspect ratio (180x360, w > h)"}

    # 12. Resolution extremes: Small (64x64) and Large (800x800)
    small_img = np.clip(np.random.normal(35, 10, (64, 64, 3)), 0, 255).astype(np.uint8)
    large_img = np.clip(np.random.normal(50, 20, (800, 800, 3)), 0, 255).astype(np.uint8)
    images["12a_small_res"] = {"array": small_img, "desc": "Small resolution (64x64)"}
    images["12b_large_res"] = {"array": large_img, "desc": "Large resolution (800x800)"}

    # Save images to disk
    for k, v in images.items():
        p = os.path.join(TEST_DIR, f"{k}.png")
        Image.fromarray(v["array"]).save(p)
        v["path"] = p

    return images

def test_quality_guardian():
    log("\n=======================================================")
    log("PHASE 7: QUALITY GUARDIAN & FALLBACK VERIFICATION")
    log("=======================================================")
    guardian_results = {}

    orig = np.full((100, 100, 3), 50, dtype=np.uint8)
    # Add some structure
    orig[20:80, 20:80] = 120

    # Test 1: Normal enhancement (should pass)
    good = np.clip(orig.astype(float) * 1.5, 0, 255).astype(np.uint8)
    res_good = validate_restoration_quality(orig, good)
    guardian_results["normal_enhancement"] = res_good
    assert res_good["is_acceptable"] == True, "Good enhancement rejected"
    log(f"Test 1 - Good enhancement: acceptable={res_good['is_acceptable']}, status={res_good['status']}")

    # Test 2: Excessive clipping (>18% newly clipped)
    clipped = good.copy()
    clipped[0:40, :] = 255  # 40% clipped
    res_clip = validate_restoration_quality(orig, clipped)
    guardian_results["excessive_clipping"] = res_clip
    assert "excessive_highlight_clipping" in res_clip["flags"], f"Failed to detect excessive clipping: {res_clip['flags']}"
    assert res_clip["is_acceptable"] == False
    log(f"Test 2 - Excessive clipping: acceptable={res_clip['is_acceptable']}, flags={res_clip['flags']}")

    # Test 3: Severe contrast loss
    flat = np.full((100, 100, 3), 100, dtype=np.uint8)
    res_flat = validate_restoration_quality(orig, flat)
    guardian_results["severe_contrast_loss"] = res_flat
    assert "severe_contrast_loss" in res_flat["flags"], f"Failed to detect contrast loss: {res_flat['flags']}"
    assert res_flat["is_acceptable"] == False
    log(f"Test 3 - Severe contrast loss: acceptable={res_flat['is_acceptable']}, flags={res_flat['flags']}")

    # Test 4: Noise amplification
    noisy = good.copy().astype(float)
    noise = np.random.normal(0, 60, noisy.shape)
    noisy = np.clip(noisy + noise, 0, 255).astype(np.uint8)
    res_noise = validate_restoration_quality(orig, noisy)
    guardian_results["noise_amplification"] = res_noise
    assert "excessive_noise_amplification" in res_noise["flags"], f"Failed to detect noise amplification: {res_noise['flags']}"
    assert res_noise["is_acceptable"] == False
    log(f"Test 4 - Noise amplification: acceptable={res_noise['is_acceptable']}, flags={res_noise['flags']}")

    # Test 5: Excessive edge loss
    blurred = cv2.GaussianBlur(orig, (15, 15), 5.0)
    res_edge = validate_restoration_quality(orig, blurred)
    guardian_results["excessive_edge_loss"] = res_edge
    assert "excessive_edge_loss" in res_edge["flags"], "Failed to detect excessive edge loss"
    assert res_edge["is_acceptable"] == False
    log(f"Test 5 - Excessive edge loss: acceptable={res_edge['is_acceptable']}, flags={res_edge['flags']}")

    # Test 6: Colour distortion
    distorted = good.copy()
    distorted[:, :, 0] = 0   # Strip red entirely
    distorted[:, :, 2] = 255 # Max blue
    res_color = validate_restoration_quality(orig, distorted)
    guardian_results["colour_distortion"] = res_color
    assert "colour_distortion" in res_color["flags"], "Failed to detect colour distortion"
    assert res_color["is_acceptable"] == False
    log(f"Test 6 - Colour distortion: acceptable={res_color['is_acceptable']}, flags={res_color['flags']}")

    # Test 7: Conservative fallback re-evaluation in enhance_classical
    # Test on an image where full enhancement might be aggressive
    # Verify fallback path produces valid image and reports honest status
    res_enh = enhance_classical(orig, profile="maximum_visibility")
    guardian_results["enhance_fallback_check"] = {
        "status": res_enh["quality_report"]["status"],
        "is_acceptable": res_enh["quality_report"]["is_acceptable"],
        "fallback_applied": res_enh["processing_summary"]["fallback_applied"],
    }
    log(f"Test 7 - Pipeline validation status: {res_enh['quality_report']['status']}, acceptable: {res_enh['quality_report']['is_acceptable']}")

    return guardian_results

def test_image_conditions_and_profiles(images):
    log("\n=======================================================")
    log("PHASE 6: 12 IMAGE CONDITIONS x 3 PROFILES VERIFICATION")
    log("=======================================================")
    results = {}
    profiles = ["natural", "maximum_visibility", "detail_preservation"]

    for name, img_info in images.items():
        arr = img_info["array"]
        desc = img_info["desc"]
        log(f"\nCondition: {name} ({desc})")

        analysis = analyze_image(arr)
        cond_class = analysis.get("conditions", {}).get("condition_label")
        log(f"  Analysis: condition={cond_class}, mean_b={analysis['mean_brightness']:.1f}, "
            f"contrast={analysis['contrast_score']:.1f}, noise={analysis['noise_score']:.1f}, "
            f"clip_hi={analysis['highlight_clipping_ratio']:.3f}, clip_sh={analysis['shadow_clipping_ratio']:.3f}")

        cond_results = {
            "desc": desc,
            "shape": list(arr.shape),
            "analysis": analysis,
            "profiles": {}
        }

        for prof in profiles:
            t0 = time.time()
            res = enhance_classical(arr, profile=prof)
            elapsed_ms = (time.time() - t0) * 1000

            enhanced = res["image"]
            qval = res["quality_report"]
            proc_status = qval["status"]

            # Checks
            assert enhanced.shape == arr.shape, f"Shape mismatch: {enhanced.shape} vs {arr.shape}"
            assert enhanced.dtype == np.uint8, f"Dtype mismatch: {enhanced.dtype}"
            assert (enhanced >= 0).all() and (enhanced <= 255).all(), "Pixel values out of range"

            diff_mean = float(np.mean(np.abs(enhanced.astype(float) - arr.astype(float))))
            b_orig = float(np.mean(arr))
            b_enh = float(np.mean(enhanced))

            # Specific condition assertions:
            # Overexposed should not be significantly brightened
            if name == "5_overexposed":
                assert b_enh <= b_orig + 5.0, f"Overexposed image brightened! orig={b_orig}, enh={b_enh}"
            
            # Normally illuminated should preserve visual quality
            if name == "6_normally_illuminated":
                # Should not have massive shift
                assert abs(b_enh - b_orig) < 30.0, f"Normal image shifted too aggressively: orig={b_orig}, enh={b_enh}"

            # Extremely dark should be brightened
            if name == "1_extremely_dark":
                assert b_enh > b_orig, f"Extremely dark not brightened! orig={b_orig}, enh={b_enh}"

            # Save sample
            out_p = os.path.join(TEST_DIR, f"{name}_{prof}.png")
            Image.fromarray(enhanced).save(out_p)

            cond_results["profiles"][prof] = {
                "orig_brightness": round(b_orig, 2),
                "enh_brightness": round(b_enh, 2),
                "brightness_delta": round(b_enh - b_orig, 2),
                "mean_abs_diff": round(diff_mean, 2),
                "processing_ms": round(elapsed_ms, 2),
                "processing_status": proc_status,
                "quality_status": qval["status"],
                "quality_acceptable": qval["is_acceptable"],
                "quality_flags": qval.get("flags", [])
            }
            log(f"    [{prof}] b_delta={b_enh - b_orig:+.1f}, diff={diff_mean:.1f}, time={elapsed_ms:.1f}ms, status={proc_status}, qval={qval['status']}")

        results[name] = cond_results

    return results

def test_api_integration(images):
    log("\n=======================================================")
    log("PHASE 8: API CONTRACT & INTEGRATION VERIFICATION")
    log("=======================================================")
    client = TestClient(app)
    api_results = {"endpoints": {}, "errors": {}, "contract_matches": {}}

    # Health endpoint
    h_resp = client.get("/health")
    assert h_resp.status_code == 200
    api_results["endpoints"]["health"] = h_resp.json()
    log(f"GET /health: {h_resp.status_code} {h_resp.json()}")

    # Root endpoint
    r_resp = client.get("/")
    assert r_resp.status_code == 200
    api_results["endpoints"]["root"] = r_resp.json()
    log(f"GET /: {r_resp.status_code} {r_resp.json()}")

    # Test /api/v1/analyze
    test_img = images["1_extremely_dark"]
    with open(test_img["path"], "rb") as f:
        img_bytes = f.read()

    an_resp = client.post(
        "/api/v1/analyze",
        files={"image": ("dark.png", img_bytes, "image/png")},
        data={"profile": "natural"}
    )
    assert an_resp.status_code == 200
    an_data = an_resp.json()
    api_results["endpoints"]["analyze"] = an_data
    log(f"POST /api/v1/analyze: {an_resp.status_code}")
    log(f"  Keys returned: {list(an_data.keys())}")

    # Check that analyze fields match frontend AnalysisMetrics interface
    expected_analysis_fields = [
        "mean_brightness", "contrast_score", "noise_score", "underexposed_ratio",
        "overexposed_ratio", "clipping_ratio", "image_dimensions"
    ]
    for ef in expected_analysis_fields:
        assert ef in an_data, f"Missing expected analysis field: {ef}"
    log("  Analysis response schema verified against frontend types.")

    # Test /api/v1/enhance with all profiles
    for prof in ["natural", "maximum_visibility", "detail_preservation"]:
        enh_resp = client.post(
            "/api/v1/enhance",
            files={"image": ("dark.png", img_bytes, "image/png")},
            data={"profile": prof}
        )
        assert enh_resp.status_code == 200
        enh_data = enh_resp.json()

        # Schema check against EnhancementResponse
        assert "status" in enh_data
        assert "final_image" in enh_data
        assert "selected_method" in enh_data
        assert "quality_report" in enh_data
        assert "analysis" in enh_data
        assert "restored_analysis" in enh_data
        assert "timing" in enh_data
        assert "warnings" in enh_data
        assert enh_data["selected_method"] == "classical"

        # Verify final_image is valid base64 PNG
        assert enh_data["final_image"].startswith("data:image/png;base64,")
        b64 = enh_data["final_image"].split(",", 1)[1]
        decoded = base64.b64decode(b64)
        dec_img = Image.open(io.BytesIO(decoded))
        assert dec_img.format == "PNG"
        assert dec_img.size == (256, 256)

        log(f"POST /api/v1/enhance [profile={prof}]: status={enh_data['status']}, method={enh_data['selected_method']}, dims={dec_img.size}")

    api_results["endpoints"]["enhance_verified"] = True

    # Test /api/v1/compare endpoint
    comp_resp = client.post(
        "/api/v1/compare",
        files={"image": ("dark.png", img_bytes, "image/png")},
        data={"profile": "natural"}
    )
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert "original_image" in comp_data
    assert "final_image" in comp_data
    assert "analysis" in comp_data
    assert comp_data["original_image"].startswith("data:image/png;base64,")
    assert comp_data["final_image"].startswith("data:image/png;base64,")
    log(f"POST /api/v1/compare: status_code={comp_resp.status_code}, original_image and final_image returned successfully")
    api_results["endpoints"]["compare"] = {
        "status": comp_resp.status_code,
        "selected_method": comp_data.get("selected_method"),
        "has_original": bool(comp_data.get("original_image")),
        "has_final": bool(comp_data.get("final_image"))
    }

    # Error cases
    log("\nTesting Error Cases:")
    # 1. Invalid extension
    res1 = client.post("/api/v1/enhance", files={"image": ("test.pdf", b"%PDF-1.4", "application/pdf")})
    assert res1.status_code == 400
    api_results["errors"]["invalid_extension"] = res1.json()["detail"]
    log(f"  Invalid extension (400): {res1.json()['detail']}")

    # 2. Corrupt file
    res2 = client.post("/api/v1/enhance", files={"image": ("test.png", b"corrupted data", "image/png")})
    assert res2.status_code == 400
    api_results["errors"]["corrupt_file"] = res2.json()["detail"]
    log(f"  Corrupt file (400): {res2.json()['detail']}")

    # 3. Empty upload
    res3 = client.post("/api/v1/enhance", files={"image": ("test.png", b"", "image/png")})
    assert res3.status_code == 400
    api_results["errors"]["empty_upload"] = res3.json()["detail"]
    log(f"  Empty upload (400): {res3.json()['detail']}")

    # 4. Oversized upload (> 10MB)
    res4 = client.post("/api/v1/enhance", files={"image": ("big.png", b"0" * (11 * 1024 * 1024), "image/png")})
    assert res4.status_code == 413
    api_results["errors"]["oversized_upload"] = res4.json()["detail"]
    log(f"  Oversized upload (413): {res4.json()['detail']}")

    return api_results

def main():
    log("Generating 12 image conditions...")
    images = generate_12_condition_images()
    log(f"Generated {len(images)} test images in {TEST_DIR}")

    guardian_results = test_quality_guardian()
    condition_results = test_image_conditions_and_profiles(images)
    api_results = test_api_integration(images)

    full_audit = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "guardian_results": guardian_results,
        "condition_results": condition_results,
        "api_results": api_results
    }

    audit_path = os.path.join(TEST_DIR, "system_audit_results.json")
    with open(audit_path, "w") as f:
        json.dump(full_audit, f, indent=2, default=str)
    log(f"\n=======================================================")
    log(f"SYSTEM AUDIT COMPLETE! Full results saved to:\n{audit_path}")
    log("=======================================================")

if __name__ == "__main__":
    main()
