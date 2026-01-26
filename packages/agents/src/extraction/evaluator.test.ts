/**
 * Unit tests for MARC-v1 Extraction Evaluator
 * 
 * Tests the 4-dimension evaluation system:
 * - Completeness (30%): Are required fields present?
 * - Accuracy (40%): Do extracted values match source?
 * - Clinical Validity (15%): Are values medically valid?
 * - Consistency (15%): Are fields internally consistent?
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtractionEvaluator } from './evaluator';
import type { DocumentType, ExtractedClinicalData } from './types';

// Mock the GoogleGenerativeAI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '{"accuracy": 0.9}',
        },
      }),
    }),
  })),
}));

describe('ExtractionEvaluator', () => {
  let evaluator: ExtractionEvaluator;

  beforeEach(() => {
    evaluator = new ExtractionEvaluator({
      model: 'gemini-2.0-flash',
      apiKey: 'test-api-key',
      verbose: false,
    });
  });

  describe('Completeness Scoring', () => {
    it('should score high for pathology with all required fields', () => {
      const data: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: '2',
        margins: 'Negative',
        ihcMarkers: { ER: 'Positive', PR: 'Positive', HER2: 'Negative' },
        date: '2024-01-15',
        institution: 'AIIMS',
      };

      // Access private method via any - returns object with score property
      const result = (evaluator as any).checkCompleteness('pathology' as DocumentType, data);
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it('should score lower for pathology missing required fields', () => {
      const data: ExtractedClinicalData = {
        // Missing histology and grade (required)
        margins: 'Negative',
      };

      const result = (evaluator as any).checkCompleteness('pathology' as DocumentType, data);
      expect(result.score).toBeLessThan(0.7);
    });

    it('should handle genomics document type', () => {
      const data: ExtractedClinicalData = {
        mutations: [
          { gene: 'EGFR', variant: 'L858R', actionable: true },
        ],
        msiStatus: 'MSS',
        tmb: 8,
      };

      const result = (evaluator as any).checkCompleteness('genomics' as DocumentType, data);
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('should handle empty data gracefully', () => {
      const data: ExtractedClinicalData = {};

      const result = (evaluator as any).checkCompleteness('pathology' as DocumentType, data);
      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Clinical Validity Checks', () => {
    it('should validate pathology grade format', () => {
      const validData: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: 'Grade 2',
      };

      const invalidData: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: 'XYZ Invalid',
      };

      const validResult = (evaluator as any).checkClinicalValidity('pathology', validData);
      const invalidResult = (evaluator as any).checkClinicalValidity('pathology', invalidData);

      expect(validResult.score).toBeGreaterThanOrEqual(invalidResult.score);
    });

    it('should validate MSI status format', () => {
      const validData: ExtractedClinicalData = {
        mutations: [],
        msiStatus: 'MSI-H',
      };

      const invalidData: ExtractedClinicalData = {
        mutations: [],
        msiStatus: 'Invalid Status',
      };

      const validResult = (evaluator as any).checkClinicalValidity('genomics', validData);
      const invalidResult = (evaluator as any).checkClinicalValidity('genomics', invalidData);

      expect(validResult.score).toBeGreaterThanOrEqual(invalidResult.score);
    });
  });

  describe('Consistency Checks', () => {
    it('should flag carcinoma without grade as inconsistent', () => {
      const inconsistentData: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        // Missing grade - inconsistent for carcinoma
      };

      const consistentData: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: '2',
      };

      const inconsistentResult = (evaluator as any).checkConsistency('pathology', inconsistentData);
      const consistentResult = (evaluator as any).checkConsistency('pathology', consistentData);

      expect(consistentResult.score).toBeGreaterThanOrEqual(inconsistentResult.score);
    });
  });

  describe('Overall Evaluation', () => {
    it('should return complete evaluation result structure', async () => {
      const sourceText = `
        HISTOPATHOLOGY REPORT
        Diagnosis: Invasive ductal carcinoma
        Grade: Grade 2 (moderately differentiated)
        Margins: All margins negative
        ER: Positive (90%)
        PR: Positive (80%)
        HER2: Negative (1+)
        Ki-67: 25%
      `;

      const data: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: 'Grade 2',
        margins: 'Negative',
        ihcMarkers: {
          ER: 'Positive (90%)',
          PR: 'Positive (80%)',
          HER2: 'Negative (1+)',
          'Ki-67': '25%',
        },
      };

      const result = await evaluator.evaluate(sourceText, 'pathology' as DocumentType, data);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result.score).toHaveProperty('overall');
      expect(result.score).toHaveProperty('completeness');
      expect(result.score).toHaveProperty('accuracy');
      expect(result.score).toHaveProperty('clinicalValidity');
      expect(result.score).toHaveProperty('consistency');

      // All scores should be between 0 and 1
      expect(result.score.overall).toBeGreaterThanOrEqual(0);
      expect(result.score.overall).toBeLessThanOrEqual(1);
    });

    it('should generate feedback for missing fields', async () => {
      const sourceText = 'Pathology report with some findings';
      const data: ExtractedClinicalData = {
        // Missing required fields
        rawText: sourceText,
      };

      const result = await evaluator.evaluate(sourceText, 'pathology' as DocumentType, data);

      expect(result.feedback.missingFields.length).toBeGreaterThan(0);
      expect(result.feedback.missingFields).toContain('histology');
      expect(result.feedback.missingFields).toContain('grade');
    });
  });
});
