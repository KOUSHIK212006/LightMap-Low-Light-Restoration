import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Download, 
  FileText, 
  Sliders, 
  Columns, 
  Eye,
  Search,
  Crosshair,
  Move
} from 'lucide-react';
import type { EnhancementResponse, RestorationMode } from '../../types/image';
import type { RoiRect } from '../../utils/roiCoordinates';

interface CompareViewerProps {
  originalImage: string;
  restoredImage: string;
  selectedMode: RestorationMode;
  response: EnhancementResponse;
  onRoiSelect?: (roi: RoiRect) => void;
  roi?: RoiRect;
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
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage (0 - 100)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Natural image dimensions
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Magnifier Loupe State
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // Stage container dimensions
  const stageRef = useRef<HTMLDivElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const [stageDims, setStageDims] = useState<{ width: number; height: number }>({ width: 900, height: 520 });

  // Dragging states
  const isDraggingSlider = useRef<boolean>(false);
  const isDraggingRoi = useRef<boolean>(false);
  const roiDragStart = useRef<{ mouseX: number; mouseY: number; initX: number; initY: number }>({
    mouseX: 0,
    mouseY: 0,
    initX: 0,
    initY: 0,
  });

  // 1. Measure natural dimensions of the image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (active && img.naturalWidth && img.naturalHeight) {
        setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = originalImage;
    return () => {
      active = false;
    };
  }, [originalImage]);

  // 2. Measure stage dimensions dynamically
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setStageDims({
          width: Math.round(rect.width),
          height: Math.round(rect.height || 520),
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 3. Compute optimal base display dimensions to fit comfortably inside stage
  const frameDims = useMemo(() => {
    const nw = naturalDims.width || 600;
    const nh = naturalDims.height || 400;
    const imgAspect = nw / nh;

    // Available space with balanced padding
    const padX = 40;
    const padY = 40;
    const maxW = Math.max(260, stageDims.width - padX);
    const maxH = Math.max(260, stageDims.height - padY);
    const stageAspect = maxW / maxH;

    let w: number;
    let h: number;
    if (imgAspect > stageAspect) {
      w = maxW;
      h = maxW / imgAspect;
    } else {
      h = maxH;
      w = maxH * imgAspect;
    }
    return {
      width: Math.round(w),
      height: Math.round(h),
    };
  }, [naturalDims, stageDims]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  
  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handle100Percent = () => {
    if (naturalDims.width > 0 && frameDims.width > 0) {
      const actualScale = naturalDims.width / frameDims.width;
      setZoom(Math.round(actualScale * 100) / 100);
    } else {
      setZoom(1);
    }
    setPan({ x: 0, y: 0 });
  };

  const handle200Percent = () => {
    if (naturalDims.width > 0 && frameDims.width > 0) {
      const doubleScale = (naturalDims.width / frameDims.width) * 2;
      setZoom(Math.round(doubleScale * 100) / 100);
    } else {
      setZoom(2);
    }
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom((z) => Math.min(5, Math.max(0.5, Math.round((z + delta) * 100) / 100)));
  };

  // Stage Pan (when dragging the canvas background or middle button)
  const handleStageMouseDown = (e: React.MouseEvent) => {
    // Only pan if not clicking on slider divider or ROI box
    if (isDraggingSlider.current || isDraggingRoi.current) return;
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Slider Mouse Down
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSlider.current = true;
  };

  // ROI Box Mouse Down (Drag-to-move)
  const handleRoiMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!roi) return;
    isDraggingRoi.current = true;
    roiDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initX: roi.x,
      initY: roi.y,
    };
  };

  // Click on image frame to reposition ROI
  const handleFrameClick = (e: React.MouseEvent) => {
    if (isDraggingSlider.current || isDraggingRoi.current || isPanning) return;
    if (!onRoiSelect || !imageFrameRef.current) return;

    const rect = imageFrameRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const nw = naturalDims.width || frameDims.width;
    const nh = naturalDims.height || frameDims.height;

    const natX = (clickX / rect.width) * nw;
    const natY = (clickY / rect.height) * nh;

    const roiW = roi?.width || 80;
    const roiH = roi?.height || 80;

    const nextX = Math.max(0, Math.min(nw - roiW, Math.round(natX - roiW / 2)));
    const nextY = Math.max(0, Math.min(nh - roiH, Math.round(natY - roiH / 2)));

    onRoiSelect({
      x: nextX,
      y: nextY,
      width: roiW,
      height: roiH,
    });
  };

  // Frame Mouse Move for Magnifier Loupe
  const handleFrameMouseMove = (e: React.MouseEvent) => {
    if (!loupeActive || !imageFrameRef.current) return;
    const rect = imageFrameRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLoupePos({ x, y });
  };

  const handleFrameMouseLeave = () => {
    if (loupeActive) {
      setLoupePos(null);
    }
  };

  // Global Mouse Move & Mouse Up
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    // 1. Slider dragging (strictly bounded to image frame)
    if (isDraggingSlider.current && imageFrameRef.current) {
      const rect = imageFrameRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (relX / rect.width) * 100));
      setSliderPos(Math.round(pct * 10) / 10);
      return;
    }

    // 2. ROI dragging (interactive natural pixel movement)
    if (isDraggingRoi.current && imageFrameRef.current && roi && onRoiSelect) {
      const rect = imageFrameRef.current.getBoundingClientRect();
      const nw = naturalDims.width || frameDims.width;
      const nh = naturalDims.height || frameDims.height;

      const scaleX = nw / rect.width;
      const scaleY = nh / rect.height;

      const dx = (e.clientX - roiDragStart.current.mouseX) * scaleX;
      const dy = (e.clientY - roiDragStart.current.mouseY) * scaleY;

      const nextX = Math.max(0, Math.min(nw - roi.width, Math.round(roiDragStart.current.initX + dx)));
      const nextY = Math.max(0, Math.min(nh - roi.height, Math.round(roiDragStart.current.initY + dy)));

      onRoiSelect({
        ...roi,
        x: nextX,
        y: nextY,
      });
      return;
    }

    // 3. Canvas Panning
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart, roi, onRoiSelect, naturalDims, frameDims]);

  const handleGlobalMouseUp = useCallback(() => {
    isDraggingSlider.current = false;
    isDraggingRoi.current = false;
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

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

  // Compute ROI overlay percentages
  const roiOverlay = useMemo(() => {
    if (!roi) return null;
    const nw = naturalDims.width || frameDims.width;
    const nh = naturalDims.height || frameDims.height;
    if (nw <= 0 || nh <= 0) return null;

    const left = (roi.x / nw) * 100;
    const top = (roi.y / nh) * 100;
    const width = (roi.width / nw) * 100;
    const height = (roi.height / nh) * 100;

    return { left, top, width, height };
  }, [roi, naturalDims, frameDims]);

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
            { id: 'slider' as ViewMode, label: 'Split Slider', icon: Sliders },
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

        {/* Magnifier Lens Toggle & Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Magnifier Lens Toggle */}
          <button
            type="button"
            onClick={() => setLoupeActive(!loupeActive)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px',
              fontSize: '12px',
              fontWeight: loupeActive ? 600 : 500,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: loupeActive ? 'var(--accent-subtle)' : 'var(--bg-surface-subtle)',
              color: loupeActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${loupeActive ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Inspect fine restored details with an interactive 3.5× lens"
          >
            <Search size={13} color={loupeActive ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
            <span>Magnifier Lens</span>
          </button>

          {/* Zoom stepper */}
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
              <ZoomOut size={14} />
            </button>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              minWidth: '46px',
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
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Zoom Presets: Fit, 100%, 200% */}
          <div style={{ display: 'inline-flex', gap: '4px' }}>
            <button
              type="button"
              onClick={handleFit}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 8px' }}
              title="Fit photo cleanly in the stage"
            >
              <Maximize2 size={12} style={{ marginRight: '3px' }} />
              Fit
            </button>

            <button
              type="button"
              onClick={handle100Percent}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 8px' }}
              title="Actual 1:1 sensor pixel size"
            >
              100%
            </button>

            <button
              type="button"
              onClick={handle200Percent}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 8px' }}
              title="Close-up 2× sensor pixel size"
            >
              200%
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleFit}
                className="btn-ghost"
                style={{ fontSize: '11px', padding: '5px 6px' }}
                title="Reset zoom & pan"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
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
            Download restored
          </button>
        </div>
      </div>

      {/* Main Studio Visualizer Stage */}
      <div
        ref={stageRef}
        className="darkroom-canvas"
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        style={{
          width: '100%',
          height: '520px',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          userSelect: 'none',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {/* Transformable Canvas Layer */}
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>

          {/* SLIDER VIEW MODE */}
          {viewMode === 'slider' && (
            <div
              ref={imageFrameRef}
              onClick={handleFrameClick}
              onMouseMove={handleFrameMouseMove}
              onMouseLeave={handleFrameMouseLeave}
              style={{
                position: 'relative',
                width: `${frameDims.width}px`,
                height: `${frameDims.height}px`,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                cursor: loupeActive ? 'none' : 'crosshair',
              }}
            >
              {/* Layer 1: Restored Base Image (Right Side) */}
              <img
                src={restoredImage}
                alt="Restored output"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'fill',
                  pointerEvents: 'none',
                }}
              />

              {/* Layer 2: Original Image clipped by slider (Left Side) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={originalImage}
                  alt="Original input"
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'fill',
                  }}
                />
              </div>

              {/* Layer 3: Interactive Split Divider (strictly bounded to the image frame) */}
              <div
                onMouseDown={handleSliderMouseDown}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: '2px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0 8px rgba(0,0,0,0.6)',
                  cursor: 'ew-resize',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translateX(-50%)',
                }}
              >
                {/* Sleek divider handle */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid var(--accent-primary)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'ew-resize',
                    fontSize: '13px',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    userSelect: 'none',
                  }}
                >
                  ↔
                </div>
              </div>

              {/* Layer 4: Interactive ROI Box (Pixel-Accurate Natural Overlay) */}
              {roiOverlay && (
                <div
                  onMouseDown={handleRoiMouseDown}
                  style={{
                    position: 'absolute',
                    left: `${roiOverlay.left}%`,
                    top: `${roiOverlay.top}%`,
                    width: `${roiOverlay.width}%`,
                    height: `${roiOverlay.height}%`,
                    border: '2px solid #2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.16)',
                    boxShadow: '0 0 0 1px #FFFFFF, 0 4px 12px rgba(0,0,0,0.4)',
                    cursor: 'move',
                    zIndex: 22,
                    pointerEvents: 'auto',
                    borderRadius: '2px',
                  }}
                  title="Drag ROI box to inspect any area. Click elsewhere to relocate."
                >
                  {/* Floating Tag */}
                  <div style={{
                    position: 'absolute',
                    top: '-22px',
                    left: '-1px',
                    backgroundColor: '#1F4FD8',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                  }}>
                    <Crosshair size={11} />
                    ROI {roi?.width}×{roi?.height}
                  </div>

                  {/* Corner handles */}
                  <div style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, backgroundColor: '#FFFFFF', border: '1px solid #1F4FD8', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, backgroundColor: '#FFFFFF', border: '1px solid #1F4FD8', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, backgroundColor: '#FFFFFF', border: '1px solid #1F4FD8', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, backgroundColor: '#FFFFFF', border: '1px solid #1F4FD8', borderRadius: 1 }} />
                </div>
              )}

              {/* Layer 5: Magnifier Loupe Lens */}
              {loupeActive && loupePos && (
                <div style={{
                  position: 'absolute',
                  left: `${loupePos.x - 70}px`,
                  top: `${loupePos.y - 70}px`,
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 35,
                  backgroundColor: '#0F172A',
                }}>
                  <img
                    src={restoredImage}
                    alt="Magnified Detail"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: `${frameDims.width * 3.5}px`,
                      height: `${frameDims.height * 3.5}px`,
                      left: `${-loupePos.x * 3.5 + 70}px`,
                      top: `${-loupePos.y * 3.5 + 70}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                  />
                  {/* Loupe crosshair */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '14px',
                    height: '14px',
                    border: '1px solid rgba(255,255,255,0.85)',
                    borderRadius: '50%',
                    boxShadow: '0 0 2px rgba(0,0,0,0.8)',
                  }} />
                  <span style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap'
                  }}>
                    3.5× Lens
                  </span>
                </div>
              )}

              {/* Corner Watermarks */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                padding: '4px 8px',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                pointerEvents: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                zIndex: 15
              }}>
                Original Photo
              </div>

              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                padding: '4px 8px',
                backgroundColor: 'rgba(31, 79, 216, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                pointerEvents: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                zIndex: 15
              }}>
                LightMap Restored ({selectedMode.toUpperCase()})
              </div>
            </div>
          )}

          {/* SIDE-BY-SIDE MODE */}
          {viewMode === 'side-by-side' && (
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Left: Original */}
              <div style={{
                position: 'relative',
                width: `${Math.round(frameDims.width * 0.72)}px`,
                height: `${Math.round(frameDims.height * 0.72)}px`,
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                backgroundColor: '#0F172A',
              }}>
                <img
                  src={originalImage}
                  alt="Original"
                  draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
                />
                <span className="badge badge-neutral" style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  Original
                </span>
              </div>

              {/* Right: Restored */}
              <div style={{
                position: 'relative',
                width: `${Math.round(frameDims.width * 0.72)}px`,
                height: `${Math.round(frameDims.height * 0.72)}px`,
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                backgroundColor: '#0F172A',
              }}>
                <img
                  src={restoredImage}
                  alt="Restored"
                  draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
                />
                <span className="badge badge-brand" style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  Restored ({selectedMode.toUpperCase()})
                </span>
              </div>
            </div>
          )}

          {/* ORIGINAL ONLY */}
          {viewMode === 'original' && (
            <div style={{
              position: 'relative',
              width: `${frameDims.width}px`,
              height: `${frameDims.height}px`,
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A',
            }}>
              <img
                src={originalImage}
                alt="Original"
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
              />
              <span className="badge badge-neutral" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                Original Input Capture
              </span>
            </div>
          )}

          {/* RESTORED ONLY */}
          {viewMode === 'restored' && (
            <div style={{
              position: 'relative',
              width: `${frameDims.width}px`,
              height: `${frameDims.height}px`,
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A',
            }}>
              <img
                src={restoredImage}
                alt="Restored"
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
              />
              <span className="badge badge-brand" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                Restored Output ({selectedMode.toUpperCase()})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Helpful Status & Instruction Footer */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Move size={13} color="var(--accent-primary)" />
          <span>
            <strong>Controls:</strong> Drag slider divider to compare • Drag ROI box or click photo to reposition • Wheel to zoom • Drag background to pan
          </span>
        </div>
        <div>
          <span>Native size: <strong>{naturalDims.width || '—'} × {naturalDims.height || '—'} px</strong> • Display: <strong>{Math.round(zoom * 100)}%</strong></span>
        </div>
      </div>
    </div>
  );
};
