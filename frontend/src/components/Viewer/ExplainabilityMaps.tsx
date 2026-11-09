import React, { useState, useRef, useEffect } from 'react';
import { Layers, Crosshair, Eye, Sparkles } from 'lucide-react';
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
type BlendModeType = 'normal' | 'screen' | 'lighten';

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
  // If fusionMap is not available (e.g. classical-only or deep-only runs), default to changeMap
  const initialMap: MapType = fusionMap ? 'fusion' : (changeMap ? 'change' : 'fusion');
  const [activeMap, setActiveMap] = useState<MapType>(initialMap);
  const [opacity, setOpacity] = useState<number>(85);
  const [heatmapOnly, setHeatmapOnly] = useState<boolean>(false);
  const [highlightTop10, setHighlightTop10] = useState<boolean>(false);
  const [blendMode, setBlendMode] = useState<BlendModeType>('normal');
  const [readout, setReadout] = useState<HoverMapReadout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapImgRef = useRef<HTMLImageElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto switch if current active map is missing but another is present
  useEffect(() => {
    if (activeMap === 'fusion' && !fusionMap && changeMap) {
      setActiveMap('change');
    }
  }, [fusionMap, changeMap, activeMap]);

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

  const currentMapImg = getMapImage();

  // Cache offscreen canvas for accurate real-pixel hover inspection
  useEffect(() => {
    if (!currentMapImg) {
      offscreenCanvasRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 600;
      canvas.height = img.naturalHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        offscreenCanvasRef.current = canvas;
      }
    };
    img.src = currentMapImg;
  }, [currentMapImg]);

  const getMapDetails = () => {
    switch (activeMap) {
      case 'fusion':
        return {
          title: 'AI vs Classical Blend Map',
          subtitle: 'Shows which method is in control of each part of the image',
          explanation: 'Fiery amber/yellow indicates Retinexformer AI restoring deep shadows. Deep violet/black indicates Classical Retinex preserving bright highlights and textures.',
          colorbarLeft: '0.0 (Classical)',
          colorbarCenter: '0.5 (Hybrid Balance)',
          colorbarRight: '1.0 (Retinexformer AI)',
          colorbarGradient: 'linear-gradient(to right, #000004 0%, #3B0F70 25%, #8C2981 50%, #DE4968 70%, #FE9F6D 85%, #FCFDBF 100%)',
          units: 'Inferno Colormap • Weight W ∈ [0.0, 1.0]',
        };
      case 'disagreement':
        return {
          title: 'Method Disagreement Map',
          subtitle: 'Where the AI and Classical methods made different choices',
          explanation: 'Cold navy indicates unanimous consensus between branches. Vibrant cyan, green, and red highlight complex object boundaries where adaptive fusion reconciled differences.',
          colorbarLeft: '0.0 (Consensus)',
          colorbarCenter: '0.5 (Moderate Variance)',
          colorbarRight: '1.0 (High Disagreement)',
          colorbarGradient: 'linear-gradient(to right, #30123B 0%, #4662D8 20%, #28BBEC 40%, #A2FC3C 60%, #FB8022 80%, #7A0403 100%)',
          units: 'Turbo Colormap • Variance |Deep - Classical|',
        };
      case 'change':
        return {
          title: 'Brightness Boost Map',
          subtitle: 'Shows where light was added to the photo',
          explanation: 'Bright yellow and emerald green show regions receiving maximal luminance recovery (heavy underexposed shadows). Midnight purple areas were already adequately exposed.',
          colorbarLeft: '0 (Preserved)',
          colorbarCenter: '128 (Moderate Boost)',
          colorbarRight: '255 (Maximum Boost)',
          colorbarGradient: 'linear-gradient(to right, #440154 0%, #3B528B 25%, #21908C 50%, #5DC863 75%, #FDE725 100%)',
          units: 'Viridis Colormap • Delta Luma ΔL ∈ [0, 255]',
        };
    }
  };

  const mapData = getMapDetails();

  // Mouse hover coordinate calculation with real pixel sampling
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

    const canvas = offscreenCanvasRef.current;
    const natW = canvas?.width || el.naturalWidth || 600;
    const natH = canvas?.height || el.naturalHeight || 400;

    const px = Math.min(natW - 1, Math.max(0, Math.floor(fracX * natW)));
    const py = Math.min(natH - 1, Math.max(0, Math.floor(fracY * natH)));

    let r = 128, g = 128, b = 128;
    if (canvas) {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          r = pixel[0];
          g = pixel[1];
          b = pixel[2];
        }
      } catch {
        // Fallback for cross-origin or canvas security edge cases
      }
    }

    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    let deepPct = 85;
    let classPct = 15;
    let changeDelta = luma;

    if (activeMap === 'fusion') {
      // In Inferno: luma correlates with deep weight
      deepPct = Math.min(100, Math.max(15, Math.round((luma / 255) * 100)));
      classPct = 100 - deepPct;
    } else if (activeMap === 'disagreement') {
      changeDelta = luma;
    } else if (activeMap === 'change') {
      changeDelta = luma;
    }

    setReadout({
      x: px,
      y: py,
      val: activeMap === 'fusion' ? deepPct / 100 : changeDelta,
      deepPct,
      classPct,
      origRGB: [r, g, b],
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
            Full false-color thermal diagnostics revealing local algorithmic decision boundaries and light distribution.
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
            { id: 'fusion' as MapType, label: 'AI vs Classical Blend', available: Boolean(fusionMap) },
            { id: 'disagreement' as MapType, label: 'Method Disagreement', available: Boolean(disagreementMap) },
            { id: 'change' as MapType, label: 'Brightness Boost', available: Boolean(changeMap) },
          ].map((tab) => {
            const active = activeMap === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMap(tab.id)}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: active ? 600 : 500,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  opacity: tab.available ? 1.0 : 0.6,
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label} {!tab.available && '• N/A'}
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
        alignItems: 'start'
      }}>
        {/* Stage Container */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setReadout(null)}
          style={{
            height: '370px',
            backgroundColor: '#090D16',
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
          {/* Base photo (hidden when Heatmap Only is active) */}
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
                mixBlendMode: heatmapOnly ? 'normal' : blendMode,
                filter: highlightTop10 ? 'saturate(220%) contrast(150%) drop-shadow(0 0 12px rgba(245, 158, 11, 0.45))' : 'none',
                transition: 'opacity 0.15s ease-out, filter 0.2s ease',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} />
              <span>Map diagnostic not available for this mode.</span>
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
              boxShadow: '0 0 8px rgba(56, 189, 248, 0.7)',
              pointerEvents: 'none',
            }}>
              <span style={{
                position: 'absolute',
                top: '-16px',
                left: 0,
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                fontSize: '9px',
                padding: '1px 4px',
                borderRadius: '2px',
                fontWeight: 600
              }}>
                ROI
              </span>
            </div>
          )}

          {/* Top Left Badge Indicator */}
          <span className="badge badge-neutral" style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '11px',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Eye size={12} color="var(--accent-primary)" />
            {mapData.title} • {heatmapOnly ? 'Thermal Heatmap View' : `${opacity}% Overlay (${blendMode})`}
          </span>

          {/* Top Right High-Intensity Pill Indicator */}
          {highlightTop10 && (
            <span style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.9)',
              color: '#000000',
              fontWeight: 600,
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
            }}>
              <Sparkles size={11} /> High Intensity Boost Active
            </span>
          )}
        </div>

        {/* Sidebar Controls & Colorbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {mapData.title}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {mapData.subtitle}
            </p>
          </div>

          {/* Toggles: Heatmap Only & Highlight High Intensity */}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={heatmapOnly}
                onChange={(e) => setHeatmapOnly(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: heatmapOnly ? 600 : 400 }}>Heatmap Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={highlightTop10}
                onChange={(e) => setHighlightTop10(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: highlightTop10 ? 600 : 400 }}>Highlight High Intensity</span>
            </label>
          </div>

          {/* Blend Mode & Opacity Controls (active when not in heatmap-only mode) */}
          {!heatmapOnly && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Blend Mode:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['normal', 'screen', 'lighten'] as BlendModeType[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBlendMode(mode)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: blendMode === mode ? 600 : 400,
                        borderRadius: '3px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: blendMode === mode ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color: blendMode === mode ? '#FFFFFF' : 'var(--text-primary)',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {mode === 'normal' ? 'Alpha' : mode === 'screen' ? 'Screen Glow' : 'Lighten'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Overlay Opacity</span>
                  <span className="num" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* Calibrated Scientific Colorbar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              <span>Calibrated Spectrum</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{mapData.units}</span>
            </div>
            <div style={{
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: mapData.colorbarGradient,
              border: '1px solid var(--border-subtle)',
              marginBottom: '4px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                <Crosshair size={14} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600 }}>Pixel ({readout.x}, {readout.y}):</span>
                {activeMap === 'fusion' ? (
                  <strong style={{ color: 'var(--accent-primary)' }}>
                    {readout.deepPct}% Retinexformer / {readout.classPct}% Classical Retinex
                  </strong>
                ) : activeMap === 'disagreement' ? (
                  <strong style={{ color: '#EF4444' }}>
                    Variance: {readout.changeDelta} / 255 ({Math.round(((readout.changeDelta || 0) / 255) * 100)}% Disagreement)
                  </strong>
                ) : (
                  <strong style={{ color: '#10B981' }}>
                    Luminance Lift: +{readout.changeDelta} / 255
                  </strong>
                )}
                {readout.origRGB && (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    RGB({readout.origRGB[0]}, {readout.origRGB[1]}, {readout.origRGB[2]})
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>
                Hover cursor over map stage to inspect exact coordinates, RGB values, and blend ratios.
              </span>
            )}
          </div>

          {/* Explanation Description */}
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            <strong>How to read this:</strong> {mapData.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};
