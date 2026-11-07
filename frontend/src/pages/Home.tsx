import { useEffect, useMemo, useState } from 'react';
import ComparisonView from '../components/ComparisonView';
import ErrorMessage from '../components/ErrorMessage';
import Header from '../components/Header';
import ImagePreview from '../components/ImagePreview';
import ImageUploader from '../components/ImageUploader';
import LoadingState from '../components/LoadingState';
import MethodSelector from '../components/MethodSelector';
import ProfileSelector from '../components/ProfileSelector';
import { analyzeImage, enhanceImage, healthCheck } from '../services/api';
import type { AnalysisMetrics, ImageProfile, RestorationMethod } from '../types/image';

const DEFAULT_ANALYSIS: AnalysisMetrics = {};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ImageProfile>('natural');
  const [method, setMethod] = useState<RestorationMethod>('hybrid');
  const [loading, setLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [fusionMap, setFusionMap] = useState<string | null>(null);
  const [branchDisagreementMap, setBranchDisagreementMap] = useState<string | null>(null);
  const [retryApplied, setRetryApplied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisMetrics | undefined>(DEFAULT_ANALYSIS);
  const [restoredAnalysis, setRestoredAnalysis] = useState<AnalysisMetrics | undefined>(undefined);
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

  const downloadFileName = useMemo(() => `lightmap_restored_${method}_${profile}.png`, [method, profile]);

  const handleFileSelected = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = extension && ['png', 'jpg', 'jpeg'].includes(extension);
    const isAllowedMime = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
    if (!isAllowedExt && !isAllowedMime) {
      setError('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    if (file.size === 0) {
      setError('Uploaded image is empty.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds the maximum supported size of 10.0 MB. Please upload a smaller image.');
      return;
    }

    if (originalImage) {
      URL.revokeObjectURL(originalImage);
    }

    setSelectedFile(file);
    setError(null);
    setStatusMessage(`Loaded ${file.name}. Ready to analyse and restore.`);
    setOriginalImage(URL.createObjectURL(file));
    setEnhancedImage(null);
    setFusionMap(null);
    setBranchDisagreementMap(null);
    setRetryApplied(false);
    setWarnings([]);
    setAnalysis(DEFAULT_ANALYSIS);
    setRestoredAnalysis(undefined);
    setSelectedMethod(undefined);
    setProcessingStatus(undefined);
    setTiming({});
  };

  const handleRemoveImage = () => {
    if (originalImage) {
      URL.revokeObjectURL(originalImage);
    }
    setSelectedFile(null);
    setOriginalImage(null);
    setEnhancedImage(null);
    setFusionMap(null);
    setBranchDisagreementMap(null);
    setRetryApplied(false);
    setError(null);
    setWarnings([]);
    setAnalysis(DEFAULT_ANALYSIS);
    setRestoredAnalysis(undefined);
    setSelectedMethod(undefined);
    setProcessingStatus(undefined);
    setTiming({});
    setStatusMessage('Image removed. Select an image to continue.');
  };

  const handleDownload = () => {
    if (!enhancedImage) {
      setError('There is no restored image available to download yet.');
      return;
    }

    try {
      const anchor = document.createElement('a');
      anchor.href = enhancedImage;
      anchor.download = downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setStatusMessage('Restored image download started.');
    } catch {
      setError('The restored image could not be downloaded.');
    }
  };

  const handleAnalyze = async (file: File) => {
    const result = await analyzeImage(file, profile);
    setAnalysis((result as AnalysisMetrics) ?? DEFAULT_ANALYSIS);
    setStatusMessage('Image analysis complete.');
    return result;
  };

  const handleEnhance = async () => {
    if (!selectedFile) {
      setError('Choose an image before running restoration.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Restoring image via selected engine...');

    try {
      const analysisResponse = await handleAnalyze(selectedFile);
      const result = await enhanceImage(selectedFile, profile, method);

      if (result.status === 'failed') {
        setError(result.message || 'Restoration failed.');
        setEnhancedImage(null);
        setFusionMap(null);
        setBranchDisagreementMap(null);
      } else {
        setEnhancedImage(result.final_image ?? null);
        setFusionMap(result.fusion_map ?? null);
        setBranchDisagreementMap(result.branch_disagreement_map ?? null);
        setRetryApplied(Boolean(result.retry_applied));
      }

      setAnalysis((result.analysis ?? analysisResponse ?? DEFAULT_ANALYSIS) as AnalysisMetrics);
      setRestoredAnalysis((result.restored_analysis ?? undefined) as AnalysisMetrics | undefined);
      setWarnings(result.warnings ?? []);
      setTiming((result.timing ?? result.timings ?? {}) as Record<string, unknown>);
      setSelectedMethod(result.selected_method ?? 'unknown');
      setProcessingStatus(result.processing_status ?? 'unknown');
      setStatusMessage(result.message || 'Restoration complete.');
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
              <h2>Upload</h2>
              <span className="mini-badge">PNG • JPG • JPEG</span>
            </div>
            <ImageUploader onFileSelected={handleFileSelected} onRemove={handleRemoveImage} selectedFileName={selectedFile?.name} />

            <div style={{ marginTop: 18 }}>
              <MethodSelector selectedMethod={method} onChange={setMethod} disabled={loading} />
              <ProfileSelector selectedProfile={profile} onChange={setProfile} />
            </div>

            <div className="action-row">
              <button type="button" className="primary-button" onClick={handleEnhance} disabled={!selectedFile || loading || backendHealthy === false}>
                {loading ? 'Restoring...' : 'Restore Image'}
              </button>
              {enhancedImage && (
                <button type="button" className="secondary-button" onClick={handleDownload}>
                  Download result
                </button>
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
              <ImagePreview imageSrc={originalImage ?? undefined} label="Original image" />
              {enhancedImage && <ImagePreview imageSrc={enhancedImage} label="Restored result" />}
            </div>
          </div>
        </div>

        <div className="panel results-panel">
          <ComparisonView
            originalImage={originalImage ?? undefined}
            enhancedImage={enhancedImage ?? undefined}
            fusionMap={fusionMap}
            branchDisagreementMap={branchDisagreementMap}
            analysis={analysis}
            restoredAnalysis={restoredAnalysis}
            warnings={warnings}
            timing={timing}
            selectedMethod={selectedMethod}
            processingStatus={processingStatus}
            profile={profile}
            retryApplied={retryApplied}
          />
        </div>
      </div>
    </div>
  );
}
