import React from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  Sliders, 
  Cpu, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';

interface UserGuideProps {
  onGoToWorkspace: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onGoToWorkspace }) => {
  return (
    <div style={{ padding: '32px 0 64px 0' }}>
      <div className="content-wrapper" style={{ maxWidth: '960px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '8px'
          }}>
            How to Use LightMap
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            A simple, step-by-step guide to restoring low-light photos, choosing the right method, and reading the results.
          </p>
        </div>

        {/* Step-by-Step Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
          {/* Step 1 */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0
              }}>
                1
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Upload a Dark Photo
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  Drag and drop any underexposed PNG or JPG file into the dropzone, or click <strong>"Try sample photo"</strong> to test with a dark indoor room sample.
                </p>
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  Tip: LightMap works best on raw nighttime captures, shadowed indoor rooms, and underexposed smartphone or DSLR photos.
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0
              }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Choose Your Restoration Method
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                  LightMap runs all three methods automatically so you can compare them side-by-side:
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sliders size={16} color="var(--text-secondary)" />
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Classical CV</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Fast (~40ms). Uses Retinex and contrast filters. Great for sharp lines and moderate darkness.
                    </div>
                  </div>

                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--accent-border)',
                    backgroundColor: 'var(--accent-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sparkles size={16} color="var(--accent-primary)" />
                      <strong style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>Hybrid (Recommended)</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Best overall. Uses AI for smooth, noise-free shadows and classical filters for crisp edges.
                    </div>
                  </div>

                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Cpu size={16} color="var(--text-secondary)" />
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Deep Learning</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      AI transformer model. Excels at extreme pitch-black scenes with high camera noise.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0
              }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Inspect the Results
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  Once processing completes, use the built-in diagnostic tools to verify quality:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={16} color="var(--status-success)" />
                    <span><strong>Comparison Slider:</strong> Drag the handle across the image to see before and after. Use mouse wheel to zoom in.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={16} color="var(--status-success)" />
                    <span><strong>8x Pixel Zoom:</strong> Click anywhere on the photo to magnify that area and see exact pixel RGB changes.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--status-success)' }}>
                    <CheckCircle2 size={16} color="var(--status-success)" />
                    <span><strong>Blend &amp; Boost Maps:</strong> See exactly where the AI applied light and where it protected sharp textures.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--status-success)' }}>
                    <CheckCircle2 size={16} color="var(--status-success)" />
                    <span><strong>Quality Guardian:</strong> Verifies that highlights are not blown out and colors remain natural.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0
              }}>
                4
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Download Restored Image
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                  Click <strong>"Download restored image"</strong> to save the full-resolution PNG file to your computer, or click <strong>"Download report"</strong> to save a complete JSON telemetry report of all metrics.
                </p>

                <button
                  type="button"
                  onClick={onGoToWorkspace}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <UploadCloud size={15} style={{ marginRight: '6px' }} />
                  Go to Workspace &amp; Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick FAQ / Tips */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <HelpCircle size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Frequently Asked Questions
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                Which restoration style should I choose?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Use <strong>Natural</strong> for standard room photos and portraits. Use <strong>High Brightness</strong> if the scene is almost pitch black. Use <strong>Keep Details</strong> if the photo contains text, signs, or fine architectural lines.
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                Why does Hybrid mode look better than Deep Learning alone?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Deep learning models are fantastic at brightening shadows without noise, but they can sometimes soften sharp edges. The hybrid mode blends in classical high-frequency edge filters so that text and textures stay razor-sharp while shadows stay clean.
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                What does the Quality Guardian do?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                It acts as an automated safety check. If the restored photo is slightly too bright or clips light bulbs into white blobs, it automatically dampens the brightness and protects highlights before showing you the result.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
