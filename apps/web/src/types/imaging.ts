/**
 * Types for user imaging uploads and MedGemma integration
 */

// MedGemma Response Types
export interface MedGemmaResponse {
  interpretation: string;
  findings: Finding[];
  measurements: Measurement[];
  impression: string;
  recommendations: string[];
  confidence: number;
  stagingImplication?: string;
}

export interface Finding {
  id: string;
  description: string;
  location: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'unknown';
  sliceNumbers?: number[];
  note?: string;
}

export interface Measurement {
  lesionId: string;
  description: string;
  dimensions: {
    long: number;   // mm
    short?: number; // mm
  };
  location: string;
  isTarget: boolean;  // RECIST target lesion
  sliceNumber: number;
}

// DICOM Types
export interface DicomStudy {
  id: string;
  studyInstanceUID: string;
  studyDate: string;
  studyDescription: string;
  patientName: string;
  patientId: string;
  modality: string;
  bodyPart: string;
  series: DicomSeriesInfo[];
  totalSlices: number;
}

export interface DicomSeriesInfo {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  sliceCount: number;
}

// User Imaging Session
export interface ImagingSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  studies: ImagingStudy[];
  targetLesions: TargetLesion[];
  assessments: RECISTAssessment[];
  uploadedReports: ExtractedRadiologyReport[];
}

export interface ImagingStudy {
  id: string;
  sessionId: string;
  studyInstanceUID?: string;
  studyDate: Date;
  uploadDate: Date;
  modality: string;
  bodyPart: string;
  description: string;
  sliceCount: number;
  source: 'dicom' | 'photo' | 'gallery';
  storageKey?: string;  // R2 object key
  medgemmaAnalysis?: MedGemmaResponse;
  measurements: Measurement[];
  isBaseline: boolean;
  timepoint: 'baseline' | 'follow-up' | 'response-assessment';
  thumbnailDataUrl?: string;
}

// RECIST Types
export interface TargetLesion {
  id: string;
  location: string;
  organ: string;
  isLymphNode: boolean;
  measurements: LesionMeasurement[];
}

export interface LesionMeasurement {
  date: Date;
  studyId: string;
  longAxis: number;  // mm
  shortAxis?: number; // mm (required for lymph nodes)
  sliceNumber: number;
}

export interface RECISTAssessment {
  id: string;
  baselineDate: Date;
  currentDate: Date;
  baselineSum: number;
  currentSum: number;
  nadirSum: number;
  percentChangeFromBaseline: number;
  percentChangeFromNadir: number;
  response: 'CR' | 'PR' | 'SD' | 'PD' | 'NE';
  reasoning: string;
  newLesions: boolean;
  nonTargetProgression: boolean;
  overallResponse: 'CR' | 'PR' | 'SD' | 'PD' | 'NE';
}

// Radiology Report Extraction
export interface ExtractedRadiologyReport {
  id: string;
  date: string;
  modality: string;
  technique?: string;
  comparison?: string;
  findings: ReportFinding[];
  impression: string;
  recommendations?: string[];
  reporter?: string;
  rawText: string;
}

export interface ReportFinding {
  description: string;
  location: string;
  measurements?: {
    long: number;
    short?: number;
  };
}

// Reconciliation Types (AI vs Report)
export interface ReconciliationResult {
  agreement: AgreementItem[];
  discrepancies: DiscrepancyItem[];
  newAIFindings: Finding[];
  missedInReport: Finding[];
  additionalContext: string[];
  overallAssessment: string;
  confidenceLevel: 'high' | 'moderate' | 'low';
}

export interface AgreementItem {
  finding: string;
  aiDescription: string;
  reportDescription: string;
  location: string;
  measurements?: {
    ai: string;
    report: string;
    difference?: string;
  };
}

export interface DiscrepancyItem {
  type: 'measurement_mismatch' | 'finding_mismatch' | 'interpretation_mismatch' | 'staging_mismatch';
  severity: 'minor' | 'moderate' | 'significant';
  aiPosition: string;
  reportPosition: string;
  clinicalImplication: string;
  recommendation: string;
}

// Upload Types
export interface UploadedFile {
  id: string;
  file: File;
  type: 'dicom' | 'photo' | 'report';
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  result?: DicomStudy | ImagingStudy;
}

export interface CapturedImage {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
  qualityScore: number;
  issues: QualityIssue[];
}

export type QualityIssue = 
  | 'too_dark'
  | 'too_bright'
  | 'blurry'
  | 'glare_detected'
  | 'incomplete_frame'
  | 'low_resolution';

// MedGemma Config
export interface MedGemmaConfig {
  provider: 'vertex-ai' | 'huggingface' | 'self-hosted';
  model: 'medgemma-4b-it' | 'medgemma-27b-it';
  apiKey?: string;
  endpoint?: string;
}

// Image Input for MedGemma
export interface MedGemmaImageInput {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
  metadata: {
    modality: string;
    bodyPart: string;
    sliceIndex?: number;
    totalSlices?: number;
    windowCenter?: number;
    windowWidth?: number;
    source: 'dicom' | 'photo' | 'gallery';
  };
}

// Analysis Context
export interface AnalysisContext {
  cancerType?: string;
  stage?: string;
  priorStudyDate?: string;
  clinicalQuestion?: string;
  analysisType: 'general' | 'oncology' | 'recist';
}

// Enhanced Deliberation Context for Dr. Chitran
export interface EnhancedImagingContext {
  hasUploadedImages: boolean;
  medgemmaAnalysis?: MedGemmaResponse;
  uploadedReports?: ExtractedRadiologyReport[];
  reconciliationResult?: ReconciliationResult;
  progressionData?: {
    baselineDate: string;
    currentDate: string;
    recistResponse: 'CR' | 'PR' | 'SD' | 'PD';
    percentChange: number;
  };
}
