/**
 * V15: Longitudinal Imaging Types for Oncology Surveillance
 * 
 * Data model for tracking tumor progression across multiple imaging timepoints.
 * Based on MiraViewer architecture and RECIST 1.1 criteria.
 */

import { Measurement, MedGemmaResponse, OncoSegAnalysis } from './imaging';

// ============================================================================
// Core Types
// ============================================================================

export interface LongitudinalStudy {
  id: string;
  patientId: string;
  studies: ImagingTimepoint[];
  baselineStudyId: string;
  targetLesions: TrackedLesion[];
  assessments: RECISTAssessment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ImagingTimepoint {
  id: string;
  studyDate: Date;
  studyInstanceUID?: string;
  modality: string;           // CT, MRI, PET-CT
  bodyPart: string;
  series: SeriesInfo[];
  isBaseline: boolean;
  timepoint: TimepointType;
  daysFromBaseline: number;
  treatmentContext?: string;  // "Post-Cycle 2", "Week 12", etc.
  
  // Analysis data
  medgemmaAnalysis?: MedGemmaResponse;
  oncoSegAnalysis?: OncoSegAnalysis;
  
  // Display metadata
  totalSlices: number;
  thumbnailDataUrl?: string;
  sliceData?: ImageData[];    // Cached slice data for display
}

export type TimepointType = 
  | 'baseline' 
  | 'follow-up' 
  | 'end-of-treatment' 
  | 'surveillance'
  | 'restaging';

export interface SeriesInfo {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  sliceCount: number;
  sliceThickness?: number;    // mm
}

// ============================================================================
// Lesion Tracking Types (RECIST 1.1)
// ============================================================================

export interface TrackedLesion {
  id: string;
  name: string;               // "Liver lesion 1", "Lung nodule RUL"
  location: string;
  organ: string;
  isLymphNode: boolean;
  measurements: LesionMeasurement[];
  status: LesionStatus;
  color: string;              // For visualization consistency
}

export type LesionStatus = 'target' | 'non-target' | 'new';

export interface LesionMeasurement {
  id: string;
  timepointId: string;
  date: Date;
  longAxis: number;           // mm
  shortAxis?: number;         // mm (required for lymph nodes)
  sliceNumber: number;
  seriesUID?: string;
  annotationCoords: AnnotationPoint[];
  measuredBy: MeasurementSource;
  confidence?: number;
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export type MeasurementSource = 'ai' | 'user' | 'report';

// ============================================================================
// RECIST Assessment Types
// ============================================================================

export type ResponseCategory = 'CR' | 'PR' | 'SD' | 'PD' | 'NE';

export interface RECISTAssessment {
  id: string;
  timepointId: string;
  date: Date;
  
  // Target Lesion Assessment
  targetLesions: {
    sumOfDiameters: number;
    percentChangeFromBaseline: number;
    percentChangeFromNadir: number;
    nadir: number;
    response: ResponseCategory;
  };
  
  // Non-Target Lesion Assessment
  nonTargetLesions: {
    status: 'CR' | 'Non-CR/Non-PD' | 'PD' | 'NE';
    progression: boolean;
  };
  
  // New Lesions
  newLesions: {
    present: boolean;
    count: number;
    locations: string[];
  };
  
  // Overall Response
  overallResponse: ResponseCategory;
  reasoning: string;
  
  // Best response tracking
  isBestResponse: boolean;
}

export interface ProgressionSummary {
  currentResponse: ResponseCategory;
  percentChangeFromBaseline: number;
  percentChangeFromNadir: number;
  bestResponse: ResponseCategory;
  bestResponseDate: Date;
  newLesions: boolean;
  trend: TrendDirection;
  sumOfDiameters: number;
  baselineSumOfDiameters: number;
  nadirSumOfDiameters: number;
}

export type TrendDirection = 'improving' | 'stable' | 'worsening';

// ============================================================================
// Viewer State Types
// ============================================================================

export interface LongitudinalViewerState {
  selectedTimepoints: string[];   // IDs of timepoints currently displayed
  viewMode: ViewMode;
  sliceProgress: number;          // 0.0 - 1.0 for synchronized navigation
  activeTimepointId?: string;     // For overlay view
  compareTargetId?: string;       // For flicker comparison
  isPlaying: boolean;
  playbackSpeed: number;          // ms between frames
  showMeasurements: boolean;
  showLesionLabels: boolean;
  highlightedLesionId?: string;
}

export type ViewMode = 'grid' | 'overlay';

export interface PanelSettings {
  timepointId: string;
  zoom: number;
  panX: number;
  panY: number;
  windowCenter: number;
  windowWidth: number;
  invert: boolean;
}

export interface AlignmentResult {
  timepointId: string;
  referenceTimepointId: string;
  sliceOffset: number;          // Z-axis offset
  transform: AffineTransform;   // 2D transform
  quality: number;              // 0-1, mutual information score
}

export interface AffineTransform {
  scale: number;
  rotation: number;             // radians
  translateX: number;
  translateY: number;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

export interface ResponseBadgeProps {
  response: ResponseCategory;
  percentChange: number;
  trend: TrendDirection;
  size?: 'sm' | 'md' | 'lg';
}

export interface TimelineEntryProps {
  date: Date;
  label: string;
  isSelected: boolean;
  isBaseline: boolean;
  response?: ResponseCategory;
  sumDiameters?: number;
  percentChange?: number;
  hasNewLesions: boolean;
  onClick: () => void;
}

export interface ComparisonGridProps {
  timepoints: ImagingTimepoint[];
  selectedPlane: ViewPlane;
  sliceProgress: number;
  panelSettings: Map<string, PanelSettings>;
  measurements: Map<string, LesionMeasurement[]>;
  highlightedLesionId?: string;
  onSliceChange: (progress: number) => void;
  onMeasurementAdd?: (timepointId: string, measurement: LesionMeasurement) => void;
  onPanelSettingsChange: (timepointId: string, settings: Partial<PanelSettings>) => void;
}

export type ViewPlane = 'axial' | 'sagittal' | 'coronal';

export interface ProgressionChartProps {
  assessments: RECISTAssessment[];
  lesions: TrackedLesion[];
  mode: ChartMode;
  showTargetLesions: boolean;
  showNonTargetLesions: boolean;
  onTimepointClick?: (timepointId: string) => void;
}

export type ChartMode = 'trend' | 'waterfall';

// ============================================================================
// Constants
// ============================================================================

export const RESPONSE_CONFIG = {
  CR: { 
    label: 'Complete Response', 
    shortLabel: 'CR',
    color: 'bg-green-600', 
    textColor: 'text-green-600',
    borderColor: 'border-green-600',
    icon: 'check-circle',
    description: 'All target lesions disappeared'
  },
  PR: { 
    label: 'Partial Response', 
    shortLabel: 'PR',
    color: 'bg-green-500', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
    icon: 'trending-down',
    description: 'At least 30% decrease from baseline'
  },
  SD: { 
    label: 'Stable Disease', 
    shortLabel: 'SD',
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    icon: 'minus',
    description: 'Neither PR nor PD criteria met'
  },
  PD: { 
    label: 'Progressive Disease', 
    shortLabel: 'PD',
    color: 'bg-red-500', 
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    icon: 'trending-up',
    description: 'At least 20% increase from nadir'
  },
  NE: { 
    label: 'Not Evaluable', 
    shortLabel: 'NE',
    color: 'bg-gray-500', 
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500',
    icon: 'help-circle',
    description: 'Cannot be evaluated'
  },
} as const;

// Colorblind-safe palette
export const COLORBLIND_SAFE_PALETTE = {
  progression: '#D55E00',   // Vermillion (visible to all)
  stable: '#F0E442',        // Yellow
  regression: '#009E73',    // Bluish green
  neutral: '#999999',       // Gray
  newLesion: '#CC79A7',     // Reddish purple
} as const;

export const RECIST_THRESHOLDS = {
  PR_THRESHOLD: -30,        // -30% from baseline for partial response
  PD_THRESHOLD: 20,         // +20% from nadir for progressive disease
  PD_ABSOLUTE_INCREASE: 5,  // 5mm minimum absolute increase for PD
} as const;

// ============================================================================
// Utility Types
// ============================================================================

export type LongitudinalAction =
  | { type: 'ADD_TIMEPOINT'; payload: ImagingTimepoint }
  | { type: 'REMOVE_TIMEPOINT'; payload: string }
  | { type: 'SET_BASELINE'; payload: string }
  | { type: 'ADD_LESION'; payload: TrackedLesion }
  | { type: 'ADD_MEASUREMENT'; payload: { lesionId: string; measurement: LesionMeasurement } }
  | { type: 'UPDATE_ASSESSMENT'; payload: RECISTAssessment }
  | { type: 'SELECT_TIMEPOINTS'; payload: string[] }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_SLICE_PROGRESS'; payload: number };

// Demo/synthetic data helpers
export interface SyntheticTimepointConfig {
  date: Date;
  label: string;
  percentChangeFromBaseline: number;
  newLesions?: number;
}
