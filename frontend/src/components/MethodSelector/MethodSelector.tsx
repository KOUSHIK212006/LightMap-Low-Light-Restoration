import React from 'react';
import { Sliders, Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import type { RestorationMode } from '../../types/image';

interface MethodSelectorProps {
  selectedMode: RestorationMode;
  onSelectMode: (mode: RestorationMode) => void;
  disabled?: boolean;
}

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <label style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          Restoration Architecture
        </label>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Select method to render below
        </span>
      </div>

      <div 
        role="radiogroup"
        aria-label="Restoration Architecture Selection"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: '12px',
          alignItems: 'stretch'
        }}
      >
        {/* Left Card: Classical CV */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'classical'}
          disabled={disabled}
          onClick={() => onSelectMode('classical')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'classical' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--border-subtle)',
            backgroundColor: selectedMode === 'classical' 
              ? 'var(--accent-subtle)' 
              : 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            boxShadow: selectedMode === 'classical' ? 'var(--shadow-sm)' : 'none',
            position: 'relative'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{
                color: selectedMode === 'classical' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sliders size={18} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Classical CV
                </span>
              </div>
              {selectedMode === 'classical' && (
                <CheckCircle2 size={16} color="var(--accent-primary)" />
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              CLAHE, Retinex, Gamma, Bilateral filter
            </p>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Deterministic • ~38ms
            </span>
          </div>
        </button>

        {/* Center Card: LightMap Adaptive Hybrid (Dominant / Recommended) */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'hybrid'}
          disabled={disabled}
          onClick={() => onSelectMode('hybrid')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'hybrid' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--accent-border)',
            backgroundColor: selectedMode === 'hybrid' 
              ? 'var(--bg-surface)' 
              : 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            boxShadow: selectedMode === 'hybrid' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            position: 'relative',
            transform: selectedMode === 'hybrid' ? 'scale(1.01)' : 'none',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={20} />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  LightMap Adaptive Hybrid (IAAF)
                </span>
              </div>
              <span className="badge badge-brand" style={{ fontSize: '11px', fontWeight: 600 }}>
                Recommended
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Spatially adaptive fusion of classical and deep outputs using illumination-guided attention weights.
            </p>
          </div>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-success" style={{ fontSize: '11px' }}>
                Highest Perceptual Quality
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Quality Guardian Active
              </span>
            </div>
            {selectedMode === 'hybrid' && (
              <CheckCircle2 size={18} color="var(--accent-primary)" />
            )}
          </div>
        </button>

        {/* Right Card: Deep Learning */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'deep'}
          disabled={disabled}
          onClick={() => onSelectMode('deep')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'deep' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--border-subtle)',
            backgroundColor: selectedMode === 'deep' 
              ? 'var(--accent-subtle)' 
              : 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            boxShadow: selectedMode === 'deep' ? 'var(--shadow-sm)' : 'none',
            position: 'relative'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{
                color: selectedMode === 'deep' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Cpu size={18} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Deep Learning
                </span>
              </div>
              {selectedMode === 'deep' && (
                <CheckCircle2 size={16} color="var(--accent-primary)" />
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Retinexformer (Transformer with IG-MSA)
            </p>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Neural • ~1.05s
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
