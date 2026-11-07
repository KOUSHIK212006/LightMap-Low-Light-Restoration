import React, { useState } from 'react';
import { GitBranch, Sliders, Cpu, Sparkles } from 'lucide-react';
import type { ClassicalStage, EnhancementResponse, RestorationMode } from '../../types/image';

interface PipelineSectionProps {
  response: EnhancementResponse;
  originalImage?: string;
  selectedMode: RestorationMode;
  onSelectStageImage?: (imageUrl: string) => void;
}

export const PipelineSection: React.FC<PipelineSectionProps> = ({
  response,
  selectedMode,
  onSelectStageImage,
}) => {
  const [activeTab, setActiveTab] = useState<RestorationMode>(selectedMode || 'hybrid');
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  const stages: ClassicalStage[] = response.classical_stages || [];

  return (
    <section id="pipeline" style={{ padding: '32px 0' }}>
      <div className="content-wrapper">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={20} color="var(--accent-primary)" />
            <h2 className="section-title">
              Restoration Pipeline Architecture
            </h2>
          </div>
          <p className="section-description">
            Complete transparency into how photons, illumination fields, and spatial priors were decomposed and reconstructed.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('classical')}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'classical' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              backgroundColor: activeTab === 'classical' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color={activeTab === 'classical' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Classical CV Stages
              </span>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              {stages.length || 5} steps
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hybrid')}
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'hybrid' ? '2px solid var(--accent-primary)' : '1px solid var(--accent-border)',
              backgroundColor: activeTab === 'hybrid' ? 'var(--bg-surface)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'hybrid' ? 'var(--shadow-sm)' : 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                LightMap Hybrid (IAAF Flow)
              </span>
            </div>
            <span className="badge badge-brand" style={{ fontSize: '11px' }}>
              Adaptive Fusion
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deep')}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'deep' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              backgroundColor: activeTab === 'deep' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} color={activeTab === 'deep' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Deep Learning Model
              </span>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Retinexformer
            </span>
          </button>
        </div>

        {/* TAB 1: CLASSICAL CV STAGES */}
        {activeTab === 'classical' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Step-by-Step Classical Pipeline Decomposition
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Each stage applies an explicit computer vision operation. Click any thumbnail below to view its isolated output.
              </p>
            </div>

            {stages.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${stages.length}, minmax(140px, 1fr))`,
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px'
              }}>
                {stages.map((st, idx) => {
                  const isSelected = selectedStageIdx === idx;
                  return (
                    <div
                      key={st.name}
                      onClick={() => {
                        setSelectedStageIdx(idx);
                        if (onSelectStageImage) onSelectStageImage(st.image);
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{
                          height: '90px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px'
                        }}>
                          <img
                            src={st.image}
                            alt={st.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {st.name}
                          </span>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3, marginBottom: '6px' }}>
                          {st.description}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Luma: <strong className="num" style={{ color: 'var(--text-primary)' }}>{st.metrics?.mean_brightness ?? '—'}</strong> • Contrast: <strong className="num" style={{ color: 'var(--text-primary)' }}>{st.metrics?.contrast_score ?? '—'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Intermediate classical stage diagnostics will be generated after triggering restoration.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HYBRID FLOW (SVG + FORMULA) */}
        {activeTab === 'hybrid' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Illumination-Adaptive Attention Fusion (IAAF) Execution Graph
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Parallel dual-branch architecture combining physical reflectance decomposition with deep attention and bounded verification.
              </p>
            </div>

            {/* Clean SVG Flow Diagram */}
            <div style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'center',
              overflowX: 'auto'
            }}>
              <svg width="840" height="220" viewBox="0 0 840 220" style={{ maxWidth: '100%', height: 'auto' }}>
                {/* Input Node */}
                <rect x="20" y="75" width="120" height="70" rx="8" fill="#FFFFFF" stroke="#CDD5DF" strokeWidth="1.5" />
                <text x="80" y="105" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A2433">Input Capture</text>
                <text x="80" y="125" textAnchor="middle" fontSize="10" fill="#5B6778">Raw Underexposed</text>

                {/* Branches Arrow split */}
                <path d="M 140 110 L 190 110 L 190 45 L 230 45" fill="none" stroke="#1F4FD8" strokeWidth="1.5" />
                <path d="M 140 110 L 190 110 L 190 175 L 230 175" fill="none" stroke="#1F4FD8" strokeWidth="1.5" />

                {/* Classical Branch Node */}
                <rect x="230" y="15" width="150" height="60" rx="8" fill="#FFFFFF" stroke="#CDD5DF" strokeWidth="1.5" />
                <text x="305" y="42" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A2433">Classical CV (I_C)</text>
                <text x="305" y="58" textAnchor="middle" fontSize="10" fill="#5B6778">Retinex + CLAHE + Filter</text>

                {/* Deep Branch Node */}
                <rect x="230" y="145" width="150" height="60" rx="8" fill="#FFFFFF" stroke="#CDD5DF" strokeWidth="1.5" />
                <text x="305" y="172" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A2433">Deep Learning (I_D)</text>
                <text x="305" y="188" textAnchor="middle" fontSize="10" fill="#5B6778">Retinexformer (IG-MSA)</text>

                {/* Branches merging into Fusion Node */}
                <path d="M 380 45 L 430 45 L 430 110 L 450 110" fill="none" stroke="#1F4FD8" strokeWidth="1.5" />
                <path d="M 380 175 L 430 175 L 430 110 L 450 110" fill="none" stroke="#1F4FD8" strokeWidth="1.5" />

                {/* IAAF Attention Fusion Node */}
                <rect x="450" y="70" width="150" height="80" rx="8" fill="#EBF1FF" stroke="#1F4FD8" strokeWidth="2" />
                <text x="525" y="102" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F4FD8">IAAF Attention</text>
                <text x="525" y="120" textAnchor="middle" fontSize="10" fill="#1A2433">Weight Matrix W(x,y)</text>
                <text x="525" y="135" textAnchor="middle" fontSize="9" fill="#5B6778">I_H = W*I_D + (1-W)*I_C</text>

                {/* Quality Guardian Node */}
                <path d="M 600 110 L 640 110" fill="none" stroke="#1F4FD8" strokeWidth="1.5" />
                <rect x="640" y="75" width="160" height="70" rx="8" fill="#FFFFFF" stroke="#1E8E5A" strokeWidth="1.5" />
                <text x="720" y="105" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1E8E5A">Quality Guardian</text>
                <text x="720" y="122" textAnchor="middle" fontSize="10" fill="#5B6778">Bounded Correction Loop</text>
                <text x="720" y="136" textAnchor="middle" fontSize="9" fill="#1E8E5A">Clip &amp; Noise Constraint</text>
              </svg>
            </div>

            {/* Formula Presentation */}
            <div style={{
              marginTop: '16px',
              padding: '16px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Adaptive Fusion Governing Equation
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: 'serif',
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.05em',
                  marginTop: '4px'
                }}>
                  I<sub>H</sub>(x, y) = W(x, y) · I<sub>D</sub>(x, y) + [1 - W(x, y)] · I<sub>C</sub>(x, y)
                </div>
              </div>

              <div style={{ maxWidth: '440px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Where <strong>W(x, y) ∈ [0, 1]</strong> is the spatially continuous weight field calculated from local luminance gradient, dark-channel prior, and high-frequency edge variance.
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEEP LEARNING MODEL SPECIFICATION */}
        {activeTab === 'deep' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Deep Learning Model Specification: Retinexformer
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                State-of-the-art low-light transformer utilizing Illumination-Guided Multi-Head Self-Attention.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Architecture</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Retinexformer</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>One-stage Retinex-based Transformer</div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pretrained Checkpoint</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>LOL_v2_real.pth</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Trained on real DSLR low-light pairs</div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Attention Mechanism</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>IG-MSA</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Illumination-Guided Multi-Head Self-Attention</div>
              </div>
            </div>

            <div style={{
              padding: '14px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              Retinexformer frames the corruption in low-light imaging as an illumination-distortion problem. Instead of blindly passing dark pixels through conventional vision transformers, it extracts an explicit illumination prior that guides cross-scale self-attention tokens to reconstruct reflectance without noise blow-up.
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
