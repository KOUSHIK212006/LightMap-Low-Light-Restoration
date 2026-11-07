import type { RestorationMode } from '../types/image';

interface ModeSelectorProps {
  selectedMode: RestorationMode;
  onChange: (mode: RestorationMode) => void;
}

const modes: Array<{ key: RestorationMode; label: string; description: string }> = [
  {
    key: 'hybrid',
    label: 'Adaptive Hybrid (IAAF)',
    description: 'Combines Classical CV & Retinexformer with illumination weight maps.',
  },
  {
    key: 'classical',
    label: 'Classical CV Only',
    description: 'Fast pipeline with CLAHE, Gamma, Retinex, and bilateral denoising.',
  },
  {
    key: 'deep',
    label: 'Deep Learning Only',
    description: 'End-to-end Retinexformer Transformer model inference.',
  },
];

export default function ModeSelector({ selectedMode, onChange }: ModeSelectorProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <h3>Restoration mode</h3>
      <div className="profile-grid">
        {modes.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`profile-option ${selectedMode === mode.key ? 'active' : ''}`}
            onClick={() => onChange(mode.key)}
          >
            <span className="profile-name">{mode.label}</span>
            <span className="profile-description">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
