# LightMap – Explainable, Recovery-Aware Low-Light Image Restoration

![Project](https://img.shields.io/badge/Project-LightMap-blue)
![Hackathon](https://img.shields.io/badge/Hackathon-Computer%20Vision%202026-purple)
![Problem](https://img.shields.io/badge/Problem%20ID-PS1-orange)
![Status](https://img.shields.io/badge/Status-Fully%20Integrated%20&%20Verified-brightgreen)

**LightMap** is an intelligent hybrid Computer Vision and Deep Learning system designed to restore severely underexposed, noisy, colour-distorted and unevenly illuminated photographs.

Unlike conventional image enhancement tools that blindly stretch global brightness, LightMap analyzes image condition metrics, identifies specific degradation defects (shadow clipping, sensor noise, highlight saturation), and orchestrates an adaptive restoration pipeline combining Classical Computer Vision, Retinexformer Transformer inference, Illumination-Aware Adaptive Fusion (IAAF), and a multi-metric Quality Guardian.

---

## 1. Quick Start Guide

### Prerequisites
* Python 3.10 or 3.11
* Node.js 18+ and npm
* Git

### Backend Setup (FastAPI)
```powershell
cd LightMap-Low-Light-Restoration
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend/requirements.txt

# Start backend API (runs at http://localhost:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup (React + Vite + TypeScript)
```powershell
cd LightMap-Low-Light-Restoration\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser to `http://localhost:5173`.

---

## 2. System Architecture & Workflows

```
  [User Image Upload] (PNG / JPG / JPEG <= 10MB)
           │
           ▼
  [Input Validation & EXIF Normalization]
           │
           ▼
  [Image Condition Analysis (14 metrics, 7 condition classifications)]
           │
     ┌─────┴─────────────────────────────────────┐
     ▼                                           ▼
[Classical CV Branch]                 [Deep Learning Branch]
- Adaptive Cosine Gamma                - Retinexformer Transformer
- Luminance-only CLAHE                 - LOL-v2 Real Pretrained Weights
- Multi-Scale Retinex (MSR)            - Checkpoint Validation
- Bilateral Denoising                  - Missing Checkpoint Guard
- Damped Colour Correction                       │
     │                                           │
     └─────────────────────┬─────────────────────┘
                           ▼
             [Adaptive Hybrid Fusion (IAAF)]
             - Illumination Map (0.299R + 0.587G + 0.114B)
             - Spatially Smoothed Weight Map W(x, y) in [0.2, 0.9]
             - Disagreement Map |I_C - I_D|
             - I_H = W * I_D + (1 - W) * I_C
                           │
                           ▼
                  [Quality Guardian]
                  - Brightness & Highlight Clipping Check
                  - Laplacian Noise Amplification Ratio
                  - Chromatic Vector Drift Check
                  - Bounded Retry with Natural Profile if degraded
                           │
                           ▼
     [Interactive Comparison Slider, Diagnostics & Download]
```

---

## 3. Restoration Engines & Profiles

### Restoration Engines (`method`)
1. **Adaptive Hybrid (`hybrid`, Default):** Fuses Classical CV with Retinexformer using spatially adaptive illumination weight maps. If deep weights are not found, cleanly falls back to Classical CV and reports the fallback honestly without fabricating outputs.
2. **Classical CV (`classical`):** Deterministic, explainable restoration with zero external weight dependencies. Operates in real-time ($< 150$ ms).
3. **Deep Learning (`deep`):** Retinexformer model. Requires `pretrained_weights/retinexformer-lol-v2-real.pth`. If weights are missing, returns an explicit, structured error explaining how to download the checkpoint.

### Restoration Profiles (`profile`)
* **Natural Restoration (`natural`):** Balanced tonal expansion preserving natural atmosphere ($\gamma^{-1}=0.82$, blend $0.85$).
* **Maximum Visibility (`maximum_visibility` / `visibility`):** Aggressive shadow illumination for security and inspection ($\gamma^{-1}=0.68$, CLAHE clip $2.2$, blend $1.0$).
* **Detail Preservation (`detail_preservation` / `detail`):** Mild illumination lift prioritizing texture retention and noise suppression ($\gamma^{-1}=0.90$, CLAHE clip $1.3$, blend $0.70$).

---

## 4. Retinexformer Checkpoint Setup

Pretrained model weights are **not committed to Git** to preserve repository hygiene.
To run actual Retinexformer inference:
1. Create directory `pretrained_weights/` in the repository root.
2. Download `retinexformer-lol-v2-real.pth` (approx. 98 MB) from Hugging Face / official Retinexformer repository.
3. Place at: `pretrained_weights/retinexformer-lol-v2-real.pth`.
4. If weights are missing, Classical CV continues to function seamlessly, while Deep Learning requests return a clear error notice.

---

## 5. Dataset Infrastructure

LightMap benchmark datasets (LOL-v1, LOL-v2 Real, LOL-v2 Synthetic, MIT-Adobe FiveK) are shared through Google Drive.
* To scan and validate local dataset directories:
  ```powershell
  python scripts/validate_datasets.py --data-dir datasets
  ```
* Complete manifest: [`docs/dataset_manifest.json`](docs/dataset_manifest.json)
* Dataset inventory: [`docs/dataset_inventory.md`](docs/dataset_inventory.md)
* Evaluation protocol: [`docs/evaluation_protocol.md`](docs/evaluation_protocol.md)
* Evaluation metrics: `scripts/metrics.py` (PSNR, SSIM, Noise Reduction, Edge Preservation)

---

## 6. Testing & Verification

### Running Automated Backend & Algorithm Tests
```powershell
.\.venv\Scripts\python -m pytest -v
```
*Current test suite: **58 passed** across `backend/tests`, `classical_cv/tests`, and `ai_engine/tests`.*

### Running Frontend Typecheck and Production Build
```powershell
cd frontend
npx tsc -b --pretty false
npm run build
```

### Running 12-Condition Empirical Audit
```powershell
.\.venv\Scripts\python verify_system.py
```

---

## 7. API Reference

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/health` | GET | None | Service health status and version |
| `/` | GET | None | Service identification metadata |
| `/api/v1/analyze` | POST | `image` (multipart), `profile` | Computes 14 image condition metrics and classification |
| `/api/v1/enhance` | POST | `image` (multipart), `profile`, `method` | Executes restoration pipeline; returns final image, diagnostics, maps |
| `/api/v1/compare` | POST | `image` (multipart), `profile`, `method` | Returns original, restored, branch images, and metrics for comparison |

---

## 8. Known Limitations & Deferrals
* **Zero-DCE++:** Deferred optional model. Documented in [`ai_engine/README.md`](ai_engine/README.md).
* **Headless Browser Automated Testing:** Playwright/Puppeteer is not installed in the execution environment; manual browser verification protocol is provided in [`docs/complete_verification_report.md`](docs/complete_verification_report.md).
* **Official Datasets:** Stored on external cloud storage; missing local paths are reported with clear instructions by `scripts/validate_datasets.py`.
