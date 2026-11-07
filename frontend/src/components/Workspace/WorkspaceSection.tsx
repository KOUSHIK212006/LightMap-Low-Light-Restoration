import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Play, AlertCircle } from 'lucide-react';
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
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
    <section id="workspace" style={{ padding: '28px 0' }}>
      <div className="content-wrapper">
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
          gridTemplateColumns: 'minmax(320px, 1fr) 1.5fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left: Image Uploader */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Your Photo
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => onFileSelect(null)}
                  className="btn-ghost"
                  style={{ color: 'var(--status-error)', padding: '2px 6px', fontSize: '12px' }}
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
                  padding: '40px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <UploadCloud size={20} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Click to choose a photo
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  or drag and drop (PNG, JPG)
                </div>

                <button
                  type="button"
                  disabled={isLoadingSample}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  <ImageIcon size={13} style={{ marginRight: '6px' }} />
                  {isLoadingSample ? 'Loading...' : 'Try sample photo'}
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
                  height: '210px',
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
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px'
                  }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span style={{ margin: '0 6px' }}>•</span>
                    <span>{dimensions ? `${dimensions.width} × ${dimensions.height}px` : 'Loading...'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Settings & Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Style Selector */}
            <div className="card" style={{ padding: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '10px'
              }}>
                Restoration Style
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                {[
                  {
                    id: 'natural' as ImageProfile,
                    label: 'Natural',
                    desc: 'Balanced. Keeps real-life look.',
                  },
                  {
                    id: 'visibility' as ImageProfile,
                    label: 'High Brightness',
                    desc: 'Brightest. Reveals dark shadows.',
                  },
                  {
                    id: 'detail' as ImageProfile,
                    label: 'Keep Details',
                    desc: 'Sharp edges. Best for text and signs.',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProfileSelect(item.id)}
                    style={{
                      padding: '10px 12px',
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
                      marginBottom: '2px'
                    }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Method Selector & Run */}
            <div className="card" style={{ padding: '20px' }}>
              <MethodSelector
                selectedMode={selectedMode}
                onSelectMode={onModeSelect}
                disabled={isProcessing}
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  All 3 methods run together so you can compare them instantly.
                </span>

                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={onRunRestoration}
                  className="btn-primary"
                  style={{ minWidth: '150px' }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>{isProcessing ? 'Restoring...' : 'Restore Photo'}</span>
                </button>
              </div>

              {isProcessing && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid var(--accent-subtle)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>{currentStepMessage || 'Enhancing photo...'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
