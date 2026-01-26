"use client";

/**
 * TimelineSidebar Component
 * 
 * Vertical timeline showing all imaging timepoints for selection.
 * Color-coded by response status with progression indicators.
 */

import { useState } from "react";
import { 
  Calendar, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  CircleDot,
  Circle,
  AlertCircle,
  Pill,
} from "lucide-react";
import { 
  ImagingTimepoint, 
  RECISTAssessment, 
  ResponseCategory,
  RESPONSE_CONFIG,
} from "@/types/longitudinal-imaging";
import { ResponseMiniBadge } from "./ResponseBadge";

interface TimelineSidebarProps {
  timepoints: ImagingTimepoint[];
  assessments: RECISTAssessment[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onAddTimepoint?: () => void;
  maxSelections?: number;
  showTreatmentContext?: boolean;
}

export function TimelineSidebar({
  timepoints,
  assessments,
  selectedIds,
  onSelect,
  onSelectMultiple,
  onAddTimepoint,
  maxSelections = 4,
  showTreatmentContext = true,
}: TimelineSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get assessment for a timepoint
  const getAssessment = (timepointId: string) => 
    assessments.find(a => a.timepointId === timepointId);

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format days from baseline
  const formatDaysFromBaseline = (days: number) => {
    if (days === 0) return 'Baseline';
    if (days < 7) return `Day ${days}`;
    if (days < 30) return `Week ${Math.floor(days / 7)}`;
    return `Month ${Math.floor(days / 30)}`;
  };

  // Toggle timepoint selection
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Deselect
      if (onSelectMultiple) {
        onSelectMultiple(selectedIds.filter(sid => sid !== id));
      }
    } else {
      // Select (respecting max)
      if (selectedIds.length < maxSelections) {
        if (onSelectMultiple) {
          onSelectMultiple([...selectedIds, id]);
        } else {
          onSelect(id);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 border-r border-slate-700">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-white text-sm">Timeline</span>
            <span className="text-xs text-slate-500">
              ({timepoints.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Timeline Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Selection hint */}
          <div className="text-xs text-slate-500 px-2 mb-3">
            Select up to {maxSelections} timepoints to compare
          </div>

          {/* Timeline entries */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-700" />

            {/* Timepoint entries */}
            <div className="space-y-1">
              {timepoints.map((tp, index) => {
                const assessment = getAssessment(tp.id);
                const isSelected = selectedIds.includes(tp.id);
                const response = assessment?.overallResponse;

                return (
                  <TimelineEntry
                    key={tp.id}
                    timepoint={tp}
                    assessment={assessment}
                    isSelected={isSelected}
                    isFirst={index === 0}
                    isLast={index === timepoints.length - 1}
                    onClick={() => handleToggle(tp.id)}
                    formatDate={formatDate}
                    formatDaysFromBaseline={formatDaysFromBaseline}
                    showTreatmentContext={showTreatmentContext}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Timepoint Button */}
      {onAddTimepoint && (
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={onAddTimepoint}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                       border border-dashed border-slate-600 text-slate-400
                       hover:border-slate-500 hover:text-white transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Scan
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Timeline Entry Component
// ============================================================================

interface TimelineEntryProps {
  timepoint: ImagingTimepoint;
  assessment?: RECISTAssessment;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  formatDate: (date: Date) => string;
  formatDaysFromBaseline: (days: number) => string;
  showTreatmentContext: boolean;
}

function TimelineEntry({
  timepoint,
  assessment,
  isSelected,
  isFirst,
  isLast,
  onClick,
  formatDate,
  formatDaysFromBaseline,
  showTreatmentContext,
}: TimelineEntryProps) {
  const response = assessment?.overallResponse;
  const percentChange = assessment?.targetLesions.percentChangeFromBaseline ?? 0;
  const hasNewLesions = assessment?.newLesions.present ?? false;

  // Determine dot color based on response
  const getDotColor = () => {
    if (!response) return 'bg-slate-600';
    return RESPONSE_CONFIG[response].color;
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left pl-10 pr-2 py-2 rounded-lg transition-all
        ${isSelected 
          ? 'bg-slate-700/80 ring-1 ring-indigo-500' 
          : 'hover:bg-slate-700/50'}
      `}
    >
      {/* Timeline dot */}
      <div 
        className={`
          absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full
          ${isSelected ? getDotColor() : 'bg-slate-600'}
          ring-2 ring-slate-800
        `}
      />

      {/* Content */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Date and label */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
              {formatDaysFromBaseline(timepoint.daysFromBaseline)}
            </span>
            {timepoint.isBaseline && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300">
                Baseline
              </span>
            )}
          </div>

          {/* Actual date */}
          <div className="text-xs text-slate-500">
            {formatDate(timepoint.studyDate)}
          </div>

          {/* Treatment context */}
          {showTreatmentContext && timepoint.treatmentContext && (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <Pill className="w-3 h-3" />
              {timepoint.treatmentContext}
            </div>
          )}
        </div>

        {/* Response indicator */}
        <div className="flex flex-col items-end gap-1">
          {response && (
            <ResponseMiniBadge response={response} />
          )}
          
          {/* Percent change */}
          {assessment && !timepoint.isBaseline && (
            <span 
              className={`text-xs font-mono ${
                percentChange < 0 ? 'text-green-400' : 
                percentChange > 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(0)}%
            </span>
          )}

          {/* New lesions warning */}
          {hasNewLesions && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle className="w-3 h-3" />
              New
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Compact Timeline (for narrow views)
// ============================================================================

interface CompactTimelineProps {
  timepoints: ImagingTimepoint[];
  assessments: RECISTAssessment[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function CompactTimeline({
  timepoints,
  assessments,
  selectedId,
  onSelect,
}: CompactTimelineProps) {
  const getAssessment = (timepointId: string) => 
    assessments.find(a => a.timepointId === timepointId);

  return (
    <div className="flex items-center gap-1 p-2 bg-slate-800/50 rounded-lg overflow-x-auto">
      {timepoints.map((tp, index) => {
        const assessment = getAssessment(tp.id);
        const isSelected = tp.id === selectedId;
        const response = assessment?.overallResponse;
        
        return (
          <button
            key={tp.id}
            onClick={() => onSelect(tp.id)}
            className={`
              flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-all
              ${isSelected ? 'bg-slate-700 ring-1 ring-indigo-500' : 'hover:bg-slate-700/50'}
            `}
          >
            {/* Response badge */}
            {response ? (
              <ResponseMiniBadge response={response} />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
                <Circle className="w-3 h-3 text-slate-400" />
              </div>
            )}
            
            {/* Label */}
            <span className={`text-xs ${isSelected ? 'text-white' : 'text-slate-400'}`}>
              {tp.isBaseline ? 'BL' : `W${Math.floor(tp.daysFromBaseline / 7)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
