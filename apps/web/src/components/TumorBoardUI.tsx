"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AgentCard } from "./AgentCard";
import { ConsensusPanel } from "./ConsensusPanel";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Zap
} from "lucide-react";

// Agent definitions with colors
const AGENTS = [
  { id: "surgical-oncologist", name: "Dr. Shalya", specialty: "Surgical Oncology", color: "surgical", icon: "🔪" },
  { id: "medical-oncologist", name: "Dr. Chikitsa", specialty: "Medical Oncology", color: "medical", icon: "💊" },
  { id: "radiation-oncologist", name: "Dr. Kirann", specialty: "Radiation Oncology", color: "radiation", icon: "☢️" },
  { id: "palliative-care", name: "Dr. Shanti", specialty: "Palliative Care", color: "palliative", icon: "🕊️" },
  { id: "radiologist", name: "Dr. Chitran", specialty: "Onco-Radiology", color: "radiology", icon: "📷" },
  { id: "pathologist", name: "Dr. Marga", specialty: "Pathology", color: "pathology", icon: "🔬" },
  { id: "geneticist", name: "Dr. Anuvamsha", specialty: "Genetics", color: "genetics", icon: "🧬" },
];

type Phase = "idle" | "initializing" | "round1" | "round2" | "consensus" | "completed" | "error";
type AgentStatus = "pending" | "active" | "streaming" | "complete";

interface AgentResponse {
  response: string;
  citations: string[];
  toolsUsed: string[];
}

interface TumorBoardUIProps {
  caseData: any;
  caseId: string;
  onRunAnother?: () => void;
}

export function TumorBoardUI({ caseData, caseId, onRunAnother }: TumorBoardUIProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentResponses, setAgentResponses] = useState<Record<string, AgentResponse>>({});
  const [consensus, setConsensus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use ref to track streaming responses to avoid closure issues
  const streamingResponsesRef = useRef<Record<string, string>>({});
  const agentCitationsRef = useRef<Record<string, string[]>>({});
  const agentToolsRef = useRef<Record<string, string[]>>({});

  // Initialize all agents as pending
  useEffect(() => {
    const initialStatuses: Record<string, AgentStatus> = {};
    AGENTS.forEach((a) => (initialStatuses[a.id] = "pending"));
    setAgentStatuses(initialStatuses);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isStreaming]);

  const scrollToAgent = useCallback((agentId: string) => {
    const element = document.getElementById(`agent-response-${agentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a highlight effect
      element.classList.add("ring-2", "ring-indigo-500");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-indigo-500");
      }, 2000);
    }
  }, []);

  const startDeliberation = async () => {
    // Reset state
    setPhase("initializing");
    setElapsedTime(0);
    setConsensus("");
    setError(null);
    setAgentResponses({});
    setIsStreaming(true);
    streamingResponsesRef.current = {};
    agentCitationsRef.current = {};
    agentToolsRef.current = {};

    const initialStatuses: Record<string, AgentStatus> = {};
    AGENTS.forEach((a) => (initialStatuses[a.id] = "pending"));
    setAgentStatuses(initialStatuses);

    try {
      // Connect to SSE stream with caseId
      const eventSource = new EventSource(`/api/deliberate/stream?caseId=${encodeURIComponent(caseId)}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStreamEvent(data);
        } catch (e) {
          console.error("Failed to parse event:", e);
        }
      };

      eventSource.onerror = (e) => {
        console.error("EventSource error:", e);
        eventSource.close();
        setIsStreaming(false);
      };
    } catch (err) {
      setError("Failed to start deliberation");
      setPhase("error");
      setIsStreaming(false);
    }
  };

  const handleStreamEvent = (data: any) => {
    switch (data.type) {
      case "phase_change":
        setPhase(data.phase);
        if (data.phase === "completed") {
          setIsStreaming(false);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
          }
        }
        break;

      case "agent_start":
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: "active" }));
        streamingResponsesRef.current[data.agentId] = "";
        break;

      case "agent_chunk":
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: "streaming" }));
        // Accumulate in ref
        streamingResponsesRef.current[data.agentId] = 
          (streamingResponsesRef.current[data.agentId] || "") + data.chunk;
        
        // Update state for UI
        const currentResponse = streamingResponsesRef.current[data.agentId];
        setAgentResponses((prev) => ({
          ...prev,
          [data.agentId]: {
            response: currentResponse,
            citations: prev[data.agentId]?.citations || [],
            toolsUsed: prev[data.agentId]?.toolsUsed || [],
          },
        }));
        break;

      case "agent_complete":
        // Store citations and tools
        agentCitationsRef.current[data.agentId] = data.citations || [];
        agentToolsRef.current[data.agentId] = data.toolsUsed || [];
        
        // Set final response from ref
        const finalResponse = streamingResponsesRef.current[data.agentId] || "";
        setAgentResponses((prev) => ({
          ...prev,
          [data.agentId]: {
            response: finalResponse,
            citations: data.citations || [],
            toolsUsed: data.toolsUsed || [],
          },
        }));
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: "complete" }));
        break;

      case "consensus_chunk":
        setConsensus((prev) => prev + data.chunk);
        break;

      case "debate_update":
        // Could show a toast or update UI
        break;

      case "done":
        setIsStreaming(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      case "error":
        setError(data.message);
        setPhase("error");
        setIsStreaming(false);
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Idle state - show start button
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">Ready to Start Deliberation</h3>
          <p className="text-slate-400 max-w-md">
            7 AI specialists will analyze this case and provide evidence-based recommendations
          </p>
        </div>
        <button
          onClick={startDeliberation}
          className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-lg text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105"
        >
          <span className="flex items-center gap-3">
            <Zap className="w-6 h-6" />
            Start AI Tumor Board Deliberation
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity" />
        </button>
        <p className="text-xs text-slate-500">
          Demo uses cached responses for instant results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PhaseIndicator phase={phase} />
            <div className="text-sm text-slate-400">
              Elapsed: <span className="text-white font-mono">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className={`w-3 h-3 rounded-full transition-colors cursor-pointer hover:scale-125 ${
                  agentStatuses[agent.id] === "complete"
                    ? "bg-emerald-500"
                    : agentStatuses[agent.id] === "active" || agentStatuses[agent.id] === "streaming"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-600"
                }`}
                title={`${agent.name}: ${agentStatuses[agent.id] || "pending"} - Click to view`}
                onClick={() => scrollToAgent(agent.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTS.map((agent) => (
          <div 
            key={agent.id} 
            onClick={() => phase === "completed" && scrollToAgent(agent.id)}
            className={phase === "completed" ? "cursor-pointer" : ""}
          >
            <AgentCard
              agent={agent}
              status={agentStatuses[agent.id] || "pending"}
              response={agentResponses[agent.id]}
              isStreaming={agentStatuses[agent.id] === "streaming"}
            />
          </div>
        ))}
      </div>

      {/* Consensus Panel */}
      {(phase === "consensus" || phase === "completed") && (
        <ConsensusPanel 
          consensus={consensus} 
          isComplete={phase === "completed"}
          agentResponses={agentResponses}
          onAgentClick={scrollToAgent}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={startDeliberation}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Restart button when completed */}
      {phase === "completed" && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => onRunAnother ? onRunAnother() : setPhase("idle")}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
          >
            {onRunAnother ? "Try Another Case" : "Run Another Deliberation"}
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: Phase }) {
  const phases = [
    { id: "round1", label: "Round 1: Specialist Opinions" },
    { id: "round2", label: "Round 2: Chain of Debate" },
    { id: "consensus", label: "Round 3: Consensus Building" },
  ];

  return (
    <div className="flex items-center gap-2">
      {phase === "initializing" ? (
        <>
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-indigo-400 font-medium">Initializing agents...</span>
        </>
      ) : phase === "completed" ? (
        <>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Deliberation Complete</span>
        </>
      ) : phase === "error" ? (
        <>
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-medium">Error</span>
        </>
      ) : (
        <>
          <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-amber-400 font-medium">
            {phases.find((p) => p.id === phase)?.label || phase}
          </span>
        </>
      )}
    </div>
  );
}
