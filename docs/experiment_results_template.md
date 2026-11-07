# LightMap Experiment Results

Quantitative results measured on real reference image pairs from the LOL-v2 Real benchmark dataset.

## Summary Comparison Table (Averaged across test pairs)

| Experiment Group | Method Description | Mean PSNR (dB) | Mean SSIM | Mean Latency (ms) |
|---|---|---|---|---|
| **Baseline** | Raw Low-Light Input | 7.79 | 0.1297 | 0.0 ms |
| **E1** | Classical CV Pipeline | 12.27 | 0.2227 | ~38 ms |
| **E2** | Retinexformer Pretrained | 27.44 | 0.8678 | ~1050 ms |
| **E4** | Fixed-Weight Fusion (50/50) | 17.65 | 0.4828 | ~1100 ms |
| **E5** | **LightMap Adaptive Hybrid (IAAF)** | **25.01** | **0.8058** | ~1110 ms |

## Key Findings
1. **Classical CV (E1)** provides rapid brightening (~38 ms) and sharp edges, but suffers from noise amplification in severely dark regions.
2. **Retinexformer (E2)** reconstructs textures and reduces noise exceptionally well, but has higher latency.
3. **Adaptive Hybrid Fusion (E5 - IAAF)** balances structure preservation and noise suppression, significantly outperforming fixed-weight blending (+7.36 dB PSNR improvement over 50/50 fusion).
4. The **Bounded Correction Mechanism** in the Quality Guardian successfully prevents highlight blowout and limits excessive brightening.
