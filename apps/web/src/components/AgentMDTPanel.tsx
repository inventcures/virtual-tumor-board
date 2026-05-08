"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Clock,
  BookOpen,
  Stethoscope,
} from "lucide-react";
import { CitationCard } from "./CitationCard";
import {
  AGENT_GUIDELINES,
  GUIDELINE_BODIES,
} from "@/lib/agent-guidelines";
import type { CuratedCitation } from "@/lib/agent-guidelines";

export type AgentStatus = "pending" | "active" | "streaming" | "complete";

export interface AgentMeta {
  id: string;
  name: string;
  specialty: string;
  color: string;
  icon: string;
}

export interface AgentMDTResponse {
  /** Free-text markdown body (the agent's full assessment). */
  response: string;
  /** Curated demo citations (rich) — preferred when present. */
  curatedCitations?: CuratedCitation[];
  /** Fallback citations as plain strings (current SSE shape). */
  citations: string[];
  toolsUsed: string[];
  /** Optional one-line recommendation chip; falls back to first heading. */
  recommendationHeadline?: string;
}

const SPECIALTY_ACCENT: Record<string, string> = {
  surgical: "bg-red-500",
  medical: "bg-blue-500",
  radiation: "bg-amber-500",
  palliative: "bg-purple-500",
  radiology: "bg-cyan-500",
  pathology: "bg-pink-500",
  genetics: "bg-emerald-500",
  critic: "bg-rose-500",
  stewardship: "bg-teal-500",
  moderator: "bg-indigo-500",
};

function deriveHeadline(response: AgentMDTResponse | undefined): string | null {
  if (!response) return null;
  if (response.recommendationHeadline) return response.recommendationHeadline;
  const firstNonEmpty = response.response
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  return firstNonEmpty?.slice(0, 220) ?? null;
}

export function AgentMDTPanel({
  agent,
  status,
  response,
  defaultExpanded = false,
  dissentTopics,
}: {
  agent: AgentMeta;
  status: AgentStatus;
  response?: AgentMDTResponse;
  defaultExpanded?: boolean;
  /** Topics on which this specialist disagreed with the board consensus. */
  dissentTopics?: string[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accent = SPECIALTY_ACCENT[agent.color] ?? "bg-slate-500";
  const guidelines = AGENT_GUIDELINES[agent.id];
  const primaryBody = guidelines?.primary;
  const primaryMeta = primaryBody ? GUIDELINE_BODIES[primaryBody] : null;
  const headline = deriveHeadline(response);

  const hasContent = response?.response && response.response.trim().length > 0;
  const isWorking = status === "active" || status === "streaming";
  const isComplete = status === "complete";

  return (
    <section
      id={`agent-response-${agent.id}`}
      className="scroll-mt-24 rounded-xl bg-slate-900/60 border border-slate-700/70 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-slate-950/40"
    >
      {/* Specialty accent rail */}
      <div className="flex">
        <div className={`w-1 ${accent}`} aria-hidden />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between px-5 py-4 gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full ${accent} flex items-center justify-center text-lg shrink-0`}
              >
                <span aria-hidden>{agent.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-white truncate">
                  {agent.name}
                </div>
                <div className="text-sm text-slate-400 truncate">
                  {agent.specialty}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {primaryMeta && (
                <span
                  className={`inline-flex items-center px-2 py-1 rounded border text-[11px] font-semibold tracking-wide ${primaryMeta.badgeClass}`}
                  title={`Primary guideline body: ${primaryMeta.fullName}`}
                >
                  {primaryMeta.code}
                </span>
              )}
              {guidelines?.secondary?.slice(0, 2).map((b) => {
                const m = GUIDELINE_BODIES[b];
                return (
                  <span
                    key={b}
                    className={`hidden sm:inline-flex items-center px-2 py-1 rounded border text-[11px] font-medium opacity-80 ${m.badgeClass}`}
                    title={m.fullName}
                  >
                    {m.code}
                  </span>
                );
              })}
              {isComplete && (dissentTopics?.length ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40"
                  title={`Disagreed with the board on: ${dissentTopics!.join("; ")}`}
                >
                  <AlertTriangle className="w-3 h-3" /> Dissent
                </span>
              )}
              <StatusPill status={status} />
            </div>
          </header>

          {/* Recommendation chip (only when complete & we have one) */}
          {isComplete && headline && (
            <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800">
              <div className="flex items-start gap-2">
                <Stethoscope className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">
                    Recommendation
                  </div>
                  <div className="text-[15px] text-slate-100 leading-snug">
                    {headline}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dissent strip — where this specialist argued against the board */}
          {isComplete && (dissentTopics?.length ?? 0) > 0 && (
            <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-400/80 mb-0.5">
                    Disagreed with the board
                  </div>
                  <div className="text-[14px] text-amber-100/90 leading-snug">
                    {dissentTopics!.join(" · ")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-4">
            {/* Pending */}
            {status === "pending" && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Awaiting deliberation…</span>
              </div>
            )}

            {/* Working */}
            {isWorking && (
              <div className="flex items-center gap-2 text-sm text-amber-300 mb-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {hasContent ? "Generating response…" : "Analysing case…"}
                </span>
              </div>
            )}

            {/* Markdown body — full text, no max-height truncation */}
            {hasContent && (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h3 className="text-base font-semibold text-white mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    h2: ({ children }) => (
                      <h4 className="text-sm font-semibold text-slate-200 mt-3 mb-2 uppercase tracking-wide">
                        {children}
                      </h4>
                    ),
                    h3: ({ children }) => (
                      <h5 className="text-sm font-semibold text-slate-200 mt-3 mb-1">
                        {children}
                      </h5>
                    ),
                    p: ({ children }) => (
                      <p className="text-[14px] leading-relaxed text-slate-300 mb-2">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-outside ml-5 mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-outside ml-5 mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-[14px] leading-relaxed text-slate-300">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-white font-semibold">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-slate-400 italic">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 text-xs font-mono">
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-md border border-slate-700">
                        <table className="text-xs w-full border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border-b border-slate-700 px-2 py-1.5 bg-slate-800 text-left text-slate-200 font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border-b border-slate-800 px-2 py-1.5 text-slate-300">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {response!.response}
                </ReactMarkdown>
                {status === "streaming" && (
                  <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-1 align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Citations */}
          {isComplete && response && (
            <CitationsSection
              response={response}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function CitationsSection({
  response,
  expanded,
  onToggle,
}: {
  response: AgentMDTResponse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const curated = response.curatedCitations ?? [];
  const fallback = curated.length === 0 ? response.citations : [];

  if (curated.length === 0 && fallback.length === 0) return null;

  const visible = curated.length > 2 && !expanded ? curated.slice(0, 2) : curated;
  const hiddenCount = curated.length - visible.length;

  return (
    <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Standard-of-care grounding</span>
          {curated.length > 0 && (
            <span className="text-slate-500 normal-case">
              · {curated.length} citation{curated.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {curated.length > 2 && (
          <button
            onClick={onToggle}
            className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Show all (
                {curated.length})
              </>
            )}
          </button>
        )}
      </div>

      {curated.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visible.map((c, i) => (
            <CitationCard key={`${c.body}-${i}`} citation={c} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {fallback.map((c, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {hiddenCount > 0 && !expanded && (
        <div className="mt-2 text-xs text-slate-500">
          + {hiddenCount} more guideline reference{hiddenCount === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: AgentStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  }
  if (status === "active" || status === "streaming") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <Loader2 className="w-3 h-3 animate-spin" /> {status === "streaming" ? "Streaming" : "Active"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
      <CheckCircle2 className="w-3 h-3" /> Complete
    </span>
  );
}
