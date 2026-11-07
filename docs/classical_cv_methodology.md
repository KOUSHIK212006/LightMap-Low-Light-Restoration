# Classical Computer Vision Methodology for LightMap

## Overview

The classical low-light enhancement pipeline in LightMap is designed to be explainable, robust, and recovery-aware. Rather than applying fixed global transformations blindly, it starts from a comprehensive image-condition analysis and adapts parameters across gamma correction, CLAHE, Multi-Scale Retinex, bilateral denoising, and colour balance.

---

## 1. Mathematical Formulations

### 1.1 Highlight-Protected Adaptive Gamma Correction

Standard power-law transformations $I_{out} = 255 \cdot (I_{in} / 255)^\gamma$ brighten shadows when $\gamma < 1.0$, but frequently blow out midtone highlights into harsh saturation clipping. LightMap implements an adaptive highlight-protected gamma curve:

Let $x = I_{in} / 255.0 \in [0, 1]$ and $\gamma_{inv} \in (0, 1]$ be the inverse gamma expansion factor.

$$x_{\gamma} = x^{\gamma_{inv}}$$
$$w(x) = \cos\left(\frac{\pi}{2} x\right)$$
$$x_{out} = (1 - w(x)) \cdot x + w(x) \cdot x_{\gamma}$$

**Properties:**
1. At pure black ($x = 0$): $w(0) = 1$, yielding maximum shadow lift: $x_{out} = 0^{\gamma_{inv}} \to$ lifted shadow response.
2. At pure white ($x = 1$): $w(1) = 0$, strictly preserving original highlight boundaries: $x_{out} = 1.0$.
3. Smooth transition: The tone curve is strictly monotonic and continuously differentiable, preventing contouring or solarization artifacts.

For overexposed scenes, an optional highlight compression curve dampens irrecoverable highlights above $0.85$:
$$x_{out} = 0.85 + 0.65 \cdot (x - 0.85) \quad \text{for } x > 0.85$$

---

### 1.2 Luminance-Based CLAHE with Noise-Damping

Contrast Limited Adaptive Histogram Equalization operates on local image contextual regions (tiles). Applying histogram equalization across independent RGB channels causes severe chromatic distortion and unnatural color shifts.

LightMap applies CLAHE strictly to the lightness channel in CIELAB color space:
1. Convert RGB $\to$ BGR $\to$ CIELAB: $(L, a, b)$.
2. Extract $L \in [0, 255]$ representing perceptual lightness.
3. Apply adaptive CLAHE:
   $$L_{clahe} = \text{CLAHE}(L, \text{clipLimit}, \text{tileGridSize})$$
4. When high-frequency noise is detected ($\sigma_{noise} > 15.0$), the clip limit is attenuated by up to 35% to prevent amplifying sensor noise grain.
5. Blend lightness back:
   $$L_{final} = (1 - \alpha) L + \alpha L_{clahe}$$
6. Convert CIELAB $\to$ BGR $\to$ RGB.

---

### 1.3 Luminance Multi-Scale Retinex with Color Ratio Preservation

Classical Retinex separates an image into illumination $L(x, y)$ and reflectance $R(x, y)$:
$$I(x, y) = L(x, y) \cdot R(x, y)$$

In Multi-Scale Retinex (MSR), multiple Gaussian filters estimate illumination across small, medium, and large scales:
$$\sigma \in \{15, 80, 250\}$$

To eliminate the gray-world bleaching and severe color degradation typical of channel-independent Retinex, LightMap executes Retinex exclusively on perceptual luminance $L(x, y) = 0.299 R + 0.587 G + 0.114 B$:

$$L_{norm} = \frac{L(x, y)}{255.0}$$
$$R_k(x, y) = \log(L_{norm} + 1.0) - \log(L_{norm} * G_{\sigma_k} + 1.0)$$
$$R_{ms}(x, y) = \sum_{k=1}^K w_k R_k(x, y), \quad \text{with } w_k = \frac{1}{K}$$

**Sigmoidal Tone Normalization:**
To eliminate halo artifacts without linear min-max clipping, the multi-scale response is mapped through a logistic sigmoid:
$$L_{enh}(x, y) = \frac{1}{1 + \exp\left(-3.0 \cdot R_{ms}(x, y)\right)}$$

**Color Ratio Transfer:**
Color channels are scaled proportionally to the ratio of restored luminance to original luminance:
$$C_{out}(x, y) = C_{in}(x, y) \cdot \left(\frac{L_{enh}(x, y)}{L_{norm}(x, y) + \epsilon}\right)^\beta$$
where $\beta = 0.75$ prevents color oversaturation.

---

### 1.4 Adaptive Bilateral Denoising

Bilateral filtering smooths high-frequency noise while preserving sharp boundaries by combining a spatial Gaussian domain kernel with a radiometric range kernel:

$$BF[I]_p = \frac{1}{W_p} \sum_{q \in \Omega} I_q f(\|p - q\|) g(\|I_p - I_q\|)$$

LightMap dynamically adapts filter parameters based on measured Laplacian noise variance $\sigma_{noise}^2$:
- Clean scenes ($\sigma_{noise}^2 < 4.0$): Minimal filter ($d=5, \sigma=8$) or skipped to preserve textures.
- Moderate noise ($\sigma_{noise}^2 \in [4, 25]$): $d=7, \sigma=12$.
- Heavy sensor noise ($\sigma_{noise}^2 > 100$): $d=9, \sigma=22$.
- Parameter adaptation by profile: `detail_preservation` reduces spatial diameter $d=5$ and $\sigma \times 0.65$; `maximum_visibility` increases range smoothing.

---

### 1.5 Damped Colour Cast Correction with Chromaticity Protection

Ambient low-light illumination often induces warm tungsten or cool blue casts. Classical Gray-World assumption rescales channel averages to a common mean:

$$gain_c = 1.0 + \alpha \cdot \left(\frac{\bar{I}}{\bar{I}_c} - 1.0\right)$$

**Chromaticity Protection Guards:**
1. **High Native Saturation Guard:** If scene mean saturation $S_{mean} > 0.35$ (e.g. sunsets, neon, flowers), the scene has intentional chromatic variance. Colour correction is bypassed.
2. **Monochrome Guard:** If channel ratio $\max(\bar{I}_c) / \min(\bar{I}_c) > 3.0$ (e.g. pure red or blue lighting), gray-world correction is bypassed to avoid washing out the scene.
3. **Damping Factor:** $\alpha \le 0.09$ and gains are clamped to $[0.80, 1.25]$ to prevent channel clipping.

---

## 2. Image Condition Analysis & Classification

The `analyze_image()` engine computes 14 quantitative indicators:

| Metric | Computation | Diagnostic Purpose |
| --- | --- | --- |
| **Average Brightness** | $\frac{1}{N} \sum L(x, y)$ | Global exposure level |
| **Median Brightness** | $\text{Median}(L)$ | Robust center of mass, robust to outlier lights |
| **Intensity Std** | $\sqrt{\text{Var}(L)}$ | Global contrast score |
| **Local Contrast** | Box-filtered local neighborhood standard deviation | Identifies flat vs textured regions |
| **Brightness Histogram** | 16-bin normalized frequency distribution | Tone curve distribution |
| **Underexposed %** | Fraction of pixels with $L < 60$ | Shadow area extent |
| **Overexposed %** | Fraction of pixels with $L > 220$ | Highlight area extent |
| **Highlight Clipping** | Fraction of pixels with $\max(R, G, B) \ge 252$ | Irrecoverable saturation extent |
| **Shadow Clipping** | Fraction of pixels with $\min(R, G, B) \le 4$ | Information loss in deep blacks |
| **Noise Score** | Variance of $\nabla^2 L$ | High-frequency noise estimation |
| **Edge Strength** | Standard deviation of $\nabla^2 L$ & Sobel magnitude | Structural content preservation |
| **Colour Distribution** | Per-channel means ($\mu_R, \mu_G, \mu_B$) and stds | Channel balance and color cast detection |
| **Saturation** | HSV saturation mean and standard deviation | Chromatic vibrancy vs neutrality |
| **Dimensions** | Height, width, channel count | Geometry integrity verification |

### Primary Scene Classification Categories

1. **Very Dark:** Mean brightness $< 35$ or (median $< 25$ and underexposure $> 80\%$). Requires aggressive shadow lifting with highlight preservation.
2. **Dark:** Mean brightness $< 75$. Requires balanced gamma expansion and luminance Retinex.
3. **Noisy Low-Light:** Low brightness paired with noise score $> 15$. Requires prioritized bilateral filtering, conservative gamma, and attenuated CLAHE.
4. **Low Contrast:** Contrast score $< 25$. Focuses on CLAHE contrast expansion with minimal gamma alteration.
5. **Mixed Lighting:** Both shadows ($> 15\%$) and highlights ($> 5\%$) coexist. Balanced gamma with highlight roll-off and luminance Retinex.
6. **Overexposed:** Mean brightness $> 180$ or overexposed ratio $> 25\%$. Brightening is suppressed; highlight compression applied; irrecoverable clipping reported.
7. **Normally Illuminated:** Well-balanced exposure and contrast. Minimal processing applied to preserve natural appearance.

---

## 3. Restoration Profiles

| Parameter | Natural | Maximum Visibility | Detail Preservation |
| --- | --- | --- | --- |
| **Primary Objective** | Balanced, photographic tone | Maximum scene intelligibility | Structural edge and texture sharpness |
| **Base Gamma $\gamma_{inv}$** | $0.82$ | $0.68$ | $0.90$ |
| **CLAHE Clip Limit** | $1.6$ | $2.2$ | $1.3$ |
| **CLAHE Grid** | $8 \times 8$ | $8 \times 8$ | $10 \times 10$ |
| **Retinex Weight** | $0.35$ | $0.55$ | $0.20$ |
| **Denoise Strength** | $12$ | $16$ | $7$ |
| **Color Cast Damping** | $0.06$ | $0.09$ | $0.03$ |

---

## 4. Objective Quality Validation & Automated Rollback

LightMap incorporates an automated quality guard `validate_restoration_quality(original, restored, analysis)`:
- Computes brightness delta, contrast ratio, edge preservation ratio, noise delta, clipping increases, and chromatic deviation.
- **Rollback Guard:** If the enhancement produces excessive clipping ($> 18\%$ new clipped pixels) or catastrophic noise amplification, the pipeline initiates an automated fallback to a conservative highlight-protected gamma curve ($\gamma_{inv} = 0.88$).
- The status report clearly distinguishes successful enhancement (`"passed"`) from fallback execution (`"fallback_conservative"`).

---

## 5. Physical Limitations & Clipping Reality

> [!IMPORTANT]
> **Recoverable Details vs. Irreversibly Clipped Information:**
> When sensor photodiodes saturate ($R, G, B \ge 255$) or underflow ($R, G, B = 0$), spatial gradient information is permanently discarded by the hardware ADC quantization. No classical algorithm can fabricate genuine scene texture from clipped regions. LightMap explicitly detects and reports `irrecoverable_clipping_detected` rather than claiming artificial recovery.
