import React, { useEffect, useState } from 'react';
import { healthCheck } from '../../services/api';

interface NavbarProps {
  activeTab: 'workspace' | 'guide';
  onSelectTab: (tab: 'workspace' | 'guide') => void;
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
        height: '60px'
      }}>
        {/* Brand */}
        <div 
          onClick={() => onSelectTab('workspace')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '14px'
          }}>
            LM
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              LightMap
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
              Photo Restoration
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onSelectTab('workspace')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'workspace' ? 600 : 500,
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'workspace' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'workspace' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Workspace
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('guide')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'guide' ? 600 : 500,
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'guide' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'guide' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            User Guide
          </button>

          <div style={{
            height: '16px',
            width: '1px',
            backgroundColor: 'var(--border-subtle)',
            margin: '0 8px'
          }} />

          {/* Status Dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline === true ? 'var(--status-success)' : isOnline === false ? 'var(--status-error)' : 'var(--status-warning)'
            }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isOnline === true ? 'Online' : isOnline === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
