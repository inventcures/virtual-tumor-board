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
export type UploadStep = 'user-type' | 'cancer-info' | 'documents' | 'review' | 'deliberation';
