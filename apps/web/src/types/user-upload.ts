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

// =============================================================================
// V5.2: COMPOSITE DOCUMENT HANDLING
// =============================================================================

// Subspecialty content that can be found in any document
export type SubspecialtyContent = 
  | 'pathology-summary'      // Histology, grade, IHC mentioned
  | 'radiology-summary'      // Scan findings referenced
  | 'staging-info'           // TNM, stage mentioned
  | 'treatment-history'      // Past treatments listed
  | 'surgery-summary'        // Surgery details mentioned
  | 'lab-values'             // Lab results included
  | 'medications'            // Current medications listed
  | 'genomic-findings'       // Mutations, markers mentioned
  | 'follow-up-plan'         // Next steps, referrals
  | 'prognosis-discussion';  // Prognosis discussed

// Extracted section from a composite document
export interface ExtractedSection {
  contentType: SubspecialtyContent;
  text: string;
  confidence: number;
  subspecialty: string;  // medical-oncology, surgical-oncology, etc.
  keyData?: Record<string, any>;  // Structured data if extractable
}

// Enhanced document classification with multi-label support
export interface DocumentClassification {
  // Primary classification (what the document IS)
  primaryType: DocumentType;
  primaryConfidence: number;
  
  // Secondary content tags (what the document CONTAINS)
  containsContent: SubspecialtyContent[];
  
  // Is this a composite document (contains multiple subspecialty data)?
  isComposite: boolean;
  
  // Extracted sections for composite documents
  extractedSections?: ExtractedSection[];
  
  // Reasoning for classification
  classificationReason?: string;
}

// Common composite document types in Indian healthcare
export type CompositeDocumentType = 
  | 'opd-prescription'       // OPD visit prescription (most common composite)
  | 'follow-up-summary'      // Follow-up visit notes
  | 'referral-letter'        // Referral with case summary
  | 'mdt-summary'            // Multi-disciplinary team meeting summary
  | 'treatment-summary'      // Comprehensive treatment summary
  | 'second-opinion';        // Second opinion with full case review

// Indian medical terminology mappings
export const INDIAN_MEDICAL_TERMS: Record<string, { 
  standardTerm: string;
  subspecialty: string;
  documentType?: DocumentType;
}> = {
  // Pathology terms
  'hpe': { standardTerm: 'Histopathology Examination', subspecialty: 'pathology', documentType: 'pathology' },
  'fnac': { standardTerm: 'Fine Needle Aspiration Cytology', subspecialty: 'pathology', documentType: 'pathology' },
  'ihc': { standardTerm: 'Immunohistochemistry', subspecialty: 'pathology', documentType: 'pathology' },
  'slnb': { standardTerm: 'Sentinel Lymph Node Biopsy', subspecialty: 'surgical-oncology' },
  'alnd': { standardTerm: 'Axillary Lymph Node Dissection', subspecialty: 'surgical-oncology' },
  
  // Radiology terms
  'usg': { standardTerm: 'Ultrasonography', subspecialty: 'radiology', documentType: 'radiology' },
  'cect': { standardTerm: 'Contrast Enhanced CT', subspecialty: 'radiology', documentType: 'radiology' },
  'hrct': { standardTerm: 'High Resolution CT', subspecialty: 'radiology', documentType: 'radiology' },
  'mrcp': { standardTerm: 'MR Cholangiopancreatography', subspecialty: 'radiology', documentType: 'radiology' },
  'pet-ct': { standardTerm: 'PET-CT Scan', subspecialty: 'radiology', documentType: 'radiology' },
  
  // Surgery terms
  'mrm': { standardTerm: 'Modified Radical Mastectomy', subspecialty: 'surgical-oncology', documentType: 'surgical-notes' },
  'bcs': { standardTerm: 'Breast Conserving Surgery', subspecialty: 'surgical-oncology', documentType: 'surgical-notes' },
  'wle': { standardTerm: 'Wide Local Excision', subspecialty: 'surgical-oncology', documentType: 'surgical-notes' },
  'tah-bso': { standardTerm: 'Total Abdominal Hysterectomy with Bilateral Salpingo-Oophorectomy', subspecialty: 'surgical-oncology' },
  'lar': { standardTerm: 'Low Anterior Resection', subspecialty: 'surgical-oncology' },
  'apr': { standardTerm: 'Abdominoperineal Resection', subspecialty: 'surgical-oncology' },
  
  // Treatment terms
  'nact': { standardTerm: 'Neoadjuvant Chemotherapy', subspecialty: 'medical-oncology' },
  'act': { standardTerm: 'Adjuvant Chemotherapy', subspecialty: 'medical-oncology' },
  'ccrt': { standardTerm: 'Concurrent Chemoradiation', subspecialty: 'radiation-oncology' },
  'ebrt': { standardTerm: 'External Beam Radiation Therapy', subspecialty: 'radiation-oncology' },
  'imrt': { standardTerm: 'Intensity Modulated Radiation Therapy', subspecialty: 'radiation-oncology' },
  'brachytherapy': { standardTerm: 'Brachytherapy', subspecialty: 'radiation-oncology' },
  
  // Lab terms
  'lft': { standardTerm: 'Liver Function Test', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  'kft': { standardTerm: 'Kidney Function Test', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  'rft': { standardTerm: 'Renal Function Test', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  'cbc': { standardTerm: 'Complete Blood Count', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  'tlc': { standardTerm: 'Total Leucocyte Count', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  'dlc': { standardTerm: 'Differential Leucocyte Count', subspecialty: 'medical-oncology', documentType: 'lab-report' },
  
  // Clinical terms
  'opd': { standardTerm: 'Outpatient Department', subspecialty: 'medical-oncology', documentType: 'clinical-notes' },
  'ipd': { standardTerm: 'Inpatient Department', subspecialty: 'medical-oncology' },
  'f/u': { standardTerm: 'Follow-up', subspecialty: 'medical-oncology' },
  'c/o': { standardTerm: 'Complaining of', subspecialty: 'medical-oncology' },
  'k/c/o': { standardTerm: 'Known case of', subspecialty: 'medical-oncology' },
  'h/o': { standardTerm: 'History of', subspecialty: 'medical-oncology' },
  'rx': { standardTerm: 'Treatment/Prescription', subspecialty: 'medical-oncology', documentType: 'prescription' },
  'dx': { standardTerm: 'Diagnosis', subspecialty: 'medical-oncology' },
  'ddx': { standardTerm: 'Differential Diagnosis', subspecialty: 'medical-oncology' },
};

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

// Uploaded document with classification (V5.2 enhanced)
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
  
  // V5.2: Enhanced classification for composite documents
  classification?: DocumentClassification;
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

// =============================================================================
// V6: IMAGING INTEGRATION (MedGemma + DICOM/Phone uploads)
// =============================================================================

// Import imaging types for session integration
import type { ImagingStudy, MedGemmaResponse, ExtractedRadiologyReport } from './imaging';

// Uploaded imaging study with analysis
export interface UploadedImagingStudy {
  study: ImagingStudy;
  medgemmaAnalysis?: MedGemmaResponse;
  uploadedAt: string;  // ISO date
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  errorMessage?: string;
}

// Extended upload session with V6 imaging features
export interface UploadSessionV6 extends UploadSessionV5 {
  // User-uploaded imaging (DICOM, camera, gallery)
  imagingStudies?: UploadedImagingStudy[];
  
  // Extracted radiology reports (from OCR'd PDFs)
  extractedRadiologyReports?: ExtractedRadiologyReport[];
  
  // Imaging-specific metadata
  hasUserUploadedImaging: boolean;
  imagingConsentAccepted: boolean;
  
  // RECIST tracking (if multiple timepoints uploaded)
  recistBaseline?: {
    studyId: string;
    studyDate: string;
    targetLesionSum: number;
  };
}
