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
        }}>
          Choose Method
        </label>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Click to switch instantly
        </span>
      </div>

      <div 
        role="radiogroup"
        aria-label="Restoration Method"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.35fr 1fr',
          gap: '12px',
          alignItems: 'stretch'
        }}
      >
        {/* Left: Classical */}
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
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'classical' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--border-subtle)',
            backgroundColor: selectedMode === 'classical' 
              ? 'var(--accent-subtle)' 
              : 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} color={selectedMode === 'classical' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Classical
                </span>
              </div>
              {selectedMode === 'classical' && (
                <CheckCircle2 size={15} color="var(--accent-primary)" />
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Fast and sharp. Best for moderately dark photos.
            </p>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            ~40 ms
          </div>
        </button>

        {/* Center: Hybrid (Dominant / Recommended) */}
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
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'hybrid' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--accent-border)',
            backgroundColor: 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            boxShadow: selectedMode === 'hybrid' ? 'var(--shadow-md)' : 'none',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Hybrid Mode
                </span>
              </div>
              <span className="badge badge-brand" style={{ fontSize: '11px', fontWeight: 600 }}>
                Recommended
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Best of both worlds. Uses AI to lift dark areas while keeping edges crisp.
            </p>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge badge-success" style={{ fontSize: '11px' }}>
              Highest Quality
            </span>
            {selectedMode === 'hybrid' && (
              <CheckCircle2 size={16} color="var(--accent-primary)" />
            )}
          </div>
        </button>

        {/* Right: Deep Learning */}
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
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            border: selectedMode === 'deep' 
              ? '2px solid var(--accent-primary)' 
              : '1px solid var(--border-subtle)',
            backgroundColor: selectedMode === 'deep' 
              ? 'var(--accent-subtle)' 
              : 'var(--bg-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} color={selectedMode === 'deep' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Deep Learning
                </span>
              </div>
              {selectedMode === 'deep' && (
                <CheckCircle2 size={15} color="var(--accent-primary)" />
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              AI neural network. Pulls details out of deep shadows.
            </p>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            ~1.0 s
          </div>
        </button>
      </div>
    </div>
  );
};
