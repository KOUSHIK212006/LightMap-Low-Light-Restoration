# LightMap: Dataset References and Licences

This document provides complete academic citations, URLs, licences, and usage conditions for all external datasets and model architectures utilized in LightMap.

---

## 1. Primary Benchmark Datasets

### 1. LOL Dataset (v1)
* **Title:** Deep Retinex Decomposition for Low-Light Enhancement
* **Authors:** Chen Wei, Wenhan Yang, Jiaying Liu, Zongming Guo
* **Venue:** British Machine Vision Conference (BMVC), 2018
* **URL:** https://daooshee.github.io/BMVC2018website/
* **License / Terms:** Academic research use only.
* **Usage in LightMap:** Evaluation of indoor low-light restoration and shadow recovery.

### 2. LOL-v2 Dataset (Real & Synthetic)
* **Title:** Sparse Gradient Regularized Deep Retinex Network for Robust Low-Light Image Enhancement
* **Authors:** Wenhan Yang, Wenjing Wang, Haofeng Huang, Shiqi Wang, Jiaying Liu
* **Venue:** IEEE Transactions on Image Processing (TIP), Vol. 30, pp. 2072-2086, 2021
* **URL:** https://github.com/flyywh/CVPR-2020-Semi-Low-Light
* **License / Terms:** Non-commercial educational and research purposes.
* **Usage in LightMap:** Core benchmark setting for Retinexformer and hybrid fusion evaluation.

### 3. MIT-Adobe FiveK Dataset
* **Title:** Learning Photographic Global Tonal Adjustment with a Database of Input / Output Image Pairs
* **Authors:** Vladimir Bychkovsky, Sylvain Paris, Eric Chan, Frédo Durand
* **Venue:** IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 2011
* **URL:** https://data.csail.mit.edu/graphics/fivek/
* **License / Terms:** Free for non-commercial academic research.
* **Usage in LightMap:** Evaluation on natural photographic tone adjustment and contrast balance against Expert C retouched outputs.

---

## 2. Model Architecture References

### 1. Retinexformer
* **Title:** Retinexformer: One-stage Retinex-based Transformer for Low-light Image Enhancement
* **Authors:** Yuanhao Cai, Hao Bian, Jing Lin, Haoqian Wang, Radu Timofte, Yulun Zhang
* **Venue:** IEEE International Conference on Computer Vision (ICCV), 2023
* **Repository:** https://github.com/caiyuanhao1998/Retinexformer
* **License:** Apache License 2.0 / MIT.
* **Usage in LightMap:** Primary deep-learning restoration engine.

### 2. Zero-DCE / Zero-DCE++ (Deferred)
* **Title:** Learning to Enhance Low-Light Image via Zero-Reference Deep Curve Estimation
* **Authors:** Chongyi Li, Chunle Guo, Chen Change Loy
* **Venue:** IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI), 2021
* **Status in LightMap:** Deferred optional model. Documented for future comparison.

