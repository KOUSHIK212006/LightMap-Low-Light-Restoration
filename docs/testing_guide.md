# LightMap Testing & Verification Guide

This guide details all automated test suites, scripts, and empirical verification commands available in the LightMap repository.

---

## 1. Automated Test Suite (Pytest)

### 1.1 Running All Unit & Integration Tests
```powershell
cd LightMap-Low-Light-Restoration
.\.venv\Scripts\python.exe -m pytest -v
```
*Executes all 58 tests across:*
* `backend/tests/test_api.py` (20 tests): API routes, error handling, method selection, hybrid fusion mocks, upload validation.
* `backend/tests/test_metrics.py` (6 tests): PSNR, SSIM, noise reduction, and edge preservation calculations.
* `classical_cv/tests/test_classical_pipeline.py` (29 tests): 14 condition metrics, 7 condition classifications, 3 restoration profiles, 12 image conditions.
* `ai_engine/tests/test_ai_engine.py` (3 tests): Adaptive fusion formula, Quality Guardian artifact checks, missing weight error handling.

---

## 2. Frontend Validation

### 2.1 TypeScript Typecheck
```powershell
cd LightMap-Low-Light-Restoration\frontend
npx tsc -b --pretty false
```
*Verifies clean compilation with zero type errors.*

### 2.2 Production Vite Build
```powershell
cd LightMap-Low-Light-Restoration\frontend
npm run build
```
*Bundles the application into `frontend/dist`.*

---

## 3. Empirical Image Condition Verification

### 3.1 Running the 12-Condition Empirical Audit
```powershell
cd LightMap-Low-Light-Restoration
.\.venv\Scripts\python.exe verify_system.py
```
*Generates 13 synthetic images covering 12 condition archetypes:*
1. Extremely Dark ($\bar{L} < 25$)
2. Dark Noisy ($\sigma=20$)
3. Low Contrast ($\sigma < 15$)
4. Mixed Lighting (Shadows + Highlights)
5. Overexposed ($\bar{L} > 200$)
6. Normally Illuminated
7. Constant Intensity
8. Single Colour (Green)
9. High Contrast (Dynamic Range)
10. Portrait Aspect Ratio (180x320)
11. Landscape Aspect Ratio (360x180)
12. Resolution Extremes (Small 64x64, Large 800x800)

*Runs all 3 profiles (`natural`, `maximum_visibility`, `detail_preservation`) across all conditions (36 runs total).*
*Verifies 7 Quality Guardian scenarios (clipping, contrast loss, noise spike, edge blur, chromatic drift, rollback re-evaluation).*

---

## 4. Dataset Validation Scanner

### 4.1 Checking Dataset Availability
```powershell
cd LightMap-Low-Light-Restoration
.\.venv\Scripts\python.exe scripts/validate_datasets.py --data-dir datasets
```
*Scans paths for LOL-v1, LOL-v2 Real, LOL-v2 Synthetic, and MIT-Adobe FiveK, checking matched low/normal pairs and image decodability.*

