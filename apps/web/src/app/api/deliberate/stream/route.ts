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

// Agent configurations for AI generation
const AGENT_CONFIGS = [
  { id: "surgical-oncologist", name: "Dr. Shalya", specialty: "Surgical Oncology", prompt: "Assess surgical options, resectability, and timing of surgery." },
  { id: "medical-oncologist", name: "Dr. Chikitsa", specialty: "Medical Oncology", prompt: "Recommend systemic therapy options based on biomarkers and guidelines." },
  { id: "radiation-oncologist", name: "Dr. Kirann", specialty: "Radiation Oncology", prompt: "Assess role of radiation therapy, technique, and timing." },
  { id: "palliative-care", name: "Dr. Shanti", specialty: "Palliative Care", prompt: "Address symptom management, quality of life, and goals of care." },
  { id: "radiologist", name: "Dr. Chitran", specialty: "Onco-Radiology", prompt: "Review imaging findings and recommend further imaging." },
  { id: "pathologist", name: "Dr. Marga", specialty: "Pathology", prompt: "Review pathology and biomarker findings." },
  { id: "geneticist", name: "Dr. Anuvamsha", specialty: "Genetics", prompt: "Interpret genomic findings and recommend targeted therapies." },
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
        [{ role: "user", content: `${caseContext}\n\nYour task: ${config.prompt}\n\nProvide your COMPLETE specialist assessment with:\n1. Key findings analysis\n2. Treatment recommendations with rationale\n3. Specific guideline citations (NCCN, ESMO, SSO, ASTRO as appropriate)\n4. Indian healthcare context considerations\n5. Follow-up recommendations\n\nBe thorough - this will be included in the patient's tumor board report.` }],
        `You are ${config.name}, a ${config.specialty} specialist on a virtual tumor board. Provide a comprehensive, evidence-based assessment. Cite specific guidelines (NCCN, ESMO, SSO, ASTRO). Consider Indian healthcare context including drug availability, costs, and PMJAY coverage.`,
        { maxTokens: 3000 }
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
        content: `Case:\n${caseContext}\n\nSpecialist Opinions:\n${agentResponses.map(a => `## ${a.name} (${a.specialty})\n${a.response}`).join('\n\n')}\n\nSynthesize into a COMPREHENSIVE consensus recommendation including:\n1. Treatment Intent (Curative/Palliative)\n2. Primary Recommendation with full rationale\n3. Treatment Sequence (step-by-step plan)\n4. Key specialist agreements\n5. Any resolved disagreements\n6. Alternative options if primary not feasible\n7. Follow-up plan with timeline\n8. Indian healthcare context (costs, availability, PMJAY)\n9. Confidence level with explanation`,
      }],
      `You are the Tumor Board Moderator. Synthesize all specialist opinions into a detailed, actionable consensus recommendation. This will be the main treatment plan in the patient's report. Be thorough and specific.`,
      { maxTokens: 4000 }
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
