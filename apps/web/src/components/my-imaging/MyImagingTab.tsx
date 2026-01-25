"use client";

/**
 * MyImagingTab - Main container for user's own scan uploads
 * Supports DICOM files, phone camera capture, and gallery uploads
 */

import { useState, useCallback } from "react";
import { 
  Upload, Camera, Image as ImageIcon, Disc, 
  FolderOpen, Smartphone, AlertCircle, CheckCircle,
  Loader2, X, ChevronRight
} from "lucide-react";
import { ImagingUploadPanel } from "./ImagingUploadPanel";
import { DicomUploader } from "./DicomUploader";
import { CameraCapture } from "./CameraCapture";
import { GalleryUpload } from "./GalleryUpload";
import { MedGemmaPanel } from "./MedGemmaPanel";
import { 
  ImagingStudy, 
  MedGemmaResponse, 
  UploadedFile,
  CapturedImage
} from "@/types/imaging";

type UploadMethod = 'select' | 'dicom' | 'camera' | 'gallery';

interface MyImagingTabProps {
  caseId?: string;
  onImagingReady?: (study: ImagingStudy, analysis: MedGemmaResponse) => void;
}

export function MyImagingTab({ caseId, onImagingReady }: MyImagingTabProps) {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('select');
  const [currentStudy, setCurrentStudy] = useState<ImagingStudy | null>(null);
  const [medgemmaAnalysis, setMedgemmaAnalysis] = useState<MedGemmaResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsent, setShowConsent] = useState(true);

  const handleDicomUpload = useCallback(async (study: ImagingStudy, imageData: string) => {
    setCurrentStudy(study);
    setUploadMethod('select');
    
    // Trigger MedGemma analysis
    await analyzeWithMedGemma(imageData, study);
  }, []);

  const handleCameraCapture = useCallback(async (captured: CapturedImage) => {
    const study: ImagingStudy = {
      id: `study-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      studyDate: captured.timestamp,
      uploadDate: new Date(),
      modality: 'CR', // Computed Radiography / Photo
      bodyPart: 'Unknown',
      description: 'Phone Camera Capture',
      sliceCount: 1,
      source: 'photo',
      measurements: [],
      isBaseline: true,
      timepoint: 'baseline',
      thumbnailDataUrl: captured.dataUrl,
    };
    
    setCurrentStudy(study);
    setUploadMethod('select');
    
    // Trigger MedGemma analysis
    await analyzeWithMedGemma(captured.dataUrl, study);
  }, []);

  const handleGalleryUpload = useCallback(async (imageDataUrl: string, file: File) => {
    const study: ImagingStudy = {
      id: `study-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      studyDate: new Date(),
      uploadDate: new Date(),
      modality: 'OT', // Other
      bodyPart: 'Unknown',
      description: file.name,
      sliceCount: 1,
      source: 'gallery',
      measurements: [],
      isBaseline: true,
      timepoint: 'baseline',
      thumbnailDataUrl: imageDataUrl,
    };
    
    setCurrentStudy(study);
    setUploadMethod('select');
    
    // Trigger MedGemma analysis
    await analyzeWithMedGemma(imageDataUrl, study);
  }, []);

  const analyzeWithMedGemma = async (imageData: string, study: ImagingStudy) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const response = await fetch('/api/imaging/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          modality: study.modality,
          bodyPart: study.bodyPart,
          source: study.source,
          analysisType: 'oncology',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      setMedgemmaAnalysis(result);
      
      if (onImagingReady) {
        onImagingReady(study, result);
      }
    } catch (error) {
      console.error('MedGemma analysis error:', error);
      setAnalysisError('Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setCurrentStudy(null);
    setMedgemmaAnalysis(null);
    setUploadMethod('select');
    setAnalysisError(null);
  };

  // Consent Dialog
  if (showConsent && !consentAccepted) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Important Disclaimer</h2>
          </div>
          
          <div className="space-y-4 text-slate-300 text-sm">
            <p>By uploading medical images, you acknowledge and agree:</p>
            
            <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <div>
                  <span className="font-semibold text-white">EDUCATIONAL PURPOSE ONLY</span>
                  <p className="text-slate-400">This AI analysis is for educational and informational purposes. It is NOT a substitute for professional radiologist interpretation.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <div>
                  <span className="font-semibold text-white">DATA HANDLING</span>
                  <p className="text-slate-400">Your images will be processed by AI (MedGemma). Personal health information will be stripped. Images are auto-deleted after 7 days.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                <div>
                  <span className="font-semibold text-white">ACCURACY LIMITATIONS</span>
                  <p className="text-slate-400">AI may miss findings or make errors. Always consult a qualified radiologist for diagnosis.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">4.</span>
                <div>
                  <span className="font-semibold text-white">MEDICAL EMERGENCY</span>
                  <p className="text-slate-400">If you have a medical emergency, contact your doctor or emergency services immediately.</p>
                </div>
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input 
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-white">I have read and agree to these terms</span>
            </label>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowConsent(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConsent(false)}
              disabled={!consentAccepted}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              I Understand, Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Content
  return (
    <div className="space-y-6">
      {/* Current Study & Analysis View */}
      {currentStudy && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-medium text-white">{currentStudy.description}</h3>
                <p className="text-sm text-slate-400">
                  {currentStudy.modality} | {currentStudy.source === 'dicom' ? 'DICOM Upload' : 
                   currentStudy.source === 'photo' ? 'Camera Capture' : 'Gallery Upload'}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {/* Image Preview */}
            <div className="bg-slate-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              {currentStudy.thumbnailDataUrl ? (
                <img 
                  src={currentStudy.thumbnailDataUrl} 
                  alt="Uploaded scan"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-slate-500 text-center">
                  <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>DICOM Preview</p>
                </div>
              )}
            </div>
            
            {/* Analysis Panel */}
            <div className="space-y-4">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                  <p className="text-white font-medium">Analyzing with MedGemma...</p>
                  <p className="text-sm text-slate-400 mt-1">This may take 10-15 seconds</p>
                </div>
              ) : analysisError ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Analysis Error</span>
                  </div>
                  <p className="text-sm text-slate-300">{analysisError}</p>
                  <button
                    onClick={() => currentStudy.thumbnailDataUrl && analyzeWithMedGemma(currentStudy.thumbnailDataUrl, currentStudy)}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors"
                  >
                    Retry Analysis
                  </button>
                </div>
              ) : medgemmaAnalysis ? (
                <MedGemmaPanel 
                  analysis={medgemmaAnalysis}
                  studyId={currentStudy.id}
                />
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>Analysis will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Method Selection */}
      {!currentStudy && (
        <>
          {uploadMethod === 'select' && (
            <ImagingUploadPanel 
              onSelectMethod={setUploadMethod}
            />
          )}
          
          {uploadMethod === 'dicom' && (
            <DicomUploader 
              onUpload={handleDicomUpload}
              onCancel={() => setUploadMethod('select')}
            />
          )}
          
          {uploadMethod === 'camera' && (
            <CameraCapture 
              onCapture={handleCameraCapture}
              onCancel={() => setUploadMethod('select')}
              imageType="xray"
            />
          )}
          
          {uploadMethod === 'gallery' && (
            <GalleryUpload 
              onUpload={handleGalleryUpload}
              onCancel={() => setUploadMethod('select')}
            />
          )}
        </>
      )}

      {/* Add Another Scan */}
      {currentStudy && !isAnalyzing && (
        <button
          onClick={handleReset}
          className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Another Scan
        </button>
      )}
    </div>
  );
}
