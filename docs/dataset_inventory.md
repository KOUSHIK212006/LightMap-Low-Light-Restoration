# LightMap: Dataset Inventory

This document provides the canonical inventory and structural specifications for the four low-light restoration benchmark datasets evaluated in LightMap.

---

## 1. Summary Matrix

| Dataset | Type | Capture Environment | Train Pairs | Test Pairs | Resolution | Color Space | Ground Truth Source |
|---|---|---|---|---|---|---|---|
| **LOL-v1** | Real Pairs | Indoor indoor scenes | 485 | 15 | 400x600 | RGB (PNG) | Long-exposure real capture |
| **LOL-v2 Real** | Real Pairs | Dynamic exposures | 689 | 100 | Variable | RGB (PNG) | Long-exposure tripod capture |
| **LOL-v2 Synthetic** | Synthetic Pairs | RAW synthesis degradation | 1000 | 100 | Variable | RGB (PNG) | Synthesized from clean RAW |
| **MIT-Adobe FiveK** | Photography | Global outdoor/indoor | 4,500 | 500 | Full resolution | RAW / sRGB TIFF | Retouched by 5 expert photographers (Expert C canonical) |

---

## 2. Dataset Specifics

### 2.1 LOL Dataset (v1)
* **Citation:** Chen Wei, Wenhan Yang, Jiaying Liu, Zongming Guo. "Deep Retinex Decomposition for Low-Light Enhancement." BMVC 2018.
* **Characteristics:** Real pairs captured with varying ISO and shutter speeds using Sony/Nikon cameras. High noise levels in dark shadows, challenging color fidelity.
* **Directory Layout:**
  ```
  datasets/LOLv1/
    ├── our485/
    │   ├── low/      [485 low-light PNG images]
    │   └── high/     [485 normal-light ground truth PNG images]
    └── eval15/
        ├── low/      [15 evaluation low-light images]
        └── high/     [15 evaluation normal-light images]
  ```

### 2.2 LOL-v2 (Real_captured & Synthetic)
* **Citation:** Wenhan Yang, Wenjing Wang, Haofeng Huang, Shiqi Wang, Jiaying Liu. "Sparse Gradient Regularized Deep Retinex Network for Robust Low-Light Image Enhancement." IEEE TIP 2021.
* **Real Captured Subset:**
  * 689 training pairs, 100 testing pairs.
  * Real exposures with realistic sensor noise and diverse scenes.
  * Directory layout:
    ```
    datasets/LOLv2/Real_captured/
      ├── Train/
      │   ├── Low/
      │   └── Normal/
      └── Test/
          ├── Low/
          └── Normal/
    ```
* **Synthetic Subset:**
  * 1,000 training pairs, 100 testing pairs.
  * Synthesized via RAW sensor pipeline degradation.

### 2.3 MIT-Adobe FiveK
* **Citation:** Vladimir Bychkovsky, Sylvain Paris, Eric Chan, Frédo Durand. "Learning Photographic Global Tonal Adjustment with a Database of Input / Output Image Pairs." CVPR 2011.
* **Characteristics:** 5,000 high-resolution RAW photographs retouched by 5 photographic experts. Expert C is widely recognized as the standard ground-truth reference for tonal enhancement and contrast adjustment.
* **Directory Layout:**
  ```
  datasets/MIT_FiveK/
    ├── input/      [Raw/unenhanced exposures]
    └── expertC/    [Expert C retouched reference images]
  ```

---

## 3. Storage and Access Protocol
In compliance with project confidentiality and repository size limits, **no dataset images are stored on GitHub**.
* Datasets are centrally distributed via team Google Drive.
* Extracted locally into the `datasets/` root folder (ignored by `.gitignore`).
* Validated using `python scripts/validate_datasets.py`.

