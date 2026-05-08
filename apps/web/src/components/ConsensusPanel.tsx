"use client";

import { useState, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DollarSign,
  BookOpen,
  Download,
} from "lucide-react";
import { PDFPreviewModalV2 } from "./PDFPreviewModalV2";
import { CitationCard } from "./CitationCard";
import { DissentPanel, type DissentEntry } from "./DissentPanel";
import { aggregateCitationsForCase } from "@/lib/demo-citations";
import { GUIDELINE_BODIES, type GuidelineBody } from "@/lib/agent-guidelines";
import { getAgentMeta, getAgentColors } from "@/lib/agent-config";

interface AgentResponse {
  response: string;
  citations: string[];
  toolsUsed: string[];
}

export function ConsensusPanel({
  consensus,
  isComplete,
  agentResponses,
  onAgentClick,
  caseInfo,
  cancerType,
  dissentingOpinions,
}: {
  consensus: string | null;
  isComplete: boolean;
  agentResponses: Record<string, AgentResponse>;
  onAgentClick?: (agentId: string) => void;
  caseInfo?: { cancerSite?: string; stage?: string; documentCount?: number };
  /** Cancer-type code (e.g. "ESOPHAGEAL"); enables aggregated SOC citations. */
  cancerType?: string;
  /** Structured disagreements parsed from the moderator's DISSENT block. */
  dissentingOpinions?: DissentEntry[];
}) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  const toggleAgent = useCallback((agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedAgents(new Set(Object.keys(agentResponses)));
  }, [agentResponses]);

  const collapseAll = useCallback(() => {
    setExpandedAgents(new Set());
  }, []);

  const handleDownloadPDF = useCallback(() => {
    if (!consensus) return;
    setShowPDFPreview(true);
  }, [consensus]);

  const scrollToDissent = useCallback(() => {
    document
      .getElementById("dissent-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!consensus && !isComplete) {
    return (
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Building Consensus</h3>
            <p className="text-indigo-300 text-sm">Synthesizing specialist recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  const allExpanded = expandedAgents.size === Object.keys(agentResponses).length;

  return (
    <div className="space-y-4">
      {/* Main Consensus Card */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-6 py-4 border-b border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Tumor Board Consensus</h2>
                <p className="text-indigo-300 text-sm">Multi-Agent Deliberation Complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isComplete && (
                <>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download Full Report</span>
                  </button>
                  {(dissentingOpinions?.length ?? 0) > 0 && (
                    <button
                      onClick={scrollToDissent}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                      title="Jump to the specialist disagreements"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-300 font-semibold hidden sm:inline">
                        {dissentingOpinions!.length} Disagreement{dissentingOpinions!.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold hidden sm:inline">Consensus Reached</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Disagreements first — the debate is the story; don't bury it
            below the full consensus text. */}
        {isComplete && dissentingOpinions !== undefined && (
          <div id="dissent-panel" className="mx-6 mt-6 scroll-mt-24">
            <DissentPanel
              disagreements={dissentingOpinions}
              onAgentClick={onAgentClick}
            />
          </div>
        )}

        {/* Full Consensus */}
        {consensus && (
          <div className="p-6">
            <div className="prose-content">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-slate-700">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-indigo-300 mt-6 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-semibold text-slate-200 mt-3 mb-2">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-slate-300 space-y-2 mb-4 ml-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-slate-300 space-y-2 mb-4 ml-4 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-1.5">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-slate-800 px-2 py-1 rounded text-emerald-400 text-sm font-mono">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-500/10 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-slate-700">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-800">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-slate-200 font-semibold border-b border-slate-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-slate-300 border-b border-slate-700/50">
                      {children}
                    </td>
                  ),
                  hr: () => <hr className="border-slate-700 my-6" />,
                }}
              >
                {consensus}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Guideline grounding — aggregated SOC citations across all specialists */}
        {cancerType && <GuidelineGroundingSection cancerType={cancerType} />}

        {/* Indian Context Alert */}
        <div className="mx-6 mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Indian Healthcare Context</h4>
              <p className="text-sm text-slate-300">
                Treatment costs may vary significantly. Explore patient assistance programs, check 
                Ayushman Bharat/PMJAY coverage, or discuss cost-effective alternatives with your oncologist.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Specialist Responses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Individual Specialist Opinions ({Object.keys(agentResponses).length})
          </h3>
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {Object.keys(agentResponses).length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No specialist responses available
          </div>
        ) : (
          Object.entries(agentResponses).map(([agentId, response]) => (
            <CollapsibleAgentCard
              key={agentId}
              agentId={agentId}
              response={response}
              isExpanded={expandedAgents.has(agentId)}
              onToggle={() => toggleAgent(agentId)}
            />
          ))
        )}
      </div>

      {/* PDF Preview Modal with Literacy Level Selector */}
      <PDFPreviewModalV2
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        consensus={consensus || ''}
        agentResponses={agentResponses}
        caseInfo={{
          cancerSite: caseInfo?.cancerSite,
          stage: caseInfo?.stage,
          documentCount: caseInfo?.documentCount,
        }}
      />
    </div>
  );
}

function GuidelineGroundingSection({ cancerType }: { cancerType: string }) {
  const [expandedBody, setExpandedBody] = useState<GuidelineBody | null>(null);
  const grouped = aggregateCitationsForCase(cancerType);
  const bodies = (Object.keys(grouped) as GuidelineBody[]).filter(
    (b) => grouped[b]?.length > 0,
  );

  if (bodies.length === 0) return null;

  const totalCitations = bodies.reduce(
    (sum, b) => sum + grouped[b].length,
    0,
  );

  return (
    <div className="mx-6 mb-6 rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h4 className="font-semibold text-white">Guideline grounding</h4>
        </div>
        <div className="text-xs text-slate-500">
          {totalCitations} citation{totalCitations === 1 ? "" : "s"} across{" "}
          {bodies.length} guideline {bodies.length === 1 ? "body" : "bodies"}
        </div>
      </div>

      {/* Body filter pills */}
      <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-800">
        <FilterPill
          label="All"
          active={expandedBody === null}
          onClick={() => setExpandedBody(null)}
        />
        {bodies.map((b) => {
          const meta = GUIDELINE_BODIES[b];
          return (
            <button
              key={b}
              onClick={() => setExpandedBody(expandedBody === b ? null : b)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold tracking-wide transition-opacity ${
                meta.badgeClass
              } ${expandedBody && expandedBody !== b ? "opacity-40" : "opacity-100"}`}
              title={meta.fullName}
            >
              {meta.code}
              <span className="ml-1.5 font-normal opacity-80">
                {grouped[b].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Citation cards */}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto">
        {bodies
          .filter((b) => expandedBody === null || expandedBody === b)
          .flatMap((b) =>
            grouped[b].map((c, i) => (
              <CitationCard key={`${b}-${i}`} citation={c} />
            )),
          )}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded border text-[11px] font-semibold tracking-wide transition-colors ${
        active
          ? "bg-slate-700 text-white border-slate-600"
          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

const CollapsibleAgentCard = memo(function CollapsibleAgentCard({
  agentId,
  response,
  isExpanded,
  onToggle,
}: {
  agentId: string;
  response: AgentResponse;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const meta = getAgentMeta(agentId);
  const colors = getAgentColors(meta.color);

  return (
    <div 
      id={`agent-response-${agentId}`}
      className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300"
    >
      {/* Clickable Header */}
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 border-b border-slate-700 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${colors.light}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${colors.light} ${colors.text} ${colors.border}`}>
            {meta.icon}
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-white">{meta.name}</h4>
            <p className={`text-sm ${colors.text}`}>{meta.specialty}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Complete</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      
      {/* Expandable Content */}
      {isExpanded && response.response && (
        <div className="p-4">
          <div className="prose-content text-sm max-h-[500px] overflow-y-auto pr-2">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold text-white mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-slate-300 mb-2 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="text-sm text-slate-300 list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="text-sm text-slate-300 list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-300">{children}</li>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-slate-400">{children}</em>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="text-xs w-full border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-slate-600 px-2 py-1 bg-slate-800 text-left text-slate-200">{children}</th>,
                td: ({ children }) => <td className="border border-slate-700 px-2 py-1 text-slate-300">{children}</td>,
              }}
            >
              {response.response}
            </ReactMarkdown>
          </div>
          
          {/* Citations */}
          {response.citations && response.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700/50">
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
      
      {/* Collapsed preview */}
      {!isExpanded && response.response && (
        <div className="px-4 py-3 text-sm text-slate-400 line-clamp-2">
          {response.response.slice(0, 200).replace(/[#*_]/g, '')}...
        </div>
      )}
    </div>
  );
});
