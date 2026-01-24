/**
 * Agent-Specific Tool Configurations
 * 
 * Each specialist agent has access to a curated set of tools relevant to their specialty.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { AgentId } from "../types";
import {
  ragRetrieveTool,
  literatureSearchTool,
  stagingCalculatorTool,
  drugLookupTool,
  trialSearchTool,
  biomarkerInterpretTool,
} from "./definitions";

/**
 * Tools available to each specialist agent
 */
export const AGENT_TOOLS: Record<AgentId, Anthropic.Messages.Tool[]> = {
  "surgical-oncologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
    literatureSearchTool,
  ],
  
  "medical-oncologist": [
    ragRetrieveTool,
    literatureSearchTool,
    drugLookupTool,
    trialSearchTool,
    biomarkerInterpretTool,
  ],
  
  "radiation-oncologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
    literatureSearchTool,
  ],
  
  "palliative-care": [
    ragRetrieveTool,
    drugLookupTool,
  ],
  
  "radiologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
  ],
  
  "pathologist": [
    ragRetrieveTool,
    biomarkerInterpretTool,
  ],
  
  "geneticist": [
    ragRetrieveTool,
    biomarkerInterpretTool,
    trialSearchTool,
    literatureSearchTool,
  ],
};

/**
 * Get tools for a specific agent
 */
export function getAgentTools(agentId: AgentId): Anthropic.Messages.Tool[] {
  const tools = AGENT_TOOLS[agentId];
  if (!tools) {
    throw new Error(`Unknown agent ID: ${agentId}`);
  }
  return tools;
}
