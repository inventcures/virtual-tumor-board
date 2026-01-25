/**
 * V4 User Upload Types
 * Types for user-uploaded cancer records feature
 */

// User types who can upload records
export type UserType = 'patient' | 'oncologist' | 'doctor';

// Document types we can classify
export type DocumentType =
  | 'pathology'
  | 'radiology'
  | 'genomics'
  | 'prescription'
  | 'lab-report'
  | 'clinical-notes'
  | 'discharge-summary'
  | 'surgical-notes'
  | 'unknown';

// Cancer sites - India-prevalent cancers first
export interface CancerSite {
  id: string;
  label: string;
  labelHindi?: string;
  prevalence: 'high-india' | 'high' | 'moderate' | 'low';
  requiredDocs: {
    critical: DocumentType[];
    recommended: DocumentType[];
    optional: DocumentType[];
  };
}

// Staging information
export interface StagingInfo {
  stage?: 'I' | 'II' | 'III' | 'IV' | 'unknown';
  tnm?: string; // e.g., "T2N1M0"
  description?: string; // Free text, e.g., "locally advanced with liver mets"
}

// Uploaded document with classification
export interface UploadedDocument {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
  classifiedType: DocumentType;
  classificationConfidence: number;
  autoDetected: boolean;
  extractedData?: ExtractedClinicalData;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}

// Extracted clinical data from documents
export interface ExtractedClinicalData {
  // Pathology
  histology?: string;
  grade?: string;
  margins?: string;
  ihcMarkers?: Record<string, string>; // ER, PR, HER2, etc.

  // Radiology
  findings?: string[];
  measurements?: { site: string; size: string }[];
  impression?: string;

  // Genomics
  mutations?: { gene: string; variant: string; actionable: boolean }[];
  msiStatus?: string;
  tmb?: number;

  // Labs
  labValues?: { test: string; value: string; unit: string; flag?: 'high' | 'low' }[];

  // Common
  date?: string;
  institution?: string;
  rawText?: string;
}

// Missing document information
export interface MissingDocument {
  type: DocumentType;
  importance: 'critical' | 'recommended' | 'optional';
  impact: string;
  example: string;
}

// Completeness check result
export interface CompletenessResult {
  completenessScore: number; // 0-100
  uploadedTypes: DocumentType[];
  missingCritical: MissingDocument[];
  missingRecommended: MissingDocument[];
  agentLimitations: AgentLimitation[];
}

// Agent limitation due to missing data
export interface AgentLimitation {
  agentId: string;
  limitation: string;
  canStillOpine: boolean;
}

// Upload session state (stored in localStorage)
export interface UploadSession {
  id: string;
  userType: UserType;
  cancerSite: string;
  staging: StagingInfo;
  documents: UploadedDocument[];
  completeness?: CompletenessResult;
  createdAt: string;
  expiresAt: string; // Auto-delete after 24h
}

// Step in the upload wizard
export type UploadStep = 'user-type' | 'cancer-info' | 'documents' | 'auto-stage' | 'review' | 'deliberation';

// =============================================================================
// V5: AUTO-STAGING TYPES
// =============================================================================

// Auto-stage result from AI analysis of all documents
export interface AutoStageResult {
  // Detected cancer info
  cancerSite: {
    id: string;           // e.g., "breast-tnbc"
    label: string;        // e.g., "Breast Cancer - Triple Negative"
    confidence: number;   // 0-1
    evidence: string[];   // ["Pathology shows ER-, PR-, HER2-"]
  };
  
  // Staging
  staging: {
    clinicalStage: 'I' | 'II' | 'III' | 'IV' | 'unknown';
    tnm?: string;         // "T2N1M0"
    confidence: number;
    evidence: string[];
  };
  
  // Key findings summary
  keyFindings: {
    histology?: string;
    grade?: string;
    biomarkers?: Record<string, string>;
    mutations?: string[];
    metastases?: string[];
  };
  
  // Treatment history (if detected)
  treatmentHistory?: {
    surgeries?: string[];
    chemotherapy?: string[];
    radiation?: string[];
    targetedTherapy?: string[];
  };
  
  // Warnings
  warnings: string[];
  
  // Dates extracted (for timeline)
  extractedDates: ExtractedDate[];
}

// =============================================================================
// V5: TIMELINE TYPES
// =============================================================================

// Extracted date from a document
export interface ExtractedDate {
  date: string;           // ISO format YYYY-MM-DD
  event: string;          // "PET-CT Scan", "Biopsy", etc.
  eventType: TimelineEventType;
  documentId: string;
  documentFilename: string;
  confidence: number;     // 0-1
}

// Timeline event types
export type TimelineEventType = 
  | 'diagnosis' 
  | 'surgery' 
  | 'scan' 
  | 'treatment' 
  | 'lab' 
  | 'consult' 
  | 'other';

// Full timeline event for display
export interface TimelineEvent {
  id: string;
  date: string;           // ISO format
  dateConfidence: number;
  eventType: TimelineEventType;
  title: string;
  description: string;
  documentId: string;
  documentType: DocumentType;
  documentFilename: string;
  color: string;
  icon: string;
  specialty: string;
}

// Treatment timeline container
export interface TreatmentTimeline {
  events: TimelineEvent[];
  diagnosisDate?: string;
  surgeryDate?: string;
  treatmentStartDate?: string;
  earliestDate?: string;
  latestDate?: string;
  durationDays?: number;
  undatedDocuments: string[];  // Document IDs without dates
}

// =============================================================================
// V5: EXTENDED SESSION
// =============================================================================

// Extended upload session with V5 features
export interface UploadSessionV5 extends UploadSession {
  autoStageResult?: AutoStageResult;
  timeline?: TreatmentTimeline;
  isAutoStaged: boolean;
}
