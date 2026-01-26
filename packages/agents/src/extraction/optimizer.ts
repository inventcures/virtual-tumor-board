/**
 * MARC-v1 Extraction Optimizer
 * 
 * Takes evaluation feedback and generates improved extraction prompts.
 * Implements the feedback injection pattern from Penn-RAIL MARC-v1.
 */

import type {
  DocumentType,
  ExtractedClinicalData,
  EvaluationFeedback,
  ReliabilityLoopConfig,
  ContinueDecision,
} from './types';

/**
 * Extraction Optimizer
 * 
 * Builds optimized prompts with feedback injection and
 * decides when to continue/stop the reliability loop.
 */
export class ExtractionOptimizer {
  private verbose: boolean;

  constructor(config: { verbose?: boolean } = {}) {
    this.verbose = config.verbose ?? true;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.verbose) {
      if (data) {
        console.log(`[MARC Optimizer] ${message}`, data);
      } else {
        console.log(`[MARC Optimizer] ${message}`);
      }
    }
  }

  /**
   * Build an optimized prompt incorporating feedback
   * 
   * This implements the Penn-RAIL feedback injection pattern:
   * - Append feedback section to base prompt
   * - Categorize issues by severity
   * - Include previous attempt for reference
   * - Highlight priority fields
   * 
   * @param basePrompt - Original extraction prompt
   * @param feedback - Evaluation feedback from previous attempt
   * @param previousAttempt - Data from previous extraction attempt
   * @param iteration - Current iteration number
   * @returns Optimized prompt with feedback injected
   */
  buildOptimizedPrompt(
    basePrompt: string,
    feedback: EvaluationFeedback,
    previousAttempt: ExtractedClinicalData,
    iteration: number
  ): string {
    this.log(`Building optimized prompt for iteration ${iteration + 1}`);

    // Categorize issues by severity
    const criticalIssues = feedback.issues.filter(i => i.severity === 'critical');
    const majorIssues = feedback.issues.filter(i => i.severity === 'major');
    const minorIssues = feedback.issues.filter(i => i.severity === 'minor');

    // Build feedback section
    let feedbackSection = `
--- FEEDBACK FROM QUALITY EVALUATION (Iteration ${iteration}) ---
Current Score: ${(feedback.overallScore * 100).toFixed(1)}% (Target: 95%)

`;

    // Critical issues - MUST fix
    if (criticalIssues.length > 0) {
      feedbackSection += `CRITICAL ISSUES (MUST FIX):
${criticalIssues.map(i => this.formatIssue(i)).join('\n')}

`;
    }

    // Major issues - SHOULD fix
    if (majorIssues.length > 0) {
      feedbackSection += `MAJOR ISSUES (SHOULD FIX):
${majorIssues.map(i => this.formatIssue(i)).join('\n')}

`;
    }

    // Minor issues - nice to fix
    if (minorIssues.length > 0 && iteration >= 2) {
      // Only show minor issues on later iterations
      feedbackSection += `MINOR ISSUES:
${minorIssues.map(i => this.formatIssue(i)).join('\n')}

`;
    }

    // Missing fields
    if (feedback.missingFields.length > 0) {
      feedbackSection += `MISSING FIELDS TO EXTRACT:
${feedback.missingFields.map(f => `  - ${f}`).join('\n')}

`;
    }

    // Suggestions
    if (feedback.suggestions.length > 0) {
      feedbackSection += `EXTRACTION HINTS:
${feedback.suggestions.map(s => `  - ${s}`).join('\n')}

`;
    }

    // Priority fields
    if (feedback.priorityFields.length > 0) {
      feedbackSection += `PRIORITY: Focus extraction on these fields: ${feedback.priorityFields.join(', ')}

`;
    }

    // Previous attempt (truncated for context)
    const prevAttemptStr = JSON.stringify(previousAttempt, null, 2);
    const truncatedPrevAttempt = prevAttemptStr.length > 1500 
      ? prevAttemptStr.slice(0, 1500) + '\n  ... (truncated)'
      : prevAttemptStr;

    feedbackSection += `PREVIOUS EXTRACTION ATTEMPT (for reference):
${truncatedPrevAttempt}

`;

    // Instructions
    feedbackSection += `INSTRUCTIONS FOR RE-EXTRACTION:
1. Address ALL critical and major issues listed above
2. Ensure extracted values EXACTLY match what appears in the source document
3. If a field truly doesn't exist in the source, note it as null
4. Pay special attention to priority fields: ${feedback.priorityFields.join(', ') || 'none'}
5. Include units for all measurements (mm, cm, %, etc.)
`;

    // Combine base prompt with feedback
    return `${basePrompt}

${feedbackSection}`;
  }

  /**
   * Format a single issue for the feedback section
   */
  private formatIssue(issue: { severity: string; field: string; description: string; suggestedFix?: string }): string {
    let line = `  - [${issue.field}] ${issue.description}`;
    if (issue.suggestedFix) {
      line += `\n    → FIX: ${issue.suggestedFix}`;
    }
    return line;
  }

  /**
   * Decide if the optimization loop should continue
   * 
   * @param currentScore - Score from current iteration
   * @param previousScore - Score from previous iteration (null for first)
   * @param iteration - Current iteration number (1-based)
   * @param config - Reliability loop configuration
   * @returns Decision with reason
   */
  shouldContinue(
    currentScore: number,
    previousScore: number | null,
    iteration: number,
    config: ReliabilityLoopConfig
  ): ContinueDecision {
    this.log(`Checking continue decision: score=${(currentScore * 100).toFixed(1)}%, iteration=${iteration}`);

    // Check 1: Quality threshold met
    if (currentScore >= config.qualityThreshold) {
      return {
        continue: false,
        reason: `Quality threshold met (${(currentScore * 100).toFixed(1)}% >= ${(config.qualityThreshold * 100).toFixed(1)}%)`,
      };
    }

    // Check 2: Max iterations reached
    if (iteration >= config.maxIterations) {
      return {
        continue: false,
        reason: `Max iterations reached (${iteration}/${config.maxIterations})`,
      };
    }

    // Check 3: No improvement (plateau detection)
    if (previousScore !== null) {
      const improvement = currentScore - previousScore;
      
      if (improvement < 0) {
        // Score got worse - this is unusual but can happen
        this.log(`Warning: Score decreased from ${(previousScore * 100).toFixed(1)}% to ${(currentScore * 100).toFixed(1)}%`);
        // Continue anyway, might recover on next iteration
      }
      
      if (improvement >= 0 && improvement < config.minImprovement) {
        return {
          continue: false,
          reason: `Insufficient improvement (${(improvement * 100).toFixed(1)}% < ${(config.minImprovement * 100).toFixed(1)}% threshold)`,
        };
      }
    }

    // Check 4: Already high score (even if not at threshold)
    if (currentScore >= 0.9 && iteration >= 2) {
      // At 90%+ after 2 iterations, diminishing returns
      return {
        continue: false,
        reason: `High score achieved (${(currentScore * 100).toFixed(1)}%) with diminishing returns expected`,
      };
    }

    // Continue with optimization
    const expectedImprovement = this.estimateExpectedImprovement(currentScore, iteration);
    return {
      continue: true,
      reason: `Continuing optimization (expected improvement: ~${(expectedImprovement * 100).toFixed(1)}%)`,
    };
  }

  /**
   * Estimate expected improvement for next iteration
   * Based on typical improvement curves
   */
  private estimateExpectedImprovement(currentScore: number, iteration: number): number {
    // Improvement typically follows diminishing returns
    // Higher scores and later iterations see less improvement
    const scoreFactor = 1 - currentScore; // More room to improve at lower scores
    const iterationFactor = 1 / (iteration + 1); // Less improvement in later iterations
    
    // Base improvement rate of ~15% of remaining gap per iteration
    return scoreFactor * iterationFactor * 0.3;
  }

  /**
   * Calculate a weight for how much to emphasize feedback
   * Higher iterations should have more aggressive feedback
   */
  getFeedbackEmphasis(iteration: number, currentScore: number): 'low' | 'medium' | 'high' {
    if (iteration >= 3 || currentScore < 0.5) {
      return 'high'; // Aggressive feedback for struggling extractions
    }
    if (iteration >= 2 || currentScore < 0.7) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate a summary of what changed between attempts
   * Useful for debugging and logging
   */
  summarizeChanges(
    previousAttempt: ExtractedClinicalData,
    currentAttempt: ExtractedClinicalData
  ): { added: string[]; removed: string[]; modified: string[] } {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const allKeys = Array.from(new Set([
      ...Object.keys(previousAttempt),
      ...Object.keys(currentAttempt),
    ]));

    for (const key of allKeys) {
      if (key.startsWith('_')) continue; // Skip internal fields

      const prev = (previousAttempt as Record<string, unknown>)[key];
      const curr = (currentAttempt as Record<string, unknown>)[key];

      const prevPresent = prev !== null && prev !== undefined;
      const currPresent = curr !== null && curr !== undefined;

      if (!prevPresent && currPresent) {
        added.push(key);
      } else if (prevPresent && !currPresent) {
        removed.push(key);
      } else if (prevPresent && currPresent) {
        // Check if value changed
        if (JSON.stringify(prev) !== JSON.stringify(curr)) {
          modified.push(key);
        }
      }
    }

    return { added, removed, modified };
  }
}
