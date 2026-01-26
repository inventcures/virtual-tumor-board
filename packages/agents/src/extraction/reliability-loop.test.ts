/**
 * Unit tests for MARC-v1 Reliability Loop
 * 
 * Tests the main loop orchestration:
 * - Loop execution and termination conditions
 * - Progress callbacks
 * - Factory function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReliabilityLoop, createReliabilityLoop, singlePassExtraction } from './reliability-loop';
import type { ExtractedClinicalData, DocumentType } from './types';

// Mock the GoogleGenerativeAI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '{"accuracy": 0.95}',
        },
      }),
    }),
  })),
}));

describe('ReliabilityLoop', () => {
  // Mock extraction function that returns progressively better results
  const mockExtractFn = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractFn.mockReset();
  });

  describe('createReliabilityLoop', () => {
    it('should create a ReliabilityLoop with default options', () => {
      const loop = createReliabilityLoop(mockExtractFn);
      
      expect(loop).toBeInstanceOf(ReliabilityLoop);
      expect(loop.getConfig().qualityThreshold).toBe(0.95);
      expect(loop.getConfig().maxIterations).toBe(3);
    });

    it('should accept custom options', () => {
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.90,
        maxIterations: 5,
        verbose: false,
      });
      
      expect(loop.getConfig().qualityThreshold).toBe(0.90);
      expect(loop.getConfig().maxIterations).toBe(5);
      expect(loop.getConfig().verbose).toBe(false);
    });
  });

  describe('ReliabilityLoop.execute', () => {
    it('should stop when quality threshold is met', async () => {
      // Mock extraction that returns high-quality data
      const highQualityData: ExtractedClinicalData = {
        histology: 'Invasive ductal carcinoma',
        grade: 'Grade 2',
        margins: 'Negative',
        ihcMarkers: { ER: 'Positive', PR: 'Positive', HER2: 'Negative' },
      };
      
      mockExtractFn.mockResolvedValue(highQualityData);
      
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.85, // Lower threshold to ensure we meet it
        maxIterations: 3,
        verbose: false,
      });
      
      const result = await loop.execute(
        'Sample pathology text',
        'pathology' as DocumentType,
        'Extract pathology data'
      );
      
      expect(result.metThreshold).toBe(true);
      expect(result.iterations).toBeGreaterThanOrEqual(1);
      expect(result.finalData).toBeDefined();
    });

    it('should stop at max iterations if threshold not met', async () => {
      // Mock extraction that returns low-quality data
      const lowQualityData: ExtractedClinicalData = {
        rawText: 'Some text',
        // Missing required fields
      };
      
      mockExtractFn.mockResolvedValue(lowQualityData);
      
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.99, // Very high threshold that won't be met
        maxIterations: 2,
        verbose: false,
      });
      
      const result = await loop.execute(
        'Sample text',
        'pathology' as DocumentType,
        'Extract data'
      );
      
      expect(result.iterations).toBeLessThanOrEqual(2);
      expect(result.stoppedReason).toBeDefined();
    });

    it('should track iteration history', async () => {
      const data: ExtractedClinicalData = {
        histology: 'Carcinoma',
        grade: '2',
      };
      
      mockExtractFn.mockResolvedValue(data);
      
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.8,
        maxIterations: 2,
        verbose: false,
      });
      
      const result = await loop.execute(
        'Sample text',
        'pathology' as DocumentType,
        'Extract data'
      );
      
      expect(result.iterationHistory).toBeDefined();
      expect(result.iterationHistory.length).toBeGreaterThanOrEqual(1);
      expect(result.iterationHistory[0]).toHaveProperty('iteration');
      expect(result.iterationHistory[0]).toHaveProperty('extractedData');
      expect(result.iterationHistory[0]).toHaveProperty('score');
    });

    it('should call progress callback on each phase', async () => {
      const data: ExtractedClinicalData = {
        histology: 'Carcinoma',
        grade: '2',
      };
      
      mockExtractFn.mockResolvedValue(data);
      
      const progressCallback = vi.fn();
      
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.8,
        maxIterations: 1,
        verbose: false,
      });
      
      await loop.execute(
        'Sample text',
        'pathology' as DocumentType,
        'Extract data',
        progressCallback
      );
      
      // Progress callback should be called at least twice (extracting, evaluating)
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.some(
        call => call[2] === 'extracting'
      )).toBe(true);
      expect(progressCallback.mock.calls.some(
        call => call[2] === 'evaluating'
      )).toBe(true);
    });

    it('should handle extraction errors gracefully', async () => {
      mockExtractFn.mockRejectedValue(new Error('Extraction failed'));
      
      const loop = createReliabilityLoop(mockExtractFn, {
        qualityThreshold: 0.95,
        maxIterations: 3,
        verbose: false,
      });
      
      const result = await loop.execute(
        'Sample text',
        'pathology' as DocumentType,
        'Extract data'
      );
      
      expect(result.stoppedReason).toContain('Extraction failed');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration values', () => {
      const loop = createReliabilityLoop(mockExtractFn);
      
      loop.updateConfig({ qualityThreshold: 0.90, maxIterations: 5 });
      
      expect(loop.getConfig().qualityThreshold).toBe(0.90);
      expect(loop.getConfig().maxIterations).toBe(5);
    });

    it('should preserve unmodified values', () => {
      const loop = createReliabilityLoop(mockExtractFn, {
        verbose: true,
      });
      
      loop.updateConfig({ qualityThreshold: 0.90 });
      
      expect(loop.getConfig().verbose).toBe(true);
    });
  });
});

describe('singlePassExtraction', () => {
  it('should perform extraction without loop', async () => {
    const mockExtractFn = vi.fn().mockResolvedValue({
      histology: 'Carcinoma',
      grade: '2',
    } as ExtractedClinicalData);
    
    const result = await singlePassExtraction(
      'Sample pathology text',
      'pathology' as DocumentType,
      mockExtractFn,
      'Extract pathology data',
      { verbose: false }
    );
    
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('feedback');
    expect(mockExtractFn).toHaveBeenCalledTimes(1);
  });
});
