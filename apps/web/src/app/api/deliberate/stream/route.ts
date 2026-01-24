import { NextRequest } from "next/server";
import { 
  getCachedDeliberation, 
  streamCachedDeliberation,
  isCaseCached,
  cacheDeliberation,
  CachedDeliberation,
  CachedAgentResponse
} from "@/lib/deliberation-cache";
import { getCaseById, SampleCase } from "@/lib/sample-cases";

export const runtime = "edge";

// Generate placeholder responses for uncached cases
// In production, this would call Claude API
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
  
  const encoder = new TextEncoder();
  
  // Get or generate deliberation
  let deliberation = getCachedDeliberation(caseId);
  
  if (!deliberation) {
    // Check if case exists
    const sampleCase = getCaseById(caseId);
    if (!sampleCase) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Generate placeholder for now
    // In production, this would call Claude API
    deliberation = generatePlaceholderDeliberation(sampleCase);
    
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
      });
      controller.enqueue(encoder.encode(`data: ${caseInfo}\n\n`));
      
      const generator = streamCachedDeliberation(deliberation!);
      
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
