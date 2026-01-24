/**
 * Virtual Tumor Board - Multi-Agent System
 * 
 * Core exports for the AI-powered tumor board deliberation engine.
 * Implements a multi-agent orchestration system with 7 specialist agents
 * that deliberate on oncology cases using Claude SDK features.
 */

// Agent definitions and personas
export * from "./specialists";
export { AGENT_PERSONAS, getAgentPersona } from "./specialists";

// Orchestrator
export { TumorBoardOrchestrator } from "./orchestrator";
export type { OrchestratorConfig } from "./orchestrator";

// Tools
export * from "./tools";

// RAG connector (interface for Gemini File Search)
export * from "./rag";

// Types re-exported from shared
export type {
  AgentId,
  AgentPersona,
  AgentResponse,
  CaseData,
  DeliberationOptions,
  DeliberationResult,
  Citation,
} from "./types";
