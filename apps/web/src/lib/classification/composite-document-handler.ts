/**
 * Composite Document Handler V5.2
 * 
 * Handles documents that contain multiple subspecialty information:
 * - OPD prescriptions with diagnosis + staging + treatment history + labs + plan
 * - Follow-up notes with scan results + treatment progress + next steps
 * - Referral letters with complete case summary
 * - Discharge summaries with surgery + pathology + treatment details
 * 
 * Key insight: In Indian healthcare, a single prescription slip often contains
 * more clinical information than 5 separate documents in western systems.
 */

import type { 
  DocumentType, 
  SubspecialtyContent, 
  ExtractedSection,
  DocumentClassification,
  ExtractedClinicalData,
  INDIAN_MEDICAL_TERMS 
} from '@/types/user-upload';

// Patterns to detect subspecialty content within any document
export const SUBSPECIALTY_CONTENT_PATTERNS: Record<SubspecialtyContent, {
  patterns: RegExp[];
  keywords: string[];
  subspecialty: string;
  extractionPriority: number; // Higher = more important to extract
}> = {
  'pathology-summary': {
    patterns: [
      /(?:dx|diagnosis|histology|hpe|fnac)[\s:]+[^\n]+(?:carcinoma|adenoma|malignant|grade)/i,
      /(?:er|pr|her2)[\s]*[+-]/i,
      /(?:grade|differentiat)[^\n]+(?:well|moderate|poor|[123])/i,
      /(?:biopsy|histopath)[^\n]+(?:shows?|reveals?|confirms?)/i,
    ],
    keywords: ['carcinoma', 'adenocarcinoma', 'grade', 'differentiated', 'ihc', 'er+', 'pr+', 'her2', 'ki67', 'histology', 'biopsy'],
    subspecialty: 'pathology',
    extractionPriority: 10,
  },
  
  'radiology-summary': {
    patterns: [
      /(?:ct|mri|pet|usg|cect|hrct)[^\n]+(?:shows?|reveals?|suggests?|no evidence)/i,
      /(?:scan|imaging)[^\n]+(?:findings?|impression)/i,
      /(?:mass|lesion|tumor|node)[^\n]+(?:measuring|\d+\s*(?:cm|mm))/i,
      /(?:suv|hounsfield|contrast)/i,
    ],
    keywords: ['ct scan', 'mri', 'pet-ct', 'usg', 'cect', 'findings', 'impression', 'metastasis', 'lesion', 'mass', 'lymph node'],
    subspecialty: 'radiology',
    extractionPriority: 9,
  },
  
  'staging-info': {
    patterns: [
      /stage\s*(?:i{1,3}v?|[1-4])[abc]?\b/i,
      /t[0-4][abc]?\s*n[0-3][abc]?\s*m[01x]/i,
      /(?:tnm|ajcc|figo)[^\n]+stage/i,
      /(?:locally\s*advanced|metastatic|early\s*stage)/i,
    ],
    keywords: ['stage', 'tnm', 't1', 't2', 't3', 't4', 'n0', 'n1', 'n2', 'm0', 'm1', 'ajcc', 'locally advanced', 'metastatic'],
    subspecialty: 'medical-oncology',
    extractionPriority: 10,
  },
  
  'treatment-history': {
    patterns: [
      /(?:completed?|received?|given|done)[^\n]+(?:cycle|chemo|radiation|surgery)/i,
      /(?:post|s\/p|status\s*post)[^\n]+(?:surgery|mastectomy|resection|chemo)/i,
      /(?:nact|act|ccrt)[^\n]+(?:\d+\/\d+|completed?|cycle)/i,
      /(?:regimen|protocol)[^\n]+(?:ac|tc|folfox|folfiri|carboplatin)/i,
    ],
    keywords: ['completed', 'received', 'cycles', 'post surgery', 'post chemo', 'nact', 'act', 'regimen', 's/p', 'status post'],
    subspecialty: 'medical-oncology',
    extractionPriority: 8,
  },
  
  'surgery-summary': {
    patterns: [
      /(?:operated?|surgery|underwent?)[^\n]+(?:on|for|mastectomy|resection|excision)/i,
      /(?:mrm|bcs|wle|lar|apr|tah)[^\n]+(?:done|performed|on)/i,
      /(?:intraop|operative)[^\n]+(?:findings?|notes?)/i,
      /(?:margins?)[^\n]+(?:clear|positive|negative|free)/i,
    ],
    keywords: ['surgery', 'operated', 'resection', 'mastectomy', 'excision', 'margins', 'operative', 'mrm', 'bcs', 'wle'],
    subspecialty: 'surgical-oncology',
    extractionPriority: 9,
  },
  
  'lab-values': {
    patterns: [
      /(?:hb|hemoglobin|hgb)[^\n]*(?:\d+\.?\d*)\s*(?:g\/dl|gm%)?/i,
      /(?:tlc|wbc)[^\n]*(?:\d+\.?\d*)\s*(?:\/cumm|cells)?/i,
      /(?:creatinine|bilirubin|sgot|sgpt|alt|ast)[^\n]*(?:\d+\.?\d*)/i,
      /(?:cea|ca\s*19|ca\s*125|afp|psa)[^\n]*(?:\d+\.?\d*)/i,
    ],
    keywords: ['hb', 'hemoglobin', 'tlc', 'wbc', 'platelet', 'creatinine', 'bilirubin', 'lft', 'kft', 'cea', 'ca 19-9', 'ca 125'],
    subspecialty: 'medical-oncology',
    extractionPriority: 6,
  },
  
  'medications': {
    patterns: [
      /(?:tab|cap|inj)[^\n]+(?:\d+\s*mg|\d+\s*ml)/i,
      /(?:letrozole|tamoxifen|anastrozole|exemestane)[^\n]+(?:\d+\s*mg|daily|od)/i,
      /(?:paclitaxel|carboplatin|cisplatin|doxorubicin)[^\n]+(?:mg\/m2|\d+\s*mg)/i,
      /(?:ondansetron|dexamethasone|pantoprazole|calcium)[^\n]+(?:\d+\s*mg)/i,
    ],
    keywords: ['tab', 'cap', 'inj', 'mg', 'daily', 'od', 'bd', 'tid', 'sos', 'prn', 'before food', 'after food'],
    subspecialty: 'medical-oncology',
    extractionPriority: 5,
  },
  
  'genomic-findings': {
    patterns: [
      /(?:egfr|kras|braf|alk|ros1|her2|brca)[^\n]+(?:mutation|positive|negative|wild)/i,
      /(?:msi|tmb|pd-?l1)[^\n]+(?:high|low|stable|\d+%?)/i,
      /(?:ngs|foundation|guardant)[^\n]+(?:report|testing|panel)/i,
    ],
    keywords: ['mutation', 'egfr', 'kras', 'braf', 'alk', 'ros1', 'brca', 'msi', 'tmb', 'pd-l1', 'ngs', 'sequencing'],
    subspecialty: 'genetics',
    extractionPriority: 8,
  },
  
  'follow-up-plan': {
    patterns: [
      /(?:f\/u|follow\s*up|review|next\s*visit)[^\n]+(?:after|in|on|\d+\s*(?:weeks?|months?))/i,
      /(?:refer|referral|consult)[^\n]+(?:dr|doctor|oncolog|radiation)/i,
      /(?:plan|advice|recommendation)[^\n:]+:/i,
      /(?:repeat|next)[^\n]+(?:scan|ct|mri|pet|cbc|labs?)/i,
    ],
    keywords: ['follow up', 'f/u', 'review', 'next visit', 'refer', 'referral', 'plan', 'advice', 'repeat', 'next scan'],
    subspecialty: 'medical-oncology',
    extractionPriority: 7,
  },
  
  'prognosis-discussion': {
    patterns: [
      /(?:prognosis|survival|outcome)[^\n]+(?:good|poor|guarded|expected)/i,
      /(?:explained|counseled|informed)[^\n]+(?:prognosis|disease|treatment)/i,
      /(?:palliative|best\s*supportive|comfort)[^\n]+(?:care|intent|measures)/i,
    ],
    keywords: ['prognosis', 'survival', 'outcome', 'explained', 'counseled', 'palliative', 'supportive care'],
    subspecialty: 'palliative-care',
    extractionPriority: 4,
  },
};

// Detect which subspecialty content is present in the document
export function detectSubspecialtyContent(text: string): SubspecialtyContent[] {
  const detectedContent: SubspecialtyContent[] = [];
  const normalizedText = text.toLowerCase();
  
  for (const [contentType, config] of Object.entries(SUBSPECIALTY_CONTENT_PATTERNS)) {
    let matchScore = 0;
    
    // Check patterns
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        matchScore += 2;
      }
    }
    
    // Check keywords
    for (const keyword of config.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchScore += 1;
      }
    }
    
    // Threshold: need at least 2 pattern matches or 3 keywords
    if (matchScore >= 3) {
      detectedContent.push(contentType as SubspecialtyContent);
    }
  }
  
  return detectedContent;
}

// Determine if document is composite (contains multiple subspecialty data)
export function isCompositeDocument(containsContent: SubspecialtyContent[]): boolean {
  // A document is composite if it contains content from 3+ different areas
  // or if it contains certain combinations
  
  if (containsContent.length >= 3) return true;
  
  // Specific composite patterns
  const hasPathology = containsContent.includes('pathology-summary') || containsContent.includes('staging-info');
  const hasTreatment = containsContent.includes('treatment-history') || containsContent.includes('medications');
  const hasRadiology = containsContent.includes('radiology-summary');
  const hasFollowUp = containsContent.includes('follow-up-plan');
  
  // OPD prescription pattern: diagnosis + treatment + plan
  if (hasPathology && hasTreatment && hasFollowUp) return true;
  
  // Comprehensive note: staging + radiology + treatment
  if (containsContent.includes('staging-info') && hasRadiology && hasTreatment) return true;
  
  return false;
}

// Extract sections for each detected subspecialty content
export function extractSections(
  text: string, 
  containsContent: SubspecialtyContent[]
): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const lines = text.split('\n');
  
  for (const contentType of containsContent) {
    const config = SUBSPECIALTY_CONTENT_PATTERNS[contentType];
    const relevantLines: string[] = [];
    let confidence = 0;
    
    // Extract lines matching patterns
    for (const line of lines) {
      let lineMatches = false;
      
      for (const pattern of config.patterns) {
        if (pattern.test(line)) {
          relevantLines.push(line);
          lineMatches = true;
          confidence += 0.2;
          break;
        }
      }
      
      // Also check keywords if line didn't match patterns
      if (!lineMatches) {
        const lowerLine = line.toLowerCase();
        for (const keyword of config.keywords) {
          if (lowerLine.includes(keyword.toLowerCase())) {
            // Only include if line has substantial content
            if (line.trim().length > 20) {
              relevantLines.push(line);
              confidence += 0.1;
            }
            break;
          }
        }
      }
    }
    
    if (relevantLines.length > 0) {
      sections.push({
        contentType,
        text: relevantLines.join('\n').trim(),
        confidence: Math.min(confidence, 1),
        subspecialty: config.subspecialty,
      });
    }
  }
  
  // Sort by extraction priority
  sections.sort((a, b) => {
    const priorityA = SUBSPECIALTY_CONTENT_PATTERNS[a.contentType].extractionPriority;
    const priorityB = SUBSPECIALTY_CONTENT_PATTERNS[b.contentType].extractionPriority;
    return priorityB - priorityA;
  });
  
  return sections;
}

// Build enhanced classification with multi-label support
export function buildDocumentClassification(
  primaryType: DocumentType,
  primaryConfidence: number,
  text: string
): DocumentClassification {
  const containsContent = detectSubspecialtyContent(text);
  const isComposite = isCompositeDocument(containsContent);
  
  const classification: DocumentClassification = {
    primaryType,
    primaryConfidence,
    containsContent,
    isComposite,
  };
  
  // Extract sections for composite documents
  if (isComposite) {
    classification.extractedSections = extractSections(text, containsContent);
    
    // Generate classification reason
    const contentLabels = containsContent.map(c => c.replace(/-/g, ' ')).join(', ');
    classification.classificationReason = 
      `Composite document (${primaryType}) containing: ${contentLabels}`;
  }
  
  return classification;
}

// Merge extracted data from composite document sections
export function mergeExtractedData(
  baseData: ExtractedClinicalData,
  sections: ExtractedSection[]
): ExtractedClinicalData {
  const merged = { ...baseData };
  
  for (const section of sections) {
    // Extract structured data based on section type
    switch (section.contentType) {
      case 'pathology-summary':
        // Try to extract IHC markers
        const erMatch = section.text.match(/er\s*[:\s]?\s*([+-]|positive|negative)/i);
        const prMatch = section.text.match(/pr\s*[:\s]?\s*([+-]|positive|negative)/i);
        const her2Match = section.text.match(/her2\s*[:\s]?\s*([+-]|positive|negative|\d\+)/i);
        
        if (erMatch || prMatch || her2Match) {
          merged.ihcMarkers = merged.ihcMarkers || {};
          if (erMatch) merged.ihcMarkers['ER'] = erMatch[1];
          if (prMatch) merged.ihcMarkers['PR'] = prMatch[1];
          if (her2Match) merged.ihcMarkers['HER2'] = her2Match[1];
        }
        
        // Extract grade
        const gradeMatch = section.text.match(/grade\s*[:\s]?\s*([123]|i{1,3}|well|moderate|poor)/i);
        if (gradeMatch) {
          merged.grade = gradeMatch[1];
        }
        break;
        
      case 'radiology-summary':
        // Extract findings
        const findingsMatch = section.text.match(/(?:findings?|impression)[:\s]+([^\n]+)/i);
        if (findingsMatch) {
          merged.findings = merged.findings || [];
          merged.findings.push(findingsMatch[1].trim());
        }
        break;
        
      case 'staging-info':
        // Extract TNM
        const tnmMatch = section.text.match(/t([0-4][abc]?)\s*n([0-3][abc]?)\s*m([01x])/i);
        if (tnmMatch) {
          merged.rawText = merged.rawText || '';
          merged.rawText += `\nTNM: T${tnmMatch[1]}N${tnmMatch[2]}M${tnmMatch[3]}`;
        }
        break;
        
      case 'lab-values':
        // Extract common lab values
        const labPatterns = [
          { name: 'Hemoglobin', pattern: /(?:hb|hemoglobin|hgb)[^\d]*(\d+\.?\d*)\s*(g\/dl|gm%)?/i, unit: 'g/dL' },
          { name: 'TLC', pattern: /(?:tlc|wbc)[^\d]*(\d+\.?\d*)/i, unit: '/cumm' },
          { name: 'Platelets', pattern: /(?:platelet|plt)[^\d]*(\d+\.?\d*)/i, unit: 'lakhs/cumm' },
          { name: 'Creatinine', pattern: /creatinine[^\d]*(\d+\.?\d*)/i, unit: 'mg/dL' },
        ];
        
        merged.labValues = merged.labValues || [];
        for (const lab of labPatterns) {
          const match = section.text.match(lab.pattern);
          if (match) {
            merged.labValues.push({
              test: lab.name,
              value: match[1],
              unit: match[2] || lab.unit,
            });
          }
        }
        break;
    }
  }
  
  return merged;
}

// Get display label for subspecialty content
export function getSubspecialtyContentLabel(content: SubspecialtyContent): string {
  const labels: Record<SubspecialtyContent, string> = {
    'pathology-summary': 'Pathology Summary',
    'radiology-summary': 'Imaging Findings',
    'staging-info': 'Staging Information',
    'treatment-history': 'Treatment History',
    'surgery-summary': 'Surgery Details',
    'lab-values': 'Lab Results',
    'medications': 'Medications',
    'genomic-findings': 'Genomic Results',
    'follow-up-plan': 'Follow-up Plan',
    'prognosis-discussion': 'Prognosis Notes',
  };
  return labels[content] || content;
}

// Get subspecialty for content type
export function getSubspecialtyForContent(content: SubspecialtyContent): string {
  return SUBSPECIALTY_CONTENT_PATTERNS[content]?.subspecialty || 'general';
}
