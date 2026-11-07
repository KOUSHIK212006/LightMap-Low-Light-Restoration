import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Download, 
  FileText, 
  Sliders, 
  Columns, 
  Eye 
} from 'lucide-react';
import type { EnhancementResponse, RestorationMode } from '../../types/image';

interface CompareViewerProps {
  originalImage: string;
  restoredImage: string;
  selectedMode: RestorationMode;
  response: EnhancementResponse;
  onRoiSelect?: (roi: { x: number; y: number; width: number; height: number }) => void;
  roi?: { x: number; y: number; width: number; height: number };
}

type ViewMode = 'slider' | 'side-by-side' | 'original' | 'restored';

export const CompareViewer: React.FC<CompareViewerProps> = ({
  originalImage,
  restoredImage,
  selectedMode,
  response,
  onRoiSelect,
  roi,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom((z) => Math.min(5, Math.max(0.5, Math.round((z + delta) * 100) / 100)));
  };

  // Pan mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingSlider.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingSlider.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
      return;
    }
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    isDraggingSlider.current = false;
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Click on image to move ROI
  const handleImageClick = (e: React.MouseEvent) => {
    if (!onRoiSelect || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;
    const roiSize = 80;
    onRoiSelect({
      x: Math.max(0, Math.round(clickX - roiSize / 2)),
      y: Math.max(0, Math.round(clickY - roiSize / 2)),
      width: roiSize,
      height: roiSize,
    });
  };

  // Download actions
  const handleDownloadImage = () => {
    const a = document.createElement('a');
    a.href = restoredImage;
    a.download = `lightmap_restored_${selectedMode}_${Date.now()}.png`;
    a.click();
  };

  const handleDownloadReport = () => {
    const reportData = {
      project: 'LightMap Low-Light Image Restoration',
      timestamp: new Date().toISOString(),
      mode: selectedMode,
      profile: response.profile,
      quality_guardian: response.quality_report,
      timings: response.timings || response.timing,
      method_metrics: response.method_metrics,
      change_statistics: response.change_stats,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lightmap_report_${selectedMode}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      {/* Top Toolbar */}
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
        {/* View Mode Segmented Controls */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-surface-subtle)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: '2px'
        }}>
          {[
            { id: 'slider' as ViewMode, label: 'Slider', icon: Sliders },
            { id: 'side-by-side' as ViewMode, label: 'Side-by-side', icon: Columns },
            { id: 'original' as ViewMode, label: 'Original', icon: Eye },
            { id: 'restored' as ViewMode, label: 'Restored', icon: Eye },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
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
                <Icon size={14} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Zoom & Pan Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={handleZoomOut}
              className="btn-ghost"
              style={{ padding: '4px 8px' }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              minWidth: '48px',
              textAlign: 'center'
            }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="btn-ghost"
              style={{ padding: '4px 8px' }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleFit}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px' }}
            title="Fit to view"
          >
            <Maximize2 size={13} style={{ marginRight: '4px' }} />
            Fit
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px' }}
            title="Reset to 100%"
          >
            <RotateCcw size={13} style={{ marginRight: '4px' }} />
            100%
          </button>
        </div>

        {/* Download Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <FileText size={14} style={{ marginRight: '6px' }} />
            Download report
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            className="btn-primary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Download size={14} style={{ marginRight: '6px' }} />
            Download restored image
          </button>
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onClick={handleImageClick}
        style={{
          width: '100%',
          height: '520px',
          backgroundColor: '#0F172A',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'crosshair',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* SLIDER MODE */}
          {viewMode === 'slider' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Restored Base */}
              <img
                src={restoredImage}
                alt="Restored output"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  pointerEvents: 'none'
                }}
              />

              {/* Original Layer clipped by slider */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <img
                  src={originalImage}
                  alt="Original input"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>

              {/* Interactive Split Divider Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  isDraggingSlider.current = true;
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: '3px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                  cursor: 'ew-resize',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--accent-primary)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'ew-resize',
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  fontWeight: 700
                }}>
                  ⇄
                </div>
              </div>
            </div>
          )}

          {/* SIDE-BY-SIDE MODE */}
          {viewMode === 'side-by-side' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              height: '100%',
              padding: '12px'
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={originalImage}
                  alt="Original"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
                <span className="badge badge-neutral" style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  Original
                </span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={restoredImage}
                  alt="Restored"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
                <span className="badge badge-brand" style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  Restored ({selectedMode.toUpperCase()})
                </span>
              </div>
            </div>
          )}

          {/* ORIGINAL ONLY */}
          {viewMode === 'original' && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <img
                src={originalImage}
                alt="Original"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              <span className="badge badge-neutral" style={{ position: 'absolute', top: '12px', left: '12px' }}>
                Original Input Capture
              </span>
            </div>
          )}

          {/* RESTORED ONLY */}
          {viewMode === 'restored' && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <img
                src={restoredImage}
                alt="Restored"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              <span className="badge badge-brand" style={{ position: 'absolute', top: '12px', left: '12px' }}>
                Restored Output ({selectedMode.toUpperCase()})
              </span>
            </div>
          )}

          {/* Highlight ROI Box if active */}
          {roi && viewMode === 'slider' && (
            <div style={{
              position: 'absolute',
              left: `${roi.x}px`,
              top: `${roi.y}px`,
              width: `${roi.width}px`,
              height: `${roi.height}px`,
              border: '2px solid #E2E8F0',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.8), 0 0 10px rgba(31, 79, 216, 0.6)',
              pointerEvents: 'none',
              zIndex: 30
            }}>
              <span style={{
                position: 'absolute',
                top: '-18px',
                left: '0',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontSize: '10px',
                padding: '1px 4px',
                borderRadius: '2px',
                fontWeight: 600
              }}>
                ROI Inspector
              </span>
            </div>
          )}
        </div>

        {/* Labels overlay */}
        {viewMode === 'slider' && (
          <>
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 500,
              pointerEvents: 'none'
            }}>
              Original Capture
            </div>
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 500,
              pointerEvents: 'none'
            }}>
              Restored ({selectedMode.toUpperCase()})
            </div>
          </>
        )}
      </div>

      <div style={{
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <span>Drag slider to compare • Mouse wheel to zoom • Drag to pan • Click image to relocate Region Inspector</span>
        <span>Rendered at {Math.round(zoom * 100)}% scale</span>
      </div>
    </div>
  );
};
