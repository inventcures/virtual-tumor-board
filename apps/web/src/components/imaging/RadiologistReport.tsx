"use client";

import { useState } from "react";
import { RadiologistReport as ReportType } from "@/lib/imaging/radiology-reports";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Ruler,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  MousePointer,
} from "lucide-react";

interface RadiologistReportProps {
  report: ReportType | null;
  onMeasurementClick?: (slice: number) => void;
}

export function RadiologistReport({ report, onMeasurementClick }: RadiologistReportProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["findings", "impression"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No radiology report available</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Radiology Report</h3>
        </div>
        <div className="text-xs text-slate-400">{report.studyType}</div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Technique */}
        <Section
          title="Technique"
          isExpanded={expandedSections.has("technique")}
          onToggle={() => toggleSection("technique")}
        >
          <p className="text-sm text-slate-300 leading-relaxed">{report.technique}</p>
        </Section>

        {/* Comparison */}
        <Section
          title="Comparison"
          isExpanded={expandedSections.has("comparison")}
          onToggle={() => toggleSection("comparison")}
        >
          <p className="text-sm text-slate-300">{report.comparison}</p>
        </Section>

        {/* Findings */}
        <Section
          title="Findings"
          isExpanded={expandedSections.has("findings")}
          onToggle={() => toggleSection("findings")}
          highlight
        >
          <div className="space-y-3">
            <FindingItem label="Primary Lesion" content={report.findings.primaryLesion} />
            <FindingItem label="Lymph Nodes" content={report.findings.lymphNodes} />
            <FindingItem label="Metastases" content={report.findings.metastases} />
            <FindingItem label="Incidental" content={report.findings.incidental} />
          </div>
        </Section>

        {/* Measurements */}
        <Section
          title="Measurements"
          isExpanded={expandedSections.has("measurements")}
          onToggle={() => toggleSection("measurements")}
        >
          <div className="space-y-2">
            {report.measurements.map((m, idx) => (
              <button
                key={idx}
                onClick={() => onMeasurementClick?.(m.slice)}
                className="w-full flex items-center gap-3 p-2 bg-slate-800/50 rounded hover:bg-slate-700/50 transition-colors text-left group"
              >
                <Ruler className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300">{m.label}</div>
                  <div className="text-xs text-slate-500">{m.location}</div>
                </div>
                <div className="text-sm font-mono text-blue-300">{m.value}</div>
                <MousePointer className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </Section>

        {/* Impression */}
        <Section
          title="Impression"
          isExpanded={expandedSections.has("impression")}
          onToggle={() => toggleSection("impression")}
          highlight
        >
          <ol className="space-y-2">
            {report.impression.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-300">
                <span className="text-blue-400 font-medium">{idx + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Recommendations */}
        <Section
          title="Recommendations"
          isExpanded={expandedSections.has("recommendations")}
          onToggle={() => toggleSection("recommendations")}
        >
          <ul className="space-y-2">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Footer - Signature */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-3.5 h-3.5" />
            <span>{report.reporter}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(report.signedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible Section Component
function Section({
  title,
  children,
  isExpanded,
  onToggle,
  highlight = false,
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border ${
        highlight ? "border-blue-500/30 bg-blue-500/5" : "border-slate-700/50"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/30 transition-colors rounded-t-lg"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <span
          className={`text-sm font-medium ${highlight ? "text-blue-300" : "text-slate-300"}`}
        >
          {title}
        </span>
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// Finding Item Component
function FindingItem({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{content}</p>
    </div>
  );
}
