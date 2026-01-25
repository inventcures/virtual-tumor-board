/**
 * Full Pipeline Validation Script
 * 
 * Tests the entire Virtual Tumor Board flow:
 * 1. Document parsing with Gemini OCR
 * 2. Document classification
 * 3. Clinical data extraction
 * 4. AI Agent deliberation simulation
 * 5. PDF report generation
 * 
 * Usage: GEMINI_API_KEY=xxx npx tsx scripts/validate_full_pipeline.ts /path/to/docs/folder
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

// ============================================================================
// TYPES
// ============================================================================

type DocumentType = 
  | 'pathology' | 'radiology' | 'genomics' | 'prescription'
  | 'lab-report' | 'clinical-notes' | 'discharge-summary' | 'surgical-notes' | 'unknown';

interface ExtractedData {
  histology?: string;
  grade?: string;
  margins?: string;
  ihcMarkers?: Record<string, string>;
  findings?: string[];
  measurements?: { site: string; size: string }[];
  impression?: string;
  mutations?: { gene: string; variant: string; actionable: boolean }[];
  msiStatus?: string;
  tmb?: number;
  labValues?: { test: string; value: string; unit: string; flag?: string }[];
  rawText?: string;
  date?: string;
  institution?: string;
}

interface ProcessedDocument {
  filename: string;
  type: DocumentType;
  confidence: number;
  extractedText: string;
  extractedData: ExtractedData;
}

interface AgentResponse {
  agentId: string;
  name: string;
  specialty: string;
  response: string;
}

// ============================================================================
// DOCUMENT PROCESSING
// ============================================================================

async function callGeminiAPI(prompt: string, imageBase64?: string, mimeType?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const parts: any[] = [];
  
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    });
  }
  
  parts.push({ text: prompt });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
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

async function extractTextFromDocument(base64Data: string, mimeType: string): Promise<string> {
  const prompt = `Extract ALL text from this medical document. Include headers, tables, values, and any handwritten notes. Output ONLY the extracted text.`;
  return callGeminiAPI(prompt, base64Data, mimeType);
}

function classifyByFilename(filename: string): { type: DocumentType; confidence: number } {
  const lower = filename.toLowerCase();
  if (/histopath|fnac|biopsy|pathology/i.test(lower)) return { type: 'pathology', confidence: 0.9 };
  if (/pet-?ct|mammogram|ct|mri|radiology|scan/i.test(lower)) return { type: 'radiology', confidence: 0.85 };
  if (/er.?pr|her2|ki67|ihc/i.test(lower)) return { type: 'pathology', confidence: 0.9 };
  if (/discharge/i.test(lower)) return { type: 'discharge-summary', confidence: 0.9 };
  if (/surgery|opd|operative/i.test(lower)) return { type: 'surgical-notes', confidence: 0.8 };
  if (/genomic|ngs|mutation/i.test(lower)) return { type: 'genomics', confidence: 0.85 };
  return { type: 'unknown', confidence: 0.3 };
}

async function extractClinicalData(text: string, docType: DocumentType): Promise<ExtractedData> {
  const prompts: Record<DocumentType, string> = {
    pathology: `Extract from this PATHOLOGY report as JSON:
- histology: cancer type
- grade: tumor grade
- margins: surgical margins
- ihcMarkers: object with ER, PR, HER2, Ki-67, etc.
- date, institution`,
    radiology: `Extract from this RADIOLOGY report as JSON:
- findings: array of key findings
- measurements: array of {site, size}
- impression: radiologist conclusion
- date, institution`,
    genomics: `Extract from this GENOMIC report as JSON:
- mutations: array of {gene, variant, actionable}
- msiStatus, tmb
- date, institution`,
    'lab-report': `Extract from this LAB report as JSON:
- labValues: array of {test, value, unit, flag}
- date, institution`,
    prescription: `Extract: medications, doses, date`,
    'clinical-notes': `Extract: diagnosis, summary, date`,
    'discharge-summary': `Extract: diagnosis, procedures, date`,
    'surgical-notes': `Extract: procedure, findings, margins, date`,
    unknown: `Extract any medical info as JSON`,
  };

  const prompt = `${prompts[docType]}

Document text (first 6000 chars):
${text.slice(0, 6000)}

Respond with ONLY valid JSON. No markdown.`;

  const response = await callGeminiAPI(prompt);
  
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { rawText: text.slice(0, 500) };
  }
}

async function processDocument(filePath: string): Promise<ProcessedDocument> {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);
  
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const ext = path.extname(filename).toLowerCase();
  const mimeType = ext === '.pdf' ? 'application/pdf' : 
                   ext === '.png' ? 'image/png' : 'image/jpeg';
  
  console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(1)} KB`);
  
  // Step 1: OCR
  console.log(`   🔍 Running OCR...`);
  const extractedText = await extractTextFromDocument(base64Data, mimeType);
  console.log(`   ✅ Extracted ${extractedText.length} chars`);
  
  // Step 2: Classify
  const classification = classifyByFilename(filename);
  console.log(`   📁 Type: ${classification.type} (${(classification.confidence * 100).toFixed(0)}%)`);
  
  // Step 3: Extract clinical data
  console.log(`   🧠 Extracting clinical data...`);
  const extractedData = await extractClinicalData(extractedText, classification.type);
  
  if (extractedData.histology) console.log(`   → Histology: ${extractedData.histology}`);
  if (extractedData.ihcMarkers) console.log(`   → IHC: ${JSON.stringify(extractedData.ihcMarkers)}`);
  if (extractedData.findings) console.log(`   → Findings: ${extractedData.findings.length} items`);
  
  return {
    filename,
    type: classification.type,
    confidence: classification.confidence,
    extractedText,
    extractedData,
  };
}

// ============================================================================
// AI AGENT SIMULATION
// ============================================================================

const AGENTS = [
  { id: 'surgical-oncologist', name: 'Dr. Shalya', specialty: 'Surgical Oncology' },
  { id: 'medical-oncologist', name: 'Dr. Chikitsa', specialty: 'Medical Oncology' },
  { id: 'radiation-oncologist', name: 'Dr. Kirann', specialty: 'Radiation Oncology' },
  { id: 'pathologist', name: 'Dr. Marga', specialty: 'Pathology' },
  { id: 'radiologist', name: 'Dr. Chitran', specialty: 'Onco-Radiology' },
  { id: 'geneticist', name: 'Dr. Anuvamsha', specialty: 'Genetics' },
  { id: 'palliative-care', name: 'Dr. Shanti', specialty: 'Palliative Care' },
];

function buildCaseContext(documents: ProcessedDocument[], cancerSite: string): string {
  let context = `# Cancer Case Summary\n\n**Cancer Site:** ${cancerSite}\n\n`;
  
  // Group by document type
  const byType: Record<string, ExtractedData[]> = {};
  for (const doc of documents) {
    if (!byType[doc.type]) byType[doc.type] = [];
    byType[doc.type].push(doc.extractedData);
  }
  
  for (const [type, dataList] of Object.entries(byType)) {
    context += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Reports\n\n`;
    for (const data of dataList) {
      if (data.histology) context += `- **Histology:** ${data.histology}\n`;
      if (data.grade) context += `- **Grade:** ${data.grade}\n`;
      if (data.ihcMarkers) {
        context += `- **IHC Markers:**\n`;
        for (const [k, v] of Object.entries(data.ihcMarkers)) {
          context += `  - ${k}: ${v}\n`;
        }
      }
      if (data.findings) {
        context += `- **Findings:**\n`;
        for (const f of data.findings.slice(0, 5)) {
          context += `  - ${f}\n`;
        }
      }
      if (data.impression) context += `- **Impression:** ${data.impression}\n`;
      context += '\n';
    }
  }
  
  return context;
}

async function generateAgentResponse(agent: typeof AGENTS[0], caseContext: string): Promise<AgentResponse> {
  console.log(`   🤖 ${agent.name} (${agent.specialty})...`);
  
  const prompt = `You are ${agent.name}, a ${agent.specialty} specialist on a tumor board.

Based on this case:
${caseContext}

Provide a 2-3 paragraph assessment from your specialty perspective. Be specific and cite relevant guidelines (NCCN, ESMO). Consider Indian healthcare context.`;

  const response = await callGeminiAPI(prompt);
  
  return {
    agentId: agent.id,
    name: agent.name,
    specialty: agent.specialty,
    response,
  };
}

async function generateConsensus(caseContext: string, agentResponses: AgentResponse[]): Promise<string> {
  console.log(`   📋 Generating consensus...`);
  
  const agentSummaries = agentResponses
    .map(a => `## ${a.name} (${a.specialty}):\n${a.response}`)
    .join('\n\n');
  
  const prompt = `You are the Tumor Board Moderator. Synthesize these specialist opinions into a consensus:

${caseContext}

Specialist Opinions:
${agentSummaries}

Provide a structured consensus with:
1. **Agreed Recommendations** (what all specialists agree on)
2. **Treatment Plan** (step by step)
3. **Pending Tests/Information**
4. **Follow-up Plan**

Include Indian healthcare context (drug availability, costs, PMJAY coverage).`;

  return callGeminiAPI(prompt);
}

// ============================================================================
// PDF GENERATION
// ============================================================================

const STAGING_EXPLANATIONS: Record<string, string> = {
  'I': 'Stage I means the cancer is small and only in one area. This is early-stage cancer with excellent treatment outcomes.',
  'II': 'Stage II means the cancer is larger but has not spread to distant parts. Good treatment options available.',
  'III': 'Stage III means locally advanced cancer that has spread to nearby lymph nodes. Multiple treatment approaches typically used.',
  'IV': 'Stage IV means the cancer has spread to distant organs (metastatic). Many treatments can help control the disease.',
  'unknown': 'The exact stage requires specific tests. Your doctor will discuss staging once results are available.',
};

function getStagingExplanation(stage?: string): string {
  if (!stage) return STAGING_EXPLANATIONS['unknown'];
  const s = stage.toUpperCase();
  if (s.includes('IV') || s.includes('4')) return STAGING_EXPLANATIONS['IV'];
  if (s.includes('III') || s.includes('3')) return STAGING_EXPLANATIONS['III'];
  if (s.includes('II') || s.includes('2')) return STAGING_EXPLANATIONS['II'];
  if (s.includes('I') || s.includes('1')) return STAGING_EXPLANATIONS['I'];
  return STAGING_EXPLANATIONS['unknown'];
}

function generatePDF(
  consensus: string,
  agentResponses: AgentResponse[],
  caseInfo: { cancerSite: string; stage?: string; documentCount: number },
  outputPath: string
) {
  console.log(`\n📄 Generating PDF report...`);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // === HEADER ===
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Virtual Tumor Board Report', margin, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Generated: ${date}`, margin, 23);
  doc.text('AI-Assisted Multi-Disciplinary Team Analysis', margin, 29);
  
  yPos = 45;

  // === ORGAN DIAGRAM (simplified) ===
  const diagramX = pageWidth - margin - 50;
  const diagramY = yPos;
  doc.setFillColor(252, 228, 236);
  doc.setDrawColor(248, 187, 217);
  doc.ellipse(diagramX + 25, diagramY + 20, 20, 15, 'FD');
  
  // Tumor marker
  doc.setFillColor(239, 83, 80);
  doc.circle(diagramX + 18, diagramY + 18, 4, 'F');
  doc.setDrawColor(183, 28, 28);
  doc.line(diagramX + 12, diagramY + 18, diagramX + 24, diagramY + 18);
  doc.line(diagramX + 18, diagramY + 12, diagramX + 18, diagramY + 24);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(caseInfo.cancerSite, diagramX + 25, diagramY + 45, { align: 'center' });

  // === CASE INFO ===
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Case Information', margin, yPos + 5);
  
  yPos += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cancer Site: ${caseInfo.cancerSite}`, margin, yPos);
  yPos += 6;
  doc.text(`Stage: ${caseInfo.stage || 'Not determined'}`, margin, yPos);
  yPos += 6;
  doc.text(`Documents Analyzed: ${caseInfo.documentCount}`, margin, yPos);
  
  yPos = Math.max(yPos + 10, diagramY + 55);

  // === STAGING EXPLANATION ===
  const stagingExp = getStagingExplanation(caseInfo.stage);
  
  doc.setFillColor(255, 243, 224);
  doc.setDrawColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, 'FD');
  
  doc.setFillColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, 8, 3, 3, 'F');
  doc.rect(margin, yPos + 5, contentWidth, 3, 'F');
  
  doc.setTextColor(100, 60, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('What Does This Stage Mean?', margin + 5, yPos + 5.5);
  
  doc.setTextColor(80, 60, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const expLines = doc.splitTextToSize(stagingExp, contentWidth - 10);
  doc.text(expLines, margin + 5, yPos + 14);
  
  yPos += 35;

  // === CONSENSUS ===
  doc.setFillColor(237, 233, 254);
  doc.setDrawColor(139, 92, 246);
  doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD');
  
  doc.setTextColor(67, 56, 202);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TUMOR BOARD CONSENSUS', margin + 5, yPos + 7);
  
  yPos += 15;
  
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const cleanConsensus = consensus.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
  const consensusLines = doc.splitTextToSize(cleanConsensus, contentWidth);
  
  // Handle page breaks
  const lineHeight = 4.5;
  for (let i = 0; i < consensusLines.length; i++) {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(consensusLines[i], margin, yPos);
    yPos += lineHeight;
  }
  
  yPos += 10;

  // === SPECIALIST OPINIONS ===
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD');
  
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SPECIALIST OPINIONS SUMMARY', margin + 5, yPos + 7);
  
  yPos += 15;
  
  for (const agent of agentResponses) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFillColor(240, 240, 245);
    doc.roundedRect(margin, yPos, contentWidth, 7, 1, 1, 'F');
    
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${agent.name} - ${agent.specialty}`, margin + 3, yPos + 5);
    
    yPos += 10;
    
    // Summary (first 400 chars)
    const summary = agent.response.slice(0, 400).replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '');
    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const summaryLines = doc.splitTextToSize(summary + '...', contentWidth - 6);
    doc.text(summaryLines.slice(0, 6), margin + 3, yPos);
    yPos += Math.min(summaryLines.length, 6) * 4 + 8;
  }

  // === DISCLAIMER ===
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }
  
  yPos = Math.max(yPos, pageHeight - 40);
  
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'FD');
  
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT DISCLAIMER', margin + 5, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const disclaimer = 'This AI-generated report is for INFORMATIONAL PURPOSES ONLY and does NOT constitute medical advice. Always consult qualified healthcare professionals before making treatment decisions.';
  const discLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(discLines, margin + 5, yPos + 12);
  
  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('Virtual Tumor Board | https://virtual-tumor-board-production.up.railway.app', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save
  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfOutput));
  console.log(`   ✅ PDF saved: ${outputPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const folderPath = process.argv[2];
  
  if (!folderPath) {
    console.error('Usage: GEMINI_API_KEY=xxx npx tsx scripts/validate_full_pipeline.ts /path/to/docs');
    process.exit(1);
  }
  
  console.log('═'.repeat(70));
  console.log('🏥 VIRTUAL TUMOR BOARD - FULL PIPELINE VALIDATION');
  console.log('═'.repeat(70));
  console.log(`📂 Folder: ${folderPath}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY?.slice(0, 10)}...`);
  
  // Step 1: Process all documents
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 1: DOCUMENT PROCESSING');
  console.log('─'.repeat(70));
  
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(pdf|png|jpg|jpeg)$/i.test(f))
    .map(f => path.join(folderPath, f));
  
  console.log(`Found ${files.length} documents\n`);
  
  const processedDocs: ProcessedDocument[] = [];
  for (const file of files) {
    try {
      const doc = await processDocument(file);
      processedDocs.push(doc);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }
  
  // Detect cancer site from documents
  let cancerSite = 'Unknown';
  let stage: string | undefined;
  
  for (const doc of processedDocs) {
    if (doc.extractedData.histology) {
      if (/breast|ductal|lobular/i.test(doc.extractedData.histology)) {
        cancerSite = 'Breast';
      } else if (/lung|pulmonary/i.test(doc.extractedData.histology)) {
        cancerSite = 'Lung';
      }
      // Look for stage in text
      const stageMatch = doc.extractedText.match(/stage\s*(I{1,3}V?|[1-4])/i);
      if (stageMatch) stage = stageMatch[1];
    }
  }
  
  console.log(`\n📊 Detected: ${cancerSite} cancer, Stage ${stage || 'unknown'}`);
  
  // Step 2: Build case context
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 2: BUILDING CASE CONTEXT');
  console.log('─'.repeat(70));
  
  const caseContext = buildCaseContext(processedDocs, cancerSite);
  console.log(`Case context: ${caseContext.length} characters`);
  
  // Step 3: Agent deliberation
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 3: AI AGENT DELIBERATION');
  console.log('─'.repeat(70));
  
  const agentResponses: AgentResponse[] = [];
  for (const agent of AGENTS) {
    try {
      const response = await generateAgentResponse(agent, caseContext);
      agentResponses.push(response);
      console.log(`   ✅ ${agent.name}: ${response.response.length} chars`);
    } catch (error: any) {
      console.error(`   ❌ ${agent.name}: ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Step 4: Consensus
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 4: CONSENSUS GENERATION');
  console.log('─'.repeat(70));
  
  const consensus = await generateConsensus(caseContext, agentResponses);
  console.log(`Consensus: ${consensus.length} characters`);
  
  // Step 5: PDF Generation
  console.log('\n' + '─'.repeat(70));
  console.log('STEP 5: PDF REPORT GENERATION');
  console.log('─'.repeat(70));
  
  const pdfPath = path.join(folderPath, `tumor-board-report-${Date.now()}.pdf`);
  generatePDF(consensus, agentResponses, {
    cancerSite,
    stage,
    documentCount: processedDocs.length,
  }, pdfPath);
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 PIPELINE VALIDATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Documents processed: ${processedDocs.length}`);
  console.log(`✅ Agents responded: ${agentResponses.length}/7`);
  console.log(`✅ Consensus generated: ${consensus.length} chars`);
  console.log(`✅ PDF report: ${pdfPath}`);
  console.log('═'.repeat(70));
  
  // Save JSON results too
  const jsonPath = path.join(folderPath, `pipeline-results-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({
    caseInfo: { cancerSite, stage, documentCount: processedDocs.length },
    documents: processedDocs.map(d => ({
      filename: d.filename,
      type: d.type,
      extractedData: d.extractedData,
    })),
    agentResponses: agentResponses.map(a => ({
      name: a.name,
      specialty: a.specialty,
      response: a.response.slice(0, 1000),
    })),
    consensus: consensus.slice(0, 2000),
  }, null, 2));
  console.log(`📄 JSON results: ${jsonPath}`);
}

main().catch(console.error);
