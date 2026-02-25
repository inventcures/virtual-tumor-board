/**
 * Tumor Board Orchestrator
 * 
 * Main orchestration engine that coordinates multi-agent deliberation.
 * Implements the Chain of Debate mechanism from the specs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { 
  LLMProvider, 
  ProviderFactory, 
  LLMProviderType 
} from "./llm-provider";
import type {
  AgentId,
  AgentResponse,
  CaseData,
  Citation,
  DeliberationOptions,
  DeliberationResult,
  DeliberationPhase,
  TreatmentRecommendation,
} from "../types";
import { AGENT_PERSONAS, DEFAULT_AGENTS } from "../specialists";
import { AGENT_TOOLS } from "../tools";
import { executeToolCall } from "../tools/executor";
import { 
  getAgentSystemPrompt, 
  getReflectiveDraftPrompt, 
  getCritiquePrompt, 
  getRevisionPrompt 
} from "./prompts";
import { formatCaseContext } from "./case-formatter";
import { evaluateSocraticHypothesis, type DeltaReport } from "./socratic-evaluator";

import { PreferenceMemoryStore } from "../memory/preference-store";

export interface OrchestratorConfig {
  /** LLM Provider to use */
  provider?: LLMProviderType;
  /** Anthropic API key */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
  provider: (process.env.VTB_LLM_PROVIDER as LLMProviderType) || "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
  model: process.env.VTB_LLM_MODEL || "claude-sonnet-4-20250514",
  maxTokens: 4096,
  verbose: false,
};

/**
 * Virtual Tumor Board Orchestrator
 * 
 * Coordinates multi-agent deliberation for oncology cases.
 */
export class TumorBoardOrchestrator {
  private provider: LLMProvider;
  private config: Required<OrchestratorConfig>;
  private currentPhase: DeliberationPhase = "initializing";
  private memoryStore: PreferenceMemoryStore;

  constructor(config: OrchestratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = ProviderFactory.create(this.config.provider, this.config.apiKey);
    this.memoryStore = new PreferenceMemoryStore();
  }

  /**
   * Execute a full tumor board deliberation
   */
  async deliberate(
    caseData: CaseData,
    options: DeliberationOptions = {}
  ): Promise<DeliberationResult> {
    const startTime = Date.now();
    const agents = options.includeAgents || DEFAULT_AGENTS;
    
    // Security: Mask PII in logs
    const maskedCaseId = caseData.id.slice(0, 4) + "****";
    this.log("Starting deliberation for case: " + maskedCaseId);
    this.log("Active agents: " + agents.join(", "));
    this.log("Using provider: " + this.config.provider + " (" + this.config.model + ")");

    try {
      // V7 Phase 0: Gatekeeper Check
      this.setPhase("gatekeeper_check", options.onPhaseChange);
      const gatekeeperResult = await this.executeGatekeeper(caseData, options);
      
      // V7 Phase 1: Independent Hypothesis Generation (Round 1)
      this.setPhase("independent_hypothesis", options.onPhaseChange);
      const round1Results = await this.executeRound1(caseData, agents, options);
      
      // V7 Phase 2: Scientific Critique & Stewardship (New Round 2)
      this.setPhase("scientific_critique", options.onPhaseChange);
      const critiqueResults = await this.executeCritiqueRound(caseData, round1Results, options);
      
      // V7 Phase 3: Debate & Conflict Resolution
      this.setPhase("round2_debate", options.onPhaseChange);
      const round2Results = await this.executeRound2(caseData, round1Results, critiqueResults, options);
      
      // V7 Phase 4: Consensus Building (PI Led)
      this.setPhase("round3_consensus", options.onPhaseChange);
      const consensus = await this.buildConsensus(caseData, round1Results, round2Results, options);

      // V19 Phase 5: Socratic Evaluation
      if (options.socraticMode && options.onSocraticPrompt) {
        this.setPhase("socratic_evaluation", options.onPhaseChange);
        this.log("=== V19 PHASE 5: SOCRATIC EVALUATION ===");
        
        try {
          const userHypothesis = await options.onSocraticPrompt();
          if (userHypothesis && userHypothesis.trim() !== "") {
            const anthropicClient = new Anthropic({ apiKey: this.config.apiKey });
            const socraticDelta = await evaluateSocraticHypothesis(
              anthropicClient,
              this.config.model,
              caseData,
              userHypothesis,
              consensus.rationale,
              round1Results.responses
            );
            (consensus as any).socraticDelta = socraticDelta;
            this.log("Socratic evaluation completed successfully.");
          } else {
            this.log("User hypothesis was empty, skipping Socratic evaluation.");
          }
        } catch (error) {
          this.log(`Socratic evaluation failed or was cancelled: ${error}`);
        }
      }

      this.setPhase("completed", options.onPhaseChange);

      const endTime = Date.now();
      
      return {
        caseId: caseData.id,
        status: "completed",
        rounds: {
          round1: {
            roundNumber: 1,
            phase: "initial_opinions",
            activeAgents: agents,
            responses: round1Results.responses,
            startTime: round1Results.startTime,
            endTime: round1Results.endTime,
            cost: round1Results.cost,
          },
          round2: round2Results ? {
            roundNumber: 2,
            phase: "cross_review",
            activeAgents: round2Results.activeAgents,
            responses: round2Results.responses,
            conflicts: round2Results.conflicts,
            startTime: round2Results.startTime,
            endTime: round2Results.endTime,
            cost: round2Results.cost,
          } : undefined,
          consensus,
        },
        recommendation: consensus.recommendation,
        costs: {
          round1: round1Results.cost,
          round2: round2Results?.cost || 0,
          consensus: consensus.cost,
          total: round1Results.cost + (round2Results?.cost || 0) + consensus.cost,
        },
        timing: {
          totalMs: endTime - startTime,
          round1Ms: round1Results.endTime!.getTime() - round1Results.startTime.getTime(),
          round2Ms: round2Results 
            ? round2Results.endTime!.getTime() - round2Results.startTime.getTime() 
            : 0,
          consensusMs: consensus.timing,
        },
      };
    } catch (error) {
      this.setPhase("error", options.onPhaseChange);
      throw error;
    }
  }

  /**
   * V7 Phase 0: Gatekeeper - Check for missing information
   */
  private async executeGatekeeper(
    caseData: CaseData,
    options: DeliberationOptions
  ): Promise<{ passed: boolean; questions?: string[] }> {
    this.log("=== PHASE 0: GATEKEEPER CHECK ===");
    
    // Consult PI to check for missing info
    const piResponse = await this.consultAgent("principal-investigator", caseData, options);
    
    const hasMissingInfo = piResponse.response.toLowerCase().includes("missing information");
    
    if (hasMissingInfo) {
      this.log("Gatekeeper flagged missing info. Proceeding with assumptions.");
    }

    return { passed: !hasMissingInfo };
  }

  /**
   * Round 1: Get initial opinions from all specialists
   */
  private async executeRound1(
    caseData: CaseData,
    agents: AgentId[],
    options: DeliberationOptions
  ): Promise<{
    responses: Map<AgentId, AgentResponse>;
    startTime: Date;
    endTime: Date;
    cost: number;
  }> {
    this.log("=== ROUND 1: INITIAL SPECIALIST OPINIONS ===");
    const startTime = new Date();
    const responses = new Map<AgentId, AgentResponse>();
    let totalCost = 0;

    // Execute agent consultations in parallel using allSettled for robustness
    const results = await Promise.allSettled(
      agents.map(async (agentId) => {
        let response: AgentResponse;
        
        if (options.reflectiveConfig?.enableSelfCritique) {
          response = await this.consultReflectiveAgent(agentId, caseData, options);
        } else {
          response = await this.consultAgent(agentId, caseData, options);
        }

        if (options.onStreamChunk) {
          options.onStreamChunk({
            type: "agent_complete",
            agentId,
            timestamp: Date.now(),
          });
        }
        return response;
      })
    );

    results.forEach((result, index) => {
      const agentId = agents[index];
      if (result.status === "fulfilled") {
        responses.set(agentId, result.value);
        totalCost += this.estimateCost(result.value.tokenUsage);
      } else {
        this.log(`Error consulting ${agentId}: ${result.reason}`);
        // Add a placeholder response for failed agents
        responses.set(agentId, {
          agentId,
          response: `ERROR: Specialist unavailable for consultation. Reason: ${result.reason}`,
          citations: [],
          confidence: "low",
          toolsUsed: [],
          tokenUsage: { input: 0, output: 0 },
          timestamp: new Date()
        });
      }
    });

    return {
      responses,
      startTime,
      endTime: new Date(),
      cost: totalCost,
    };
  }

  /**
   * V7 Phase 2: Scientific Critique & Stewardship
   */
  private async executeCritiqueRound(
    caseData: CaseData,
    round1: { responses: Map<AgentId, AgentResponse> },
    options: DeliberationOptions
  ): Promise<{ responses: Map<AgentId, AgentResponse>; cost: number }> {
    this.log("=== PHASE 2: CRITIQUE & STEWARDSHIP ===");
    const responses = new Map<AgentId, AgentResponse>();
    let totalCost = 0;

    const contextWithRound1 = {
      ...caseData,
      clinicalQuestion: `${caseData.clinicalQuestion}\n\n## PROPOSED PLANS TO CRITIQUE:\n${this.formatRound1ForPrompt(round1.responses)}`
    };

    // Execute critiques in parallel for performance
    const [criticResponse, stewardshipResponse] = await Promise.all([
      this.consultAgent("scientific-critic", contextWithRound1, options),
      this.consultAgent("stewardship", contextWithRound1, options)
    ]);

    responses.set("scientific-critic", criticResponse);
    totalCost += this.estimateCost(criticResponse.tokenUsage);

    responses.set("stewardship", stewardshipResponse);
    totalCost += this.estimateCost(stewardshipResponse.tokenUsage);

    return { responses, cost: totalCost };
  }

  private formatRound1ForPrompt(responses: Map<AgentId, AgentResponse>): string {
    return Array.from(responses.entries())
      .map(([id, r]) => `### ${AGENT_PERSONAS[id].name} (${AGENT_PERSONAS[id].specialty})\n${r.response}`)
      .join("\n\n");
  }

  /**
   * V14: Consult a specialist agent using the Reflective Loop
   */
  private async consultReflectiveAgent(
    agentId: AgentId,
    caseData: CaseData,
    options: DeliberationOptions
  ): Promise<AgentResponse> {
    this.log(`[Reflective] Starting loop for ${agentId}...`);
    
    // 1. DRAFT
    const draftSystemPrompt = getReflectiveDraftPrompt(agentId);
    const draftResponse = await this.consultAgent(
      agentId, 
      caseData, 
      options,
      draftSystemPrompt
    );

    // 2. CRITIQUE
    const persona = AGENT_PERSONAS[agentId];
    const critiqueSystemPrompt = getCritiquePrompt(persona.name, persona.specialty);
    
    const critiqueContext = `## DRAFT PLAN TO EVALUATE
${draftResponse.response}

## PATIENT CONTEXT
${formatCaseContext(caseData)}`;
    
    const critiqueResponse = await this.consultAgent(
      "scientific-critic",
      caseData,
      options,
      critiqueSystemPrompt,
      critiqueContext
    );

    // 3. REVISION
    const revisionSystemPrompt = getRevisionPrompt(agentId)
      .replace("{CRITIQUE_INSERTION_POINT}", critiqueResponse.response);
      
    const finalResponse = await this.consultAgent(
      agentId,
      caseData,
      options,
      revisionSystemPrompt
    );

    return {
      ...finalResponse,
      tokenUsage: {
        input: draftResponse.tokenUsage.input + critiqueResponse.tokenUsage.input + finalResponse.tokenUsage.input,
        output: draftResponse.tokenUsage.output + critiqueResponse.tokenUsage.output + finalResponse.tokenUsage.output,
      }
    };
  }

  /**
   * Consult a single specialist agent
   */
  private async consultAgent(
    agentId: AgentId,
    caseData: CaseData,
    options: DeliberationOptions,
    systemPromptOverride?: string,
    userMessageOverride?: string
  ): Promise<AgentResponse> {
    const persona = AGENT_PERSONAS[agentId];
    const tools = AGENT_TOOLS[agentId];
    const systemPrompt = systemPromptOverride || getAgentSystemPrompt(agentId);
    
    const clinicianId = caseData.submittedBy || "default_clinician";
    const preferencesContext = await this.memoryStore.getFormattedPreferencesContext(clinicianId);

    const messageContent = userMessageOverride || `## CASE FOR TUMOR BOARD REVIEW

${formatCaseContext(caseData)}

${preferencesContext ? "\n" + preferencesContext + "\n" : ""}
---

Please provide your ${persona.specialty} assessment of this case.
Use the available tools to retrieve relevant guidelines and evidence.
Structure your response with clear recommendations and citations.`;

    this.log(`Consulting ${persona.name} (${persona.specialty})...`);

    if (options.onStreamChunk) {
      options.onStreamChunk({
        type: "agent_start",
        agentId,
        timestamp: Date.now(),
      });
    }

    const messages: any[] = [
      {
        role: "user",
        content: messageContent,
      },
    ];

    let response = await this.provider.generate({
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      system: systemPrompt,
      tools,
      messages,
      usePromptCaching: options.usePromptCaching ?? true,
    });

    const allCitations: Citation[] = [];
    const toolsUsed: string[] = [];
    
    while (response.stopReason === "tool_use" && response.toolCalls) {
      const toolResults = await Promise.all(
        response.toolCalls.map(async (toolUse: any) => {
          this.log(`  Tool call: ${toolUse.name}`);
          toolsUsed.push(toolUse.name);
          
          if (options.onStreamChunk) {
            options.onStreamChunk({
              type: "tool_call",
              agentId,
              toolName: toolUse.name,
              toolInput: toolUse.input,
              timestamp: Date.now(),
            });
          }
          
          const result = await executeToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );
          
          if (result.citations) {
            allCitations.push(...result.citations);
          }
          
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages.push({ role: "assistant", content: response.content || "Processing tool results..." });
      messages.push({ role: "user", content: toolResults });

      response = await this.provider.generate({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    this.log("  " + persona.name + " completed (" + response.usage.output + " tokens)");

    return {
      agentId,
      response: response.content,
      citations: allCitations,
      confidence: this.assessConfidence(response.content),
      toolsUsed,
      tokenUsage: response.usage,
      timestamp: new Date(),
    };
  }

  /**
   * Round 2: Chain of Debate
   */
  private async executeRound2(
    caseData: CaseData,
    round1: { responses: Map<AgentId, AgentResponse> },
    critique: { responses: Map<AgentId, AgentResponse> },
    options: DeliberationOptions
  ): Promise<{
    activeAgents: AgentId[];
    responses: Map<AgentId, AgentResponse>;
    conflicts: { id: string; topic: string; agents: AgentId[]; positions: Map<AgentId, string> }[];
    startTime: Date;
    endTime: Date;
    cost: number;
  } | null> {
    this.log("=== ROUND 2: CHAIN OF DEBATE & REBUTTAL ===");
    
    const conflicts = this.identifyConflicts(round1.responses);
    const criticResponse = critique.responses.get("scientific-critic");
    const hasCriticObjection = criticResponse?.response.toLowerCase().includes("objection") || 
                               criticResponse?.response.toLowerCase().includes("unsafe");

    if (conflicts.length === 0 && !hasCriticObjection) {
      this.log("No significant conflicts or safety objections. Skipping detailed debate.");
      return null;
    }

    const startTime = new Date();
    const responses = new Map<AgentId, AgentResponse>();

    const moderatorId: AgentId = "principal-investigator";
    
    const conflictSummary = conflicts
      .map((c) => {
        const agentPositions = Array.from(c.positions.entries())
          .map(([a, p]) => `${AGENT_PERSONAS[a].name}: ${p}`)
          .join(" vs ");
        return `- ${c.topic}: ${agentPositions}`;
      })
      .join("\n");

    const critiqueSummary = `
### CRITIQUE (Dr. Tark)
${critique.responses.get("scientific-critic")?.response || "None"}

### STEWARDSHIP (Dr. Samata)
${critique.responses.get("stewardship")?.response || "None"}
`;

    const debateResponse = await this.consultAgent(moderatorId, {
      ...caseData,
      clinicalQuestion: `${caseData.clinicalQuestion}\n\n## DEBATE CONTEXT\n${conflictSummary}\n\n${critiqueSummary}`
    }, options);

    responses.set(moderatorId, debateResponse);

    return {
      activeAgents: [moderatorId],
      responses,
      conflicts,
      startTime,
      endTime: new Date(),
      cost: this.estimateCost(debateResponse.tokenUsage),
    };
  }

  /**
   * Round 3: Build consensus recommendation
   */
  private async buildConsensus(
    caseData: CaseData,
    round1: { responses: Map<AgentId, AgentResponse> },
    round2: { responses: Map<AgentId, AgentResponse>; conflicts: unknown[] } | null,
    options: DeliberationOptions
  ): Promise<{
    recommendation: TreatmentRecommendation;
    confidence: "high" | "moderate" | "low";
    rationale: string;
    citations: Citation[];
    cost: number;
    timing: number;
  }> {
    this.log("=== ROUND 3: CONSENSUS BUILDING ===");
    const startTime = Date.now();

    const allOpinions = Array.from(round1.responses.entries())
      .map(([id, r]) => `### ${AGENT_PERSONAS[id].name} (${AGENT_PERSONAS[id].specialty})\n${r.response}`)
      .join("\n\n---\n\n");

    const debateSummary = round2 
      ? Array.from(round2.responses.values()).map(r => r.response).join("\n\n")
      : "No significant disagreements requiring debate resolution.";

    const response = await this.provider.generate({
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      system: `You are the Tumor Board Conductor synthesizing the final consensus recommendation.
Your output must be actionable, evidence-based, and clearly documented.`,
      messages: [
        {
          role: "user",
          content: `## TUMOR BOARD DELIBERATION SUMMARY

### Patient Case
${formatCaseContext(caseData)}

### Specialist Opinions (Round 1)
${allOpinions}

### Debate Summary (Round 2)
${debateSummary}

---

## GENERATE FINAL CONSENSUS

Please provide the final tumor board recommendation. Your response should be structured to be easily parsed.`,
        },
      ],
    });

    const recommendation = this.parseRecommendation(response.content, round1.responses);
    const allCitations = this.collectCitations(round1.responses);

    return {
      recommendation,
      confidence: this.assessOverallConfidence(round1.responses),
      rationale: response.content,
      citations: allCitations,
      cost: this.estimateCost(response.usage),
      timing: Date.now() - startTime,
    };
  }

  /**
   * Identify conflicts between agent recommendations
   */
  private identifyConflicts(
    responses: Map<AgentId, AgentResponse>
  ): { id: string; topic: string; agents: AgentId[]; positions: Map<AgentId, string> }[] {
    const conflicts: { id: string; topic: string; agents: AgentId[]; positions: Map<AgentId, string> }[] = [];
    
    const surgicalResponse = responses.get("surgical-oncologist")?.response.toLowerCase() || "";
    const medicalResponse = responses.get("medical-oncologist")?.response.toLowerCase() || "";
    const radiationResponse = responses.get("radiation-oncologist")?.response.toLowerCase() || "";

    if (
      (surgicalResponse.includes("recommend surgery") || surgicalResponse.includes("surgical candidate")) &&
      (medicalResponse.includes("not a surgical candidate") || radiationResponse.includes("definitive chemoradiation"))
    ) {
      conflicts.push({
        id: "conflict-1",
        topic: "Primary Treatment Modality",
        agents: ["surgical-oncologist", "medical-oncologist", "radiation-oncologist"],
        positions: new Map([
          ["surgical-oncologist", "Recommends surgical approach"],
          ["medical-oncologist", "Considers non-surgical approach"],
          ["radiation-oncologist", "Recommends definitive chemoradiation"],
        ]),
      });
    }

    return conflicts;
  }

  /**
   * Parse consensus text into structured recommendation
   */
  private parseRecommendation(
    consensusText: string,
    responses: Map<AgentId, AgentResponse>
  ): TreatmentRecommendation {
    const isCurative = consensusText.toLowerCase().includes("curative");
    
    let primaryModality: TreatmentRecommendation["primaryModality"] = "multimodal";
    if (consensusText.toLowerCase().includes("surgery")) primaryModality = "surgery";
    else if (consensusText.toLowerCase().includes("chemoradiation")) primaryModality = "chemoradiation";
    else if (consensusText.toLowerCase().includes("immunotherapy")) primaryModality = "immunotherapy";
    else if (consensusText.toLowerCase().includes("targeted")) primaryModality = "targeted";

    const patientSummaryMatch = consensusText.match(/8\\.\\s*\\*\\*PATIENT-FACING SUMMARY\\*\\*:\\s*([\\s\\S]*?)(?:9\\.\\s*\\*\\*DISSENTING OPINIONS\\*\\*|$)/i) || 
                                consensusText.match(/PATIENT-FACING SUMMARY\\*\\*?\\s*([\\s\\S]*?)(?:\\n\\d\\.|DISSENTING|$)/i);
    const patientFacingSummary = patientSummaryMatch ? patientSummaryMatch[1].trim() : undefined;

    return {
      intent: isCurative ? "curative" : "palliative",
      primaryModality,
      summary: consensusText.slice(0, 1000), // Increased slice for more context
      components: [
        {
          modality: primaryModality,
          details: "See full consensus for details",
          agentSource: "medical-oncologist",
        },
      ],
      patientFacingSummary,
    };
  }

  /**
   * Collect all citations
   */
  private collectCitations(responses: Map<AgentId, AgentResponse>): Citation[] {
    const citations: Citation[] = [];
    for (const response of responses.values()) {
      citations.push(...response.citations);
    }
    return citations;
  }

  /**
   * Assess confidence
   */
  private assessConfidence(text: string): "high" | "moderate" | "low" {
    const lowConfidenceIndicators = ["uncertain", "unclear", "limited evidence", "consider"];
    const highConfidenceIndicators = ["strongly recommend", "category 1", "definitive", "standard of care"];
    
    const lowerText = text.toLowerCase();
    const lowCount = lowConfidenceIndicators.filter(i => lowerText.includes(i)).length;
    const highCount = highConfidenceIndicators.filter(i => lowerText.includes(i)).length;
    
    if (highCount > lowCount) return "high";
    if (lowCount > highCount) return "low";
    return "moderate";
  }

  /**
   * Assess overall confidence
   */
  private assessOverallConfidence(responses: Map<AgentId, AgentResponse>): "high" | "moderate" | "low" {
    const confidences = Array.from(responses.values()).map(r => r.confidence);
    const highCount = confidences.filter(c => c === "high").length;
    const lowCount = confidences.filter(c => c === "low").length;
    
    if (highCount > responses.size / 2) return "high";
    if (lowCount > responses.size / 2) return "low";
    return "moderate";
  }

  /**
   * Estimate cost in USD
   */
  private estimateCost(usage: { input: number; output: number }): number {
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;
    return (usage.input / 1000) * inputCostPer1k + (usage.output / 1000) * outputCostPer1k;
  }

  /**
   * Set current phase
   */
  private setPhase(phase: DeliberationPhase, onPhaseChange?: (phase: DeliberationPhase) => void): void {
    this.currentPhase = phase;
    this.log("Phase: " + phase);
    if (onPhaseChange) {
      onPhaseChange(phase);
    }
  }

  /**
   * Log message
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log("[VTB] " + message);
    }
  }
}
