import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
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
  currentStepIndex?: number;
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
  currentStepIndex = 0,
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

  const progressSteps = [
    'Analysing the image',
    'Brightening with classical rules',
    'Brightening with the neural network',
    'Combining both with adaptive fusion',
    'Checking quality and highlight safety',
  ];

  return (
    <section id="workspace" style={{ padding: '24px 0 16px 0' }}>
      <div className="content-wrapper">
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#FDF2F2',
            border: '1px solid #F9C0C0',
            borderRadius: '6px',
            color: '#C53030',
            marginBottom: '18px',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) 1.5fr',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* STEP 1: Upload */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Step 1
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
                  Choose a dark photo
                </h3>
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={() => onFileSelect(null)}
                  className="btn-ghost"
                  style={{ color: '#C53030', padding: '2px 6px', fontSize: '12px' }}
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
                  borderRadius: '6px',
                  padding: '36px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <UploadCloud size={18} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A2433', marginBottom: '2px' }}>
                  Drop your image here, or browse
                </div>
                <div style={{ fontSize: '12px', color: '#5B6778', marginBottom: '14px' }}>
                  Supports PNG and JPG
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
                  {isLoadingSample ? 'Loading...' : 'Try a sample image'}
                </button>
              </div>
            ) : (
              <div style={{
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                backgroundColor: '#F1F4F9'
              }}>
                <div style={{
                  height: '190px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0F172A',
                  overflow: 'hidden',
                }}>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Selected low light input"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#FFFFFF' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1A2433',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '2px'
                  }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5B6778' }}>
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span style={{ margin: '0 6px' }}>•</span>
                    <span>{dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'Loading...'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2 & STEP 3: Method & Process */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Step 2: Method Selector */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Step 2
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
                  Choose a method
                </h3>
              </div>

              <MethodSelector
                selectedMode={selectedMode}
                onSelectMode={onModeSelect}
                disabled={isProcessing}
              />

              {/* Style selector inline */}
              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A2433' }}>
                  Restoration Style:
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'natural' as ImageProfile, label: 'Natural' },
                    { id: 'visibility' as ImageProfile, label: 'High Brightness' },
                    { id: 'detail' as ImageProfile, label: 'Keep Details' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onProfileSelect(item.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: profile === item.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: profile === item.id ? 'var(--accent-subtle)' : '#FFFFFF',
                        color: profile === item.id ? 'var(--accent-primary)' : '#1A2433',
                        fontWeight: profile === item.id ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 3: Process Button & Progress */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isProcessing ? '14px' : '0'
              }}>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Step 3
                  </span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2433' }}>
                    Process image
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={onRunRestoration}
                  className="btn-primary"
                  style={{ minWidth: '150px', padding: '8px 16px' }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>{isProcessing ? 'Processing...' : 'Restore Image'}</span>
                </button>
              </div>

              {/* Progress list showing each stage */}
              {isProcessing && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {progressSteps.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={step}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: isCurrent ? 'var(--accent-primary)' : isDone ? '#1E8E5A' : '#8A96A6',
                          fontWeight: isCurrent ? 600 : 400
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} color="#1E8E5A" />
                        ) : isCurrent ? (
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid var(--accent-subtle)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                          }} />
                        ) : (
                          <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: '1px solid #CDD5DF',
                            display: 'inline-block'
                          }} />
                        )}
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
