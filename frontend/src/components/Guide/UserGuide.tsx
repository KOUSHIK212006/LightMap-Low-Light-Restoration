import React from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  Sliders, 
  Cpu, 
  Search, 
  Layers, 
  HelpCircle
} from 'lucide-react';

interface UserGuideProps {
  onGoToWorkspace: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onGoToWorkspace }) => {
  return (
    <div style={{ padding: '24px 0 60px 0' }}>
      <div className="content-wrapper" style={{ maxWidth: '880px' }}>
        {/* What the tool does in 2 lines */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1A2433',
            letterSpacing: '-0.02em',
            marginBottom: '6px'
          }}>
            LightMap User Guide
          </h1>
          <p style={{ fontSize: '14px', color: '#5B6778', lineHeight: 1.5 }}>
            LightMap restores severely dark, underexposed, or noisy photos taken in dim environments.<br />
            It combines computer vision filters with deep learning to reveal lost details without creating artificial glare.
          </p>
        </div>

        {/* 4 Numbered Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                  Step 1: Choose a dark photo
                </h3>
                <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.45 }}>
                  Drag and drop any low-light photo (PNG or JPG) into the upload box. Or click <strong>"Try a sample image"</strong> to immediately test with a real low-light capture.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
              }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                  Step 2: Choose a restoration method
                </h3>
                <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.45, marginBottom: '10px' }}>
                  Pick one of the three options depending on your photo:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Sliders size={14} color="#5B6778" />
                      <strong style={{ fontSize: '12px', color: '#1A2433' }}>Classical CV</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5B6778' }}>
                      Fast fixed rules. Best for moderately dark photos with fine text.
                    </div>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--accent-subtle)', borderRadius: '4px', border: '1px solid var(--accent-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Sparkles size={14} color="var(--accent-primary)" />
                      <strong style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>Hybrid (Recommended)</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5B6778' }}>
                      Best overall. AI smooths deep shadows; classical keeps edges crisp.
                    </div>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Cpu size={14} color="#5B6778" />
                      <strong style={{ fontSize: '12px', color: '#1A2433' }}>Deep Learning</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5B6778' }}>
                      Neural transformer. Pulls clean shapes out of pitch-black shadows.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                  Step 3: Process the photo
                </h3>
                <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.45 }}>
                  Click <strong>"Restore Image"</strong>. A progress list tracks each stage: analysis, classical filtering, transformer inference, adaptive fusion, and quality check.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
              }}>
                4
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                  Step 4: Compare, inspect, and download
                </h3>
                <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.45, marginBottom: '12px' }}>
                  Use the before/after slider to review lighting improvements, zoom into pixels with the Region Inspector, and click <strong>"Download restored image"</strong> to save your photo.
                </p>

                <button
                  type="button"
                  onClick={onGoToWorkspace}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <UploadCloud size={14} style={{ marginRight: '6px' }} />
                  Go to Workspace
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How to use the Zoom and ROI Tool */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Search size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
              How to Use the Region Inspector (ROI Zoom)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.5, marginBottom: '12px' }}>
            The Region Inspector gives you a magnified, pixel-accurate view of any part of your photo:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '12px', color: '#5B6778', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong>Click anywhere on the photo:</strong> Instantly moves the magnification box to that spot.</li>
            <li><strong>Keyboard nudging:</strong> Use the arrow keys on your keyboard to move the box by 1 pixel (hold Shift for 10 pixels).</li>
            <li><strong>Type exact coordinates:</strong> You can type exact X, Y, Width, and Height values into the input boxes.</li>
            <li><strong>Pixel readout:</strong> Hover your mouse over the magnified panels to view the exact RGB colors and brightness boost for that single pixel.</li>
          </ul>
        </div>

        {/* How to read the Heatmaps */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Layers size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
              How to Read the Diagnostic Heatmaps
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#5B6778', lineHeight: 1.5, marginBottom: '12px' }}>
            The heatmaps visually explain how the algorithms made decisions across your photo:
          </p>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1A2433', marginBottom: '4px' }}>
              Sample Colorbar (Brightness Boost Map)
            </div>
            <div style={{
              height: '12px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #440154 0%, #31688E 35%, #35B779 70%, #FDE725 100%)',
              marginBottom: '4px'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5B6778' }}>
              <span>Dark Purple (0 = No change)</span>
              <span>Green (Moderate lift)</span>
              <span>Bright Yellow (Maximum boost)</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#5B6778' }}>
            <div><strong>AI vs Classical Blend Map:</strong> Shows which method took control. Bright areas were handled by AI (smooth shadows); dark areas were handled by Classical filters (sharp outlines).</div>
            <div><strong>Method Disagreement Map:</strong> Highlights areas where the two methods differed in tone. The Quality Guardian blends them safely to prevent halo artifacts.</div>
            <div><strong>Brightness Boost Map:</strong> Yellow and green areas show where darkness was lifted; purple areas already had sufficient natural light.</div>
          </div>
        </div>

        {/* Short FAQ */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <HelpCircle size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
              Frequently Asked Questions
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                Why does my image look different from the original?
              </div>
              <div style={{ fontSize: '12px', color: '#5B6778', lineHeight: 1.45 }}>
                Cameras compress and hide details in dark shadows. LightMap expands the compressed dynamic range, reveals hidden textures, balances colors, and filters out camera sensor noise.
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                Which method should I pick?
              </div>
              <div style={{ fontSize: '12px', color: '#5B6778', lineHeight: 1.45 }}>
                For almost all photos, select <strong>LightMap Hybrid</strong>. It uses deep learning for shadow recovery and classical filters for edge preservation. If you need instant processing (e.g. video frames), pick <strong>Classical CV</strong> (~40ms).
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                What file types and sizes work?
              </div>
              <div style={{ fontSize: '12px', color: '#5B6778', lineHeight: 1.45 }}>
                LightMap supports standard <strong>PNG</strong>, <strong>JPG</strong>, and <strong>JPEG</strong> formats up to 25MB. Images are processed at their full original resolution.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
