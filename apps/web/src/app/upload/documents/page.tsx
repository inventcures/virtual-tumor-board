"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { 
  ArrowRight, 
  ArrowLeft,
  Brain,
  Upload,
  Camera,
  File,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Zap
} from "lucide-react";
import type { UploadSession, UploadedDocument, DocumentType } from "@/types/user-upload";
import { 
  UPLOAD_LIMITS, 
  formatFileSize, 
  DOCUMENT_TYPE_LABELS,
  getCancerSiteById 
} from "@/lib/upload/constants";

// Processing status for the modal
interface ProcessingStatus {
  isProcessing: boolean;
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  stage: 'saving' | 'compressing' | 'done';
  error?: string;
}

// Simple heuristic document classification
function classifyDocument(filename: string, text?: string): { type: DocumentType; confidence: number } {
  const lowerFilename = filename.toLowerCase();
  
  // Check filename patterns
  if (lowerFilename.includes('pathology') || lowerFilename.includes('biopsy') || lowerFilename.includes('histopath')) {
    return { type: 'pathology', confidence: 0.9 };
  }
  if (lowerFilename.includes('ct') || lowerFilename.includes('mri') || lowerFilename.includes('pet') || lowerFilename.includes('scan') || lowerFilename.includes('radiology')) {
    return { type: 'radiology', confidence: 0.85 };
  }
  if (lowerFilename.includes('genomic') || lowerFilename.includes('ngs') || lowerFilename.includes('mutation') || lowerFilename.includes('molecular')) {
    return { type: 'genomics', confidence: 0.85 };
  }
  if (lowerFilename.includes('prescription') || lowerFilename.includes('rx') || lowerFilename.includes('chemo')) {
    return { type: 'prescription', confidence: 0.8 };
  }
  if (lowerFilename.includes('lab') || lowerFilename.includes('cbc') || lowerFilename.includes('blood')) {
    return { type: 'lab-report', confidence: 0.8 };
  }
  if (lowerFilename.includes('discharge')) {
    return { type: 'discharge-summary', confidence: 0.85 };
  }
  if (lowerFilename.includes('surgery') || lowerFilename.includes('operative')) {
    return { type: 'surgical-notes', confidence: 0.8 };
  }
  
  return { type: 'unknown', confidence: 0.5 };
}

// Generate unique ID
function generateDocId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    stage: 'saving',
  });

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vtb_upload_session");
    if (!stored) {
      router.push("/upload");
      return;
    }
    
    try {
      const parsed: UploadSession = JSON.parse(stored);
      if (!parsed.cancerSite) {
        router.push("/upload/cancer-info");
        return;
      }
      setSession(parsed);
      setDocuments(parsed.documents || []);
      
      // Calculate total size
      const size = (parsed.documents || []).reduce((sum, doc) => {
        return sum + doc.fileSize;
      }, 0);
      setTotalSize(size);
    } catch (e) {
      router.push("/upload");
    }
  }, [router]);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newDocuments: UploadedDocument[] = [];
    let newSize = totalSize;

    for (const file of acceptedFiles) {
      // Check individual file size
      if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
        continue;
      }

      // Check total size
      if (newSize + file.size > UPLOAD_LIMITS.MAX_SESSION_SIZE_MB * 1024 * 1024) {
        break;
      }

      // Check max files
      if (documents.length + newDocuments.length >= UPLOAD_LIMITS.MAX_FILES_PER_SESSION) {
        break;
      }

      // Read file as base64
      const base64 = await fileToBase64(file);
      
      // Classify document
      const classification = classifyDocument(file.name);

      newDocuments.push({
        id: generateDocId(),
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64Data: base64,
        classifiedType: classification.type,
        classificationConfidence: classification.confidence,
        autoDetected: true,
        status: 'done',
      });

      newSize += file.size;
    }

    setDocuments(prev => [...prev, ...newDocuments]);
    setTotalSize(newSize);
  }, [documents.length, totalSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: UPLOAD_LIMITS.MAX_FILES_PER_SESSION,
    disabled: processingStatus.isProcessing,
  });

  // Remove document
  const removeDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setTotalSize(prev => prev - doc.fileSize);
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  // Change document type manually
  const changeDocumentType = (id: string, newType: DocumentType) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id 
        ? { ...doc, classifiedType: newType, autoDetected: false }
        : doc
    ));
  };

  // Handle continue with progress feedback
  const handleContinue = async () => {
    if (!session || documents.length === 0) return;

    setProcessingStatus({
      isProcessing: true,
      currentFile: 0,
      totalFiles: documents.length,
      currentFileName: 'Preparing...',
      stage: 'saving',
    });

    try {
      // Process documents in batches to show progress
      const processedDocs: UploadedDocument[] = [];
      
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        
        setProcessingStatus(prev => ({
          ...prev,
          currentFile: i + 1,
          currentFileName: doc.filename,
          stage: 'compressing',
        }));

        // Small delay to allow UI to update and prevent blocking
        await new Promise(resolve => setTimeout(resolve, 50));
        
        processedDocs.push(doc);
      }

      setProcessingStatus(prev => ({
        ...prev,
        stage: 'saving',
        currentFileName: 'Saving to session...',
      }));

      // Save to localStorage
      const updatedSession: UploadSession = {
        ...session,
        documents: processedDocs,
      };

      // Use requestIdleCallback or setTimeout to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 100));
      
      localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));

      setProcessingStatus(prev => ({
        ...prev,
        stage: 'done',
        currentFileName: 'Complete!',
      }));

      // Small delay before navigation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      router.push("/upload/review");
    } catch (error) {
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Failed to process documents. Please try again.',
      }));
    }
  };

  const handleBack = () => {
    // Save current documents before going back
    if (session) {
      const updatedSession: UploadSession = {
        ...session,
        documents,
      };
      localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
    }
    router.push("/upload/cancer-info");
  };

  const selectedSite = session ? getCancerSiteById(session.cancerSite) : null;
  const usedPercentage = (totalSize / (UPLOAD_LIMITS.MAX_SESSION_SIZE_MB * 1024 * 1024)) * 100;

  // Group documents by type
  const uploadedTypes = new Set(documents.map(d => d.classifiedType));

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Upload Documents</h1>
                <p className="text-xs text-slate-400">{session.cancerSite} case</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-slate-400">{documents.length} files</p>
              <p className="text-slate-500">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span className="text-indigo-400 font-medium">Step 3 of 4</span>
            <span>Upload Medical Records</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              relative cursor-pointer rounded-2xl p-8 border-2 border-dashed transition-all
              ${isDragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
              }
              ${processingStatus.isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                ${isDragActive ? "bg-indigo-500" : "bg-slate-700"}
              `}>
                {isDragActive ? (
                  <Upload className="w-8 h-8 text-white" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-300" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-1">
                {isDragActive ? "Drop files here" : "Drag & drop files or click to browse"}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Pathology reports, CT/MRI scans, lab reports, prescriptions
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-md">PDF</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-md">JPG</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-md">PNG</span>
                <span className="text-slate-500">Max {UPLOAD_LIMITS.MAX_FILE_SIZE_MB}MB each</span>
              </div>
            </div>
          </div>

          {/* Usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">
                {documents.length} of {UPLOAD_LIMITS.MAX_FILES_PER_SESSION} files
              </span>
              <span className="text-slate-400">
                {formatFileSize(totalSize)} / {UPLOAD_LIMITS.MAX_SESSION_SIZE_MB} MB
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(usedPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-white">Uploaded Documents</h3>
              
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700"
                  >
                    {/* File icon */}
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      {doc.mimeType.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>

                    {/* Document type selector */}
                    <select
                      value={doc.classifiedType}
                      onChange={(e) => changeDocumentType(doc.id, e.target.value as DocumentType)}
                      className="text-sm bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, labels]) => (
                        <option key={type} value={type}>
                          {labels.en}
                        </option>
                      ))}
                    </select>

                    {/* Auto-detected badge */}
                    {doc.autoDetected && (
                      <span className="text-xs text-indigo-400 flex-shrink-0">
                        Auto
                      </span>
                    )}

                    {/* Status */}
                    {doc.status === 'done' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : doc.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required documents hint */}
          {selectedSite && (
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                Recommended for {selectedSite.label}:
              </h4>
              <div className="flex flex-wrap gap-2">
                {[...selectedSite.requiredDocs.critical, ...selectedSite.requiredDocs.recommended].map(docType => {
                  const isUploaded = uploadedTypes.has(docType);
                  return (
                    <span
                      key={docType}
                      className={`
                        text-xs px-2 py-1 rounded-md flex items-center gap-1
                        ${isUploaded 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                          : "bg-slate-700/50 text-slate-400 border border-slate-600"
                        }
                      `}
                    >
                      {isUploaded && <CheckCircle className="w-3 h-3" />}
                      {DOCUMENT_TYPE_LABELS[docType]?.en || docType}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleContinue}
              disabled={documents.length === 0 || processingStatus.isProcessing}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all
                ${documents.length > 0 && !processingStatus.isProcessing
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/25"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }
              `}
            >
              {processingStatus.isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Review & Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Processing Modal Overlay */}
      {processingStatus.isProcessing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Preparing Documents
                </h3>
                <p className="text-sm text-slate-400">
                  Please wait, this may take a moment...
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">
                  Processing {processingStatus.currentFile} of {processingStatus.totalFiles}
                </span>
                <span className="text-indigo-400">
                  {Math.round((processingStatus.currentFile / processingStatus.totalFiles) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(processingStatus.currentFile / processingStatus.totalFiles) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Current file */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    {processingStatus.stage === 'compressing' ? 'Processing' : 
                     processingStatus.stage === 'saving' ? 'Saving' : 'Complete'}
                  </p>
                  <p className="text-sm text-white truncate">
                    {processingStatus.currentFileName}
                  </p>
                </div>
                {processingStatus.stage === 'done' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Status message */}
            <p className="text-xs text-slate-500 text-center">
              {processingStatus.stage === 'compressing' 
                ? 'Optimizing documents for tumor board review...'
                : processingStatus.stage === 'saving'
                ? 'Saving session data...'
                : 'Redirecting to review page...'}
            </p>

            {/* Error message */}
            {processingStatus.error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400">{processingStatus.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:mime/type;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });
}
