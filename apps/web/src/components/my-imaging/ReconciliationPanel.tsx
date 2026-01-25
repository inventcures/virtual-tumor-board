"use client";

/**
 * ReconciliationPanel - Display AI vs Report comparison results
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Scale
} from "lucide-react";
import { ReconciliationResult, Finding, DiscrepancyItem } from "@/types/imaging";

interface ReconciliationPanelProps {
  reconciliation: ReconciliationResult;
  onViewFinding?: (finding: Finding) => void;
}

export function ReconciliationPanel({
  reconciliation,
  onViewFinding
}: ReconciliationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview', 'discrepancies']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getConfidenceBadge = (level: 'high' | 'moderate' | 'low') => {
    switch (level) {
      case 'high':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            High Confidence
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Moderate Confidence
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            Low Confidence
          </span>
        );
    }
  };

  const getSeverityColor = (severity: DiscrepancyItem['severity']) => {
    switch (severity) {
      case 'significant':
        return 'border-red-500/50 bg-red-900/20';
      case 'moderate':
        return 'border-yellow-500/50 bg-yellow-900/20';
      case 'minor':
        return 'border-blue-500/50 bg-blue-900/20';
    }
  };

  const hasDiscrepancies = reconciliation.discrepancies.length > 0;
  const hasNewFindings = reconciliation.newAIFindings.length > 0;
  const significantIssues = reconciliation.discrepancies.filter(d => d.severity === 'significant').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-white">AI vs Radiologist Comparison</span>
        </div>
        {getConfidenceBadge(reconciliation.confidenceLevel)}
      </div>

      {/* Alert Banner for Significant Issues */}
      {significantIssues > 0 && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">
              {significantIssues} Significant Discrepanc{significantIssues > 1 ? 'ies' : 'y'} Found
            </p>
            <p className="text-xs text-red-400/80 mt-1">
              Review required - these differences could affect clinical decisions
            </p>
          </div>
        </div>
      )}

      {/* Overview Assessment */}
      <div className="bg-slate-900/50 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-medium text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Overall Assessment
          </span>
          {expandedSections.includes('overview') ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSections.includes('overview') && (
          <div className="px-3 pb-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              {reconciliation.overallAssessment}
            </p>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="p-2 rounded bg-emerald-500/10 text-center">
                <p className="text-lg font-bold text-emerald-400">{reconciliation.agreement.length}</p>
                <p className="text-xs text-slate-400">Agreed</p>
              </div>
              <div className="p-2 rounded bg-yellow-500/10 text-center">
                <p className="text-lg font-bold text-yellow-400">{reconciliation.discrepancies.length}</p>
                <p className="text-xs text-slate-400">Discrepancies</p>
              </div>
              <div className="p-2 rounded bg-blue-500/10 text-center">
                <p className="text-lg font-bold text-blue-400">{reconciliation.newAIFindings.length}</p>
                <p className="text-xs text-slate-400">AI Only</p>
              </div>
              <div className="p-2 rounded bg-purple-500/10 text-center">
                <p className="text-lg font-bold text-purple-400">{reconciliation.missedInReport.length}</p>
                <p className="text-xs text-slate-400">Report Only</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agreements Section */}
      {reconciliation.agreement.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('agreements')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Findings in Agreement ({reconciliation.agreement.length})
            </span>
            {expandedSections.includes('agreements') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.includes('agreements') && (
            <div className="px-3 pb-3 space-y-2">
              {reconciliation.agreement.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-emerald-900/20 border border-emerald-500/30"
                >
                  <p className="text-sm text-white font-medium">{item.finding}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-blue-400">MedGemma AI:</span>
                      <p className="text-slate-300">{item.aiDescription}</p>
                    </div>
                    <div>
                      <span className="text-purple-400">Radiology Report:</span>
                      <p className="text-slate-300">{item.reportDescription}</p>
                    </div>
                  </div>
                  {item.measurements && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span>AI: {item.measurements.ai}</span>
                      <span>Report: {item.measurements.report}</span>
                      {item.measurements.difference && (
                        <span className="text-emerald-400">({item.measurements.difference} diff)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discrepancies Section */}
      {reconciliation.discrepancies.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('discrepancies')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Discrepancies ({reconciliation.discrepancies.length})
            </span>
            {expandedSections.includes('discrepancies') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.includes('discrepancies') && (
            <div className="px-3 pb-3 space-y-3">
              {reconciliation.discrepancies.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border ${getSeverityColor(item.severity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      item.severity === 'significant' 
                        ? 'bg-red-500/20 text-red-400' 
                        : item.severity === 'moderate'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                    <div className="p-2 rounded bg-slate-800/50">
                      <span className="text-xs text-blue-400 block mb-1">MedGemma AI</span>
                      <p className="text-slate-300">{item.aiPosition}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50">
                      <span className="text-xs text-purple-400 block mb-1">Radiology Report</span>
                      <p className="text-slate-300">{item.reportPosition}</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <p>
                      <span className="text-orange-400">Clinical Implication:</span>
                      <span className="text-slate-300 ml-1">{item.clinicalImplication}</span>
                    </p>
                    <p>
                      <span className="text-emerald-400">Recommendation:</span>
                      <span className="text-slate-300 ml-1">{item.recommendation}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New AI Findings */}
      {reconciliation.newAIFindings.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('newFindings')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              New AI Findings ({reconciliation.newAIFindings.length})
            </span>
            {expandedSections.includes('newFindings') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.includes('newFindings') && (
            <div className="px-3 pb-3 space-y-2">
              <p className="text-xs text-slate-400 mb-2">
                These findings were detected by MedGemma AI but not mentioned in the radiology report.
              </p>
              {reconciliation.newAIFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-blue-900/20 border border-blue-500/30 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-white">{finding.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Location: {finding.location} | Severity: {finding.severity}
                    </p>
                  </div>
                  {onViewFinding && (
                    <button
                      onClick={() => onViewFinding(finding)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missed in Report */}
      {reconciliation.missedInReport.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('missedInReport')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-purple-400" />
              Report Only ({reconciliation.missedInReport.length})
            </span>
            {expandedSections.includes('missedInReport') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.includes('missedInReport') && (
            <div className="px-3 pb-3 space-y-2">
              <p className="text-xs text-slate-400 mb-2">
                These findings were mentioned in the report but not detected by MedGemma AI.
              </p>
              {reconciliation.missedInReport.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-purple-900/20 border border-purple-500/30"
                >
                  <p className="text-sm text-white">{finding.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Location: {finding.location}
                  </p>
                  {finding.note && (
                    <p className="text-xs text-purple-400 mt-1">{finding.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
