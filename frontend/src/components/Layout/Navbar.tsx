import React, { useEffect, useState } from 'react';
import { healthCheck } from '../../services/api';

interface NavbarProps {
  activeTab: 'workspace' | 'pipeline' | 'guide';
  onSelectTab: (tab: 'workspace' | 'pipeline' | 'guide') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
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
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="content-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px'
      }}>
        {/* Product Name */}
        <div 
          onClick={() => onSelectTab('workspace')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1A2433', letterSpacing: '-0.01em' }}>
            LightMap
          </span>
          <span style={{ fontSize: '13px', color: '#5B6778' }}>
            Low-Light Image Restoration
          </span>
        </div>

        {/* Small Nav + Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onSelectTab('workspace')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: activeTab === 'workspace' ? 600 : 400,
              borderRadius: '6px',
              backgroundColor: activeTab === 'workspace' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'workspace' ? 'var(--accent-primary)' : '#5B6778',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Workspace
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('pipeline')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: activeTab === 'pipeline' ? 600 : 400,
              borderRadius: '6px',
              backgroundColor: activeTab === 'pipeline' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'pipeline' ? 'var(--accent-primary)' : '#5B6778',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            How it works
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('guide')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: activeTab === 'guide' ? 600 : 400,
              borderRadius: '6px',
              backgroundColor: activeTab === 'guide' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'guide' ? 'var(--accent-primary)' : '#5B6778',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            User Guide
          </button>

          <div style={{
            height: '14px',
            width: '1px',
            backgroundColor: 'var(--border-subtle)',
            margin: '0 6px'
          }} />

          {/* Backend Status Dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isOnline === true ? '#1E8E5A' : isOnline === false ? '#C53030' : '#B7791F'
            }} />
            <span style={{ fontSize: '12px', color: '#5B6778' }}>
              {isOnline === true ? 'Connected' : isOnline === false ? 'Offline' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
