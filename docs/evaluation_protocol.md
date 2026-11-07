# LightMap: Standardized Evaluation Protocol

This protocol defines the exact procedure for benchmarking and evaluating restoration methods within LightMap.

---

## 1. Experimental Settings

The evaluation is conducted across 5 standardized experimental pipelines:

| Experiment ID | Pipeline | Restoration Method | Primary Objective |
|---|---|---|---|
| **E1** | Classical CV Only | Multi-Scale Retinex + Luminance CLAHE + Bilateral Filter | Deterministic, explainable baseline |
| **E2** | Retinexformer Only | Deep transformer model (LOL-v2 Real checkpoint) | Pure deep-learning representation |
| **E3** | Zero-DCE++ Only | Lightweight curve estimation (Deferred) | Lightweight comparative baseline |
| **E4** | Fixed-Weight Fusion | $I_{\text{fused}} = 0.5 \cdot I_C + 0.5 \cdot I_D$ | Uniform blend ablation |
| **E5** | LightMap Adaptive Hybrid | Illumination-Aware Adaptive Fusion (IAAF) | Spatially varying, recovery-aware restoration |

---

## 2. Evaluation Metrics

### 2.1 Full-Reference Quantitative Metrics (Require Ground Truth)
* **PSNR (Peak Signal-to-Noise Ratio):**
  $$MSE = \frac{1}{3HW} \sum_{c=1}^3 \sum_{i=1}^H \sum_{j=1}^W (I_{\text{gt}}(i, j, c) - I_{\text{res}}(i, j, c))^2$$
  $$PSNR = 10 \cdot \log_{10}\left(\frac{255^2}{MSE}\right) \quad [\text{dB}]$$
* **SSIM (Structural Similarity Index):**
  Evaluates luminance, contrast, and structural preservation on a $[0, 1]$ scale.
* **LPIPS (Learned Perceptual Image Patch Similarity):**
  Evaluates deep perceptual feature distance via pretrained convolutional networks (lower is better).

### 2.2 Operational and Diagnostic Metrics
* **Processing Latency (ms):** Mean inference time per image measured on standardized hardware (CPU and GPU recorded separately).
* **Noise Reduction Delta:** Quantifies reduction in high-frequency Laplacian variance $\Delta \sigma^2$.
* **Edge Preservation Ratio:** Measures retention of high-contrast gradient energy along true object boundaries.

### 2.3 Methodological Rule on No-Reference Indicators
* **NIQE (Naturalness Image Quality Evaluator):**
  * NIQE is an empirical, no-reference statistical descriptor.
  * **Critical Rule:** NIQE scores MUST NOT be cited as standalone proof of restoration fidelity or signal reconstruction accuracy. Artificially over-sharpened images with harsh halos can achieve deceptively low NIQE scores while severely degrading structural fidelity.

---

## 3. Evaluation Execution Procedure
1. Confirm dataset availability and pairing using `python scripts/validate_datasets.py`.
2. Execute restoration pipelines across the test subsets.
3. Compute metrics via `scripts/metrics.py` without downsampling or pre-cropping test inputs.
4. Record results into `docs/experiment_results_template.md`.

