import { NextRequest } from "next/server";
import { 
  getCachedDeliberation, 
  streamCachedDeliberation,
  streamV18Deliberation,
  isCaseCached,
  cacheDeliberation,
  CachedDeliberation,
  CachedAgentResponse
} from "@/lib/deliberation-cache";
import { getCaseById, SampleCase } from "@/lib/sample-cases";
import { callAI, getAvailableProviders } from "@/lib/ai-service";

export const runtime = "edge";

// Agent configurations for AI generation - DETAILED PROMPTS for 3/4 page minimum responses
const AGENT_CONFIGS = [
  { 
    id: "surgical-oncologist", 
    name: "Dr. Shalya", 
    specialty: "Surgical Oncology", 
    prompt: `Provide a COMPREHENSIVE surgical oncology assessment (minimum 600 words) covering:

1. **RESECTABILITY ASSESSMENT**
   - Detailed anatomical considerations for this specific tumor location
   - Technical feasibility of R0 resection
   - Vascular/organ involvement concerns

2. **PATIENT OPERABILITY**
   - Performance status interpretation for surgical candidacy
   - Comorbidity impact on surgical risk (specific to this patient)
   - Pre-operative optimization recommendations

3. **SURGICAL APPROACH RECOMMENDATION**
   - Specific procedure recommended with rationale
   - Open vs minimally invasive considerations
   - Extent of resection (margins, lymphadenectomy)
   - Reconstruction needs if applicable

4. **TIMING & SEQUENCING**
   - Upfront surgery vs neoadjuvant therapy decision
   - If neoadjuvant: criteria for reassessment
   - Window for surgery relative to other treatments

5. **TECHNICAL DETAILS**
   - Specific surgical technique considerations
   - Intraoperative considerations
   - Expected operative time and complexity

6. **GUIDELINE CITATIONS**
   - Cite SSO, NCCN surgical recommendations specifically
   - Evidence level for recommendations

7. **INDIAN HEALTHCARE CONTEXT**
   - Availability of this procedure at different center tiers
   - Cost estimates for surgery
   - Post-operative care requirements and logistics`
  },
  { 
    id: "medical-oncologist", 
    name: "Dr. Chikitsa", 
    specialty: "Medical Oncology", 
    prompt: `Provide a COMPREHENSIVE medical oncology assessment (minimum 600 words) covering:

1. **BIOMARKER INTERPRETATION**
   - Detailed analysis of each biomarker and its therapeutic implications
   - Actionable vs prognostic significance
   - Any additional testing recommended

2. **SYSTEMIC THERAPY RECOMMENDATION**
   - First-line regimen with specific drugs, doses, schedule
   - Rationale for this selection over alternatives
   - Expected efficacy (response rates, PFS, OS data)

3. **TREATMENT SEQUENCING**
   - Role of neoadjuvant vs adjuvant vs palliative intent
   - Duration of therapy
   - Maintenance therapy considerations

4. **TARGETED/IMMUNOTHERAPY OPTIONS**
   - Specific agents based on biomarkers
   - Combination strategies if applicable
   - Sequencing of targeted agents

5. **TOXICITY MANAGEMENT**
   - Expected side effects of recommended regimen
   - Monitoring parameters
   - Dose modification guidelines

6. **RESPONSE ASSESSMENT PLAN**
   - Timing and modality of response evaluation
   - Criteria for continuing vs changing therapy

7. **GUIDELINE CITATIONS**
   - Cite NCCN, ESMO recommendations with categories
   - Key clinical trial data supporting recommendations

8. **INDIAN HEALTHCARE CONTEXT**
   - Drug availability in India (branded vs generic)
   - Cost per cycle and total treatment cost
   - PMJAY coverage status
   - Patient assistance programs available
   - Biosimilar options if applicable`
  },
  { 
    id: "radiation-oncologist", 
    name: "Dr. Kirann", 
    specialty: "Radiation Oncology", 
    prompt: `Provide a COMPREHENSIVE radiation oncology assessment (minimum 600 words) covering:

1. **RT INDICATION ASSESSMENT**
   - Is radiation indicated for this case? Why/why not?
   - Definitive vs adjuvant vs palliative intent
   - Expected benefit of RT in this setting

2. **TREATMENT TECHNIQUE**
   - Recommended technique (3D-CRT, IMRT, VMAT, SBRT, protons)
   - Rationale for technique selection
   - Image guidance requirements (IGRT, CBCT)

3. **DOSE PRESCRIPTION**
   - Total dose and fractionation scheme
   - Dose per fraction rationale
   - Treatment duration

4. **TARGET VOLUMES**
   - GTV, CTV, PTV definitions for this case
   - Elective nodal coverage decisions
   - Margins and their rationale

5. **ORGANS AT RISK**
   - Critical OARs for this treatment site
   - Dose constraints to be respected
   - Expected acute and late toxicities

6. **TIMING & SEQUENCING**
   - Optimal timing relative to surgery/chemotherapy
   - Concurrent vs sequential chemo-RT decision
   - Treatment breaks considerations

7. **GUIDELINE CITATIONS**
   - Cite ASTRO, ESTRO, NCCN RT recommendations
   - Evidence level and key trials

8. **INDIAN HEALTHCARE CONTEXT**
   - LINAC availability considerations
   - Technique availability (IMRT vs 3D-CRT)
   - Wait times at different centers
   - Cost of RT course
   - Travel logistics for daily treatment`
  },
  { 
    id: "palliative-care", 
    name: "Dr. Shanti", 
    specialty: "Palliative Care", 
    prompt: `Provide a COMPREHENSIVE palliative care assessment (minimum 600 words) covering:

1. **PERFORMANCE STATUS ASSESSMENT**
   - Detailed interpretation of ECOG and functional status
   - Trajectory assessment
   - Fitness for proposed treatments

2. **SYMPTOM ASSESSMENT & MANAGEMENT**
   - Anticipated symptoms based on disease and treatment
   - Specific management recommendations for each symptom
   - Medications with doses

3. **QUALITY OF LIFE CONSIDERATIONS**
   - Impact of proposed treatments on QoL
   - Trade-offs between efficacy and toxicity
   - Patient preferences exploration

4. **GOALS OF CARE DISCUSSION**
   - Recommended approach to goals conversation
   - Treatment intent clarification
   - Advance care planning recommendations

5. **PSYCHOSOCIAL SUPPORT**
   - Patient emotional support needs
   - Family/caregiver support
   - Spiritual care considerations

6. **NUTRITIONAL SUPPORT**
   - Nutritional assessment
   - Dietary recommendations
   - Supplementation if needed

7. **PROGNOSTIC COMMUNICATION**
   - How to discuss prognosis with patient/family
   - Realistic expectations setting

8. **SUPPORTIVE CARE DURING TREATMENT**
   - Anti-emetic protocols
   - Growth factor support
   - Other supportive medications

9. **INDIAN HEALTHCARE CONTEXT**
   - Family dynamics in Indian setting
   - Caregiver identification and education
   - Home care options
   - Financial counseling needs
   - Palliative care service availability`
  },
  { 
    id: "radiologist", 
    name: "Dr. Chitran", 
    specialty: "Onco-Radiology", 
    prompt: `Provide a COMPREHENSIVE radiology assessment (minimum 600 words) covering:

1. **STAGING COMPLETENESS ASSESSMENT**
   - Review of imaging performed
   - Gaps in staging workup
   - Additional imaging recommended

2. **PRIMARY TUMOR CHARACTERIZATION**
   - Size, location, morphology
   - Local invasion assessment
   - Resectability from imaging perspective

3. **NODAL ASSESSMENT**
   - Regional nodes involved
   - Size criteria and morphology
   - Pathologic vs reactive differentiation

4. **METASTATIC WORKUP**
   - Sites evaluated
   - Distant metastases present/absent
   - Indeterminate findings requiring follow-up

5. **STAGING CONFIRMATION**
   - Confirm/refine clinical stage based on imaging
   - TNM breakdown with imaging rationale
   - AJCC edition used

6. **IMAGING FOR TREATMENT PLANNING**
   - RT simulation imaging needs
   - Surgical planning imaging
   - Interventional procedures needed (biopsy, etc.)

7. **RESPONSE ASSESSMENT PLAN**
   - RECIST 1.1 applicability
   - Baseline measurements
   - Timing of response imaging
   - Modality for follow-up

8. **GUIDELINE CITATIONS**
   - ACR Appropriateness Criteria references
   - NCCN imaging recommendations

9. **INDIAN HEALTHCARE CONTEXT**
   - Availability of advanced imaging (PET-CT, MRI)
   - Cost considerations
   - Government vs private facility options
   - Turnaround times`
  },
  { 
    id: "pathologist", 
    name: "Dr. Marga", 
    specialty: "Pathology", 
    prompt: `Provide a COMPREHENSIVE pathology assessment (minimum 600 words) covering:

1. **DIAGNOSIS CONFIRMATION**
   - Histopathologic diagnosis review
   - WHO classification
   - Histologic grade and its significance

2. **BIOMARKER STATUS REVIEW**
   - Each biomarker tested with interpretation
   - Methodology used (IHC, FISH, NGS)
   - Quality assessment of testing

3. **MOLECULAR PROFILE ANALYSIS**
   - Mutations identified and their significance
   - Variants of unknown significance
   - TMB and MSI interpretation

4. **ADDITIONAL TESTING RECOMMENDATIONS**
   - Any missing biomarkers that should be tested
   - Reflex testing needs
   - Tissue adequacy for additional testing

5. **PROGNOSTIC FEATURES**
   - Histologic features affecting prognosis
   - Grade, LVI, PNI assessment
   - Other prognostic markers

6. **PREDICTIVE MARKERS**
   - Markers predicting treatment response
   - Companion diagnostic requirements
   - Drug-biomarker associations

7. **SPECIMEN ADEQUACY**
   - Tissue availability for current/future testing
   - Archival tissue recommendations
   - Re-biopsy considerations

8. **GUIDELINE CITATIONS**
   - CAP protocol requirements
   - ASCO/CAP biomarker guidelines
   - WHO classification reference

9. **INDIAN HEALTHCARE CONTEXT**
   - Testing availability at different lab tiers
   - Cost of biomarker panels
   - Reference lab recommendations for specialized testing
   - Turnaround time expectations`
  },
  { 
    id: "geneticist", 
    name: "Dr. Anuvamsha", 
    specialty: "Genetics", 
    prompt: `Provide a COMPREHENSIVE genetics/molecular oncology assessment (minimum 600 words) covering:

1. **SOMATIC MUTATION ANALYSIS**
   - Each mutation with detailed interpretation
   - Pathogenicity classification
   - Allele frequency significance

2. **THERAPEUTIC IMPLICATIONS**
   - Actionable mutations and corresponding therapies
   - FDA/DCGI approved indications
   - Level of evidence for each drug-mutation pair

3. **RESISTANCE CONSIDERATIONS**
   - Known resistance mechanisms
   - Monitoring for resistance
   - Sequencing of targeted agents

4. **CLINICAL TRIAL OPPORTUNITIES**
   - Relevant trials based on molecular profile
   - Basket/umbrella trial eligibility
   - Trial sites in India

5. **GERMLINE TESTING RECOMMENDATION**
   - Indications for germline testing in this case
   - Genes to be tested
   - Implications for family

6. **HEREDITARY CANCER ASSESSMENT**
   - Family history review
   - Hereditary syndrome suspicion
   - Cascade testing recommendations

7. **TUMOR PROFILING COMPLETENESS**
   - Adequacy of current NGS panel
   - Additional genomic testing needed
   - Liquid biopsy role

8. **VARIANT ANNOTATION**
   - ClinVar/CIViC/OncoKB classifications
   - Evidence levels cited
   - Conflicting interpretations addressed

9. **GUIDELINE CITATIONS**
   - NCCN biomarker testing guidelines
   - ESMO ESCAT classifications
   - ASCO/AMP/CAP standards

10. **INDIAN HEALTHCARE CONTEXT**
    - Targeted drug availability in India
    - DCGI approval status
    - Cost of targeted therapies
    - Import requirements for non-approved drugs
    - Clinical trial access`
  },
];

function buildCaseContext(sampleCase: SampleCase): string {
  return `
# Patient Case Summary

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo ${sampleCase.patient.gender}
**ECOG**: ${sampleCase.patient.ecog}
**Comorbidities**: ${sampleCase.patient.comorbidities}
${sampleCase.patient.smokingHistory ? `**Smoking**: ${sampleCase.patient.smokingHistory}` : ''}

## Diagnosis
- **Cancer Type**: ${sampleCase.cancer.type} - ${sampleCase.cancer.subtype}
- **Histology**: ${sampleCase.cancer.histology}
- **Primary Site**: ${sampleCase.cancer.primarySite}
- **Stage**: ${sampleCase.cancer.stage} (${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m})

## Biomarkers
${sampleCase.biomarkers.map(b => `- ${b.name}: ${b.value} ${b.actionable ? '(ACTIONABLE)' : ''}`).join('\n')}

## Genomic Profile
${sampleCase.genomics.mutations.map(m => `- ${m.gene} ${m.variant} ${m.actionable ? '(ACTIONABLE)' : ''}`).join('\n')}
${sampleCase.genomics.tmb ? `- TMB: ${sampleCase.genomics.tmb} mut/Mb` : ''}
${sampleCase.genomics.msi ? `- MSI: ${sampleCase.genomics.msi}` : ''}

## Clinical Question
${sampleCase.clinicalQuestion}

## Indian Healthcare Context
- Insurance: ${sampleCase.patient.insurance}
- Location: ${sampleCase.patient.location}
- Consider drug availability and cost in India
`;
}

// Generate AI-powered deliberation for a case
async function generateAIDeliberation(sampleCase: SampleCase): Promise<CachedDeliberation> {
  const caseContext = buildCaseContext(sampleCase);
  const agents: CachedAgentResponse[] = [];
  const agentResponses: { name: string; specialty: string; response: string }[] = [];

  // Generate each agent's response
  for (const config of AGENT_CONFIGS) {
    let response: string;
    try {
      const aiResponse = await callAI(
        [{ role: "user", content: `${caseContext}\n\n---\n\nYou are ${config.name}, ${config.specialty} specialist.\n\n${config.prompt}\n\nIMPORTANT: Your response will fill approximately 3/4 of a page in the patient's tumor board report PDF. Write a DETAILED, COMPREHENSIVE assessment addressing ALL points above. Use headers, bullet points, and specific details. Minimum 600 words.` }],
        `You are ${config.name}, a senior ${config.specialty} specialist participating in a multidisciplinary tumor board. You are known for thorough, detailed assessments that leave no stone unturned. Your responses are comprehensive yet organized, always citing specific guidelines and considering the Indian healthcare context. You write detailed assessments because you know they will be used for actual patient care decisions.`,
        { maxTokens: 4000 }
      );
      response = aiResponse.content;
    } catch (err) {
      console.error(`AI error for ${config.name}:`, err);
      // Fallback to placeholder
      response = generatePlaceholderAgentResponse(config, sampleCase);
    }

    agents.push({
      agentId: config.id,
      name: config.name,
      specialty: config.specialty,
      thinkingTime: 2000 + Math.random() * 1000,
      typingSpeed: 100 + Math.random() * 30,
      citations: ["NCCN Guidelines 2025", "ESMO Guidelines"],
      toolsUsed: ["rag_retrieve", "guideline_search"],
      response,
    });

    agentResponses.push({
      name: config.name,
      specialty: config.specialty,
      response,
    });
  }

  // Generate consensus
  let consensus: string;
  try {
    const aiResponse = await callAI(
      [{
        role: "user",
        content: `Case:\n${caseContext}\n\nSpecialist Opinions:\n${agentResponses.map(a => `## ${a.name} (${a.specialty})\n${a.response}`).join('\n\n')}\n\n---\n\nAs the Tumor Board Moderator, synthesize all specialist opinions into a COMPREHENSIVE CONSENSUS RECOMMENDATION (minimum 800 words) with the following structure:

# TUMOR BOARD CONSENSUS RECOMMENDATION

## 1. TREATMENT INTENT
- Clearly state: Curative / Palliative / Disease Control
- Rationale for this classification

## 2. PRIMARY TREATMENT RECOMMENDATION
- Specific treatment plan with drugs/procedures
- Doses, schedules, durations
- Detailed rationale

## 3. TREATMENT SEQUENCE (Step-by-Step)
- Phase 1: [Details with timeline]
- Phase 2: [Details with timeline]
- Phase 3: [Details with timeline]
- Include decision points between phases

## 4. KEY SPECIALIST AGREEMENTS
- List the major points of agreement
- How each specialty contributes to the plan

## 5. ALTERNATIVE OPTIONS
- If primary plan not feasible
- Cost-constrained alternatives
- Patient-preference alternatives

## 6. PRE-TREATMENT REQUIREMENTS
- Tests/clearances needed before starting
- Timeline for completing workup

## 7. MONITORING & FOLLOW-UP PLAN
- Response assessment schedule
- Surveillance after treatment
- When to reassess/change plan

## 8. INDIAN HEALTHCARE CONTEXT
- Total estimated treatment cost
- Insurance/PMJAY coverage
- Drug availability notes
- Recommended treatment centers

## 9. CONFIDENCE & CAVEATS
- Consensus confidence level (High/Moderate/Low)
- Key uncertainties
- Factors that could change recommendation`,
      }],
      `You are the Tumor Board Moderator (Dr. Adhyaksha). You synthesize all specialist opinions into a comprehensive, actionable consensus recommendation. Your recommendations are detailed enough that a treating physician can implement them directly. You always consider practical aspects including costs and logistics in the Indian healthcare system.`,
      { maxTokens: 5000 }
    );
    consensus = aiResponse.content;
  } catch (err) {
    console.error("AI error for consensus:", err);
    consensus = generatePlaceholderConsensus(sampleCase);
  }

  return {
    caseId: sampleCase.id,
    caseNumber: sampleCase.caseNumber,
    generatedAt: new Date().toISOString(),
    agents,
    consensus,
  };
}

function generatePlaceholderAgentResponse(config: typeof AGENT_CONFIGS[0], sampleCase: SampleCase): string {
  const biomarkerSummary = sampleCase.biomarkers
    .map(b => `- ${b.name}: ${b.value}${b.actionable ? ' (Actionable)' : ''}`)
    .join('\n');
  
  const mutationSummary = sampleCase.genomics.mutations
    .map(m => `- ${m.gene} ${m.variant}${m.actionable ? ' (Actionable)' : ''}`)
    .join('\n');

  const specialtyContent: Record<string, string> = {
    'surgical-oncologist': `## Surgical Oncology Assessment

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo ${sampleCase.patient.gender}
**Diagnosis**: ${sampleCase.cancer.stage} ${sampleCase.cancer.type} - ${sampleCase.cancer.subtype}
**Primary Site**: ${sampleCase.cancer.primarySite}

### Surgical Considerations:

1. **Resectability Assessment**
   - Stage: ${sampleCase.cancer.stage} (${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m})
   - Histology: ${sampleCase.cancer.histology}
   - Patient fitness: ECOG ${sampleCase.patient.ecog}

2. **Key Surgical Points**
${sampleCase.keyConsiderations.map(k => `   - ${k}`).join('\n')}

3. **Recommended Approach**
   - Treatment should be individualized based on tumor characteristics
   - Consider patient's performance status and comorbidities: ${sampleCase.patient.comorbidities}
   - Multidisciplinary discussion recommended before final surgical planning

4. **Indian Healthcare Context**
   - Consider availability of surgical expertise at patient's center
   - Patient location: ${sampleCase.patient.location}
   - Insurance: ${sampleCase.patient.insurance}

*[Reference: NCCN ${sampleCase.cancer.type} Guidelines, SSO Surgical Principles]*`,

    'medical-oncologist': `## Medical Oncology Assessment

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo ${sampleCase.patient.gender}
**Diagnosis**: ${sampleCase.cancer.stage} ${sampleCase.cancer.type} - ${sampleCase.cancer.subtype}

### Biomarker Profile:
${biomarkerSummary}

### Genomic Findings:
${mutationSummary}
${sampleCase.genomics.tmb ? `- TMB: ${sampleCase.genomics.tmb} mut/Mb` : ''}
${sampleCase.genomics.msi ? `- MSI Status: ${sampleCase.genomics.msi}` : ''}

### Treatment Considerations:

1. **Systemic Therapy Options**
   - Expected modalities: ${sampleCase.expectedModalities.join(', ')}
   - Biomarker-driven decisions should guide therapy selection

2. **Key Considerations**
${sampleCase.keyConsiderations.map(k => `   - ${k}`).join('\n')}

3. **Indian Healthcare Context**
   - Insurance: ${sampleCase.patient.insurance}
   - Location: ${sampleCase.patient.location}
   - Consider drug availability and cost-effective alternatives
   - Explore patient assistance programs for targeted/immunotherapy

4. **Follow-up Recommendations**
   - Regular monitoring per guidelines
   - Reassess biomarkers as needed at progression

*[Reference: NCCN ${sampleCase.cancer.type} Guidelines, ESMO Guidelines]*`,

    'radiation-oncologist': `## Radiation Oncology Assessment

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo
**Diagnosis**: ${sampleCase.cancer.stage} ${sampleCase.cancer.type}
**Primary Site**: ${sampleCase.cancer.primarySite}

### Radiation Therapy Considerations:

1. **RT Indication Assessment**
   - Stage: ${sampleCase.cancer.stage}
   - TNM: ${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m}
   - Role of RT to be determined based on treatment intent

2. **Technical Considerations**
   - Technique: To be determined based on target volumes
   - Consider patient's ability to tolerate daily treatment
   - Motion management as appropriate for site

3. **Key Points**
${sampleCase.keyConsiderations.slice(0, 3).map(k => `   - ${k}`).join('\n')}

4. **Indian Healthcare Context**
   - RT availability at patient's location: ${sampleCase.patient.location}
   - Consider travel logistics for daily treatment
   - LINAC/technique availability varies by center

*[Reference: ASTRO Guidelines, NCCN ${sampleCase.cancer.type} Guidelines]*`,

    'pathologist': `## Pathology Assessment

**Patient**: ${sampleCase.patient.name}
**Diagnosis**: ${sampleCase.cancer.type} - ${sampleCase.cancer.subtype}

### Pathology Findings:

1. **Histopathology**
   - Type: ${sampleCase.cancer.type}
   - Subtype: ${sampleCase.cancer.subtype}
   - Histology: ${sampleCase.cancer.histology}

2. **Biomarker Status**
${biomarkerSummary}

3. **Molecular Profile**
${mutationSummary}
${sampleCase.genomics.tmb ? `   - TMB: ${sampleCase.genomics.tmb} mut/Mb` : ''}
${sampleCase.genomics.msi ? `   - MSI: ${sampleCase.genomics.msi}` : ''}

4. **Quality Assessment**
   - Ensure adequate tissue for all required testing
   - Archive tissue block for future testing if needed

5. **Indian Healthcare Context**
   - Biomarker testing available at major centers
   - Consider reference lab validation for critical markers

*[Reference: CAP ${sampleCase.cancer.type} Protocol, WHO Classification]*`,

    'radiologist': `## Radiology Assessment

**Patient**: ${sampleCase.patient.name}
**Diagnosis**: ${sampleCase.cancer.stage} ${sampleCase.cancer.type}

### Imaging Assessment:

1. **Staging Summary**
   - Stage: ${sampleCase.cancer.stage}
   - TNM: ${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m}
   - Primary Site: ${sampleCase.cancer.primarySite}

2. **Imaging Recommendations**
   - Confirm staging completeness per guidelines
   - Additional imaging as indicated for ${sampleCase.cancer.type}
   - Response assessment plan per RECIST 1.1

3. **Key Imaging Findings to Document**
   - Primary tumor characteristics
   - Nodal involvement
   - Distant metastases status

4. **Indian Healthcare Context**
   - Consider imaging availability and costs
   - Government facilities may offer cost reduction
   - PET-CT availability limited to major centers

*[Reference: ACR Appropriateness Criteria, RECIST 1.1]*`,

    'geneticist': `## Genetics/Molecular Oncology Assessment

**Patient**: ${sampleCase.patient.name}
**Diagnosis**: ${sampleCase.cancer.type} - ${sampleCase.cancer.subtype}

### Somatic Mutation Analysis:
${mutationSummary}

### Biomarker Summary:
${biomarkerSummary}

### TMB/MSI Status:
${sampleCase.genomics.tmb ? `- TMB: ${sampleCase.genomics.tmb} mut/Mb` : '- TMB: Not assessed'}
${sampleCase.genomics.msi ? `- MSI: ${sampleCase.genomics.msi}` : '- MSI: Not assessed'}

### Therapeutic Implications:
${sampleCase.genomics.mutations.filter(m => m.actionable).map(m => `- ${m.gene} ${m.variant}: Consider targeted therapy options`).join('\n') || '- Assess for actionable mutations based on testing'}

### Germline Considerations:
- Assess family history for hereditary cancer syndromes
- Consider germline testing if indicated by tumor findings or family history

### Indian Healthcare Context:
- Drug availability for targeted therapies varies
- Clinical trial opportunities at major centers
- Consider cost and access when recommending specific agents

*[Reference: OncoKB, CIViC Database, NCCN Biomarker Testing Guidelines]*`,

    'palliative-care': `## Palliative Care Assessment

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo
**Diagnosis**: ${sampleCase.cancer.stage} ${sampleCase.cancer.type}

### Performance Status:
- ECOG: ${sampleCase.patient.ecog}
- Comorbidities: ${sampleCase.patient.comorbidities}

### Quality of Life Considerations:

1. **Symptom Assessment**
   - Assess and manage disease-related symptoms
   - Anticipate treatment-related side effects
   - Nutritional support as needed

2. **Psychosocial Support**
   - Patient and family emotional support
   - Financial counseling and navigation
   - Caregiver support and education

3. **Goals of Care**
   - Treatment intent discussion based on staging
   - Advance care planning
   - Document patient preferences

4. **Indian Healthcare Context**
   - Family involvement in discussions (cultural norm)
   - Identify primary caregiver
   - Discuss treatment costs upfront
   - Consider travel and lodging needs

*[Reference: NCCN Supportive Care Guidelines, WHO Palliative Care]*`,
  };

  return specialtyContent[config.id] || `## ${config.specialty} Assessment

**For**: ${sampleCase.patient.name}, ${sampleCase.cancer.stage} ${sampleCase.cancer.type}

### Key Points:
- Stage: ${sampleCase.cancer.stage}
- Site: ${sampleCase.cancer.primarySite}
- Histology: ${sampleCase.cancer.histology}

### Considerations:
${sampleCase.keyConsiderations.map(k => `- ${k}`).join('\n')}

### Recommendation:
Treatment approach should be individualized based on MDT discussion.

*[AI service temporarily unavailable - showing template response]*`;
}

function generatePlaceholderConsensus(sampleCase: SampleCase): string {
  return `# Tumor Board Consensus

## Case: ${sampleCase.patient.name}
${sampleCase.cancer.stage} ${sampleCase.cancer.type} ${sampleCase.cancer.subtype}

## Clinical Question
${sampleCase.clinicalQuestion}

## Consensus Recommendation
Based on multidisciplinary review:

### Treatment Approach:
${sampleCase.expectedModalities.map(m => `- ${m}`).join('\n')}

### Key Considerations:
${sampleCase.keyConsiderations.map(k => `- ${k}`).join('\n')}

### Follow-Up:
- Regular surveillance per guidelines
- Symptom monitoring
- Reassess biomarkers as needed

---
*[Placeholder consensus - AI service unavailable]*
*Final decisions require clinical judgment*`;
}

// Generate placeholder responses for uncached cases (fallback)
function generatePlaceholderDeliberation(sampleCase: SampleCase): CachedDeliberation {
  const agents: CachedAgentResponse[] = [
    {
      agentId: "surgical-oncologist",
      name: "Dr. Shalya",
      specialty: "Surgical Oncology",
      thinkingTime: 2000,
      typingSpeed: 120,
      citations: ["NCCN Guidelines 2025", "Surgical Oncology Review"],
      toolsUsed: ["rag_retrieve", "staging_calculator"],
      response: `## Surgical Assessment for ${sampleCase.cancer.type} ${sampleCase.cancer.subtype}

**Patient**: ${sampleCase.patient.name}, ${sampleCase.patient.age}yo ${sampleCase.patient.gender}
**Stage**: ${sampleCase.cancer.stage} (${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m})

### Surgical Considerations:
${sampleCase.keyConsiderations.map(k => `- ${k}`).join('\n')}

### Recommendation:
Based on the ${sampleCase.cancer.stage} presentation, surgical approach should be individualized based on:
1. Tumor characteristics and location (${sampleCase.cancer.primarySite})
2. Patient fitness (ECOG ${sampleCase.patient.ecog})
3. Multidisciplinary input

*[NCCN ${sampleCase.cancer.type} Guidelines 2025]*`,
    },
    {
      agentId: "medical-oncologist",
      name: "Dr. Chikitsa",
      specialty: "Medical Oncology",
      thinkingTime: 2500,
      typingSpeed: 110,
      citations: ["NCCN Guidelines 2025", "ESMO Guidelines"],
      toolsUsed: ["rag_retrieve", "drug_lookup"],
      response: `## Medical Oncology Assessment

### Biomarker Profile:
${sampleCase.biomarkers.map(b => `| ${b.name} | ${b.value} | ${b.actionable ? '**Actionable**' : 'Not actionable'} |`).join('\n')}

### Genomic Findings:
${sampleCase.genomics.mutations.map(m => `- **${m.gene}** ${m.variant} ${m.actionable ? '(actionable)' : ''}`).join('\n')}
${sampleCase.genomics.tmb ? `- TMB: ${sampleCase.genomics.tmb} mut/Mb` : ''}
${sampleCase.genomics.msi ? `- MSI Status: ${sampleCase.genomics.msi}` : ''}

### Treatment Approach:
Expected modalities: ${sampleCase.expectedModalities.join(', ')}

### Indian Context:
- Insurance: ${sampleCase.patient.insurance}
- Location: ${sampleCase.patient.location}
- Consider cost-effective alternatives and patient assistance programs

*[NCCN ${sampleCase.cancer.type} Guidelines 2025]*`,
    },
    {
      agentId: "radiation-oncologist",
      name: "Dr. Kirann",
      specialty: "Radiation Oncology",
      thinkingTime: 2200,
      typingSpeed: 115,
      citations: ["ASTRO Guidelines", "NCCN Guidelines"],
      toolsUsed: ["rag_retrieve", "dose_calculator"],
      response: `## Radiation Oncology Assessment

### RT Indication:
For ${sampleCase.cancer.stage} ${sampleCase.cancer.type} ${sampleCase.cancer.subtype}

### Considerations:
- Primary site: ${sampleCase.cancer.primarySite}
- Staging: ${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m}

### Technical Approach:
- Technique to be determined based on MDT discussion
- Consider patient logistics for daily treatment (${sampleCase.patient.location})

### Indian Context:
- RT availability varies by region
- Assess travel requirements for treatment duration

*[ASTRO Guidelines; NCCN ${sampleCase.cancer.type} Guidelines]*`,
    },
    {
      agentId: "palliative-care",
      name: "Dr. Shanti",
      specialty: "Palliative Care",
      thinkingTime: 1800,
      typingSpeed: 100,
      citations: ["NCCN Supportive Care", "WHO Palliative Care"],
      toolsUsed: ["rag_retrieve", "symptom_assessment"],
      response: `## Palliative Care Assessment

### Performance Status:
- ECOG: ${sampleCase.patient.ecog}
- Comorbidities: ${sampleCase.patient.comorbidities}

### Symptom Management:
- Assess and manage treatment-related side effects
- Nutritional support as needed
- Psychosocial support for patient and family

### Goals of Care:
- Treatment intent discussion based on staging and prognosis
- Advance care planning
- Family involvement (important in Indian context)

### Indian Context:
- Cultural considerations for disclosure and decision-making
- Caregiver support and education
- Financial counseling

*[NCCN Supportive Care Guidelines]*`,
    },
    {
      agentId: "radiologist",
      name: "Dr. Chitran",
      specialty: "Onco-Radiology",
      thinkingTime: 2000,
      typingSpeed: 105,
      citations: ["ACR Appropriateness Criteria", "RECIST 1.1"],
      toolsUsed: ["rag_retrieve", "staging_validator"],
      response: `## Radiology Assessment

### Staging Summary:
- **Stage**: ${sampleCase.cancer.stage}
- **TNM**: ${sampleCase.cancer.tnm.t}${sampleCase.cancer.tnm.n}${sampleCase.cancer.tnm.m}
- **Primary Site**: ${sampleCase.cancer.primarySite}

### Imaging Recommendations:
1. Confirm staging completeness
2. Additional imaging as per guidelines for ${sampleCase.cancer.type}
3. Response assessment plan per RECIST 1.1

### Indian Context:
- Imaging availability and costs
- Consider government facilities for cost reduction

*[ACR Appropriateness Criteria; RECIST 1.1]*`,
    },
    {
      agentId: "pathologist",
      name: "Dr. Marga",
      specialty: "Pathology",
      thinkingTime: 1900,
      typingSpeed: 100,
      citations: ["CAP Protocols", "WHO Classification"],
      toolsUsed: ["rag_retrieve", "biomarker_validator"],
      response: `## Pathology Assessment

### Diagnosis:
- **Type**: ${sampleCase.cancer.type}
- **Subtype**: ${sampleCase.cancer.subtype}
- **Histology**: ${sampleCase.cancer.histology}

### Biomarker Status:
${sampleCase.biomarkers.map(b => `| ${b.name} | ${b.value} |`).join('\n')}

### Quality Assessment:
- Ensure adequate tissue for molecular testing
- Archive tissue for future testing if needed

### Indian Context:
- Biomarker testing availability at major centers
- Consider reference lab validation for critical markers

*[CAP ${sampleCase.cancer.type} Protocol; WHO Classification]*`,
    },
    {
      agentId: "geneticist",
      name: "Dr. Anuvamsha",
      specialty: "Genetics",
      thinkingTime: 2300,
      typingSpeed: 110,
      citations: ["OncoKB", "CIViC Database", "NCCN Biomarker Testing"],
      toolsUsed: ["rag_retrieve", "variant_annotator"],
      response: `## Genetics Assessment

### Somatic Mutations:
${sampleCase.genomics.mutations.map(m => `| ${m.gene} | ${m.variant} | ${m.actionable ? '**Actionable**' : 'Not actionable'} |`).join('\n')}

### TMB/MSI:
${sampleCase.genomics.tmb ? `- TMB: ${sampleCase.genomics.tmb} mut/Mb` : '- TMB: Not assessed'}
${sampleCase.genomics.msi ? `- MSI: ${sampleCase.genomics.msi}` : '- MSI: Not assessed'}

### Therapeutic Implications:
${sampleCase.genomics.mutations.filter(m => m.actionable).map(m => `- ${m.gene} ${m.variant}: Consider targeted therapy options`).join('\n') || '- No actionable mutations identified'}

### Germline Considerations:
- Assess family history for hereditary cancer syndromes
- Consider germline testing if indicated

### Indian Context:
- Drug availability for targeted therapies
- Clinical trial opportunities at major centers

*[OncoKB; NCCN Biomarker Testing Guidelines]*`,
    },
  ];

  const consensus = `# Tumor Board Consensus Recommendation

## Case: ${sampleCase.patient.name}
**${sampleCase.patient.age}yo ${sampleCase.patient.gender} with ${sampleCase.cancer.stage} ${sampleCase.cancer.type} ${sampleCase.cancer.subtype}**

---

## Clinical Question
${sampleCase.clinicalQuestion}

---

## Consensus Recommendation

### Treatment Intent: To be determined by MDT

### Key Considerations:
${sampleCase.keyConsiderations.map(k => `- ${k}`).join('\n')}

### Recommended Approach:
Based on multidisciplinary review, treatment should include consideration of:
${sampleCase.expectedModalities.map(m => `- ${m}`).join('\n')}

### Biomarker-Driven Decisions:
${sampleCase.biomarkers.filter(b => b.actionable).map(b => `- ${b.name}: ${b.value} - Consider in treatment planning`).join('\n')}

---

## Indian Healthcare Context

| Factor | Details |
|--------|---------|
| Insurance | ${sampleCase.patient.insurance} |
| Location | ${sampleCase.patient.location} |
| Access | Consider regional availability of treatments |

### Cost Considerations:
- Explore patient assistance programs
- Consider generic alternatives where available
- Government scheme eligibility (PMJAY, state schemes)

---

## Follow-Up Plan
- Regular imaging surveillance per guidelines
- Symptom monitoring
- Biomarker reassessment if indicated

---

## Consensus Confidence: **MODERATE**
*This is a placeholder consensus generated for demonstration. In production, this would be generated by Claude AI with full guideline retrieval.*

---

*Generated by Virtual Tumor Board AI*
*Disclaimer: AI-generated recommendation. Final treatment decisions require clinical judgment.*`;

  return {
    caseId: sampleCase.id,
    caseNumber: sampleCase.caseNumber,
    generatedAt: new Date().toISOString(),
    agents,
    consensus,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId") || "lung-nsclc-kras-g12c";
  const forceRefresh = searchParams.get("refresh") === "true";
  const useV18Format = searchParams.get("v18") === "true";
  
  const encoder = new TextEncoder();
  
  // Get or generate deliberation
  let deliberation = forceRefresh ? undefined : getCachedDeliberation(caseId);
  
  if (!deliberation) {
    // Check if case exists
    const sampleCase = getCaseById(caseId);
    if (!sampleCase) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if AI is available
    const providers = getAvailableProviders();
    const hasAI = providers.claude || providers.gemini;
    
    if (hasAI) {
      // Generate with AI
      console.log(`[Stream] Generating AI deliberation for case: ${caseId}`);
      try {
        deliberation = await generateAIDeliberation(sampleCase);
      } catch (err) {
        console.error(`[Stream] AI generation failed, falling back to placeholder:`, err);
        deliberation = generatePlaceholderDeliberation(sampleCase);
      }
    } else {
      // No AI available, use placeholder
      console.log(`[Stream] No AI available, using placeholder for case: ${caseId}`);
      deliberation = generatePlaceholderDeliberation(sampleCase);
    }
    
    // Cache the generated deliberation
    cacheDeliberation(deliberation);
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send case info first
      const caseInfo = JSON.stringify({
        type: "case_info",
        caseId: deliberation!.caseId,
        caseNumber: deliberation!.caseNumber,
        isCached: isCaseCached(caseId),
        format: useV18Format ? "v18" : "legacy",
      });
      controller.enqueue(encoder.encode(`data: ${caseInfo}\n\n`));
      
      // Use V18 streaming format for new deliberation stream UI
      const generator = useV18Format 
        ? streamV18Deliberation(deliberation!)
        : streamCachedDeliberation(deliberation!);
      
      for (const event of generator) {
        const data = JSON.stringify({ type: event.type, ...event.data });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        
        if (event.delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, event.delay));
        }
      }
      
      controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
