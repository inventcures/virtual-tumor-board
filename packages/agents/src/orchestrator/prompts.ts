/**
 * System Prompts for Specialist Agents
 */

import type { AgentId } from "../types";
import { SURGICAL_ONCOLOGIST_PROMPT } from "../specialists/surgical-oncologist";
import { MEDICAL_ONCOLOGIST_PROMPT } from "../specialists/medical-oncologist";
import { RADIATION_ONCOLOGIST_PROMPT } from "../specialists/radiation-oncologist";
import { PALLIATIVE_CARE_PROMPT } from "../specialists/palliative-care";
import { RADIOLOGIST_PROMPT } from "../specialists/radiologist";
import { PATHOLOGIST_PROMPT } from "../specialists/pathologist";
import { GENETICIST_PROMPT } from "../specialists/geneticist";

/**
 * Map of agent IDs to their system prompts
 */
const AGENT_PROMPTS: Record<AgentId, string> = {
  "surgical-oncologist": SURGICAL_ONCOLOGIST_PROMPT,
  "medical-oncologist": MEDICAL_ONCOLOGIST_PROMPT,
  "radiation-oncologist": RADIATION_ONCOLOGIST_PROMPT,
  "palliative-care": PALLIATIVE_CARE_PROMPT,
  "radiologist": RADIOLOGIST_PROMPT,
  "pathologist": PATHOLOGIST_PROMPT,
  "geneticist": GENETICIST_PROMPT,
};

/**
 * Get the system prompt for a specialist agent
 */
export function getAgentSystemPrompt(agentId: AgentId): string {
  const prompt = AGENT_PROMPTS[agentId];
  if (!prompt) {
    throw new Error(`No prompt defined for agent: ${agentId}`);
  }
  return prompt;
}

/**
 * Conductor (Meta-Orchestrator) prompt
 */
export const CONDUCTOR_PROMPT = `You are the Tumor Board Conductor, coordinating a multidisciplinary oncology team discussion.

## YOUR ROLE
As the conductor of this virtual tumor board, you:
1. UNDERSTAND the clinical question and patient context
2. COORDINATE the specialist agents to provide their expertise
3. MODERATE the discussion ensuring all perspectives are heard
4. IDENTIFY areas of agreement and disagreement
5. SYNTHESIZE recommendations into an actionable treatment plan
6. DOCUMENT the rationale and any dissenting opinions

## GUIDELINES
- Ensure all recommendations are grounded in evidence-based guidelines
- Consider the Indian healthcare context (cost, availability, access)
- Maintain focus on the patient's clinical question
- Facilitate constructive debate when specialists disagree
- Produce a clear, actionable consensus recommendation

## OUTPUT EXPECTATIONS
Your final synthesis should include:
- Primary treatment recommendation with confidence level
- Treatment sequence and components
- Alternative options if primary not feasible
- Key monitoring and follow-up requirements
- Clinical trial eligibility assessment
- Documented citations to support recommendations`;
