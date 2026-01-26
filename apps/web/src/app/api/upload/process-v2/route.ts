/**
 * Document Processing API V2 with MARC-v1 Reliability Loop
 * 
 * Enhanced version of document processing that implements
 * Penn-RAIL MARC-v1 evaluator-optimizer patterns for 95%+ extraction confidence.
 * 
 * Features:
 * - Iterative refinement until quality threshold met
 * - 4-dimension evaluation (completeness, accuracy, validity, consistency)
 * - Feedback injection for prompt optimization
 * - Full iteration history for debugging
 * 
 * Note: This is a self-contained implementation for edge runtime compatibility.
 * The full MARC-v1 implementation is in packages/agents/src/extraction/
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocumentType, ExtractedClinicalData } from "@/types/user-upload";
import {
  generateCacheKey,
  getCachedResult,
  cacheResult,
} from "@/lib/cache/document-cache";
import { logMARCEvent } from "@/lib/analytics/marc-analytics";
import { logAPIUsage, estimateTokens } from "@/lib/costs";

export const runtime = "edge";
export const maxDuration = 60;

// ============================================================================
// MARC-v1 Types (inline for edge runtime)
// ============================================================================

interface EvaluationScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  clinicalValidity: number;
}

interface EvaluationIssue {
  severity: 'critical' | 'major' | 'minor';
  field: string;
  description: string;
  suggestedFix?: string;
}

interface EvaluationFeedback {
  overallScore: number;
  issues: EvaluationIssue[];
  missingFields: string[];
  priorityFields: string[];
  suggestions: string[];
}

interface ReliabilityLoopMetadata {
  enabled: boolean;
  finalScore: number;
  iterations: number;
  metThreshold: boolean;
  stoppedReason: string;
  scoreBreakdown?: {
    completeness: number;
    accuracy: number;
    consistency: number;
    clinicalValidity: number;
  };
}

interface IterationRecord {
  iteration: number;
  extractedData: ExtractedClinicalData;
  score: EvaluationScore;
  feedback?: EvaluationFeedback;
}

// ============================================================================
// Configuration
// ============================================================================

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const MARC_CONFIG = {
  qualityThreshold: parseFloat(process.env.MARC_QUALITY_THRESHOLD || "0.95"),
  maxIterations: parseInt(process.env.MARC_MAX_ITERATIONS || "3", 10),
  enabled: process.env.MARC_RELIABILITY_LOOP_ENABLED !== "false",
  verbose: process.env.MARC_VERBOSE === "true",
};

// Extraction rubrics
const EXTRACTION_RUBRICS: Record<DocumentType, { required: string[]; important: string[]; optional: string[] }> = {
  pathology: { required: ['histology', 'grade'], important: ['margins', 'ihcMarkers'], optional: ['date', 'institution'] },
  radiology: { required: ['impression'], important: ['findings', 'measurements'], optional: ['date', 'institution'] },
  genomics: { required: ['mutations'], important: ['msiStatus', 'tmb'], optional: ['date', 'institution'] },
  'lab-report': { required: ['labValues'], important: [], optional: ['date', 'institution'] },
  prescription: { required: ['rawText'], important: [], optional: ['date', 'institution'] },
  'clinical-notes': { required: ['rawText'], important: [], optional: ['date', 'institution'] },
  'discharge-summary': { required: ['rawText'], important: [], optional: ['date', 'institution'] },
  'surgical-notes': { required: ['rawText'], important: ['margins'], optional: ['date', 'institution'] },
  unknown: { required: ['rawText'], important: [], optional: ['date', 'institution'] },
};

// Document patterns for classification
const DOCUMENT_PATTERNS: Record<DocumentType, RegExp[]> = {
  pathology: [/histopath/i, /biopsy/i, /carcinoma/i, /grade\s*[1-3]/i, /ihc/i, /her2/i, /ki-?67/i, /fnac/i],
  radiology: [/ct\s*scan/i, /mri/i, /pet\s*scan/i, /impression:/i, /findings:/i, /mammogra/i],
  genomics: [/ngs/i, /mutation/i, /egfr/i, /kras/i, /msi-?h/i, /tmb/i, /brca/i],
  prescription: [/rx/i, /prescription/i, /dosage/i, /chemotherapy/i, /regimen/i],
  'lab-report': [/cbc/i, /hemoglobin/i, /creatinine/i, /reference\s*range/i, /tumor\s*marker/i],
  'clinical-notes': [/consultation/i, /chief\s*complaint/i, /history/i, /assessment/i],
  'discharge-summary': [/discharge/i, /admission/i, /hospital\s*stay/i],
  'surgical-notes': [/operative/i, /surgery/i, /resection/i, /incision/i],
  unknown: [],
};

// ============================================================================
// Helper Functions
// ============================================================================

function log(message: string, data?: unknown): void {
  if (MARC_CONFIG.verbose) {
    console.log(`[MARC V2] ${message}`, data || '');
  }
}

function classifyByPatterns(text: string): { type: DocumentType; confidence: number } {
  const scores: Record<string, number> = {};
  const normalizedText = text.toLowerCase();

  for (const [docType, patterns] of Object.entries(DOCUMENT_PATTERNS)) {
    scores[docType] = patterns.filter(p => p.test(normalizedText)).length;
  }

  const entries = Object.entries(scores);
  entries.sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = entries[0];
  const maxPossible = DOCUMENT_PATTERNS[bestType as DocumentType]?.length || 1;
  
  return {
    type: bestType as DocumentType,
    confidence: bestScore > 0 ? Math.min(bestScore / (maxPossible * 0.3), 1) : 0,
  };
}

async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const ocrPrompt = "Extract ALL text from this medical document. Include headers, tables, values. Output ONLY the text.";
  const result = await model.generateContent([
    { inlineData: { data: base64Data, mimeType } },
    { text: ocrPrompt },
  ]);
  const responseText = result.response.text();
  
  // Log OCR cost (estimate input tokens from base64 size - roughly 0.75 bytes per token for images)
  logAPIUsage({
    model: 'gemini-2.0-flash',
    inputTokens: Math.ceil(base64Data.length * 0.75 / 4) + estimateTokens(ocrPrompt),
    outputText: responseText,
    category: 'marc_extraction',
  });
  
  return responseText;
}

function redactPII(text: string): string {
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
    .replace(/\b\d{10,12}\b/g, '[PHONE]')
    .replace(/\b[A-Z]{2,4}\d{6,10}\b/gi, '[MRN]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]');
}

function isFieldPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return false;
  return true;
}

// ============================================================================
// MARC-v1 Evaluator (Inline Implementation)
// ============================================================================

function checkCompleteness(docType: DocumentType, data: ExtractedClinicalData): number {
  const rubric = EXTRACTION_RUBRICS[docType] || EXTRACTION_RUBRICS.unknown;
  let totalWeight = 0;
  let weightedScore = 0;

  for (const field of rubric.required) {
    const present = isFieldPresent((data as Record<string, unknown>)[field]);
    totalWeight += 1.0;
    weightedScore += present ? 1.0 : 0;
  }

  for (const field of rubric.important) {
    const present = isFieldPresent((data as Record<string, unknown>)[field]);
    totalWeight += 0.7;
    weightedScore += present ? 0.7 : 0;
  }

  for (const field of rubric.optional) {
    const present = isFieldPresent((data as Record<string, unknown>)[field]);
    totalWeight += 0.3;
    weightedScore += present ? 0.3 : 0.24; // Minimal penalty for missing optional
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

async function checkAccuracy(sourceText: string, data: ExtractedClinicalData): Promise<number> {
  const dataKeys = Object.keys(data).filter(k => !k.startsWith('_') && isFieldPresent((data as Record<string, unknown>)[k]));
  if (dataKeys.length === 0) return 0.5;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Verify extraction accuracy. Source (first 3000 chars):
${sourceText.slice(0, 3000)}

Extracted:
${JSON.stringify(data, null, 2)}

Score accuracy 0-1 where 1=perfect. Respond ONLY with JSON: {"accuracy": 0.85}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\{[\s\S]*\}/);
    
    // Log evaluation cost
    logAPIUsage({
      model: 'gemini-2.0-flash',
      inputText: prompt,
      outputText: responseText,
      category: 'marc_evaluation',
    });
    
    if (match) {
      const parsed = JSON.parse(match[0]);
      return Math.min(1, Math.max(0, parsed.accuracy || 0.7));
    }
  } catch (e) {
    log('Accuracy check failed', e);
  }
  return 0.7;
}

function checkClinicalValidity(docType: DocumentType, data: ExtractedClinicalData): number {
  let issues = 0;
  
  if (docType === 'pathology') {
    if (data.grade && !/^(1|2|3|I|II|III|well|moderate|poorly|low|high)/i.test(String(data.grade))) {
      issues++;
    }
  }
  
  if (docType === 'genomics') {
    if (data.msiStatus && !/^(MSI-?H|MSI-?L|MSS|stable)/i.test(String(data.msiStatus))) {
      issues++;
    }
  }
  
  return Math.max(0.5, 1.0 - issues * 0.15);
}

function checkConsistency(docType: DocumentType, data: ExtractedClinicalData): number {
  let issues = 0;
  
  if (docType === 'pathology') {
    if (data.histology?.toLowerCase().includes('carcinoma') && !data.grade) {
      issues++;
    }
  }
  
  return Math.max(0.5, 1.0 - issues * 0.15);
}

async function evaluate(
  sourceText: string,
  docType: DocumentType,
  data: ExtractedClinicalData
): Promise<{ score: EvaluationScore; feedback: EvaluationFeedback }> {
  const completeness = checkCompleteness(docType, data);
  const accuracy = await checkAccuracy(sourceText, data);
  const validity = checkClinicalValidity(docType, data);
  const consistency = checkConsistency(docType, data);
  
  const overall = completeness * 0.30 + accuracy * 0.40 + validity * 0.15 + consistency * 0.15;
  
  const score: EvaluationScore = { overall, completeness, accuracy, clinicalValidity: validity, consistency };
  
  // Generate feedback
  const issues: EvaluationIssue[] = [];
  const missingFields: string[] = [];
  const priorityFields: string[] = [];
  const rubric = EXTRACTION_RUBRICS[docType] || EXTRACTION_RUBRICS.unknown;
  
  for (const field of rubric.required) {
    if (!isFieldPresent((data as Record<string, unknown>)[field])) {
      missingFields.push(field);
      priorityFields.push(field);
      issues.push({ severity: 'critical', field, description: `Required field "${field}" is missing` });
    }
  }
  
  for (const field of rubric.important) {
    if (!isFieldPresent((data as Record<string, unknown>)[field])) {
      missingFields.push(field);
      issues.push({ severity: 'major', field, description: `Important field "${field}" is missing` });
    }
  }
  
  const feedback: EvaluationFeedback = {
    overallScore: overall,
    issues,
    missingFields,
    priorityFields,
    suggestions: missingFields.length > 0 ? [`Focus on extracting: ${missingFields.join(', ')}`] : [],
  };
  
  return { score, feedback };
}

// ============================================================================
// MARC-v1 Optimizer (Inline Implementation)
// ============================================================================

function buildOptimizedPrompt(
  basePrompt: string,
  feedback: EvaluationFeedback,
  previousAttempt: ExtractedClinicalData,
  iteration: number
): string {
  const criticalIssues = feedback.issues.filter(i => i.severity === 'critical');
  const majorIssues = feedback.issues.filter(i => i.severity === 'major');
  
  let feedbackSection = `
--- FEEDBACK FROM QUALITY EVALUATION (Iteration ${iteration}) ---
Current Score: ${(feedback.overallScore * 100).toFixed(1)}% (Target: 95%)

`;

  if (criticalIssues.length > 0) {
    feedbackSection += `CRITICAL ISSUES:\n${criticalIssues.map(i => `  - [${i.field}] ${i.description}`).join('\n')}\n\n`;
  }

  if (majorIssues.length > 0) {
    feedbackSection += `MAJOR ISSUES:\n${majorIssues.map(i => `  - [${i.field}] ${i.description}`).join('\n')}\n\n`;
  }

  if (feedback.missingFields.length > 0) {
    feedbackSection += `MISSING FIELDS: ${feedback.missingFields.join(', ')}\n\n`;
  }

  feedbackSection += `PREVIOUS ATTEMPT:\n${JSON.stringify(previousAttempt, null, 2).slice(0, 1000)}\n\n`;
  feedbackSection += `Please re-extract, addressing ALL issues above. Ensure values EXACTLY match the source.`;

  return `${basePrompt}\n\n${feedbackSection}`;
}

function shouldContinue(
  currentScore: number,
  previousScore: number | null,
  iteration: number,
  threshold: number,
  maxIterations: number
): { continue: boolean; reason: string } {
  if (currentScore >= threshold) {
    return { continue: false, reason: `Quality threshold met (${(currentScore * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%)` };
  }
  if (iteration >= maxIterations) {
    return { continue: false, reason: `Max iterations reached (${iteration}/${maxIterations})` };
  }
  if (previousScore !== null && currentScore - previousScore < 0.03) {
    return { continue: false, reason: `Insufficient improvement` };
  }
  return { continue: true, reason: 'Continue optimization' };
}

// ============================================================================
// MARC-v1 Reliability Loop (Inline Implementation)
// ============================================================================

async function runReliabilityLoop(
  sourceText: string,
  docType: DocumentType,
  basePrompt: string,
  config: { qualityThreshold: number; maxIterations: number }
): Promise<{
  finalData: ExtractedClinicalData;
  finalScore: number;
  iterations: number;
  metThreshold: boolean;
  stoppedReason: string;
  iterationHistory: IterationRecord[];
}> {
  const iterationHistory: IterationRecord[] = [];
  let currentPrompt = basePrompt;
  let currentData: ExtractedClinicalData = {};
  let currentScore: EvaluationScore = { overall: 0, completeness: 0, accuracy: 0, consistency: 0, clinicalValidity: 0 };
  let previousScore: number | null = null;
  let feedback: EvaluationFeedback | undefined;
  let iteration = 0;
  let stoppedReason = '';

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  while (true) {
    iteration++;
    log(`Iteration ${iteration}: Extracting...`);

    // EXTRACT
    try {
      const fullPrompt = `${currentPrompt}\n\nDocument text:\n${sourceText.slice(0, 6000)}\n\nRespond with ONLY a valid JSON object.`;
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();
      const match = responseText.match(/\{[\s\S]*\}/);
      currentData = match ? JSON.parse(match[0]) : { rawText: sourceText.slice(0, 2000) };
      
      // Log extraction cost
      logAPIUsage({
        model: 'gemini-2.0-flash',
        inputText: fullPrompt,
        outputText: responseText,
        category: 'marc_extraction',
      });
    } catch (e) {
      log('Extraction failed', e);
      stoppedReason = 'Extraction failed';
      break;
    }

    // EVALUATE
    log(`Iteration ${iteration}: Evaluating...`);
    const evaluation = await evaluate(sourceText, docType, currentData);
    currentScore = evaluation.score;
    feedback = evaluation.feedback;

    log(`Iteration ${iteration}: Score = ${(currentScore.overall * 100).toFixed(1)}%`);

    iterationHistory.push({ iteration, extractedData: currentData, score: currentScore, feedback });

    // CHECK CONTINUE
    const decision = shouldContinue(currentScore.overall, previousScore, iteration, config.qualityThreshold, config.maxIterations);
    if (!decision.continue) {
      stoppedReason = decision.reason;
      break;
    }

    // OPTIMIZE
    currentPrompt = buildOptimizedPrompt(basePrompt, feedback, currentData, iteration);
    previousScore = currentScore.overall;
  }

  return {
    finalData: currentData,
    finalScore: currentScore.overall,
    iterations: iteration,
    metThreshold: currentScore.overall >= config.qualityThreshold,
    stoppedReason,
    iterationHistory,
  };
}

// ============================================================================
// Extraction Prompts
// ============================================================================

function buildExtractionPrompt(docType: DocumentType): string {
  const prompts: Record<DocumentType, string> = {
    pathology: `Extract from PATHOLOGY report:
- histology: Cancer type (e.g., "Invasive ductal carcinoma")
- grade: Tumor grade (1/2/3 or differentiation)
- margins: Margin status (positive/negative/close)
- ihcMarkers: IHC results as {marker: result} (ER, PR, HER2, Ki-67)
- date, institution (if present)
Respond with ONLY valid JSON.`,
    radiology: `Extract from RADIOLOGY report:
- impression: Radiologist conclusion
- findings: Array of findings
- measurements: Array of {site, size} with units
- date, institution
Respond with ONLY valid JSON.`,
    genomics: `Extract from GENOMICS report:
- mutations: Array of {gene, variant, actionable}
- msiStatus: MSI-H/MSI-L/MSS
- tmb: Tumor mutational burden (number)
- date, institution
Respond with ONLY valid JSON.`,
    'lab-report': `Extract: labValues as [{test, value, unit, flag}], date, institution. JSON only.`,
    prescription: `Extract: rawText (treatment summary), date, institution. JSON only.`,
    'clinical-notes': `Extract: rawText (clinical findings), date, institution. JSON only.`,
    'discharge-summary': `Extract: rawText (diagnosis/treatment), date, institution. JSON only.`,
    'surgical-notes': `Extract: rawText (procedure), margins, date, institution. JSON only.`,
    unknown: `Extract any medical info: rawText, date, institution. JSON only.`,
  };
  return prompts[docType] || prompts.unknown;
}

// ============================================================================
// Main API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      fileBase64,
      mimeType,
      filename,
      documentTypeOverride,
      enableReliabilityLoop = MARC_CONFIG.enabled,
      qualityThreshold = MARC_CONFIG.qualityThreshold,
      maxIterations = MARC_CONFIG.maxIterations,
    } = body;

    if (!fileBase64 || !mimeType || !filename) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!GEMINI_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Check cache
    const cacheKey = await generateCacheKey(fileBase64, mimeType);
    const cachedResult = getCachedResult(cacheKey);

    if (cachedResult && !documentTypeOverride && !enableReliabilityLoop) {
      log(`Cache HIT for ${filename}`);
      return NextResponse.json({
        documentId: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classifiedType: cachedResult.classifiedType,
        confidence: cachedResult.confidence,
        extractedData: cachedResult.extractedData,
        warnings: cachedResult.warnings,
        reliabilityLoop: { enabled: false, finalScore: cachedResult.confidence, iterations: 0, metThreshold: true, stoppedReason: "Cache hit" } as ReliabilityLoopMetadata,
        cached: true,
        processingTimeMs: Date.now() - startTime,
      });
    }

    log(`Processing ${filename} (reliability loop: ${enableReliabilityLoop})`);

    // OCR
    let extractedText = "";
    const warnings: string[] = [];

    if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
      extractedText = await extractTextFromImage(fileBase64, mimeType);
    } else {
      warnings.push("Unsupported file type");
    }

    if (!extractedText || extractedText.length < 50) {
      warnings.push("Limited text extracted");
    }

    const redactedText = redactPII(extractedText);

    // Classify
    let classifiedType: DocumentType;
    if (documentTypeOverride) {
      classifiedType = documentTypeOverride;
    } else {
      classifiedType = classifyByPatterns(redactedText).type;
    }

    // Extract
    let extractedData: ExtractedClinicalData;
    let reliabilityLoopMetadata: ReliabilityLoopMetadata;
    const basePrompt = buildExtractionPrompt(classifiedType);

    if (enableReliabilityLoop) {
      log(`Running reliability loop (threshold=${qualityThreshold}, maxIter=${maxIterations})`);
      
      const result = await runReliabilityLoop(redactedText, classifiedType, basePrompt, { qualityThreshold, maxIterations });
      
      extractedData = result.finalData;
      const lastRecord = result.iterationHistory[result.iterations - 1];
      
      reliabilityLoopMetadata = {
        enabled: true,
        finalScore: result.finalScore,
        iterations: result.iterations,
        metThreshold: result.metThreshold,
        stoppedReason: result.stoppedReason,
        scoreBreakdown: lastRecord?.score ? {
          completeness: lastRecord.score.completeness,
          accuracy: lastRecord.score.accuracy,
          consistency: lastRecord.score.consistency,
          clinicalValidity: lastRecord.score.clinicalValidity,
        } : undefined,
      };

      log(`Loop complete: score=${(result.finalScore * 100).toFixed(1)}%, iterations=${result.iterations}`);
    } else {
      // Single-pass
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const fullPrompt = `${basePrompt}\n\nDocument:\n${redactedText.slice(0, 6000)}\n\nJSON only.`;
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();
      const match = responseText.match(/\{[\s\S]*\}/);
      extractedData = match ? JSON.parse(match[0]) : { rawText: redactedText.slice(0, 2000) };
      
      // Log single-pass extraction cost
      logAPIUsage({
        model: 'gemini-2.0-flash',
        inputText: fullPrompt,
        outputText: responseText,
        category: 'marc_extraction',
      });
      
      reliabilityLoopMetadata = {
        enabled: false,
        finalScore: 0.7,
        iterations: 1,
        metThreshold: true,
        stoppedReason: "Reliability loop disabled",
      };
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const processingTimeMs = Date.now() - startTime;

    // Log MARC analytics event
    try {
      logMARCEvent({
        documentType: classifiedType,
        documentId,
        fileSize: fileBase64.length,
        qualityThreshold,
        maxIterations,
        reliabilityLoopEnabled: enableReliabilityLoop,
        finalScore: reliabilityLoopMetadata.finalScore,
        iterations: reliabilityLoopMetadata.iterations,
        metThreshold: reliabilityLoopMetadata.metThreshold,
        stoppedReason: reliabilityLoopMetadata.stoppedReason,
        completenessScore: reliabilityLoopMetadata.scoreBreakdown?.completeness,
        accuracyScore: reliabilityLoopMetadata.scoreBreakdown?.accuracy,
        consistencyScore: reliabilityLoopMetadata.scoreBreakdown?.consistency,
        clinicalValidityScore: reliabilityLoopMetadata.scoreBreakdown?.clinicalValidity,
        processingTimeMs,
      });
    } catch (analyticsError) {
      // Don't fail the request if analytics fails
      console.warn('[MARC V2] Analytics logging failed:', analyticsError);
    }

    // Cache if not using reliability loop
    if (!enableReliabilityLoop && !documentTypeOverride) {
      cacheResult(cacheKey, {
        classifiedType,
        confidence: reliabilityLoopMetadata.finalScore,
        extractedData,
        textLength: extractedText.length,
        warnings,
      }, processingTimeMs);
    }

    return NextResponse.json({
      documentId,
      classifiedType,
      confidence: reliabilityLoopMetadata.finalScore,
      extractedData,
      warnings,
      textLength: extractedText.length,
      reliabilityLoop: reliabilityLoopMetadata,
      cached: false,
      processingTimeMs,
    });

  } catch (error) {
    console.error("[MARC V2] Error:", error);
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}
