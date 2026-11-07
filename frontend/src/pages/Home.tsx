import { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { HeroStrip } from '../components/Layout/HeroStrip';
import { Footer } from '../components/Layout/Footer';
import { WorkspaceSection } from '../components/Workspace/WorkspaceSection';
import { CompareViewer } from '../components/Viewer/CompareViewer';
import { RegionInspector } from '../components/Viewer/RegionInspector';
import { ExplainabilityMaps } from '../components/Viewer/ExplainabilityMaps';
import { PipelineSection } from '../components/Pipeline/PipelineSection';
import { AnalysisSection } from '../components/Analysis/AnalysisSection';
import { MethodologySection } from '../components/Methodology/MethodologySection';

import { enhanceImage } from '../services/api';
import type { EnhancementResponse, ImageProfile, RestorationMode } from '../types/image';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<ImageProfile>('natural');
  const [selectedMode, setSelectedMode] = useState<RestorationMode>('hybrid');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<EnhancementResponse | null>(null);

  // Region Inspector ROI state
  const [roi, setRoi] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 80,
    y: 80,
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

  // Handle smooth scroll to section
  const handleScrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Execution flow
  const handleRunRestoration = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStepMessage('Analyzing illumination condition and noise characteristics...');

    const timer1 = setTimeout(() => {
      setCurrentStepMessage('Executing Classical Retinex and Bilateral filtering...');
    }, 400);

    const timer2 = setTimeout(() => {
      setCurrentStepMessage('Running Retinexformer transformer self-attention...');
    }, 1100);

    const timer3 = setTimeout(() => {
      setCurrentStepMessage('Computing IAAF spatial fusion matrix and Quality Guardian check...');
    }, 1800);

    try {
      // Backend automatically computes classical, deep, and hybrid
      const res = await enhanceImage(selectedFile, profile, selectedMode);
      setResponse(res);
      setIsProcessing(false);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      // Smooth scroll to results
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'An error occurred during restoration.';
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
    <div className="app-container">
      {/* 1. Top Navigation Bar */}
      <Navbar onScrollTo={handleScrollTo} />

      {/* 2. Hero Strip */}
      <HeroStrip onUploadClick={() => handleScrollTo('workspace')} />

      {/* 3. Workspace Section with Method Selector */}
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
        currentStepMessage={currentStepMessage}
        errorMessage={errorMessage}
      />

      {/* 5. Results Section (Appears after restoration) */}
      {response && originalImageUrl && activeRestoredImage && (
        <div ref={resultsRef} id="results" style={{ padding: '16px 0 32px 0' }}>
          <div className="content-wrapper">
            <div className="section-header">
              <h2 className="section-title">
                Restoration Diagnostics &amp; Comparison
              </h2>
              <p className="section-description">
                Interactive comparison viewer, ROI pixel magnifier, and explainability heatmaps for mode: <strong>{selectedMode.toUpperCase()}</strong>.
              </p>
            </div>

            {/* A. Before / After Comparison Viewer */}
            <CompareViewer
              originalImage={originalImageUrl}
              restoredImage={activeRestoredImage}
              selectedMode={selectedMode}
              response={response}
              onRoiSelect={setRoi}
              roi={roi}
            />

            {/* B. Region Inspector (ROI Pixel Magnifier) */}
            <RegionInspector
              originalImage={originalImageUrl}
              restoredImage={activeRestoredImage}
              roi={roi}
              onChangeRoi={setRoi}
            />

            {/* C. Explainability Maps */}
            <ExplainabilityMaps
              originalImage={originalImageUrl}
              fusionMap={response.fusion_map}
              disagreementMap={response.disagreement_map}
              changeMap={response.change_map}
            />
          </div>
        </div>
      )}

      {/* 6. Pipeline Section */}
      {response && originalImageUrl && (
        <PipelineSection
          response={response}
          originalImage={originalImageUrl}
          selectedMode={selectedMode}
          onSelectStageImage={(_stageImg) => {
            // stage preview
          }}
        />
      )}

      {/* 7. Analysis Section */}
      {response && (
        <AnalysisSection
          response={response}
          onSelectGridCell={(bbox) => {
            setRoi({ x: bbox[0], y: bbox[1], width: bbox[2], height: bbox[3] });
            const insp = document.getElementById('results');
            if (insp) insp.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* 8. Methodology Section */}
      <MethodologySection />

      {/* 9. Minimal 1-line Footer */}
      <Footer />
    </div>
  );
}
