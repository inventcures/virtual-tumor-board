"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity,
  AlertCircle,
  FileText,
  ArrowLeft,
  RotateCcw,
  User,
  Stethoscope
} from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { ConsensusPanel } from "@/components/ConsensusPanel";
import type { UploadSession } from "@/types/user-upload";
import { getCancerSiteById, DOCUMENT_TYPE_LABELS } from "@/lib/upload/constants";
import { ALL_DELIBERATION_AGENTS as AGENTS } from "@/lib/agent-config";

type Phase = 
  | "idle" 
  | "initializing" 
  | "gatekeeper_check"
  | "independent_hypothesis" // Round 1
  | "scientific_critique"    // Round 2
  | "round2_debate"          // Round 3
  | "round3_consensus"       // Consensus
  | "completed" 
  | "error";

type AgentStatus = "pending" | "active" | "streaming" | "complete";

interface AgentResponse {
  response: string;
  citations: string[];
  toolsUsed: string[];
}

export default function DeliberatePage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentResponses, setAgentResponses] = useState<Record<string, AgentResponse>>({});
  const [consensus, setConsensus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const streamingResponsesRef = useRef<Record<string, string>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vtb_upload_session");
    if (!stored) {
      router.push("/upload");
      return;
    }
    
    try {
      const parsed: UploadSession = JSON.parse(stored);
      if (!parsed.documents?.length) {
        router.push("/upload/documents");
        return;
      }
      setSession(parsed);
      
      // Initialize agent statuses
      const initialStatuses: Record<string, AgentStatus> = {};
      AGENTS.forEach((a) => (initialStatuses[a.id] = "pending"));
      setAgentStatuses(initialStatuses);
    } catch (e) {
      router.push("/upload");
    }
  }, [router]);

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

  // Auto-start deliberation when session is loaded
  useEffect(() => {
    if (session && phase === "idle") {
      startDeliberation();
    }
  }, [session]);

  const scrollToAgent = useCallback((agentId: string) => {
    const element = document.getElementById(`agent-response-${agentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-indigo-500");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-indigo-500");
      }, 2000);
    }
  }, []);

  const startDeliberation = async () => {
    if (!session) return;

    // Reset state
    setPhase("initializing");
    setElapsedTime(0);
    setConsensus("");
    setError(null);
    setAgentResponses({});
    setIsStreaming(true);
    streamingResponsesRef.current = {};

    const initialStatuses: Record<string, AgentStatus> = {};
    AGENTS.forEach((a) => (initialStatuses[a.id] = "pending"));
    setAgentStatuses(initialStatuses);

    try {
      // POST to user-case endpoint
      const response = await fetch("/api/deliberate/user-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(data);
            } catch (e) {
              // Ignore parse errors for incomplete messages
            }
          }
        }
      }

    } catch (err) {
      console.error("Deliberation error:", err);
      setError("Failed to start deliberation. Please try again.");
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
        }
        break;

      case "agent_start":
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: "active" }));
        streamingResponsesRef.current[data.agentId] = "";
        break;

      case "agent_chunk":
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: "streaming" }));
        streamingResponsesRef.current[data.agentId] = 
          (streamingResponsesRef.current[data.agentId] || "") + data.chunk;
        
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

      case "done":
        setIsStreaming(false);
        setPhase("completed");
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

  const handleBack = () => {
    router.push("/upload/review");
  };

  const handleStartNew = () => {
    localStorage.removeItem("vtb_upload_session");
    router.push("/upload");
  };

  const cancerSite = session ? getCancerSiteById(session.cancerSite) : null;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userTypeLabel = session.userType === 'patient' 
    ? 'Patient/Caregiver' 
    : session.userType === 'oncologist' 
    ? 'Oncologist' 
    : 'Doctor';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Tumor Board</h1>
                <p className="text-xs text-slate-400">User-Uploaded Case Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {phase === "completed" && (
                <button
                  onClick={handleStartNew}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start New Case
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* User Case Banner */}
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-400 mb-1">
                User-Uploaded Case ({session.completeness?.completenessScore || 0}% Complete)
              </h3>
              <p className="text-sm text-slate-300">
                This analysis is based on <strong>{session.documents.length} uploaded documents</strong> for{" "}
                <strong>{cancerSite?.label || session.cancerSite}</strong>.
                {session.completeness?.missingCritical && session.completeness.missingCritical.length > 0 && (
                  <span className="text-amber-400">
                    {" "}Missing critical: {session.completeness.missingCritical.map(d => 
                      DOCUMENT_TYPE_LABELS[d.type]?.en || d.type
                    ).join(", ")}.
                  </span>
                )}
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {userTypeLabel}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {session.documents.length} docs
                </span>
                {session.staging?.stage && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    Stage {session.staging.stage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-6 bg-slate-900/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PhaseIndicator phase={phase} />
              <div className="text-sm text-slate-400">
                Elapsed: <span className="text-white font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Agent status indicators">
              {AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  role="button"
                  aria-label={`${agent.name}: ${agentStatuses[agent.id] || "pending"}`}
                  className={`w-3 h-3 rounded-full transition-colors cursor-pointer hover:scale-125 ${
                    agentStatuses[agent.id] === "complete"
                      ? "bg-emerald-500"
                      : agentStatuses[agent.id] === "active" || agentStatuses[agent.id] === "streaming"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-slate-600"
                  }`}
                  title={`${agent.name}: ${agentStatuses[agent.id] || "pending"}`}
                  onClick={() => scrollToAgent(agent.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        {(phase === "round3_consensus" || phase === "completed") && (
          <ConsensusPanel 
            consensus={consensus} 
            isComplete={phase === "completed"}
            agentResponses={agentResponses}
            onAgentClick={scrollToAgent}
            caseInfo={{
              cancerSite: cancerSite?.label || session.cancerSite,
              stage: session.staging?.stage || session.staging?.tnm,
              documentCount: session.documents.length,
            }}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={startDeliberation}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Completed Actions */}
        {phase === "completed" && (
          <div className="mt-6 space-y-4">
            {/* Disclaimer */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">
                <strong className="text-slate-300">Important:</strong> This AI-generated analysis is for 
                informational purposes only and does not constitute medical advice. Please discuss these 
                recommendations with your treating oncologist before making any treatment decisions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Review
              </button>
              <button
                onClick={handleStartNew}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg text-white font-medium transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Analyze Another Case
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: Phase }) {
  return (
    <div className="flex items-center gap-2">
      {phase === "initializing" || phase === "gatekeeper_check" ? (
        <>
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-indigo-400 font-medium">
            {phase === "gatekeeper_check" ? "Dr. Adhyaksha reviewing case..." : "Initializing AI agents..."}
          </span>
        </>
      ) : phase === "independent_hypothesis" ? (
        <>
          <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-amber-400 font-medium">Specialists thinking independently...</span>
        </>
      ) : phase === "scientific_critique" ? (
        <>
          <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
          <span className="text-rose-400 font-medium">Safety & Cost Review...</span>
        </>
      ) : phase === "round2_debate" ? (
        <>
          <Brain className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="text-blue-400 font-medium">Chain of Debate...</span>
        </>
      ) : phase === "round3_consensus" ? (
        <>
          <FileText className="w-5 h-5 text-purple-400 animate-pulse" />
          <span className="text-purple-400 font-medium">Building Consensus...</span>
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
          <Loader2 className="w-5 h-5 text-slate-400" />
          <span className="text-slate-400 font-medium">Preparing...</span>
        </>
      )}
    </div>
  );
}
