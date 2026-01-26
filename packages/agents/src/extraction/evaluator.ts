/**
 * MARC-v1 Extraction Evaluator
 * 
 * Evaluates extracted clinical data quality on 4 dimensions:
 * 1. Completeness - Are all expected fields present?
 * 2. Accuracy - Do extracted values match source text?
 * 3. Consistency - Are values internally coherent?
 * 4. Clinical Validity - Are values clinically plausible?
 * 
 * Based on Penn-RAIL MARC-v1 architecture.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  DocumentType,
  ExtractedClinicalData,
  EvaluationScore,
  EvaluationFeedback,
  EvaluationIssue,
  FieldScore,
  EvaluatorConfig,
} from './types';
import { DEFAULT_EVALUATOR_WEIGHTS } from './types';
import {
  EXTRACTION_RUBRICS,
  CLINICAL_VALIDITY_RULES,
  getRubric,
  getFieldWeight,
} from './rubrics';

/**
 * Extraction Evaluator
 * 
 * Scores extraction quality and generates actionable feedback
 * for the optimizer to improve extraction.
 */
export class ExtractionEvaluator {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private weights: typeof DEFAULT_EVALUATOR_WEIGHTS;
  private verbose: boolean;

  constructor(config: Partial<EvaluatorConfig> & { apiKey?: string; verbose?: boolean } = {}) {
    const apiKey = config.apiKey || 
      process.env.GEMINI_API_KEY || 
      process.env.GOOGLE_AI_API_KEY || 
      process.env.GOOGLE_API_KEY || 
      "";
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = config.model || "gemini-2.0-flash";
    this.weights = config.weights || DEFAULT_EVALUATOR_WEIGHTS;
    this.verbose = config.verbose ?? true;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.verbose) {
      if (data) {
        console.log(`[MARC Evaluator] ${message}`, data);
      } else {
        console.log(`[MARC Evaluator] ${message}`);
      }
    }
  }

  /**
   * Main evaluation method
   * 
   * @param sourceText - Original document text
   * @param documentType - Type of document being evaluated
   * @param extractedData - Data extracted from the document
   * @returns Evaluation score and feedback
   */
  async evaluate(
    sourceText: string,
    documentType: DocumentType,
    extractedData: ExtractedClinicalData
  ): Promise<{ score: EvaluationScore; feedback: EvaluationFeedback }> {
    this.log(`Evaluating extraction for ${documentType} document`);

    // 1. Schema-based completeness check (fast, deterministic)
    const completenessResult = this.checkCompleteness(documentType, extractedData);
    this.log(`Completeness score: ${(completenessResult.score * 100).toFixed(1)}%`);

    // 2. LLM-based accuracy check (verify against source)
    const accuracyResult = await this.checkAccuracy(sourceText, documentType, extractedData);
    this.log(`Accuracy score: ${(accuracyResult.score * 100).toFixed(1)}%`);

    // 3. Rule-based clinical validity check
    const validityResult = this.checkClinicalValidity(documentType, extractedData);
    this.log(`Clinical validity score: ${(validityResult.score * 100).toFixed(1)}%`);

    // 4. Consistency check
    const consistencyResult = this.checkConsistency(documentType, extractedData);
    this.log(`Consistency score: ${(consistencyResult.score * 100).toFixed(1)}%`);

    // Calculate weighted overall score
    const overall =
      completenessResult.score * this.weights.completeness +
      accuracyResult.score * this.weights.accuracy +
      validityResult.score * this.weights.clinicalValidity +
      consistencyResult.score * this.weights.consistency;

    this.log(`Overall score: ${(overall * 100).toFixed(1)}%`);

    // Build score object
    const score: EvaluationScore = {
      overall,
      completeness: completenessResult.score,
      accuracy: accuracyResult.score,
      clinicalValidity: validityResult.score,
      consistency: consistencyResult.score,
      breakdown: [
        ...completenessResult.fields,
        ...accuracyResult.fields,
      ],
    };

    // Generate actionable feedback
    const feedback = this.generateFeedback(
      score,
      documentType,
      extractedData,
      completenessResult,
      accuracyResult,
      validityResult,
      consistencyResult
    );

    return { score, feedback };
  }

  /**
   * Check completeness of extraction against rubric
   */
  checkCompleteness(
    docType: DocumentType,
    data: ExtractedClinicalData
  ): { score: number; fields: FieldScore[] } {
    const rubric = getRubric(docType);
    const fields: FieldScore[] = [];

    let totalWeight = 0;
    let weightedScore = 0;

    // Check required fields
    for (const field of rubric.required) {
      const value = (data as Record<string, unknown>)[field];
      const present = this.isFieldPresent(value);
      const weight = 1.0;
      
      fields.push({
        field,
        present,
        score: present ? 1 : 0,
        issues: present ? undefined : [`Required field "${field}" is missing`],
      });
      
      totalWeight += weight;
      weightedScore += present ? weight : 0;
    }

    // Check important fields
    for (const field of rubric.important) {
      const value = (data as Record<string, unknown>)[field];
      const present = this.isFieldPresent(value);
      const weight = 0.7;
      
      fields.push({
        field,
        present,
        score: present ? 1 : 0.5,
        issues: present ? undefined : [`Important field "${field}" is missing`],
      });
      
      totalWeight += weight;
      weightedScore += present ? weight : 0;
    }

    // Check optional fields (don't penalize heavily)
    for (const field of rubric.optional) {
      const value = (data as Record<string, unknown>)[field];
      const present = this.isFieldPresent(value);
      const weight = 0.3;
      
      fields.push({
        field,
        present,
        score: present ? 1 : 0.8,
      });
      
      totalWeight += weight;
      weightedScore += present ? weight : weight * 0.8;
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
    return { score, fields };
  }

  /**
   * Check if a field value is meaningfully present
   */
  private isFieldPresent(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }

  /**
   * LLM-based accuracy verification against source text
   */
  async checkAccuracy(
    sourceText: string,
    docType: DocumentType,
    data: ExtractedClinicalData
  ): Promise<{ score: number; fields: FieldScore[] }> {
    // If no extracted data, return low score
    const dataKeys = Object.keys(data).filter(k => !k.startsWith('_') && this.isFieldPresent((data as Record<string, unknown>)[k]));
    if (dataKeys.length === 0) {
      return { score: 0.5, fields: [] };
    }

    const model = this.genAI.getGenerativeModel({ model: this.model });

    const prompt = `You are a medical data quality evaluator. Your task is to verify if extracted data accurately matches the source document.

SOURCE TEXT (first 4000 characters):
---
${sourceText.slice(0, 4000)}
---

EXTRACTED DATA:
---
${JSON.stringify(data, null, 2)}
---

DOCUMENT TYPE: ${docType}

For each non-empty extracted field, verify:
1. Is the value ACCURATE (matches what's in the source)?
2. Is it COMPLETE (captures the full information)?
3. Is it CORRECTLY FORMATTED?

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "fieldScores": [
    {"field": "fieldName", "accurate": true, "score": 1.0, "issue": null},
    {"field": "fieldName", "accurate": false, "score": 0.3, "issue": "Description of the issue"}
  ],
  "overallAccuracy": 0.85
}

Scoring guidelines:
- 1.0 = Perfectly accurate and complete
- 0.7-0.9 = Mostly accurate with minor issues
- 0.4-0.6 = Partially accurate or incomplete
- 0.0-0.3 = Incorrect or significantly wrong

Be strict but fair. If something is extracted correctly, give it a high score.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const fields: FieldScore[] = (parsed.fieldScores || []).map((f: { field: string; accurate: boolean; score: number; issue: string | null }) => ({
          field: f.field,
          present: true,
          score: f.score,
          issues: f.issue ? [f.issue] : undefined,
        }));

        return {
          score: parsed.overallAccuracy || 0.7,
          fields,
        };
      }
    } catch (error) {
      this.log('LLM accuracy check failed, using fallback', error);
    }

    // Fallback: moderate score
    return { score: 0.7, fields: [] };
  }

  /**
   * Rule-based clinical validity check
   */
  checkClinicalValidity(
    docType: DocumentType,
    data: ExtractedClinicalData
  ): { score: number; issues: string[] } {
    const rules = CLINICAL_VALIDITY_RULES[docType] || {};
    const issues: string[] = [];
    let validFields = 0;
    let totalCheckedFields = 0;

    for (const [field, validateFn] of Object.entries(rules)) {
      const value = (data as Record<string, unknown>)[field];
      if (this.isFieldPresent(value)) {
        totalCheckedFields++;
        const result = validateFn(value);
        if (result.valid) {
          validFields++;
        } else if (result.issue) {
          issues.push(result.issue);
        }
      }
    }

    // Score based on valid/total ratio, with minimum of 0.5 if no rules apply
    const score = totalCheckedFields > 0
      ? Math.max(0.3, validFields / totalCheckedFields)
      : 0.9; // If no rules apply, assume mostly valid

    return { score, issues };
  }

  /**
   * Check internal consistency of extracted data
   */
  checkConsistency(
    docType: DocumentType,
    data: ExtractedClinicalData
  ): { score: number; issues: string[] } {
    const issues: string[] = [];

    // Pathology consistency checks
    if (docType === 'pathology') {
      // If carcinoma mentioned but no grade
      if (data.histology?.toLowerCase().includes('carcinoma') && !data.grade) {
        issues.push('Carcinoma identified but tumor grade not extracted');
      }

      // If histology mentions "invasive" but margins not mentioned
      if (data.histology?.toLowerCase().includes('invasive') && !data.margins) {
        issues.push('Invasive tumor but margin status not extracted');
      }
    }

    // Genomics consistency checks
    if (docType === 'genomics') {
      // If actionable mutations present but no MSI status
      const hasActionableMutation = data.mutations?.some(m => m.actionable);
      if (hasActionableMutation && !data.msiStatus) {
        issues.push('Actionable mutations present but MSI status not extracted');
      }
    }

    // Radiology consistency checks
    if (docType === 'radiology') {
      // If measurements present but no impression
      if (data.measurements && data.measurements.length > 0 && !data.impression) {
        issues.push('Measurements present but no impression/conclusion extracted');
      }
    }

    // Calculate score based on issues
    const score = Math.max(0.5, 1.0 - issues.length * 0.15);
    return { score, issues };
  }

  /**
   * Generate actionable feedback for the optimizer
   */
  private generateFeedback(
    score: EvaluationScore,
    docType: DocumentType,
    data: ExtractedClinicalData,
    completeness: { score: number; fields: FieldScore[] },
    accuracy: { score: number; fields: FieldScore[] },
    validity: { score: number; issues: string[] },
    consistency: { score: number; issues: string[] }
  ): EvaluationFeedback {
    const issues: EvaluationIssue[] = [];
    const missingFields: string[] = [];
    const priorityFields: string[] = [];
    const suggestions: string[] = [];

    // Collect missing required/important fields
    const rubric = getRubric(docType);
    for (const field of [...rubric.required, ...rubric.important]) {
      const value = (data as Record<string, unknown>)[field];
      if (!this.isFieldPresent(value)) {
        missingFields.push(field);
        if (rubric.required.includes(field)) {
          priorityFields.push(field);
          issues.push({
            severity: 'critical',
            field,
            description: `Required field "${field}" is missing`,
            suggestedFix: this.getSuggestedFix(docType, field),
          });
        } else {
          issues.push({
            severity: 'major',
            field,
            description: `Important field "${field}" is missing`,
            suggestedFix: this.getSuggestedFix(docType, field),
          });
        }
      }
    }

    // Add accuracy issues
    for (const fieldScore of accuracy.fields) {
      if (fieldScore.score < 0.7 && fieldScore.issues) {
        const severity = fieldScore.score < 0.4 ? 'critical' : 'major';
        issues.push({
          severity,
          field: fieldScore.field,
          description: fieldScore.issues[0],
        });
        if (severity === 'critical') {
          priorityFields.push(fieldScore.field);
        }
      }
    }

    // Add validity issues
    for (const issue of validity.issues) {
      issues.push({
        severity: 'major',
        field: this.extractFieldFromIssue(issue),
        description: issue,
      });
    }

    // Add consistency issues
    for (const issue of consistency.issues) {
      issues.push({
        severity: 'minor',
        field: this.extractFieldFromIssue(issue),
        description: issue,
      });
    }

    // Generate document-type specific suggestions
    suggestions.push(...this.generateSuggestions(docType, missingFields, data));

    return {
      overallScore: score.overall,
      issues,
      missingFields,
      priorityFields: Array.from(new Set(priorityFields)), // Dedupe
      suggestions,
    };
  }

  /**
   * Get suggested fix for a missing field
   */
  private getSuggestedFix(docType: DocumentType, field: string): string {
    const fixes: Record<string, Record<string, string>> = {
      pathology: {
        histology: 'Look for diagnosis, cancer type, or microscopic description',
        grade: 'Look for tumor grade (1/2/3, I/II/III) or differentiation level',
        margins: 'Look for surgical margins, clearance, or resection margins',
        ihcMarkers: 'Look for IHC/immunohistochemistry results (ER, PR, HER2, Ki-67)',
      },
      radiology: {
        impression: 'Look for impression, conclusion, or summary section',
        findings: 'Look for findings section describing lesions, masses, or abnormalities',
        measurements: 'Look for tumor/lesion sizes with dimensions (e.g., 2.5 x 3.0 cm)',
      },
      genomics: {
        mutations: 'Look for gene mutations, variants, or alterations section',
        msiStatus: 'Look for MSI status, microsatellite instability, or MMR status',
        tmb: 'Look for tumor mutational burden or mutation load',
      },
      'lab-report': {
        labValues: 'Look for test results with values and reference ranges',
      },
    };

    return fixes[docType]?.[field] || `Look for ${field} information in the document`;
  }

  /**
   * Extract field name from an issue description
   */
  private extractFieldFromIssue(issue: string): string {
    // Try to extract field name from common patterns
    const patterns = [
      /field\s+"?(\w+)"?/i,
      /(\w+)\s+(?:is|are|not|missing|invalid)/i,
      /"(\w+)"/,
    ];

    for (const pattern of patterns) {
      const match = issue.match(pattern);
      if (match) return match[1];
    }

    return 'unknown';
  }

  /**
   * Generate document-type specific improvement suggestions
   */
  private generateSuggestions(
    docType: DocumentType,
    missingFields: string[],
    data: ExtractedClinicalData
  ): string[] {
    const suggestions: string[] = [];

    if (docType === 'pathology') {
      if (missingFields.includes('ihcMarkers')) {
        suggestions.push('Look for IHC panel results including ER, PR, HER2, Ki-67, PD-L1');
      }
      if (missingFields.includes('grade')) {
        suggestions.push('Grade may be listed as Nottingham score, Gleason score, or modified Bloom-Richardson grade');
      }
    }

    if (docType === 'radiology') {
      if (missingFields.includes('measurements')) {
        suggestions.push('Extract tumor/lesion sizes with units (mm or cm) and dimensions');
      }
      if (missingFields.includes('findings')) {
        suggestions.push('List each finding separately, including location and characteristics');
      }
    }

    if (docType === 'genomics') {
      if (missingFields.includes('mutations')) {
        suggestions.push('Include gene name, variant (e.g., p.V600E), and actionability status');
      }
      if (!data.tmb && !data.msiStatus) {
        suggestions.push('Check for TMB and MSI status in the molecular summary section');
      }
    }

    // Generic suggestions if score is low
    if (suggestions.length === 0 && missingFields.length > 0) {
      suggestions.push(`Focus on extracting: ${missingFields.join(', ')}`);
    }

    return suggestions;
  }
}
