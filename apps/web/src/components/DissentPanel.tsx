"use client";

import { AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

/**
 * Structured dissent — emitted by the moderator at the end of consensus
 * generation as a fenced JSON block, parsed server-side, and forwarded
 * to the client via the `dissenting_opinions` SSE event.
 *
 * Shape mirrors apps/web/src/app/api/deliberate/user-case/route.ts.
 */
export interface DissentPosition {
  agentId: string;
  position: string;
}

export interface DissentEntry {
  topic: string;
  significance: "high" | "moderate" | "low";
  positions: DissentPosition[];
  resolution: string;
}

/** Display metadata mirrors ConsensusPanel.tsx so colours stay consistent. */
const AGENT_DISPLAY: Record<
  string,
  { name: string; specialty: string; chipClass: string; icon: string }
> = {
  "principal-investigator": {
    name: "Dr. Adhyaksha",
    specialty: "Chairperson",
    chipClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    icon: "🌟",
  },
  "surgical-oncologist": {
    name: "Dr. Shalya",
    specialty: "Surgical Oncology",
    chipClass: "bg-red-500/15 text-red-300 border-red-500/30",
    icon: "🔪",
  },
  "medical-oncologist": {
    name: "Dr. Chikitsa",
    specialty: "Medical Oncology",
    chipClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    icon: "💊",
  },
  "radiation-oncologist": {
    name: "Dr. Kirann",
    specialty: "Radiation Oncology",
    chipClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: "☢️",
  },
  "palliative-care": {
    name: "Dr. Shanti",
    specialty: "Palliative Care",
    chipClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    icon: "🕊️",
  },
  radiologist: {
    name: "Dr. Chitran",
    specialty: "Onco-Radiology",
    chipClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    icon: "📷",
  },
  pathologist: {
    name: "Dr. Marga",
    specialty: "Pathology",
    chipClass: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    icon: "🔬",
  },
  geneticist: {
    name: "Dr. Anuvamsha",
    specialty: "Genetics",
    chipClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: "🧬",
  },
  "scientific-critic": {
    name: "Dr. Tark",
    specialty: "Scientific Safety",
    chipClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    icon: "🛡️",
  },
  stewardship: {
    name: "Dr. Samata",
    specialty: "Patient Advocate",
    chipClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    icon: "⚖️",
  },
};

const SIGNIFICANCE_META: Record<
  DissentEntry["significance"],
  { label: string; chipClass: string; railClass: string }
> = {
  high: {
    label: "Changes the plan",
    chipClass: "bg-red-500/15 text-red-300 border-red-500/30",
    railClass: "bg-red-500",
  },
  moderate: {
    label: "Changes intensity / sequence",
    chipClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    railClass: "bg-amber-500",
  },
  low: {
    label: "Tone / framing",
    chipClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    railClass: "bg-slate-500",
  },
};

export function DissentPanel({
  disagreements,
  onAgentClick,
}: {
  disagreements: DissentEntry[];
  onAgentClick?: (agentId: string) => void;
}) {
  const empty = disagreements.length === 0;

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {empty ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <h4 className="font-semibold text-white">
            {empty ? "Specialists aligned" : "Disagreements"}
          </h4>
          {!empty && (
            <span className="text-xs text-slate-500">
              · {disagreements.length} surfaced by the moderator
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {empty && (
        <div className="px-5 py-5 text-sm text-slate-300 leading-relaxed">
          The moderator did not surface any clinically meaningful
          disagreements across specialists for this case. All recommendations
          aligned on the major decision points.
        </div>
      )}

      {/* First-time-user explainer */}
      {!empty && (
        <div className="px-5 py-3 bg-amber-500/5 border-b border-slate-800 text-[13px] text-slate-400 leading-relaxed">
          The specialists did <span className="text-amber-300 font-medium">not</span> all
          agree on this case. Each card below shows the opposing positions
          side by side, and how the board chair resolved the debate in the
          final plan. Click a specialist&apos;s name to read their full opinion.
        </div>
      )}

      {/* Entries */}
      {!empty && (
        <div className="divide-y divide-slate-800">
          {disagreements.map((entry, i) => (
            <DissentRow
              key={i}
              entry={entry}
              onAgentClick={onAgentClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DissentRow({
  entry,
  onAgentClick,
}: {
  entry: DissentEntry;
  onAgentClick?: (agentId: string) => void;
}) {
  const sig = SIGNIFICANCE_META[entry.significance];

  return (
    <div className="flex">
      <div className={`w-1 ${sig.railClass}`} aria-hidden />
      <div className="flex-1 min-w-0 px-5 py-4">
        {/* Topic + significance */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-[15px] font-semibold text-white leading-snug">
            {entry.topic}
          </div>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold tracking-wide ${sig.chipClass}`}
            title={`Significance: ${entry.significance}`}
          >
            {sig.label}
          </span>
        </div>

        {/* Positions */}
        <div className="mb-3">
          {entry.positions.map((p, i) => {
            const meta = AGENT_DISPLAY[p.agentId];
            const isClickable = !!onAgentClick;
            return (
              <div key={i}>
                {i > 0 && (
                  <div className="flex items-center gap-3 py-1.5" aria-hidden>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-[10px] font-bold tracking-widest text-amber-400/80 uppercase">
                      vs
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                )}
                <div className="flex items-start gap-3 rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                <button
                  type="button"
                  onClick={
                    isClickable ? () => onAgentClick!(p.agentId) : undefined
                  }
                  disabled={!isClickable}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    meta?.chipClass ??
                    "bg-slate-800 text-slate-300 border-slate-700"
                  } ${isClickable ? "hover:brightness-125 cursor-pointer" : ""}`}
                  title={
                    isClickable ? "Jump to this specialist's full opinion" : undefined
                  }
                >
                  <span aria-hidden>{meta?.icon ?? "👤"}</span>
                  <span>{meta?.name ?? p.agentId}</span>
                </button>
                  <p className="text-[13.5px] text-slate-200 leading-relaxed mt-0.5">
                    {p.position}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resolution */}
        {entry.resolution && (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
            <MessageSquare className="w-4 h-4 mt-0.5 text-indigo-300 shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-300/80 mb-0.5">
                Moderator's resolution
              </div>
              <div className="text-[13.5px] text-slate-100 leading-relaxed">
                {entry.resolution}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
