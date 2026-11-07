import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Play, Sparkles, AlertCircle } from 'lucide-react';
import type { ImageProfile, RestorationMode } from '../../types/image';
import { MethodSelector } from '../MethodSelector/MethodSelector';
import { fetchSampleImage } from '../../services/api';

interface WorkspaceSectionProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  profile: ImageProfile;
  onProfileSelect: (profile: ImageProfile) => void;
  selectedMode: RestorationMode;
  onModeSelect: (mode: RestorationMode) => void;
  onRunRestoration: () => void;
  isProcessing: boolean;
  currentStepMessage?: string;
  errorMessage?: string | null;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  selectedFile,
  onFileSelect,
  profile,
  onProfileSelect,
  selectedMode,
  onModeSelect,
  onRunRestoration,
  isProcessing,
  currentStepMessage,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setDimensions(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      const sample = await fetchSampleImage();
      onFileSelect(sample);
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <section id="workspace" style={{ padding: '32px 0' }}>
      <div className="content-wrapper">
        <div className="section-header">
          <h2 className="section-title">
            <Sparkles size={20} color="var(--accent-primary)" />
            Restoration Workspace
          </h2>
          <p className="section-description">
            Ingest underexposed captures, configure restoration profiles, and trigger adaptive hybrid reconstruction.
          </p>
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'var(--status-error-bg)',
            border: '1px solid var(--status-error-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-error)',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1fr) 1.5fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left Column: Dropzone */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Source Capture
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => onFileSelect(null)}
                  className="btn-ghost"
                  style={{ color: 'var(--status-error)', padding: '4px 8px', fontSize: '12px' }}
                  title="Remove selected file"
                >
                  <Trash2 size={13} style={{ marginRight: '4px' }} />
                  Remove
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                  backgroundColor: isDragging ? 'var(--accent-subtle)' : 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '48px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <UploadCloud size={22} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Click to upload or drag & drop
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  PNG, JPG or JPEG (Max 25MB)
                </div>

                <button
                  type="button"
                  disabled={isLoadingSample}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <ImageIcon size={13} style={{ marginRight: '6px' }} />
                  {isLoadingSample ? 'Loading sample...' : 'Try sample image (test_dark.jpg)'}
                </button>
              </div>
            ) : (
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}>
                <div style={{
                  height: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0F172A',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Selected low light input"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  )}
                  <span className="badge badge-neutral" style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px'
                  }}>
                    Input Preview
                  </span>
                </div>

                <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '6px'
                  }}>
                    {selectedFile.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Size: <strong style={{ color: 'var(--text-primary)' }}>{formatFileSize(selectedFile.size)}</strong></span>
                    <span>•</span>
                    <span>Resolution: <strong style={{ color: 'var(--text-primary)' }}>{dimensions ? `${dimensions.width} × ${dimensions.height}px` : 'Calculating...'}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Execution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Profile Selector */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Enhancement Profile
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Controls tone curves & noise dampening
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '10px'
              }}>
                {[
                  {
                    id: 'natural' as ImageProfile,
                    label: 'Natural',
                    desc: 'Balanced tone curve, preserves natural contrast and low noise.',
                  },
                  {
                    id: 'visibility' as ImageProfile,
                    label: 'Maximum Visibility',
                    desc: 'Aggressive dynamic range expansion for extreme underexposure.',
                  },
                  {
                    id: 'detail' as ImageProfile,
                    label: 'Detail Preservation',
                    desc: 'High edge conservation with controlled spatial bilateral filter.',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProfileSelect(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: profile === item.id 
                        ? '1px solid var(--accent-primary)' 
                        : '1px solid var(--border-subtle)',
                      backgroundColor: profile === item.id 
                        ? 'var(--accent-subtle)' 
                        : 'var(--bg-surface)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: profile === item.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      marginBottom: '4px'
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.35
                    }}>
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Method Selector in card */}
            <div className="card" style={{ padding: '24px' }}>
              <MethodSelector
                selectedMode={selectedMode}
                onSelectMode={onModeSelect}
                disabled={isProcessing}
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  All 3 methods are generated in parallel for instant switching.
                </div>

                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={onRunRestoration}
                  className="btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  <Play size={15} fill="currentColor" />
                  <span>{isProcessing ? 'Processing...' : 'Run restoration'}</span>
                </button>
              </div>

              {isProcessing && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid var(--accent-subtle)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {currentStepMessage || 'Restoring image across Classical and Deep branches...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};
