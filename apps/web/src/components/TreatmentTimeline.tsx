"use client";

/**
 * Treatment Timeline Component
 * 
 * Displays a visual chronological timeline of treatment events
 * Color-coded by specialty/document type
 */

import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Microscope,
  Radiation,
  Pill,
  TestTube,
  Stethoscope,
  ClipboardList,
  Dna,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import type { TimelineEvent, ExtractedDate, DocumentType } from "@/types/user-upload";

// Color mapping by document type
const TYPE_COLORS: Record<DocumentType, { bg: string; text: string; border: string }> = {
  'pathology': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500' },
  'radiology': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500' },
  'surgical-notes': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  'prescription': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  'lab-report': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500' },
  'clinical-notes': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500' },
  'discharge-summary': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  'genomics': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500' },
  'unknown': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500' },
};

// Icon mapping by document type
const TYPE_ICONS: Record<DocumentType, typeof FileText> = {
  'pathology': Microscope,
  'radiology': Radiation,
  'surgical-notes': Stethoscope,
  'prescription': Pill,
  'lab-report': TestTube,
  'clinical-notes': ClipboardList,
  'discharge-summary': FileText,
  'genomics': Dna,
  'unknown': HelpCircle,
};

// Convert ExtractedDate to TimelineEvent
function datesToTimelineEvents(dates: ExtractedDate[]): TimelineEvent[] {
  return dates.map((d, idx) => {
    const docType = getDocTypeFromEventType(d.eventType);
    const colors = TYPE_COLORS[docType];
    const Icon = TYPE_ICONS[docType];
    
    return {
      id: `event-${idx}-${d.date}`,
      date: d.date,
      dateConfidence: d.confidence,
      eventType: d.eventType,
      title: d.event,
      description: `From: ${d.documentFilename}`,
      documentId: d.documentId,
      documentType: docType,
      documentFilename: d.documentFilename,
      color: colors.text.replace('text-', ''),
      icon: '📄',
      specialty: docType,
    };
  });
}

// Map event type back to document type
function getDocTypeFromEventType(eventType: string): DocumentType {
  const mapping: Record<string, DocumentType> = {
    'diagnosis': 'pathology',
    'surgery': 'surgical-notes',
    'scan': 'radiology',
    'treatment': 'prescription',
    'lab': 'lab-report',
    'consult': 'clinical-notes',
    'other': 'unknown',
  };
  return mapping[eventType] || 'unknown';
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Format month for grouping
function formatMonth(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}

interface TreatmentTimelineProps {
  extractedDates: ExtractedDate[];
  onEventClick?: (event: TimelineEvent) => void;
  compact?: boolean;
}

export function TreatmentTimeline({ 
  extractedDates, 
  onEventClick,
  compact = false 
}: TreatmentTimelineProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Convert to timeline events and sort by date
  const events = useMemo(() => {
    const timelineEvents = datesToTimelineEvents(extractedDates);
    return timelineEvents.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [extractedDates]);

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of events) {
      const monthKey = formatMonth(event.date);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    }
    return groups;
  }, [events]);

  // Auto-expand all months initially
  useMemo(() => {
    if (expandedMonths.size === 0 && Object.keys(eventsByMonth).length > 0) {
      setExpandedMonths(new Set(Object.keys(eventsByMonth)));
    }
  }, [eventsByMonth, expandedMonths.size]);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">No timeline events detected</p>
        <p className="text-sm text-slate-500 mt-1">
          Dates will be extracted from your documents during processing
        </p>
      </div>
    );
  }

  // Compact mode for smaller displays
  if (compact) {
    return (
      <div className="space-y-2">
        {events.slice(0, 5).map((event) => {
          const colors = TYPE_COLORS[event.documentType];
          const Icon = TYPE_ICONS[event.documentType];
          
          return (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg ${colors.bg} border ${colors.border}/30 hover:border-opacity-60 transition-colors text-left`}
            >
              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{event.title}</p>
                <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
              </div>
            </button>
          );
        })}
        {events.length > 5 && (
          <p className="text-xs text-slate-500 text-center">
            +{events.length - 5} more events
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />
      
      {/* Events grouped by month */}
      <div className="space-y-6">
        {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
          <div key={month}>
            {/* Month header */}
            <button
              onClick={() => toggleMonth(month)}
              className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center z-10">
                <span className="text-xs font-semibold text-indigo-400">{month.slice(0, 3)}</span>
              </div>
              <span className="text-sm font-medium text-slate-300">{month}</span>
              <span className="text-xs text-slate-500">({monthEvents.length})</span>
              {expandedMonths.has(month) ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            
            {/* Month events */}
            {expandedMonths.has(month) && (
              <div className="space-y-3 pl-2">
                {monthEvents.map((event) => {
                  const colors = TYPE_COLORS[event.documentType];
                  const Icon = TYPE_ICONS[event.documentType];
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`w-full flex items-start gap-4 p-3 rounded-xl ${colors.bg} border ${colors.border}/30 hover:border-opacity-60 transition-all text-left group`}
                    >
                      {/* Timeline dot */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border-2 ${colors.border}/50 group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{event.title}</span>
                          {event.dateConfidence < 0.7 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">
                              Low confidence
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{event.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-500 font-mono">
                            {formatDate(event.date)}
                          </span>
                          <span className={`text-xs ${colors.text} capitalize`}>
                            {event.eventType}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 mb-2">Event Types:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_COLORS).slice(0, 6).map(([type, colors]) => {
            const Icon = TYPE_ICONS[type as DocumentType];
            return (
              <div
                key={type}
                className={`flex items-center gap-1.5 px-2 py-1 rounded ${colors.bg}`}
              >
                <Icon className={`w-3 h-3 ${colors.text}`} />
                <span className={`text-xs ${colors.text} capitalize`}>
                  {type.replace('-', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Horizontal timeline variant for larger displays
export function HorizontalTimeline({ extractedDates }: { extractedDates: ExtractedDate[] }) {
  const events = useMemo(() => {
    const timelineEvents = datesToTimelineEvents(extractedDates);
    return timelineEvents.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [extractedDates]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="relative min-w-max">
        {/* Timeline line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-700 -translate-y-1/2" />
        
        {/* Events */}
        <div className="flex items-center gap-6 relative">
          {events.map((event, idx) => {
            const colors = TYPE_COLORS[event.documentType];
            const Icon = TYPE_ICONS[event.documentType];
            const isAbove = idx % 2 === 0;
            
            return (
              <div
                key={event.id}
                className={`flex flex-col items-center ${isAbove ? '' : 'flex-col-reverse'}`}
              >
                {/* Content */}
                <div className={`w-32 p-2 rounded-lg ${colors.bg} border ${colors.border}/30 ${isAbove ? 'mb-3' : 'mt-3'}`}>
                  <p className="text-xs font-medium text-white truncate">{event.title}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    {formatDate(event.date)}
                  </p>
                </div>
                
                {/* Connector line */}
                <div className={`w-0.5 h-4 ${colors.border.replace('border', 'bg')}`} />
                
                {/* Dot */}
                <div className={`w-8 h-8 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center z-10 bg-slate-900`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
