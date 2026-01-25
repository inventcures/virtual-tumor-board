"use client";

/**
 * MedGemmaPanel - Display MedGemma AI analysis results
 */

import { useState } from "react";
import { 
  Brain, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Ruler, Target, FileText, Lightbulb, Activity, Info
} from "lucide-react";
import { MedGemmaResponse, Finding, Measurement } from "@/types/imaging";

interface MedGemmaPanelProps {
  analysis: MedGemmaResponse;
  studyId: string;
  onMeasurementSelect?: (measurement: Measurement) => void;
  onFindingHighlight?: (finding: Finding) => void;
}

export function MedGemmaPanel({ 
  analysis, 
  studyId,
  onMeasurementSelect,
  onFindingHighlight
}: MedGemmaPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['findings', 'impression']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-400 bg-emerald-400/10';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'moderate': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      case 'mild': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'normal': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Confidence */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-white">MedGemma Analysis</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(analysis.confidence)}`}>
          {Math.round(analysis.confidence * 100)}% Confidence
        </div>
      </div>

      {/* Findings Section */}
      <div className="bg-slate-900/50 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('findings')}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              Findings ({analysis.findings.length})
            </span>
          </div>
          {expandedSections.includes('findings') ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {expandedSections.includes('findings') && (
          <div className="px-3 pb-3 space-y-2">
            {analysis.findings.length > 0 ? (
              analysis.findings.map((finding, idx) => (
                <div 
                  key={finding.id || idx}
                  onClick={() => onFindingHighlight?.(finding)}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-800/50 transition-colors ${getSeverityColor(finding.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white">{finding.description}</p>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-slate-800">
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Location: {finding.location}
                  </p>
                  {finding.sliceNumbers && finding.sliceNumbers.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Slices: {finding.sliceNumbers.join(', ')}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-2">No significant findings identified</p>
            )}
          </div>
        )}
      </div>

      {/* Measurements Section */}
      {analysis.measurements.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('measurements')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">
                Measurements ({analysis.measurements.length})
              </span>
            </div>
            {expandedSections.includes('measurements') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          
          {expandedSections.includes('measurements') && (
            <div className="px-3 pb-3">
              <div className="space-y-2">
                {analysis.measurements.map((m, idx) => (
                  <div 
                    key={m.lesionId || idx}
                    onClick={() => onMeasurementSelect?.(m)}
                    className="p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{m.description}</span>
                      {m.isTarget && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                          Target Lesion
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>
                        Size: {m.dimensions.long}mm
                        {m.dimensions.short && ` x ${m.dimensions.short}mm`}
                      </span>
                      <span>Location: {m.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Impression Section */}
      <div className="bg-slate-900/50 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('impression')}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">Impression</span>
          </div>
          {expandedSections.includes('impression') ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {expandedSections.includes('impression') && (
          <div className="px-3 pb-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              {analysis.impression || 'No impression available'}
            </p>
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      {analysis.recommendations.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">
                Recommendations ({analysis.recommendations.length})
              </span>
            </div>
            {expandedSections.includes('recommendations') ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          
          {expandedSections.includes('recommendations') && (
            <div className="px-3 pb-3">
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">
          AI-generated analysis for educational purposes only. Always consult a qualified radiologist for clinical decisions.
        </p>
      </div>
    </div>
  );
}
