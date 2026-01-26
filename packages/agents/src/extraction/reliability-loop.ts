/**
 * MARC-v1 Reliability Loop Orchestrator
 * 
 * Coordinates the extract → evaluate → optimize → re-extract cycle
 * until quality threshold is met or max iterations reached.
 * 
 * Based on Penn-RAIL MARC-v1 architecture.
 */

import { ExtractionEvaluator } from './evaluator';
import { ExtractionOptimizer } from './optimizer';
import type {
  DocumentType,
  ExtractedClinicalData,
  EvaluationScore,
  EvaluationFeedback,
  ReliabilityLoopConfig,
  ReliabilityLoopResult,
  IterationRecord,
} from './types';
import { DEFAULT_RELIABILITY_CONFIG } from './types';

/**
 * Type for the extraction function that will be called in the loop
 */
export type ExtractionFunction = (
  prompt: string,
  sourceText: string
) => Promise<ExtractedClinicalData>;

/**
 * Progress callback for real-time updates
 */
export type ProgressCallback = (
  iteration: number,
  score: number,
  phase: 'extracting' | 'evaluating' | 'optimizing'
) => void;

/**
 * MARC-v1 Reliability Loop
 * 
 * Orchestrates iterative extraction refinement:
 * 1. Extract clinical data from document
 * 2. Evaluate extraction quality (4 dimensions)
 * 3. If score < threshold, generate feedback and optimize prompt
 * 4. Re-extract with optimized prompt
 * 5. Repeat until threshold met or max iterations reached
 */
export class ReliabilityLoop {
  private config: ReliabilityLoopConfig;
  private evaluator: ExtractionEvaluator;
  private optimizer: ExtractionOptimizer;
  private extractFn: ExtractionFunction;

  constructor(
    config: Partial<ReliabilityLoopConfig> = {},
    extractFn: ExtractionFunction,
    apiKey?: string
  ) {
    this.config = { ...DEFAULT_RELIABILITY_CONFIG, ...config };
    this.evaluator = new ExtractionEvaluator({
      model: this.config.model,
      apiKey,
      verbose: this.config.verbose,
    });
    this.optimizer = new ExtractionOptimizer({
      verbose: this.config.verbose,
    });
    this.extractFn = extractFn;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      if (data) {
        console.log(`[MARC Loop] ${message}`, data);
      } else {
        console.log(`[MARC Loop] ${message}`);
      }
    }
  }

  /**
   * Execute the reliability loop
   * 
   * @param sourceText - Original document text
   * @param documentType - Type of document being processed
   * @param baseExtractionPrompt - Initial prompt for extraction
   * @param onProgress - Optional callback for progress updates
   * @returns Result including final data, score, and iteration history
   */
  async execute(
    sourceText: string,
    documentType: DocumentType,
    baseExtractionPrompt: string,
    onProgress?: ProgressCallback
  ): Promise<ReliabilityLoopResult> {
    const startTime = Date.now();
    const iterationHistory: IterationRecord[] = [];

    let currentPrompt = baseExtractionPrompt;
    let currentData: ExtractedClinicalData | null = null;
    let currentScore: EvaluationScore | null = null;
    let previousScore: number | null = null;
    let feedback: EvaluationFeedback | null = null;
    let iteration = 0;
    let stoppedReason = '';

    this.log(`Starting reliability loop for ${documentType} document`);
    this.log(`Config: threshold=${this.config.qualityThreshold}, maxIterations=${this.config.maxIterations}`);

    while (true) {
      iteration++;
      const iterationStartTime = Date.now();

      this.log(`\n=== ITERATION ${iteration} ===`);

      // Check timeout
      if (Date.now() - startTime > this.config.timeoutMs) {
        stoppedReason = `Timeout exceeded (${this.config.timeoutMs}ms)`;
        this.log(stoppedReason);
        break;
      }

      // --- PHASE 1: EXTRACT ---
      this.log('Phase 1: Extracting...');
      if (onProgress) {
        onProgress(iteration, previousScore || 0, 'extracting');
      }

      try {
        currentData = await this.extractFn(currentPrompt, sourceText);
        this.log('Extraction complete', { 
          fieldsExtracted: Object.keys(currentData).filter(k => !k.startsWith('_')).length 
        });
      } catch (error) {
        this.log('Extraction failed', error);
        stoppedReason = `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        break;
      }

      // --- PHASE 2: EVALUATE ---
      this.log('Phase 2: Evaluating...');
      if (onProgress) {
        onProgress(iteration, previousScore || 0, 'evaluating');
      }

      try {
        const evaluation = await this.evaluator.evaluate(
          sourceText,
          documentType,
          currentData
        );
        currentScore = evaluation.score;
        feedback = evaluation.feedback;

        this.log(`Evaluation complete: overall=${(currentScore.overall * 100).toFixed(1)}%`, {
          completeness: (currentScore.completeness * 100).toFixed(1) + '%',
          accuracy: (currentScore.accuracy * 100).toFixed(1) + '%',
          validity: (currentScore.clinicalValidity * 100).toFixed(1) + '%',
          consistency: (currentScore.consistency * 100).toFixed(1) + '%',
        });
      } catch (error) {
        this.log('Evaluation failed', error);
        stoppedReason = `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        break;
      }

      // Record iteration
      const iterationRecord: IterationRecord = {
        iteration,
        extractedData: currentData,
        score: currentScore,
        feedback,
        improvementFromPrevious: previousScore !== null
          ? currentScore.overall - previousScore
          : undefined,
        startedAt: new Date(iterationStartTime),
        durationMs: Date.now() - iterationStartTime,
      };
      iterationHistory.push(iterationRecord);

      // Log improvement
      if (previousScore !== null) {
        const improvement = currentScore.overall - previousScore;
        this.log(`Improvement from previous: ${improvement >= 0 ? '+' : ''}${(improvement * 100).toFixed(1)}%`);
      }

      // --- PHASE 3: CHECK IF SHOULD CONTINUE ---
      const decision = this.optimizer.shouldContinue(
        currentScore.overall,
        previousScore,
        iteration,
        this.config
      );

      this.log(`Continue decision: ${decision.continue ? 'YES' : 'NO'} - ${decision.reason}`);

      if (!decision.continue) {
        stoppedReason = decision.reason;
        break;
      }

      // --- PHASE 4: OPTIMIZE ---
      this.log('Phase 4: Optimizing prompt...');
      if (onProgress) {
        onProgress(iteration, currentScore.overall, 'optimizing');
      }

      currentPrompt = this.optimizer.buildOptimizedPrompt(
        baseExtractionPrompt,
        feedback,
        currentData,
        iteration
      );

      // Track changes for logging
      if (this.config.verbose && iteration > 1) {
        const prevData = iterationHistory[iteration - 2]?.extractedData;
        if (prevData) {
          const changes = this.optimizer.summarizeChanges(prevData, currentData);
          this.log('Changes from previous iteration', changes);
        }
      }

      previousScore = currentScore.overall;
    }

    // Build final result
    const result: ReliabilityLoopResult = {
      finalData: currentData!,
      finalScore: currentScore?.overall || 0,
      iterations: iteration,
      iterationHistory,
      metThreshold: (currentScore?.overall || 0) >= this.config.qualityThreshold,
      processingTimeMs: Date.now() - startTime,
      stoppedReason,
    };

    this.log('\n=== LOOP COMPLETE ===');
    this.log(`Final score: ${(result.finalScore * 100).toFixed(1)}%`);
    this.log(`Iterations: ${result.iterations}`);
    this.log(`Threshold met: ${result.metThreshold}`);
    this.log(`Stopped reason: ${result.stoppedReason}`);
    this.log(`Total time: ${result.processingTimeMs}ms`);

    return result;
  }

  /**
   * Get the configuration
   */
  getConfig(): ReliabilityLoopConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReliabilityLoopConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Factory function to create a ReliabilityLoop with sensible defaults
 */
export function createReliabilityLoop(
  extractFn: ExtractionFunction,
  options: {
    qualityThreshold?: number;
    maxIterations?: number;
    verbose?: boolean;
    apiKey?: string;
  } = {}
): ReliabilityLoop {
  return new ReliabilityLoop(
    {
      qualityThreshold: options.qualityThreshold ?? 0.95,
      maxIterations: options.maxIterations ?? 3,
      verbose: options.verbose ?? true,
    },
    extractFn,
    options.apiKey
  );
}

/**
 * Helper to run a single extraction without the loop
 * Useful for comparison or when reliability loop is disabled
 */
export async function singlePassExtraction(
  sourceText: string,
  documentType: DocumentType,
  extractFn: ExtractionFunction,
  prompt: string,
  options: { apiKey?: string; verbose?: boolean } = {}
): Promise<{
  data: ExtractedClinicalData;
  score: EvaluationScore;
  feedback: EvaluationFeedback;
}> {
  const evaluator = new ExtractionEvaluator({
    model: 'gemini-2.0-flash',
    apiKey: options.apiKey,
    verbose: options.verbose ?? false,
  });

  const data = await extractFn(prompt, sourceText);
  const { score, feedback } = await evaluator.evaluate(sourceText, documentType, data);

  return { data, score, feedback };
}
