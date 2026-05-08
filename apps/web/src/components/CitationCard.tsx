"use client";

import { ExternalLink } from "lucide-react";
import { GUIDELINE_BODIES } from "@/lib/agent-guidelines";
import type { CuratedCitation } from "@/lib/agent-guidelines";

export function CitationCard({ citation }: { citation: CuratedCitation }) {
  const body = GUIDELINE_BODIES[citation.body];
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold tracking-wide ${body.badgeClass}`}
            title={body.fullName}
          >
            {body.code}
          </span>
          {citation.evidenceLevel && (
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
              {citation.evidenceLevel}
            </span>
          )}
        </div>
        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Open guideline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="text-sm font-medium text-slate-100 leading-snug">
        {citation.title}
      </div>

      {(citation.section || citation.locator) && (
        <div className="mt-1 text-xs text-slate-400">
          {citation.section}
          {citation.section && citation.locator ? "  ·  " : null}
          {citation.locator}
        </div>
      )}

      <blockquote className="mt-3 pl-3 border-l-2 border-slate-700 text-[13px] leading-relaxed text-slate-300 italic">
        “{citation.quote}”
      </blockquote>
    </div>
  );
}
