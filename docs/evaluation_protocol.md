# LightMap Evaluation Protocol

## 1. Overview
This document defines the evaluation framework for the LightMap Low-Light Image Restoration system.
All quantitative metrics are measured against paired reference ground-truth images from the benchmark **LOL-v2 Real** captured test dataset.

## 2. Experimental Setup
- **Benchmark Dataset**: LOL-v2 Real Test Set (Pairs 00690 - 00694)
- **Image Resolution**: 400 × 600 × 3 (RGB)
- **Hardware Platform**: Apple Silicon CPU / MPS
- **Evaluation Script**: `scripts/run_evaluation.py`
- **Output Record**: `evaluation/results/experiment_results.csv`

## 3. Comparison Groups
1. **Raw Input (Baseline)**: Original unprocessed low-light capture.
2. **E1 - Classical CV Only**: Gamma correction, CLAHE, Multi-scale Retinex, bilateral filtering.
3. **E2 - Retinexformer Only**: Transformer model with Illumination-Guided Attention (`retinexformer-lol-v2-real.pth`).
4. **E4 - Fixed-Weight Fusion**: Static 50/50 linear blend ($0.5 I_C + 0.5 I_D$).
5. **E5 - LightMap Adaptive Hybrid Fusion (IAAF)**: Region-wise spatially varying weight map ($W$) smoothed with Gaussian kernel and bounded correction.

## 4. Evaluation Metrics
- **PSNR (Peak Signal-to-Noise Ratio)**: Measured against GT in dB (higher is better).
- **SSIM (Structural Similarity Index Measure)**: Measured across RGB channels (0 to 1, higher is better).
- **Latency (ms)**: End-to-end execution time per frame.
