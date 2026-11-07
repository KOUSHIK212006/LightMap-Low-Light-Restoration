interface ComparisonViewProps {
  originalImage?: string;
  enhancedImage?: string;
  classicalImage?: string;
  deepImage?: string;
  fusionMap?: string;
  disagreementMap?: string;
  analysis?: Record<string, unknown>;
  qualityReport?: Record<string, unknown>;
  warnings?: string[];
  timing?: Record<string, unknown>;
  selectedMethod?: string;
  processingStatus?: string;
}

export default function ComparisonView({
  originalImage,
  enhancedImage,
  classicalImage,
  deepImage,
  fusionMap,
  disagreementMap,
  analysis,
  qualityReport,
  warnings,
  timing,
  selectedMethod,
  processingStatus,
}: ComparisonViewProps) {
  const checks = (qualityReport?.checks ?? {}) as Record<string, number>;
  const retryCount = qualityReport?.retry_count as number | undefined;
  const corrections = (qualityReport?.corrections_applied ?? []) as string[];

  return (
    <div>
      <h3>Comparison</h3>
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
          <div className="preview-header">Enhanced ({selectedMethod || 'Result'})</div>
          {enhancedImage ? (
            <img className="preview-image" src={enhancedImage} alt="Enhanced" />
          ) : (
            <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>No result yet.</div>
          )}
        </div>
      </div>

      {(fusionMap || disagreementMap || classicalImage || deepImage) && (
        <div style={{ marginTop: 20 }}>
          <h3>Intermediate Stages & Weight Maps</h3>
          <div className="comparison-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {classicalImage && (
              <div className="preview-card">
                <div className="preview-header">Classical CV Branch</div>
                <img className="preview-image" src={classicalImage} alt="Classical Branch" />
              </div>
            )}
            {deepImage && (
              <div className="preview-card">
                <div className="preview-header">Deep Learning Branch</div>
                <img className="preview-image" src={deepImage} alt="Deep Branch" />
              </div>
            )}
            {fusionMap && (
              <div className="preview-card">
                <div className="preview-header">Fusion Weight Map (W)</div>
                <img className="preview-image" src={fusionMap} alt="Fusion Weight Map" />
                <div style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Dark areas: DL (W→1) | Bright: Classical (W→0)
                </div>
              </div>
            )}
            {disagreementMap && (
              <div className="preview-card">
                <div className="preview-header">Branch Disagreement Map</div>
                <img className="preview-image" src={disagreementMap} alt="Branch Disagreement Map" />
                <div style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  |I_Deep - I_Classical| per-pixel divergence
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <h3>Diagnostics & Quality Guardian</h3>
        <ul className="meta-list">
          <li>
            <span>Selected method</span>
            <strong>{selectedMethod || '—'}</strong>
          </li>
          <li>
            <span>Processing status</span>
            <strong>{processingStatus || '—'}</strong>
          </li>
          <li>
            <span>Mean brightness</span>
            <strong>{analysis && typeof analysis.mean_brightness === 'number' ? analysis.mean_brightness.toFixed(2) : '—'}</strong>
          </li>
          <li>
            <span>Contrast score</span>
            <strong>{analysis && typeof analysis.contrast_score === 'number' ? analysis.contrast_score.toFixed(2) : '—'}</strong>
          </li>
          <li>
            <span>Processing latency</span>
            <strong>{timing && typeof timing.processing_ms === 'number' ? `${timing.processing_ms} ms` : '—'}</strong>
          </li>
          <li>
            <span>Quality Guardian Status</span>
            <strong style={{ color: qualityReport?.passed ? '#4ade80' : '#f87171' }}>
              {qualityReport ? (qualityReport.passed ? 'PASSED' : 'FLAGGED') : '—'}
            </strong>
          </li>
          {retryCount !== undefined && (
            <li>
              <span>Bounded Retry Count</span>
              <strong>{retryCount} attempts</strong>
            </li>
          )}
          {checks.brightness_increase !== undefined && (
            <li>
              <span>Brightness Increase</span>
              <strong>{(checks.brightness_increase * 100).toFixed(1)}%</strong>
            </li>
          )}
          {checks.clipping_increase !== undefined && (
            <li>
              <span>Highlight Clipping Shift</span>
              <strong>{(checks.clipping_increase * 100).toFixed(1)}%</strong>
            </li>
          )}
          {checks.noise_ratio !== undefined && (
            <li>
              <span>Laplacian Noise Ratio</span>
              <strong>{checks.noise_ratio.toFixed(2)}x</strong>
            </li>
          )}
          {checks.color_shift !== undefined && (
            <li>
              <span>Colour Vector Shift</span>
              <strong>{checks.color_shift.toFixed(3)}</strong>
            </li>
          )}
        </ul>

        {corrections && corrections.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.85rem', color: '#a7f3d0', marginBottom: 6 }}>
              Bounded Corrections Applied:
            </div>
            {corrections.map((corr, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: 6,
                  color: '#6ee7b7',
                  background: 'rgba(6, 78, 59, 0.3)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: '0.85rem',
                }}
              >
                ✓ {corr}
              </div>
            ))}
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: 6 }}>Warnings & Advisory Checks:</div>
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: 8,
                  color: '#fed7aa',
                  background: 'rgba(127,29,29,0.18)',
                  border: '1px solid rgba(251,146,60,0.2)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: '0.88rem',
                }}
              >
                ⚠ {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
