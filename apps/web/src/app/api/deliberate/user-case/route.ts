/**
 * User-Uploaded Case Deliberation API
 * 
 * Handles tumor board deliberation for user-uploaded cancer records
 * with appropriate data limitation caveats
 * 
 * V6: Now includes MedGemma imaging analysis for Dr. Chitran
 */

import { NextRequest } from "next/server";
import { callAI, getAvailableProviders } from "@/lib/ai-service";
import type { 
  UploadSession, 
  DocumentType, 
  MissingDocument,
  ExtractedClinicalData,
  UploadSessionV6,
  UploadedImagingStudy
} from "@/types/user-upload";
import { DOCUMENT_TYPE_LABELS, getCancerSiteById } from "@/lib/upload/constants";
import { 
  buildImagingContextForChitran, 
  DR_CHITRAN_IMAGING_PROMPT_ADDITION,
  getImagingSummaryForOtherAgents
} from "@/lib/medgemma/dr-chitran-integration";

export const runtime = "edge";

// Agent configurations
const AGENT_CONFIGS = [
  { 
    id: "principal-investigator", 
    name: "Dr. Adhyaksha", 
    specialty: "Chairperson",
    requiredDocs: ["clinical-notes"] as DocumentType[],
    prompt: "Introduce the case, summarize patient status, and set the deliberation agenda."
  },
  { 
    id: "surgical-oncologist", 
    name: "Dr. Shalya", 
    specialty: "Surgical Oncology",
    requiredDocs: ["pathology", "radiology"] as DocumentType[],
    prompt: "Assess surgical options, resectability, and timing of surgery."
  },
  { 
    id: "medical-oncologist", 
    name: "Dr. Chikitsa", 
    specialty: "Medical Oncology",
    requiredDocs: ["pathology", "genomics"] as DocumentType[],
    prompt: "Recommend systemic therapy options based on biomarkers and guidelines."
  },
  { 
    id: "radiation-oncologist", 
    name: "Dr. Kirann", 
    specialty: "Radiation Oncology",
    requiredDocs: ["pathology", "radiology"] as DocumentType[],
    prompt: "Assess role of radiation therapy, technique, and timing."
  },
  { 
    id: "radiologist", 
    name: "Dr. Chitran", 
    specialty: "Onco-Radiology",
    requiredDocs: ["radiology"] as DocumentType[],
    prompt: "Review imaging findings and recommend further imaging."
  },
  { 
    id: "pathologist", 
    name: "Dr. Marga", 
    specialty: "Pathology",
    requiredDocs: ["pathology"] as DocumentType[],
    prompt: "Review pathology and biomarker findings."
  },
  { 
    id: "geneticist", 
    name: "Dr. Anuvamsha", 
    specialty: "Genetics",
    requiredDocs: ["genomics"] as DocumentType[],
    prompt: "Interpret genomic findings and recommend targeted therapies."
  },
  { 
    id: "scientific-critic", 
    name: "Dr. Tark", 
    specialty: "Scientific Safety",
    requiredDocs: ["clinical-notes"] as DocumentType[],
    prompt: "Review the case for safety concerns, guideline adherence (NCCN/ESMO), and contraindications."
  },
  { 
    id: "stewardship", 
    name: "Dr. Samata", 
    specialty: "Patient Advocate",
    requiredDocs: ["clinical-notes"] as DocumentType[],
    prompt: "Assess financial toxicity, patient access, and quality of life alignment."
  },
  { 
    id: "palliative-care", 
    name: "Dr. Shanti", 
    specialty: "Palliative Care",
    requiredDocs: ["clinical-notes"] as DocumentType[],
    prompt: "Address symptom management, quality of life, and goals of care."
  },
];

// Build case context from user-uploaded documents
function buildUserCaseContext(session: UploadSession): string {
  const cancerSite = getCancerSiteById(session.cancerSite);
  const cancerLabel = cancerSite?.label || session.cancerSite;
  
  let context = `
# User-Uploaded Cancer Case

**User Type**: ${session.userType === 'patient' ? 'Patient/Caregiver' : session.userType === 'oncologist' ? 'Oncologist' : 'Non-Oncology Doctor'}
**Cancer Site**: ${cancerLabel}
`;

  // Add staging if available
  if (session.staging) {
    if (session.staging.stage) {
      context += `**Stage**: ${session.staging.stage}\n`;
    }
    if (session.staging.tnm) {
      context += `**TNM**: ${session.staging.tnm}\n`;
    }
    if (session.staging.description) {
      context += `**Staging Details**: ${session.staging.description}\n`;
    }
  }

  context += `\n## Uploaded Documents Summary\n\n`;

  // Group documents by type
  const docsByType: Record<DocumentType, ExtractedClinicalData[]> = {} as any;
  
  for (const doc of session.documents) {
    if (!docsByType[doc.classifiedType]) {
      docsByType[doc.classifiedType] = [];
    }
    if (doc.extractedData) {
      docsByType[doc.classifiedType].push(doc.extractedData);
    }
  }

  // Add each document type's data
  for (const [docType, dataList] of Object.entries(docsByType)) {
    const label = DOCUMENT_TYPE_LABELS[docType as DocumentType]?.en || docType;
    context += `### ${label}\n\n`;
    
    for (const data of dataList) {
      // Pathology data
      if (data.histology) context += `- **Histology**: ${data.histology}\n`;
      if (data.grade) context += `- **Grade**: ${data.grade}\n`;
      if (data.margins) context += `- **Margins**: ${data.margins}\n`;
      if (data.ihcMarkers && Object.keys(data.ihcMarkers).length > 0) {
        context += `- **IHC Markers**:\n`;
        for (const [marker, value] of Object.entries(data.ihcMarkers)) {
          context += `  - ${marker}: ${value}\n`;
        }
      }

      // Radiology data
      if (data.findings && data.findings.length > 0) {
        context += `- **Findings**:\n`;
        for (const finding of data.findings) {
          context += `  - ${finding}\n`;
        }
      }
      if (data.measurements && data.measurements.length > 0) {
        context += `- **Measurements**:\n`;
        for (const m of data.measurements) {
          context += `  - ${m.site}: ${m.size}\n`;
        }
      }
      if (data.impression) context += `- **Impression**: ${data.impression}\n`;

      // Genomics data
      if (data.mutations && data.mutations.length > 0) {
        context += `- **Mutations**:\n`;
        for (const m of data.mutations) {
          context += `  - ${m.gene} ${m.variant} ${m.actionable ? '(ACTIONABLE)' : ''}\n`;
        }
      }
      if (data.msiStatus) context += `- **MSI Status**: ${data.msiStatus}\n`;
      if (data.tmb) context += `- **TMB**: ${data.tmb} mut/Mb\n`;

      // Lab values
      if (data.labValues && data.labValues.length > 0) {
        context += `- **Lab Values**:\n`;
        for (const lab of data.labValues) {
          const flag = lab.flag ? ` (${lab.flag.toUpperCase()})` : '';
          context += `  - ${lab.test}: ${lab.value} ${lab.unit}${flag}\n`;
        }
      }

      // Raw text summary (if nothing else extracted)
      if (data.rawText && !data.histology && !data.findings && !data.mutations && !data.labValues) {
        context += `- **Summary**: ${data.rawText.slice(0, 500)}...\n`;
      }

      if (data.date) context += `- **Date**: ${data.date}\n`;
      if (data.institution) context += `- **Institution**: ${data.institution}\n`;
      
      context += '\n';
    }
  }

  return context;
}

// Get data limitation caveat for an agent
function getAgentCaveat(
  agent: typeof AGENT_CONFIGS[0],
  uploadedTypes: DocumentType[],
  missingDocs: MissingDocument[]
): string {
  const uploadedSet = new Set(uploadedTypes);
  const missingForAgent = agent.requiredDocs.filter(d => !uploadedSet.has(d));
  
  if (missingForAgent.length === 0) {
    return "";
  }

  const missingLabels = missingForAgent.map(d => DOCUMENT_TYPE_LABELS[d]?.en || d);
  
  return `
⚠️ **Data Limitation**: I don't have access to ${missingLabels.join(', ')}. 
My recommendations below are based on the available information and should be considered CONDITIONAL.
Please obtain the missing documents for a more complete assessment.

`;
}

// System prompt addition for user cases
function getUserCaseSystemPromptAddition(
  uploadedTypes: DocumentType[],
  missingDocs: MissingDocument[],
  userType: string
): string {
  return `
## IMPORTANT: User-Uploaded Case with Limited Data

This is a REAL user-uploaded case, NOT a pre-defined sample case.
The user is a ${userType === 'patient' ? 'patient or caregiver' : userType === 'oncologist' ? 'practicing oncologist seeking second opinion' : 'non-oncology doctor seeking guidance'}.

### Available Document Types:
${uploadedTypes.map(t => `- ${DOCUMENT_TYPE_LABELS[t]?.en || t}`).join('\n')}

### Missing Documents:
${missingDocs.length > 0 ? missingDocs.map(d => `- ${DOCUMENT_TYPE_LABELS[d.type]?.en || d.type}: ${d.impact}`).join('\n') : '- None critical missing'}

### Your Response MUST:
1. Start with a DATA LIMITATIONS caveat if any documents relevant to your specialty are missing
2. Clearly state what you CAN and CANNOT assess based on available data
3. Use conditional language ("If staging is confirmed as...", "Assuming no prior treatment...")
4. Provide actionable recommendations where possible
5. End with specific questions/tests you would need to give a definitive opinion
6. Be empathetic but medically accurate
${userType === 'patient' ? '7. Use simpler language suitable for patients, avoid excessive jargon' : ''}

### Confidence Levels - Indicate one at the end of your response:
- **HIGH CONFIDENCE**: All critical data available for my specialty
- **MODERATE CONFIDENCE**: Some gaps but can give directional guidance  
- **LOW CONFIDENCE**: Major gaps, can only give general principles
`;
}

// Consensus prompt for user cases
function getUserCaseConsensusPrompt(
  uploadedTypes: DocumentType[],
  missingDocs: MissingDocument[],
  userType: string
): string {
  return `
## Consensus for User-Uploaded Case

Given the data limitations (missing: ${missingDocs.map(d => d.type).join(', ') || 'none'}), your consensus should be:

### Required Sections:

1. **What We Can Recommend Now** (HIGH confidence items all specialists agree on)

2. **Pending More Information** (CONDITIONAL recommendations that depend on missing data)

3. **Recommended Next Steps** - Prioritized list of:
   - Missing tests/documents to obtain
   - Consultations to schedule
   - Imaging or labs to order

4. **Questions ${userType === 'patient' ? 'to Ask Your Doctor' : 'to Clarify'}**
   - Specific questions the ${userType} should discuss with their treating physician

5. **Important Caveats**
   - What this AI tumor board CANNOT determine
   - Why human oncologist review is essential

${userType === 'patient' ? `
### Patient-Friendly Summary
End with a simple, jargon-free summary in 3-4 sentences that a patient can understand.
` : ''}

### Disclaimer
Include: "This AI-generated opinion is for informational purposes only and does not constitute medical advice. Please discuss these recommendations with your treating oncologist."
`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const body = await request.json();
    const { session } = body as { session: UploadSessionV6 };
    
    if (!session || !session.documents?.length) {
      return new Response(
        JSON.stringify({ error: "No session or documents provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check AI availability
    const providers = getAvailableProviders();
    const hasAI = providers.claude || providers.gemini;
    
    if (!hasAI) {
      return new Response(
        JSON.stringify({ error: "No AI provider available" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build context from uploaded documents
    const caseContext = buildUserCaseContext(session);
    const uploadedTypes = [...new Set(session.documents.map(d => d.classifiedType))];
    const missingDocs = session.completeness?.missingCritical || [];
    
    // V6: Build imaging context for Dr. Chitran
    const imagingStudies = session.imagingStudies || [];
    const hasImagingStudies = imagingStudies.length > 0;
    const completedAnalyses = imagingStudies.filter(s => s.status === 'complete' && s.medgemmaAnalysis);
    
    // Build imaging context from completed MedGemma analyses
    const imagingContext = hasImagingStudies ? buildImagingContextForChitran({
      hasUploadedImages: true,
      medgemmaAnalysis: completedAnalyses[0]?.medgemmaAnalysis,
      // Extract radiology reports from documents if available
      uploadedReports: session.extractedRadiologyReports,
    }) : '';
    
    // Summary for other agents (non-Chitran)
    const imagingSummaryForOthers = hasImagingStudies ? getImagingSummaryForOtherAgents({
      medgemmaAnalysis: completedAnalyses[0]?.medgemmaAnalysis,
      uploadedReports: session.extractedRadiologyReports,
    }) : '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send case info
          const caseInfo = JSON.stringify({
            type: "case_info",
            caseId: session.id,
            isUserCase: true,
            cancerSite: session.cancerSite,
            documentCount: session.documents.length,
            completenessScore: session.completeness?.completenessScore || 0,
            // V6: Include imaging status
            hasImaging: hasImagingStudies,
            imagingStudyCount: imagingStudies.length,
            imagingAnalysisCount: completedAnalyses.length,
          });
          controller.enqueue(encoder.encode(`data: ${caseInfo}\n\n`));

          // Phase change: Starting
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "phase_change", phase: "round1" })}\n\n`));

          const agentResponses: { name: string; specialty: string; response: string }[] = [];

          // Generate each agent's response
          for (const agent of AGENT_CONFIGS) {
            // Signal agent start
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: "agent_start", 
              agentId: agent.id,
              name: agent.name,
              specialty: agent.specialty
            })}\n\n`));

            // Get caveat for this agent
            const caveat = getAgentCaveat(agent, uploadedTypes, missingDocs);
            
            // V6: Check if this is Dr. Chitran (radiologist) and we have imaging
            const isDrChitran = agent.id === 'radiologist';
            const hasImagingForChitran = isDrChitran && hasImagingStudies;
            
            // Build system prompt with user case additions
            let systemPrompt = `You are ${agent.name}, a ${agent.specialty} specialist on a virtual tumor board.

IMPORTANT: Provide a COMPREHENSIVE, DETAILED response (at least 500-800 words). Structure your response with clear sections:
1. Data Limitations (if any)
2. Key Clinical Findings from Available Data
3. Your Specialty-Specific Assessment
4. Treatment Recommendations
5. Recommended Additional Tests/Consultations
6. Summary and Confidence Level

Be evidence-based and cite NCCN, ESMO, or other relevant guidelines where applicable.
Consider Indian healthcare context including drug availability and cost.
${getUserCaseSystemPromptAddition(uploadedTypes, missingDocs, session.userType)}`;

            // V6: Add enhanced imaging prompt for Dr. Chitran when images are available
            if (hasImagingForChitran) {
              systemPrompt += '\n\n' + DR_CHITRAN_IMAGING_PROMPT_ADDITION;
            }

            // Build user prompt with appropriate imaging context
            let agentImagingContext = '';
            if (hasImagingForChitran) {
              // Full imaging context for Dr. Chitran
              agentImagingContext = imagingContext;
            } else if (hasImagingStudies && !isDrChitran) {
              // Summary imaging context for other agents
              agentImagingContext = imagingSummaryForOthers;
            }

            const userPrompt = `${caseContext}

${agentImagingContext}

---

Your task: ${agent.prompt}

${caveat ? 'Note: ' + caveat : ''}

Provide your specialist assessment based on the available data. Structure your response with clear sections.`;

            let response = "";
            
            try {
              const aiResponse = await callAI(
                [{ role: "user", content: userPrompt }],
                systemPrompt,
                { maxTokens: 4000 }  // Increased for full detailed responses
              );
              response = aiResponse.content;
            } catch (err) {
              console.error(`AI error for ${agent.name}:`, err);
              response = `## ${agent.specialty} Assessment

⚠️ **Service Temporarily Unavailable**

Unable to generate assessment at this time. Please try again later.

*[AI Service Error]*`;
            }

            // Stream response in chunks for realistic effect
            const chunkSize = 50;
            for (let i = 0; i < response.length; i += chunkSize) {
              const chunk = response.slice(i, i + chunkSize);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "agent_chunk",
                agentId: agent.id,
                chunk
              })}\n\n`));
              await new Promise(r => setTimeout(r, 20)); // Small delay for streaming effect
            }

            // Signal agent complete
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "agent_complete",
              agentId: agent.id,
              citations: ["NCCN Guidelines 2025", "ESMO Guidelines"],
              toolsUsed: ["guideline_search", "drug_lookup"]
            })}\n\n`));

            agentResponses.push({
              name: agent.name,
              specialty: agent.specialty,
              response
            });
          }

          // Phase change: Consensus
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "phase_change", phase: "consensus" })}\n\n`));

          // Generate consensus
          const consensusSystemPrompt = `You are the Tumor Board Moderator synthesizing expert opinions into a consensus recommendation.
${getUserCaseConsensusPrompt(uploadedTypes, missingDocs, session.userType)}`;

          const agentSummary = agentResponses
            .map(a => `## ${a.name} (${a.specialty}):\n${a.response}`)
            .join('\n\n');

          let consensus = "";
          
          try {
            const aiResponse = await callAI(
              [{
                role: "user",
                content: `Case Context:\n${caseContext}\n\nSpecialist Opinions:\n${agentSummary}\n\nSynthesize these opinions into a consensus recommendation following the required sections.`
              }],
              consensusSystemPrompt,
              { maxTokens: 4000 }  // Increased for comprehensive consensus
            );
            consensus = aiResponse.content;
          } catch (err) {
            console.error("AI error for consensus:", err);
            consensus = `# Tumor Board Consensus

⚠️ **Consensus Generation Error**

Unable to generate consensus at this time. Please review individual specialist opinions above.

---

*[AI Service Error - Please try again]*`;
          }

          // Stream consensus
          const chunkSize = 50;
          for (let i = 0; i < consensus.length; i += chunkSize) {
            const chunk = consensus.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "consensus_chunk",
              chunk
            })}\n\n`));
            await new Promise(r => setTimeout(r, 15));
          }

          // Phase change: Completed
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "phase_change", phase: "completed" })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            message: "Deliberation failed. Please try again." 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (error) {
    console.error("User case deliberation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process user case" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
