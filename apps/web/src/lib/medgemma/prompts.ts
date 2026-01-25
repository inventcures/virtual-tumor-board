/**
 * MedGemma Analysis Prompts
 * Specialized prompts for different imaging modalities
 */

export const IMAGING_ANALYSIS_PROMPTS = {
  // Chest X-ray Analysis
  CXR: `You are an expert radiologist analyzing a chest X-ray image.

Analyze this chest X-ray and provide a structured report including:

1. TECHNICAL QUALITY
- Image quality assessment
- Patient positioning
- Any technical limitations

2. FINDINGS (be systematic)
- Lungs: parenchyma, pleura, costophrenic angles
- Heart: size, contour, mediastinum
- Bones: ribs, spine, clavicles
- Soft tissues
- Lines/tubes if present

3. MEASUREMENTS (if abnormalities found)
- Lesion dimensions in mm
- Cardiothoracic ratio if relevant
- Precise anatomical location

4. IMPRESSION
- Summary of key findings
- Differential diagnosis
- Urgency level (routine/urgent/emergent)

5. RECOMMENDATIONS
- Suggested follow-up imaging
- Clinical correlation needed

Format your response with clear section headers.`,

  // CT Analysis (general)
  CT: `You are an expert radiologist analyzing a CT scan image.

Analyze this CT image and provide a structured report:

1. FINDINGS
- Describe all visible abnormalities
- Note normal structures as appropriate
- Provide precise anatomical locations

2. MEASUREMENTS (for any lesions)
- Long axis and short axis in mm
- Precise anatomical location (lobe, segment, etc.)
- Note if lesion meets RECIST criteria (>10mm for solid tumors, >15mm short axis for lymph nodes)

3. COMPARISON (if prior study mentioned)
- Size change from prior
- New findings
- Resolved findings

4. IMPRESSION
- Key findings summary
- Staging implications if oncology relevant
- Differential diagnosis if applicable

5. RECOMMENDATIONS
- Follow-up imaging suggestions
- Additional tests if needed

Format your response with clear section headers.`,

  // Mammogram Analysis
  MAMMO: `You are an expert breast radiologist analyzing a mammogram.

Analyze this mammogram and provide:

1. BREAST COMPOSITION (BI-RADS density)
- A: Fatty
- B: Scattered fibroglandular
- C: Heterogeneously dense
- D: Extremely dense

2. FINDINGS
- Masses: size, shape, margins, density
- Calcifications: morphology, distribution
- Asymmetries: focal, global, developing
- Architectural distortion
- Associated features

3. MEASUREMENTS
- Size of any masses in mm
- Location using clock position and distance from nipple

4. BI-RADS ASSESSMENT
- Category 0-6 with justification

5. RECOMMENDATIONS
- Follow-up imaging
- Biopsy recommendation if indicated

Format your response with clear section headers.`,

  // RECIST Comparison
  RECIST_COMPARISON: `You are an expert radiologist performing RECIST 1.1 response assessment.

Compare the current study with baseline:

1. TARGET LESIONS
- Identify each target lesion from baseline
- Measure current longest diameter (mm)
- Calculate percent change from baseline

2. SUM OF DIAMETERS
- Calculate sum of longest diameters for all targets
- Compare to baseline sum
- Calculate percent change

3. NON-TARGET LESIONS
- Assess for progression (unequivocal increase)
- Note any complete response

4. NEW LESIONS
- Identify any new lesions (indicates PD)

5. RESPONSE CATEGORY
- Complete Response (CR): Disappearance of all target lesions
- Partial Response (PR): >=30% decrease in sum of diameters
- Progressive Disease (PD): >=20% increase AND >=5mm absolute increase, or new lesions
- Stable Disease (SD): Neither PR nor PD

6. OVERALL ASSESSMENT
- Target lesion response
- Non-target assessment
- New lesions
- OVERALL RESPONSE

Format your response with clear section headers.`,

  // Oncology-focused prompt addition
  ONCOLOGY_CONTEXT: `
Focus specifically on oncology-relevant findings:
- Primary tumor: size, location, local extent
- Lymph nodes: size (short axis), location, suspicious features
- Metastatic disease: organ involvement, number of lesions
- Treatment-related changes: post-surgical, post-radiation
- Complications: obstruction, compression, effusions

For staging, consider TNM classification when applicable.
Note any findings that would change clinical management.`,
};

/**
 * Build a complete prompt for image analysis
 */
export function buildAnalysisPrompt(
  modality: string,
  bodyPart: string,
  context?: {
    cancerType?: string;
    priorStudyDate?: string;
    clinicalQuestion?: string;
    isOncology?: boolean;
  }
): string {
  // Select base prompt
  let prompt: string;
  
  switch (modality?.toUpperCase()) {
    case 'CR':
    case 'DX':
      prompt = IMAGING_ANALYSIS_PROMPTS.CXR;
      break;
    case 'MG':
      prompt = IMAGING_ANALYSIS_PROMPTS.MAMMO;
      break;
    default:
      prompt = IMAGING_ANALYSIS_PROMPTS.CT;
  }

  // Add body part context
  prompt = prompt.replace(/CT scan/g, `CT ${bodyPart || 'scan'}`);

  // Add oncology context if relevant
  if (context?.isOncology || context?.cancerType) {
    prompt += '\n\n' + IMAGING_ANALYSIS_PROMPTS.ONCOLOGY_CONTEXT;
    
    if (context.cancerType) {
      prompt += `\n\nPatient has known ${context.cancerType}. Assess for disease extent and treatment response.`;
    }
  }

  // Add clinical question
  if (context?.clinicalQuestion) {
    prompt += `\n\nCLINICAL QUESTION: ${context.clinicalQuestion}`;
  }

  // Add comparison context
  if (context?.priorStudyDate) {
    prompt += `\n\nCOMPARISON: Prior study dated ${context.priorStudyDate}. Assess for interval change.`;
  }

  return prompt;
}
