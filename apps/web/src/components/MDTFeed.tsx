"use client";

import { useCallback } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import {
  AgentMDTPanel,
  type AgentMDTResponse,
  type AgentMeta,
  type AgentStatus,
} from "./AgentMDTPanel";

/**
 * MDT-style feed: sticky left jump-nav of all specialists, vertical
 * full-width agent panels on the right. Each panel renders the agent's
 * full assessment (no max-height truncation) plus the SOC citations
 * grounding their recommendation.
 */
export function MDTFeed({
  agents,
  statuses,
  responses,
  dissentTopicsByAgent,
}: {
  agents: AgentMeta[];
  statuses: Record<string, AgentStatus>;
  responses: Record<string, AgentMDTResponse>;
  /** agentId → topics on which that specialist disagreed with the board. */
  dissentTopicsByAgent?: Record<string, string[]>;
}) {
  const scrollTo = useCallback((agentId: string) => {
    const el = document.getElementById(`agent-response-${agentId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-indigo-500/70");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-indigo-500/70");
    }, 1600);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
      <JumpNav agents={agents} statuses={statuses} onJump={scrollTo} />

      <div className="space-y-4 min-w-0">
        {agents.map((agent) => (
          <AgentMDTPanel
            key={agent.id}
            agent={agent}
            status={statuses[agent.id] ?? "pending"}
            response={responses[agent.id]}
            defaultExpanded={false}
            dissentTopics={dissentTopicsByAgent?.[agent.id]}
          />
        ))}
      </div>
    </div>
  );
}

function JumpNav({
  agents,
  statuses,
  onJump,
}: {
  agents: AgentMeta[];
  statuses: Record<string, AgentStatus>;
  onJump: (agentId: string) => void;
}) {
  return (
    <nav
      aria-label="Specialist jump navigation"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-2">
        Specialists
      </div>
      <ul className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        {agents.map((agent) => {
          const status = statuses[agent.id] ?? "pending";
          return (
            <li key={agent.id}>
              <button
                onClick={() => onJump(agent.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors border-b border-slate-800 last:border-b-0"
              >
                <StatusDot status={status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-100 truncate">
                    {agent.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {agent.specialty}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === "complete") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (status === "active" || status === "streaming") {
    return <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />;
  }
  return <Circle className="w-4 h-4 text-slate-600 shrink-0" />;
}
