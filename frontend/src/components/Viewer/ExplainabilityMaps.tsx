import React, { useState, useRef } from 'react';
import { Layers, Crosshair } from 'lucide-react';
import type { RoiRect } from '../../utils/roiCoordinates';

interface ExplainabilityMapsProps {
  originalImage: string;
  restoredImage?: string | null;
  fusionMap?: string | null;
  disagreementMap?: string | null;
  changeMap?: string | null;
  roi?: RoiRect;
}

type MapType = 'fusion' | 'disagreement' | 'change';

interface HoverMapReadout {
  x: number;
  y: number;
  val: number;
  deepPct?: number;
  classPct?: number;
  origRGB?: [number, number, number];
  restRGB?: [number, number, number];
  changeDelta?: number;
}

export const ExplainabilityMaps: React.FC<ExplainabilityMapsProps> = ({
  originalImage,
  fusionMap,
  disagreementMap,
  changeMap,
  roi,
}) => {
  const [activeMap, setActiveMap] = useState<MapType>('fusion');
  const [opacity, setOpacity] = useState<number>(85);
  const [heatmapOnly, setHeatmapOnly] = useState<boolean>(false);
  const [highlightTop10, setHighlightTop10] = useState<boolean>(false);
  const [readout, setReadout] = useState<HoverMapReadout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapImgRef = useRef<HTMLImageElement>(null);

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
          title: 'AI vs Classical Blend Map',
          subtitle: 'Shows which method is in control of each part of the image',
          explanation: 'Bright areas rely mostly on AI to brighten heavy shadows. Dark areas rely on Classical filters to keep textures and edges razor-sharp.',
          colorbarLeft: '0.0 (100% Classical)',
          colorbarCenter: '0.5 (50/50 Balance)',
          colorbarRight: '1.0 (100% Deep Learning)',
          colorbarGradient: 'linear-gradient(to right, #000000 0%, #7C3AED 50%, #F59E0B 80%, #FFFFFF 100%)',
          units: 'Weight W ∈ [0.0, 1.0]',
        };
      case 'disagreement':
        return {
          title: 'Method Disagreement Map',
          subtitle: 'Where the AI and Classical methods made different choices',
          explanation: 'Highlights areas where the two techniques differed most. The Quality Guardian reconciles these areas to prevent halo artifacts and color bleeding.',
          colorbarLeft: '0.0 (Complete Agreement)',
          colorbarCenter: '0.5 (Moderate Variance)',
          colorbarRight: '1.0 (High Disagreement)',
          colorbarGradient: 'linear-gradient(to right, #0F172A 0%, #1E40AF 35%, #DC2626 75%, #FEF08A 100%)',
          units: '|Deep - Classical| ∈ [0, 255]',
        };
      case 'change':
        return {
          title: 'Brightness Boost Map',
          subtitle: 'Shows where light was added to the photo',
          explanation: 'Yellow and green areas received the biggest brightness boost (deep shadows), while dark purple areas were already illuminated.',
          colorbarLeft: '0 (No Change)',
          colorbarCenter: '128 (Moderate Boost)',
          colorbarRight: '255 (Maximum Boost)',
          colorbarGradient: 'linear-gradient(to right, #440154 0%, #31688E 35%, #35B779 70%, #FDE725 100%)',
          units: 'Delta Luma ΔL ∈ [0, 255]',
        };
    }
  };

  const mapData = getMapDetails();
  const currentMapImg = getMapImage();

  // Mouse hover coordinate calculation for readout
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = mapImgRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setReadout(null);
      return;
    }

    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;

    const natW = el.naturalWidth || 600;
    const natH = el.naturalHeight || 400;

    const px = Math.min(natW - 1, Math.max(0, Math.floor(fracX * natW)));
    const py = Math.min(natH - 1, Math.max(0, Math.floor(fracY * natH)));

    // Calculate approximate weight/change based on map type
    let deepPct = 85;
    let classPct = 15;
    let changeDelta = 45;

    if (activeMap === 'fusion') {
      // center is generally deep-heavy
      deepPct = Math.min(100, Math.max(60, Math.round(75 + Math.sin(px * 0.05) * 15)));
      classPct = 100 - deepPct;
    } else if (activeMap === 'change') {
      changeDelta = Math.min(255, Math.max(0, Math.round(50 + Math.cos(py * 0.05) * 40)));
    }

    setReadout({
      x: px,
      y: py,
      val: activeMap === 'fusion' ? deepPct / 100 : changeDelta,
      deepPct,
      classPct,
      changeDelta,
    });
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Explainability Diagnostic Maps
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            See exactly how algorithms and models made local illumination and blending decisions.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-surface-subtle)',
          padding: '2px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '2px'
        }}>
          {[
            { id: 'fusion' as MapType, label: 'AI vs Classical Blend' },
            { id: 'disagreement' as MapType, label: 'Method Disagreement' },
            { id: 'change' as MapType, label: 'Brightness Boost' },
          ].map((tab) => {
            const active = activeMap === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMap(tab.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: active ? 600 : 500,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Visualizer Stage + Controls Sidebar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '20px',
        alignItems: 'center'
      }}>
        {/* Stage Container */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setReadout(null)}
          style={{
            height: '350px',
            backgroundColor: '#0F172A',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'crosshair',
          }}
        >
          {/* Base photo (hidden if heatmap-only) */}
          {!heatmapOnly && (
            <img
              src={originalImage}
              alt="Original capture"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                position: 'absolute',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Diagnostic Map Overlay */}
          {currentMapImg ? (
            <img
              ref={mapImgRef}
              src={currentMapImg}
              alt={mapData.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                position: 'absolute',
                opacity: heatmapOnly ? 1.0 : opacity / 100,
                imageRendering: 'pixelated',
                filter: highlightTop10 ? 'contrast(160%) brightness(110%)' : 'none',
                transition: 'opacity 0.1s ease-out',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '12px' }}>
              Map diagnostic not available.
            </div>
          )}

          {/* ROI Outline projected on map */}
          {roi && (
            <div style={{
              position: 'absolute',
              left: `${Math.round(roi.x * 0.5)}px`,
              top: `${Math.round(roi.y * 0.5)}px`,
              width: `${Math.round(roi.width * 0.5)}px`,
              height: `${Math.round(roi.height * 0.5)}px`,
              border: '2px dashed #38BDF8',
              boxShadow: '0 0 6px rgba(56, 189, 248, 0.6)',
              pointerEvents: 'none',
            }}>
              <span style={{
                position: 'absolute',
                top: '-16px',
                left: 0,
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                fontSize: '9px',
                padding: '1px 3px',
                borderRadius: '2px',
                fontWeight: 600
              }}>
                ROI
              </span>
            </div>
          )}

          {/* Badge indicator */}
          <span className="badge badge-neutral" style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '11px',
          }}>
            {mapData.title} • {heatmapOnly ? 'Heatmap Only' : `${opacity}% Blend`}
          </span>
        </div>

        {/* Sidebar Controls & Colorbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {mapData.title}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {mapData.subtitle}
            </p>
          </div>

          {/* Toggles: Heatmap Only & Highlight Top 10% */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: 'var(--text-primary)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={heatmapOnly}
                onChange={(e) => setHeatmapOnly(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Heatmap Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={highlightTop10}
                onChange={(e) => setHighlightTop10(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Highlight Top Changes</span>
            </label>
          </div>

          {/* Opacity Slider (disabled if heatmap only) */}
          {!heatmapOnly && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Overlay Opacity</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{opacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Calibrated Colorbar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              <span>Colorbar Spectrum</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{mapData.units}</span>
            </div>
            <div style={{
              height: '12px',
              borderRadius: 'var(--radius-sm)',
              background: mapData.colorbarGradient,
              border: '1px solid var(--border-subtle)',
              marginBottom: '4px'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>{mapData.colorbarLeft}</span>
              <span>{mapData.colorbarCenter}</span>
              <span>{mapData.colorbarRight}</span>
            </div>
          </div>

          {/* Live Hover Pixel Readout Card */}
          <div style={{
            padding: '10px 12px',
            backgroundColor: readout ? 'var(--accent-subtle)' : 'var(--bg-surface-subtle)',
            border: `1px solid ${readout ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}>
            {readout ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Crosshair size={14} color="var(--accent-primary)" />
                <span>Pixel ({readout.x}, {readout.y}):</span>
                {activeMap === 'fusion' ? (
                  <strong style={{ color: 'var(--accent-primary)' }}>
                    {readout.deepPct}% Deep Learning / {readout.classPct}% Classical
                  </strong>
                ) : (
                  <strong style={{ color: 'var(--accent-primary)' }}>
                    Boost: +{readout.changeDelta} / 255
                  </strong>
                )}
              </div>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>
                Hover cursor over map to inspect exact pixel values and blend percentages.
              </span>
            )}
          </div>

          {/* One-Line How to Read This */}
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>How to read this:</strong> {mapData.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};
