# LightMap AI Engine Documentation

## 1. Overview
The `ai_engine` module provides the deep learning and hybrid restoration components for LightMap:
1. **Retinexformer Inference (`enhance_deep`):** Deep low-light enhancement based on transformer-driven illumination decomposition.
2. **Adaptive Hybrid Fusion (`adaptive_fusion`):** Illumination-Aware Adaptive Fusion (IAAF) combining Classical CV and Deep Learning outputs with a spatially varying weight map.
3. **Quality Guardian (`check_quality`):** Measurable post-restoration quality validation detecting brightness blowout, highlight clipping, noise explosion, and unnatural color shift.

---

## 2. Retinexformer Setup & Weights

### Architecture
- **Model:** RetinexFormer (Cai et al., ICCV 2023)
- **Target Setting:** LOL-v2 Real
- **Hyperparameters:** `in_channels=3`, `out_channels=3`, `n_feat=40`, `stage=1`, `num_blocks=[1, 2, 2]`

### Checkpoint Installation
Pretrained weights are **not committed to Git** to maintain repository hygiene.
To enable real Retinexformer inference:
1. Create directory `pretrained_weights/` in the repository root.
2. Download `retinexformer-lol-v2-real.pth` (approx. 98 MB) from the official repository / Hugging Face.
3. Place the file at:
   ```
   LightMap-Low-Light-Restoration/pretrained_weights/retinexformer-lol-v2-real.pth
   ```
4. If the weights are missing, the application cleanly reports that deep learning inference is blocked and falls back to Classical CV restoration without fabricating outputs or crashing.

---

## 3. Illumination-Aware Adaptive Hybrid Fusion (IAAF)

### Mathematical Formulation
$$I_H(x, y) = W(x, y) \cdot I_D(x, y) + (1 - W(x, y)) \cdot I_C(x, y)$$

Where:
* $I_H$: Final hybrid restored RGB image.
* $I_D$: Deep learning restored output (Retinexformer).
* $I_C$: Classical CV restored output (Explainable multi-stage pipeline).
* $W(x, y)$: Spatially varying adaptive weight map derived from original illumination:
  $$\text{Illumination}(x, y) = 0.299R + 0.587G + 0.114B$$
  $$W_{\text{raw}}(x, y) = \text{clip}\big( (0.5 - \text{Illumination}) \times 2.0, \, 0.2, \, 0.9 \big)$$
  $$W(x, y) = \text{GaussianBlur}(W_{\text{raw}}, k=(31, 31))$$

### Region-Wise Behavior
* **Dark shadow regions ($\text{Illumination} < 0.2$):** Weight tilts towards Deep Learning ($W \to 0.9$) for superior shadow recovery and structure emergence.
* **Well-illuminated highlights ($\text{Illumination} > 0.5$):** Weight tilts towards Classical CV ($W \to 0.2$) to prevent artificial texture hallucination and preserve natural tones.
* **Branch Disagreement Map:** Quantifies $|I_C - I_D|$ per pixel for interpretability and user inspection.

---

## 4. Quality Guardian

The Quality Guardian enforces 4 measurable criteria:
1. **Luminance Threshold:** Flags images with mean luminance $> 0.78$ or sudden jumps $> +0.55$.
2. **Highlight Clipping:** Measures saturation of pixels $\ge 250$; flags if newly clipped pixels increase by $> 8\%$.
3. **High-Frequency Noise:** Evaluates Laplacian variance $\sigma^2(\nabla^2 I)$; flags if noise increases by $> 3.5\times$ and exceeds absolute threshold 400.
4. **Colour Shift:** Computes Euclidean distance between chromatic vectors $\Delta C = \|\bar{c}_{\text{enh}} - \bar{c}_{\text{orig}}\|_2$; flags if chromatic drift exceeds $0.28$.

---

## 5. Deferral Notice: Zero-DCE++

* **Status:** **DEFERRED (DOCUMENTED)**
* **Rationale:** As outlined in the project implementation plan, Zero-DCE++ is designated as an optional secondary comparison model. In accordance with project instructions, full implementation focus has been directed toward stabilizing Retinexformer inference, the IAAF fusion engine, and the Quality Guardian. Zero-DCE++ remains deferred and will not delay the primary deployment.
