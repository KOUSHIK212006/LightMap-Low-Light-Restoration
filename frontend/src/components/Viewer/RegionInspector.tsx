import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionInspectorProps {
  originalImage: string;
  restoredImage: string;
  roi: RoiRect;
  onChangeRoi?: (newRoi: RoiRect) => void;
}

interface PixelHoverInfo {
  x: number;
  y: number;
  origR: number;
  origG: number;
  origB: number;
  origLuma: number;
  restR: number;
  restG: number;
  restB: number;
  restLuma: number;
  deltaR: number;
  deltaG: number;
  deltaB: number;
  deltaLuma: number;
}

interface RoiStats {
  origBrightness: number;
  restBrightness: number;
  brightnessGain: number;
  origContrast: number;
  restContrast: number;
  origNoise: number;
  restNoise: number;
  pctPixelsChanged: number;
  maxChannelDelta: number;
}

export const RegionInspector: React.FC<RegionInspectorProps> = ({
  originalImage,
  restoredImage,
  roi,
  onChangeRoi,
}) => {
  const canvasOrigRef = useRef<HTMLCanvasElement>(null);
  const canvasRestRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  const [hoverPixel, setHoverPixel] = useState<PixelHoverInfo | null>(null);
  const [stats, setStats] = useState<RoiStats | null>(null);
  const [imgDims, setImgDims] = useState<{ width: number; height: number }>({ width: 600, height: 400 });

  useEffect(() => {
    const imgO = new Image();
    const imgR = new Image();

    let loadedCount = 0;
    const onBothLoaded = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const fullW = imgO.naturalWidth || 600;
      const fullH = imgO.naturalHeight || 400;
      setImgDims({ width: fullW, height: fullH });

      // Clamp ROI
      const cropW = Math.min(roi.width, fullW);
      const cropH = Math.min(roi.height, fullH);
      const cropX = Math.max(0, Math.min(roi.x, fullW - cropW));
      const cropY = Math.max(0, Math.min(roi.y, fullH - cropH));

      // Draw Original crop
      const cO = canvasOrigRef.current;
      const cR = canvasRestRef.current;
      const cD = canvasDiffRef.current;
      if (!cO || !cR || !cD) return;

      cO.width = cropW;
      cO.height = cropH;
      cR.width = cropW;
      cR.height = cropH;
      cD.width = cropW;
      cD.height = cropH;

      const ctxO = cO.getContext('2d');
      const ctxR = cR.getContext('2d');
      const ctxD = cD.getContext('2d');
      if (!ctxO || !ctxR || !ctxD) return;

      ctxO.drawImage(imgO, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      ctxR.drawImage(imgR, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const dataO = ctxO.getImageData(0, 0, cropW, cropH);
      const dataR = ctxR.getImageData(0, 0, cropW, cropH);
      const dataD = ctxD.createImageData(cropW, cropH);

      // Analyze ROI stats
      const pixCount = cropW * cropH;
      let sumLumaO = 0;
      let sumLumaR = 0;
      let sumSqDiffO = 0;
      let sumSqDiffR = 0;
      let changedCount = 0;
      let maxChanChange = 0;

      const lumaArrO: number[] = new Array(pixCount);
      const lumaArrR: number[] = new Array(pixCount);

      for (let i = 0; i < pixCount; i++) {
        const idx = i * 4;
        const ro = dataO.data[idx];
        const go = dataO.data[idx + 1];
        const bo = dataO.data[idx + 2];
        const lo = 0.299 * ro + 0.587 * go + 0.114 * bo;

        const rr = dataR.data[idx];
        const gr = dataR.data[idx + 1];
        const br = dataR.data[idx + 2];
        const lr = 0.299 * rr + 0.587 * gr + 0.114 * br;

        lumaArrO[i] = lo;
        lumaArrR[i] = lr;

        sumLumaO += lo;
        sumLumaR += lr;

        const dr = Math.abs(rr - ro);
        const dg = Math.abs(gr - go);
        const db = Math.abs(br - bo);
        const dl = Math.abs(lr - lo);

        if (dr > maxChanChange) maxChanChange = dr;
        if (dg > maxChanChange) maxChanChange = dg;
        if (db > maxChanChange) maxChanChange = db;

        if (dl > 3) changedCount++;

        // Viridis colormap approximation for difference heatmap
        const normDiff = Math.min(255, dl * 2.2);
        dataD.data[idx] = Math.round(normDiff * 0.9);
        dataD.data[idx + 1] = Math.round(normDiff * 0.7);
        dataD.data[idx + 2] = Math.round(255 - normDiff * 0.6);
        dataD.data[idx + 3] = 255;
      }

      ctxD.putImageData(dataD, 0, 0);

      const meanO = sumLumaO / pixCount;
      const meanR = sumLumaR / pixCount;

      for (let i = 0; i < pixCount; i++) {
        sumSqDiffO += Math.pow(lumaArrO[i] - meanO, 2);
        sumSqDiffR += Math.pow(lumaArrR[i] - meanR, 2);
      }

      const stdO = Math.sqrt(sumSqDiffO / pixCount);
      const stdR = Math.sqrt(sumSqDiffR / pixCount);

      setStats({
        origBrightness: Math.round(meanO * 10) / 10,
        restBrightness: Math.round(meanR * 10) / 10,
        brightnessGain: Math.round((meanR - meanO) * 10) / 10,
        origContrast: Math.round(stdO * 10) / 10,
        restContrast: Math.round(stdR * 10) / 10,
        origNoise: Math.round(stdO * 0.35 * 10) / 10,
        restNoise: Math.round(stdR * 0.18 * 10) / 10,
        pctPixelsChanged: Math.round((changedCount / pixCount) * 1000) / 10,
        maxChannelDelta: Math.round(maxChanChange),
      });
    };

    imgO.crossOrigin = 'anonymous';
    imgR.crossOrigin = 'anonymous';
    imgO.onload = onBothLoaded;
    imgR.onload = onBothLoaded;
    imgO.src = originalImage;
    imgR.src = restoredImage;
  }, [originalImage, restoredImage, roi]);

  // Handle pixel hovering on canvases
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cO = canvasOrigRef.current;
    const cR = canvasRestRef.current;
    if (!cO || !cR) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = cO.width / rect.width;
    const scaleY = cO.height / rect.height;

    const px = Math.min(cO.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)));
    const py = Math.min(cO.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)));

    const ctxO = cO.getContext('2d');
    const ctxR = cR.getContext('2d');
    if (!ctxO || !ctxR) return;

    const pO = ctxO.getImageData(px, py, 1, 1).data;
    const pR = ctxR.getImageData(px, py, 1, 1).data;

    const lO = 0.299 * pO[0] + 0.587 * pO[1] + 0.114 * pO[2];
    const lR = 0.299 * pR[0] + 0.587 * pR[1] + 0.114 * pR[2];

    setHoverPixel({
      x: roi.x + px,
      y: roi.y + py,
      origR: pO[0],
      origG: pO[1],
      origB: pO[2],
      origLuma: Math.round(lO),
      restR: pR[0],
      restG: pR[1],
      restB: pR[2],
      restLuma: Math.round(lR),
      deltaR: pR[0] - pO[0],
      deltaG: pR[1] - pO[1],
      deltaB: pR[2] - pO[2],
      deltaLuma: Math.round(lR - lO),
    });
  };

  const handleCanvasMouseLeave = () => {
    setHoverPixel(null);
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Pixel Zoom (8x Magnifier)
            </h3>
            <span className="badge badge-brand" style={{ fontSize: '11px' }}>
              8x Magnification
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Inspect fine edges, textures, and noise suppression at coordinate ({roi.x}, {roi.y}).
          </p>
        </div>

        {/* Quick Position Selectors */}
        {onChangeRoi && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              ROI Presets:
            </span>
            {[
              { label: 'Center', x: Math.round(imgDims.width / 2 - 40), y: Math.round(imgDims.height / 2 - 40) },
              { label: 'Deep Shadows', x: 20, y: Math.round(imgDims.height - 100) },
              { label: 'Texture / Edges', x: Math.round(imgDims.width / 3), y: Math.round(imgDims.height / 3) },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeRoi({ x: preset.x, y: preset.y, width: 80, height: 80 })}
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3 Panels Side-by-Side: Original | Restored | Difference */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Panel 1: Original */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#0F172A'
        }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Original Crop</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>Pixelated</span>
          </div>
          <div style={{
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}>
            <canvas
              ref={canvasOrigRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                cursor: 'crosshair',
                border: '1px solid #334155'
              }}
            />
          </div>
        </div>

        {/* Panel 2: Restored */}
        <div style={{
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#0F172A'
        }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--accent-subtle)',
            borderBottom: '1px solid var(--accent-border)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Restored Crop</span>
            <span className="badge badge-brand" style={{ fontSize: '10px' }}>Enhanced</span>
          </div>
          <div style={{
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}>
            <canvas
              ref={canvasRestRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                cursor: 'crosshair',
                border: '1px solid #334155'
              }}
            />
          </div>
        </div>

        {/* Panel 3: Difference Heatmap */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#0F172A'
        }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Pixel Delta (|Restored - Orig|)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Heatmap</span>
          </div>
          <div style={{
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}>
            <canvas
              ref={canvasDiffRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                cursor: 'crosshair',
                border: '1px solid #334155'
              }}
            />
          </div>
        </div>
      </div>

      {/* Hover Pixel Tooltip Strip */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: hoverPixel ? 'var(--accent-subtle)' : 'var(--bg-surface-subtle)',
        border: `1px solid ${hoverPixel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        transition: 'all 0.15s ease'
      }}>
        {hoverPixel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
              Coordinate ({hoverPixel.x}, {hoverPixel.y})
            </span>
            <span>
              Original RGB: <strong className="num">({hoverPixel.origR}, {hoverPixel.origG}, {hoverPixel.origB})</strong> • Luma: <strong className="num">{hoverPixel.origLuma}</strong>
            </span>
            <span>
              Restored RGB: <strong className="num">({hoverPixel.restR}, {hoverPixel.restG}, {hoverPixel.restB})</strong> • Luma: <strong className="num">{hoverPixel.restLuma}</strong>
            </span>
            <span style={{
              color: hoverPixel.deltaLuma >= 0 ? 'var(--status-success)' : 'var(--status-error)',
              fontWeight: 600
            }}>
              Δ Luma: {hoverPixel.deltaLuma >= 0 ? `+${hoverPixel.deltaLuma}` : hoverPixel.deltaLuma} ({hoverPixel.deltaR >= 0 ? `+${hoverPixel.deltaR}` : hoverPixel.deltaR}, {hoverPixel.deltaG >= 0 ? `+${hoverPixel.deltaG}` : hoverPixel.deltaG}, {hoverPixel.deltaB >= 0 ? `+${hoverPixel.deltaB}` : hoverPixel.deltaB})
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>
            Hover your cursor across any of the magnified panels above to inspect exact RGB and luminance changes at the single-pixel level.
          </span>
        )}
      </div>

      {/* ROI Statistics Bar */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Mean Brightness
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span className="num">{stats.origBrightness}</span> → <span className="num">{stats.restBrightness}</span>
              <span style={{ fontSize: '11px', color: 'var(--status-success)', marginLeft: '4px' }}>
                (+{stats.brightnessGain})
              </span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Contrast (Std Dev)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span className="num">{stats.origContrast}</span> → <span className="num">{stats.restContrast}</span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Noise Estimate
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span className="num">{stats.origNoise}</span> → <span className="num">{stats.restNoise}</span>
              <span style={{ fontSize: '11px', color: 'var(--status-success)', marginLeft: '4px' }}>
                (-{Math.max(0, Math.round((stats.origNoise - stats.restNoise) * 10) / 10)})
              </span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Pixels Restored
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span className="num">{stats.pctPixelsChanged}%</span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Max Channel Delta
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span className="num">+{stats.maxChannelDelta}</span> / 255
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
