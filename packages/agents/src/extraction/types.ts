/**
 * MARC-v1 Extraction Types
 * 
 * Type definitions for the evaluator-optimizer reliability loop
 * implementing Penn-RAIL MARC-v1 architecture.
 */

// ============================================================================
// Document Types (re-export for convenience)
// ============================================================================

export type DocumentType =
  | "pathology"
  | "radiology"
  | "genomics"
  | "prescription"
  | "lab-report"
  | "clinical-notes"
  | "discharge-summary"
  | "surgical-notes"
  | "unknown";

// ============================================================================
// Extracted Clinical Data (matches apps/web/src/types/user-upload.ts)
// ============================================================================

export interface ExtractedClinicalData {
  // Pathology fields
  histology?: string;
  grade?: string;
  margins?: string;
  ihcMarkers?: Record<string, string>;
  
  // Radiology fields
  findings?: string[];
  measurements?: Array<{ site: string; size: string }>;
  impression?: string;
  
  // Genomics fields
  mutations?: Array<{ gene: string; variant: string; actionable?: boolean }>;
  msiStatus?: string;
  tmb?: number | string;
  
  // Lab fields
  labValues?: Array<{ test: string; value: string; unit: string; flag?: string }>;
  
  // Common fields
  date?: string;
  institution?: string;
  rawText?: string;
  
  // Field status tracking (for distinguishing "not found" vs "not present")
  _fieldStatus?: Record<string, 'found' | 'not_present' | 'ambiguous'>;
}

// ============================================================================
// Evaluation Scoring
// ============================================================================

/**
 * Overall evaluation score with breakdown by dimension
 */
export interface EvaluationScore {
  /** Overall weighted score (0-1) */
  overall: number;
  /** Completeness: Are all expected fields present? (0-1) */
  completeness: number;
  /** Accuracy: Do values match source text? (0-1) */
  accuracy: number;
  /** Consistency: Are values internally coherent? (0-1) */
  consistency: number;
  /** Clinical Validity: Are values clinically plausible? (0-1) */
  clinicalValidity: number;
  /** Per-field score breakdown */
  breakdown: FieldScore[];
}

/**
 * Score for an individual field
 */
export interface FieldScore {
  /** Field name */
  field: string;
  /** Whether the field is present */
  present: boolean;
  /** Score for this field (0-1) */
  score: number;
  /** Issues detected with this field */
  issues?: string[];
}

// ============================================================================
// Evaluation Feedback
// ============================================================================

/**
 * Actionable feedback for the optimizer
 */
export interface EvaluationFeedback {
  /** Overall score achieved */
  overallScore: number;
  /** List of specific issues to address */
  issues: EvaluationIssue[];
  /** Fields that are completely missing */
  missingFields: string[];
  /** Fields to prioritize in re-extraction */
  priorityFields: string[];
  /** Specific suggestions for improvement */
  suggestions: string[];
}

/**
 * A specific issue found during evaluation
 */
export interface EvaluationIssue {
  /** Severity level */
  severity: 'critical' | 'major' | 'minor';
  /** Field this issue relates to */
  field: string;
  /** Description of the issue */
  description: string;
  /** Suggested fix (optional) */
  suggestedFix?: string;
}

// ============================================================================
// Extraction Rubrics
// ============================================================================

/**
 * Defines required, important, and optional fields for a document type
 */
export interface ExtractionRubric {
  /** Fields that MUST be extracted (if present in source) */
  required: string[];
  /** Fields that SHOULD be extracted */
  important: string[];
  /** Fields that are nice to have */
  optional: string[];
}

// ============================================================================
// Reliability Loop Configuration
// ============================================================================

/**
 * Configuration for the reliability loop
 */
export interface ReliabilityLoopConfig {
  /** Target quality score (default: 0.95) */
  qualityThreshold: number;
  /** Maximum iterations before stopping (default: 3) */
  maxIterations: number;
  /** Minimum improvement to continue (default: 0.05) */
  minImprovement: number;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs: number;
  /** Model to use for evaluation (default: "gemini-2.0-flash") */
  model: string;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_RELIABILITY_CONFIG: ReliabilityLoopConfig = {
  qualityThreshold: 0.95,
  maxIterations: 3,
  minImprovement: 0.05,
  timeoutMs: 30000,
  model: "gemini-2.0-flash",
  verbose: true,
};

// ============================================================================
// Reliability Loop Results
// ============================================================================

/**
 * Result of executing the reliability loop
 */
export interface ReliabilityLoopResult {
  /** Final extracted data */
  finalData: ExtractedClinicalData;
  /** Final quality score achieved */
  finalScore: number;
  /** Number of iterations performed */
  iterations: number;
  /** History of all iterations */
  iterationHistory: IterationRecord[];
  /** Whether the quality threshold was met */
  metThreshold: boolean;
  /** Total processing time in milliseconds */
  processingTimeMs: number;
  /** Reason why the loop stopped */
  stoppedReason: string;
}

/**
 * Record of a single iteration
 */
export interface IterationRecord {
  /** Iteration number (1-based) */
  iteration: number;
  /** Data extracted in this iteration */
  extractedData: ExtractedClinicalData;
  /** Score achieved in this iteration */
  score: EvaluationScore;
  /** Feedback generated (if not final iteration) */
  feedback?: EvaluationFeedback;
  /** Score improvement from previous iteration */
  improvementFromPrevious?: number;
  /** Timestamp when iteration started */
  startedAt: Date;
  /** Duration of this iteration in ms */
  durationMs: number;
}

// ============================================================================
// Evaluator Configuration
// ============================================================================

/**
 * Configuration for the extraction evaluator
 */
export interface EvaluatorConfig {
  /** Model to use for LLM-based accuracy checks */
  model: string;
  /** Weights for each scoring dimension */
  weights?: {
    completeness: number;
    accuracy: number;
    consistency: number;
    clinicalValidity: number;
  };
}

/**
 * Default evaluator weights
 */
export const DEFAULT_EVALUATOR_WEIGHTS = {
  completeness: 0.30,
  accuracy: 0.40,
  consistency: 0.15,
  clinicalValidity: 0.15,
};

// ============================================================================
// Optimizer Types
// ============================================================================

/**
 * Result of the shouldContinue check
 */
export interface ContinueDecision {
  /** Whether to continue iterating */
  continue: boolean;
  /** Reason for the decision */
  reason: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Metadata included in API response about the reliability loop
 */
export interface ReliabilityLoopMetadata {
  /** Whether the loop was enabled */
  enabled: boolean;
  /** Final quality score */
  finalScore: number;
  /** Number of iterations performed */
  iterations: number;
  /** Whether threshold was met */
  metThreshold: boolean;
  /** Why the loop stopped */
  stoppedReason: string;
  /** Score breakdown (optional, for debugging) */
  scoreBreakdown?: {
    completeness: number;
    accuracy: number;
    consistency: number;
    clinicalValidity: number;
  };
  /** Full iteration history (optional, for debugging) */
  iterationHistory?: IterationRecord[];
}
