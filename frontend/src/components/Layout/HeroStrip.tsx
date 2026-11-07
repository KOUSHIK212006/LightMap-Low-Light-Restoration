import React from 'react';
import { ScanLine, Eye, ShieldCheck, ArrowDown } from 'lucide-react';

interface HeroStripProps {
  onUploadClick: () => void;
}

export const HeroStrip: React.FC<HeroStripProps> = ({ onUploadClick }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '32px 0 24px 0'
    }}>
      <div className="content-wrapper">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px'
            }}>
              Explainable Low-Light Image Restoration
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              maxWidth: '680px'
            }}>
              Spatially adaptive hybrid fusion integrating classical multi-scale Retinex decomposition with deep transformer inference and automated quality constraint enforcement.
            </p>
          </div>

          <div>
            <button 
              onClick={onUploadClick}
              className="btn-primary"
            >
              <span>Upload image</span>
              <ArrowDown size={15} />
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ScanLine size={16} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Region-aware restoration
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Eye size={16} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Fully explainable outputs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              color: 'var(--status-success)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ShieldCheck size={16} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Quality-verified results
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
