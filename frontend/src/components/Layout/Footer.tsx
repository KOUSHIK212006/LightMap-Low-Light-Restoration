import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      padding: '20px 0',
      marginTop: 'auto'
    }}>
      <div className="content-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          LightMap • Robust Low-Light Image Restoration and Enhancement (Problem ID: P1) • 2026
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)'
        }}>
          FastAPI + Retinexformer + Classical CV + React Enterprise Suite
        </div>
      </div>
    </footer>
  );
};
