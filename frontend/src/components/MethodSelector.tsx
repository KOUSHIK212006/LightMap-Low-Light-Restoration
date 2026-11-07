import type { RestorationMethod } from '../types/image';

interface MethodSelectorProps {
  selectedMethod: RestorationMethod;
  onChange: (method: RestorationMethod) => void;
  disabled?: boolean;
}

const methods: Array<{ key: RestorationMethod; label: string; badge: string; description: string }> = [
  {
    key: 'hybrid',
    label: 'Adaptive Hybrid (IAAF)',
    badge: 'Recommended',
    description: 'Fuses Classical CV with Retinexformer using spatially adaptive illumination weight maps.',
  },
  {
    key: 'classical',
    label: 'Classical CV Pipeline',
    badge: 'Deterministic',
    description: 'Multi-Scale Retinex, adaptive luminance CLAHE, and noise-scaled bilateral denoising.',
  },
  {
    key: 'deep',
    label: 'Deep Learning (Retinexformer)',
    badge: 'Transformer',
    description: 'Pure neural illumination decomposition model (requires pretrained weights).',
  },
];

export default function MethodSelector({ selectedMethod, onChange, disabled = false }: MethodSelectorProps) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Restoration Engine
      </h3>
      <div className="profile-grid">
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`profile-option ${selectedMethod === m.key ? 'active' : ''}`}
            onClick={() => onChange(m.key)}
            disabled={disabled}
            style={{ textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span className="profile-name" style={{ fontWeight: 600 }}>{m.label}</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                background: selectedMethod === m.key ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: selectedMethod === m.key ? '#60a5fa' : 'var(--text-secondary)'
              }}>
                {m.badge}
              </span>
            </div>
            <span className="profile-description" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              {m.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

