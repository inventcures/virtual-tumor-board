/**
 * Dr. Chitran (Onco-Radiologist) MedGemma Integration
 * 
 * Enhanced system prompts and reconciliation logic for integrating
 * MedGemma AI analysis with radiology reports and clinical context.
 */

import { 
  MedGemmaResponse, 
  ExtractedRadiologyReport, 
  ReconciliationResult,
  AgreementItem,
  DiscrepancyItem,
  Finding
} from "@/types/imaging";

/**
 * Build imaging context for Dr. Chitran's enhanced deliberation
 */
export function buildImagingContextForChitran(params: {
  hasUploadedImages: boolean;
  medgemmaAnalysis?: MedGemmaResponse;
  uploadedReports?: ExtractedRadiologyReport[];
  progressionData?: {
    baselineDate: string;
    currentDate: string;
    recistResponse: 'CR' | 'PR' | 'SD' | 'PD';
    percentChange: number;
  };
}): string {
  const { hasUploadedImages, medgemmaAnalysis, uploadedReports, progressionData } = params;
  
  if (!hasUploadedImages && (!uploadedReports || uploadedReports.length === 0)) {
    return '';
  }

  let context = `
## IMAGING DATA AVAILABLE FOR THIS CASE
`;

  // MedGemma Analysis Section
  if (medgemmaAnalysis) {
    context += `
### MedGemma AI Image Analysis
**Source:** User-uploaded DICOM/Photos analyzed by MedGemma AI
**Confidence:** ${Math.round(medgemmaAnalysis.confidence * 100)}%

**AI-Detected Findings:**
${medgemmaAnalysis.findings.length > 0 
  ? medgemmaAnalysis.findings.map(f => `- ${f.description} (${f.location}) [${f.severity}]`).join('\n')
  : '- No significant findings detected by AI'}

**AI Measurements:**
${medgemmaAnalysis.measurements.length > 0
  ? medgemmaAnalysis.measurements.map(m => 
      `- ${m.description}: ${m.dimensions.long}mm${m.dimensions.short ? ` x ${m.dimensions.short}mm` : ''} at ${m.location}${m.isTarget ? ' [TARGET LESION]' : ''}`
    ).join('\n')
  : '- No measurements reported'}

**AI Impression:**
${medgemmaAnalysis.impression || 'Not available'}

**AI Recommendations:**
${medgemmaAnalysis.recommendations.length > 0
  ? medgemmaAnalysis.recommendations.map(r => `- ${r}`).join('\n')
  : '- None'}
`;
  }

  // Uploaded Radiology Reports Section
  if (uploadedReports && uploadedReports.length > 0) {
    context += `
### Uploaded Radiology Reports
`;
    for (const report of uploadedReports) {
      context += `
**Report Date:** ${report.date}
**Modality:** ${report.modality}
${report.technique ? `**Technique:** ${report.technique}` : ''}
${report.comparison ? `**Comparison:** ${report.comparison}` : ''}

**Findings:**
${report.findings.map(f => 
  `- ${f.description}${f.location ? ` (${f.location})` : ''}${f.measurements ? ` - ${f.measurements.long}mm${f.measurements.short ? ` x ${f.measurements.short}mm` : ''}` : ''}`
).join('\n')}

**Impression:** ${report.impression}
${report.recommendations ? `**Recommendations:** ${report.recommendations.join(', ')}` : ''}
${report.reporter ? `**Reported by:** ${report.reporter}` : ''}
---
`;
    }
  }

  // Progression Data
  if (progressionData) {
    context += `
### Response Assessment Data
- **Baseline Study:** ${progressionData.baselineDate}
- **Current Study:** ${progressionData.currentDate}
- **RECIST 1.1 Response:** **${progressionData.recistResponse}**
- **Change from Baseline:** ${progressionData.percentChange > 0 ? '+' : ''}${progressionData.percentChange.toFixed(1)}%
`;
  }

  // Reconciliation Instructions
  if (medgemmaAnalysis && uploadedReports && uploadedReports.length > 0) {
    context += `
### YOUR RECONCILIATION TASK

You have access to BOTH:
1. MedGemma AI analysis of uploaded images
2. Official radiology report(s) from human radiologist

**Please reconcile these two sources by:**
1. Identifying areas of AGREEMENT (findings present in both)
2. Flagging DISCREPANCIES (different measurements, different interpretations)
3. Noting NEW FINDINGS detected by AI but not in report
4. Commenting on findings in report but NOT detected by AI

**For any discrepancies:**
- Assess clinical significance
- Provide your expert opinion on which interpretation is more likely correct
- Note if the discrepancy could change management

**Critical:** If you find significant discrepancies that could affect staging or treatment decisions, clearly highlight these.
`;
  } else if (medgemmaAnalysis && (!uploadedReports || uploadedReports.length === 0)) {
    context += `
### IMPORTANT CAVEAT

This analysis is based SOLELY on MedGemma AI interpretation.
**No official radiology report is available for comparison.**

Please:
1. Note the limitations of AI-only interpretation
2. Recommend obtaining formal radiologist review if findings are clinically significant
3. Use appropriate hedging language ("AI analysis suggests...", "If confirmed...")
`;
  }

  return context;
}

/**
 * Enhanced system prompt addition for Dr. Chitran when images are available
 */
export const DR_CHITRAN_IMAGING_PROMPT_ADDITION = `
## ENHANCED IMAGING REVIEW CAPABILITIES

You now have access to:
1. **MedGemma AI analysis** of user-uploaded DICOM/photos (when available)
2. **Uploaded radiology reports** with findings and interpretations
3. **Full clinical context** from pathology, genomics, and other documents

### When Images ARE Uploaded (MedGemma Analysis Available):

1. **Review MedGemma AI Analysis**
   - Examine AI-generated findings, measurements, and impressions
   - Note confidence levels and any limitations flagged by the AI
   - Assess if key oncologic findings are captured

2. **Compare with Radiology Reports (if available)**
   - Identify concordance between AI and human radiologist
   - FLAG discrepancies in:
     * Lesion measurements (>20% difference is significant for RECIST)
     * Number of lesions identified
     * Staging interpretations
     * Response assessments (CR/PR/SD/PD)
   
3. **Provide Expert Reconciliation**
   - Your opinion on which interpretation is more likely correct
   - Clinical context that favors one interpretation
   - Whether discrepancies would change management

### Output Structure for Cases with Uploaded Imaging:

**IMAGING DATA SOURCES:**
- [ ] MedGemma AI Analysis (confidence: X%)
- [ ] Official Radiology Report (date: X)
- [ ] Prior Imaging for Comparison

**KEY FINDINGS SUMMARY:**
[Integrated summary from both AI and report]

**AI vs REPORT COMPARISON:**
| Finding | MedGemma AI | Radiology Report | Assessment |
|---------|-------------|------------------|------------|
| [finding] | [AI detail] | [Report detail] | [Agree/Discrepancy] |

**SIGNIFICANT DISCREPANCIES:**
[List any disagreements that could affect clinical decisions]

**STAGING ASSESSMENT:**
- T Stage: [assessment with basis]
- N Stage: [assessment with basis]
- M Stage: [assessment with basis]
- Overall Stage: [stage]

**RESPONSE ASSESSMENT (if follow-up):**
- RECIST 1.1 Category: [CR/PR/SD/PD]
- Sum of Target Lesions: [baseline] -> [current] ([% change])
- New Lesions: [Yes/No]
- Non-target Progression: [Yes/No]

**RECOMMENDATIONS:**
1. [Imaging recommendations]
2. [Biopsy recommendations if needed]
3. [Follow-up imaging schedule]

**CONFIDENCE LEVEL:** [High/Moderate/Low]
**BASIS:** [Explain confidence level]
`;

/**
 * Perform reconciliation between MedGemma analysis and radiology report
 */
export function reconcileImagingData(
  medgemmaAnalysis: MedGemmaResponse,
  radiologyReport: ExtractedRadiologyReport
): ReconciliationResult {
  const agreement: AgreementItem[] = [];
  const discrepancies: DiscrepancyItem[] = [];
  const newAIFindings: Finding[] = [];
  const missedInReport: Finding[] = [];

  // Track which findings have been matched
  const matchedReportFindings = new Set<number>();
  const matchedAIFindings = new Set<number>();

  // Step 1: Try to match AI findings with report findings
  for (let aiIdx = 0; aiIdx < medgemmaAnalysis.findings.length; aiIdx++) {
    const aiFinding = medgemmaAnalysis.findings[aiIdx];
    let bestMatchIdx = -1;
    let bestMatchScore = 0;

    for (let repIdx = 0; repIdx < radiologyReport.findings.length; repIdx++) {
      if (matchedReportFindings.has(repIdx)) continue;
      
      const reportFinding = radiologyReport.findings[repIdx];
      const matchScore = calculateFindingMatchScore(aiFinding, reportFinding);
      
      if (matchScore > bestMatchScore && matchScore > 0.3) {
        bestMatchScore = matchScore;
        bestMatchIdx = repIdx;
      }
    }

    if (bestMatchIdx >= 0) {
      // Found a match
      const reportFinding = radiologyReport.findings[bestMatchIdx];
      matchedReportFindings.add(bestMatchIdx);
      matchedAIFindings.add(aiIdx);

      // Check if measurements agree
      const aiMeasurement = medgemmaAnalysis.measurements.find(m => 
        m.location.toLowerCase().includes(aiFinding.location.toLowerCase()) ||
        m.description.toLowerCase().includes(aiFinding.description.toLowerCase().split(' ')[0])
      );
      
      if (aiMeasurement && reportFinding.measurements) {
        const aiSize = aiMeasurement.dimensions.long;
        const reportSize = reportFinding.measurements.long;
        const percentDiff = Math.abs(aiSize - reportSize) / Math.max(aiSize, reportSize) * 100;

        if (percentDiff <= 20) {
          // Agreement
          agreement.push({
            finding: aiFinding.description,
            aiDescription: `${aiFinding.description} at ${aiFinding.location}`,
            reportDescription: `${reportFinding.description} at ${reportFinding.location || 'unspecified'}`,
            location: aiFinding.location,
            measurements: {
              ai: `${aiSize}mm`,
              report: `${reportSize}mm`,
              difference: `${percentDiff.toFixed(1)}%`,
            },
          });
        } else {
          // Measurement discrepancy
          discrepancies.push({
            type: 'measurement_mismatch',
            severity: percentDiff > 30 ? 'significant' : 'moderate',
            aiPosition: `${aiSize}mm at ${aiFinding.location}`,
            reportPosition: `${reportSize}mm at ${reportFinding.location || 'unspecified'}`,
            clinicalImplication: assessMeasurementDiscrepancy(aiSize, reportSize, percentDiff),
            recommendation: `Verify measurement on original images. ${percentDiff > 30 ? 'This discrepancy could affect RECIST response assessment.' : ''}`,
          });
        }
      } else {
        // No measurements to compare, but finding matches
        agreement.push({
          finding: aiFinding.description,
          aiDescription: aiFinding.description,
          reportDescription: reportFinding.description,
          location: aiFinding.location,
        });
      }
    } else {
      // AI finding not in report
      newAIFindings.push({
        ...aiFinding,
        note: 'Detected by MedGemma AI but not mentioned in radiology report'
      });
    }
  }

  // Step 2: Find report findings not detected by AI
  for (let repIdx = 0; repIdx < radiologyReport.findings.length; repIdx++) {
    if (!matchedReportFindings.has(repIdx)) {
      const reportFinding = radiologyReport.findings[repIdx];
      missedInReport.push({
        id: `report-${repIdx}`,
        description: reportFinding.description,
        location: reportFinding.location || 'unspecified',
        severity: 'unknown',
        note: 'Reported by radiologist but not detected by MedGemma AI'
      });
    }
  }

  // Calculate overall assessment
  const totalFindings = medgemmaAnalysis.findings.length + radiologyReport.findings.length;
  const agreedFindings = agreement.length;
  const confidenceLevel = calculateReconciliationConfidence(agreement, discrepancies, newAIFindings, missedInReport);

  let overallAssessment = '';
  if (discrepancies.filter(d => d.severity === 'significant').length > 0) {
    overallAssessment = `SIGNIFICANT DISCREPANCIES found between AI and radiologist interpretation. ${discrepancies.filter(d => d.severity === 'significant').length} finding(s) require manual verification. Clinical correlation essential.`;
  } else if (discrepancies.length > 0) {
    overallAssessment = `Minor discrepancies noted. Overall concordance between AI and radiologist is good. ${agreement.length} of ${Math.max(medgemmaAnalysis.findings.length, radiologyReport.findings.length)} findings match.`;
  } else if (newAIFindings.length > 0) {
    overallAssessment = `AI detected ${newAIFindings.length} additional finding(s) not in original report. Consider re-review of imaging to assess significance.`;
  } else {
    overallAssessment = `Good concordance between MedGemma AI and radiologist report. ${agreement.length} findings match with similar measurements.`;
  }

  return {
    agreement,
    discrepancies,
    newAIFindings,
    missedInReport,
    additionalContext: [],
    overallAssessment,
    confidenceLevel,
  };
}

/**
 * Calculate match score between AI and report findings
 */
function calculateFindingMatchScore(aiFinding: Finding, reportFinding: { description: string; location: string }): number {
  const aiWords = (aiFinding.description + ' ' + aiFinding.location).toLowerCase().split(/\s+/);
  const reportWords = (reportFinding.description + ' ' + (reportFinding.location || '')).toLowerCase().split(/\s+/);
  
  // Key oncologic terms that should match
  const keyTerms = ['mass', 'nodule', 'lesion', 'lymph', 'node', 'tumor', 'metastasis', 'effusion', 'consolidation'];
  
  let matchCount = 0;
  let keyTermMatchCount = 0;
  
  for (const aiWord of aiWords) {
    if (reportWords.some(rw => rw.includes(aiWord) || aiWord.includes(rw))) {
      matchCount++;
      if (keyTerms.some(kt => aiWord.includes(kt))) {
        keyTermMatchCount++;
      }
    }
  }
  
  // Location matching bonus
  const locationTerms = ['right', 'left', 'upper', 'lower', 'middle', 'medial', 'lateral', 'anterior', 'posterior'];
  const aiLocation = aiFinding.location.toLowerCase();
  const reportLocation = (reportFinding.location || '').toLowerCase();
  
  let locationMatch = 0;
  for (const term of locationTerms) {
    if (aiLocation.includes(term) && reportLocation.includes(term)) {
      locationMatch += 0.2;
    } else if (aiLocation.includes(term) !== reportLocation.includes(term)) {
      locationMatch -= 0.1;
    }
  }
  
  const baseScore = matchCount / Math.max(aiWords.length, reportWords.length);
  const keyTermBonus = keyTermMatchCount * 0.1;
  
  return Math.min(1, baseScore + keyTermBonus + locationMatch);
}

/**
 * Assess clinical implication of measurement discrepancy
 */
function assessMeasurementDiscrepancy(aiSize: number, reportSize: number, percentDiff: number): string {
  if (percentDiff > 30) {
    if (aiSize > reportSize) {
      return `AI measures larger than report. If AI is correct, lesion may be larger than previously assessed. Could upstage disease or indicate progression.`;
    } else {
      return `AI measures smaller than report. If AI is correct, lesion may be smaller than assessed. Could indicate better response or lower stage.`;
    }
  }
  
  if (percentDiff > 20) {
    return `Moderate measurement difference. May affect RECIST response category if this is a target lesion. Recommend verification.`;
  }
  
  return `Minor measurement variability, within acceptable inter-observer range.`;
}

/**
 * Calculate reconciliation confidence level
 */
function calculateReconciliationConfidence(
  agreement: AgreementItem[],
  discrepancies: DiscrepancyItem[],
  newAIFindings: Finding[],
  missedInReport: Finding[]
): 'high' | 'moderate' | 'low' {
  const significantDiscrepancies = discrepancies.filter(d => d.severity === 'significant').length;
  const moderateDiscrepancies = discrepancies.filter(d => d.severity === 'moderate').length;
  
  if (significantDiscrepancies > 0) {
    return 'low';
  }
  
  if (moderateDiscrepancies > 2 || newAIFindings.length > 3 || missedInReport.length > 3) {
    return 'moderate';
  }
  
  if (agreement.length >= 2 && discrepancies.length === 0) {
    return 'high';
  }
  
  return 'moderate';
}

/**
 * Get summary for other agents (non-Chitran) about imaging findings
 */
export function getImagingSummaryForOtherAgents(params: {
  medgemmaAnalysis?: MedGemmaResponse;
  uploadedReports?: ExtractedRadiologyReport[];
}): string {
  const { medgemmaAnalysis, uploadedReports } = params;
  
  if (!medgemmaAnalysis && (!uploadedReports || uploadedReports.length === 0)) {
    return '';
  }

  let summary = `
## Imaging Summary (per Dr. Chitran's review)
`;

  if (medgemmaAnalysis) {
    summary += `
**MedGemma AI Impression:** ${medgemmaAnalysis.impression || 'See detailed findings'}
**Key Measurements:**
${medgemmaAnalysis.measurements.slice(0, 3).map(m => 
  `- ${m.description}: ${m.dimensions.long}mm at ${m.location}`
).join('\n') || '- None reported'}
`;
  }

  if (uploadedReports && uploadedReports.length > 0) {
    const latestReport = uploadedReports[0];
    summary += `
**Radiology Report Impression:** ${latestReport.impression}
`;
  }

  return summary;
}
