# LightMap AI Engine - Module Documentation

## 1. Model Setup & Checkpoints
- **Primary Model:** Retinexformer
- **Checkpoint used:** `retinexformer-lol-v2-real.pth` (LOL-v2 Real trained weights).
- **Source:** Downloaded from Hugging Face mirror (`WAS/was-node-suite-weights`).
- **Installation Note:** Requires cloning the official Retinexformer repo and installing `basicsr` via `python setup.py develop`. The model expects input tensors in **BGR** format (handled internally by our wrapper).

## 2. Zero-DCE++ Integration Status
- **Status:** Deferred. 
- **Reason:** Prioritized the stability and integration of the primary Retinexformer model and the Adaptive Hybrid Fusion pipeline to ensure the core system works end-to-end. Zero-DCE++ can be integrated in future iterations as a lightweight fallback.

## 3. Known Limitations & Failure Cases
- **Extreme Highlight Clipping:** Tested on extreme night images with pure white light sources (e.g., streetlamps). The Retinexformer model sometimes hallucinates color blocks (red/blue) around pure white pixels due to channel clipping. 
- **CPU Latency:** Inference takes ~1.3 seconds per image on a standard CPU. A GPU is recommended for production-level speed.
- **Mitigation:** The Quality Guardian successfully detects these color shifts and brightness spikes, returning a `passed: False` flag so the backend can retry or warn the user.

## 4. Exposed Interfaces
- `enhance_deep(image)` -> Runs Retinexformer.
- `adaptive_fusion(original, classical, deep)` -> Blends outputs using spatial weight maps.
- `check_quality(original, enhanced)` -> Returns pass/fail and warnings.
- `enhance_with_retry(...)` -> Bounded wrapper that handles quality checks and retries.