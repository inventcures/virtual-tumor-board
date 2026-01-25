/**
 * Enhanced PDF Report Generator V2.1 for Virtual Tumor Board
 * 
 * MAJOR UPDATE: Full specialist opinions (3/4 page each minimum)
 * 
 * Features:
 * - Medical literacy level customization (Simple, Standard, Technical)
 * - Color-coded subspecialty section headers with icons
 * - FULL specialist opinions with proper pagination (7-8 paragraphs each)
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
  // V2.1: Content length settings
  minSpecialistParagraphs: number;
  maxSpecialistChars: number;
}

export const LITERACY_CONFIGS: Record<MedicalLiteracyLevel, LiteracyConfig> = {
  simple: {
    level: 'simple',
    label: 'Easy to Understand',
    description: 'Simple language, no medical jargon. Best for patients and caregivers with limited medical knowledge.',
    fontSizeMultiplier: 1.1,
    includeTerminology: false,
    includeStatistics: false,
    includeCitations: false,
    simplifyLanguage: true,
    minSpecialistParagraphs: 5,
    maxSpecialistChars: 4000,
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
    minSpecialistParagraphs: 6,
    maxSpecialistChars: 5000,
  },
  technical: {
    level: 'technical',
    label: 'Medical Professional',
    description: 'Full medical terminology with citations. For doctors, nurses, and healthcare professionals.',
    fontSizeMultiplier: 0.92,
    includeTerminology: true,
    includeStatistics: true,
    includeCitations: true,
    simplifyLanguage: false,
    minSpecialistParagraphs: 8,
    maxSpecialistChars: 8000,  // Full detailed response
  },
};

// Subspecialty color schemes (RGB)
export const SUBSPECIALTY_COLORS: Record<string, { 
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  icon: string;
  name: string;
  fullName: string;
}> = {
  'surgical-oncologist': {
    primary: [220, 38, 38],     // Red-600
    secondary: [254, 226, 226], // Red-100
    accent: [185, 28, 28],      // Red-700
    icon: 'S',
    name: 'Surgical Oncology',
    fullName: 'Dr. Shalya - Surgical Oncology',
  },
  'medical-oncologist': {
    primary: [37, 99, 235],     // Blue-600
    secondary: [219, 234, 254], // Blue-100
    accent: [29, 78, 216],      // Blue-700
    icon: 'M',
    name: 'Medical Oncology',
    fullName: 'Dr. Chikitsa - Medical Oncology',
  },
  'radiation-oncologist': {
    primary: [245, 158, 11],    // Amber-500
    secondary: [254, 243, 199], // Amber-100
    accent: [217, 119, 6],      // Amber-600
    icon: 'R',
    name: 'Radiation Oncology',
    fullName: 'Dr. Kirann - Radiation Oncology',
  },
  'palliative-care': {
    primary: [147, 51, 234],    // Purple-600
    secondary: [243, 232, 255], // Purple-100
    accent: [126, 34, 206],     // Purple-700
    icon: 'P',
    name: 'Palliative Care',
    fullName: 'Dr. Shanti - Palliative Care',
  },
  'radiologist': {
    primary: [6, 182, 212],     // Cyan-500
    secondary: [207, 250, 254], // Cyan-100
    accent: [8, 145, 178],      // Cyan-600
    icon: 'I',
    name: 'Onco-Radiology',
    fullName: 'Dr. Chitran - Onco-Radiology',
  },
  'pathologist': {
    primary: [236, 72, 153],    // Pink-500
    secondary: [252, 231, 243], // Pink-100
    accent: [219, 39, 119],     // Pink-600
    icon: 'L',
    name: 'Pathology',
    fullName: 'Dr. Marga - Pathology',
  },
  'geneticist': {
    primary: [16, 185, 129],    // Emerald-500
    secondary: [209, 250, 229], // Emerald-100
    accent: [5, 150, 105],      // Emerald-600
    icon: 'G',
    name: 'Genetics',
    fullName: 'Dr. Anuvamsha - Genetics',
  },
};

// Organ diagrams
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

// V2.1: Get full specialist content (not truncated summary)
function getFullSpecialistContent(response: string, maxChars: number, literacy: MedicalLiteracyLevel): string {
  let text = simplifyText(response, literacy);
  
  // Clean up markdown formatting for PDF
  text = text
    .replace(/#{1,6}\s*/g, '')  // Remove headers (we'll add our own styling)
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1')  // Remove italic markers
    .replace(/`([^`]+)`/g, '$1')  // Remove code markers
    .replace(/\n{3,}/g, '\n\n')  // Normalize multiple newlines
    .trim();
  
  // Limit to max chars but try to end at a sentence
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    // Try to end at a sentence
    const lastPeriod = text.lastIndexOf('.');
    const lastExclaim = text.lastIndexOf('!');
    const lastQuestion = text.lastIndexOf('?');
    const lastSentenceEnd = Math.max(lastPeriod, lastExclaim, lastQuestion);
    
    if (lastSentenceEnd > maxChars * 0.7) {
      text = text.slice(0, lastSentenceEnd + 1);
    } else {
      text += '...';
    }
  }
  
  return text;
}

// Draw colored section header with icon (enhanced for full-page sections)
function drawSubspecialtyHeader(
  doc: jsPDF,
  agentId: string,
  x: number,
  y: number,
  width: number,
  isFullSection: boolean = false
): number {
  const colors = SUBSPECIALTY_COLORS[agentId] || {
    primary: [100, 100, 100],
    secondary: [240, 240, 240],
    accent: [80, 80, 80],
    icon: '?',
    name: agentId,
    fullName: agentId,
  };
  
  const headerHeight = isFullSection ? 14 : 10;
  
  // Background with rounded corners
  doc.setFillColor(...colors.secondary);
  doc.roundedRect(x, y, width, headerHeight, 2, 2, 'F');
  
  // Left accent bar (thicker for full sections)
  doc.setFillColor(...colors.primary);
  const barWidth = isFullSection ? 5 : 4;
  doc.roundedRect(x, y, barWidth, headerHeight, 2, 2, 'F');
  doc.rect(x + barWidth - 2, y, 2, headerHeight, 'F');
  
  // Icon circle
  const iconX = x + (isFullSection ? 12 : 10);
  const iconY = y + headerHeight / 2;
  const iconRadius = isFullSection ? 4.5 : 3.5;
  doc.setFillColor(...colors.primary);
  doc.circle(iconX, iconY, iconRadius, 'F');
  
  // Icon letter
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(isFullSection ? 9 : 7);
  doc.setFont('helvetica', 'bold');
  doc.text(colors.icon, iconX, iconY + (isFullSection ? 1.2 : 0.8), { align: 'center' });
  
  // Specialty name
  doc.setTextColor(...colors.accent);
  doc.setFontSize(isFullSection ? 13 : 11);
  doc.setFont('helvetica', 'bold');
  const displayName = isFullSection ? colors.fullName : colors.name;
  doc.text(displayName, x + (isFullSection ? 22 : 18), y + (isFullSection ? 9 : 6.5));
  
  return headerHeight;
}

// Draw organ diagram
function drawOrganDiagram(doc: jsPDF, organ: typeof ORGAN_DIAGRAMS[string], x: number, y: number, size: number) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  
  doc.setFillColor(252, 228, 236);
  doc.setDrawColor(248, 187, 217);
  doc.ellipse(centerX, centerY, size * 0.4, size * 0.35, 'FD');
  
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

// V2.1: Render a full specialist section with proper pagination
function renderSpecialistSection(
  doc: jsPDF,
  agentId: string,
  response: AgentResponse,
  config: LiteracyConfig,
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): number {
  const contentWidth = pageWidth - 2 * margin;
  const baseFontSize = 9.5 * config.fontSizeMultiplier;
  const lineHeight = baseFontSize * 0.42;
  let yPos = startY;
  
  // Draw header
  const headerHeight = drawSubspecialtyHeader(doc, agentId, margin, yPos, contentWidth, true);
  yPos += headerHeight + 4;
  
  // Get full content
  const content = getFullSpecialistContent(response.response, config.maxSpecialistChars, config.level);
  
  // Set up text styling
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseFontSize);
  
  // Split content into lines that fit the width
  const textLines = doc.splitTextToSize(content, contentWidth - 8);
  
  // Calculate how many lines fit on current page
  const availableHeight = pageHeight - yPos - 25; // Leave room for footer/margin
  const linesPerPage = Math.floor(availableHeight / lineHeight);
  
  let currentLineIndex = 0;
  
  while (currentLineIndex < textLines.length) {
    // Calculate lines for this page
    const remainingLines = textLines.length - currentLineIndex;
    const linesToRender = Math.min(
      currentLineIndex === 0 ? linesPerPage : Math.floor((pageHeight - margin - 25) / lineHeight),
      remainingLines
    );
    
    // Render lines
    const pageLines = textLines.slice(currentLineIndex, currentLineIndex + linesToRender);
    doc.text(pageLines, margin + 4, yPos);
    
    currentLineIndex += linesToRender;
    yPos += linesToRender * lineHeight;
    
    // Check if we need a new page for remaining content
    if (currentLineIndex < textLines.length) {
      doc.addPage();
      yPos = margin;
      
      // Add continuation header
      const colors = SUBSPECIALTY_COLORS[agentId];
      doc.setFillColor(...(colors?.secondary || [240, 240, 240]));
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(...(colors?.accent || [80, 80, 80]));
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`${colors?.name || agentId} (continued)`, margin + 4, yPos + 5.5);
      yPos += 12;
      
      // Reset text style
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(baseFontSize);
    }
  }
  
  // Add citations if technical level
  if (config.includeCitations && response.citations?.length > 0) {
    yPos += 3;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    const citationText = `References: ${response.citations.join(', ')}`;
    const citationLines = doc.splitTextToSize(citationText, contentWidth - 8);
    doc.text(citationLines, margin + 4, yPos);
    yPos += citationLines.length * 3 + 2;
  }
  
  // Add spacing after section
  yPos += 8;
  
  return yPos;
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

  // === PAGE 1: COVER PAGE ===
  // Header gradient
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 35, pageWidth, 5, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Virtual Tumor Board Report', margin, 18);
  
  // Subtitle
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
  
  const diagramSize = 45;
  const diagramX = pageWidth - margin - diagramSize;
  const diagramY = yPos;
  drawOrganDiagram(doc, organDiagram, diagramX, diagramY, diagramSize);
  
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  const caseTitle = literacyLevel === 'simple' ? 'About Your Case' : 'Case Information';
  doc.text(caseTitle, margin, yPos + 5);
  
  yPos += 12;
  doc.setFontSize(baseFontSize);
  doc.setFont('helvetica', 'normal');
  
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
  
  const explanationLines = doc.splitTextToSize(stagingExplanation, contentWidth - 12);
  const boxHeight = Math.max(28, explanationLines.length * 4.5 + 14);
  
  doc.setFillColor(255, 243, 224);
  doc.setDrawColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');
  
  doc.setFillColor(255, 183, 77);
  doc.roundedRect(margin, yPos, contentWidth, 9, 3, 3, 'F');
  doc.rect(margin, yPos + 6, contentWidth, 3, 'F');
  
  doc.setTextColor(120, 60, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const stagingTitle = literacyLevel === 'simple' ? 'What This Stage Means For You' : 'What Does This Stage Mean?';
  doc.text(stagingTitle, margin + 5, yPos + 6);
  
  doc.setTextColor(80, 60, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseFontSize * 0.9);
  doc.text(explanationLines, margin + 6, yPos + 14);
  
  yPos += boxHeight + 8;

  // === CONSENSUS SECTION ===
  doc.setFillColor(237, 233, 254);
  doc.setDrawColor(139, 92, 246);
  doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');
  
  doc.setFillColor(139, 92, 246);
  doc.circle(margin + 7, yPos + 6, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('C', margin + 7, yPos + 7, { align: 'center' });
  
  doc.setTextColor(67, 56, 202);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const consensusTitle = literacyLevel === 'simple' 
    ? 'WHAT THE DOCTORS RECOMMEND' 
    : 'TUMOR BOARD CONSENSUS';
  doc.text(consensusTitle, margin + 15, yPos + 8);
  
  yPos += 16;
  
  // Consensus text with proper pagination
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseFontSize);
  
  const cleanConsensus = simplifyText(consensus, literacyLevel);
  const consensusLines = doc.splitTextToSize(cleanConsensus, contentWidth - 4);
  
  const lineHeight = baseFontSize * 0.45;
  
  // Render consensus with pagination
  let consensusLineIndex = 0;
  while (consensusLineIndex < consensusLines.length) {
    const availableHeight = pageHeight - yPos - 30;
    const linesPerPage = Math.floor(availableHeight / lineHeight);
    const linesToRender = Math.min(linesPerPage, consensusLines.length - consensusLineIndex);
    
    const pageLines = consensusLines.slice(consensusLineIndex, consensusLineIndex + linesToRender);
    doc.text(pageLines, margin + 2, yPos);
    
    consensusLineIndex += linesToRender;
    yPos += linesToRender * lineHeight;
    
    if (consensusLineIndex < consensusLines.length) {
      doc.addPage();
      yPos = margin;
      
      // Continuation header
      doc.setFillColor(237, 233, 254);
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(67, 56, 202);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Consensus (continued)', margin + 4, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(baseFontSize);
    }
  }
  
  yPos += 10;

  // === SPECIALIST OPINIONS SECTION ===
  // Start each specialist on a new page for cleaner layout and full content
  doc.addPage();
  yPos = margin;
  
  // Section header
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'FD');
  
  doc.setFillColor(16, 185, 129);
  doc.circle(margin + 8, yPos + 7, 4.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('S', margin + 8, yPos + 8.2, { align: 'center' });
  
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const specialistTitle = literacyLevel === 'simple'
    ? 'WHAT EACH SPECIALIST SAYS'
    : 'SPECIALIST OPINIONS';
  doc.text(specialistTitle, margin + 18, yPos + 9);
  
  yPos += 20;
  
  // Note about full opinions
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text('Each specialist provides their detailed assessment below:', margin, yPos);
  yPos += 8;
  
  // Render each specialist with full content
  const agentOrder = literacyLevel === 'simple'
    ? ['medical-oncologist', 'surgical-oncologist', 'radiation-oncologist', 'palliative-care', 'pathologist', 'radiologist', 'geneticist']
    : ['surgical-oncologist', 'medical-oncologist', 'radiation-oncologist', 'pathologist', 'radiologist', 'geneticist', 'palliative-care'];
  
  for (const agentId of agentOrder) {
    const response = agentResponses[agentId];
    if (!response?.response) continue;
    
    // Check if we need a new page (if less than 100mm available)
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = margin;
    }
    
    // Render full specialist section
    yPos = renderSpecialistSection(
      doc,
      agentId,
      response,
      config,
      yPos,
      pageWidth,
      pageHeight,
      margin
    );
  }

  // === DISCLAIMER (always on last page) ===
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = margin;
  }
  
  yPos = Math.max(yPos, pageHeight - 45);
  
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(margin, yPos, contentWidth, 32, 2, 2, 'FD');
  
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
  doc.text(disclaimerLines, margin + 5, yPos + 13);
  
  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text(
      `Page ${i} of ${pageCount} | Virtual Tumor Board | https://virtual-tumor-board-production.up.railway.app`, 
      pageWidth / 2, 
      pageHeight - 5, 
      { align: 'center' }
    );
  }

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
