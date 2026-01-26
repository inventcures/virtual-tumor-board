/**
 * Specialist Agents for Virtual Tumor Board
 * 
 * 7 AI agents representing oncology sub-specialties:
 * - Dr. Shalya (Surgical Oncology)
 * - Dr. Chikitsa (Medical Oncology)
 * - Dr. Kirann (Radiation Oncology)
 * - Dr. Shanti (Palliative Care)
 * - Dr. Chitran (Onco-Radiology)
 * - Dr. Marga (Pathology)
 * - Dr. Anuvamsha (Genetics)
 */

import type { AgentId, AgentPersona } from "../types";

export * from "./surgical-oncologist";
export * from "./medical-oncologist";
export * from "./radiation-oncologist";
export * from "./palliative-care";
export * from "./radiologist";
export * from "./pathologist";
export * from "./geneticist";
export * from "./scientific-critic";
export * from "./stewardship";
export * from "./principal-investigator";

import { SURGICAL_ONCOLOGIST } from "./surgical-oncologist";
import { MEDICAL_ONCOLOGIST } from "./medical-oncologist";
import { RADIATION_ONCOLOGIST } from "./radiation-oncologist";
import { PALLIATIVE_CARE } from "./palliative-care";
import { RADIOLOGIST } from "./radiologist";
import { PATHOLOGIST } from "./pathologist";
import { GENETICIST } from "./geneticist";
import { SCIENTIFIC_CRITIC } from "./scientific-critic";
import { STEWARDSHIP } from "./stewardship";
import { PRINCIPAL_INVESTIGATOR } from "./principal-investigator";

/**
 * All agent personas indexed by ID
 */
export const AGENT_PERSONAS: Record<AgentId, AgentPersona> = {
  "surgical-oncologist": SURGICAL_ONCOLOGIST,
  "medical-oncologist": MEDICAL_ONCOLOGIST,
  "radiation-oncologist": RADIATION_ONCOLOGIST,
  "palliative-care": PALLIATIVE_CARE,
  "radiologist": RADIOLOGIST,
  "pathologist": PATHOLOGIST,
  "geneticist": GENETICIST,
  "scientific-critic": SCIENTIFIC_CRITIC,
  "stewardship": STEWARDSHIP,
  "principal-investigator": PRINCIPAL_INVESTIGATOR,
};

/**
 * Get agent persona by ID
 */
export function getAgentPersona(agentId: AgentId): AgentPersona {
  const persona = AGENT_PERSONAS[agentId];
  if (!persona) {
    throw new Error(`Unknown agent ID: ${agentId}`);
  }
  return persona;
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds(): AgentId[] {
  return Object.keys(AGENT_PERSONAS) as AgentId[];
}

/**
 * Default agents to include in deliberation
 */
export const DEFAULT_AGENTS: AgentId[] = [
  "surgical-oncologist",
  "medical-oncologist",
  "radiation-oncologist",
  "palliative-care",
  "radiologist",
  "pathologist",
  "geneticist",
];
