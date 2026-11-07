import { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { WorkspaceSection } from '../components/Workspace/WorkspaceSection';
import { ResultsStory } from '../components/Results/ResultsStory';
import { PipelineSection } from '../components/Pipeline/PipelineSection';
import { UserGuide } from '../components/Guide/UserGuide';

import { enhanceImage } from '../services/api';
import type { EnhancementResponse, ImageProfile, RestorationMode } from '../types/image';
import type { RoiRect } from '../utils/roiCoordinates';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'pipeline' | 'guide'>('workspace');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<ImageProfile>('natural');
  const [selectedMode, setSelectedMode] = useState<RestorationMode>('hybrid');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<EnhancementResponse | null>(null);

  // Region Inspector natural pixel ROI state
  const [roi, setRoi] = useState<RoiRect>({
    x: 100,
    y: 100,
    width: 80,
    height: 80,
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync original image object URL
  useEffect(() => {
    if (!selectedFile) {
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
      setOriginalImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setOriginalImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  // Step 3 execution flow with step indices
  const handleRunRestoration = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStepIndex(0); // Analysing the image

    const t1 = setTimeout(() => setCurrentStepIndex(1), 350); // Classical rules
    const t2 = setTimeout(() => setCurrentStepIndex(2), 950); // Neural network
    const t3 = setTimeout(() => setCurrentStepIndex(3), 1600); // Combining both
    const t4 = setTimeout(() => setCurrentStepIndex(4), 2100); // Checking quality

    try {
      const res = await enhanceImage(selectedFile, profile, selectedMode);
      setResponse(res);
      setIsProcessing(false);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: unknown) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Failed to enhance image.';
      setErrorMessage(msg);
    }
  };

  // Determine active restored image based on selected mode
  const getActiveRestoredImage = (): string | null => {
    if (!response) return null;
    if (selectedMode === 'classical') {
      return response.classical_image || response.classical_output || response.final_image || null;
    }
    if (selectedMode === 'deep') {
      return response.deep_image || response.deep_output || response.final_image || null;
    }
    return response.hybrid_image || response.hybrid_output || response.final_image || null;
  };

  const activeRestoredImage = getActiveRestoredImage();

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'guide' ? (
          /* User Guide Page */
          <UserGuide onGoToWorkspace={() => setActiveTab('workspace')} />
        ) : activeTab === 'pipeline' ? (
          /* How it works pipeline diagram page */
          <div style={{ padding: '24px 0' }}>
            <div className="content-wrapper">
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1A2433' }}>
                  How LightMap Works
                </h2>
                <p style={{ fontSize: '13px', color: '#5B6778', marginTop: '2px' }}>
                  Decomposition graphs and execution stages for Classical CV, Retinexformer, and Adaptive Hybrid.
                </p>
              </div>

              <PipelineSection
                response={response || { status: 'idle', message: '', profile }}
                originalImage={originalImageUrl || ''}
                selectedMode={selectedMode}
              />
            </div>
          </div>
        ) : (
          /* Main Guided 4-Step Workspace Flow */
          <>
            {/* Step 1, Step 2, Step 3: Workspace */}
            <WorkspaceSection
              selectedFile={selectedFile}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setResponse(null);
                setErrorMessage(null);
              }}
              profile={profile}
              onProfileSelect={setProfile}
              selectedMode={selectedMode}
              onModeSelect={setSelectedMode}
              onRunRestoration={handleRunRestoration}
              isProcessing={isProcessing}
              currentStepIndex={currentStepIndex}
              errorMessage={errorMessage}
            />

            {/* Step 4: Results Story */}
            {response && originalImageUrl && activeRestoredImage && (
              <div ref={resultsRef}>
                <ResultsStory
                  response={response}
                  originalImage={originalImageUrl}
                  activeRestoredImage={activeRestoredImage}
                  selectedMode={selectedMode}
                  roi={roi}
                  onChangeRoi={setRoi}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
