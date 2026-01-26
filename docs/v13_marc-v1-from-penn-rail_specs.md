# V13: MARC-v1 Evaluator-Optimizer Loop Implementation Specification

## Overview

This document specifies how to implement the **MARC-v1 (Multi-Agent Reasoning & Coordination)** evaluator-optimizer feedback loop in the Virtual Tumor Board codebase, adapting the Penn-RAIL reference implementation for our medical document extraction pipeline.

**Goal**: Achieve 95%+ extraction confidence through iterative refinement, as claimed in the scientific paper.

---

## 1. Reference Architecture (Penn-RAIL MARC-v1)

### 1.1 Canonical MARC-v1 Pipeline

From the [Penn-RAIL/MARC-v1](https://github.com/Penn-RAIL/MARC-v1) repository:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent 1   │────▶│   Agent 2   │────▶│   Agent 3   │────▶│   Agent 4   │
│   Tagger    │     │  Classifier │     │ Recommender │     │  Evaluator  │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │ Score < 0.95 │
                                                           │    ?         │
                                                           └──────┬───────┘
                                                                  │
                                        ┌─────────────────────────┼─────────────────────────┐
                                        │ YES (feedback loop)     │                         │
                                        ▼                         │ NO (done)               │
                              ┌─────────────────┐                 ▼                         
                              │ Inject Feedback │           ┌───────────┐                   
                              │ into Prompts    │           │  Return   │                   
                              └────────┬────────┘           │  Results  │                   
                                       │                    └───────────┘                   
                                       ▼                                                    
                              ┌─────────────────┐                                           
                              │ Re-run Agents   │                                           
                              │ 1, 2, 3 with    │                                           
                              │ feedback        │                                           
                              └─────────────────┘                                           
```

### 1.2 Key MARC-v1 Concepts

| Concept | Description | Penn-RAIL Implementation |
|---------|-------------|-------------------------|
| **Tagger** | Extracts metadata and core entities | Agent 1 |
| **Classifier** | Categorizes and provides reasoning | Agent 2 |
| **Recommender** | Generates actionable items | Agent 3 |
| **Evaluator** | Scores outputs and generates feedback | Agent 4 (Orchestrator) |
| **Feedback Injection** | Appends feedback to prompts for retry | Template modification |
| **Quality Threshold** | Target score to meet | 0.7 (default), 0.95 (strict) |
| **Max Iterations** | Safety limit | 3 iterations |

### 1.3 Feedback Injection Pattern (from Penn-RAIL)

```python
if feedback:
    prompt_template = f"""{prompt_template}

--- FEEDBACK FROM PREVIOUS ATTEMPT ---
{feedback}

Please address the issues above in your [task]."""
```

### 1.4 Demonstrated Results (from FEEDBACK_LOOP_TEST_RESULTS.md)

| Iteration | Classification | Impression | Overall |
|-----------|---------------|------------|---------|
| 1         | 1.000         | 0.950      | 0.900   |
| 2         | 1.000         | 1.000      | 1.000   |

**Key Insight**: The loop works. Score improved from 0.900 → 1.000 in 2 iterations.

---

## 2. Current VTB Implementation (Gap Analysis)

### 2.1 Current Document Processing Pipeline

**Location**: `apps/web/src/app/api/upload/process/route.ts`

```
Upload → OCR (Gemini Vision) → Classify (Heuristic + AI) → Extract → Return
         [SINGLE PASS - NO LOOP]
```

### 2.2 What's Missing

| MARC-v1 Component | VTB Current State | Gap |
|-------------------|------------------|-----|
| Evaluator Agent | NOT PRESENT | Need to create |
| Feedback Loop | NOT PRESENT | Need to implement |
| Quality Scoring | Heuristic confidence only | Need structured scoring |
| Retry Mechanism | None | Need iteration logic |
| Feedback Injection | None | Need prompt modification |

### 2.3 Current Confidence Calculation (Insufficient)

```typescript
// apps/web/src/app/api/upload/process/route.ts:140-144
const maxPossible = DOCUMENT_PATTERNS[bestType]?.length || 1;
const confidence = bestScore > 0 ? Math.min(bestScore / (maxPossible * 0.3), 1) : 0;
```

This is a **heuristic** confidence based on pattern matching count, NOT a quality assessment of extraction accuracy.

---

## 3. Proposed Implementation

### 3.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MARC-v1 Enhanced Document Processing                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │    OCR      │────▶│  Classifier │────▶│  Extractor  │────▶│ Evaluator  │ │
│  │  (Gemini    │     │ (Type +     │     │ (Clinical   │     │ (Quality   │ │
│  │   Vision)   │     │  Subtype)   │     │  Fields)    │     │  Scoring)  │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────┬──────┘ │
│                                                                     │        │
│                                                              Score ≥ 0.95?   │
│                                                                     │        │
│                              ┌──────────────────────────────────────┤        │
│                              │ NO                                   │ YES    │
│                              ▼                                      ▼        │
│                    ┌─────────────────┐                    ┌────────────────┐ │
│                    │    Optimizer    │                    │     Return     │ │
│                    │ (Re-prompt with │                    │    Results     │ │
│                    │   feedback)     │                    │ confidence=0.95│ │
│                    └────────┬────────┘                    └────────────────┘ │
│                             │                                                │
│                             │ iteration < 3?                                 │
│                             │                                                │
│                    ┌────────┴────────┐                                       │
│                    │ YES             │ NO                                    │
│                    ▼                 ▼                                       │
│             ┌────────────┐   ┌─────────────────┐                             │
│             │  Re-run    │   │ Return best     │                             │
│             │ Classifier │   │ result with     │                             │
│             │ + Extractor│   │ actual score    │                             │
│             └────────────┘   └─────────────────┘                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 New Components to Create

#### 3.2.1 Evaluator Agent

**Purpose**: Score extraction quality and generate feedback for improvement.

**Location**: `packages/agents/src/extraction/evaluator.ts` (NEW)

**Scoring Dimensions**:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Completeness** | 30% | Are all expected fields extracted? |
| **Accuracy** | 40% | Do extracted values match source text? |
| **Consistency** | 15% | Are values internally consistent? |
| **Clinical Validity** | 15% | Are values clinically plausible? |

**Scoring Rubric by Document Type**:

```typescript
interface ExtractionScoreRubric {
  pathology: {
    required: ['histology', 'grade'];
    important: ['margins', 'ihcMarkers'];
    optional: ['date', 'institution'];
  };
  radiology: {
    required: ['findings', 'impression'];
    important: ['measurements'];
    optional: ['date', 'institution'];
  };
  genomics: {
    required: ['mutations'];
    important: ['msiStatus', 'tmb'];
    optional: ['date', 'institution'];
  };
  // ... etc
}
```

#### 3.2.2 Optimizer Agent

**Purpose**: Re-prompt with feedback to improve extraction quality.

**Location**: `packages/agents/src/extraction/optimizer.ts` (NEW)

**Feedback Injection Template**:

```typescript
function buildOptimizedPrompt(
  basePrompt: string, 
  feedback: EvaluationFeedback
): string {
  return `${basePrompt}

--- FEEDBACK FROM QUALITY EVALUATION ---
Score: ${feedback.overallScore}/1.0 (Target: 0.95)

Issues to Address:
${feedback.issues.map(i => `- ${i.severity.toUpperCase()}: ${i.description}`).join('\n')}

Missing Fields:
${feedback.missingFields.join(', ') || 'None'}

Please re-extract the clinical data, addressing the issues above.
Focus especially on: ${feedback.priorityFields.join(', ')}
`;
}
```

#### 3.2.3 Reliability Loop Orchestrator

**Purpose**: Coordinate the extract-evaluate-optimize cycle.

**Location**: `packages/agents/src/extraction/reliability-loop.ts` (NEW)

```typescript
interface ReliabilityLoopConfig {
  qualityThreshold: number;      // Default: 0.95
  maxIterations: number;         // Default: 3
  minImprovement: number;        // Default: 0.05 (stop if improvement < 5%)
  timeoutMs: number;             // Default: 30000 (30 seconds)
}

interface ReliabilityLoopResult {
  finalData: ExtractedClinicalData;
  finalScore: number;
  iterations: number;
  iterationHistory: IterationRecord[];
  metThreshold: boolean;
  processingTimeMs: number;
}

interface IterationRecord {
  iteration: number;
  extractedData: ExtractedClinicalData;
  score: EvaluationScore;
  feedback?: EvaluationFeedback;
  improvementFromPrevious?: number;
}
```

### 3.3 Detailed Component Specifications

#### 3.3.1 Evaluator Agent Specification

**File**: `packages/agents/src/extraction/evaluator.ts`

```typescript
/**
 * MARC-v1 Evaluator Agent for Document Extraction
 * 
 * Evaluates extracted clinical data against:
 * 1. Source text (accuracy)
 * 2. Expected schema (completeness)
 * 3. Clinical validity rules (plausibility)
 * 4. Internal consistency (coherence)
 */

export interface EvaluationScore {
  overall: number;           // 0-1
  completeness: number;      // 0-1
  accuracy: number;          // 0-1
  consistency: number;       // 0-1
  clinicalValidity: number;  // 0-1
  breakdown: FieldScore[];
}

export interface FieldScore {
  field: string;
  present: boolean;
  score: number;
  issues?: string[];
}

export interface EvaluationFeedback {
  overallScore: number;
  issues: EvaluationIssue[];
  missingFields: string[];
  priorityFields: string[];   // Fields to focus on in re-extraction
  suggestions: string[];      // Specific improvement suggestions
}

export interface EvaluationIssue {
  severity: 'critical' | 'major' | 'minor';
  field: string;
  description: string;
  suggestedFix?: string;
}

export class ExtractionEvaluator {
  private model: GenerativeModel;
  
  constructor(config: EvaluatorConfig) {
    this.model = genAI.getGenerativeModel({ model: config.model || "gemini-2.0-flash" });
  }

  /**
   * Evaluate extraction quality
   */
  async evaluate(
    sourceText: string,
    documentType: DocumentType,
    extractedData: ExtractedClinicalData
  ): Promise<{ score: EvaluationScore; feedback: EvaluationFeedback }> {
    // 1. Schema-based completeness check (fast, deterministic)
    const completenessScore = this.checkCompleteness(documentType, extractedData);
    
    // 2. LLM-based accuracy check (verify against source)
    const accuracyScore = await this.checkAccuracy(sourceText, documentType, extractedData);
    
    // 3. Rule-based clinical validity check
    const validityScore = this.checkClinicalValidity(documentType, extractedData);
    
    // 4. Consistency check
    const consistencyScore = this.checkConsistency(extractedData);
    
    // Weighted average
    const overall = 
      completenessScore.score * 0.30 +
      accuracyScore.score * 0.40 +
      validityScore.score * 0.15 +
      consistencyScore.score * 0.15;
    
    const score: EvaluationScore = {
      overall,
      completeness: completenessScore.score,
      accuracy: accuracyScore.score,
      consistency: consistencyScore.score,
      clinicalValidity: validityScore.score,
      breakdown: [...completenessScore.fields, ...accuracyScore.fields],
    };
    
    // Generate feedback if below threshold
    const feedback = this.generateFeedback(score, documentType, extractedData);
    
    return { score, feedback };
  }

  /**
   * Check if all expected fields are present
   */
  private checkCompleteness(
    docType: DocumentType, 
    data: ExtractedClinicalData
  ): { score: number; fields: FieldScore[] } {
    const rubric = EXTRACTION_RUBRICS[docType];
    const fields: FieldScore[] = [];
    
    let totalWeight = 0;
    let weightedScore = 0;
    
    // Required fields (must be present)
    for (const field of rubric.required) {
      const present = data[field] != null && data[field] !== '';
      fields.push({ field, present, score: present ? 1 : 0 });
      totalWeight += 1.0;
      weightedScore += present ? 1.0 : 0;
    }
    
    // Important fields (should be present)
    for (const field of rubric.important) {
      const present = data[field] != null && data[field] !== '';
      fields.push({ field, present, score: present ? 1 : 0.5 });
      totalWeight += 0.7;
      weightedScore += present ? 0.7 : 0;
    }
    
    // Optional fields (nice to have)
    for (const field of rubric.optional) {
      const present = data[field] != null && data[field] !== '';
      fields.push({ field, present, score: present ? 1 : 0.8 });
      totalWeight += 0.3;
      weightedScore += present ? 0.3 : 0;
    }
    
    return {
      score: totalWeight > 0 ? weightedScore / totalWeight : 0,
      fields
    };
  }

  /**
   * LLM-based accuracy verification against source text
   */
  private async checkAccuracy(
    sourceText: string,
    docType: DocumentType,
    data: ExtractedClinicalData
  ): Promise<{ score: number; fields: FieldScore[] }> {
    const prompt = `You are a medical data quality evaluator. 
    
Given the SOURCE TEXT and EXTRACTED DATA below, evaluate the accuracy of the extraction.

SOURCE TEXT (first 4000 chars):
${sourceText.slice(0, 4000)}

EXTRACTED DATA:
${JSON.stringify(data, null, 2)}

For each extracted field, verify if the value accurately reflects what's in the source text.

Respond with JSON:
{
  "fieldScores": [
    {"field": "histology", "accurate": true, "score": 1.0, "issue": null},
    {"field": "grade", "accurate": false, "score": 0.0, "issue": "Extracted 'Grade 2' but source says 'Grade 3'"}
  ],
  "overallAccuracy": 0.85
}`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.overallAccuracy,
          fields: parsed.fieldScores.map((f: any) => ({
            field: f.field,
            present: true,
            score: f.score,
            issues: f.issue ? [f.issue] : undefined
          }))
        };
      }
    } catch (e) {
      console.error("Failed to parse accuracy check response:", e);
    }
    
    return { score: 0.7, fields: [] }; // Default fallback
  }

  /**
   * Rule-based clinical validity check
   */
  private checkClinicalValidity(
    docType: DocumentType,
    data: ExtractedClinicalData
  ): { score: number; issues: string[] } {
    const issues: string[] = [];
    
    // Pathology-specific rules
    if (docType === 'pathology') {
      // Grade should be 1, 2, or 3 (or well/moderate/poorly differentiated)
      if (data.grade && !/^(1|2|3|I|II|III|well|moderate|poorly)/i.test(data.grade)) {
        issues.push(`Invalid grade format: "${data.grade}"`);
      }
      
      // IHC markers should have valid values
      if (data.ihcMarkers) {
        for (const [marker, value] of Object.entries(data.ihcMarkers)) {
          if (marker.toLowerCase().includes('er') || marker.toLowerCase().includes('pr')) {
            if (!/positive|negative|\d+%/i.test(String(value))) {
              issues.push(`Invalid ${marker} value: "${value}"`);
            }
          }
        }
      }
    }
    
    // Radiology-specific rules
    if (docType === 'radiology') {
      // Measurements should have units
      if (data.measurements) {
        for (const m of data.measurements) {
          if (m.size && !/\d+\s*(mm|cm|m)/i.test(m.size)) {
            issues.push(`Measurement missing units: "${m.size}"`);
          }
        }
      }
    }
    
    // Genomics-specific rules
    if (docType === 'genomics') {
      // MSI status should be MSI-H, MSI-L, or MSS
      if (data.msiStatus && !/^(MSI-?H|MSI-?L|MSS|stable|high|low)/i.test(data.msiStatus)) {
        issues.push(`Invalid MSI status: "${data.msiStatus}"`);
      }
      
      // TMB should be a number
      if (data.tmb && isNaN(Number(data.tmb))) {
        issues.push(`TMB should be numeric: "${data.tmb}"`);
      }
    }
    
    // Score: 1.0 if no issues, penalize 0.1 per issue, min 0.3
    const score = Math.max(0.3, 1.0 - (issues.length * 0.1));
    
    return { score, issues };
  }

  /**
   * Check internal consistency of extracted data
   */
  private checkConsistency(data: ExtractedClinicalData): { score: number; issues: string[] } {
    const issues: string[] = [];
    
    // Example: If histology mentions "adenocarcinoma" but grade is missing, flag it
    if (data.histology?.toLowerCase().includes('carcinoma') && !data.grade) {
      issues.push("Carcinoma identified but grade not extracted");
    }
    
    // If mutations are present, MSI status should typically be present too
    if (data.mutations && data.mutations.length > 0 && !data.msiStatus) {
      issues.push("Mutations present but MSI status not extracted");
    }
    
    const score = Math.max(0.5, 1.0 - (issues.length * 0.15));
    return { score, issues };
  }

  /**
   * Generate actionable feedback for the optimizer
   */
  private generateFeedback(
    score: EvaluationScore,
    docType: DocumentType,
    data: ExtractedClinicalData
  ): EvaluationFeedback {
    const issues: EvaluationIssue[] = [];
    const missingFields: string[] = [];
    const priorityFields: string[] = [];
    const suggestions: string[] = [];
    
    // Identify missing required fields
    const rubric = EXTRACTION_RUBRICS[docType];
    for (const field of rubric.required) {
      if (!data[field]) {
        missingFields.push(field);
        priorityFields.push(field);
        issues.push({
          severity: 'critical',
          field,
          description: `Required field "${field}" is missing`,
          suggestedFix: `Look for ${field} information in the document`
        });
      }
    }
    
    // Add issues from accuracy check
    for (const fieldScore of score.breakdown) {
      if (fieldScore.score < 0.8 && fieldScore.issues) {
        issues.push({
          severity: fieldScore.score < 0.5 ? 'critical' : 'major',
          field: fieldScore.field,
          description: fieldScore.issues[0],
        });
        if (fieldScore.score < 0.5) {
          priorityFields.push(fieldScore.field);
        }
      }
    }
    
    // Generate suggestions based on document type
    if (docType === 'pathology' && missingFields.includes('ihcMarkers')) {
      suggestions.push("Look for IHC panel results including ER, PR, HER2, Ki-67");
    }
    
    if (docType === 'radiology' && missingFields.includes('measurements')) {
      suggestions.push("Extract tumor/lesion sizes with units (mm or cm)");
    }
    
    return {
      overallScore: score.overall,
      issues,
      missingFields,
      priorityFields,
      suggestions
    };
  }
}

// Extraction rubrics by document type
const EXTRACTION_RUBRICS: Record<DocumentType, ExtractionRubric> = {
  pathology: {
    required: ['histology', 'grade'],
    important: ['margins', 'ihcMarkers'],
    optional: ['date', 'institution', 'rawText']
  },
  radiology: {
    required: ['impression'],
    important: ['findings', 'measurements'],
    optional: ['date', 'institution', 'rawText']
  },
  genomics: {
    required: ['mutations'],
    important: ['msiStatus', 'tmb'],
    optional: ['date', 'institution', 'rawText']
  },
  'lab-report': {
    required: ['labValues'],
    important: [],
    optional: ['date', 'institution', 'rawText']
  },
  prescription: {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution']
  },
  'clinical-notes': {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution']
  },
  'discharge-summary': {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution']
  },
  'surgical-notes': {
    required: ['rawText'],
    important: ['margins'],
    optional: ['date', 'institution']
  },
  unknown: {
    required: ['rawText'],
    important: [],
    optional: ['date', 'institution']
  }
};
```

#### 3.3.2 Optimizer Agent Specification

**File**: `packages/agents/src/extraction/optimizer.ts`

```typescript
/**
 * MARC-v1 Optimizer Agent for Document Extraction
 * 
 * Takes evaluation feedback and generates improved extraction prompts.
 * Implements the feedback injection pattern from Penn-RAIL MARC-v1.
 */

export interface OptimizationConfig {
  model: string;
  basePrompt: string;
  documentType: DocumentType;
}

export interface OptimizationResult {
  optimizedPrompt: string;
  focusAreas: string[];
  expectedImprovement: string;
}

export class ExtractionOptimizer {
  
  /**
   * Build an optimized prompt incorporating feedback
   */
  buildOptimizedPrompt(
    basePrompt: string,
    feedback: EvaluationFeedback,
    previousAttempt: ExtractedClinicalData,
    iteration: number
  ): string {
    // Categorize issues by severity
    const criticalIssues = feedback.issues.filter(i => i.severity === 'critical');
    const majorIssues = feedback.issues.filter(i => i.severity === 'major');
    const minorIssues = feedback.issues.filter(i => i.severity === 'minor');
    
    let feedbackSection = `
--- FEEDBACK FROM QUALITY EVALUATION (Iteration ${iteration}) ---
Current Score: ${(feedback.overallScore * 100).toFixed(1)}% (Target: 95%)

`;

    if (criticalIssues.length > 0) {
      feedbackSection += `CRITICAL ISSUES (must fix):
${criticalIssues.map(i => `  - [${i.field}] ${i.description}${i.suggestedFix ? ` → ${i.suggestedFix}` : ''}`).join('\n')}

`;
    }

    if (majorIssues.length > 0) {
      feedbackSection += `MAJOR ISSUES (should fix):
${majorIssues.map(i => `  - [${i.field}] ${i.description}`).join('\n')}

`;
    }

    if (feedback.missingFields.length > 0) {
      feedbackSection += `MISSING FIELDS:
${feedback.missingFields.map(f => `  - ${f}`).join('\n')}

`;
    }

    if (feedback.suggestions.length > 0) {
      feedbackSection += `SUGGESTIONS:
${feedback.suggestions.map(s => `  - ${s}`).join('\n')}

`;
    }

    feedbackSection += `PRIORITY: Focus extraction on these fields: ${feedback.priorityFields.join(', ')}

PREVIOUS ATTEMPT (for reference):
${JSON.stringify(previousAttempt, null, 2)}

Please re-extract the clinical data, addressing ALL issues above.
Ensure extracted values EXACTLY match what appears in the source document.
`;

    return `${basePrompt}

${feedbackSection}`;
  }

  /**
   * Decide if optimization should continue
   */
  shouldContinue(
    currentScore: number,
    previousScore: number | null,
    iteration: number,
    config: ReliabilityLoopConfig
  ): { continue: boolean; reason: string } {
    // Met threshold
    if (currentScore >= config.qualityThreshold) {
      return { continue: false, reason: 'Quality threshold met' };
    }
    
    // Max iterations reached
    if (iteration >= config.maxIterations) {
      return { continue: false, reason: 'Max iterations reached' };
    }
    
    // No improvement (plateau)
    if (previousScore !== null) {
      const improvement = currentScore - previousScore;
      if (improvement < config.minImprovement) {
        return { continue: false, reason: `Improvement (${(improvement*100).toFixed(1)}%) below minimum (${(config.minImprovement*100).toFixed(1)}%)` };
      }
    }
    
    return { continue: true, reason: 'Continue optimization' };
  }
}
```

#### 3.3.3 Reliability Loop Orchestrator Specification

**File**: `packages/agents/src/extraction/reliability-loop.ts`

```typescript
/**
 * MARC-v1 Reliability Loop Orchestrator
 * 
 * Coordinates the extract → evaluate → optimize → re-extract cycle
 * until quality threshold is met or max iterations reached.
 */

import { ExtractionEvaluator, EvaluationFeedback, EvaluationScore } from './evaluator';
import { ExtractionOptimizer } from './optimizer';

export interface ReliabilityLoopConfig {
  qualityThreshold: number;      // Default: 0.95
  maxIterations: number;         // Default: 3
  minImprovement: number;        // Default: 0.05
  timeoutMs: number;             // Default: 30000
  model: string;                 // Default: "gemini-2.0-flash"
}

const DEFAULT_CONFIG: ReliabilityLoopConfig = {
  qualityThreshold: 0.95,
  maxIterations: 3,
  minImprovement: 0.05,
  timeoutMs: 30000,
  model: "gemini-2.0-flash"
};

export interface ReliabilityLoopResult {
  finalData: ExtractedClinicalData;
  finalScore: number;
  iterations: number;
  iterationHistory: IterationRecord[];
  metThreshold: boolean;
  processingTimeMs: number;
  stoppedReason: string;
}

export interface IterationRecord {
  iteration: number;
  extractedData: ExtractedClinicalData;
  score: EvaluationScore;
  feedback?: EvaluationFeedback;
  improvementFromPrevious?: number;
  promptUsed?: string;  // For debugging
}

export class ReliabilityLoop {
  private config: ReliabilityLoopConfig;
  private evaluator: ExtractionEvaluator;
  private optimizer: ExtractionOptimizer;
  private extractFn: (prompt: string, text: string) => Promise<ExtractedClinicalData>;
  
  constructor(
    config: Partial<ReliabilityLoopConfig> = {},
    extractFn: (prompt: string, text: string) => Promise<ExtractedClinicalData>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.evaluator = new ExtractionEvaluator({ model: this.config.model });
    this.optimizer = new ExtractionOptimizer();
    this.extractFn = extractFn;
  }

  /**
   * Execute the reliability loop
   */
  async execute(
    sourceText: string,
    documentType: DocumentType,
    baseExtractionPrompt: string,
    onProgress?: (iteration: number, score: number) => void
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
    
    while (true) {
      iteration++;
      
      // Check timeout
      if (Date.now() - startTime > this.config.timeoutMs) {
        stoppedReason = 'Timeout exceeded';
        break;
      }
      
      // 1. EXTRACT
      console.log(`[ReliabilityLoop] Iteration ${iteration}: Extracting...`);
      currentData = await this.extractFn(currentPrompt, sourceText);
      
      // 2. EVALUATE
      console.log(`[ReliabilityLoop] Iteration ${iteration}: Evaluating...`);
      const evaluation = await this.evaluator.evaluate(
        sourceText,
        documentType,
        currentData
      );
      currentScore = evaluation.score;
      feedback = evaluation.feedback;
      
      // Record iteration
      const record: IterationRecord = {
        iteration,
        extractedData: currentData,
        score: currentScore,
        feedback,
        improvementFromPrevious: previousScore !== null 
          ? currentScore.overall - previousScore 
          : undefined,
        promptUsed: currentPrompt.slice(0, 500) + '...'  // Truncate for logging
      };
      iterationHistory.push(record);
      
      // Progress callback
      if (onProgress) {
        onProgress(iteration, currentScore.overall);
      }
      
      console.log(`[ReliabilityLoop] Iteration ${iteration}: Score = ${(currentScore.overall * 100).toFixed(1)}%`);
      
      // 3. CHECK IF SHOULD CONTINUE
      const decision = this.optimizer.shouldContinue(
        currentScore.overall,
        previousScore,
        iteration,
        this.config
      );
      
      if (!decision.continue) {
        stoppedReason = decision.reason;
        break;
      }
      
      // 4. OPTIMIZE (prepare for next iteration)
      console.log(`[ReliabilityLoop] Iteration ${iteration}: Optimizing prompt...`);
      currentPrompt = this.optimizer.buildOptimizedPrompt(
        baseExtractionPrompt,
        feedback,
        currentData,
        iteration
      );
      
      previousScore = currentScore.overall;
    }
    
    return {
      finalData: currentData!,
      finalScore: currentScore!.overall,
      iterations: iteration,
      iterationHistory,
      metThreshold: currentScore!.overall >= this.config.qualityThreshold,
      processingTimeMs: Date.now() - startTime,
      stoppedReason
    };
  }
}
```

---

## 4. Integration Plan

### 4.1 File Structure Changes

```
packages/agents/
├── src/
│   ├── index.ts                    # Add exports for new modules
│   ├── extraction/                 # NEW directory
│   │   ├── index.ts                # Barrel export
│   │   ├── evaluator.ts            # ExtractionEvaluator
│   │   ├── optimizer.ts            # ExtractionOptimizer
│   │   ├── reliability-loop.ts     # ReliabilityLoop
│   │   ├── rubrics.ts              # EXTRACTION_RUBRICS
│   │   └── types.ts                # Extraction-specific types
│   ├── orchestrator/
│   ├── specialists/
│   └── ...

apps/web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/
│   │   │   │   ├── process/
│   │   │   │   │   └── route.ts    # MODIFY: Add reliability loop option
│   │   │   │   └── process-v2/     # NEW: Reliability loop endpoint
│   │   │   │       └── route.ts
```

### 4.2 API Changes

#### 4.2.1 New Endpoint: `/api/upload/process-v2`

```typescript
// Request body
interface ProcessV2Request {
  fileBase64: string;
  mimeType: string;
  filename: string;
  documentTypeOverride?: DocumentType;
  // NEW: Reliability loop options
  enableReliabilityLoop?: boolean;  // Default: true
  qualityThreshold?: number;        // Default: 0.95
  maxIterations?: number;           // Default: 3
}

// Response
interface ProcessV2Response {
  documentId: string;
  classifiedType: DocumentType;
  extractedData: ExtractedClinicalData;
  // NEW: Reliability loop metadata
  reliabilityLoop: {
    enabled: boolean;
    finalScore: number;
    iterations: number;
    metThreshold: boolean;
    iterationHistory?: IterationRecord[];  // Optional, for debugging
  };
  warnings: string[];
  processingTimeMs: number;
}
```

#### 4.2.2 Backward Compatibility

The existing `/api/upload/process` endpoint remains unchanged for backward compatibility. 

Option A: Add `enableReliabilityLoop` flag to existing endpoint
Option B: Create new `/api/upload/process-v2` endpoint (recommended for safety)

### 4.3 Environment Variables

```env
# Reliability Loop Configuration
MARC_QUALITY_THRESHOLD=0.95
MARC_MAX_ITERATIONS=3
MARC_MIN_IMPROVEMENT=0.05
MARC_TIMEOUT_MS=30000

# Enable/disable globally
MARC_RELIABILITY_LOOP_ENABLED=true
```

---

## 5. Implementation Phases

### Phase 1: Core Components (Day 1-2)

1. Create `packages/agents/src/extraction/` directory
2. Implement `types.ts` with interfaces
3. Implement `rubrics.ts` with extraction rubrics
4. Implement `evaluator.ts` with completeness + validity checks
5. Write unit tests for evaluator

### Phase 2: LLM-Based Accuracy Check (Day 2-3)

1. Add LLM-based accuracy verification to evaluator
2. Implement `optimizer.ts` with feedback injection
3. Write unit tests for optimizer

### Phase 3: Reliability Loop (Day 3-4)

1. Implement `reliability-loop.ts`
2. Add progress callbacks and logging
3. Write integration tests with mock extraction function

### Phase 4: API Integration (Day 4-5)

1. Create `/api/upload/process-v2` endpoint
2. Integrate reliability loop with existing OCR/extraction pipeline
3. Add environment variable configuration
4. Write E2E tests

### Phase 5: Monitoring & Observability (Day 5-6)

1. Add analytics tracking for loop metrics
2. Dashboard to show iteration distributions
3. Alerting for low-score extractions

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
describe('ExtractionEvaluator', () => {
  it('should score completeness correctly for pathology reports', () => {
    const data: ExtractedClinicalData = {
      histology: 'Invasive ductal carcinoma',
      grade: 'Grade 2',
      // Missing: margins, ihcMarkers
    };
    const score = evaluator.checkCompleteness('pathology', data);
    expect(score.score).toBeLessThan(0.8); // Missing important fields
  });

  it('should detect clinical validity issues', () => {
    const data: ExtractedClinicalData = {
      histology: 'Adenocarcinoma',
      grade: 'High',  // Invalid - should be 1/2/3
    };
    const result = evaluator.checkClinicalValidity('pathology', data);
    expect(result.issues).toContain(expect.stringContaining('Invalid grade'));
  });
});

describe('ExtractionOptimizer', () => {
  it('should inject feedback into prompt', () => {
    const feedback: EvaluationFeedback = {
      overallScore: 0.7,
      issues: [{ severity: 'critical', field: 'grade', description: 'Missing grade' }],
      missingFields: ['grade'],
      priorityFields: ['grade'],
      suggestions: ['Look for grade in pathology section']
    };
    
    const optimized = optimizer.buildOptimizedPrompt(basePrompt, feedback, {}, 1);
    expect(optimized).toContain('FEEDBACK FROM QUALITY EVALUATION');
    expect(optimized).toContain('Missing grade');
    expect(optimized).toContain('priorityFields');
  });
});

describe('ReliabilityLoop', () => {
  it('should iterate until threshold met', async () => {
    const mockExtract = jest.fn()
      .mockResolvedValueOnce({ histology: 'IDC' })  // Iteration 1: partial
      .mockResolvedValueOnce({ histology: 'IDC', grade: '2' })  // Iteration 2: better
      .mockResolvedValueOnce({ histology: 'IDC', grade: '2', margins: 'negative' });  // Iteration 3: complete
    
    const loop = new ReliabilityLoop({ qualityThreshold: 0.9 }, mockExtract);
    const result = await loop.execute(sourceText, 'pathology', basePrompt);
    
    expect(result.iterations).toBeGreaterThan(1);
    expect(result.finalScore).toBeGreaterThanOrEqual(0.9);
  });

  it('should stop at max iterations', async () => {
    const mockExtract = jest.fn().mockResolvedValue({ histology: 'IDC' });  // Always partial
    
    const loop = new ReliabilityLoop({ maxIterations: 3 }, mockExtract);
    const result = await loop.execute(sourceText, 'pathology', basePrompt);
    
    expect(result.iterations).toBe(3);
    expect(result.stoppedReason).toBe('Max iterations reached');
  });
});
```

### 6.2 Integration Tests

```typescript
describe('Document Processing with Reliability Loop', () => {
  it('should achieve 95%+ score on pathology report', async () => {
    const response = await fetch('/api/upload/process-v2', {
      method: 'POST',
      body: JSON.stringify({
        fileBase64: SAMPLE_PATHOLOGY_BASE64,
        mimeType: 'application/pdf',
        filename: 'pathology_report.pdf',
        enableReliabilityLoop: true,
        qualityThreshold: 0.95
      })
    });
    
    const result = await response.json();
    expect(result.reliabilityLoop.finalScore).toBeGreaterThanOrEqual(0.95);
    expect(result.extractedData.histology).toBeDefined();
    expect(result.extractedData.grade).toBeDefined();
  });
});
```

### 6.3 Performance Benchmarks

Target metrics:
- **Latency**: < 30 seconds for 3 iterations
- **Cost**: < $0.10 per document (including all iterations)
- **Quality**: 95%+ average score across test corpus

---

## 7. Nuances & Edge Cases

### 7.1 Handling Poor OCR Quality

If the source text is garbled/illegible:
- Evaluator will score low
- Optimizer will inject feedback
- But re-extraction won't help (garbage in = garbage out)

**Solution**: Add OCR quality check BEFORE reliability loop:

```typescript
interface OCRQualityCheck {
  readable: boolean;
  confidence: number;
  issues: string[];  // e.g., "Image too dark", "Text too small"
}

if (ocrQuality.confidence < 0.5) {
  return {
    error: 'Document quality too low for extraction',
    suggestions: ['Upload a clearer scan', 'Use PDF instead of photo']
  };
}
```

### 7.2 Handling Composite Documents

Documents that contain multiple report types (e.g., pathology + radiology):
- Current system detects composite documents
- Reliability loop should run per-section

**Solution**: Run reliability loop for each detected section:

```typescript
if (classification.isComposite) {
  const results = await Promise.all(
    classification.containsContent.map(docType =>
      reliabilityLoop.execute(sourceText, docType, getPromptFor(docType))
    )
  );
  return mergeResults(results);
}
```

### 7.3 Handling Ambiguous Extractions

When the source text genuinely doesn't contain a required field:
- Evaluator will penalize for missing field
- Optimizer will ask for it
- Extractor still can't find it (because it doesn't exist)
- Loop wastes iterations

**Solution**: Distinguish between "not found" and "not present":

```typescript
interface ExtractedClinicalData {
  histology?: string;
  histology_status?: 'found' | 'not_present' | 'ambiguous';  // NEW
}

// Evaluator: Don't penalize for genuinely absent fields
if (data[field] === undefined && data[`${field}_status`] === 'not_present') {
  // Field legitimately doesn't exist in source - don't penalize
}
```

### 7.4 Handling Rate Limits

Multiple LLM calls per iteration could hit rate limits:
- OCR call (1)
- Classification call (1)
- Extraction call (1)
- Accuracy evaluation call (1)

**Solution**: Implement exponential backoff and batching:

```typescript
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.status === 429) {  // Rate limited
        await sleep(Math.pow(2, i) * 1000);  // Exponential backoff
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded');
};
```

### 7.5 Cost Considerations

Each iteration costs ~$0.01-0.03 (depends on document size):
- 3 iterations = $0.03-0.09 per document
- Need to balance quality vs. cost

**Solution**: Configurable thresholds per use case:

```typescript
const configs = {
  'real-time': { qualityThreshold: 0.85, maxIterations: 2 },  // Fast, cheaper
  'batch': { qualityThreshold: 0.95, maxIterations: 3 },      // Quality first
  'clinical': { qualityThreshold: 0.98, maxIterations: 5 }    // Safety critical
};
```

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `marc.iteration_count` | Iterations per document | > 3 (investigate prompts) |
| `marc.final_score` | Final quality score | < 0.8 (quality issue) |
| `marc.threshold_met_rate` | % documents meeting threshold | < 90% |
| `marc.processing_time_ms` | Total loop time | > 45000ms |
| `marc.improvement_per_iteration` | Score improvement | < 0.02 (plateau) |

### 8.2 Logging Structure

```typescript
// Log at each iteration
console.log(JSON.stringify({
  event: 'marc_iteration',
  documentId,
  iteration,
  score: {
    overall: 0.85,
    completeness: 0.9,
    accuracy: 0.8,
    validity: 0.85,
    consistency: 0.9
  },
  feedback: {
    issueCount: 2,
    criticalCount: 1,
    missingFields: ['grade']
  },
  improvement: 0.1,
  timestamp: new Date().toISOString()
}));
```

---

## 9. Future Enhancements

### 9.1 Learned Prompts

Instead of static extraction prompts, learn optimal prompts from successful extractions:

```typescript
// After successful extraction (score >= 0.95)
await promptStore.save({
  documentType,
  prompt: finalPrompt,
  score: finalScore,
  extractedFields: Object.keys(finalData)
});

// When starting new extraction
const bestPrompt = await promptStore.getBestPrompt(documentType);
```

### 9.2 Ensemble Evaluation

Use multiple evaluators and aggregate scores:

```typescript
const evaluators = [
  new RuleBased Evaluator(),
  new LLMEvaluator({ model: 'gemini-2.0-flash' }),
  new LLMEvaluator({ model: 'claude-3-haiku' })  // Different model
];

const scores = await Promise.all(evaluators.map(e => e.evaluate(...)));
const finalScore = aggregateScores(scores);  // e.g., median
```

### 9.3 Human-in-the-Loop

For critical documents or low-confidence extractions:

```typescript
if (finalScore < 0.8) {
  // Flag for human review
  await flagForReview({
    documentId,
    extractedData,
    score: finalScore,
    iterationHistory
  });
}
```

---

## 10. Summary

### What We're Building

1. **Evaluator**: Scores extraction quality on 4 dimensions (completeness, accuracy, validity, consistency)
2. **Optimizer**: Injects feedback into prompts for improved re-extraction
3. **Reliability Loop**: Orchestrates the extract-evaluate-optimize cycle

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quality threshold | 0.95 | Matches paper claim |
| Max iterations | 3 | Penn-RAIL default, cost-effective |
| Scoring weights | 40% accuracy, 30% completeness | Accuracy most important |
| Feedback format | Structured (severity + field + description) | Actionable for optimizer |

### Expected Outcomes

- **Before**: Single-pass extraction with heuristic confidence
- **After**: Iterative refinement achieving 95%+ validated quality

### Alignment with Paper Claims

| Paper Claim | Implementation |
|-------------|---------------|
| "MARC-v1 reliability loops" | ✅ ReliabilityLoop class with extract-evaluate-optimize cycle |
| "95%+ extraction confidence" | ✅ Configurable quality threshold (default 0.95) |
| "evaluator-optimizer patterns" | ✅ ExtractionEvaluator + ExtractionOptimizer classes |

---

## Appendix A: Example Prompts

### A.1 Base Extraction Prompt (Pathology)

```
Extract clinical data from this PATHOLOGY report.

Required fields:
- histology: Cancer type/subtype (e.g., "Invasive ductal carcinoma")
- grade: Tumor grade (1, 2, 3 or well/moderate/poorly differentiated)

Important fields:
- margins: Surgical margin status (positive/negative/close with distance)
- ihcMarkers: IHC results as key-value pairs (ER, PR, HER2, Ki-67, etc.)

Optional fields:
- date: Report date
- institution: Hospital/lab name

Document text:
{input}

Respond with ONLY a JSON object containing the extracted fields.
Use null for fields not found in the document.
```

### A.2 Optimized Prompt (After Feedback)

```
Extract clinical data from this PATHOLOGY report.

Required fields:
- histology: Cancer type/subtype (e.g., "Invasive ductal carcinoma")
- grade: Tumor grade (1, 2, 3 or well/moderate/poorly differentiated)

Important fields:
- margins: Surgical margin status (positive/negative/close with distance)
- ihcMarkers: IHC results as key-value pairs (ER, PR, HER2, Ki-67, etc.)

Optional fields:
- date: Report date
- institution: Hospital/lab name

Document text:
{input}

Respond with ONLY a JSON object containing the extracted fields.
Use null for fields not found in the document.

--- FEEDBACK FROM QUALITY EVALUATION (Iteration 1) ---
Current Score: 72.5% (Target: 95%)

CRITICAL ISSUES (must fix):
  - [grade] Required field "grade" is missing → Look for grade information in the document
  - [ihcMarkers] Extracted ER as "positive" but source says "ER: 95% positive" - include percentage

MAJOR ISSUES (should fix):
  - [margins] Margins extracted as "clear" but source specifies "0.3cm margin"

MISSING FIELDS:
  - grade

SUGGESTIONS:
  - Look for IHC panel results including ER, PR, HER2, Ki-67
  - Grade may be listed as "Nottingham score" or "modified Bloom-Richardson grade"

PRIORITY: Focus extraction on these fields: grade, ihcMarkers, margins

PREVIOUS ATTEMPT (for reference):
{
  "histology": "Invasive ductal carcinoma",
  "grade": null,
  "margins": "clear",
  "ihcMarkers": {"ER": "positive", "PR": "positive"},
  "date": "2025-01-15",
  "institution": "Tata Memorial Hospital"
}

Please re-extract the clinical data, addressing ALL issues above.
Ensure extracted values EXACTLY match what appears in the source document.
```

---

## Appendix B: References

1. [Penn-RAIL/MARC-v1 GitHub Repository](https://github.com/Penn-RAIL/MARC-v1)
2. [MARC-v1 Feedback Loop Test Results](https://github.com/Penn-RAIL/MARC-v1/blob/main/FEEDBACK_LOOP_TEST_RESULTS.md)
3. VTB Current Implementation: `apps/web/src/app/api/upload/process/route.ts`
4. VTB Scientific Paper V11: `docs/v11_scientific_paper.tex`

---

*Document Version: 1.0*  
*Created: 2026-01-26*  
*Author: VTB Development Team*
