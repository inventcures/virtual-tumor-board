/**
 * Live AI Deliberation Endpoint
 * 
 * Uses real AI (Claude with Gemini fallback) to generate tumor board responses.
 * Falls back to cached/placeholder responses if both AI providers fail.
 */

import { NextRequest } from "next/server";
import { callAI, getAvailableProviders, AIResponse, AIError } from "@/lib/ai-service";
import { getCaseById, SampleCase } from "@/lib/sample-cases";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

// Agent configurations
const AGENTS = [
  {
    id: "surgical-oncologist",
    name: "Dr. Shalya",
    specialty: "Surgical Oncology",
    prompt: "Assess surgical options, resectability, and timing of surgery.",
  },
  {
    id: "medical-oncologist", 
    name: "Dr. Chikitsa",
    specialty: "Medical Oncology",
    prompt: "Recommend systemic therapy options based on biomarkers and guidelines.",
  },
  {
    id: "radiation-oncologist",
    name: "Dr. Kirann", 
    specialty: "Radiation Oncology",
    prompt: "Assess role of radiation therapy, technique, and timing.",
  },
  {
    id: "palliative-care",
    name: "Dr. Shanti",
    specialty: "Palliative Care",
    prompt: "Address symptom management, quality of life, and goals of care.",
  },
  {
    id: "radiologist",
    name: "Dr. Chitran",
    specialty: "Onco-Radiology",
    prompt: "Review imaging findings and recommend further imaging.",
  },
  {
    id: "pathologist",
    name: "Dr. Marga",
    specialty: "Pathology",
    prompt: "Review pathology and biomarker findings.",
  },
  {
    id: "geneticist",
    name: "Dr. Anuvamsha",
    specialty: "Genetics",
    prompt: "Interpret genomic findings and recommend targeted therapies.",
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

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const { allowed, retryAfterMs } = rateLimit(ip, { maxRequests: 5, windowMs: 300_000 });
  if (!allowed) return rateLimitResponse(retryAfterMs);

  const encoder = new TextEncoder();

  try {
    const { caseId, useAI = true } = await request.json();

    if (!caseId || typeof caseId !== "string" || caseId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(caseId)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing caseId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sampleCase = getCaseById(caseId);
    if (!sampleCase) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const providers = getAvailableProviders();
    const hasAI = providers.claude || providers.gemini;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "status",
          providers,
          useAI: useAI && hasAI,
          caseId,
        })}\n\n`));

        const caseContext = buildCaseContext(sampleCase);
        const agentResponses: { name: string; specialty: string; response: string }[] = [];

        // Process each agent
        for (const agent of AGENTS) {
          // Signal agent starting
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "agent_start",
            agentId: agent.id,
            name: agent.name,
            specialty: agent.specialty,
          })}\n\n`));

          let response: string;
          let provider: string = "placeholder";

          if (useAI && hasAI) {
            try {
              const aiResponse = await callAI(
                [{ role: "user", content: `${caseContext}\n\nYour task: ${agent.prompt}\n\nProvide your specialist assessment.` }],
                `You are ${agent.name}, a ${agent.specialty} specialist on a virtual tumor board. Be concise and evidence-based. Cite NCCN, ESMO, or other relevant guidelines. Consider Indian healthcare context.`,
                { maxTokens: 1500 }
              );
              response = aiResponse.content;
              provider = aiResponse.provider;
            } catch (err) {
              const aiError = err as AIError;
              console.error(`AI error for ${agent.name}:`, aiError.message);
              
              // Use placeholder on error
              response = generatePlaceholderResponse(agent, sampleCase);
              provider = "placeholder";
            }
          } else {
            response = generatePlaceholderResponse(agent, sampleCase);
          }

          agentResponses.push({
            name: agent.name,
            specialty: agent.specialty,
            response,
          });

          // Send agent response
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "agent_response",
            agentId: agent.id,
            name: agent.name,
            specialty: agent.specialty,
            response,
            provider,
          })}\n\n`));

          // Small delay between agents
          await new Promise(r => setTimeout(r, 100));
        }

        // Generate consensus
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "consensus_start",
        })}\n\n`));

        let consensus: string;
        let consensusProvider: string = "placeholder";

        if (useAI && hasAI) {
          try {
            const aiResponse = await callAI(
              [{
                role: "user",
                content: `Case:\n${caseContext}\n\nSpecialist Opinions:\n${agentResponses.map(a => `## ${a.name} (${a.specialty})\n${a.response}`).join('\n\n')}\n\nSynthesize into a consensus recommendation.`,
              }],
              `You are the Tumor Board Moderator. Synthesize all specialist opinions into a clear consensus recommendation. Include: 1) Key agreements 2) Resolved disagreements 3) Final recommendation 4) Follow-up plan. Consider Indian healthcare context.`,
              { maxTokens: 2000 }
            );
            consensus = aiResponse.content;
            consensusProvider = aiResponse.provider;
          } catch (err) {
            consensus = generatePlaceholderConsensus(sampleCase);
          }
        } else {
          consensus = generatePlaceholderConsensus(sampleCase);
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "consensus",
          consensus,
          provider: consensusProvider,
        })}\n\n`));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process deliberation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function generatePlaceholderResponse(agent: typeof AGENTS[0], sampleCase: SampleCase): string {
  return `## ${agent.specialty} Assessment

**For**: ${sampleCase.patient.name}, ${sampleCase.cancer.stage} ${sampleCase.cancer.type}

### Key Points:
- Stage: ${sampleCase.cancer.stage}
- Site: ${sampleCase.cancer.primarySite}
- Histology: ${sampleCase.cancer.histology}

### Considerations:
${sampleCase.keyConsiderations.slice(0, 2).map(k => `- ${k}`).join('\n')}

### Recommendation:
Treatment approach should be individualized based on MDT discussion.

*[Placeholder - AI service unavailable]*`;
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

// GET endpoint to check AI status
export async function GET() {
  const providers = getAvailableProviders();
  return new Response(
    JSON.stringify({
      status: "ok",
      providers,
      hasAI: providers.claude || providers.gemini,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
