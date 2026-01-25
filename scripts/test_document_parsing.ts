/**
 * Document Parsing Validation Script
 * 
 * Tests the Gemini Flash OCR/classification API against real patient documents
 * 
 * Usage: npx ts-node scripts/test_document_parsing.ts /path/to/docs/folder
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY or GOOGLE_API_KEY environment variable not set');
  console.error('Set it with: export GEMINI_API_KEY=your_key_here');
  process.exit(1);
}

// Document types
type DocumentType = 
  | 'pathology'
  | 'radiology'
  | 'genomics'
  | 'prescription'
  | 'lab-report'
  | 'clinical-notes'
  | 'discharge-summary'
  | 'surgical-notes'
  | 'unknown';

// Heuristic classification patterns
const DOCUMENT_PATTERNS: Record<DocumentType, RegExp[]> = {
  pathology: [
    /histopath/i, /biopsy/i, /specimen/i, /microscop/i,
    /carcinoma/i, /adenoma/i, /grade\s*[1-3]/i,
    /immunohistochem/i, /ihc/i, /er\s*positive/i,
    /her2/i, /ki-?67/i, /tumor\s*cells/i, /malignant/i,
    /pathology\s*report/i, /gross\s*description/i, /fnac/i,
  ],
  radiology: [
    /ct\s*scan/i, /mri/i, /pet\s*scan/i, /x-?ray/i,
    /ultrasound/i, /impression:/i, /findings:/i,
    /hounsfield/i, /suv/i, /contrast/i, /radiology/i,
    /axial/i, /coronal/i, /sagittal/i, /mass\s*measuring/i,
    /lymph\s*node/i, /metast/i, /mammogra/i, /petct/i,
  ],
  genomics: [
    /ngs/i, /next\s*gen/i, /sequencing/i, /mutation/i,
    /variant/i, /egfr/i, /kras/i, /braf/i, /foundation/i,
    /guardant/i, /msi-?h/i, /tmb/i, /molecular/i,
    /exon/i, /deletion/i, /amplification/i,
  ],
  prescription: [
    /rx/i, /prescription/i, /dosage/i, /mg\/m2/i,
    /cycles/i, /chemotherapy/i, /regimen/i,
    /tablet/i, /injection/i, /infusion/i,
  ],
  "lab-report": [
    /cbc/i, /complete\s*blood/i, /hemoglobin/i,
    /creatinine/i, /bilirubin/i, /sgot/i, /sgpt/i,
    /reference\s*range/i, /wbc/i, /platelet/i,
    /lft/i, /kft/i, /rft/i, /liver\s*function/i,
    /tumor\s*marker/i, /cea/i, /ca\s*19/i, /ca\s*125/i, /afp/i,
  ],
  "clinical-notes": [
    /consultation/i, /chief\s*complaint/i, /history/i,
    /physical\s*exam/i, /assessment/i, /plan/i,
    /opd/i, /follow\s*up/i,
  ],
  "discharge-summary": [
    /discharge/i, /admission/i, /hospital\s*stay/i,
    /diagnosis\s*at\s*discharge/i, /condition\s*at\s*discharge/i,
  ],
  "surgical-notes": [
    /operative/i, /surgery/i, /procedure/i,
    /incision/i, /resection/i, /anastomosis/i,
    /intraoperative/i, /surgeon/i,
  ],
  unknown: [],
};

// Classify by filename
function classifyByFilename(filename: string): { type: DocumentType; confidence: number } {
  const lower = filename.toLowerCase();
  
  // Filename-specific patterns
  if (/histopath|fnac|biopsy/i.test(lower)) return { type: 'pathology', confidence: 0.9 };
  if (/pet-?ct|mammogram|ct|mri|radiology/i.test(lower)) return { type: 'radiology', confidence: 0.85 };
  if (/er.?pr|her2|ki67|ihc/i.test(lower)) return { type: 'pathology', confidence: 0.9 };
  if (/discharge/i.test(lower)) return { type: 'discharge-summary', confidence: 0.9 };
  if (/surgery|opd/i.test(lower)) return { type: 'surgical-notes', confidence: 0.8 };
  if (/prescription|rx/i.test(lower)) return { type: 'prescription', confidence: 0.85 };
  
  return { type: 'unknown', confidence: 0.3 };
}

// Classify by text content
function classifyByContent(text: string): { type: DocumentType; confidence: number } {
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

  let bestType: DocumentType = 'unknown';
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentType;
    }
  }

  const maxPossible = DOCUMENT_PATTERNS[bestType]?.length || 1;
  const confidence = bestScore > 0 ? Math.min(bestScore / (maxPossible * 0.3), 1) : 0;

  return { type: bestType, confidence };
}

// Call Gemini API for OCR
async function extractTextWithGemini(base64Data: string, mimeType: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract ALL text from this medical document image/PDF. 
Include headers, body text, tables, values, and any handwritten notes if legible.
Preserve the structure and formatting as much as possible.
If it's a scanned document, transcribe everything you can read.
Output ONLY the extracted text, nothing else.`,
          },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Extract clinical data with Gemini
async function extractClinicalData(text: string, docType: DocumentType): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const extractionPrompts: Record<DocumentType, string> = {
    pathology: `Extract from this PATHOLOGY report:
- histology: cancer type/subtype (e.g., "Invasive Ductal Carcinoma")
- grade: tumor grade (1-3 or well/moderate/poorly differentiated)
- margins: surgical margins status if mentioned
- ihcMarkers: IHC markers as key-value pairs (ER, PR, HER2, Ki-67, etc.)
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
- date: report date`,

    "lab-report": `Extract from this LAB report:
- labValues: test results as [{test, value, unit, flag: "high"/"low"/null}]
- date: report date`,

    prescription: `Extract from this PRESCRIPTION:
- medications: list of medications with doses
- date: prescription date`,

    "clinical-notes": `Extract from this CLINICAL NOTE:
- diagnosis: primary diagnosis
- summary: key clinical findings
- date: consultation date`,

    "discharge-summary": `Extract from this DISCHARGE SUMMARY:
- diagnosis: diagnosis at discharge
- procedures: procedures performed
- date: discharge date`,

    "surgical-notes": `Extract from this SURGICAL NOTE:
- procedure: name of surgery
- findings: intraoperative findings
- margins: surgical margins if mentioned
- date: surgery date`,

    unknown: `Extract any medical information you can find:
- summary: document summary
- date: any date mentioned`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${extractionPrompts[docType]}

Document text:
${text.slice(0, 8000)}

Respond with ONLY a valid JSON object containing the extracted fields. Use null for missing fields. Do not include any explanation or markdown formatting.`,
        }],
      }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Try to parse JSON from response
  try {
    // Remove markdown code blocks if present
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.warn('  ⚠️  Failed to parse JSON response:', responseText.slice(0, 200));
    return { rawText: text.slice(0, 500) };
  }
}

// Process a single document
async function processDocument(filePath: string): Promise<{
  filename: string;
  filenameClassification: { type: DocumentType; confidence: number };
  contentClassification: { type: DocumentType; confidence: number };
  extractedText: string;
  extractedTextLength: number;
  extractedData: any;
  error?: string;
}> {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);
  
  // Step 1: Classify by filename
  const filenameClassification = classifyByFilename(filename);
  console.log(`  📁 Filename classification: ${filenameClassification.type} (${(filenameClassification.confidence * 100).toFixed(0)}%)`);
  
  // Step 2: Read file and convert to base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const ext = path.extname(filename).toLowerCase();
  const mimeType = ext === '.pdf' ? 'application/pdf' : 
                   ext === '.png' ? 'image/png' :
                   ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/pdf';
  
  console.log(`  📦 File size: ${(fileBuffer.length / 1024).toFixed(1)} KB, MIME: ${mimeType}`);
  
  try {
    // Step 3: OCR with Gemini
    console.log(`  🔍 Running Gemini OCR...`);
    const extractedText = await extractTextWithGemini(base64Data, mimeType);
    console.log(`  ✅ Extracted ${extractedText.length} characters`);
    
    if (extractedText.length < 100) {
      console.log(`  ⚠️  Very little text extracted! First 200 chars:`);
      console.log(`     "${extractedText.slice(0, 200)}"`);
    }
    
    // Step 4: Classify by content
    const contentClassification = classifyByContent(extractedText);
    console.log(`  📝 Content classification: ${contentClassification.type} (${(contentClassification.confidence * 100).toFixed(0)}%)`);
    
    // Step 5: Extract clinical data
    const finalType = contentClassification.confidence > filenameClassification.confidence 
      ? contentClassification.type 
      : filenameClassification.type;
    
    console.log(`  🧠 Extracting clinical data as: ${finalType}`);
    const extractedData = await extractClinicalData(extractedText, finalType);
    
    // Show key extracted fields
    if (extractedData.histology) console.log(`     → Histology: ${extractedData.histology}`);
    if (extractedData.ihcMarkers) console.log(`     → IHC: ${JSON.stringify(extractedData.ihcMarkers)}`);
    if (extractedData.findings) console.log(`     → Findings: ${extractedData.findings.length} items`);
    if (extractedData.impression) console.log(`     → Impression: ${extractedData.impression.slice(0, 100)}...`);
    if (extractedData.labValues) console.log(`     → Lab values: ${extractedData.labValues.length} items`);
    
    return {
      filename,
      filenameClassification,
      contentClassification,
      extractedText: extractedText.slice(0, 1000), // Truncate for output
      extractedTextLength: extractedText.length,
      extractedData,
    };
    
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return {
      filename,
      filenameClassification,
      contentClassification: { type: 'unknown', confidence: 0 },
      extractedText: '',
      extractedTextLength: 0,
      extractedData: {},
      error: error.message,
    };
  }
}

// Main function
async function main() {
  const folderPath = process.argv[2];
  
  if (!folderPath) {
    console.error('Usage: npx ts-node scripts/test_document_parsing.ts /path/to/docs/folder');
    process.exit(1);
  }
  
  if (!fs.existsSync(folderPath)) {
    console.error(`Folder not found: ${folderPath}`);
    process.exit(1);
  }
  
  console.log('═'.repeat(60));
  console.log('🔬 DOCUMENT PARSING VALIDATION SCRIPT');
  console.log('═'.repeat(60));
  console.log(`📂 Folder: ${folderPath}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY?.slice(0, 10)}...`);
  
  // Get all PDF and image files
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(pdf|png|jpg|jpeg)$/i.test(f))
    .map(f => path.join(folderPath, f));
  
  console.log(`📄 Found ${files.length} documents\n`);
  
  const results: any[] = [];
  
  for (const file of files) {
    const result = await processDocument(file);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n🚨 FAILED DOCUMENTS:');
    for (const f of failed) {
      console.log(`   - ${f.filename}: ${f.error}`);
    }
  }
  
  console.log('\n📋 CLASSIFICATION RESULTS:');
  const byType: Record<string, string[]> = {};
  for (const r of results) {
    const type = r.contentClassification?.type || r.filenameClassification?.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(r.filename);
  }
  
  for (const [type, files] of Object.entries(byType)) {
    console.log(`   ${type}: ${files.length} docs`);
    for (const f of files) {
      console.log(`      - ${f}`);
    }
  }
  
  console.log('\n📄 EXTRACTION QUALITY:');
  for (const r of successful) {
    const hasGoodData = r.extractedData && (
      r.extractedData.histology ||
      r.extractedData.ihcMarkers ||
      r.extractedData.findings ||
      r.extractedData.labValues ||
      r.extractedData.impression
    );
    const status = hasGoodData ? '✅' : '⚠️';
    console.log(`   ${status} ${r.filename}: ${r.extractedTextLength} chars extracted`);
    if (r.extractedData.histology) console.log(`      Histology: ${r.extractedData.histology}`);
    if (r.extractedData.ihcMarkers) console.log(`      IHC: ${JSON.stringify(r.extractedData.ihcMarkers)}`);
  }
  
  // Save full results to JSON
  const outputPath = path.join(folderPath, 'parsing_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${outputPath}`);
}

main().catch(console.error);
