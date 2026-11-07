import { useEffect, useMemo, useState } from 'react';
import type { AnalysisMetrics, ImageProfile } from '../types/image';

interface ComparisonViewProps {
  originalImage?: string;
  enhancedImage?: string;
  fusionMap?: string | null;
  branchDisagreementMap?: string | null;
  analysis?: AnalysisMetrics;
  restoredAnalysis?: AnalysisMetrics;
  warnings?: string[];
  timing?: Record<string, unknown>;
  selectedMethod?: string;
  processingStatus?: string;
  profile?: ImageProfile;
  retryApplied?: boolean;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function ComparisonView({
  originalImage,
  enhancedImage,
  fusionMap,
  branchDisagreementMap,
  analysis,
  restoredAnalysis,
  warnings,
  timing,
  selectedMethod,
  processingStatus,
  profile,
  retryApplied,
}: ComparisonViewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  useEffect(() => {
    setSliderPosition(50);
  }, [originalImage, enhancedImage]);

  const originalBrightness = asNumber(analysis?.mean_brightness);
  const restBrightness = asNumber(restoredAnalysis?.mean_brightness ?? analysis?.mean_brightness);
  const brightnessDelta = originalBrightness !== null && restBrightness !== null ? restBrightness - originalBrightness : null;

  const originalContrast = asNumber(analysis?.contrast_score);
  const restContrast = asNumber(restoredAnalysis?.contrast_score ?? analysis?.contrast_score);
  const contrastDelta = originalContrast !== null && restContrast !== null ? restContrast - originalContrast : null;

  const sourceWarnings = useMemo(() => warnings ?? [], [warnings]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Restoration Comparison</h3>
        {originalImage && enhancedImage && (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: viewMode === 'slider' ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                color: viewMode === 'slider' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Slider View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: viewMode === 'side-by-side' ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                color: viewMode === 'side-by-side' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Side-by-Side
            </button>
          </div>
        )}
      </div>

      {originalImage && enhancedImage && viewMode === 'slider' ? (
        <div className="comparison-slider-wrap">
          <div className="comparison-slider-stage">
            <img className="comparison-image comparison-image-base" src={originalImage} alt="Original" />
            <div className="comparison-image-overlay" style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
              <img className="comparison-image comparison-image-restored" src={enhancedImage} alt="Restored" />
            </div>
            <div className="comparison-divider" style={{ left: `${sliderPosition}%` }}>
              <span className="comparison-handle">↔</span>
            </div>
            <div className="comparison-label comparison-label-original">Original</div>
            <div className="comparison-label comparison-label-restored">Restored</div>
            <input
              aria-label="Adjust comparison"
              className="comparison-slider"
              type="range"
              min={0}
              max={100}
              value={sliderPosition}
              onChange={(event) => setSliderPosition(Number(event.target.value))}
            />
          </div>
        </div>
      ) : (
        <div className="comparison-grid">
          <div className="preview-card">
            <div className="preview-header">Original</div>
            {originalImage ? (
              <img className="preview-image" src={originalImage} alt="Original" />
            ) : (
              <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>No original image.</div>
            )}
          </div>
          <div className="preview-card">
            <div className="preview-header">Restored</div>
            {enhancedImage ? (
              <img className="preview-image" src={enhancedImage} alt="Restored" />
            ) : (
              <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>No result yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Adaptive Fusion Maps Section (only rendered when returned by backend) */}
      {(fusionMap || branchDisagreementMap) && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#60a5fa' }}>
            Adaptive Hybrid Fusion Maps (IAAF)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {fusionMap && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Illumination Weight Map W (White = Deep Learning, Dark = Classical CV)
                </div>
                <img
                  src={fusionMap}
                  alt="Weight Map"
                  style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            )}
            {branchDisagreementMap && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Branch Disagreement Map |I_C - I_D| (Highlights Differences)
                </div>
                <img
                  src={branchDisagreementMap}
                  alt="Disagreement Map"
                  style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <h3>Diagnostics & Performance</h3>
        <ul className="meta-list">
          <li><span>Selected method</span><strong>{selectedMethod || '—'}</strong></li>
          <li><span>Processing status</span><strong>{processingStatus || '—'}</strong></li>
          {retryApplied && <li><span>Bounded retry</span><strong style={{ color: '#fbbf24' }}>Stabilized via Natural profile</strong></li>}
          <li><span>Profile</span><strong>{profile || '—'}</strong></li>
          <li><span>Mean brightness</span><strong>{analysis && typeof analysis.mean_brightness === 'number' ? analysis.mean_brightness.toFixed(2) : '—'}</strong></li>
          <li><span>Brightness change</span><strong>{brightnessDelta !== null ? `${brightnessDelta >= 0 ? '+' : ''}${brightnessDelta.toFixed(2)}` : '—'}</strong></li>
          <li><span>Contrast score</span><strong>{analysis && typeof analysis.contrast_score === 'number' ? analysis.contrast_score.toFixed(2) : '—'}</strong></li>
          <li><span>Contrast change</span><strong>{contrastDelta !== null ? `${contrastDelta >= 0 ? '+' : ''}${contrastDelta.toFixed(2)}` : '—'}</strong></li>
          <li><span>Noise estimate</span><strong>{analysis && typeof analysis.noise_score === 'number' ? analysis.noise_score.toFixed(2) : '—'}</strong></li>
          <li><span>Edge strength</span><strong>{analysis && typeof analysis.edge_strength === 'number' ? analysis.edge_strength.toFixed(2) : '—'}</strong></li>
          <li><span>Underexposed %</span><strong>{analysis && typeof analysis.underexposed_ratio === 'number' ? `${(analysis.underexposed_ratio * 100).toFixed(1)}%` : '—'}</strong></li>
          <li><span>Overexposed %</span><strong>{analysis && typeof analysis.overexposed_ratio === 'number' ? `${(analysis.overexposed_ratio * 100).toFixed(1)}%` : '—'}</strong></li>
          <li><span>Processing time</span><strong>{timing && typeof timing.processing_ms === 'number' ? `${timing.processing_ms} ms` : '—'}</strong></li>
          <li><span>Warnings</span><strong>{sourceWarnings.length > 0 ? sourceWarnings.length.toString() : '0'}</strong></li>
        </ul>

        {sourceWarnings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {sourceWarnings.map((warning) => (
              <div key={warning} style={{ marginBottom: 8, color: '#fed7aa', background: 'rgba(127,29,29,0.18)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: '0.85rem' }}>
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
