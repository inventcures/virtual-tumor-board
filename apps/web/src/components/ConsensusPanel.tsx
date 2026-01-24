"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Award, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Target,
  Calendar,
  DollarSign,
  Users,
  BookOpen
} from "lucide-react";

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
}: {
  consensus: string | null;
  isComplete: boolean;
  agentResponses: Record<string, AgentResponse>;
  onAgentClick?: (agentId: string) => void;
}) {
  const [showAllResponses, setShowAllResponses] = useState(false);

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
            {isComplete && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Consensus Reached</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-slate-700/50">
          <SummaryCard
            icon={<Target className="w-5 h-5" />}
            label="Treatment Intent"
            value="Curative"
            color="emerald"
          />
          <SummaryCard
            icon={<FileText className="w-5 h-5" />}
            label="Primary Approach"
            value="ChemoRT + Durvalumab"
            color="blue"
          />
          <SummaryCard
            icon={<Calendar className="w-5 h-5" />}
            label="Duration"
            value="~18 months"
            color="purple"
          />
          <SummaryCard
            icon={<Users className="w-5 h-5" />}
            label="Confidence"
            value="High (7/7)"
            color="amber"
          />
        </div>

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

        {/* Indian Context Alert */}
        <div className="mx-6 mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Indian Healthcare Context</h4>
              <p className="text-sm text-slate-300">
                Durvalumab costs ~₹3-4 lakh per cycle. Explore patient assistance programs, check 
                Ayushman Bharat coverage, or consider chemoRT alone as a cost-effective alternative 
                with meaningful survival benefit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expand All Responses */}
      <button
        onClick={() => setShowAllResponses(!showAllResponses)}
        className="w-full py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
      >
        {showAllResponses ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Individual Specialist Responses
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Individual Specialist Responses ({Object.keys(agentResponses).length} specialists)
          </>
        )}
      </button>

      {/* All Responses */}
      {showAllResponses && (
        <div className="space-y-4">
          {Object.keys(agentResponses).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No specialist responses available
            </div>
          ) : (
            Object.entries(agentResponses).map(([agentId, response]) => (
              <FullResponseCard 
                key={agentId} 
                agentId={agentId} 
                response={response} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className={`${colorClasses[color].split(" ")[0]} mb-2`}>{icon}</div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  );
}

const agentMeta: Record<string, { name: string; specialty: string; color: string; icon: string }> = {
  "surgical-oncologist": { name: "Dr. Shalya", specialty: "Surgical Oncology", color: "red", icon: "🔪" },
  "medical-oncologist": { name: "Dr. Chikitsa", specialty: "Medical Oncology", color: "blue", icon: "💊" },
  "radiation-oncologist": { name: "Dr. Kirann", specialty: "Radiation Oncology", color: "amber", icon: "☢️" },
  "palliative-care": { name: "Dr. Shanti", specialty: "Palliative Care", color: "purple", icon: "🕊️" },
  "radiologist": { name: "Dr. Chitran", specialty: "Onco-Radiology", color: "cyan", icon: "📷" },
  "pathologist": { name: "Dr. Marga", specialty: "Pathology", color: "pink", icon: "🔬" },
  "geneticist": { name: "Dr. Anuvamsha", specialty: "Genetics", color: "emerald", icon: "🧬" },
};

const colorStyles: Record<string, string> = {
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  slate: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function FullResponseCard({
  agentId,
  response,
}: {
  agentId: string;
  response: AgentResponse;
}) {
  const meta = agentMeta[agentId] || { name: agentId, specialty: "Specialist", color: "slate", icon: "👤" };
  const styles = colorStyles[meta.color] || colorStyles.slate;

  return (
    <div 
      id={`agent-response-${agentId}`}
      className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300"
    >
      <div className={`px-4 py-3 border-b border-slate-700 flex items-center justify-between ${styles.split(' ')[0]}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${styles}`}>
            {meta.icon}
          </div>
          <div>
            <h4 className="font-semibold text-white">{meta.name}</h4>
            <p className={`text-sm ${styles.split(' ')[1]}`}>{meta.specialty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Complete
        </div>
      </div>
      
      {response.response ? (
        <div className="p-4">
          <div className="prose-content text-sm max-h-96 overflow-y-auto pr-2">
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
      ) : (
        <div className="p-4 text-slate-500 text-sm italic">
          No response content available
        </div>
      )}
    </div>
  );
}
