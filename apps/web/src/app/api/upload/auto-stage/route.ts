/**
 * Auto-Stage API Endpoint
 * Analyzes all uploaded documents to automatically detect:
 * - Cancer site and type
 * - Clinical staging (TNM)
 * - Key biomarkers and mutations
 * - Treatment timeline with dates
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { 
  DocumentType, 
  ExtractedClinicalData,
  AutoStageResult,
  ExtractedDate,
  TimelineEventType
} from "@/types/user-upload";
import { CANCER_SITES } from "@/lib/upload/constants";

export const runtime = "edge";
export const maxDuration = 120; // 2 minutes for analyzing multiple documents

// Initialize Gemini
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Document input for analysis
interface DocumentInput {
  id: string;
  filename: string;
  classifiedType: DocumentType;
  extractedData?: ExtractedClinicalData;
}

// Map document types to timeline event types
const DOC_TYPE_TO_EVENT_TYPE: Record<DocumentType, TimelineEventType> = {
  'pathology': 'diagnosis',
  'radiology': 'scan',
  'genomics': 'diagnosis',
  'prescription': 'treatment',
  'lab-report': 'lab',
  'clinical-notes': 'consult',
  'discharge-summary': 'treatment',
  'surgical-notes': 'surgery',
  'unknown': 'other',
};

// Find best matching cancer site from our list
function findBestCancerSiteMatch(detectedSite: string): { id: string; label: string } {
  const lowerSite = detectedSite.toLowerCase();
  
  // Try exact match first
  const exactMatch = CANCER_SITES.find(site => 
    site.id.toLowerCase() === lowerSite || 
    site.label.toLowerCase() === lowerSite
  );
  if (exactMatch) return { id: exactMatch.id, label: exactMatch.label };
  
  // Try partial match
  const partialMatch = CANCER_SITES.find(site => 
    lowerSite.includes(site.id.toLowerCase()) ||
    site.label.toLowerCase().includes(lowerSite) ||
    lowerSite.includes(site.label.toLowerCase().split(' ')[0])
  );
  if (partialMatch) return { id: partialMatch.id, label: partialMatch.label };
  
  // Common mappings
  const mappings: Record<string, string> = {
    'breast': 'breast',
    'lung': 'lung',
    'colorectal': 'colorectal',
    'colon': 'colorectal',
    'rectal': 'colorectal',
    'oral': 'oral-cavity',
    'mouth': 'oral-cavity',
    'tongue': 'oral-cavity',
    'cervix': 'cervix',
    'cervical': 'cervix',
    'ovary': 'ovarian',
    'ovarian': 'ovarian',
    'prostate': 'prostate',
    'stomach': 'gastric',
    'gastric': 'gastric',
    'esophagus': 'esophageal',
    'esophageal': 'esophageal',
    'liver': 'liver',
    'hepatocellular': 'liver',
    'pancreas': 'pancreatic',
    'pancreatic': 'pancreatic',
    'kidney': 'kidney',
    'renal': 'kidney',
    'bladder': 'bladder',
    'thyroid': 'thyroid',
    'brain': 'brain',
    'glioma': 'brain',
    'glioblastoma': 'brain',
    'leukemia': 'leukemia',
    'lymphoma': 'lymphoma',
    'myeloma': 'multiple-myeloma',
  };
  
  for (const [keyword, siteId] of Object.entries(mappings)) {
    if (lowerSite.includes(keyword)) {
      const site = CANCER_SITES.find(s => s.id === siteId);
      if (site) return { id: site.id, label: site.label };
    }
  }
  
  // Default to "other" if no match
  return { id: 'other', label: detectedSite };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documents } = body as { documents: DocumentInput[] };

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: "No documents provided for analysis" },
        { status: 400 }
      );
    }

    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Build document summary for Gemini
    const documentSummaries = documents.map((doc, idx) => {
      const data = doc.extractedData || {};
      let summary = `
---
Document #${idx + 1}: ${doc.filename}
Type: ${doc.classifiedType}
`;
      
      if (data.date) summary += `Date: ${data.date}\n`;
      if (data.histology) summary += `Histology: ${data.histology}\n`;
      if (data.grade) summary += `Grade: ${data.grade}\n`;
      if (data.ihcMarkers) summary += `IHC Markers: ${JSON.stringify(data.ihcMarkers)}\n`;
      if (data.findings?.length) summary += `Findings: ${data.findings.join('; ')}\n`;
      if (data.impression) summary += `Impression: ${data.impression}\n`;
      if (data.mutations?.length) summary += `Mutations: ${data.mutations.map(m => `${m.gene} ${m.variant}`).join(', ')}\n`;
      if (data.msiStatus) summary += `MSI Status: ${data.msiStatus}\n`;
      if (data.measurements?.length) summary += `Measurements: ${data.measurements.map(m => `${m.site}: ${m.size}`).join(', ')}\n`;
      if (data.rawText) summary += `\nText excerpt:\n${data.rawText.slice(0, 1500)}`;
      
      return summary;
    }).join('\n');

    // Gemini prompt for comprehensive analysis
    const prompt = `You are a medical AI assistant analyzing cancer medical documents to help patients understand their diagnosis.

Analyze these ${documents.length} medical documents and extract:

1. PRIMARY CANCER SITE & TYPE
   - Identify the primary cancer (breast, lung, colorectal, etc.)
   - Include subtype if determinable (e.g., "Triple Negative Breast Cancer", "NSCLC Adenocarcinoma", "HER2+ Breast Cancer")
   - Provide confidence (0-1) and cite evidence

2. CLINICAL STAGING
   - Determine stage (I, II, III, IV, or unknown)
   - Provide TNM staging if available (e.g., T2N1M0)
   - Cite evidence from pathology/radiology

3. KEY BIOMARKERS & MUTATIONS
   - List all biomarkers (ER, PR, HER2, Ki-67, PD-L1, etc.) with values
   - List mutations (EGFR, KRAS, BRAF, etc.) if mentioned
   - Note which are actionable

4. TREATMENT HISTORY (if evident)
   - List surgeries, chemotherapy, radiation, targeted therapy mentioned

5. IMPORTANT DATES
   - Extract ALL dates with their associated events
   - Format dates as YYYY-MM-DD
   - Include: diagnosis dates, scan dates, surgery dates, treatment dates, report dates

DOCUMENTS:
${documentSummaries}

Respond with ONLY valid JSON matching this exact structure:
{
  "cancerSite": {
    "detected": "string - cancer type as detected (e.g., 'Breast Cancer - Triple Negative')",
    "confidence": 0.95,
    "evidence": ["evidence 1", "evidence 2"]
  },
  "staging": {
    "clinicalStage": "I" | "II" | "III" | "IV" | "unknown",
    "tnm": "T2N1M0 or null",
    "confidence": 0.85,
    "evidence": ["evidence 1", "evidence 2"]
  },
  "keyFindings": {
    "histology": "string or null",
    "grade": "string or null",
    "biomarkers": {"ER": "Positive 90%", "PR": "Negative", "HER2": "Negative", "Ki67": "45%"},
    "mutations": ["BRCA1 pathogenic variant"],
    "metastases": ["liver", "bone"] or []
  },
  "treatmentHistory": {
    "surgeries": ["Mastectomy"],
    "chemotherapy": ["AC-T regimen"],
    "radiation": [],
    "targetedTherapy": []
  },
  "extractedDates": [
    {
      "date": "2025-06-15",
      "event": "Initial Mammogram",
      "eventType": "scan",
      "documentIndex": 0,
      "confidence": 0.9
    }
  ],
  "warnings": ["string - any concerns about data quality or missing info"]
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON from response
    let parsed: any;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: responseText.slice(0, 500) },
        { status: 500 }
      );
    }

    // Map to our cancer site IDs
    const cancerSiteMatch = findBestCancerSiteMatch(parsed.cancerSite?.detected || 'unknown');

    // Build the AutoStageResult
    const autoStageResult: AutoStageResult = {
      cancerSite: {
        id: cancerSiteMatch.id,
        label: parsed.cancerSite?.detected || cancerSiteMatch.label,
        confidence: parsed.cancerSite?.confidence || 0.5,
        evidence: parsed.cancerSite?.evidence || [],
      },
      staging: {
        clinicalStage: parsed.staging?.clinicalStage || 'unknown',
        tnm: parsed.staging?.tnm || undefined,
        confidence: parsed.staging?.confidence || 0.5,
        evidence: parsed.staging?.evidence || [],
      },
      keyFindings: {
        histology: parsed.keyFindings?.histology || undefined,
        grade: parsed.keyFindings?.grade || undefined,
        biomarkers: parsed.keyFindings?.biomarkers || undefined,
        mutations: parsed.keyFindings?.mutations || undefined,
        metastases: parsed.keyFindings?.metastases || undefined,
      },
      treatmentHistory: parsed.treatmentHistory ? {
        surgeries: parsed.treatmentHistory.surgeries || undefined,
        chemotherapy: parsed.treatmentHistory.chemotherapy || undefined,
        radiation: parsed.treatmentHistory.radiation || undefined,
        targetedTherapy: parsed.treatmentHistory.targetedTherapy || undefined,
      } : undefined,
      warnings: parsed.warnings || [],
      extractedDates: (parsed.extractedDates || []).map((d: any, idx: number) => {
        const docIndex = d.documentIndex ?? idx;
        const doc = documents[docIndex] || documents[0];
        return {
          date: d.date,
          event: d.event,
          eventType: d.eventType || DOC_TYPE_TO_EVENT_TYPE[doc?.classifiedType] || 'other',
          documentId: doc?.id || `doc-${idx}`,
          documentFilename: doc?.filename || 'Unknown',
          confidence: d.confidence || 0.7,
        } as ExtractedDate;
      }),
    };

    return NextResponse.json(autoStageResult);

  } catch (error) {
    console.error("Auto-stage error:", error);
    return NextResponse.json(
      { error: "Failed to analyze documents" },
      { status: 500 }
    );
  }
}
