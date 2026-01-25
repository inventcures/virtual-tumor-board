/**
 * PDF Report Generator for Virtual Tumor Board
 * 
 * Generates a professional PDF with:
 * - Organ diagram with tumor location
 * - Staging information with layman explanation
 * - Consensus summary
 * - Specialist opinions
 */

import { jsPDF } from 'jspdf';

// Organ SVG paths (simplified for PDF rendering)
const ORGAN_DIAGRAMS: Record<string, {
  name: string;
  viewBox: string;
  paths: { d: string; fill: string; stroke?: string }[];
  tumorLocation?: { x: number; y: number };
}> = {
  'breast': {
    name: 'Breast',
    viewBox: '0 0 200 200',
    paths: [
      // Chest outline
      { d: 'M 40 60 Q 100 40 160 60 L 160 180 L 40 180 Z', fill: '#fce4ec', stroke: '#f8bbd9' },
      // Left breast
      { d: 'M 50 80 Q 30 120 50 150 Q 80 170 100 150 Q 120 120 100 80 Q 80 60 50 80', fill: '#ffcdd2', stroke: '#ef9a9a' },
      // Right breast  
      { d: 'M 100 80 Q 80 120 100 150 Q 120 170 150 150 Q 170 120 150 80 Q 120 60 100 80', fill: '#ffcdd2', stroke: '#ef9a9a' },
      // Nipples
      { d: 'M 70 115 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0', fill: '#d7ccc8' },
      { d: 'M 130 115 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0', fill: '#d7ccc8' },
    ],
    tumorLocation: { x: 55, y: 95 }, // Upper outer quadrant left breast
  },
  'lung': {
    name: 'Lungs',
    viewBox: '0 0 200 200',
    paths: [
      // Trachea
      { d: 'M 95 20 L 95 60 L 105 60 L 105 20 Z', fill: '#e3f2fd', stroke: '#90caf9' },
      // Left lung
      { d: 'M 95 60 Q 40 70 30 120 Q 25 170 60 180 Q 90 185 95 140 Z', fill: '#bbdefb', stroke: '#64b5f6' },
      // Right lung
      { d: 'M 105 60 Q 160 70 170 120 Q 175 170 140 180 Q 110 185 105 140 Z', fill: '#bbdefb', stroke: '#64b5f6' },
      // Bronchi
      { d: 'M 95 60 L 70 90 M 105 60 L 130 90', fill: 'none', stroke: '#90caf9' },
    ],
    tumorLocation: { x: 140, y: 110 },
  },
  'colon': {
    name: 'Colon',
    viewBox: '0 0 200 200',
    paths: [
      // Abdomen outline
      { d: 'M 40 40 Q 100 30 160 40 L 170 160 Q 100 180 30 160 Z', fill: '#fff3e0', stroke: '#ffcc80' },
      // Large intestine
      { d: 'M 50 150 L 50 80 Q 50 50 80 50 L 120 50 Q 150 50 150 80 L 150 120 Q 150 150 120 150 L 100 150 Q 80 150 80 130 L 80 110', fill: 'none', stroke: '#ff8a65' },
      // Small intestine
      { d: 'M 80 110 Q 90 100 100 110 Q 110 120 100 130 Q 90 140 80 130', fill: '#ffe0b2', stroke: '#ffab91' },
    ],
    tumorLocation: { x: 50, y: 100 },
  },
  'stomach': {
    name: 'Stomach',
    viewBox: '0 0 200 200',
    paths: [
      // Abdomen
      { d: 'M 40 40 Q 100 30 160 40 L 160 160 Q 100 180 40 160 Z', fill: '#fff3e0', stroke: '#ffcc80' },
      // Stomach
      { d: 'M 70 60 Q 50 80 60 120 Q 80 150 120 140 Q 150 130 140 100 Q 130 70 100 60 Q 80 55 70 60', fill: '#ffccbc', stroke: '#ff8a65' },
      // Esophagus
      { d: 'M 85 40 L 80 60', fill: 'none', stroke: '#ff8a65' },
    ],
    tumorLocation: { x: 90, y: 100 },
  },
  'cervix': {
    name: 'Cervix/Uterus',
    viewBox: '0 0 200 200',
    paths: [
      // Pelvis outline
      { d: 'M 40 60 Q 100 40 160 60 L 160 180 L 40 180 Z', fill: '#fce4ec', stroke: '#f8bbd9' },
      // Uterus
      { d: 'M 70 80 Q 60 100 70 120 L 80 140 Q 100 150 120 140 L 130 120 Q 140 100 130 80 Q 100 60 70 80', fill: '#f8bbd9', stroke: '#f48fb1' },
      // Cervix
      { d: 'M 90 140 L 90 160 L 110 160 L 110 140', fill: '#f48fb1', stroke: '#ec407a' },
      // Fallopian tubes
      { d: 'M 70 85 Q 50 80 45 90 M 130 85 Q 150 80 155 90', fill: 'none', stroke: '#f48fb1' },
      // Ovaries
      { d: 'M 45 90 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0', fill: '#fce4ec', stroke: '#f48fb1' },
      { d: 'M 155 90 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0', fill: '#fce4ec', stroke: '#f48fb1' },
    ],
    tumorLocation: { x: 100, y: 150 },
  },
  'oral-cavity': {
    name: 'Oral Cavity',
    viewBox: '0 0 200 200',
    paths: [
      // Head outline
      { d: 'M 60 40 Q 100 20 140 40 Q 170 80 160 130 Q 140 180 100 190 Q 60 180 40 130 Q 30 80 60 40', fill: '#ffecb3', stroke: '#ffca28' },
      // Mouth
      { d: 'M 60 120 Q 100 140 140 120 Q 130 150 100 160 Q 70 150 60 120', fill: '#ffcdd2', stroke: '#ef9a9a' },
      // Tongue
      { d: 'M 70 125 Q 100 145 130 125 Q 120 140 100 145 Q 80 140 70 125', fill: '#ef9a9a', stroke: '#e57373' },
      // Teeth
      { d: 'M 65 120 L 135 120', fill: 'none', stroke: '#fff' },
    ],
    tumorLocation: { x: 85, y: 135 },
  },
  'prostate': {
    name: 'Prostate',
    viewBox: '0 0 200 200',
    paths: [
      // Pelvis
      { d: 'M 40 60 Q 100 40 160 60 L 160 180 L 40 180 Z', fill: '#e3f2fd', stroke: '#90caf9' },
      // Bladder
      { d: 'M 70 70 Q 50 100 70 130 Q 100 150 130 130 Q 150 100 130 70 Q 100 50 70 70', fill: '#bbdefb', stroke: '#64b5f6' },
      // Prostate
      { d: 'M 80 130 Q 70 145 80 160 Q 100 170 120 160 Q 130 145 120 130 Q 100 125 80 130', fill: '#90caf9', stroke: '#42a5f5' },
      // Urethra
      { d: 'M 100 160 L 100 180', fill: 'none', stroke: '#64b5f6' },
    ],
    tumorLocation: { x: 100, y: 145 },
  },
  'default': {
    name: 'Body',
    viewBox: '0 0 200 200',
    paths: [
      // Simple body outline
      { d: 'M 100 20 Q 130 20 140 40 L 150 60 L 140 60 L 140 80 L 160 80 L 160 100 L 140 100 L 140 180 L 120 180 L 120 120 L 80 120 L 80 180 L 60 180 L 60 100 L 40 100 L 40 80 L 60 80 L 60 60 L 50 60 L 60 40 Q 70 20 100 20', fill: '#fce4ec', stroke: '#f8bbd9' },
    ],
    tumorLocation: { x: 100, y: 100 },
  },
};

// Staging explanations for laypeople
const STAGING_EXPLANATIONS: Record<string, string> = {
  'I': 'Stage I means the cancer is small and only in one area. This is called early-stage cancer. It has not spread to lymph nodes or other parts of the body. Treatment at this stage often has excellent outcomes.',
  'II': 'Stage II means the cancer is larger than Stage I but has not spread to distant parts of the body. It may have started to spread to nearby lymph nodes. This is still considered an early stage with good treatment options.',
  'III': 'Stage III means the cancer is larger and has spread to nearby lymph nodes or tissues, but not to distant organs. This is called locally advanced cancer. Treatment typically involves multiple approaches.',
  'IV': 'Stage IV means the cancer has spread to distant organs or tissues (metastatic cancer). While this is the most advanced stage, many treatments can help control the disease and improve quality of life.',
  'unknown': 'The exact stage has not been determined yet. Staging requires specific tests like imaging and biopsies. Your doctor will discuss staging once all test results are available.',
};

// Get organ diagram for cancer site
function getOrganDiagram(cancerSite: string): typeof ORGAN_DIAGRAMS[string] {
  const siteKey = cancerSite.toLowerCase()
    .replace(/[^a-z]/g, '-')
    .replace(/-+/g, '-');
  
  // Map common cancer sites to diagrams
  if (siteKey.includes('breast')) return ORGAN_DIAGRAMS['breast'];
  if (siteKey.includes('lung')) return ORGAN_DIAGRAMS['lung'];
  if (siteKey.includes('colon') || siteKey.includes('colorectal') || siteKey.includes('rectal')) return ORGAN_DIAGRAMS['colon'];
  if (siteKey.includes('stomach') || siteKey.includes('gastric')) return ORGAN_DIAGRAMS['stomach'];
  if (siteKey.includes('cervix') || siteKey.includes('uterus') || siteKey.includes('ovarian')) return ORGAN_DIAGRAMS['cervix'];
  if (siteKey.includes('oral') || siteKey.includes('mouth') || siteKey.includes('tongue')) return ORGAN_DIAGRAMS['oral-cavity'];
  if (siteKey.includes('prostate')) return ORGAN_DIAGRAMS['prostate'];
  
  return ORGAN_DIAGRAMS['default'];
}

// Get staging explanation
function getStagingExplanation(stage?: string): string {
  if (!stage) return STAGING_EXPLANATIONS['unknown'];
  const stageNum = stage.replace(/[^IV0-4]/gi, '').toUpperCase();
  if (stageNum.includes('IV') || stageNum.includes('4')) return STAGING_EXPLANATIONS['IV'];
  if (stageNum.includes('III') || stageNum.includes('3')) return STAGING_EXPLANATIONS['III'];
  if (stageNum.includes('II') || stageNum.includes('2')) return STAGING_EXPLANATIONS['II'];
  if (stageNum.includes('I') || stageNum.includes('1')) return STAGING_EXPLANATIONS['I'];
  return STAGING_EXPLANATIONS['unknown'];
}

// Extract summary from response
function extractSummary(response: string, maxLength: number = 600): string {
  // Remove markdown formatting
  let clean = response
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n');
  
  // Get first meaningful paragraphs
  const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 30);
  let summary = '';
  
  for (const p of paragraphs) {
    if (summary.length + p.length > maxLength) break;
    summary += (summary ? '\n\n' : '') + p.trim();
  }
  
  return summary || clean.slice(0, maxLength);
}

// Agent metadata
const AGENT_META: Record<string, { name: string; specialty: string }> = {
  'surgical-oncologist': { name: 'Dr. Shalya', specialty: 'Surgical Oncology' },
  'medical-oncologist': { name: 'Dr. Chikitsa', specialty: 'Medical Oncology' },
  'radiation-oncologist': { name: 'Dr. Kirann', specialty: 'Radiation Oncology' },
  'palliative-care': { name: 'Dr. Shanti', specialty: 'Palliative Care' },
  'radiologist': { name: 'Dr. Chitran', specialty: 'Onco-Radiology' },
  'pathologist': { name: 'Dr. Marga', specialty: 'Pathology' },
  'geneticist': { name: 'Dr. Anuvamsha', specialty: 'Genetics' },
};

interface AgentResponse {
  response: string;
  citations: string[];
  toolsUsed: string[];
}

interface CaseInfo {
  cancerSite?: string;
  stage?: string;
  tnm?: string;
  documentCount?: number;
}

// Draw organ diagram on PDF (simplified rendering)
function drawOrganDiagram(doc: jsPDF, organ: typeof ORGAN_DIAGRAMS[string], x: number, y: number, size: number) {
  // For now, draw a simple representation
  // Full SVG path parsing would require more complex code
  
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  
  // Draw organ outline (simplified circle/ellipse)
  doc.setFillColor(252, 228, 236); // Light pink
  doc.setDrawColor(248, 187, 217);
  doc.ellipse(centerX, centerY, size * 0.4, size * 0.35, 'FD');
  
  // Draw tumor marker if location specified
  if (organ.tumorLocation) {
    const tumorX = x + (organ.tumorLocation.x / 200) * size;
    const tumorY = y + (organ.tumorLocation.y / 200) * size;
    
    // Red circle for tumor
    doc.setFillColor(239, 83, 80); // Red
    doc.circle(tumorX, tumorY, 5, 'F');
    
    // Crosshair
    doc.setDrawColor(183, 28, 28);
    doc.setLineWidth(0.5);
    doc.line(tumorX - 8, tumorY, tumorX + 8, tumorY);
    doc.line(tumorX, tumorY - 8, tumorX, tumorY + 8);
  }
  
  // Label
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(organ.name, centerX, y + size + 5, { align: 'center' });
}

export async function generatePDFReport(
  consensus: string,
  agentResponses: Record<string, AgentResponse>,
  caseInfo: CaseInfo
): Promise<Blob> {
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
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Virtual Tumor Board Report', margin, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  doc.text(`Generated: ${date}`, margin, 23);
  doc.text('AI-Assisted Multi-Disciplinary Team Analysis', margin, 29);
  
  yPos = 45;

  // === CASE INFO & ORGAN DIAGRAM ===
  const organDiagram = getOrganDiagram(caseInfo.cancerSite || '');
  
  // Draw organ diagram on right side
  const diagramSize = 50;
  const diagramX = pageWidth - margin - diagramSize;
  const diagramY = yPos;
  drawOrganDiagram(doc, organDiagram, diagramX, diagramY, diagramSize);
  
  // Case info on left side
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Case Information', margin, yPos + 5);
  
  yPos += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const caseLines = [
    `Cancer Site: ${caseInfo.cancerSite || 'Not specified'}`,
    `Stage: ${caseInfo.stage || 'Not determined'}`,
    caseInfo.tnm ? `TNM: ${caseInfo.tnm}` : null,
    `Documents Analyzed: ${caseInfo.documentCount || 0}`,
  ].filter(Boolean) as string[];
  
  for (const line of caseLines) {
    doc.text(line, margin, yPos);
    yPos += 6;
  }
  
  yPos = Math.max(yPos, diagramY + diagramSize + 10);

  // === STAGING EXPLANATION BOX ===
  yPos += 5;
  const stagingExplanation = getStagingExplanation(caseInfo.stage);
  
  // Box background
  doc.setFillColor(255, 243, 224); // Light amber
  doc.setDrawColor(255, 183, 77); // Amber border
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'FD');
  
  // Header
  doc.setFillColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, 8, 3, 3, 'F');
  doc.rect(margin, yPos + 5, contentWidth, 3, 'F'); // Square off bottom of header
  
  doc.setTextColor(100, 60, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('What Does This Stage Mean?', margin + 5, yPos + 5.5);
  
  // Explanation text
  doc.setTextColor(80, 60, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const explanationLines = doc.splitTextToSize(stagingExplanation, contentWidth - 10);
  doc.text(explanationLines, margin + 5, yPos + 14);
  
  yPos += 42;

  // === CONSENSUS SECTION ===
  doc.setFillColor(237, 233, 254); // Light indigo
  doc.setDrawColor(139, 92, 246); // Indigo border
  doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD');
  
  doc.setTextColor(67, 56, 202);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TUMOR BOARD CONSENSUS', margin + 5, yPos + 7);
  
  yPos += 15;
  
  // Consensus text
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Clean and split consensus
  const cleanConsensus = consensus
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '');
  
  const consensusLines = doc.splitTextToSize(cleanConsensus, contentWidth);
  
  // Check if we need a new page
  const lineHeight = 4.5;
  const consensusHeight = consensusLines.length * lineHeight;
  
  if (yPos + consensusHeight > pageHeight - 40) {
    // Truncate consensus for first page, continue on next
    const linesPerPage = Math.floor((pageHeight - yPos - 40) / lineHeight);
    doc.text(consensusLines.slice(0, linesPerPage), margin, yPos);
    
    doc.addPage();
    yPos = margin;
    doc.text(consensusLines.slice(linesPerPage), margin, yPos);
    yPos += (consensusLines.length - linesPerPage) * lineHeight + 10;
  } else {
    doc.text(consensusLines, margin, yPos);
    yPos += consensusHeight + 10;
  }

  // === SPECIALIST OPINIONS ===
  // Check if we need a new page
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFillColor(236, 253, 245); // Light green
  doc.setDrawColor(16, 185, 129); // Green border
  doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD');
  
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SPECIALIST OPINIONS SUMMARY', margin + 5, yPos + 7);
  
  yPos += 15;
  
  // Agent order
  const agentOrder = [
    'surgical-oncologist', 'medical-oncologist', 'radiation-oncologist',
    'pathologist', 'radiologist', 'geneticist', 'palliative-care'
  ];
  
  for (const agentId of agentOrder) {
    const response = agentResponses[agentId];
    if (!response?.response) continue;
    
    const meta = AGENT_META[agentId] || { name: agentId, specialty: 'Specialist' };
    
    // Check for new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    
    // Agent header
    doc.setFillColor(240, 240, 245);
    doc.roundedRect(margin, yPos, contentWidth, 7, 1, 1, 'F');
    
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${meta.name} - ${meta.specialty}`, margin + 3, yPos + 5);
    
    yPos += 10;
    
    // Summary
    const summary = extractSummary(response.response, 500);
    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const summaryLines = doc.splitTextToSize(summary, contentWidth - 6);
    const maxLines = 8; // Limit lines per specialist
    const displayLines = summaryLines.slice(0, maxLines);
    
    doc.text(displayLines, margin + 3, yPos);
    yPos += displayLines.length * 4 + 8;
  }

  // === DISCLAIMER ===
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = margin;
  }
  
  yPos = Math.max(yPos, pageHeight - 45);
  
  doc.setFillColor(254, 226, 226); // Light red
  doc.setDrawColor(239, 68, 68); // Red border
  doc.roundedRect(margin, yPos, contentWidth, 30, 2, 2, 'FD');
  
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT DISCLAIMER', margin + 5, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const disclaimer = 'This AI-generated report is for INFORMATIONAL PURPOSES ONLY and does NOT constitute medical advice. The recommendations should be discussed with your treating oncologist before making any treatment decisions. AI systems can make errors and may not account for all individual patient factors. Always consult qualified healthcare professionals.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, margin + 5, yPos + 12);
  
  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('Generated by Virtual Tumor Board | https://virtual-tumor-board-production.up.railway.app', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
