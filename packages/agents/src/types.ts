/**
 * Re-export types from shared package
 * This allows the agents package to be used standalone if needed
 */

// Agent types
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
  | "civic";

export interface AgentPersona {
  id: AgentId;
  name: string;
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

// Case types
export interface CaseData {
  id: string;
  patient: PatientSummary;
  diagnosis: DiagnosisSummary;
  clinicalQuestion: string;
  priority: "urgent" | "routine";
  documents?: DocumentSummary[];
  submittedAt: Date;
  submittedBy?: string;
}

export interface PatientSummary {
  id: string;
  mrn?: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  ecogPs: number;
  comorbidities?: string[];
  smokingHistory?: string;
  insuranceType?: string;
  state?: string;
  language?: string;
}

export interface DiagnosisSummary {
  cancerType: string;
  histology: string;
  histologyCode?: string;
  primarySite: string;
  primarySiteCode?: string;
  stage: StagingSummary;
  biomarkers: BiomarkerResult[];
  genomics?: GenomicsSummary;
  diagnosisDate: Date;
}

export interface StagingSummary {
  clinical: { t: string; n: string; m: string };
  pathological?: { t: string; n: string; m: string };
  composite: string;
  stagingSystem: string;
}

export interface BiomarkerResult {
  name: string;
  result: string;
  method?: string;
  interpretation?: string;
}

export interface GenomicsSummary {
  testType: string;
  mutations: MutationResult[];
  tmb?: number;
  msi?: string;
  testDate?: Date;
  lab?: string;
}

export interface MutationResult {
  gene: string;
  variant: string;
  vaf?: number;
  classification: string;
  actionable: boolean;
}

export interface DocumentSummary {
  id: string;
  type: string;
  name: string;
  uploadedAt: Date;
  extractedText?: string;
}

// Deliberation types
export type DeliberationPhase =
  | "initializing"
  | "round1_opinions"
  | "round2_debate"
  | "round3_consensus"
  | "completed"
  | "error";

export interface DeliberationOptions {
  includeAgents?: AgentId[];
  maxRounds?: number;
  useBatchApi?: boolean;
  usePromptCaching?: boolean;
  useExtendedThinking?: boolean | "auto";
  stream?: boolean;
  onStreamChunk?: (chunk: StreamChunk) => void;
  onPhaseChange?: (phase: DeliberationPhase) => void;
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

export interface DeliberationRound {
  roundNumber: number;
  phase: string;
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
}

export interface ConsensusResult {
  recommendation: TreatmentRecommendation;
  confidence: "high" | "moderate" | "low";
  rationale: string;
  dissentingOpinions?: DissentingOpinion[];
  citations: Citation[];
  cost: number;
  timing: number;
}

export interface TreatmentRecommendation {
  intent: "curative" | "palliative";
  primaryModality: string;
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

// Citation types
export interface Citation {
  id: string;
  source: string;
  title: string;
  section?: string;
  page?: string;
  url?: string;
  evidenceLevel?: string;
  quote?: string;
  retrievedAt: Date;
}
