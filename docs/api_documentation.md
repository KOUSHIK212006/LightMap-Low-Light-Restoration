# LightMap API Documentation

The LightMap backend exposes a REST API powered by FastAPI under prefix `/api/v1` along with core service health endpoints.

---

## 1. Core Endpoints

### 1.1 Service Health
* **Endpoint:** `GET /health`
* **Response Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "status": "ok",
    "version": "0.1.0",
    "message": "LightMap backend is healthy."
  }
  ```

### 1.2 Service Root
* **Endpoint:** `GET /`
* **Response Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "service": "LightMap",
    "version": "0.1.0",
    "message": "LightMap backend is running."
  }
  ```

---

## 2. Restoration & Analysis Endpoints

### 2.1 Image Analysis
Analyzes low-light image conditions and returns 14 measurable degradation indicators.
* **Endpoint:** `POST /api/v1/analyze`
* **Content-Type:** `multipart/form-data`
* **Parameters:**
  * `image`: Binary file (PNG, JPG, JPEG, max 10MB) [Required]
  * `profile`: string (`natural`, `visibility`, `detail`) [Optional, default: `natural`]
* **Response Status:** `200 OK`
* **Response Schema:**
  ```json
  {
    "mean_brightness": 34.82,
    "median_brightness": 34.56,
    "std_brightness": 12.83,
    "contrast_score": 12.83,
    "global_contrast": 12.83,
    "local_contrast": 12.78,
    "brightness_distribution": [0.069, 0.350, "..."],
    "underexposed_ratio": 0.972,
    "overexposed_ratio": 0.0,
    "highlight_clipping_ratio": 0.0,
    "shadow_clipping_ratio": 0.0002,
    "clipping_ratio": 0.0002,
    "noise_score": 3269.5,
    "edge_strength": 57.17,
    "edge_score": 57.17,
    "gradient_magnitude": 18.42,
    "colour_distribution": {
      "r_mean": 34.8, "g_mean": 34.8, "b_mean": 34.8,
      "r_std": 12.8, "g_std": 12.8, "b_std": 12.8, "channel_std": 12.8
    },
    "mean_saturation": 0.0,
    "std_saturation": 0.0,
    "image_dimensions": {"height": 256, "width": 256, "channels": 3},
    "conditions": {
      "is_very_dark": true,
      "is_dark": false,
      "is_noisy_low_light": true,
      "is_mixed_lighting": false,
      "is_overexposed": false,
      "is_normally_illuminated": false,
      "condition_label": "very_dark"
    },
    "thresholds": {"...": "..."},
    "source": "classical_cv",
    "profile": "natural"
  }
  ```

### 2.2 Image Enhancement
Executes the requested restoration pipeline.
* **Endpoint:** `POST /api/v1/enhance`
* **Content-Type:** `multipart/form-data`
* **Parameters:**
  * `image`: Binary file (PNG, JPG, JPEG, max 10MB) [Required]
  * `profile`: string (`natural`, `visibility`, `detail`) [Optional, default: `natural`]
  * `method`: string (`hybrid`, `classical`, `deep`) [Optional, default: `hybrid`]
* **Response Status:** `200 OK`
* **Response Schema:**
  ```json
  {
    "status": "success",
    "message": "Restoration pipeline completed successfully.",
    "profile": "natural",
    "method": "hybrid",
    "selected_method": "classical",
    "processing_status": "success",
    "analysis": {"...": "..."},
    "restored_analysis": {"...": "..."},
    "final_image": "data:image/png;base64,...",
    "classical_output": "data:image/png;base64,...",
    "deep_output": null,
    "hybrid_output": null,
    "fusion_map": null,
    "branch_disagreement_map": null,
    "quality_report": {
      "is_acceptable": true,
      "passed": true,
      "status": "passed",
      "warnings": [],
      "checks": {"...": "..."}
    },
    "timings": {"processing_ms": 145.2},
    "timing": {"processing_ms": 145.2},
    "warnings": [
      "Deep-learning model unavailable or checkpoint missing; fallen back to Classical CV. This is NOT a hybrid result."
    ],
    "retry_count": 0,
    "retry_applied": false,
    "demo_mode": false
  }
  ```

### 2.3 Image Comparison
Returns paired original and enhanced assets for before/after comparison.
* **Endpoint:** `POST /api/v1/compare`
* **Content-Type:** `multipart/form-data`
* **Parameters:**
  * `image`: Binary file [Required]
  * `profile`: string [Optional, default: `natural`]
  * `method`: string [Optional, default: `hybrid`]
* **Response Schema:**
  ```json
  {
    "message": "Comparison request accepted.",
    "profile": "natural",
    "method": "hybrid",
    "selected_method": "classical",
    "processing_status": "success",
    "original_image": "data:image/png;base64,...",
    "final_image": "data:image/png;base64,...",
    "classical_image": "data:image/png;base64,...",
    "deep_image": null,
    "hybrid_image": null,
    "fusion_map": null,
    "branch_disagreement_map": null,
    "analysis": {"...": "..."},
    "warnings": ["..."],
    "timings": {"processing_ms": 148.0}
  }
  ```

---

## 3. Error Codes & Validation Responses

| HTTP Status | Trigger Condition | Detail Example |
|---|---|---|
| **400 Bad Request** | Missing file payload | `{"detail": "An image file is required for enhancement."}` |
| **400 Bad Request** | Unsupported extension | `{"detail": "Unsupported file type '.pdf'. Supported formats: .jpg, .jpeg, .png."}` |
| **400 Bad Request** | Corrupted / unreadable image | `{"detail": "Invalid or corrupt image file."}` |
| **400 Bad Request** | Zero-byte image | `{"detail": "Uploaded image is empty."}` |
| **413 Payload Too Large** | File size $> 10$ MB | `{"detail": "Image exceeds the maximum supported size of 10.0 MB. Please upload a smaller image."}` |
| **200 OK (status: failed)** | Explicit Deep mode requested without weights | `{"status": "failed", "message": "Deep learning restoration failed: Retinexformer model or weights unavailable."}` |
