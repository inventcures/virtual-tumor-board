/**
 * Document Processing API with Gemini Flash
 * Handles OCR, classification, and data extraction from medical documents
 * 
 * V5: Now with intelligent caching for repeated documents
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocumentType, ExtractedClinicalData, DocumentClassification } from "@/types/user-upload";
import { verifyApiAuth } from "@/lib/api-auth";
import { 
  generateCacheKey, 
  getCachedResult, 
  cacheResult,
  getCacheStats 
} from "@/lib/cache/document-cache";
import {
  buildDocumentClassification,
  mergeExtractedData,
} from "@/lib/classification/composite-document-handler";

export const runtime = "edge";
export const maxDuration = 60; // 60 seconds for processing

// Initialize Gemini - check multiple env var names
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Document classification patterns (fast heuristic check first)
// V5.2: Enhanced with Indian medical terminology
const DOCUMENT_PATTERNS: Record<DocumentType, RegExp[]> = {
  pathology: [
    /histopath/i, /biopsy/i, /specimen/i, /microscop/i,
    /carcinoma/i, /adenoma/i, /grade\s*[1-3]/i,
    /immunohistochem/i, /ihc/i, /er\s*positive/i,
    /her2/i, /ki-?67/i, /tumor\s*cells/i, /malignant/i,
    /pathology\s*report/i, /gross\s*description/i,
    // Indian terms
    /hpe\s*report/i, /fnac/i, /trucut/i, /core\s*biopsy/i,
    /histological\s*examination/i,
  ],
  radiology: [
    /ct\s*scan/i, /mri/i, /pet\s*scan/i, /x-?ray/i,
    /ultrasound/i, /impression:/i, /findings:/i,
    /hounsfield/i, /suv/i, /contrast/i, /radiology/i,
    /axial/i, /coronal/i, /sagittal/i, /mass\s*measuring/i,
    /lymph\s*node/i, /metast/i,
    // Indian terms
    /usg/i, /cect/i, /hrct/i, /mrcp/i, /pet-?ct/i,
    /mammogra/i, /sono-?mammo/i,
  ],
  genomics: [
    /ngs/i, /next\s*gen/i, /sequencing/i, /mutation/i,
    /variant/i, /egfr/i, /kras/i, /braf/i, /foundation/i,
    /guardant/i, /msi-?h/i, /tmb/i, /molecular/i,
    /exon/i, /deletion/i, /amplification/i,
    /brca/i, /genetic\s*testing/i, /oncomine/i,
  ],
  prescription: [
    /rx/i, /prescription/i, /dosage/i, /mg\/m2/i,
    /cycles/i, /chemotherapy/i, /regimen/i,
    /tablet/i, /injection/i, /infusion/i,
    // Indian terms - OPD slips
    /opd\s*slip/i, /opd\s*prescription/i, /treatment\s*advice/i,
    /follow\s*up\s*advice/i, /medicines?\s*advised/i,
    /tab\s*\w+\s*\d+\s*mg/i, /cap\s*\w+/i, /inj\s*\w+/i,
  ],
  "lab-report": [
    /cbc/i, /complete\s*blood/i, /hemoglobin/i,
    /creatinine/i, /bilirubin/i, /sgot/i, /sgpt/i,
    /reference\s*range/i, /wbc/i, /platelet/i,
    /lft/i, /kft/i, /rft/i, /liver\s*function/i,
    /tumor\s*marker/i, /cea/i, /ca\s*19/i, /ca\s*125/i, /afp/i,
    // Indian terms
    /tlc/i, /dlc/i, /esr/i, /hba1c/i, /tsh/i,
    /lipid\s*profile/i, /blood\s*sugar/i,
  ],
  "clinical-notes": [
    /consultation/i, /chief\s*complaint/i, /history/i,
    /physical\s*exam/i, /assessment/i, /plan/i,
    /opd/i, /follow\s*up/i,
    // Indian terms
    /k\/c\/o/i, /c\/o/i, /h\/o/i, /o\/e/i,
    /clinical\s*notes/i, /case\s*summary/i,
  ],
  "discharge-summary": [
    /discharge/i, /admission/i, /hospital\s*stay/i,
    /diagnosis\s*at\s*discharge/i, /condition\s*at\s*discharge/i,
    // Indian terms
    /ipd\s*discharge/i, /indoor\s*summary/i, /case\s*sheet/i,
    /final\s*diagnosis/i, /treatment\s*given/i,
  ],
  "surgical-notes": [
    /operative/i, /surgery/i, /procedure/i,
    /incision/i, /resection/i, /anastomosis/i,
    /intraoperative/i, /surgeon/i,
    // Indian terms
    /mrm/i, /bcs/i, /wle/i, /slnb/i, /alnd/i,
    /tah-?bso/i, /lar/i, /apr/i, /whipple/i,
    /operative\s*notes/i, /ot\s*notes/i,
  ],
  unknown: [],
};

// Heuristic classification (fast, runs first)
function classifyByPatterns(text: string): { type: DocumentType; confidence: number } {
  const scores: Record<DocumentType, number> = {
    pathology: 0,
    radiology: 0,
    genomics: 0,
    prescription: 0,
    "lab-report": 0,
    "clinical-notes": 0,
    "discharge-summary": 0,
    "surgical-notes": 0,
    unknown: 0,
  };

  const normalizedText = text.toLowerCase();

  for (const [docType, patterns] of Object.entries(DOCUMENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        scores[docType as DocumentType] += 1;
      }
    }
  }

  // Find best match
  let bestType: DocumentType = "unknown";
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentType;
    }
  }

  // Calculate confidence (0-1)
  const maxPossible = DOCUMENT_PATTERNS[bestType]?.length || 1;
  const confidence = bestScore > 0 ? Math.min(bestScore / (maxPossible * 0.3), 1) : 0;

  return { type: bestType, confidence };
}

// Extract text from image using Gemini Vision
async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: `Extract ALL text from this medical document image. 
Include headers, body text, tables, values, and any handwritten notes if legible.
Preserve the structure and formatting as much as possible.
If it's a scan/image of a document, transcribe everything you can read.
Output ONLY the extracted text, nothing else.`,
      },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Gemini OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

// Classify document using Gemini (for ambiguous cases)
async function classifyWithGemini(text: string): Promise<{ type: DocumentType; confidence: number }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Classify this medical document into ONE of these categories:
- pathology (biopsy, histopathology, IHC reports)
- radiology (CT, MRI, PET, X-ray, ultrasound reports)
- genomics (NGS, mutation testing, molecular reports)
- prescription (treatment plans, drug orders, chemotherapy regimens)
- lab-report (blood tests, biochemistry, tumor markers)
- clinical-notes (consultation notes, follow-up notes)
- discharge-summary (hospital discharge summaries)
- surgical-notes (operative notes, surgery reports)
- unknown (if not a medical document)

Document text (first 3000 chars):
${text.slice(0, 3000)}

Respond with ONLY a JSON object: {"type": "category_name", "confidence": 0.0-1.0}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type as DocumentType,
        confidence: Math.min(Math.max(parsed.confidence, 0), 1),
      };
    }
  } catch (error) {
    console.error("Gemini classification error:", error);
  }

  return { type: "unknown", confidence: 0.3 };
}

// Extract clinical data from document text
async function extractClinicalData(
  text: string,
  docType: DocumentType
): Promise<ExtractedClinicalData> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const extractionPrompts: Record<DocumentType, string> = {
      pathology: `Extract from this PATHOLOGY report:
- histology: cancer type/subtype
- grade: tumor grade (1-3 or well/moderate/poorly differentiated)
- margins: surgical margins status if mentioned
- ihcMarkers: IHC markers (ER, PR, HER2, Ki-67, PD-L1, etc.) as key-value pairs
- date: report date
- institution: hospital/lab name`,

      radiology: `Extract from this RADIOLOGY report:
- findings: list of key findings (tumors, nodes, metastases)
- measurements: tumor/lesion sizes as [{site, size}]
- impression: radiologist's impression/conclusion
- date: scan date
- institution: hospital name`,

      genomics: `Extract from this GENOMIC/MOLECULAR report:
- mutations: list of mutations as [{gene, variant, actionable: true/false}]
- msiStatus: MSI status (MSI-H, MSI-L, MSS)
- tmb: tumor mutational burden (number)
- date: report date
- institution: lab name`,

      "lab-report": `Extract from this LAB report:
- labValues: test results as [{test, value, unit, flag: "high"/"low"/null}]
- date: report date
- institution: lab name`,

      prescription: `Extract from this PRESCRIPTION:
- rawText: summarize the treatment plan
- date: prescription date
- institution: prescribing hospital`,

      "clinical-notes": `Extract from this CLINICAL NOTE:
- rawText: summarize key clinical findings
- date: consultation date
- institution: hospital name`,

      "discharge-summary": `Extract from this DISCHARGE SUMMARY:
- rawText: summarize diagnosis and treatment during stay
- date: discharge date
- institution: hospital name`,

      "surgical-notes": `Extract from this SURGICAL NOTE:
- rawText: summarize procedure and findings
- margins: surgical margins if mentioned
- date: surgery date
- institution: hospital name`,

      unknown: `Extract any medical information you can find:
- rawText: summary of document content
- date: any date mentioned
- institution: any hospital/lab mentioned`,
    };

    const prompt = `${extractionPrompts[docType]}

Document text:
${text.slice(0, 6000)}

Respond with ONLY a JSON object containing the extracted fields. Use null for missing fields.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        rawText: text.slice(0, 2000), // Store first 2000 chars
      };
    }
  } catch (error) {
    console.error("Data extraction error:", error);
  }

  return {
    rawText: text.slice(0, 2000),
  };
}

// Redact PII from text before sending to LLM
function redactPII(text: string): string {
  return text
    // Indian names (simple pattern)
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
    // Phone numbers
    .replace(/\b\d{10,12}\b/g, '[PHONE]')
    // MRN patterns
    .replace(/\b[A-Z]{2,4}\d{6,10}\b/gi, '[MRN]')
    // Dates (keep for clinical relevance but note them)
    // .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, '[DATE]')
    // Aadhaar
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]')
    // Email
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, '[EMAIL]')
    // Address patterns
    .replace(/\b\d{6}\b/g, '[PINCODE]');
}

export async function POST(request: NextRequest) {
  const authError = verifyApiAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      fileBase64,
      mimeType,
      filename,
      documentTypeOverride
    } = body;

    if (!fileBase64 || !mimeType || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: fileBase64, mimeType, filename" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB base64
    if (fileBase64.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Check if Gemini API key is available
    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured (checked GEMINI_API_KEY, GOOGLE_AI_API_KEY, GOOGLE_API_KEY)" },
        { status: 500 }
      );
    }

    // ============================================================
    // V5: CHECK CACHE FIRST
    // ============================================================
    const cacheKey = await generateCacheKey(fileBase64, mimeType);
    const cachedResult = getCachedResult(cacheKey);
    
    if (cachedResult && !documentTypeOverride) {
      // Cache hit! Return cached result
      console.log(`[Cache HIT] ${filename} - saved ${cachedResult.processingTimeMs}ms`);
      
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return NextResponse.json({
        documentId,
        classifiedType: cachedResult.classifiedType,
        confidence: cachedResult.confidence,
        extractedData: cachedResult.extractedData,
        warnings: cachedResult.warnings,
        textLength: cachedResult.textLength,
        // Cache metadata
        cached: true,
        cacheHit: 'memory',
        processingTimeMs: Date.now() - startTime,
        savedTimeMs: cachedResult.processingTimeMs,
      });
    }
    
    console.log(`[Cache MISS] ${filename} - processing with Gemini`);
    // ============================================================

    let extractedText = "";
    const warnings: string[] = [];

    // Step 1: Extract text
    if (mimeType === "application/pdf") {
      // For PDFs, we need to use vision model as well (Gemini can handle PDF pages as images)
      // In production, you might want to use a proper PDF text extraction library
      extractedText = await extractTextFromImage(fileBase64, mimeType);
    } else if (mimeType.startsWith("image/")) {
      extractedText = await extractTextFromImage(fileBase64, mimeType);
    } else {
      warnings.push("Unsupported file type for OCR");
    }

    if (!extractedText || extractedText.length < 50) {
      warnings.push("Limited text extracted - document may be unclear or handwritten");
    }

    // Step 2: Redact PII
    const redactedText = redactPII(extractedText);

    // Step 3: Classify document
    let classifiedType: DocumentType;
    let confidence: number;

    if (documentTypeOverride) {
      // User manually specified type
      classifiedType = documentTypeOverride;
      confidence = 1.0;
    } else {
      // Try heuristic first
      const heuristicResult = classifyByPatterns(redactedText);
      
      if (heuristicResult.confidence >= 0.6) {
        classifiedType = heuristicResult.type;
        confidence = heuristicResult.confidence;
      } else {
        // Use Gemini for ambiguous cases
        const geminiResult = await classifyWithGemini(redactedText);
        classifiedType = geminiResult.type;
        confidence = geminiResult.confidence;
        
        if (geminiResult.confidence < 0.5) {
          warnings.push("Document type uncertain - please verify classification");
        }
      }
    }

    // Step 4: Extract clinical data
    let extractedData = await extractClinicalData(redactedText, classifiedType);

    // ============================================================
    // V5.2: BUILD ENHANCED CLASSIFICATION WITH COMPOSITE HANDLING
    // ============================================================
    const classification = buildDocumentClassification(
      classifiedType,
      confidence,
      redactedText
    );
    
    // If composite document, merge extracted data from sections
    if (classification.isComposite && classification.extractedSections) {
      extractedData = mergeExtractedData(extractedData, classification.extractedSections);
      
      // Add note about composite nature
      warnings.push(
        `Composite document detected: Contains ${classification.containsContent.length} types of clinical information`
      );
      
      console.log(`[Composite] ${filename} contains: ${classification.containsContent.join(', ')}`);
    }
    // ============================================================

    // Generate document ID
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const processingTimeMs = Date.now() - startTime;

    // ============================================================
    // V5: CACHE THE RESULT
    // ============================================================
    if (!documentTypeOverride) {
      cacheResult(cacheKey, {
        classifiedType,
        confidence,
        extractedData,
        textLength: extractedText.length,
        warnings,
      }, processingTimeMs);
      console.log(`[Cache STORE] ${filename} - ${processingTimeMs}ms`);
    }
    // ============================================================

    return NextResponse.json({
      documentId,
      classifiedType,
      confidence,
      extractedData,
      warnings,
      textLength: extractedText.length,
      // V5.2: Enhanced classification
      classification,
      isComposite: classification.isComposite,
      containsContent: classification.containsContent,
      // Cache metadata
      cached: false,
      cacheHit: 'miss',
      processingTimeMs,
    });

  } catch (error) {
    console.error("Document processing error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
