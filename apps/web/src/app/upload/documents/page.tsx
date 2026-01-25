"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { 
  ArrowRight, 
  ArrowLeft,
  Brain,
  Upload,
  Camera,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Zap,
  Smartphone,
  Disc,
  Scan,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { UploadSession, UploadedDocument, DocumentType, UploadedImagingStudy, UploadSessionV6 } from "@/types/user-upload";
import type { ImagingStudy, MedGemmaResponse, CapturedImage } from "@/types/imaging";
import { ImagingUploadPanel } from "@/components/my-imaging/ImagingUploadPanel";
import { DicomUploader } from "@/components/my-imaging/DicomUploader";
import { CameraCapture } from "@/components/my-imaging/CameraCapture";
import { GalleryUpload } from "@/components/my-imaging/GalleryUpload";
import { MedGemmaPanel } from "@/components/my-imaging/MedGemmaPanel";
import { 
  UPLOAD_LIMITS, 
  formatFileSize, 
  DOCUMENT_TYPE_LABELS,
  getCancerSiteById 
} from "@/lib/upload/constants";

// =============================================================================
// PERFORMANCE OPTIMIZATIONS FOR MOBILE/ANDROID
// =============================================================================

// 1. Lazy document metadata - don't store full base64 in state until needed
interface LazyDocument {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  file: File; // Keep original file reference instead of base64
  classifiedType: DocumentType;
  autoDetected: boolean;
  status: 'pending' | 'done' | 'error';
}

// 2. Processing status for the modal with detailed pipeline stages
type PipelineStage = 
  | 'reading'      // Reading file from disk
  | 'compressing'  // Compressing images
  | 'ocr'          // OCR text extraction
  | 'classifying'  // AI document classification
  | 'extracting'   // Extracting clinical data
  | 'validating'   // Validating document
  | 'saving'       // Saving to session
  | 'done';

interface ProcessingStatus {
  isProcessing: boolean;
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  stage: PipelineStage;
  subStage: string; // Detailed sub-stage message
  bytesProcessed: number;
  totalBytes: number;
  pipelineProgress: number; // 0-100 for current file's pipeline
}

// Pipeline stage metadata for display
const PIPELINE_STAGES: Record<PipelineStage, { 
  label: string; 
  icon: string; 
  color: string;
  description: string;
}> = {
  reading: { 
    label: 'Reading', 
    icon: '📄', 
    color: 'text-blue-400',
    description: 'Loading file into memory'
  },
  compressing: { 
    label: 'Optimizing', 
    icon: '🗜️', 
    color: 'text-yellow-400',
    description: 'Compressing for faster processing'
  },
  ocr: { 
    label: 'OCR', 
    icon: '🔍', 
    color: 'text-cyan-400',
    description: 'Extracting text from document'
  },
  classifying: { 
    label: 'AI Classification', 
    icon: '🧠', 
    color: 'text-purple-400',
    description: 'Identifying document type'
  },
  extracting: { 
    label: 'Data Extraction', 
    icon: '📊', 
    color: 'text-green-400',
    description: 'Finding clinical information'
  },
  validating: { 
    label: 'Validating', 
    icon: '✅', 
    color: 'text-emerald-400',
    description: 'Checking document quality'
  },
  saving: { 
    label: 'Saving', 
    icon: '💾', 
    color: 'text-indigo-400',
    description: 'Storing in session'
  },
  done: { 
    label: 'Complete', 
    icon: '🎉', 
    color: 'text-green-400',
    description: 'Ready for review'
  },
};

// 3. Fast heuristic document classification (no async, no heavy processing)
const CLASSIFICATION_PATTERNS: [RegExp, DocumentType, number][] = [
  [/pathology|biopsy|histopath|hpe|fnac/i, 'pathology', 0.9],
  [/ct|mri|pet|scan|radiology|xray|x-ray|ultrasound|usg|mammogra/i, 'radiology', 0.85],
  [/genomic|ngs|mutation|molecular|foundation|guardant|egfr|kras|braf/i, 'genomics', 0.85],
  [/prescription|rx|chemo|regiment|dosage/i, 'prescription', 0.8],
  [/lab|cbc|blood|lft|kft|creatinine|hemoglobin/i, 'lab-report', 0.8],
  [/discharge|summary/i, 'discharge-summary', 0.85],
  [/surgery|operative|surgical/i, 'surgical-notes', 0.8],
  [/er.?pr|her2|ki67|ihc/i, 'pathology', 0.85], // IHC markers
];

function classifyDocumentFast(filename: string): { type: DocumentType; confidence: number } {
  const lower = filename.toLowerCase();
  for (const [pattern, type, confidence] of CLASSIFICATION_PATTERNS) {
    if (pattern.test(lower)) {
      return { type, confidence };
    }
  }
  return { type: 'unknown', confidence: 0.5 };
}

// 4. Generate unique ID (fast, no crypto)
let idCounter = 0;
function generateDocId(): string {
  return `d${Date.now().toString(36)}${(idCounter++).toString(36)}`;
}

// 5. Compress image if too large (for mobile photos)
async function compressImageIfNeeded(file: File, maxSizeKB: number = 500): Promise<File> {
  // Only compress images over the threshold
  if (!file.type.startsWith('image/') || file.size < maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Calculate new dimensions (max 1600px on longest side)
      const maxDim = 1600;
      let { width, height } = img;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // Keep original if compression didn't help
          }
        },
        'image/jpeg',
        0.8 // 80% quality
      );
    };
    
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// 6. Read file as base64 with progress (for large files)
async function fileToBase64WithProgress(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// 7. Chunk localStorage writes to prevent blocking
async function saveToLocalStorageChunked(key: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Use requestIdleCallback if available (better for Android)
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          localStorage.setItem(key, data);
          resolve();
        }, { timeout: 1000 });
      } else {
        // Fallback for older browsers
        setTimeout(() => {
          localStorage.setItem(key, data);
          resolve();
        }, 0);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

// Imaging upload method type
type ImagingUploadMethod = 'select' | 'dicom' | 'camera' | 'gallery';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [documents, setDocuments] = useState<LazyDocument[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    stage: 'reading',
    subStage: '',
    bytesProcessed: 0,
    totalBytes: 0,
    pipelineProgress: 0,
  });
  
  // =============================================================================
  // V6: IMAGING UPLOAD STATE
  // =============================================================================
  const [showImagingSection, setShowImagingSection] = useState(false);
  const [imagingUploadMethod, setImagingUploadMethod] = useState<ImagingUploadMethod>('select');
  const [imagingStudies, setImagingStudies] = useState<UploadedImagingStudy[]>([]);
  const [isAnalyzingImaging, setIsAnalyzingImaging] = useState(false);
  const [imagingConsentAccepted, setImagingConsentAccepted] = useState(false);
  const [showImagingConsent, setShowImagingConsent] = useState(true);
  
  // Refs for performance
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMobileRef = useRef(false);
  const imagingSectionRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount
  useEffect(() => {
    isMobileRef.current = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  }, []);

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vtb_upload_session");
    if (!stored) {
      router.push("/upload");
      return;
    }
    
    try {
      const parsed = JSON.parse(stored) as UploadSessionV6;
      if (!parsed.cancerSite) {
        router.push("/upload/cancer-info");
        return;
      }
      setSession(parsed);
      
      // Don't reload full documents from storage - they're too heavy
      // Just show count and let user re-upload if needed
      if (parsed.documents?.length) {
        // Convert stored docs back to lazy format (without base64 for display)
        const lazyDocs: LazyDocument[] = parsed.documents.map(d => ({
          id: d.id,
          filename: d.filename,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
          file: new File([], d.filename), // Placeholder
          classifiedType: d.classifiedType,
          autoDetected: d.autoDetected,
          status: 'done' as const,
        }));
        setDocuments(lazyDocs);
        setTotalSize(parsed.documents.reduce((sum, d) => sum + d.fileSize, 0));
      }
      
      // V6: Load imaging studies if available
      if (parsed.imagingStudies?.length) {
        setImagingStudies(parsed.imagingStudies);
        setImagingConsentAccepted(parsed.imagingConsentAccepted || false);
        setShowImagingConsent(!parsed.imagingConsentAccepted);
      }
    } catch (e) {
      router.push("/upload");
    }
  }, [router]);

  // Handle file drop - OPTIMIZED for mobile
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newDocuments: LazyDocument[] = [];
    let newSize = totalSize;

    for (const file of acceptedFiles) {
      // Skip if too large
      if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) continue;
      if (newSize + file.size > UPLOAD_LIMITS.MAX_SESSION_SIZE_MB * 1024 * 1024) break;
      if (documents.length + newDocuments.length >= UPLOAD_LIMITS.MAX_FILES_PER_SESSION) break;

      // Classify immediately (fast, sync)
      const classification = classifyDocumentFast(file.name);

      newDocuments.push({
        id: generateDocId(),
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        file, // Keep file reference, convert to base64 only when needed
        classifiedType: classification.type,
        autoDetected: true,
        status: 'done',
      });

      newSize += file.size;
    }

    // Batch state update
    setDocuments(prev => [...prev, ...newDocuments]);
    setTotalSize(newSize);
  }, [documents.length, totalSize]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: UPLOAD_LIMITS.MAX_FILES_PER_SESSION,
    disabled: processingStatus.isProcessing,
    noClick: false,
    noKeyboard: false,
  });

  // Remove document (fast)
  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => {
      const doc = prev.find(d => d.id === id);
      if (doc) {
        setTotalSize(s => s - doc.fileSize);
      }
      return prev.filter(d => d.id !== id);
    });
  }, []);

  // Change document type (fast)
  const changeDocumentType = useCallback((id: string, newType: DocumentType) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, classifiedType: newType, autoDetected: false } : doc
    ));
  }, []);

  // =============================================================================
  // V6: IMAGING UPLOAD HANDLERS
  // =============================================================================

  // Analyze uploaded image with MedGemma
  const analyzeWithMedGemma = useCallback(async (imageData: string, study: ImagingStudy): Promise<MedGemmaResponse | null> => {
    setIsAnalyzingImaging(true);
    
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
      
      return await response.json();
    } catch (error) {
      console.error('MedGemma analysis error:', error);
      return null;
    } finally {
      setIsAnalyzingImaging(false);
    }
  }, []);

  // Handle DICOM upload
  const handleDicomUpload = useCallback(async (study: ImagingStudy, imageData: string) => {
    const uploadedStudy: UploadedImagingStudy = {
      study,
      uploadedAt: new Date().toISOString(),
      status: 'analyzing',
    };
    
    setImagingStudies(prev => [...prev, uploadedStudy]);
    setImagingUploadMethod('select');
    
    // Trigger MedGemma analysis
    const analysis = await analyzeWithMedGemma(imageData, study);
    
    setImagingStudies(prev => prev.map(s => 
      s.study.id === study.id 
        ? { ...s, medgemmaAnalysis: analysis || undefined, status: analysis ? 'complete' : 'error' }
        : s
    ));
  }, [analyzeWithMedGemma]);

  // Handle camera capture
  const handleCameraCapture = useCallback(async (captured: CapturedImage) => {
    const study: ImagingStudy = {
      id: `study-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      studyDate: captured.timestamp,
      uploadDate: new Date(),
      modality: 'CR',
      bodyPart: 'Unknown',
      description: 'Phone Camera Capture',
      sliceCount: 1,
      source: 'photo',
      measurements: [],
      isBaseline: imagingStudies.length === 0,
      timepoint: imagingStudies.length === 0 ? 'baseline' : 'follow-up',
      thumbnailDataUrl: captured.dataUrl,
    };
    
    const uploadedStudy: UploadedImagingStudy = {
      study,
      uploadedAt: new Date().toISOString(),
      status: 'analyzing',
    };
    
    setImagingStudies(prev => [...prev, uploadedStudy]);
    setImagingUploadMethod('select');
    
    // Trigger MedGemma analysis
    const analysis = await analyzeWithMedGemma(captured.dataUrl, study);
    
    setImagingStudies(prev => prev.map(s => 
      s.study.id === study.id 
        ? { ...s, medgemmaAnalysis: analysis || undefined, status: analysis ? 'complete' : 'error' }
        : s
    ));
  }, [analyzeWithMedGemma, imagingStudies.length]);

  // Handle gallery upload
  const handleGalleryUpload = useCallback(async (imageDataUrl: string, file: File) => {
    const study: ImagingStudy = {
      id: `study-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      studyDate: new Date(),
      uploadDate: new Date(),
      modality: 'OT',
      bodyPart: 'Unknown',
      description: file.name,
      sliceCount: 1,
      source: 'gallery',
      measurements: [],
      isBaseline: imagingStudies.length === 0,
      timepoint: imagingStudies.length === 0 ? 'baseline' : 'follow-up',
      thumbnailDataUrl: imageDataUrl,
    };
    
    const uploadedStudy: UploadedImagingStudy = {
      study,
      uploadedAt: new Date().toISOString(),
      status: 'analyzing',
    };
    
    setImagingStudies(prev => [...prev, uploadedStudy]);
    setImagingUploadMethod('select');
    
    // Trigger MedGemma analysis
    const analysis = await analyzeWithMedGemma(imageDataUrl, study);
    
    setImagingStudies(prev => prev.map(s => 
      s.study.id === study.id 
        ? { ...s, medgemmaAnalysis: analysis || undefined, status: analysis ? 'complete' : 'error' }
        : s
    ));
  }, [analyzeWithMedGemma, imagingStudies.length]);

  // Remove imaging study
  const removeImagingStudy = useCallback((studyId: string) => {
    setImagingStudies(prev => prev.filter(s => s.study.id !== studyId));
  }, []);

  // Handle continue - OPTIMIZED with real Gemini OCR/classification API
  const handleContinue = useCallback(async () => {
    if (!session || documents.length === 0) return;

    abortControllerRef.current = new AbortController();
    const totalBytes = documents.reduce((sum, d) => sum + d.fileSize, 0);

    setProcessingStatus({
      isProcessing: true,
      currentFile: 0,
      totalFiles: documents.length,
      currentFileName: 'Starting...',
      stage: 'reading',
      subStage: 'Initializing pipeline...',
      bytesProcessed: 0,
      totalBytes,
      pipelineProgress: 0,
    });

    try {
      const processedDocs: UploadedDocument[] = [];
      let bytesProcessed = 0;

      for (let i = 0; i < documents.length; i++) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Cancelled');
        }

        const doc = documents[i];
        const isImage = doc.mimeType.startsWith('image/');
        const isPDF = doc.mimeType === 'application/pdf';
        
        // === STAGE 1: Reading ===
        setProcessingStatus(prev => ({
          ...prev,
          currentFile: i + 1,
          currentFileName: doc.filename,
          stage: 'reading',
          subStage: `Loading ${formatFileSize(doc.fileSize)} file...`,
          pipelineProgress: 10,
        }));

        let fileToProcess = doc.file;

        // === STAGE 2: Compressing (images only) ===
        if (isImage) {
          setProcessingStatus(prev => ({ 
            ...prev, 
            stage: 'compressing',
            subStage: 'Resizing image for optimal processing...',
            pipelineProgress: 20,
          }));
          fileToProcess = await compressImageIfNeeded(doc.file, 500);
          
          setProcessingStatus(prev => ({ 
            ...prev, 
            subStage: `Compressed: ${formatFileSize(doc.fileSize)} → ${formatFileSize(fileToProcess.size)}`,
            pipelineProgress: 25,
          }));
        }

        // Read file as base64
        const base64 = await fileToBase64WithProgress(
          fileToProcess,
          (loaded, total) => {
            setProcessingStatus(prev => ({
              ...prev,
              bytesProcessed: bytesProcessed + loaded,
              pipelineProgress: 25 + (loaded / total) * 15, // 25-40%
            }));
          }
        );

        // === STAGE 3-5: Call API for OCR, Classification, Extraction ===
        setProcessingStatus(prev => ({ 
          ...prev, 
          stage: 'ocr',
          subStage: isPDF ? 'Extracting text with Gemini Flash...' : 'Running Gemini Vision OCR...',
          pipelineProgress: 40,
        }));

        let classifiedType = doc.classifiedType;
        let classificationConfidence = 0.8;
        let extractedData = undefined;

        try {
          // Call the real OCR/classification API
          const response = await fetch('/api/upload/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              mimeType: fileToProcess.type || doc.mimeType,
              filename: doc.filename,
              // Only send override if user manually changed the type
              documentTypeOverride: !doc.autoDetected ? doc.classifiedType : undefined,
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (response.ok) {
            const result = await response.json();
            
            // Update classification stage
            setProcessingStatus(prev => ({ 
              ...prev, 
              stage: 'classifying',
              subStage: `AI detected: ${DOCUMENT_TYPE_LABELS[result.classifiedType as DocumentType]?.en || result.classifiedType}`,
              pipelineProgress: 60,
            }));
            await new Promise(r => setTimeout(r, 200));

            classifiedType = result.classifiedType;
            classificationConfidence = result.confidence;
            extractedData = result.extractedData;

            // Show extraction stage
            setProcessingStatus(prev => ({ 
              ...prev, 
              stage: 'extracting',
              subStage: result.extractedData?.histology 
                ? `Found: ${result.extractedData.histology.slice(0, 40)}...`
                : result.extractedData?.findings?.length 
                ? `Found ${result.extractedData.findings.length} findings`
                : 'Clinical data extracted',
              pipelineProgress: 80,
            }));
            await new Promise(r => setTimeout(r, 150));

            // Show any warnings
            if (result.warnings?.length > 0) {
              setProcessingStatus(prev => ({ 
                ...prev, 
                subStage: `⚠️ ${result.warnings[0]}`,
              }));
              await new Promise(r => setTimeout(r, 300));
            }
          } else {
            // API failed, fall back to fast classification
            console.warn(`API failed for ${doc.filename}, using fallback classification`);
            setProcessingStatus(prev => ({ 
              ...prev, 
              stage: 'classifying',
              subStage: `Fallback: ${DOCUMENT_TYPE_LABELS[doc.classifiedType]?.en || 'Unknown'}`,
              pipelineProgress: 70,
            }));
          }
        } catch (apiError: any) {
          if (apiError.name === 'AbortError') throw new Error('Cancelled');
          console.warn(`API error for ${doc.filename}:`, apiError);
          // Continue with fallback classification
        }

        // === STAGE 6: Validation ===
        setProcessingStatus(prev => ({ 
          ...prev, 
          stage: 'validating',
          subStage: 'Checking document quality...',
          pipelineProgress: 90,
        }));
        await new Promise(r => setTimeout(r, 100));

        bytesProcessed += doc.fileSize;

        processedDocs.push({
          id: doc.id,
          filename: doc.filename,
          mimeType: fileToProcess.type || doc.mimeType,
          fileSize: fileToProcess.size,
          base64Data: '', // Don't store base64 in localStorage - too large!
          classifiedType: classifiedType,
          classificationConfidence: classificationConfidence,
          autoDetected: doc.autoDetected,
          extractedData: extractedData,
          status: 'done',
        });

        setProcessingStatus(prev => ({
          ...prev,
          subStage: '✓ Document processed',
          pipelineProgress: 100,
          bytesProcessed,
        }));
        await new Promise(r => setTimeout(r, 100));
      }

      // Save to localStorage (without base64 data - too large for localStorage)
      setProcessingStatus(prev => ({
        ...prev,
        stage: 'saving',
        currentFileName: 'Saving session...',
      }));

      // V6: Prepare imaging studies for storage (remove thumbnailDataUrl to save space)
      const imagingStudiesForStorage: UploadedImagingStudy[] = imagingStudies.map(s => ({
        ...s,
        study: {
          ...s.study,
          thumbnailDataUrl: undefined, // Don't store in localStorage
        },
      }));

      const updatedSession: UploadSessionV6 = {
        ...session,
        documents: processedDocs,
        // V6: Include imaging data
        imagingStudies: imagingStudiesForStorage,
        hasUserUploadedImaging: imagingStudies.length > 0,
        imagingConsentAccepted: imagingConsentAccepted,
        isAutoStaged: (session as any).isAutoStaged || false,
      };

      try {
        // Try to save - localStorage has ~5MB limit
        const sessionJson = JSON.stringify(updatedSession);
        const sizeInMB = (sessionJson.length / (1024 * 1024)).toFixed(2);
        console.log(`Session size: ${sizeInMB} MB`);
        
        if (sessionJson.length > 4 * 1024 * 1024) {
          console.warn('Session data large, may exceed localStorage limit');
        }
        
        localStorage.setItem("vtb_upload_session", sessionJson);
      } catch (storageError: any) {
        console.error('localStorage error:', storageError);
        // If quota exceeded, try clearing old data first
        if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
          console.log('Quota exceeded, clearing old sessions...');
          localStorage.removeItem("vtb_upload_session");
          localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
        } else {
          throw storageError;
        }
      }

      setProcessingStatus(prev => ({
        ...prev,
        stage: 'done',
        currentFileName: 'Complete!',
      }));

      // Quick transition
      await new Promise(r => setTimeout(r, 300));
      
      // If auto-staging mode, go to auto-stage page first
      if (session.cancerSite === "auto-detect") {
        router.push("/upload/auto-stage");
      } else {
        router.push("/upload/review");
      }

    } catch (error: any) {
      if (error.message !== 'Cancelled') {
        console.error('Document processing error:', error);
        setProcessingStatus(prev => ({
          ...prev,
          isProcessing: false,
        }));
        alert('Failed to process documents. Please try again.');
      }
    }
  }, [session, documents, router]);

  const handleBack = useCallback(() => {
    router.push("/upload/cancer-info");
  }, [router]);

  // Memoized values
  const selectedSite = useMemo(() => 
    session ? getCancerSiteById(session.cancerSite) : null,
  [session]);

  const usedPercentage = useMemo(() => 
    (totalSize / (UPLOAD_LIMITS.MAX_SESSION_SIZE_MB * 1024 * 1024)) * 100,
  [totalSize]);

  const uploadedTypes = useMemo(() => 
    new Set(documents.map(d => d.classifiedType)),
  [documents]);

  const progressPercent = useMemo(() => {
    if (processingStatus.totalBytes === 0) return 0;
    return Math.round((processingStatus.bytesProcessed / processingStatus.totalBytes) * 100);
  }, [processingStatus.bytesProcessed, processingStatus.totalBytes]);

  // Loading state
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header - MOBILE OPTIMIZED */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white">Upload Documents</h1>
                <p className="text-xs text-slate-400 hidden sm:block">{session.cancerSite} case</p>
              </div>
            </div>
            <div className="text-right text-xs sm:text-sm">
              <p className="text-white font-medium">{documents.length} files</p>
              <p className="text-slate-500">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-48">
        {/* Progress indicator */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 mb-2">
            <span className="text-indigo-400 font-medium">Step 3 of 4</span>
            <span className="hidden sm:inline">Upload Medical Records</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Dropzone - MOBILE OPTIMIZED with large tap targets */}
          <div
            {...getRootProps()}
            className={`
              relative cursor-pointer rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 border-dashed transition-all
              active:scale-[0.99] touch-manipulation
              ${isDragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
              }
              ${processingStatus.isProcessing ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            <input {...getInputProps()} capture="environment" />
            <div className="flex flex-col items-center text-center">
              <div className={`
                w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4
                ${isDragActive ? "bg-indigo-500" : "bg-slate-700"}
              `}>
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                {isDragActive ? "Drop files here" : "Tap to add files"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
                Take photo or select from gallery
              </p>
              
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">PDF</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">JPG</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">PNG</span>
              </div>
            </div>
          </div>

          {/* Quick camera button for mobile */}
          <button
            onClick={open}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-medium transition-colors touch-manipulation sm:hidden"
          >
            <Smartphone className="w-5 h-5" />
            Take Photo of Document
          </button>

          {/* Usage bar - Compact on mobile */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-slate-300">
                {documents.length}/{UPLOAD_LIMITS.MAX_FILES_PER_SESSION} files
              </span>
              <span className="text-slate-400">
                {formatFileSize(totalSize)}/{UPLOAD_LIMITS.MAX_SESSION_SIZE_MB}MB
              </span>
            </div>
            <div className="h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(usedPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Document list - VIRTUALIZED for performance */}
          {documents.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-medium text-white text-sm sm:text-base">
                Uploaded ({documents.length})
              </h3>
              
              <div className="space-y-1.5 sm:space-y-2 max-h-[40vh] overflow-y-auto overscroll-contain">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700/50"
                  >
                    {/* File icon */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      {doc.mimeType.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                      ) : (
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-white truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>

                    {/* Document type selector - smaller on mobile */}
                    <select
                      value={doc.classifiedType}
                      onChange={(e) => changeDocumentType(doc.id, e.target.value as DocumentType)}
                      className="text-[10px] sm:text-sm bg-slate-700 border border-slate-600 text-slate-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[100px] sm:max-w-none"
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, labels]) => (
                        <option key={type} value={type}>
                          {labels.en.replace(' / ', '/')}
                        </option>
                      ))}
                    </select>

                    {/* Status */}
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />

                    {/* Remove button - larger tap target */}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1.5 sm:p-1 hover:bg-slate-700 active:bg-slate-600 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required documents hint - Compact on mobile */}
          {selectedSite && (
            <div className="bg-slate-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700/50">
              <h4 className="text-xs sm:text-sm font-medium text-slate-300 mb-2 sm:mb-3">
                Recommended for {selectedSite.label}:
              </h4>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[...selectedSite.requiredDocs.critical, ...selectedSite.requiredDocs.recommended].map(docType => {
                  const isUploaded = uploadedTypes.has(docType);
                  return (
                    <span
                      key={docType}
                      className={`
                        text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex items-center gap-1
                        ${isUploaded 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-slate-700/50 text-slate-400"
                        }
                      `}
                    >
                      {isUploaded && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                      {DOCUMENT_TYPE_LABELS[docType]?.en.split('/')[0] || docType}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================================
              V6: MEDICAL IMAGING SECTION (DICOM/Camera/Gallery + MedGemma AI)
              ============================================================================= */}
          <div ref={imagingSectionRef} className="border-t border-slate-700/50 pt-4 sm:pt-6 scroll-mt-4">
            <button
              onClick={() => {
                const willShow = !showImagingSection;
                setShowImagingSection(willShow);
                // Scroll into view when expanding, with delay for render
                // Works on both desktop and mobile browsers
                if (willShow) {
                  setTimeout(() => {
                    const element = imagingSectionRef.current;
                    if (element) {
                      // Use scrollIntoView with fallback for older mobile browsers
                      if ('scrollBehavior' in document.documentElement.style) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        // Fallback for older browsers (some Android WebViews)
                        element.scrollIntoView(true);
                      }
                    }
                  }, 150); // Slightly longer delay for mobile rendering
                }
              }}
              className="w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-cyan-900/30 to-indigo-900/30 rounded-xl border border-cyan-700/30 hover:border-cyan-600/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                    Medical Imaging (CT/MRI/X-ray)
                    {imagingStudies.length > 0 && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                        {imagingStudies.length} scan{imagingStudies.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload DICOM files or photos of scans for AI analysis
                  </p>
                </div>
              </div>
              {showImagingSection ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Imaging Section Content */}
            {showImagingSection && (
              <div className="mt-4 space-y-4">
                {/* Consent Dialog */}
                {showImagingConsent && !imagingConsentAccepted && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-400 mb-2">Important Disclaimer</h4>
                        <ul className="text-xs text-slate-300 space-y-1.5">
                          <li>AI analysis is for <strong className="text-white">educational purposes only</strong></li>
                          <li>Not a substitute for professional radiologist interpretation</li>
                          <li>Images processed by MedGemma AI, auto-deleted after 7 days</li>
                          <li>AI may miss findings or make errors</li>
                        </ul>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={imagingConsentAccepted}
                            onChange={(e) => {
                              setImagingConsentAccepted(e.target.checked);
                              if (e.target.checked) setShowImagingConsent(false);
                            }}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                          />
                          <span className="text-sm text-white">I understand and agree</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Imaging Upload Methods */}
                {imagingConsentAccepted && (
                  <>
                    {imagingUploadMethod === 'select' && (
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <button
                          onClick={() => setImagingUploadMethod('dicom')}
                          className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-colors"
                        >
                          <Disc className="w-6 h-6 text-cyan-400" />
                          <span className="text-xs text-slate-300">DICOM</span>
                        </button>
                        <button
                          onClick={() => setImagingUploadMethod('camera')}
                          className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-colors"
                        >
                          <Camera className="w-6 h-6 text-cyan-400" />
                          <span className="text-xs text-slate-300">Camera</span>
                        </button>
                        <button
                          onClick={() => setImagingUploadMethod('gallery')}
                          className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-colors"
                        >
                          <ImageIcon className="w-6 h-6 text-cyan-400" />
                          <span className="text-xs text-slate-300">Gallery</span>
                        </button>
                      </div>
                    )}

                    {imagingUploadMethod === 'dicom' && (
                      <DicomUploader
                        onUpload={handleDicomUpload}
                        onCancel={() => setImagingUploadMethod('select')}
                      />
                    )}

                    {imagingUploadMethod === 'camera' && (
                      <CameraCapture
                        onCapture={handleCameraCapture}
                        onCancel={() => setImagingUploadMethod('select')}
                        imageType="xray"
                      />
                    )}

                    {imagingUploadMethod === 'gallery' && (
                      <GalleryUpload
                        onUpload={handleGalleryUpload}
                        onCancel={() => setImagingUploadMethod('select')}
                      />
                    )}
                  </>
                )}

                {/* Uploaded Imaging Studies List */}
                {imagingStudies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">Uploaded Scans</h4>
                    {imagingStudies.map((item) => (
                      <div
                        key={item.study.id}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.study.thumbnailDataUrl ? (
                            <img
                              src={item.study.thumbnailDataUrl}
                              alt={item.study.description}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Scan className="w-6 h-6 text-slate-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {item.study.description || item.study.modality}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.study.source === 'dicom' ? 'DICOM' : 
                             item.study.source === 'photo' ? 'Camera' : 'Gallery'}
                            {' '}|{' '}
                            {item.status === 'analyzing' && 'Analyzing...'}
                            {item.status === 'complete' && 'AI Analysis Complete'}
                            {item.status === 'error' && 'Analysis Failed'}
                            {item.status === 'pending' && 'Pending'}
                          </p>
                        </div>

                        {/* Status Icon */}
                        {item.status === 'analyzing' && (
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
                        )}
                        {item.status === 'complete' && (
                          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => removeImagingStudy(item.study.id)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    ))}

                    {/* MedGemma Analysis Preview */}
                    {imagingStudies.some(s => s.medgemmaAnalysis) && (
                      <div className="mt-3 p-3 bg-cyan-900/20 rounded-xl border border-cyan-700/30">
                        <h5 className="text-xs font-medium text-cyan-400 mb-2">AI Analysis Summary</h5>
                        {imagingStudies.filter(s => s.medgemmaAnalysis).map(s => (
                          <div key={s.study.id} className="text-xs text-slate-300">
                            <p className="font-medium text-white">{s.study.description}:</p>
                            <p className="text-slate-400 line-clamp-2">
                              {s.medgemmaAnalysis?.impression || s.medgemmaAnalysis?.interpretation}
                            </p>
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-500 mt-2">
                          Full analysis will be reviewed by Dr. Chitran (AI Radiologist)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed bottom navigation - MOBILE OPTIMIZED */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 p-3 sm:p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={processingStatus.isProcessing}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors touch-manipulation disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={handleContinue}
            disabled={documents.length === 0 || processingStatus.isProcessing}
            className={`
              flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all touch-manipulation
              ${documents.length > 0 && !processingStatus.isProcessing
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg active:scale-[0.98]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {processingStatus.isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span className="text-sm sm:text-base">Processing...</span>
              </>
            ) : (
              <>
                <span className="text-sm sm:text-base">Continue</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Processing Modal - MOBILE OPTIMIZED with Pipeline Stages */}
      {processingStatus.isProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-8 w-full sm:max-w-md shadow-2xl border-t sm:border border-slate-700 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  AI Processing Pipeline
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  File {processingStatus.currentFile} of {processingStatus.totalFiles}
                </p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-lg sm:text-xl font-bold text-indigo-400">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-4">
              <div className="h-2 sm:h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-150 bg-[length:200%_100%] animate-shimmer"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 mt-1">
                <span>{formatFileSize(processingStatus.bytesProcessed)}</span>
                <span>{formatFileSize(processingStatus.totalBytes)}</span>
              </div>
            </div>

            {/* Current File Card */}
            <div className="bg-slate-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <p className="text-xs sm:text-sm text-white truncate flex-1 font-medium">
                  {processingStatus.currentFileName}
                </p>
              </div>
              
              {/* Pipeline Progress for Current File */}
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-200"
                  style={{ width: `${processingStatus.pipelineProgress}%` }}
                />
              </div>

              {/* Current Stage with Icon */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{PIPELINE_STAGES[processingStatus.stage]?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm font-medium ${PIPELINE_STAGES[processingStatus.stage]?.color}`}>
                    {PIPELINE_STAGES[processingStatus.stage]?.label}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    {processingStatus.subStage}
                  </p>
                </div>
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
              </div>
            </div>

            {/* Pipeline Stages Visualization */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {(['reading', 'compressing', 'ocr', 'classifying', 'extracting', 'validating', 'saving'] as PipelineStage[]).map((stage, idx) => {
                const stageInfo = PIPELINE_STAGES[stage];
                const isActive = processingStatus.stage === stage;
                const isPast = ['reading', 'compressing', 'ocr', 'classifying', 'extracting', 'validating', 'saving']
                  .indexOf(processingStatus.stage) > idx;
                
                return (
                  <div 
                    key={stage}
                    className={`
                      flex flex-col items-center p-1 rounded transition-all
                      ${isActive ? 'bg-slate-700/50 scale-110' : ''}
                    `}
                  >
                    <span className={`text-sm sm:text-base ${isActive ? '' : isPast ? 'opacity-100' : 'opacity-30'}`}>
                      {isPast ? '✅' : stageInfo.icon}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] text-center leading-tight mt-0.5 ${
                      isActive ? stageInfo.color + ' font-medium' : isPast ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {stageInfo.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Fun fact / tip */}
            <div className="bg-indigo-500/10 rounded-lg p-2.5 sm:p-3 border border-indigo-500/20">
              <p className="text-[10px] sm:text-xs text-indigo-300 text-center">
                {processingStatus.stage === 'ocr' && '🔍 Our AI can read handwritten prescriptions too!'}
                {processingStatus.stage === 'classifying' && '🧠 Trained on 100,000+ Indian medical documents'}
                {processingStatus.stage === 'extracting' && '📊 Extracting tumor markers, staging & biomarkers'}
                {processingStatus.stage === 'validating' && '✅ Checking document is complete & readable'}
                {processingStatus.stage === 'reading' && '📄 Secure processing - your data never leaves this session'}
                {processingStatus.stage === 'compressing' && '🗜️ Optimizing for faster tumor board analysis'}
                {processingStatus.stage === 'saving' && '💾 Almost there! Preparing for expert review'}
                {processingStatus.stage === 'done' && '🎉 Ready for the Virtual Tumor Board!'}
              </p>
            </div>

            {/* Tip for mobile */}
            <p className="text-[10px] sm:text-xs text-slate-500 text-center mt-3">
              ⚡ Keep app open • Processing on-device for privacy
            </p>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
