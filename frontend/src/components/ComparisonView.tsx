interface ComparisonViewProps {
  originalImage?: string;
  enhancedImage?: string;
  analysis?: Record<string, unknown>;
  warnings?: string[];
  timing?: Record<string, unknown>;
  selectedMethod?: string;
  processingStatus?: string;
}

export default function ComparisonView({
  originalImage,
  enhancedImage,
  analysis,
  warnings,
  timing,
  selectedMethod,
  processingStatus,
}: ComparisonViewProps) {
  return (
    <div>
      <h3>Comparison</h3>
      <div className="comparison-grid">
        <div className="preview-card">
          <div className="preview-header">Original</div>
          {originalImage ? <img className="preview-image" src={originalImage} alt="Original" /> : <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>No original image.</div>}
        </div>
        <div className="preview-card">
          <div className="preview-header">Enhanced</div>
          {enhancedImage ? <img className="preview-image" src={enhancedImage} alt="Enhanced" /> : <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>No result yet.</div>}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Diagnostics</h3>
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
            <span>Processing time</span>
            <strong>{timing && typeof timing.processing_ms === 'number' ? `${timing.processing_ms} ms` : '—'}</strong>
          </li>
          <li>
            <span>Warnings</span>
            <strong>{warnings && warnings.length > 0 ? warnings.length.toString() : '0'}</strong>
          </li>
        </ul>

        {warnings && warnings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {warnings.map((warning) => (
              <div key={warning} style={{ marginBottom: 8, color: '#fed7aa', background: 'rgba(127,29,29,0.18)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
