/**
 * Unit tests for MARC-v1 Extraction Optimizer
 * 
 * Tests the feedback injection and continuation logic:
 * - Prompt optimization with feedback
 * - shouldContinue decision logic
 * - Change summarization between iterations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtractionOptimizer } from './optimizer';
import type { EvaluationFeedback, ExtractedClinicalData, ReliabilityLoopConfig } from './types';

describe('ExtractionOptimizer', () => {
  let optimizer: ExtractionOptimizer;

  beforeEach(() => {
    optimizer = new ExtractionOptimizer({
      verbose: false,
    });
  });

  describe('shouldContinue', () => {
    const baseConfig: ReliabilityLoopConfig = {
      qualityThreshold: 0.95,
      maxIterations: 3,
      minImprovement: 0.03,
      timeoutMs: 60000,
      model: 'gemini-2.0-flash',
      verbose: false,
    };

    it('should stop when quality threshold is met', () => {
      const result = optimizer.shouldContinue(0.96, 0.85, 1, baseConfig);
      
      expect(result.continue).toBe(false);
      expect(result.reason).toContain('threshold');
    });

    it('should continue when score is below threshold', () => {
      const result = optimizer.shouldContinue(0.80, 0.75, 1, baseConfig);
      
      expect(result.continue).toBe(true);
    });

    it('should stop when max iterations reached', () => {
      const result = optimizer.shouldContinue(0.80, 0.75, 3, baseConfig);
      
      expect(result.continue).toBe(false);
      expect(result.reason).toContain('Max iterations');
    });

    it('should stop when improvement is insufficient', () => {
      // Only 1% improvement (< 3% threshold)
      const result = optimizer.shouldContinue(0.81, 0.80, 2, baseConfig);
      
      expect(result.continue).toBe(false);
      expect(result.reason).toContain('improvement');
    });

    it('should continue on first iteration regardless of previous score', () => {
      const result = optimizer.shouldContinue(0.80, null, 1, baseConfig);
      
      expect(result.continue).toBe(true);
    });
  });

  describe('buildOptimizedPrompt', () => {
    const basePrompt = 'Extract clinical data from this pathology report.';
    
    const feedback: EvaluationFeedback = {
      overallScore: 0.7,
      issues: [
        { severity: 'critical', field: 'grade', description: 'Required field "grade" is missing' },
        { severity: 'major', field: 'margins', description: 'Important field "margins" is missing' },
      ],
      missingFields: ['grade', 'margins'],
      priorityFields: ['grade'],
      suggestions: ['Focus on extracting: grade, margins'],
    };

    const previousAttempt: ExtractedClinicalData = {
      histology: 'Invasive ductal carcinoma',
    };

    it('should include feedback section in optimized prompt', () => {
      const optimizedPrompt = optimizer.buildOptimizedPrompt(
        basePrompt,
        feedback,
        previousAttempt,
        1
      );

      expect(optimizedPrompt).toContain(basePrompt);
      expect(optimizedPrompt).toContain('FEEDBACK');
      expect(optimizedPrompt).toContain('70.0%');
    });

    it('should highlight critical issues', () => {
      const optimizedPrompt = optimizer.buildOptimizedPrompt(
        basePrompt,
        feedback,
        previousAttempt,
        1
      );

      expect(optimizedPrompt).toContain('CRITICAL');
      expect(optimizedPrompt).toContain('grade');
    });

    it('should include missing fields', () => {
      const optimizedPrompt = optimizer.buildOptimizedPrompt(
        basePrompt,
        feedback,
        previousAttempt,
        1
      );

      expect(optimizedPrompt).toContain('MISSING FIELDS');
      expect(optimizedPrompt).toContain('grade');
      expect(optimizedPrompt).toContain('margins');
    });

    it('should include previous attempt data', () => {
      const optimizedPrompt = optimizer.buildOptimizedPrompt(
        basePrompt,
        feedback,
        previousAttempt,
        1
      );

      expect(optimizedPrompt).toContain('PREVIOUS EXTRACTION ATTEMPT');
      expect(optimizedPrompt).toContain('Invasive ductal carcinoma');
    });

    it('should include iteration number', () => {
      const optimizedPrompt = optimizer.buildOptimizedPrompt(
        basePrompt,
        feedback,
        previousAttempt,
        2
      );

      expect(optimizedPrompt).toContain('Iteration 2');
    });
  });

  describe('summarizeChanges', () => {
    it('should detect added fields', () => {
      const previous: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
      };

      const current: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: '2',
      };

      const summary = optimizer.summarizeChanges(previous, current);

      expect(summary.added).toContain('grade');
    });

    it('should detect modified fields', () => {
      const previous: ExtractedClinicalData = {
        histology: 'IDC',
      };

      const current: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
      };

      const summary = optimizer.summarizeChanges(previous, current);

      expect(summary.modified).toContain('histology');
    });

    it('should detect removed fields', () => {
      const previous: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: '2',
      };

      const current: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        // grade removed
      };

      const summary = optimizer.summarizeChanges(previous, current);

      expect(summary.removed).toContain('grade');
    });

    it('should return empty arrays for identical data', () => {
      const data: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: '2',
      };

      const summary = optimizer.summarizeChanges(data, { ...data });

      expect(summary.added).toHaveLength(0);
      expect(summary.modified).toHaveLength(0);
      expect(summary.removed).toHaveLength(0);
    });
  });
});
