/**
 * MARC-v1 Extraction Rubrics
 * 
 * Defines required, important, and optional fields for each document type.
 * Used by the evaluator to score extraction completeness.
 */

import type { DocumentType, ExtractionRubric } from './types';

/**
 * Extraction rubrics by document type
 * 
 * Each rubric defines:
 * - required: Fields that MUST be extracted if present in source (penalty for missing)
 * - important: Fields that SHOULD be extracted (moderate penalty for missing)
 * - optional: Nice-to-have fields (minimal penalty for missing)
 */
export const EXTRACTION_RUBRICS: Record<DocumentType, ExtractionRubric> = {
  pathology: {
    required: ['histology', 'grade'],
    important: ['margins', 'ihcMarkers'],
    optional: ['date', 'institution', 'rawText'],
  },

  radiology: {
    required: ['impression'],
    important: ['findings', 'measurements'],
    optional: ['date', 'institution', 'rawText'],
  },

  genomics: {
    required: ['mutations'],
    important: ['msiStatus', 'tmb'],
    optional: ['date', 'institution', 'rawText'],
  },

  'lab-report': {
    required: ['labValues'],
    important: [],
    optional: ['date', 'institution', 'rawText'],
  },

  prescription: {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution'],
  },

  'clinical-notes': {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution'],
  },

  'discharge-summary': {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution'],
  },

  'surgical-notes': {
    required: ['rawText'],
    important: ['margins'],
    optional: ['date', 'institution'],
  },

  unknown: {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution'],
  },
};

/**
 * Clinical validity rules by document type
 * Each rule is a function that validates a field value
 */
export const CLINICAL_VALIDITY_RULES: Record<
  DocumentType,
  Record<string, (value: unknown) => { valid: boolean; issue?: string }>
> = {
  pathology: {
    grade: (value) => {
      if (!value) return { valid: true }; // Missing is handled by completeness
      const strValue = String(value);
      // Valid formats: 1, 2, 3, I, II, III, Grade 1, Grade 2, Grade 3,
      // well differentiated, moderately differentiated, poorly differentiated
      const validPattern = /^(1|2|3|I|II|III|grade\s*[1-3]|grade\s*[I]{1,3}|well|moderate|moderately|poorly|low|intermediate|high)/i;
      if (!validPattern.test(strValue)) {
        return {
          valid: false,
          issue: `Invalid grade format: "${strValue}". Expected: 1/2/3, I/II/III, or differentiation level`,
        };
      }
      return { valid: true };
    },

    ihcMarkers: (value) => {
      if (!value || typeof value !== 'object') return { valid: true };
      const markers = value as Record<string, string>;
      const issues: string[] = [];

      for (const [marker, result] of Object.entries(markers)) {
        const markerLower = marker.toLowerCase();
        const resultLower = String(result).toLowerCase();

        // ER, PR should have positive/negative or percentage
        if (markerLower.includes('er') || markerLower.includes('pr')) {
          if (!/positive|negative|\d+\s*%|score/i.test(resultLower)) {
            issues.push(`${marker} value "${result}" should include positive/negative or percentage`);
          }
        }

        // HER2 should have 0, 1+, 2+, 3+, positive, negative, equivocal
        if (markerLower.includes('her2')) {
          if (!/0|1\+|2\+|3\+|positive|negative|equivocal|amplified|not amplified/i.test(resultLower)) {
            issues.push(`HER2 value "${result}" should be 0/1+/2+/3+ or positive/negative/equivocal`);
          }
        }

        // Ki-67 should be a percentage
        if (markerLower.includes('ki-67') || markerLower.includes('ki67')) {
          if (!/\d+\s*%|\d+\s*percent|low|high|intermediate/i.test(resultLower)) {
            issues.push(`Ki-67 value "${result}" should be a percentage`);
          }
        }
      }

      if (issues.length > 0) {
        return { valid: false, issue: issues.join('; ') };
      }
      return { valid: true };
    },

    margins: (value) => {
      if (!value) return { valid: true };
      const strValue = String(value).toLowerCase();
      // Valid: positive, negative, close, involved, clear, free, R0, R1, R2, or distance
      if (!/positive|negative|close|involved|clear|free|r[0-2]|\d+\s*(mm|cm)/i.test(strValue)) {
        return {
          valid: false,
          issue: `Margin status "${value}" unclear. Expected: positive/negative/close or distance`,
        };
      }
      return { valid: true };
    },
  },

  radiology: {
    measurements: (value) => {
      if (!value || !Array.isArray(value)) return { valid: true };
      const measurements = value as Array<{ site: string; size: string }>;
      const issues: string[] = [];

      for (const m of measurements) {
        if (m.size && !/\d+\s*(mm|cm|m)\b/i.test(m.size)) {
          issues.push(`Measurement "${m.size}" for ${m.site || 'unknown site'} missing units (mm/cm)`);
        }
      }

      if (issues.length > 0) {
        return { valid: false, issue: issues.join('; ') };
      }
      return { valid: true };
    },

    findings: (value) => {
      if (!value || !Array.isArray(value)) return { valid: true };
      // Findings should be descriptive, not just single words
      if (value.length > 0 && value.every((f: string) => f.length < 10)) {
        return {
          valid: false,
          issue: 'Findings appear truncated or incomplete',
        };
      }
      return { valid: true };
    },
  },

  genomics: {
    msiStatus: (value) => {
      if (!value) return { valid: true };
      const strValue = String(value).toUpperCase();
      // Valid: MSI-H, MSI-L, MSS, MSI-High, MSI-Low, Stable, Microsatellite Stable
      if (!/^(MSI-?H|MSI-?L|MSS|MSI-?HIGH|MSI-?LOW|STABLE|MICROSATELLITE\s*(STABLE|INSTABLE|HIGH|LOW))/i.test(strValue)) {
        return {
          valid: false,
          issue: `Invalid MSI status: "${value}". Expected: MSI-H, MSI-L, MSS, or descriptive`,
        };
      }
      return { valid: true };
    },

    tmb: (value) => {
      if (value === undefined || value === null) return { valid: true };
      const numValue = Number(value);
      if (isNaN(numValue)) {
        // Check if it's a descriptive value
        if (!/high|low|intermediate|\d+/i.test(String(value))) {
          return {
            valid: false,
            issue: `TMB should be numeric (mut/Mb) or descriptive: "${value}"`,
          };
        }
      } else if (numValue < 0 || numValue > 1000) {
        return {
          valid: false,
          issue: `TMB value ${numValue} seems out of range (expected 0-100 mut/Mb typically)`,
        };
      }
      return { valid: true };
    },

    mutations: (value) => {
      if (!value || !Array.isArray(value)) return { valid: true };
      const mutations = value as Array<{ gene: string; variant: string; actionable?: boolean }>;
      const issues: string[] = [];

      for (const m of mutations) {
        // Gene should be alphanumeric, typically 2-10 chars
        if (m.gene && (m.gene.length < 2 || m.gene.length > 20)) {
          issues.push(`Gene name "${m.gene}" seems unusual`);
        }
        // Variant should follow some pattern (p., c., exon, etc.)
        if (m.variant && m.variant.length < 3) {
          issues.push(`Variant "${m.variant}" for ${m.gene} seems incomplete`);
        }
      }

      if (issues.length > 0) {
        return { valid: false, issue: issues.join('; ') };
      }
      return { valid: true };
    },
  },

  'lab-report': {
    labValues: (value) => {
      if (!value || !Array.isArray(value)) return { valid: true };
      const labs = value as Array<{ test: string; value: string; unit: string; flag?: string }>;
      const issues: string[] = [];

      for (const lab of labs) {
        // Value should be present
        if (!lab.value) {
          issues.push(`Lab test "${lab.test}" has no value`);
        }
        // Flag should be high/low/normal if present
        if (lab.flag && !/high|low|normal|abnormal|critical|h|l|n|\*/i.test(lab.flag)) {
          issues.push(`Invalid flag "${lab.flag}" for ${lab.test}`);
        }
      }

      if (issues.length > 0) {
        return { valid: false, issue: issues.join('; ') };
      }
      return { valid: true };
    },
  },

  // Other document types have minimal validation
  prescription: {},
  'clinical-notes': {},
  'discharge-summary': {},
  'surgical-notes': {
    margins: (value) => {
      // Same as pathology margins
      if (!value) return { valid: true };
      const strValue = String(value).toLowerCase();
      if (!/positive|negative|close|involved|clear|free|r[0-2]|\d+\s*(mm|cm)/i.test(strValue)) {
        return {
          valid: false,
          issue: `Surgical margin "${value}" unclear`,
        };
      }
      return { valid: true };
    },
  },
  unknown: {},
};

/**
 * Get the rubric for a document type
 */
export function getRubric(docType: DocumentType): ExtractionRubric {
  return EXTRACTION_RUBRICS[docType] || EXTRACTION_RUBRICS.unknown;
}

/**
 * Get all expected fields for a document type
 */
export function getAllExpectedFields(docType: DocumentType): string[] {
  const rubric = getRubric(docType);
  return [...rubric.required, ...rubric.important, ...rubric.optional];
}

/**
 * Check if a field is required for a document type
 */
export function isRequiredField(docType: DocumentType, field: string): boolean {
  const rubric = getRubric(docType);
  return rubric.required.includes(field);
}

/**
 * Get field weight for scoring
 * Required: 1.0, Important: 0.7, Optional: 0.3
 */
export function getFieldWeight(docType: DocumentType, field: string): number {
  const rubric = getRubric(docType);
  if (rubric.required.includes(field)) return 1.0;
  if (rubric.important.includes(field)) return 0.7;
  if (rubric.optional.includes(field)) return 0.3;
  return 0.1; // Unknown field
}
