"use client";

/**
 * Treatment Timeline Component V2
 * 
 * Displays a visual chronological timeline of treatment events
 * with multiple view modes: Horizontal (default), Vertical, Swimlane
 * Color-coded by subspecialty/document type with legend
 */

import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Microscope,
  Radiation,
  Pill,
  TestTube,
  Stethoscope,
  ClipboardList,
  Dna,
  HelpCircle,
  AlertCircle,
  LayoutList,
  AlignHorizontalDistributeCenter,
  Rows3
} from "lucide-react";
import type { TimelineEvent, ExtractedDate, DocumentType } from "@/types/user-upload";

// View mode type
type TimelineViewMode = 'horizontal' | 'vertical' | 'swimlane';

// Subspecialty mapping with full names
const SUBSPECIALTY_INFO: Record<DocumentType, { name: string; shortName: string }> = {
  'pathology': { name: 'Pathology', shortName: 'Path' },
  'radiology': { name: 'Radiology', shortName: 'Rad' },
  'surgical-notes': { name: 'Surgery', shortName: 'Surg' },
  'prescription': { name: 'Medical Oncology', shortName: 'Med Onc' },
  'lab-report': { name: 'Laboratory', shortName: 'Lab' },
  'clinical-notes': { name: 'Clinical', shortName: 'Clin' },
  'discharge-summary': { name: 'Discharge', shortName: 'DC' },
  'genomics': { name: 'Genomics', shortName: 'Gen' },
  'unknown': { name: 'Other', shortName: 'Other' },
};

// Color mapping by document type - vibrant colors for visibility
const TYPE_COLORS: Record<DocumentType, { bg: string; text: string; border: string; solid: string }> = {
  'pathology': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500', solid: 'bg-pink-500' },
  'radiology': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500', solid: 'bg-cyan-500' },
  'surgical-notes': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', solid: 'bg-red-500' },
  'prescription': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500', solid: 'bg-blue-500' },
  'lab-report': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500', solid: 'bg-amber-500' },
  'clinical-notes': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500', solid: 'bg-slate-500' },
  'discharge-summary': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500', solid: 'bg-purple-500' },
  'genomics': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500', solid: 'bg-emerald-500' },
  'unknown': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500', solid: 'bg-slate-500' },
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

// Format short date
function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
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
  defaultView?: TimelineViewMode;
}

export function TreatmentTimeline({ 
  extractedDates, 
  onEventClick,
  compact = false,
  defaultView = 'horizontal'
}: TreatmentTimelineProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>(defaultView);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Convert to timeline events and sort by date
  const events = useMemo(() => {
    const timelineEvents = datesToTimelineEvents(extractedDates);
    return timelineEvents.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [extractedDates]);

  // Get unique subspecialties present in data
  const presentSubspecialties = useMemo(() => {
    const types = new Set<DocumentType>();
    events.forEach(e => types.add(e.documentType));
    return Array.from(types);
  }, [events]);

  // Group events by month (for vertical view)
  const eventsByMonth = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of events) {
      const monthKey = formatMonth(event.date);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    }
    return groups;
  }, [events]);

  // Group events by subspecialty (for swimlane view)
  const eventsBySubspecialty = useMemo(() => {
    const groups: Record<DocumentType, TimelineEvent[]> = {} as any;
    for (const event of events) {
      if (!groups[event.documentType]) groups[event.documentType] = [];
      groups[event.documentType].push(event);
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

  // Subspecialty Legend Component
  const SubspecialtyLegend = () => (
    <div className="flex flex-wrap gap-2 py-3 px-1">
      {presentSubspecialties.map((type) => {
        const colors = TYPE_COLORS[type];
        const info = SUBSPECIALTY_INFO[type];
        const Icon = TYPE_ICONS[type];
        const count = eventsBySubspecialty[type]?.length || 0;
        
        return (
          <div
            key={type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border}/40`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${colors.solid}`} />
            <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
            <span className={`text-xs font-medium ${colors.text}`}>
              {info.name}
            </span>
            <span className="text-xs text-slate-500">({count})</span>
          </div>
        );
      })}
    </div>
  );

  // View Toggle Component
  const ViewToggle = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
      <button
        onClick={() => setViewMode('horizontal')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          viewMode === 'horizontal' 
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        title="Horizontal Timeline"
      >
        <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Horizontal</span>
      </button>
      <button
        onClick={() => setViewMode('vertical')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          viewMode === 'vertical' 
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        title="Vertical Timeline"
      >
        <LayoutList className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Vertical</span>
      </button>
      <button
        onClick={() => setViewMode('swimlane')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          viewMode === 'swimlane' 
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        title="Swimlane View (by Subspecialty)"
      >
        <Rows3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Swimlane</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">
            {events.length} events over {Object.keys(eventsByMonth).length} months
          </span>
        </div>
        <ViewToggle />
      </div>

      {/* Subspecialty Legend */}
      <SubspecialtyLegend />

      {/* Timeline Views */}
      {viewMode === 'horizontal' && (
        <HorizontalTimelineView 
          events={events} 
          onEventClick={onEventClick}
          hoveredEvent={hoveredEvent}
          setHoveredEvent={setHoveredEvent}
        />
      )}

      {viewMode === 'vertical' && (
        <VerticalTimelineView 
          events={events}
          eventsByMonth={eventsByMonth}
          expandedMonths={expandedMonths}
          toggleMonth={toggleMonth}
          onEventClick={onEventClick}
        />
      )}

      {viewMode === 'swimlane' && (
        <SwimlaneTimelineView 
          events={events}
          eventsBySubspecialty={eventsBySubspecialty}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

// =============================================================================
// HORIZONTAL TIMELINE VIEW (Default)
// =============================================================================

interface HorizontalTimelineViewProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  hoveredEvent: string | null;
  setHoveredEvent: (id: string | null) => void;
}

function HorizontalTimelineView({ 
  events, 
  onEventClick,
  hoveredEvent,
  setHoveredEvent
}: HorizontalTimelineViewProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  return (
    <div className="relative">
      {/* Scroll indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      
      {/* Scrollable container */}
      <div className="overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="relative min-w-max px-8">
          {/* Main timeline line */}
          <div className="absolute left-8 right-8 top-[60px] h-1 bg-gradient-to-r from-slate-700 via-indigo-500/50 to-slate-700 rounded-full" />
          
          {/* Events */}
          <div className="flex items-start gap-4 relative">
            {events.map((event, idx) => {
              const colors = TYPE_COLORS[event.documentType];
              const Icon = TYPE_ICONS[event.documentType];
              const info = SUBSPECIALTY_INFO[event.documentType];
              const isHovered = hoveredEvent === event.id;
              
              return (
                <div
                  key={event.id}
                  className="flex flex-col items-center group"
                  style={{ minWidth: '140px' }}
                >
                  {/* Event card - above line */}
                  <button
                    onClick={() => onEventClick?.(event)}
                    onMouseEnter={() => setHoveredEvent(event.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    className={`w-full p-3 rounded-xl ${colors.bg} border-2 ${
                      isHovered ? colors.border : `${colors.border}/30`
                    } hover:scale-105 transition-all duration-200 text-left mb-3`}
                  >
                    <p className="text-xs font-semibold text-white truncate mb-1">
                      {event.title}
                    </p>
                    <p className={`text-[10px] ${colors.text} font-medium`}>
                      {info.shortName}
                    </p>
                  </button>
                  
                  {/* Connector line */}
                  <div className={`w-0.5 h-4 ${colors.solid} opacity-60`} />
                  
                  {/* Timeline dot */}
                  <div 
                    className={`w-10 h-10 rounded-full ${colors.bg} border-3 ${colors.border} flex items-center justify-center z-20 bg-slate-900 group-hover:scale-125 transition-transform duration-200`}
                  >
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  
                  {/* Connector line below */}
                  <div className={`w-0.5 h-4 ${colors.solid} opacity-60`} />
                  
                  {/* Date label - below line */}
                  <div className="mt-2 text-center">
                    <p className="text-xs font-mono text-slate-400">
                      {formatShortDate(event.date)}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(event.date).getFullYear()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VERTICAL TIMELINE VIEW
// =============================================================================

interface VerticalTimelineViewProps {
  events: TimelineEvent[];
  eventsByMonth: Record<string, TimelineEvent[]>;
  expandedMonths: Set<string>;
  toggleMonth: (month: string) => void;
  onEventClick?: (event: TimelineEvent) => void;
}

function VerticalTimelineView({
  events,
  eventsByMonth,
  expandedMonths,
  toggleMonth,
  onEventClick
}: VerticalTimelineViewProps) {
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
    </div>
  );
}

// =============================================================================
// SWIMLANE TIMELINE VIEW (Grouped by Subspecialty)
// =============================================================================

interface SwimlaneTimelineViewProps {
  events: TimelineEvent[];
  eventsBySubspecialty: Record<DocumentType, TimelineEvent[]>;
  onEventClick?: (event: TimelineEvent) => void;
}

function SwimlaneTimelineView({
  events,
  eventsBySubspecialty,
  onEventClick
}: SwimlaneTimelineViewProps) {
  // Get date range for positioning
  const dateRange = useMemo(() => {
    if (events.length === 0) return { min: 0, max: 1, range: 1 };
    const dates = events.map(e => new Date(e.date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const range = max - min || 1; // Avoid division by zero
    return { min, max, range };
  }, [events]);

  // Calculate position for an event
  const getPosition = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    return ((time - dateRange.min) / dateRange.range) * 100;
  };

  // Sort subspecialties by first event date
  const sortedSubspecialties = useMemo(() => {
    return Object.entries(eventsBySubspecialty)
      .sort(([, a], [, b]) => {
        const aFirst = new Date(a[0]?.date || 0).getTime();
        const bFirst = new Date(b[0]?.date || 0).getTime();
        return aFirst - bFirst;
      });
  }, [eventsBySubspecialty]);

  return (
    <div className="space-y-1">
      {/* Time axis header */}
      <div className="flex items-center mb-4">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700" />
          {/* Time markers */}
          {events.length > 0 && (
            <>
              <div className="absolute left-0 top-0 text-[10px] text-slate-500 font-mono">
                {formatShortDate(events[0].date)}
              </div>
              <div className="absolute right-0 top-0 text-[10px] text-slate-500 font-mono">
                {formatShortDate(events[events.length - 1].date)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Swimlanes */}
      {sortedSubspecialties.map(([type, typeEvents]) => {
        const docType = type as DocumentType;
        const colors = TYPE_COLORS[docType];
        const info = SUBSPECIALTY_INFO[docType];
        const Icon = TYPE_ICONS[docType];
        
        return (
          <div key={type} className="flex items-center group">
            {/* Lane label */}
            <div className={`w-32 flex-shrink-0 flex items-center gap-2 pr-3 py-2`}>
              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${colors.text} truncate`}>
                  {info.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {typeEvents.length} events
                </p>
              </div>
            </div>
            
            {/* Lane track */}
            <div className={`flex-1 relative h-14 rounded-lg ${colors.bg}/30 border ${colors.border}/20 group-hover:border-opacity-40 transition-colors`}>
              {/* Lane line */}
              <div className={`absolute inset-x-2 top-1/2 h-0.5 ${colors.solid}/30 -translate-y-1/2`} />
              
              {/* Events on lane */}
              {typeEvents.map((event) => {
                const position = getPosition(event.date);
                
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    style={{ left: `${Math.min(Math.max(position, 2), 95)}%` }}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${colors.solid} border-2 border-white/20 flex items-center justify-center hover:scale-125 hover:z-10 transition-all duration-200 group/dot`}
                    title={`${event.title}\n${formatDate(event.date)}`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-20">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                        <p className="text-xs font-medium text-white">{event.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// Horizontal timeline variant for larger displays (legacy)
export function HorizontalTimeline({ extractedDates }: { extractedDates: ExtractedDate[] }) {
  return (
    <TreatmentTimeline 
      extractedDates={extractedDates} 
      defaultView="horizontal"
    />
  );
}
