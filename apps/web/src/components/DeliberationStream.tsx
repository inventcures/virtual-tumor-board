"use client";

/**
 * V18 Deliberation Stream Component
 * 
 * Real-time visualization of the Virtual Tumor Board's Chain-of-Thought reasoning.
 * Shows specialist thoughts as they stream, color-coded by specialty, with phase delineation.
 * 
 * Design Principles (Saloni Dattani's HCI Guidelines):
 * - Reduce cognitive load through clarity
 * - Match colors to medical concepts
 * - Direct labeling (no separate legends)
 * - Progressive disclosure
 * - One message per visual element
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  SkipForward
} from "lucide-react";
import { getAgentMeta } from "@/lib/agent-config";

// ============================================================================
// TYPES
// ============================================================================

export type DeliberationPhase = 1 | 2 | 3 | 4 | 5;
export type AgentId = 
  | "surgical-oncologist"
  | "medical-oncologist"
  | "radiation-oncologist"
  | "palliative-care"
  | "radiologist"
  | "pathologist"
  | "geneticist"
  | "principal-investigator"
  | "scientific-critic"
  | "stewardship";

export interface AgentThought {
  id: string;
  agentId: AgentId;
  agentName: string;
  specialty: string;
  content: string;
  phase: DeliberationPhase;
  timestamp: number;
  citation?: {
    source: string;
    text?: string;
  };
  isResponse?: boolean;  // Response to another agent
  respondsTo?: string;   // Agent ID being responded to
}

export interface DeliberationEvent {
  type: "phase_start" | "agent_thought" | "debate_point" | "citation" | "consensus" | "complete";
  timestamp: number;
  phase?: DeliberationPhase;
  agent?: {
    id: AgentId;
    name: string;
    specialty: string;
  };
  content?: string;
  metadata?: {
    guideline_source?: string;
    evidence_level?: string;
    agrees_with?: AgentId[];
    disagrees_with?: AgentId[];
    citation?: {
      source: string;
      text?: string;
    };
  };
}

interface FinalReport {
  recommendation: string;
  consensus: string;
  citations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Color mapping based on medical concepts (Saloni's principle)
const AGENT_COLORS: Record<AgentId, { 
  border: string; 
  bg: string; 
  text: string;
  underline: string;
}> = {
  "surgical-oncologist": {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    text: "text-blue-400",
    underline: "border-b-blue-500",
  },
  "medical-oncologist": {
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    text: "text-green-400",
    underline: "border-b-green-500",
  },
  "radiation-oncologist": {
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    text: "text-orange-400",
    underline: "border-b-orange-500",
  },
  "pathologist": {
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    text: "text-purple-400",
    underline: "border-b-purple-500",
  },
  "radiologist": {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    text: "text-cyan-400",
    underline: "border-b-cyan-500",
  },
  "geneticist": {
    border: "border-pink-500/30",
    bg: "bg-pink-500/5",
    text: "text-pink-400",
    underline: "border-b-pink-500",
  },
  "palliative-care": {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    underline: "border-b-amber-500",
  },
  "principal-investigator": {
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
    text: "text-indigo-400",
    underline: "border-b-indigo-500",
  },
  "scientific-critic": {
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    text: "text-rose-400",
    underline: "border-b-rose-500",
  },
  "stewardship": {
    border: "border-teal-500/30",
    bg: "bg-teal-500/5",
    text: "text-teal-400",
    underline: "border-b-teal-500",
  },
};

const PHASE_CONFIG: Record<DeliberationPhase, {
  label: string;
  description: string;
  borderColor: string;
}> = {
  1: {
    label: "Each specialist reviews the case",
    description: "Independent assessment from each domain",
    borderColor: "border-l-blue-500",
  },
  2: {
    label: "Specialists debate key decisions",
    description: "Cross-specialty discussion and challenges",
    borderColor: "border-l-orange-500",
  },
  3: {
    label: "Checking clinical guidelines",
    description: "RAG retrieval from NCCN, ESMO, SSO, ASTRO",
    borderColor: "border-l-green-500",
  },
  4: {
    label: "Building consensus",
    description: "Synthesizing recommendations",
    borderColor: "border-l-purple-500",
  },
  5: {
    label: "Final recommendations",
    description: "Actionable treatment plan",
    borderColor: "border-l-emerald-500",
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DeliberationStreamProps {
  caseId: string;
  onComplete?: (report: FinalReport) => void;
  className?: string;
}

export function DeliberationStream({ 
  caseId, 
  onComplete,
  className = "" 
}: DeliberationStreamProps) {
  const [currentPhase, setCurrentPhase] = useState<DeliberationPhase | 0>(0);
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  
  const streamRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Timer for elapsed time
  useEffect(() => {
    if (isStreaming && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming, isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (streamRef.current && !isPaused) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [thoughts, isPaused]);

  // Start deliberation
  const startDeliberation = useCallback(() => {
    setIsStreaming(true);
    setThoughts([]);
    setCurrentPhase(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    retryCountRef.current = 0;

    const eventSource = new EventSource(
      `/api/deliberate/stream?caseId=${encodeURIComponent(caseId)}&v18=true`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent(data);
      } catch (e) {
        console.error("Failed to parse event:", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 8000);
        setTimeout(() => startDeliberation(), delay);
      } else {
        setIsStreaming(false);
      }
    };
  }, [caseId]);

  // Handle stream events
  const handleStreamEvent = (data: any) => {
    switch (data.type) {
      case "phase_start":
        setCurrentPhase(data.phase as DeliberationPhase);
        break;

      case "agent_thought":
      case "agent_chunk":
        const thought: AgentThought = {
          id: `${data.agentId || data.agent?.id}-${Date.now()}-${Math.random()}`,
          agentId: data.agentId || data.agent?.id,
          agentName: data.agentName || data.agent?.name || getAgentName(data.agentId || data.agent?.id),
          specialty: data.specialty || data.agent?.specialty || getAgentSpecialty(data.agentId || data.agent?.id),
          content: data.content || data.chunk || "",
          phase: data.phase || currentPhase || 1,
          timestamp: data.timestamp || Date.now(),
          citation: data.metadata?.citation,
        };
        setThoughts(prev => [...prev, thought]);
        break;

      case "debate_point":
        const debateThought: AgentThought = {
          id: `debate-${Date.now()}-${Math.random()}`,
          agentId: data.from,
          agentName: getAgentName(data.from),
          specialty: getAgentSpecialty(data.from),
          content: data.content,
          phase: 2,
          timestamp: data.timestamp || Date.now(),
          isResponse: true,
          respondsTo: data.to,
        };
        setThoughts(prev => [...prev, debateThought]);
        break;

      case "consensus":
        // Add consensus as a special thought
        const consensusThought: AgentThought = {
          id: `consensus-${Date.now()}`,
          agentId: "principal-investigator",
          agentName: "Tumor Board Consensus",
          specialty: "Final Recommendation",
          content: data.recommendation,
          phase: 5,
          timestamp: data.timestamp || Date.now(),
        };
        setThoughts(prev => [...prev, consensusThought]);
        break;

      case "complete":
      case "done":
        setIsStreaming(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        if (onComplete && data.report) {
          onComplete(data.report);
        }
        break;
    }
  };

  const getAgentName = (id: AgentId): string => getAgentMeta(id).name;
  const getAgentSpecialty = (id: AgentId): string => getAgentMeta(id).specialty;

  const thoughtsByPhase = useMemo(() =>
    thoughts.reduce((acc, thought) => {
      const phase = thought.phase || 1;
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(thought);
      return acc;
    }, {} as Record<number, AgentThought[]>),
    [thoughts]
  );

  const togglePhase = (phase: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="text-lg">🧠</span>
            Deliberation Process
          </h3>
          {isStreaming && (
            <span className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Elapsed time */}
          <span className="text-xs text-slate-500 font-mono">
            {formatTime(elapsedTime)}
          </span>
          
          {/* Controls */}
          {isStreaming && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  if (streamRef.current) {
                    streamRef.current.scrollTop = streamRef.current.scrollHeight;
                  }
                }}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Jump to latest"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stream Content */}
      <div 
        ref={streamRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Idle state */}
        {!isStreaming && thoughts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🏥</div>
            <h4 className="text-lg font-medium text-slate-300 mb-2">
              Ready to Deliberate
            </h4>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
              Watch as 7 AI specialists analyze this case and debate treatment options in real-time
            </p>
            <button
              onClick={startDeliberation}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Start Deliberation
            </button>
          </div>
        )}

        {/* Phase sections */}
        {[1, 2, 3, 4, 5].map((phase) => {
          const phaseThoughts = thoughtsByPhase[phase] || [];
          const phaseConfig = PHASE_CONFIG[phase as DeliberationPhase];
          const isActive = currentPhase === phase;
          const isComplete = currentPhase > phase || (!isStreaming && thoughts.length > 0 && phaseThoughts.length > 0);
          const isExpanded = expandedPhases.has(phase);
          const hasPendingContent = !isStreaming && thoughts.length === 0;

          // Don't show future phases when not streaming
          if (hasPendingContent) return null;
          if (phaseThoughts.length === 0 && !isActive && !isComplete) return null;

          return (
            <div 
              key={phase}
              className={`rounded-lg overflow-hidden transition-all duration-300 ${
                isActive ? "ring-1 ring-slate-600" : ""
              }`}
            >
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase)}
                className={`w-full flex items-center gap-3 py-3 px-4 border-l-4 ${phaseConfig.borderColor} bg-slate-800/50 hover:bg-slate-800/70 transition-colors`}
              >
                {/* Status indicator */}
                <span className="flex-shrink-0">
                  {isActive ? (
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse" />
                  ) : isComplete ? (
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  ) : (
                    <span className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                  )}
                </span>

                {/* Phase info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">PHASE {phase}</span>
                    <span className="text-sm font-medium text-slate-300">{phaseConfig.label}</span>
                  </div>
                </div>

                {/* Thought count & expand */}
                <div className="flex items-center gap-2">
                  {phaseThoughts.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {phaseThoughts.length} thought{phaseThoughts.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Phase Content */}
              {isExpanded && (
                <div className="p-4 space-y-3 bg-slate-900/50">
                  {phaseThoughts.map((thought) => (
                    <ThoughtBubble key={thought.id} thought={thought} />
                  ))}
                  
                  {/* Typing indicator when active */}
                  {isActive && isStreaming && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      Specialists deliberating...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - First use hint */}
      {thoughts.length === 0 && !isStreaming && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/30">
          <p className="text-xs text-slate-500 text-center">
            💡 Tip: Watch how each specialist's colored thoughts stream in, then see them debate and reach consensus
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// THOUGHT BUBBLE COMPONENT
// ============================================================================

interface ThoughtBubbleProps {
  thought: AgentThought;
}

function ThoughtBubble({ thought }: ThoughtBubbleProps) {
  const colors = AGENT_COLORS[thought.agentId] || AGENT_COLORS["medical-oncologist"];

  return (
    <div
      className={`rounded-lg border p-3 transition-all duration-200 ${colors.border} ${colors.bg}`}
      style={{ 
        animation: "fadeSlideIn 0.3s ease-out forwards",
      }}
    >
      {/* Agent header with underline */}
      <div className={`flex items-center gap-2 mb-2 pb-1 border-b-2 ${colors.underline}`}>
        <span className={`text-sm font-medium ${colors.text}`}>
          {thought.agentName}
        </span>
        <span className="text-xs text-slate-500">
          {thought.specialty}
        </span>
        {thought.isResponse && thought.respondsTo && (
          <span className="text-xs text-slate-600">
            → responding to {getAgentNameFromId(thought.respondsTo as AgentId)}
          </span>
        )}
      </div>

      {/* Thought content */}
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {thought.content}
      </p>

      {/* Citation (subtle, clickable) */}
      {thought.citation && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 cursor-pointer">
          <BookOpen className="w-3 h-3" />
          <span>{thought.citation.source}</span>
        </div>
      )}
    </div>
  );
}

function getAgentNameFromId(id: AgentId): string {
  return getAgentMeta(id).name;
}

// ============================================================================
// CSS ANIMATION (add to globals.css or include inline)
// ============================================================================

// Add this to your globals.css:
/*
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
*/
