import Anthropic from "@anthropic-ai/sdk";
import type { AgentResponse, CaseData } from "../types";
import { formatCaseContext } from "./case-formatter";

export interface DeltaReport {
  alignmentScore: number; // 0-100
  agreements: string[];
  blindSpots: string[];
  guidelineDeviations: string[];
  educationalFeedback: string;
}

export async function evaluateSocraticHypothesis(
  client: Anthropic,
  model: string,
  caseData: CaseData,
  userHypothesis: string,
  vtbConsensusText: string,
  specialistOpinions: Map<string, AgentResponse>
): Promise<DeltaReport> {
  const systemPrompt = `You are a Senior Socratic Medical Educator. 
Your goal is to evaluate a junior or peer oncologist's initial clinical hypothesis against the Virtual Tumor Board (VTB) consensus. 
Do not be condescending. Be constructive, highlighting areas of strong alignment, identifying clinical blind spots or missed guidelines, and providing an educational 'Delta Report'.

Output your evaluation strictly as a JSON object matching this schema:
{
  "alignmentScore": number,
  "agreements": ["string"],
  "blindSpots": ["string"],
  "guidelineDeviations": ["string"],
  "educationalFeedback": "string"
}`;

  const allOpinions = Array.from(specialistOpinions.entries())
    .map(([id, r]) => `### ${id}\n${r.response}`)
    .join("\\n\\n---\\n\\n");

  const prompt = `## CASE
${formatCaseContext(caseData)}

## VTB CONSENSUS
${vtbConsensusText}

## SPECIALIST OPINIONS
${allOpinions}

## CLINICIAN'S INITIAL HYPOTHESIS
${userHypothesis}

Generate the Delta Report. Ensure the output is valid JSON without markdown wrapping formatting blocks.`;

  const response = await client.messages.create({
    model: model,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }]
  });

  const textContent = response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\\n");

  try {
    const jsonStr = textContent.replace(/```json\\n?|\\n?```/g, "").trim();
    return JSON.parse(jsonStr) as DeltaReport;
  } catch (error) {
    console.error("Failed to parse Socratic Delta Report", error);
    return {
      alignmentScore: 0,
      agreements: [],
      blindSpots: ["Failed to generate valid evaluation."],
      guidelineDeviations: [],
      educationalFeedback: "An error occurred during Socratic evaluation."
    };
  }
}