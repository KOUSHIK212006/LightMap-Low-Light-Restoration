import React, { useEffect, useState } from 'react';
import { healthCheck } from '../../services/api';

interface NavbarProps {
  onScrollTo: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onScrollTo }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await healthCheck();
        if (mounted) setIsOnline(res.status === 'ok' || res.status === 'healthy');
      } catch {
        if (mounted) setIsOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="content-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '15px',
            letterSpacing: '-0.02em'
          }}>
            LM
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}>
                LightMap
              </span>
              <span className="badge badge-brand" style={{ fontSize: '11px', padding: '1px 6px' }}>
                v1.0 Enterprise
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              Explainable Low-Light Image Restoration
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button 
            onClick={() => onScrollTo('workspace')}
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            Workspace
          </button>
          <button 
            onClick={() => onScrollTo('pipeline')}
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            Pipeline
          </button>
          <button 
            onClick={() => onScrollTo('analysis')}
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            Analysis
          </button>
          <button 
            onClick={() => onScrollTo('methodology')}
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            Methodology
          </button>

          <div style={{
            height: '20px',
            width: '1px',
            backgroundColor: 'var(--border-subtle)'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline === true ? 'var(--status-success)' : isOnline === false ? 'var(--status-error)' : 'var(--status-warning)'
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}>
              {isOnline === true ? 'Core Engine Connected' : isOnline === false ? 'Engine Offline' : 'Connecting...'}
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
};
