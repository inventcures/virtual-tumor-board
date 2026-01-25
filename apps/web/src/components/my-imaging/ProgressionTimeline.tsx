"use client";

/**
 * ProgressionTimeline - Visualize disease progression and RECIST response over time
 */

import { useState, useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  AlertTriangle,
  Calendar,
  Ruler,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye
} from "lucide-react";
import { 
  ImagingStudy, 
  TargetLesion, 
  RECISTAssessment 
} from "@/types/imaging";
import { formatRECISTResponse } from "@/lib/medgemma/recist-calculator";

interface ProgressionTimelineProps {
  studies: ImagingStudy[];
  targetLesions: TargetLesion[];
  assessments: RECISTAssessment[];
  onStudySelect?: (studyId: string) => void;
  onCompareSelect?: (baselineId: string, followUpId: string) => void;
}

export function ProgressionTimeline({
  studies,
  targetLesions,
  assessments,
  onStudySelect,
  onCompareSelect
}: ProgressionTimelineProps) {
  const [showChart, setShowChart] = useState(true);
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [expandedLesion, setExpandedLesion] = useState<string | null>(null);

  // Sort studies by date
  const sortedStudies = useMemo(() => 
    [...studies].sort((a, b) => 
      new Date(a.studyDate).getTime() - new Date(b.studyDate).getTime()
    ),
    [studies]
  );

  // Calculate sum of target lesion diameters for each timepoint
  const chartData = useMemo(() => {
    if (targetLesions.length === 0) return [];

    // Get all unique dates from measurements
    const dateMap = new Map<string, number>();
    
    for (const lesion of targetLesions) {
      for (const m of lesion.measurements) {
        const dateStr = new Date(m.date).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit'
        });
        const diameter = lesion.isLymphNode 
          ? (m.shortAxis || m.longAxis)
          : m.longAxis;
        
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + diameter);
      }
    }

    return Array.from(dateMap.entries()).map(([date, sum]) => ({
      date,
      sum
    }));
  }, [targetLesions]);

  // Get latest assessment
  const latestAssessment = assessments.length > 0 
    ? assessments[assessments.length - 1]
    : null;

  const getResponseIcon = (response: RECISTAssessment['response']) => {
    switch (response) {
      case 'CR':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'PR':
        return <TrendingDown className="w-4 h-4 text-blue-400" />;
      case 'SD':
        return <Minus className="w-4 h-4 text-yellow-400" />;
      case 'PD':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResponseColor = (response: RECISTAssessment['response']) => {
    switch (response) {
      case 'CR': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'PR': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'SD': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'PD': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const handleStudyClick = (studyId: string) => {
    if (selectedStudies.includes(studyId)) {
      setSelectedStudies(prev => prev.filter(id => id !== studyId));
    } else if (selectedStudies.length < 2) {
      setSelectedStudies(prev => [...prev, studyId]);
    }
  };

  const handleCompare = () => {
    if (selectedStudies.length === 2 && onCompareSelect) {
      onCompareSelect(selectedStudies[0], selectedStudies[1]);
    }
  };

  if (studies.length === 0 && targetLesions.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
        <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No Progression Data</h3>
        <p className="text-sm text-slate-400">
          Upload multiple scans over time to track disease progression and RECIST response.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-white">Disease Progression Timeline</span>
        </div>
        
        {latestAssessment && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getResponseColor(latestAssessment.overallResponse)}`}>
            {getResponseIcon(latestAssessment.overallResponse)}
            <span className="ml-2">{formatRECISTResponse(latestAssessment.overallResponse).label}</span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {latestAssessment && (
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Baseline Sum</p>
              <p className="text-lg font-semibold text-white">{latestAssessment.baselineSum.toFixed(0)}mm</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Current Sum</p>
              <p className="text-lg font-semibold text-white">{latestAssessment.currentSum.toFixed(0)}mm</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Change from Baseline</p>
              <p className={`text-lg font-semibold ${
                latestAssessment.percentChangeFromBaseline < 0 ? 'text-emerald-400' :
                latestAssessment.percentChangeFromBaseline > 0 ? 'text-red-400' : 'text-white'
              }`}>
                {latestAssessment.percentChangeFromBaseline > 0 ? '+' : ''}
                {latestAssessment.percentChangeFromBaseline.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Nadir</p>
              <p className="text-lg font-semibold text-white">{latestAssessment.nadirSum.toFixed(0)}mm</p>
            </div>
          </div>
        </div>
      )}

      {/* Simple Chart Visualization */}
      {chartData.length > 1 && showChart && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Sum of Target Lesions Over Time</span>
            <button
              onClick={() => setShowChart(!showChart)}
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              {showChart ? 'Hide' : 'Show'} Chart
            </button>
          </div>
          
          {/* Simple bar chart */}
          <div className="flex items-end gap-2 h-32">
            {chartData.map((point, idx) => {
              const maxSum = Math.max(...chartData.map(d => d.sum));
              const heightPercent = maxSum > 0 ? (point.sum / maxSum) * 100 : 0;
              const isBaseline = idx === 0;
              const isCurrent = idx === chartData.length - 1;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t transition-all ${
                      isBaseline ? 'bg-indigo-500' :
                      isCurrent ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 truncate w-full text-center">
                    {point.date}
                  </span>
                  <span className="text-xs text-slate-300">{point.sum.toFixed(0)}</span>
                </div>
              );
            })}
          </div>

          {/* RECIST Thresholds */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-slate-400">PR: -30%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-slate-400">PD: +20%</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline of Studies */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Study Timeline</span>
          {selectedStudies.length === 2 && (
            <button
              onClick={handleCompare}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500"
            >
              Compare Selected
            </button>
          )}
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
          
          {/* Study points */}
          <div className="space-y-4">
            {sortedStudies.map((study, idx) => {
              const isBaseline = idx === 0;
              const isSelected = selectedStudies.includes(study.id);
              const assessment = assessments.find(a => 
                new Date(a.currentDate).toDateString() === new Date(study.studyDate).toDateString()
              );

              return (
                <div 
                  key={study.id}
                  className={`relative pl-10 cursor-pointer group ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                  onClick={() => handleStudyClick(study.id)}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                    isBaseline ? 'bg-indigo-500' :
                    isSelected ? 'bg-purple-500' : 'bg-slate-600'
                  }`}>
                    {isBaseline && <Target className="w-3 h-3 text-white" />}
                    {!isBaseline && assessment && getResponseIcon(assessment.response)}
                  </div>

                  {/* Study card */}
                  <div className={`p-3 rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-purple-900/30 border-purple-500/50' 
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-white">
                            {new Date(study.studyDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {isBaseline && (
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                              Baseline
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {study.modality} - {study.description}
                        </p>
                      </div>

                      {assessment && (
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getResponseColor(assessment.response)}`}>
                          {assessment.response}
                        </div>
                      )}
                    </div>

                    {/* Show measurements for this timepoint */}
                    {assessment && (
                      <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                        Sum: {assessment.currentSum.toFixed(0)}mm
                        {!isBaseline && (
                          <span className={
                            assessment.percentChangeFromBaseline < 0 ? ' text-emerald-400' :
                            assessment.percentChangeFromBaseline > 0 ? ' text-red-400' : ''
                          }>
                            {' '}({assessment.percentChangeFromBaseline > 0 ? '+' : ''}{assessment.percentChangeFromBaseline.toFixed(1)}% from baseline)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Lesion Details */}
      {targetLesions.length > 0 && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Target Lesions ({targetLesions.length})
            </span>
          </div>

          <div className="space-y-2">
            {targetLesions.map(lesion => (
              <div key={lesion.id} className="bg-slate-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedLesion(expandedLesion === lesion.id ? null : lesion.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{lesion.location}</span>
                    {lesion.isLymphNode && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        LN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {lesion.measurements.length} measurements
                    </span>
                    {expandedLesion === lesion.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedLesion === lesion.id && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-1 overflow-x-auto py-2">
                      {lesion.measurements.map((m, idx) => {
                        const size = lesion.isLymphNode ? (m.shortAxis || m.longAxis) : m.longAxis;
                        const isFirst = idx === 0;
                        const change = isFirst ? 0 : 
                          ((size - (lesion.measurements[0].longAxis)) / lesion.measurements[0].longAxis) * 100;

                        return (
                          <div key={idx} className="flex-shrink-0 text-center px-3 py-2 bg-slate-800 rounded">
                            <p className="text-xs text-slate-400">
                              {new Date(m.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                            </p>
                            <p className="text-sm font-medium text-white">{size}mm</p>
                            {!isFirst && (
                              <p className={`text-xs ${
                                change < 0 ? 'text-emerald-400' :
                                change > 0 ? 'text-red-400' : 'text-slate-400'
                              }`}>
                                {change > 0 ? '+' : ''}{change.toFixed(0)}%
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-700">
        <p className="text-xs text-slate-400">
          Click on two studies to compare them side-by-side. Upload follow-up scans to track progression over time.
        </p>
      </div>
    </div>
  );
}
