# Classical Computer Vision Module Completion and Optimization Report

**Repository:** `LightMap-Low-Light-Restoration`
**Branch:** `feature/koushik-main-app`
**Author:** Karen / Classical CV Team
**Date:** 2026-11-07
**Module File:** `classical_cv/classical_pipeline.py`
**Test File:** `classical_cv/tests/test_classical_pipeline.py`

---

## 1. Executive Summary

The Classical Computer Vision restoration module for LightMap has been fully completed, optimized, and hardened. The pipeline has evolved from an initial basic prototype into a robust, explainable, recovery-aware computer vision system capable of handling extreme dark scenes, high sensor noise, flat contrast, mixed lighting, and overexposure without introducing artificial distortion, color bleaching, or highlight blowout.

### Key Verification Metrics
- **Pytest Suite:** 46 passing tests (29 Classical CV tests + 17 Backend API tests).
- **TypeScript & Build:** Clean compilation, 0 type errors, production build in 5.44s.
- **Coverage of Edge Cases:** 10/10 verified conditions (extreme dark, dark noisy, low contrast, mixed lighting, overexposed, normally illuminated, constant intensity, single-color, high contrast, non-standard aspect ratios).
- **Execution Speed:** 35 ms to 95 ms average processing latency on standard benchmark images.

---

## 2. Completed & Optimized Algorithms

### 2.1 Complete Image Condition Analysis
`analyze_image()` computes 14 quantitative scene metrics:
1. **Mean Brightness:** $\frac{1}{N} \sum L(x, y)$ (average perceptual luminance).
2. **Median Brightness:** Middle luminance value, immune to isolated light sources.
3. **Intensity Standard Deviation:** Measures total dynamic range.
4. **Global Contrast:** Std dev of global luminance.
5. **Local Contrast:** Mean standard deviation in local sliding windows ($15 \times 15$), separating local texture from global illumination gradients.
6. **Underexposed Ratio:** Proportion of pixels with luminance $< 60.0$.
7. **Overexposed Ratio:** Proportion of pixels with luminance $> 220.0$.
8. **Highlight Clipping Ratio:** Pixels where $\max(R, G, B) \ge 252$.
9. **Shadow Clipping Ratio:** Pixels where $\min(R, G, B) \le 4$.
10. **Noise Score & Noise Std:** Laplacian variance $\text{Var}(\nabla^2 L)$.
11. **Edge Strength & Gradient Magnitude:** Standard deviation of Laplacian and Sobel gradient magnitude.
12. **Colour Distribution:** Individual channel means and standard deviations.
13. **Saturation:** HSV mean saturation and saturation variance.
14. **Image Dimensions:** Verified tuple `(height, width, channels)`.

### 2.2 Seven-Class Image Condition Classification
1. `very_dark`: Mean $< 35$ or (median $< 25$ and underexposure $> 80\%$).
2. `dark`: Mean $< 75$ without extreme clipping.
3. `noisy_low_light`: Low brightness with noise score $> 15.0$.
4. `low_contrast`: Intensity std dev $< 25.0$.
5. `mixed_lighting`: Simultaneous coexistence of deep shadows ($> 15\%$) and bright highlights ($> 5\%$) or contrast $> 60$.
6. `overexposed`: Mean $> 180$ or overexposed ratio $> 25\%$.
7. `normally_illuminated`: Balanced exposure, normal contrast, low noise.

---

## 3. Mathematical Formulations & Enhancements

### 3.1 Highlight-Protected Adaptive Gamma Curve
$$x = \frac{I_{in}}{255.0} \in [0, 1]$$
$$x_{\gamma} = x^{\gamma_{inv}}$$
$$w(x) = \cos\left(\frac{\pi}{2} x\right)$$
$$I_{out} = (1 - w(x)) \cdot x + w(x) \cdot x_{\gamma}$$

**Advantage:** Shadows are expanded through power-law mapping ($w(0) = 1$), while bright highlights naturally taper to identity ($w(1) = 0$), eliminating saturation blowout.

### 3.2 CIELAB Luminance CLAHE with Noise Protection
- Applied exclusively to $L \in [0, 255]$ in CIELAB space. Color channels $a$ and $b$ are preserved.
- When noise score $> 15.0$, clip limits are attenuated by up to 35% to avoid amplifying noise grain into artificial texture.
- Blends enhanced luminance smoothly with input luminance.

### 3.3 Luminance Multi-Scale Retinex with Color Ratio Preservation
Gaussian scales: $\sigma \in \{15, 80, 250\}$:
$$R_{ms}(x, y) = \frac{1}{3} \sum_{k=1}^3 \left( \log(L_{norm} + 1.0) - \log(L_{norm} * G_{\sigma_k} + 1.0) \right)$$
$$L_{enh}(x, y) = \frac{1}{1 + \exp\left(-3.0 \cdot R_{ms}(x, y)\right)}$$
$$C_{out}(x, y) = C_{in}(x, y) \cdot \left(\frac{L_{enh}(x, y)}{L_{norm}(x, y) + \epsilon}\right)^{0.75}$$

**Advantage:** Retinex is computed on luminance only. Colors are transferred via luminance ratios, preventing color bleaching and halo borders.

### 3.4 Adaptive Bilateral Filtering
Adapts filter diameter ($d \in [5, 9]$) and radiometric sigma ($\sigma \in [8, 30]$) according to measured noise score and selected profile. Detail preservation uses conservative $d=5, \sigma=7$ to maintain micro-textures.

### 3.5 Damped Colour Balance with Native Saturation Protection
Prevents gray-world washing out of intentional colors:
- Bypassed if scene saturation $> 0.35$ (e.g. sunsets, flowers).
- Bypassed if image is monochromatic or single-color dominant (e.g. pure red or blue).
- Damping factor $\alpha \le 0.09$ prevents channel clipping.

---

## 4. Condition-Specific Processing Sequence

```mermaid
flowchart TD
    A["Input Image (RGB uint8)"] --> B["Validate Shape & Copy Array (Immutability)"]
    B --> C["analyze_image() (14 Metrics + 7 Condition Classes)"]
    C --> D{"Condition Branch"}
    
    D -->|"very_dark"| E["Strong Gamma Lift + Luminance Retinex + CLAHE + Denoise"]
    D -->|"noisy_low_light"| F["Bilateral Denoise First + Conservative Gamma + Damped CLAHE"]
    D -->|"low_contrast"| G["Boosted CLAHE + Minimal Gamma + Preserved Dynamic Range"]
    D -->|"overexposed"| H["Suppress Brightening + Highlight Compression + Report Clipping"]
    D -->|"mixed_lighting"| I["Balanced Gamma + Highlight Rolloff + Luminance Retinex"]
    D -->|"normally_illuminated"| J["Minimal Processing / Identity Preservation"]
    
    E & F & G & H & I & J --> K["validate_restoration_quality()"]
    K --> L{"Degradation Detected?"}
    L -->|"Yes"| M["Automated Conservative Fallback Rollback"]
    L -->|"No"| N["Output Verified Image & Detailed Diagnostics"]
    M --> N
```

---

## 5. Meaningful Profile Differences

On dark test images, the three profiles produce measurably distinct tonal and visual outputs:

| Characteristic | Natural | Maximum Visibility | Detail Preservation |
| --- | --- | --- | --- |
| **Objective** | Realistic photographic balance | Maximum intelligibility in deep shadows | Strict edge and texture sharpness |
| **Inverse Gamma $\gamma_{inv}$** | $0.82$ | $0.68$ | $0.90$ |
| **Mean Abs Difference** | $\approx 52.3$ | $\approx 76.1$ (Highest boost) | $\approx 33.9$ (Conservative) |
| **Brightness Delta** | $+52.50$ | $+76.25$ | $+34.17$ |
| **CLAHE Clip Limit** | $1.6$ | $2.2$ | $1.3$ |
| **Retinex Weight** | $0.35$ | $0.55$ | $0.20$ |
| **Bilateral Filter** | $d=7, \sigma=12$ | $d=9, \sigma=16$ | $d=5, \sigma=7$ (Fine edges) |

---

## 6. Objective Quality Validation & Automated Rollback Guard

`validate_restoration_quality()` computes:
- $\Delta \text{Brightness}$: $L_{rest} - L_{orig}$.
- $\text{Contrast Ratio}$: $\text{Std}(L_{rest}) / \text{Std}(L_{orig})$.
- $\text{Edge Preservation Ratio}$: $\text{Edges}(L_{rest}) / \text{Edges}(L_{orig})$.
- $\Delta \text{Noise}$: $\text{Noise}(L_{rest}) - \text{Noise}(L_{orig})$.
- Highlight and shadow clipping increases.
- Mean chromatic difference (color deviation).

**Automated Fallback:** If excessive highlight blowout ($> 18\%$ newly clipped pixels) or catastrophic noise amplification is detected, the pipeline automatically rolls back to a safe, conservative gamma curve (`status: "fallback_conservative"`), ensuring reliable output.

---

## 7. Recoverable Details vs. Irreversibly Clipped Information

> [!IMPORTANT]
> **Physical Boundary of Classical Restoration:**
> When image sensors saturate at $255$ or underflow at $0$, original photon count variations are permanently quantized to flat boundary values. Spatial gradient information inside clipped clusters is irreversibly lost. 
> 
> LightMap avoids fabricating false textures or hallucinating non-existent high-frequency patterns. For overexposed regions, the system performs smooth highlight rolloff compression and reports `irrecoverable_clipping_detected: True` with an explicit diagnostic explanation:
> *"Irrecoverable highlight clipping was detected in the original image. Clipped details cannot be physically reconstructed from the single exposure."*

---

## 8. Test Coverage & Verification Results

All 29 Classical CV unit and property tests pass in **0.98s**:

| Test ID | Condition / Scenario Tested | Result | Observations |
| --- | --- | --- | --- |
| `test_condition_1` | Extremely dark ($\le 5$ intensity) | **PASSED** | Shadow recovered; no division-by-zero |
| `test_condition_2` | Dark noisy ($\sigma=15$ Gaussian noise) | **PASSED** | Bilateral denoising triggered; noise suppressed |
| `test_condition_3` | Low contrast flat scene ($\sigma < 2$) | **PASSED** | CLAHE applied; contrast expanded |
| `test_condition_4` | Mixed lighting (shadows + highlights) | **PASSED** | Shadows lifted; highlights protected |
| `test_condition_5` | Overexposed image (mean $> 230$) | **PASSED** | Brightening suppressed; compression applied |
| `test_condition_6` | Normally illuminated scene | **PASSED** | Minimal intervention; natural tone kept |
| `test_condition_7` | Constant intensity (zero variance) | **PASSED** | Zero division guarded; no NaN/Inf |
| `test_condition_8` | Single-color image (pure red) | **PASSED** | Red hue preserved; not turned gray |
| `test_condition_9` | High contrast checkerboard | **PASSED** | Edge structures preserved cleanly |
| `test_condition_10`| Aspect ratios (panoramic, tall, square) | **PASSED** | Exact output dimensions preserved |
| `test_profile_diff`| Profile output distinctness | **PASSED** | Outputs measurably distinct |
| `test_immutability`| Original array immutability | **PASSED** | Input array strictly unmodified |
| `test_quality_val` | Quality validation stage | **PASSED** | Full quality report generated |

---

## 9. Known Limitations & Remaining Work

1. **Extreme Sensor Noise:** Classical bilateral filtering cannot reconstruct high-frequency textures obscured by severe Poisson-Gaussian read noise without slight softening. (This is where deep learning models like Retinexformer will add value in future stages).
2. **Extreme Dynamic Range:** In scenes with both deep black night skies and direct light sources, single-exposure classical techniques must compromise between slight shadow lift and highlight containment.
3. **Pending AI Engine Integration:** `ai_engine.inference` and `ai_engine.adaptive_fusion` remain placeholders pending Krishank's model integration.

