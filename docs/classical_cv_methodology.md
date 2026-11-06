# Classical CV methodology for LightMap

## Overview

The classical low-light enhancement pipeline in LightMap is designed to be explainable and recovery-aware. It starts from a measured image-condition analysis, then applies a small set of well-understood classical computer-vision operations according to the observed scene conditions. The implementation intentionally avoids hard-coded “magic” transformations and instead uses transparent thresholds for exposure, contrast, noise and clipping.

## 1. Gamma correction

Gamma correction models the nonlinear response of image sensors and display systems:

$$
I_{out} = 255 \times \left( \frac{I_{in}}{255} \right)^{\gamma}
$$

This approach is useful for restoring underexposed scenes because it lifts shadows without creating large overshoots in midtones. In LightMap, the gamma value adapts to the scene brightness. Dark images use a slightly stronger gamma correction, while already-well-lit scenes keep the correction mild to avoid unnatural brightening or highlight clipping.

Advantages:
- simple and fast
- effective for low-light recovery
- interpretable parameters

Limitations:
- cannot fully recover lost contrast if the scene is badly underexposed
- may over-brighten if gamma is set too high

## 2. CLAHE

Contrast Limited Adaptive Histogram Equalization operates on local image regions instead of a single global histogram. The luminance channel is processed in the LAB color space, and the color channels are preserved by converting back to RGB after enhancement.

This is useful when the image has low contrast even after basic brightness correction. The clip limit prevents excessive local amplification that would otherwise produce noisy or over-contrasted patches.

Advantages:
- improves local contrast effectively
- preserves the original color relationships when applied in LAB space

Limitations:
- can over-amplify texture in very noisy scenes
- requires careful clip-limit tuning

## 3. Multi-scale Retinex

Multi-scale Retinex estimates the illumination component by applying Gaussian blurs at multiple scales and subtracts that low-frequency illumination from the log-transformed image. In practice, the method enhances the reflectance component while reducing the effect of uneven illumination.

The basic principle is:

$$
R(x, y) = \log(I(x, y)) - \log(G_{\sigma}(I(x, y)))
$$

and the multi-scale version combines several scales to balance local and global illumination recovery.

Advantages:
- effective for low-light scenes with uneven illumination
- helps restore visibility without requiring learned models

Limitations:
- too much enhancement can create halos or unnatural brightness
- requires careful tuning to preserve natural color

## 4. Edge-preserving denoising

The implementation uses bilateral filtering because it smooths within similar tonal neighborhoods while preserving image edges. This is more appropriate than aggressive Gaussian smoothing when detail must remain visible.

Advantages:
- reduces noise without flattening strong edges
- keeps textures intact better than simple averaging filters

Limitations:
- can be computationally heavier than basic smoothing
- too strong a denoise setting can flatten fine detail

## 5. Colour correction

Colour correction is applied conservatively to reduce visible channel imbalance. The method rescales channels toward a common mean when the image appears overly blue, red or green-dominant. This avoids strong artificial color shifts while keeping natural scene colors.

Advantages:
- addresses imbalance without extreme saturation changes
- helps preserve realistic tonal relationships

Limitations:
- cannot infer perfect white balance from a single image alone
- extreme lighting casts may still require more advanced color estimation

## 6. Adaptive enhancement decisions

The flow is:

1. Validate input image shape and type.
2. Analyze exposure, contrast, noise and clipping metrics.
3. Apply gamma correction when the scene is underexposed.
4. Apply CLAHE when contrast is low or when the profile demands stronger visibility.
5. Apply Retinex on dark or unevenly lit images.
6. Apply bilateral denoising when high-frequency noise is detected.
7. Apply colour correction when clipping or strong channel imbalance is present.
8. Validate the output to ensure the dimensions, channel order and dtype remain valid.

The thresholds are stored in the analysis output so the behavior remains transparent and explainable.

## 7. Computational complexity

This classical pipeline remains lightweight enough for practical browser-driven or local processing. The added cost depends mainly on image resolution and the number of enhancement stages applied:

- Gamma correction: low cost
- CLAHE: moderate cost, dependent on tile grid size
- Retinex: moderate cost because of multiple Gaussian blur passes
- Bilateral filtering: moderate cost, stronger than simple blur
- Colour correction: low cost

The implementation uses adaptive gating so the stronger operations are only triggered when the observed image conditions justify them.

## 8. Limitations

This is a classical enhancement pipeline, not a learned restoration model. It is effective for moderate low-light scenes and for explainability-focused workflows, but it cannot fully recover scenes with severe sensor noise, heavy compression artifacts, or extremely underexposed regions. The method is therefore best used as a clear, interpretable restoration stage that can coexist with deep-learning branches in the broader LightMap orchestration.
