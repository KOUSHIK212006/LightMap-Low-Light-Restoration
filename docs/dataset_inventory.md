# LightMap Dataset Inventory & Split Records

This document catalogs the datasets used by LightMap, detailing their properties, resolutions, image counts, directory mapping, and splits.

---

## Dataset Summary Table

| Dataset ID | Full Name | Publication / Source | Subset / Split | Total Pairs | Sensor / Capturing Modality | Use in LightMap |
|---|---|---|---|---|---|---|
| **DS-01** | **LOL-v1** | BMVC 2018 (`daooshee.github.io`) | Train: 485<br>Eval: 15 | 500 | Real DSLR (variable ISO/shutter) | Baseline validation & classical decomposition |
| **DS-02** | **LOL-v2 Real** | CVPR/IJCV 2021 (`kaggle: tanhyml`) | Train: 689<br>Test: 100 | 789 | Real camera captures with optical noise | Primary training & quantitative benchmark |
| **DS-03** | **LOL-v2 Synthetic** | CVPR/IJCV 2021 (`kaggle: tanhyml`) | Train: 900<br>Test: 100 | 1000 | RAW noise simulation curves | Controlled noise robustness ablation |
| **DS-04** | **MIT-Adobe FiveK** | CVPR 2011 (`csail.mit.edu`) | 5,000 raw + Expert C | 5,000 | DSLR RAW (Nikon/Canon) | Supplementary tonal and contrast evaluation |

---

## Local Directory Mapping

```text
data/
├── eval_pairs/               # Active quantitative evaluation pairs
│   ├── low/                  # Real low-light inputs (LOL-v2 Real test split)
│   │   ├── 00690.png
│   │   ├── 00691.png
│   │   ├── 00692.png
│   │   ├── 00693.png
│   │   └── 00694.png
│   └── gt/                   # Matching ground truth reference captures
│       ├── 00690.png
│       ├── 00691.png
│       ├── 00692.png
│       ├── 00693.png
│       └── 00694.png
```

---

## Dataset Handling Protocols
1. **Zero Data Leakage**: Test split images (`00690.png`–`00694.png`) are strictly reserved for testing and never used for classical parameter selection or model tuning.
2. **Alignment & Dimensions**: All paired reference sets are verified to possess identical spatial dimensions ($400 \times 600$) and color channels ($3$ channels, RGB format).
3. **Storage Hygiene**: Full multi-gigabyte raw archives (e.g., 50GB MIT-Adobe FiveK archive) are tracked via `.gitignore` and downloaded on-demand using documented scripts.
