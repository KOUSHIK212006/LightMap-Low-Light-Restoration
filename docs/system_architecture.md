# LightMap System Architecture

## 1. High-Level Architectural Overview

LightMap is an explainable, recovery-aware low-light image restoration platform. The system combines deterministic Classical Computer Vision with deep transformer models (Retinexformer) via an Illumination-Aware Adaptive Fusion (IAAF) engine, mediated by a comprehensive Quality Guardian.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                 │
│                 React 18 + TypeScript + Vite Dashboard                      │
│   - Multi-format Drag-and-Drop Image Uploader                               │
│   - Engine Mode Selector: Hybrid (IAAF) | Classical CV | Deep Learning     │
│   - Profile Selector: Natural | Maximum Visibility | Detail Preservation   │
│   - Live View: Interactive Split Slider / Side-by-Side Toggle               │
│   - Diagnostics Panel (Deltas for Brightness, Contrast, Noise, Clipping)    │
│   - Adaptive Fusion Maps Viewer (Spatial Weight W and Disagreement Maps)    │
│   - Restored Image Download (PNG format with engine/profile filename)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST (Multipart Form Data)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI BACKEND                                │
│   - CORS Middleware (localhost:5173, localhost:3000)                        │
│   - Route Controllers: /health, /, /api/v1/analyze, /enhance, /compare      │
│   - Input Validation: Extension check, MIME check, 10MB size limit, PIL     │
│     integrity verification, EXIF transposition, RGB uint8 normalization     │
│   - Error Sanitizer: Structured JSON detail responses                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATION PIPELINE                             │
│                     (RestorationService Controller)                         │
│                                                                             │
│   1. Input Pre-Analysis (14 metrics, 7 condition classifications)           │
│   2. Branch Execution Strategy:                                             │
│      ├── Classical Branch: Always available, deterministic                  │
│      └── Deep Branch: Checkpoint check (pretrained_weights/retinexformer)   │
│   3. Adaptive Hybrid Fusion (IAAF):                                         │
│      - Illumination Map: I_L = 0.299R + 0.587G + 0.114B                    │
│      - Adaptive Weight Map: W = clip((0.5 - I_L) * 2, 0.2, 0.9)            │
│      - Gaussian Smoothing: W_smooth = GaussianBlur(W, (31, 31))             │
│      - Fusion Equation: I_H = W * I_D + (1 - W) * I_C                       │
│      - Disagreement Map: D = |I_C - I_D|                                    │
│   4. Fallback Handling:                                                     │
│      - If DL weights missing: Fall back to Classical CV with transparent    │
│        warning. Never label Classical CV as Hybrid.                         │
│      - If Deep mode requested and weights missing: Return structured error. │
│   5. Quality Guardian & Bounded Retry:                                      │
│      - Artifact check (Brightness, Highlight Clipping, Laplacian Noise,     │
│        Chromatic Vector Drift).                                             │
│      - If degradation flagged on visibility/detail profiles, retry once     │
│        with Natural profile for stabilization.                              │
│   6. Serialization: Output images and diagnostic maps encoded as base64     │
│      PNG Data URLs.                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Responsibilities

```
LightMap-Low-Light-Restoration/
├── ai_engine/                         # Krishank: Deep Learning & Fusion Module
│   ├── adaptive_fusion.py             # Illumination-Aware Adaptive Hybrid Fusion (IAAF)
│   ├── inference.py                   # Retinexformer inference and model caching
│   ├── model_loader.py                # Checkpoint validation and loader
│   ├── quality_guardian.py            # Objective multi-metric quality evaluator
│   └── tests/test_ai_engine.py        # AI engine unit tests
├── backend/                           # Koushik: FastAPI Web Application
│   ├── app/
│   │   ├── api/routes.py              # API endpoint route handlers
│   │   ├── core/                      # Configuration, settings, pipeline interface
│   │   ├── schemas/response.py        # Pydantic data schemas
│   │   ├── services/image_io.py       # Base64 serialization, 2D/3D uint8 conversions
│   │   ├── services/restoration_service.py # Core orchestrator and retry manager
│   │   └── utils/validation.py        # Multi-stage image validation and security
│   └── tests/                         # Comprehensive API and metric integration tests
├── classical_cv/                      # Karen & Koushik: Classical Vision Pipeline
│   ├── classical_pipeline.py          # 14-metric analyzer, MSR, CLAHE, gamma, bilateral
│   └── tests/                         # 29 unit tests covering 12 image conditions
├── frontend/                          # Koushik: React SPA Dashboard
│   ├── src/
│   │   ├── components/                # Modular UI components (ComparisonView, MethodSelector)
│   │   ├── pages/Home.tsx             # Master application controller
│   │   ├── services/api.ts            # Typed HTTP client service
│   │   └── types/image.ts             # TypeScript interface contracts
├── pretrained_weights/                # Checkpoint directory (ignored by Git)
├── scripts/                           # Impana & Koushik: Dataset and Evaluation Scripts
│   ├── validate_datasets.py           # Dataset path scanner and integrity checker
│   └── metrics.py                     # Quantitative evaluation metrics (PSNR, SSIM, etc.)
├── notebooks/                         # Impana: Exploratory analysis notebooks
├── docs/                              # System documentation and verification reports
└── test-results/                      # Temporary test outputs (ignored by Git)
```

