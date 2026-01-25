/**
 * Enhanced PDF Report Generator V2 for Virtual Tumor Board
 * 
 * Features:
 * - Medical literacy level customization (Simple, Standard, Technical)
 * - Color-coded subspecialty section headers with icons
 * - Improved readability with better spacing and typography
 * - Organ diagrams with tumor location markers
 * - Layman-friendly staging explanations
 */

import { jsPDF } from 'jspdf';

// Medical literacy levels
export type MedicalLiteracyLevel = 'simple' | 'standard' | 'technical';

export interface LiteracyConfig {
  level: MedicalLiteracyLevel;
  label: string;
  description: string;
  fontSizeMultiplier: number;
  includeTerminology: boolean;
  includeStatistics: boolean;
  includeCitations: boolean;
  simplifyLanguage: boolean;
}

export const LITERACY_CONFIGS: Record<MedicalLiteracyLevel, LiteracyConfig> = {
  simple: {
    level: 'simple',
    label: 'Easy to Understand',
    description: 'Simple language, no medical jargon. Best for patients and caregivers with limited medical knowledge.',
    fontSizeMultiplier: 1.15,
    includeTerminology: false,
    includeStatistics: false,
    includeCitations: false,
    simplifyLanguage: true,
  },
  standard: {
    level: 'standard',
    label: 'Standard',
    description: 'Balanced language with some medical terms explained. Suitable for educated patients and caregivers.',
    fontSizeMultiplier: 1.0,
    includeTerminology: true,
    includeStatistics: true,
    includeCitations: false,
    simplifyLanguage: false,
  },
  technical: {
    level: 'technical',
    label: 'Medical Professional',
    description: 'Full medical terminology with citations. For doctors, nurses, and healthcare professionals.',
    fontSizeMultiplier: 0.95,
    includeTerminology: true,
    includeStatistics: true,
    includeCitations: true,
    simplifyLanguage: false,
  },
};

// Subspecialty color schemes (RGB)
export const SUBSPECIALTY_COLORS: Record<string, { 
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  icon: string;
  name: string;
}> = {
  'surgical-oncologist': {
    primary: [220, 38, 38],     // Red-600
    secondary: [254, 226, 226], // Red-100
    accent: [185, 28, 28],      // Red-700
    icon: 'S',                  // Scalpel symbol
    name: 'Surgical Oncology',
  },
  'medical-oncologist': {
    primary: [37, 99, 235],     // Blue-600
    secondary: [219, 234, 254], // Blue-100
    accent: [29, 78, 216],      // Blue-700
    icon: 'M',                  // Medicine symbol
    name: 'Medical Oncology',
  },
  'radiation-oncologist': {
    primary: [245, 158, 11],    // Amber-500
    secondary: [254, 243, 199], // Amber-100
    accent: [217, 119, 6],      // Amber-600
    icon: 'R',                  // Radiation symbol
    name: 'Radiation Oncology',
  },
  'palliative-care': {
    primary: [147, 51, 234],    // Purple-600
    secondary: [243, 232, 255], // Purple-100
    accent: [126, 34, 206],     // Purple-700
    icon: 'P',                  // Peace symbol
    name: 'Palliative Care',
  },
  'radiologist': {
    primary: [6, 182, 212],     // Cyan-500
    secondary: [207, 250, 254], // Cyan-100
    accent: [8, 145, 178],      // Cyan-600
    icon: 'I',                  // Imaging symbol
    name: 'Onco-Radiology',
  },
  'pathologist': {
    primary: [236, 72, 153],    // Pink-500
    secondary: [252, 231, 243], // Pink-100
    accent: [219, 39, 119],     // Pink-600
    icon: 'L',                  // Lab symbol
    name: 'Pathology',
  },
  'geneticist': {
    primary: [16, 185, 129],    // Emerald-500
    secondary: [209, 250, 229], // Emerald-100
    accent: [5, 150, 105],      // Emerald-600
    icon: 'G',                  // Gene symbol
    name: 'Genetics',
  },
};

// Organ SVG paths (simplified for PDF rendering)
const ORGAN_DIAGRAMS: Record<string, {
  name: string;
  viewBox: string;
  tumorLocation?: { x: number; y: number };
}> = {
  'breast': { name: 'Breast', viewBox: '0 0 200 200', tumorLocation: { x: 55, y: 95 } },
  'lung': { name: 'Lungs', viewBox: '0 0 200 200', tumorLocation: { x: 140, y: 110 } },
  'colon': { name: 'Colon', viewBox: '0 0 200 200', tumorLocation: { x: 50, y: 100 } },
  'stomach': { name: 'Stomach', viewBox: '0 0 200 200', tumorLocation: { x: 90, y: 100 } },
  'cervix': { name: 'Cervix/Uterus', viewBox: '0 0 200 200', tumorLocation: { x: 100, y: 150 } },
  'oral-cavity': { name: 'Oral Cavity', viewBox: '0 0 200 200', tumorLocation: { x: 85, y: 135 } },
  'prostate': { name: 'Prostate', viewBox: '0 0 200 200', tumorLocation: { x: 100, y: 145 } },
  'default': { name: 'Body', viewBox: '0 0 200 200', tumorLocation: { x: 100, y: 100 } },
};

// Staging explanations by literacy level
const STAGING_EXPLANATIONS: Record<string, Record<MedicalLiteracyLevel, string>> = {
  'I': {
    simple: 'The cancer is small and only in one place. It has not spread anywhere else. This is good news - treatment usually works very well at this stage.',
    standard: 'Stage I means the cancer is small and localized. It has not spread to lymph nodes or other organs. Treatment outcomes are typically excellent with high cure rates.',
    technical: 'Stage I: Localized primary tumor without regional lymph node involvement (N0) or distant metastasis (M0). Five-year survival rates are generally >90% for most solid tumors at this stage.',
  },
  'II': {
    simple: 'The cancer is a bit bigger but is still in the area where it started. It might have reached nearby lymph nodes. Treatment can still be very effective.',
    standard: 'Stage II indicates a larger tumor that may have limited spread to nearby lymph nodes. It has not spread to distant organs. Treatment typically involves surgery and possibly additional therapy.',
    technical: 'Stage II: Larger primary tumor or limited regional nodal involvement. No distant metastases. May require multimodal therapy. Five-year survival typically 70-90% depending on histology.',
  },
  'III': {
    simple: 'The cancer has grown larger and spread to nearby areas or lymph nodes, but has not traveled to distant parts of your body. Treatment usually uses several different methods.',
    standard: 'Stage III means the cancer is locally advanced with spread to regional lymph nodes or nearby tissues. It has not spread to distant organs. Treatment usually combines surgery, chemotherapy, and/or radiation.',
    technical: 'Stage III: Locally advanced disease with significant regional nodal involvement or local invasion. No distant metastases (M0). Multimodal therapy required. Five-year survival 40-70% depending on primary site.',
  },
  'IV': {
    simple: 'The cancer has spread to other parts of the body far from where it started. While this is the most serious stage, there are still many treatments that can help you feel better and live longer.',
    standard: 'Stage IV means the cancer has spread to distant organs (metastatic disease). While not curable, many treatments can control the disease for months or years, improve symptoms, and maintain quality of life.',
    technical: 'Stage IV: Distant metastatic disease (M1). Treatment goals shift toward disease control, symptom palliation, and quality of life optimization. Survival varies widely based on metastatic burden, sites involved, and molecular features.',
  },
  'unknown': {
    simple: 'The doctors are still working to understand exactly how far the cancer has spread. They need to do more tests before they can tell you the stage.',
    standard: 'The cancer stage has not been fully determined yet. Additional tests like imaging or biopsies may be needed for accurate staging. Your oncologist will discuss this with you.',
    technical: 'Staging workup incomplete. Recommend additional diagnostic evaluation including appropriate imaging modalities and tissue sampling as indicated by suspected primary site.',
  },
};

// Helper functions
function getOrganDiagram(cancerSite: string): typeof ORGAN_DIAGRAMS[string] {
  const siteKey = cancerSite.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');
  
  if (siteKey.includes('breast')) return ORGAN_DIAGRAMS['breast'];
  if (siteKey.includes('lung')) return ORGAN_DIAGRAMS['lung'];
  if (siteKey.includes('colon') || siteKey.includes('colorectal') || siteKey.includes('rectal')) return ORGAN_DIAGRAMS['colon'];
  if (siteKey.includes('stomach') || siteKey.includes('gastric')) return ORGAN_DIAGRAMS['stomach'];
  if (siteKey.includes('cervix') || siteKey.includes('uterus') || siteKey.includes('ovarian')) return ORGAN_DIAGRAMS['cervix'];
  if (siteKey.includes('oral') || siteKey.includes('mouth') || siteKey.includes('tongue')) return ORGAN_DIAGRAMS['oral-cavity'];
  if (siteKey.includes('prostate')) return ORGAN_DIAGRAMS['prostate'];
  
  return ORGAN_DIAGRAMS['default'];
}

function getStagingExplanation(stage: string | undefined, literacy: MedicalLiteracyLevel): string {
  if (!stage) return STAGING_EXPLANATIONS['unknown'][literacy];
  const stageNum = stage.replace(/[^IV0-4]/gi, '').toUpperCase();
  if (stageNum.includes('IV') || stageNum.includes('4')) return STAGING_EXPLANATIONS['IV'][literacy];
  if (stageNum.includes('III') || stageNum.includes('3')) return STAGING_EXPLANATIONS['III'][literacy];
  if (stageNum.includes('II') || stageNum.includes('2')) return STAGING_EXPLANATIONS['II'][literacy];
  if (stageNum.includes('I') || stageNum.includes('1')) return STAGING_EXPLANATIONS['I'][literacy];
  return STAGING_EXPLANATIONS['unknown'][literacy];
}

// Simplify medical text for lower literacy levels
function simplifyText(text: string, literacy: MedicalLiteracyLevel): string {
  if (literacy === 'technical') return text;
  
  let simplified = text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '');
  
  if (literacy === 'simple') {
    // Replace common medical terms with simpler alternatives
    const replacements: [RegExp, string][] = [
      [/metastasis|metastases|metastatic/gi, 'spread'],
      [/oncologist/gi, 'cancer doctor'],
      [/chemotherapy/gi, 'cancer-fighting medicine'],
      [/radiation therapy|radiotherapy/gi, 'radiation treatment'],
      [/biopsy/gi, 'tissue sample test'],
      [/malignant/gi, 'cancerous'],
      [/benign/gi, 'non-cancerous'],
      [/tumor/gi, 'growth'],
      [/prognosis/gi, 'outlook'],
      [/adjuvant/gi, 'additional'],
      [/neoadjuvant/gi, 'before-surgery'],
      [/palliative/gi, 'comfort-focused'],
      [/remission/gi, 'cancer gone or reduced'],
      [/progression/gi, 'cancer growth'],
      [/lymph nodes/gi, 'small glands'],
      [/immunotherapy/gi, 'treatment that helps your body fight cancer'],
      [/targeted therapy/gi, 'medicine that targets cancer cells'],
      [/histopathology/gi, 'tissue test results'],
      [/imaging/gi, 'scans'],
      [/CT scan|computed tomography/gi, 'body scan'],
      [/MRI|magnetic resonance/gi, 'detailed body scan'],
      [/PET scan/gi, 'special scan that shows active cancer'],
    ];
    
    for (const [pattern, replacement] of replacements) {
      simplified = simplified.replace(pattern, replacement);
    }
  }
  
  return simplified;
}

// Extract summary from response
function extractSummary(response: string, maxLength: number, literacy: MedicalLiteracyLevel): string {
  let text = simplifyText(response, literacy);
  
  // Get first meaningful paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 30);
  let summary = '';
  
  for (const p of paragraphs) {
    if (summary.length + p.length > maxLength) break;
    summary += (summary ? '\n\n' : '') + p.trim();
  }
  
  return summary || text.slice(0, maxLength);
}

// Draw colored section header with icon
function drawSubspecialtyHeader(
  doc: jsPDF,
  agentId: string,
  x: number,
  y: number,
  width: number
): number {
  const colors = SUBSPECIALTY_COLORS[agentId] || {
    primary: [100, 100, 100],
    secondary: [240, 240, 240],
    accent: [80, 80, 80],
    icon: '?',
    name: agentId,
  };
  
  const headerHeight = 10;
  
  // Background with rounded corners
  doc.setFillColor(...colors.secondary);
  doc.roundedRect(x, y, width, headerHeight, 2, 2, 'F');
  
  // Left accent bar
  doc.setFillColor(...colors.primary);
  doc.roundedRect(x, y, 4, headerHeight, 2, 2, 'F');
  doc.rect(x + 2, y, 2, headerHeight, 'F'); // Square off right side of accent
  
  // Icon circle
  const iconX = x + 10;
  const iconY = y + headerHeight / 2;
  doc.setFillColor(...colors.primary);
  doc.circle(iconX, iconY, 3.5, 'F');
  
  // Icon letter
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(colors.icon, iconX, iconY + 0.8, { align: 'center' });
  
  // Specialty name
  doc.setTextColor(...colors.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(colors.name, x + 18, y + 6.5);
  
  return headerHeight;
}

// Draw organ diagram
function drawOrganDiagram(doc: jsPDF, organ: typeof ORGAN_DIAGRAMS[string], x: number, y: number, size: number) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  
  // Draw organ outline (simplified ellipse)
  doc.setFillColor(252, 228, 236);
  doc.setDrawColor(248, 187, 217);
  doc.ellipse(centerX, centerY, size * 0.4, size * 0.35, 'FD');
  
  // Draw tumor marker
  if (organ.tumorLocation) {
    const tumorX = x + (organ.tumorLocation.x / 200) * size;
    const tumorY = y + (organ.tumorLocation.y / 200) * size;
    
    doc.setFillColor(239, 83, 80);
    doc.circle(tumorX, tumorY, 5, 'F');
    
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

// Main interfaces
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

// Main PDF generation function
export async function generateEnhancedPDFReport(
  consensus: string,
  agentResponses: Record<string, AgentResponse>,
  caseInfo: CaseInfo,
  literacyLevel: MedicalLiteracyLevel = 'standard'
): Promise<Blob> {
  const config = LITERACY_CONFIGS[literacyLevel];
  const baseFontSize = 10 * config.fontSizeMultiplier;
  
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

  // === COVER PAGE HEADER ===
  // Gradient-like header (multiple rectangles)
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(99, 102, 241); // Lighter indigo stripe
  doc.rect(0, 35, pageWidth, 5, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Virtual Tumor Board Report', margin, 18);
  
  // Subtitle based on literacy level
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const subtitles: Record<MedicalLiteracyLevel, string> = {
    simple: 'Your Cancer Care Summary - Easy to Understand Version',
    standard: 'Multi-Disciplinary Team Analysis',
    technical: 'AI-Assisted MDT Deliberation Summary',
  };
  doc.text(subtitles[literacyLevel], margin, 27);
  
  // Date
  doc.setFontSize(9);
  const date = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  doc.text(`Generated: ${date}`, margin, 35);
  
  yPos = 50;

  // === CASE INFO & ORGAN DIAGRAM ===
  const organDiagram = getOrganDiagram(caseInfo.cancerSite || '');
  
  // Draw organ diagram on right
  const diagramSize = 45;
  const diagramX = pageWidth - margin - diagramSize;
  const diagramY = yPos;
  drawOrganDiagram(doc, organDiagram, diagramX, diagramY, diagramSize);
  
  // Case info on left
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  const caseTitle = literacyLevel === 'simple' ? 'About Your Case' : 'Case Information';
  doc.text(caseTitle, margin, yPos + 5);
  
  yPos += 12;
  doc.setFontSize(baseFontSize);
  doc.setFont('helvetica', 'normal');
  
  // Info labels vary by literacy
  const siteLabel = literacyLevel === 'simple' ? 'Type of cancer:' : 'Cancer Site:';
  const stageLabel = literacyLevel === 'simple' ? 'Stage:' : 'Clinical Stage:';
  const docsLabel = literacyLevel === 'simple' ? 'Documents reviewed:' : 'Documents Analyzed:';
  
  const caseLines = [
    `${siteLabel} ${caseInfo.cancerSite || 'Not specified'}`,
    `${stageLabel} ${caseInfo.stage || 'Not determined'}`,
    caseInfo.tnm && literacyLevel !== 'simple' ? `TNM: ${caseInfo.tnm}` : null,
    `${docsLabel} ${caseInfo.documentCount || 0}`,
  ].filter(Boolean) as string[];
  
  for (const line of caseLines) {
    doc.text(line, margin, yPos);
    yPos += 6;
  }
  
  yPos = Math.max(yPos, diagramY + diagramSize + 12);

  // === STAGING EXPLANATION BOX ===
  yPos += 3;
  const stagingExplanation = getStagingExplanation(caseInfo.stage, literacyLevel);
  
  // Box dimensions
  const explanationLines = doc.splitTextToSize(stagingExplanation, contentWidth - 12);
  const boxHeight = Math.max(28, explanationLines.length * 4.5 + 14);
  
  // Box background
  doc.setFillColor(255, 243, 224); // Light amber
  doc.setDrawColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');
  
  // Header bar
  doc.setFillColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, 9, 3, 3, 'F');
  doc.rect(margin, yPos + 6, contentWidth, 3, 'F');
  
  // Header text
  doc.setTextColor(120, 60, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const stagingTitle = literacyLevel === 'simple' ? 'What This Stage Means For You' : 'What Does This Stage Mean?';
  doc.text(stagingTitle, margin + 5, yPos + 6);
  
  // Explanation text
  doc.setTextColor(80, 60, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseFontSize * 0.9);
  doc.text(explanationLines, margin + 6, yPos + 14);
  
  yPos += boxHeight + 8;

  // === CONSENSUS SECTION ===
  // Header
  doc.setFillColor(237, 233, 254);
  doc.setDrawColor(139, 92, 246);
  doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');
  
  // Icon circle
  doc.setFillColor(139, 92, 246);
  doc.circle(margin + 7, yPos + 6, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('C', margin + 7, yPos + 7, { align: 'center' });
  
  // Title
  doc.setTextColor(67, 56, 202);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const consensusTitle = literacyLevel === 'simple' 
    ? 'WHAT THE DOCTORS RECOMMEND' 
    : 'TUMOR BOARD CONSENSUS';
  doc.text(consensusTitle, margin + 15, yPos + 8);
  
  yPos += 16;
  
  // Consensus text
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseFontSize);
  
  const cleanConsensus = simplifyText(consensus, literacyLevel);
  const consensusLines = doc.splitTextToSize(cleanConsensus, contentWidth - 4);
  
  // Paginate if needed
  const lineHeight = baseFontSize * 0.45;
  const consensusHeight = consensusLines.length * lineHeight;
  const maxHeightOnPage = pageHeight - yPos - 50;
  
  if (consensusHeight > maxHeightOnPage) {
    const linesPerPage = Math.floor(maxHeightOnPage / lineHeight);
    doc.text(consensusLines.slice(0, linesPerPage), margin + 2, yPos);
    
    doc.addPage();
    yPos = margin;
    
    // Continue header on new page
    doc.setFillColor(237, 233, 254);
    doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
    doc.setTextColor(67, 56, 202);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Consensus (continued)', margin + 4, yPos + 5.5);
    yPos += 12;
    
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseFontSize);
    doc.text(consensusLines.slice(linesPerPage), margin + 2, yPos);
    yPos += (consensusLines.length - linesPerPage) * lineHeight + 10;
  } else {
    doc.text(consensusLines, margin + 2, yPos);
    yPos += consensusHeight + 10;
  }

  // === SPECIALIST OPINIONS SECTION ===
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  
  // Section header
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');
  
  doc.setFillColor(16, 185, 129);
  doc.circle(margin + 7, yPos + 6, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('S', margin + 7, yPos + 7, { align: 'center' });
  
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const specialistTitle = literacyLevel === 'simple'
    ? 'WHAT EACH SPECIALIST SAYS'
    : 'SPECIALIST OPINIONS';
  doc.text(specialistTitle, margin + 15, yPos + 8);
  
  yPos += 18;
  
  // Agent order - prioritize based on literacy level
  const agentOrder = literacyLevel === 'simple'
    ? ['medical-oncologist', 'surgical-oncologist', 'radiation-oncologist', 'palliative-care', 'pathologist', 'radiologist', 'geneticist']
    : ['surgical-oncologist', 'medical-oncologist', 'radiation-oncologist', 'pathologist', 'radiologist', 'geneticist', 'palliative-care'];
  
  const maxSummaryLength = literacyLevel === 'simple' ? 350 : literacyLevel === 'standard' ? 450 : 600;
  
  for (const agentId of agentOrder) {
    const response = agentResponses[agentId];
    if (!response?.response) continue;
    
    // Check for new page
    if (yPos > pageHeight - 55) {
      doc.addPage();
      yPos = margin;
    }
    
    // Draw colored subspecialty header
    const headerHeight = drawSubspecialtyHeader(doc, agentId, margin, yPos, contentWidth);
    yPos += headerHeight + 2;
    
    // Summary text
    const summary = extractSummary(response.response, maxSummaryLength, literacyLevel);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseFontSize * 0.9);
    
    const summaryLines = doc.splitTextToSize(summary, contentWidth - 8);
    const maxLines = literacyLevel === 'simple' ? 6 : 8;
    const displayLines = summaryLines.slice(0, maxLines);
    
    doc.text(displayLines, margin + 4, yPos + 3);
    yPos += displayLines.length * (baseFontSize * 0.4) + 12;
    
    // Citations (technical only)
    if (config.includeCitations && response.citations?.length > 0) {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      const citationText = `Refs: ${response.citations.slice(0, 3).join(', ')}`;
      doc.text(citationText, margin + 4, yPos - 6);
    }
  }

  // === DISCLAIMER ===
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }
  
  yPos = Math.max(yPos, pageHeight - 42);
  
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'FD');
  
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const disclaimerTitle = literacyLevel === 'simple' ? 'IMPORTANT - PLEASE READ' : 'IMPORTANT DISCLAIMER';
  doc.text(disclaimerTitle, margin + 5, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  
  const disclaimers: Record<MedicalLiteracyLevel, string> = {
    simple: 'This report was made by computer programs (AI) to help you understand your cancer. It is NOT medical advice. Please talk to your doctor before making any decisions about your treatment. The computer might make mistakes. Always ask your healthcare team any questions you have.',
    standard: 'This AI-generated report is for INFORMATIONAL PURPOSES ONLY and does NOT constitute medical advice. The recommendations should be discussed with your treating oncologist before making any treatment decisions. AI systems can make errors and may not account for all individual patient factors.',
    technical: 'This AI-generated analysis is provided for informational and clinical decision support purposes only. It does not constitute medical advice and should not replace professional clinical judgment. AI systems have inherent limitations and may not account for all patient-specific variables. All recommendations should be validated against current guidelines and discussed with the treating multidisciplinary team.',
  };
  
  const disclaimerLines = doc.splitTextToSize(disclaimers[literacyLevel], contentWidth - 10);
  doc.text(disclaimerLines, margin + 5, yPos + 12);
  
  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text(
    'Generated by Virtual Tumor Board | https://virtual-tumor-board-production.up.railway.app', 
    pageWidth / 2, 
    pageHeight - 5, 
    { align: 'center' }
  );

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
