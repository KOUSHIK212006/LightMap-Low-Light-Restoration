# LightMap: Experiment Results Template

This document provides standardized result recording tables for experimental benchmarks E1–E5 across the benchmark datasets.

> **IMPORTANT:** Benchmark metrics must only be populated from actual quantitative evaluation runs using real reference data. No fabricated benchmark results are recorded here.

---

## 1. Quantitative Benchmark Results

### 1.1 LOL-v1 (eval15 Subset, 15 Pairs)
| Method | Configuration | PSNR (dB) ↑ | SSIM ↑ | LPIPS ↓ | Noise Red. Ratio ↑ | Latency CPU (ms) | Latency GPU (ms) |
|---|---|---|---|---|---|---|---|
| **E1: Classical CV** | Natural Profile | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *N/A* |
| **E1: Classical CV** | Visibility Profile | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *N/A* |
| **E1: Classical CV** | Detail Profile | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *N/A* |
| **E2: Retinexformer** | Pretrained LOL-v2 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |
| **E4: Fixed Fusion** | 50% / 50% Blend | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |
| **E5: LightMap IAAF** | Adaptive Hybrid | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |

### 1.2 LOL-v2 Real (Test Subset, 100 Pairs)
| Method | Configuration | PSNR (dB) ↑ | SSIM ↑ | LPIPS ↓ | Noise Red. Ratio ↑ | Latency CPU (ms) | Latency GPU (ms) |
|---|---|---|---|---|---|---|---|
| **E1: Classical CV** | Natural Profile | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *N/A* |
| **E2: Retinexformer** | Pretrained LOL-v2 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |
| **E4: Fixed Fusion** | 50% / 50% Blend | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |
| **E5: LightMap IAAF** | Adaptive Hybrid | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |

---

## 2. Qualitative Visual Evaluation Rubric
Rate each criterion on a scale from 1 (poor) to 5 (excellent):
1. **Shadow Detail Emergence:** Can previously obscured objects be distinguished?
2. **Highlight Preservation:** Are streetlights, windows, and light bulbs intact without blown-out white halos?
3. **Color Naturalness:** Are skin tones, foliage, and textures true to life without unnatural neon or oversaturated color casts?
4. **Artifact Suppression:** Are blocky seams, noise grain, or halo artifacts visible?
5. **Structural Sharpness:** Are fine text and edges crisp?

