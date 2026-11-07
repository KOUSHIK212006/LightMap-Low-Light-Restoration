# LightMap: Failure Case Analysis

A critical component of explainable and recovery-aware image restoration is cataloging and diagnosing specific conditions where restoration algorithms struggle or fail.

---

## 1. Primary Failure Modes

### 1.1 Irrecoverable Highlight Clipping (Physical Information Loss)
* **Visual Symptom:** Large pure-white regions with flat textures and zero detail.
* **Underlying Cause:** The camera sensor saturated during exposure, clipping RGB values at 255. In a single exposure, photons above the saturation capacity cannot be physically reconstructed without hallucinatory generation.
* **LightMap Treatment:**
  * Detected by `highlight_clipping_ratio >= 0.08`.
  * The pipeline applies smooth cosine knee compression to prevent harsh clipping steps, but **explicitly avoids claiming fake detail recovery**.
  * Quality Guardian issues warning: *"Irrecoverable highlight clipping detected; clipped areas cannot be physically reconstructed from single exposure."*

### 1.2 Severe Sensor Noise Amplification (Low SNR Regimes)
* **Visual Symptom:** Mottled chromatic noise, salt-and-pepper grain, or blotchy patches appearing in dark shadows when lifted.
* **Underlying Cause:** In extremely underexposed scenes ($\bar{L} < 15$), the signal-to-noise ratio is near zero. Gamma or Retinex tone mapping lifts sensor noise along with true signal.
* **LightMap Treatment:**
  * Detected by `noise_score` and `is_noisy_low_light`.
  * Parameter adaptation dampens Retinex gain, elevates bilateral filtering diameter $d$, and clamps CLAHE clip limits.
  * Quality Guardian flags if noise ratio exceeds $3.5\times$, prompting automated fallback or retry.

### 1.3 Chromatic Drift in Monochrome or Single-Hue Scenes
* **Visual Symptom:** Warm candlelit or colored neon scenes shifted towards drab uniform gray.
* **Underlying Cause:** Standard Gray-World color constancy assumes the average scene reflection is achromatic gray. In naturally monochromatic or strong colored lighting, this assumption is violated.
* **LightMap Treatment:**
  * Damped Gray-World with saturation and monochrome guards.
  * If mean saturation $> 0.35$ or any channel dominance ratio $> 3.0:1$, color balance gains are attenuated or bypassed.

### 1.4 Halo Artifacts at High-Contrast Boundaries
* **Visual Symptom:** Dark or glowing bands along silhouettes (e.g., building roofs against twilight sky).
* **Underlying Cause:** Multi-Scale Retinex Gaussian filtering across sharp structural edges leaks illumination across boundaries.
* **LightMap Treatment:**
  * Sigmoidal normalization of Retinex responses combined with luminance CLAHE blending.
  * Adaptive fusion weight map smoothed with a Gaussian kernel $(31, 31)$ to eliminate abrupt transition boundaries.

