/**
 * Tumor Board Orchestrator
 * 
 * Main orchestration engine that coordinates multi-agent deliberation.
 * Implements the Chain of Debate mechanism from the specs.
 */

import Anthropic from "@anthropic-ai/sdk";
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
import { getAgentSystemPrompt } from "./prompts";
import { formatCaseContext } from "./case-formatter";

export interface OrchestratorConfig {
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
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  verbose: false,
};

/**
 * Virtual Tumor Board Orchestrator
 * 
 * Coordinates multi-agent deliberation for oncology cases.
 */
export class TumorBoardOrchestrator {
  private client: Anthropic;
  private config: Required<OrchestratorConfig>;
  private currentPhase: DeliberationPhase = "initializing";

  constructor(config: OrchestratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
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
    
    this.log(`Starting deliberation for case: ${caseData.id}`);
    this.log(`Active agents: ${agents.join(", ")}`);

    try {
      // V7 Phase 0: Gatekeeper Check
      // Ensure we have enough info to proceed. If missing, PI generates specific questions.
      this.setPhase("gatekeeper_check", options.onPhaseChange);
      const gatekeeperResult = await this.executeGatekeeper(caseData, options);
      
      // V7 Phase 1: Independent Hypothesis Generation (Round 1)
      // Specialists generate plans in isolation to avoid groupthink.
      this.setPhase("independent_hypothesis", options.onPhaseChange);
      const round1Results = await this.executeRound1(caseData, agents, options);
      
      // V7 Phase 2: Scientific Critique & Stewardship (New Round 2)
      // Dr. Tark (Critic) and Dr. Samata (Stewardship) review the plans.
      this.setPhase("scientific_critique", options.onPhaseChange);
      const critiqueResults = await this.executeCritiqueRound(caseData, round1Results, options);
      
      // V7 Phase 3: Debate & Conflict Resolution
      // Specialists respond to critiques + PI applies domain veto.
      this.setPhase("round2_debate", options.onPhaseChange);
      const round2Results = await this.executeRound2(caseData, round1Results, critiqueResults, options);
      
      // V7 Phase 4: Consensus Building (PI Led)
      this.setPhase("round3_consensus", options.onPhaseChange);
      const consensus = await this.buildConsensus(caseData, round1Results, round2Results, options);

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
    
    // In a real implementation, if missing info is critical, we might pause here.
    // For now, we log it and proceed, letting agents make assumptions if needed.
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

    // Execute agent consultations in parallel
    const consultations = agents.map(async (agentId) => {
      const response = await this.consultAgent(agentId, caseData, options);
      responses.set(agentId, response);
      totalCost += this.estimateCost(response.tokenUsage);
      
      if (options.onStreamChunk) {
        options.onStreamChunk({
          type: "agent_complete",
          agentId,
          timestamp: Date.now(),
        });
      }
    });

    await Promise.all(consultations);

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

    // 1. Scientific Critic (Dr. Tark)
    // We inject the round 1 opinions into the case context for the critic
    const criticResponse = await this.consultAgent("scientific-critic", {
      ...caseData,
      clinicalQuestion: `${caseData.clinicalQuestion}\n\n## PROPOSED PLANS TO CRITIQUE:\n${this.formatRound1ForPrompt(round1.responses)}`
    }, options);
    responses.set("scientific-critic", criticResponse);
    totalCost += this.estimateCost(criticResponse.tokenUsage);

    // 2. Stewardship (Dr. Samata)
    const stewardshipResponse = await this.consultAgent("stewardship", {
      ...caseData,
      clinicalQuestion: `${caseData.clinicalQuestion}\n\n## PROPOSED PLANS TO REVIEW FOR COST/BURDEN:\n${this.formatRound1ForPrompt(round1.responses)}`
    }, options);
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
   * Consult a single specialist agent
   */
  private async consultAgent(
    agentId: AgentId,
    caseData: CaseData,
    options: DeliberationOptions
  ): Promise<AgentResponse> {
    const persona = AGENT_PERSONAS[agentId];
    const tools = AGENT_TOOLS[agentId];
    const systemPrompt = getAgentSystemPrompt(agentId);
    const caseContext = formatCaseContext(caseData);

    this.log(`Consulting ${persona.name} (${persona.specialty})...`);

    if (options.onStreamChunk) {
      options.onStreamChunk({
        type: "agent_start",
        agentId,
        timestamp: Date.now(),
      });
    }

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `## CASE FOR TUMOR BOARD REVIEW

${caseContext}

---

Please provide your ${persona.specialty} assessment of this case.
Use the available tools to retrieve relevant guidelines and evidence.
Structure your response with clear recommendations and citations.`,
      },
    ];

    let response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      tools,
      messages,
    });

    // Handle tool use
    const allCitations: Citation[] = [];
    const toolsUsed: string[] = [];
    
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
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

      // Continue conversation with tool results
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    // Extract text response
    const textContent = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    this.log(`  ${persona.name} completed (${response.usage.output_tokens} tokens)`);

    return {
      agentId,
      response: textContent,
      citations: allCitations,
      confidence: this.assessConfidence(textContent),
      toolsUsed,
      tokenUsage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Round 2: Chain of Debate - Cross-specialty review & Critique Response
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
    
    // Identify potential conflicts from Round 1
    const conflicts = this.identifyConflicts(round1.responses);
    
    // Also check for Critical Vetoes from Dr. Tark
    const criticResponse = critique.responses.get("scientific-critic");
    const hasCriticObjection = criticResponse?.response.toLowerCase().includes("objection") || 
                               criticResponse?.response.toLowerCase().includes("unsafe");

    if (conflicts.length === 0 && !hasCriticObjection) {
      this.log("No significant conflicts or safety objections. Skipping detailed debate.");
      return null;
    }

    this.log(`Identified ${conflicts.length} areas for debate + Critic Feedback`);
    
    const startTime = new Date();
    const responses = new Map<AgentId, AgentResponse>();
    let totalCost = 0;

    // Use Principal Investigator (Dr. Adhyaksha) as Moderator
    const moderatorId: AgentId = "principal-investigator";
    
    const conflictSummary = conflicts
      .map((c) => `- ${c.topic}: ${Array.from(c.positions.entries()).map(([a, p]) => `${AGENT_PERSONAS[a].name}: ${p}`).join(" vs ")}`)
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
    totalCost = this.estimateCost(debateResponse.tokenUsage);

    return {
      activeAgents: [moderatorId],
      responses,
      conflicts,
      startTime,
      endTime: new Date(),
      cost: totalCost,
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

    // Compile all specialist opinions
    const allOpinions = Array.from(round1.responses.entries())
      .map(([id, r]) => `### ${AGENT_PERSONAS[id].name} (${AGENT_PERSONAS[id].specialty})\n${r.response}`)
      .join("\n\n---\n\n");

    const debateSummary = round2 
      ? Array.from(round2.responses.values()).map(r => r.response).join("\n\n")
      : "No significant disagreements requiring debate resolution.";

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
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

Please provide the final tumor board recommendation in the following format:

1. **TREATMENT INTENT**: Curative or Palliative
2. **PRIMARY RECOMMENDATION**: The main treatment approach
3. **TREATMENT SEQUENCE**: Step-by-step plan
4. **KEY COMPONENTS**:
   - Surgery: [if applicable]
   - Systemic therapy: [if applicable]  
   - Radiation: [if applicable]
   - Supportive care: [if applicable]
5. **ALTERNATIVE OPTIONS**: If primary not feasible
6. **CLINICAL TRIAL ELIGIBILITY**: Any relevant trials
7. **FOLLOW-UP PLAN**: Monitoring and reassessment
8. **DISSENTING OPINIONS**: Any unresolved disagreements
9. **CONFIDENCE LEVEL**: High/Moderate/Low with rationale
10. **KEY CITATIONS**: Guideline references supporting this recommendation`,
        },
      ],
    });

    const consensusText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Parse the consensus into structured format
    const recommendation = this.parseRecommendation(consensusText, round1.responses);
    const allCitations = this.collectCitations(round1.responses);

    const cost = this.estimateCost({
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    });

    return {
      recommendation,
      confidence: this.assessOverallConfidence(round1.responses),
      rationale: consensusText,
      citations: allCitations,
      cost,
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
    
    // Simple heuristic: look for treatment modality disagreements
    const surgicalResponse = responses.get("surgical-oncologist")?.response.toLowerCase() || "";
    const medicalResponse = responses.get("medical-oncologist")?.response.toLowerCase() || "";
    const radiationResponse = responses.get("radiation-oncologist")?.response.toLowerCase() || "";

    // Check for surgery vs. non-surgery conflict
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
    // Simple parsing - in production, use structured output
    const isCurative = consensusText.toLowerCase().includes("curative");
    
    let primaryModality: TreatmentRecommendation["primaryModality"] = "multimodal";
    if (consensusText.toLowerCase().includes("surgery")) primaryModality = "surgery";
    else if (consensusText.toLowerCase().includes("chemoradiation")) primaryModality = "chemoradiation";
    else if (consensusText.toLowerCase().includes("immunotherapy")) primaryModality = "immunotherapy";
    else if (consensusText.toLowerCase().includes("targeted")) primaryModality = "targeted";

    return {
      intent: isCurative ? "curative" : "palliative",
      primaryModality,
      summary: consensusText.slice(0, 500),
      components: [
        {
          modality: primaryModality,
          details: "See full consensus for details",
          agentSource: "medical-oncologist",
        },
      ],
    };
  }

  /**
   * Collect all citations from agent responses
   */
  private collectCitations(responses: Map<AgentId, AgentResponse>): Citation[] {
    const citations: Citation[] = [];
    for (const response of responses.values()) {
      citations.push(...response.citations);
    }
    return citations;
  }

  /**
   * Assess confidence from response text
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
   * Assess overall confidence from all responses
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
    // Claude Sonnet pricing (approximate)
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;
    return (usage.input / 1000) * inputCostPer1k + (usage.output / 1000) * outputCostPer1k;
  }

  /**
   * Set current phase and notify
   */
  private setPhase(phase: DeliberationPhase, onPhaseChange?: (phase: DeliberationPhase) => void): void {
    this.currentPhase = phase;
    this.log(`Phase: ${phase}`);
    if (onPhaseChange) {
      onPhaseChange(phase);
    }
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[VTB] ${message}`);
    }
  }
}
