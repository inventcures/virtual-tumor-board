/**
 * Agent Types for Virtual Tumor Board
 * Based on MAI-DxO architecture adapted for oncology MDT
 */

export type AgentId =
  | "surgical-oncologist"
  | "medical-oncologist"
  | "radiation-oncologist"
  | "palliative-care"
  | "radiologist"
  | "pathologist"
  | "geneticist";

export type GuidelineSource =
  | "nccn"
  | "esmo"
  | "astro"
  | "acr"
  | "cap"
  | "clinvar"
  | "civic"
  | "sso"; // Society of Surgical Oncology

export interface AgentPersona {
  id: AgentId;
  name: string; // Indian name (e.g., "Dr. Shalya")
  specialty: string;
  personality: string;
  primaryGuideline: GuidelineSource;
  secondaryGuidelines: GuidelineSource[];
  evaluationFramework: string[];
  indianContextConsiderations: string[];
}

export interface AgentResponse {
  agentId: AgentId;
  response: string;
  citations: Citation[];
  confidence: "high" | "moderate" | "low";
  toolsUsed: string[];
  tokenUsage: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  timestamp: Date;
}

export interface AgentConsultationStructured {
  agent_id: AgentId;
  specialty: string;
  assessment: {
    summary: string;
    key_issues: string[];
  };
  recommendation: {
    primary: string;
    alternatives?: string[];
    rationale: string;
    confidence: "high" | "moderate" | "low";
  };
  guideline_citations: {
    source: string;
    section?: string;
    recommendation_level?: string;
  }[];
  additional_workup?: string[];
  indian_context?: {
    availability_concerns?: string[];
    cost_considerations?: string;
    alternatives_for_india?: string[];
  };
  follow_up?: {
    timeline?: string;
    monitoring?: string[];
  };
}

// Import Citation from citations module
import { Citation } from "./citations";
