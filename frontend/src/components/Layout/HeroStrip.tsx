import React from 'react';
import { Sparkles, Shield, Zap } from 'lucide-react';

interface HeroStripProps {
  onUploadClick: () => void;
}

export const HeroStrip: React.FC<HeroStripProps> = ({ onUploadClick }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '24px 0 20px 0'
    }}>
      <div className="content-wrapper">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              marginBottom: '4px'
            }}>
              Low-Light Photo Restoration
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              Brighten dark photos, remove camera noise, and restore natural colors with hybrid AI and computer vision.
            </p>
          </div>

          <button 
            type="button"
            onClick={onUploadClick}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Upload a photo
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Zap size={15} color="var(--accent-primary)" />
            <span>Fast processing</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Sparkles size={15} color="var(--accent-primary)" />
            <span>AI shadow enhancement</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--status-success)' }}>
            <Shield size={15} color="var(--status-success)" />
            <span>Quality-checked outputs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
