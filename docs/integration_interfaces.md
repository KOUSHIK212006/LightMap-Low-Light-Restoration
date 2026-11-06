# Integration interfaces

This repository keeps the integration contract intentionally lightweight so Karen and Krishank can merge their modules later without disrupting the main app.

## Karen's classical CV module

File: `classical_cv/classical_pipeline.py`

Expected API:

```python
classical_cv.classical_pipeline.analyze_image(image)
classical_cv.classical_pipeline.enhance_classical(image, analysis=None, profile="natural")
```

Contract:
- Input: RGB uint8 NumPy array with shape (height, width, 3)
- Output: dictionary keyed by measurements and optional maps
- Output image must preserve input dimensions and remain RGB uint8

## Krishank's AI engine

Files:
- `ai_engine/inference.py`
- `ai_engine/adaptive_fusion.py`
- `ai_engine/quality_guardian.py`

Expected APIs:

```python
ai_engine.inference.enhance_deep(image, model_name="retinexformer")
ai_engine.adaptive_fusion.adaptive_fusion(original, classical_output, deep_output, analysis=None)
ai_engine.quality_guardian.check_quality(original, enhanced, analysis=None)
```

Contract:
- Inputs are RGB uint8 arrays and maintained at module boundaries
- Outputs may be omitted or return `None` when optional dependencies are unavailable
- When modules are absent, the app emits a clear warning and uses a documented demo fallback

## LightMap pipeline expectations

The backend service orchestrates the flow in the following order:

1. Validate input
2. Decode and normalize the image
3. Run image analysis
4. Run classical enhancement if available
5. Run deep-learning enhancement if available
6. Fuse branch outputs when both are available
7. Run quality checks
8. Return final image and diagnostics

The current Phase 1 build implements the validated upload pipeline and the documented fallback flow; it does not fabricate model outputs, fusion maps, or quality metrics.
