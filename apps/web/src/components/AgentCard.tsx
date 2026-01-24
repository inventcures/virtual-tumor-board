"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, Clock, BookOpen } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  specialty: string;
  color: string;
  icon: string;
}

interface AgentResponse {
  response: string;
  citations: string[];
  toolsUsed: string[];
}

const colorClasses: Record<string, { bg: string; border: string; text: string; light: string }> = {
  surgical: { bg: "bg-red-500", border: "border-red-500/30", text: "text-red-400", light: "bg-red-500/10" },
  medical: { bg: "bg-blue-500", border: "border-blue-500/30", text: "text-blue-400", light: "bg-blue-500/10" },
  radiation: { bg: "bg-amber-500", border: "border-amber-500/30", text: "text-amber-400", light: "bg-amber-500/10" },
  palliative: { bg: "bg-purple-500", border: "border-purple-500/30", text: "text-purple-400", light: "bg-purple-500/10" },
  radiology: { bg: "bg-cyan-500", border: "border-cyan-500/30", text: "text-cyan-400", light: "bg-cyan-500/10" },
  pathology: { bg: "bg-pink-500", border: "border-pink-500/30", text: "text-pink-400", light: "bg-pink-500/10" },
  genetics: { bg: "bg-emerald-500", border: "border-emerald-500/30", text: "text-emerald-400", light: "bg-emerald-500/10" },
};

export function AgentCard({
  agent,
  status,
  response,
  isStreaming = false,
}: {
  agent: Agent;
  status: "pending" | "active" | "streaming" | "complete";
  response?: AgentResponse;
  isStreaming?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = colorClasses[agent.color] || colorClasses.medical;

  return (
    <div
      className={`agent-card ${colors.light} ${colors.border} border overflow-hidden ${
        status === "active" ? "ring-2 ring-amber-500/50" : ""
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`agent-avatar ${colors.bg}`}>
              <span>{agent.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              <p className={`text-sm ${colors.text}`}>{agent.specialty}</p>
            </div>
          </div>
          <StatusBadge status={status} color={colors.text} />
        </div>
      </div>

      {/* Response Preview / Full */}
      {status === "active" && !isStreaming && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="typing-indicator">Analyzing case</span>
          </div>
        </div>
      )}

      {/* Streaming Response */}
      {(status === "streaming" || (status === "active" && isStreaming)) && response?.response && (
        <div className="border-t border-slate-700/50">
          <div className="p-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating response...</span>
            </div>
            <div className="prose-content max-h-48 overflow-y-auto pr-2 text-sm text-slate-300">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm text-slate-300 mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                }}
              >
                {response.response}
              </ReactMarkdown>
              <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      )}

      {status === "complete" && response && (
        <div className="border-t border-slate-700/50">
          {/* Preview */}
          <div 
            className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Assessment</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
            
            {!expanded && (
              <p className="text-sm text-slate-300 line-clamp-3">
                {response.response.split("\n").find(line => line.trim() && !line.startsWith("#")) || response.response.slice(0, 150)}...
              </p>
            )}
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              <div className="prose-content max-h-96 overflow-y-auto pr-2">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold text-white mt-3 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-slate-300 mb-2">{children}</p>,
                    ul: ({ children }) => <ul className="text-sm text-slate-300 list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="text-sm text-slate-300 list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
                    code: ({ children }) => <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 text-xs">{children}</code>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="text-xs border-collapse">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th className="border border-slate-600 px-2 py-1 bg-slate-800 text-slate-200">{children}</th>,
                    td: ({ children }) => <td className="border border-slate-700 px-2 py-1 text-slate-300">{children}</td>,
                  }}
                >
                  {response.response}
                </ReactMarkdown>
              </div>

              {/* Citations */}
              {response.citations.length > 0 && (
                <div className="pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <BookOpen className="w-3 h-3" />
                    <span>Citations</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {response.citations.map((citation, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400"
                      >
                        {citation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  if (status === "pending") {
    return (
      <span className="status-badge bg-slate-700 text-slate-400">
        <Clock className="w-3 h-3 inline mr-1" />
        Pending
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="status-badge bg-amber-500/20 text-amber-400">
        <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
        Active
      </span>
    );
  }
  return (
    <span className="status-badge bg-emerald-500/20 text-emerald-400">
      <CheckCircle2 className="w-3 h-3 inline mr-1" />
      Complete
    </span>
  );
}
