/**
 * MARC-v1 Extraction Module
 * 
 * Implements Penn-RAIL MARC-v1 evaluator-optimizer reliability loops
 * for high-confidence clinical data extraction from medical documents.
 * 
 * @module @vtb/agents/extraction
 */

// Types
export type {
  DocumentType,
  ExtractedClinicalData,
  EvaluationScore,
  EvaluationFeedback,
  EvaluationIssue,
  FieldScore,
  ExtractionRubric,
  ReliabilityLoopConfig,
  ReliabilityLoopResult,
  IterationRecord,
  EvaluatorConfig,
  ContinueDecision,
  ReliabilityLoopMetadata,
} from './types';

// Constants
export {
  DEFAULT_RELIABILITY_CONFIG,
  DEFAULT_EVALUATOR_WEIGHTS,
} from './types';

// Rubrics
export {
  EXTRACTION_RUBRICS,
  CLINICAL_VALIDITY_RULES,
  getRubric,
  getAllExpectedFields,
  isRequiredField,
  getFieldWeight,
} from './rubrics';

// Evaluator
export { ExtractionEvaluator } from './evaluator';

// Optimizer
export { ExtractionOptimizer } from './optimizer';

// Re-export for convenience
export * from './types';
