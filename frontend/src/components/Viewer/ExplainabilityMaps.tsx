import React, { useState } from 'react';
import { Layers, Info } from 'lucide-react';

interface ExplainabilityMapsProps {
  originalImage: string;
  fusionMap?: string | null;
  disagreementMap?: string | null;
  changeMap?: string | null;
}

type MapType = 'fusion' | 'disagreement' | 'change';

export const ExplainabilityMaps: React.FC<ExplainabilityMapsProps> = ({
  originalImage,
  fusionMap,
  disagreementMap,
  changeMap,
}) => {
  const [activeMap, setActiveMap] = useState<MapType>('fusion');
  const [opacity, setOpacity] = useState<number>(85); // 0 to 100

  const getMapImage = (): string | null => {
    switch (activeMap) {
      case 'fusion':
        return fusionMap || null;
      case 'disagreement':
        return disagreementMap || null;
      case 'change':
        return changeMap || null;
    }
  };

  const getMapDetails = () => {
    switch (activeMap) {
      case 'fusion':
        return {
          title: 'Fusion Weight Map (W)',
          subtitle: 'Spatial blending coefficient matrix computed by Illumination-Adaptive Attention Fusion (IAAF)',
          explanation: 'W determines the local confidence weighting: Dark values (W → 0) indicate regions where Classical CV dominates to preserve edges and fine textures, while bright values (W → 1) indicate deep learning dominance for smooth shadow recovery.',
          colorbarLeft: '0.0 (Classical CV Dominates)',
          colorbarRight: '1.0 (Deep Learning Dominates)',
          colorbarGradient: 'linear-gradient(to right, #000000 0%, #7C3AED 50%, #F59E0B 80%, #FFFFFF 100%)',
        };
      case 'disagreement':
        return {
          title: 'Branch Disagreement Map (|I_Deep - I_Classical|)',
          subtitle: 'Absolute photometric distance between the independent Classical and Deep Learning predictions',
          explanation: 'Highlights regions where the physics-based Retinex model and deep neural network diverge in tone mapping or texture synthesis. Areas with high disagreement trigger bounded quality guardian verification.',
          colorbarLeft: '0.0 (Zero Disagreement)',
          colorbarRight: '1.0 (High Disagreement)',
          colorbarGradient: 'linear-gradient(to right, #0F172A 0%, #1E40AF 35%, #DC2626 75%, #FEF08A 100%)',
        };
      case 'change':
        return {
          title: 'Pixel Change Heatmap (|I_Restored - I_Original|)',
          subtitle: 'Per-pixel absolute dynamic range delta between the restored output and the raw dark capture',
          explanation: 'Reveals the exact spatial distribution of energy injection across the frame. High values correspond to deep shadow areas that received maximum non-linear photon amplification.',
          colorbarLeft: '0 (Unchanged)',
          colorbarRight: '255 (Maximum Amplification)',
          colorbarGradient: 'linear-gradient(to right, #440154 0%, #31688E 35%, #35B779 70%, #FDE725 100%)',
        };
    }
  };

  const mapData = getMapDetails();
  const currentMapImg = getMapImage();

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Explainability Diagnostic Maps
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Inspect spatial attention matrices, inter-branch divergence, and photon injection heatmaps.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-surface-subtle)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: '2px'
        }}>
          {[
            { id: 'fusion' as MapType, label: 'Fusion Weight (W)' },
            { id: 'disagreement' as MapType, label: 'Branch Disagreement' },
            { id: 'change' as MapType, label: 'Pixel Change Heatmap' },
          ].map((tab) => {
            const active = activeMap === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMap(tab.id)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Viewer + Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Map Canvas / Stage */}
        <div style={{
          height: '360px',
          backgroundColor: '#0F172A',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Base image */}
          <img
            src={originalImage}
            alt="Original background"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              position: 'absolute'
            }}
          />

          {/* Diagnostic Map Overlay */}
          {currentMapImg ? (
            <img
              src={currentMapImg}
              alt={mapData.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                position: 'absolute',
                opacity: opacity / 100,
                transition: 'opacity 0.1s ease-out'
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              color: '#94A3B8',
              fontSize: '13px',
              backgroundColor: 'rgba(15,23,42,0.85)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)'
            }}>
              Map diagnostic not generated for current execution mode.
            </div>
          )}

          <span className="badge badge-neutral" style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(15,23,42,0.85)',
            color: '#FFFFFF',
            border: 'none'
          }}>
            {mapData.title} • {opacity}% Opacity
          </span>
        </div>

        {/* Diagnostic Metadata & Colorbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {mapData.title}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {mapData.subtitle}
            </p>
          </div>

          {/* Overlay Opacity Slider */}
          <div style={{
            padding: '14px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Map Overlay Opacity
              </span>
              <span className="num" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {opacity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--accent-primary)'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              marginTop: '4px'
            }}>
              <span>0% (Original only)</span>
              <span>50% (Blend)</span>
              <span>100% (Map only)</span>
            </div>
          </div>

          {/* Calibrated Colorbar */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Calibrated Color Spectrum
            </div>
            <div style={{
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: mapData.colorbarGradient,
              border: '1px solid var(--border-subtle)',
              marginBottom: '6px'
            }} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              <span>{mapData.colorbarLeft}</span>
              <span>{mapData.colorbarRight}</span>
            </div>
          </div>

          {/* How to Read This Callout */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--accent-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            gap: '10px'
          }}>
            <Info size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '2px' }}>
                How to read this visualization
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {mapData.explanation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
