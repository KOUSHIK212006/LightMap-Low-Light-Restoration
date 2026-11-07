import { useEffect, useState } from 'react';
import ComparisonView from '../components/ComparisonView';
import ErrorMessage from '../components/ErrorMessage';
import Header from '../components/Header';
import ImagePreview from '../components/ImagePreview';
import ImageUploader from '../components/ImageUploader';
import LoadingState from '../components/LoadingState';
import ModeSelector from '../components/ModeSelector';
import ProfileSelector from '../components/ProfileSelector';
import { enhanceImage, healthCheck } from '../services/api';
import type { ImageProfile, RestorationMode } from '../types/image';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [classicalImage, setClassicalImage] = useState<string | null>(null);
  const [deepImage, setDeepImage] = useState<string | null>(null);
  const [fusionMap, setFusionMap] = useState<string | null>(null);
  const [disagreementMap, setDisagreementMap] = useState<string | null>(null);
  const [profile, setProfile] = useState<ImageProfile>('natural');
  const [mode, setMode] = useState<RestorationMode>('hybrid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | undefined>();
  const [qualityReport, setQualityReport] = useState<Record<string, unknown> | undefined>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [timing, setTiming] = useState<Record<string, unknown>>({});
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>();
  const [processingStatus, setProcessingStatus] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  }, []);

  useEffect(() => {
    return () => {
      if (originalImage) {
        URL.revokeObjectURL(originalImage);
      }
    };
  }, [originalImage]);

  const handleFileSelected = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    if (originalImage) {
      URL.revokeObjectURL(originalImage);
    }

    setSelectedFile(file);
    setError(null);
    setStatusMessage(`Loaded ${file.name}. Ready to enhance.`);
    setOriginalImage(URL.createObjectURL(file));
    setEnhancedImage(null);
    setClassicalImage(null);
    setDeepImage(null);
    setFusionMap(null);
    setDisagreementMap(null);
    setWarnings([]);
    setAnalysis(undefined);
    setQualityReport(undefined);
    setSelectedMethod(undefined);
    setProcessingStatus(undefined);
  };

  const handleRemoveImage = () => {
    if (originalImage) {
      URL.revokeObjectURL(originalImage);
    }
    setSelectedFile(null);
    setOriginalImage(null);
    setEnhancedImage(null);
    setClassicalImage(null);
    setDeepImage(null);
    setFusionMap(null);
    setDisagreementMap(null);
    setError(null);
    setWarnings([]);
    setAnalysis(undefined);
    setQualityReport(undefined);
    setSelectedMethod(undefined);
    setProcessingStatus(undefined);
    setStatusMessage('Image removed. Select an image to continue.');
  };

  const handleEnhance = async () => {
    if (!selectedFile) {
      setError('Choose an image before running enhancement.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Running restoration pipeline...');

    try {
      const result = await enhanceImage(selectedFile, profile, mode);
      setEnhancedImage(result.final_image ?? null);
      setClassicalImage(result.classical_image ?? result.classical_output ?? null);
      setDeepImage(result.deep_image ?? result.deep_output ?? null);
      setFusionMap(result.fusion_map ?? null);
      setDisagreementMap(result.disagreement_map ?? null);
      setAnalysis((result.analysis ?? {}) as Record<string, unknown>);
      setQualityReport((result.quality_report ?? {}) as Record<string, unknown>);
      setWarnings(result.warnings ?? []);
      setTiming((result.timing ?? result.timings ?? {}) as Record<string, unknown>);
      setSelectedMethod(result.selected_method ?? 'unknown');
      setProcessingStatus(result.processing_status ?? 'unknown');
      setStatusMessage(result.message || 'Enhancement complete.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A backend error occurred while enhancing the image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="dashboard">
        <Header backendHealthy={backendHealthy} />

        <div className="content-grid">
          <div className="panel">
            <div className="section-header-row">
              <h2>Upload & Configure</h2>
              <span className="mini-badge">PNG • JPG • JPEG</span>
            </div>
            <ImageUploader onFileSelected={handleFileSelected} onRemove={handleRemoveImage} selectedFileName={selectedFile?.name} />

            <div style={{ marginTop: 18 }}>
              <ProfileSelector selectedProfile={profile} onChange={setProfile} />
            </div>

            <ModeSelector selectedMode={mode} onChange={setMode} />

            <div className="action-row">
              <button type="button" className="primary-button" onClick={handleEnhance} disabled={!selectedFile || loading || backendHealthy === false}>
                {loading ? 'Restoring...' : `Enhance image (${mode})`}
              </button>
              {enhancedImage && (
                <a className="secondary-button" href={enhancedImage} download={`lightmap-${mode}-${profile}.png`}>
                  Download result
                </a>
              )}
            </div>

            {backendHealthy === false && <ErrorMessage message="The backend is unavailable. Start the FastAPI service before uploading an image." />}
            {error && <ErrorMessage message={error} />}
            {loading && <LoadingState />}
            {statusMessage && !loading && <div className="status-banner">{statusMessage}</div>}
          </div>

          <div className="panel">
            <div className="section-header-row">
              <h2>Preview</h2>
              <span className="mini-badge">Live</span>
            </div>
            <div className="preview-stack">
              <ImagePreview imageSrc={originalImage ?? undefined} label="Original input image" />
              {enhancedImage && <ImagePreview imageSrc={enhancedImage} label={`Enhanced (${selectedMethod || mode})`} />}
            </div>
          </div>
        </div>

        <div className="panel results-panel">
          <ComparisonView
            originalImage={originalImage ?? undefined}
            enhancedImage={enhancedImage ?? undefined}
            classicalImage={classicalImage ?? undefined}
            deepImage={deepImage ?? undefined}
            fusionMap={fusionMap ?? undefined}
            disagreementMap={disagreementMap ?? undefined}
            analysis={analysis}
            qualityReport={qualityReport}
            warnings={warnings}
            timing={timing}
            selectedMethod={selectedMethod}
            processingStatus={processingStatus}
          />
        </div>
      </div>
    </div>
  );
}
