/**
 * Deliberation Types for Virtual Tumor Board
 * Represents the multi-agent deliberation process
 */

import { AgentId, AgentResponse } from "./agents";
import { Citation } from "./citations";
import { CaseData } from "./case";

export type DeliberationPhase =
  | "initializing"
  | "round1_opinions"
  | "round2_debate"
  | "round3_consensus"
  | "completed"
  | "error";

export interface DeliberationOptions {
  /** Agents to include (default: all 7) */
  includeAgents?: AgentId[];
  /** Maximum deliberation rounds (default: 3) */
  maxRounds?: number;
  /** Use batch API for Round 1 (default: true) */
  useBatchApi?: boolean;
  /** Enable prompt caching (default: true) */
  usePromptCaching?: boolean;
  /** Use extended thinking for complex cases (default: auto) */
  useExtendedThinking?: boolean | "auto";
  /** Stream responses (default: true) */
  stream?: boolean;
  /** Callback for stream chunks */
  onStreamChunk?: (chunk: StreamChunk) => void;
  /** Callback for phase changes */
  onPhaseChange?: (phase: DeliberationPhase) => void;
  /** Warm caches before deliberation (default: true) */
  warmCache?: boolean;
}

export interface StreamChunk {
  type: "text_delta" | "tool_call" | "agent_start" | "agent_complete" | "phase_change";
  agentId?: AgentId;
  content?: string;
  toolName?: string;
  toolInput?: unknown;
  phase?: DeliberationPhase;
  timestamp: number;
}

export interface DeliberationRound {
  roundNumber: 1 | 2 | 3;
  phase: "initial_opinions" | "cross_review" | "consensus";
  activeAgents: AgentId[];
  responses: Map<AgentId, AgentResponse>;
  conflicts?: ConflictRecord[];
  startTime: Date;
  endTime?: Date;
  cost: number;
}

export interface ConflictRecord {
  id: string;
  topic: string;
  agents: AgentId[];
  positions: Map<AgentId, string>;
  resolution?: string;
  resolvedBy?: "debate" | "conductor" | "human";
}

export interface ConsensusResult {
  recommendation: TreatmentRecommendation;
  confidence: "high" | "moderate" | "low";
  rationale: string;
  dissentingOpinions?: DissentingOpinion[];
  citations: Citation[];
  thinkingTokens?: number; // If extended thinking was used
  cost: number;
  timing: number; // ms
}

export interface TreatmentRecommendation {
  intent: "curative" | "palliative";
  primaryModality: "surgery" | "chemotherapy" | "radiation" | "chemoradiation" | "targeted" | "immunotherapy" | "multimodal";
  summary: string;
  components: TreatmentComponent[];
  sequence?: string;
  alternativeOptions?: string[];
  clinicalTrialEligibility?: string;
}

export interface TreatmentComponent {
  modality: string;
  details: string;
  timing?: string;
  agentSource: AgentId;
  guidelineReference?: string;
}

export interface DissentingOpinion {
  agentId: AgentId;
  opinion: string;
  rationale: string;
}

export interface DeliberationResult {
  caseId: string;
  status: "completed" | "error" | "timeout";
  rounds: {
    round1?: DeliberationRound;
    round2?: DeliberationRound;
    consensus?: ConsensusResult;
  };
  recommendation?: TreatmentRecommendation;
  costs: CostBreakdown;
  timing: TimingBreakdown;
  cacheStats?: CacheStats;
  error?: string;
}

export interface CostBreakdown {
  round1: number;
  round2: number;
  consensus: number;
  total: number;
}

export interface TimingBreakdown {
  totalMs: number;
  round1Ms: number;
  round2Ms: number;
  consensusMs: number;
}

export interface CacheStats {
  hitRate: number;
  tokensSaved: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Format case data for agent consumption
 * Includes security: Masking PII
 */
export function formatCaseForAgent(caseData: CaseData): string {
  const { patient, diagnosis, clinicalQuestion } = caseData;

  // Mask PII: Use initials or generic name
  const maskedName = patient.name.split(' ').map(n => n[0] + '.').join(' ');

  const biomarkersStr = diagnosis.biomarkers
    .map((b) => `- ${b.name}: ${b.result}${b.interpretation ? ` (${b.interpretation})` : ""}`)
    .join("\n");

  const mutationsStr = diagnosis.genomics?.mutations
    .map((m) => `- ${m.gene} ${m.variant}: ${m.classification}${m.actionable ? " [ACTIONABLE]" : ""}`)
    .join("\n") || "Not performed";

  return `
## PATIENT INFORMATION
- Name: ${maskedName} (De-identified)
- Age/Gender: ${patient.age}${patient.gender === "male" ? "M" : patient.gender === "female" ? "F" : "O"}
- ECOG Performance Status: ${patient.ecogPs}
- Comorbidities: ${patient.comorbidities?.join(", ") || "None documented"}
- Smoking History: ${patient.smokingHistory || "Not documented"}
- Insurance: ${patient.insuranceType || "Not documented"}
- State: ${patient.state || "Not documented"}

## DIAGNOSIS
- Cancer Type: ${diagnosis.cancerType}
- Histology: ${diagnosis.histology}
- Primary Site: ${diagnosis.primarySite}
- Diagnosis Date: ${diagnosis.diagnosisDate.toISOString().split("T")[0]}

## STAGING (${diagnosis.stage.stagingSystem.toUpperCase()})
- Clinical: c${diagnosis.stage.clinical.t}${diagnosis.stage.clinical.n}${diagnosis.stage.clinical.m}
${diagnosis.stage.pathological ? `- Pathological: p${diagnosis.stage.pathological.t}${diagnosis.stage.pathological.n}${diagnosis.stage.pathological.m}` : ""}
- Composite Stage: ${diagnosis.stage.composite}

## BIOMARKERS
${biomarkersStr}

## GENOMICS
- Test Type: ${diagnosis.genomics?.testType || "Not performed"}
- TMB: ${diagnosis.genomics?.tmb ?? "N/A"} mut/Mb
- MSI Status: ${diagnosis.genomics?.msi || "N/A"}
- Key Mutations:
${mutationsStr}

## CLINICAL QUESTION
${clinicalQuestion}
`.trim();
}
