"use client";

/**
 * InteractiveProgressionCharts - Saloni-Inspired Interactive Visualizations
 * 
 * Key HCI/Human Factors Principles Applied:
 * 1. Direct manipulation - Click, hover, zoom
 * 2. Progressive disclosure - Details on demand
 * 3. Consistent visual vocabulary - Colors match concepts
 * 4. Preattentive processing - Use size, color, position for instant recognition
 * 5. Gestalt principles - Proximity, similarity, continuity
 * 6. Reduce cognitive load - One insight per view
 * 
 * Charts included:
 * - Tumor Burden Waterfall (% change per lesion)
 * - Swimmer Plot (patient-level timeline)
 * - Anatomical Heat Map (lesion locations on body)
 * - Response Donut (at-a-glance proportions)
 */

import { useState, useMemo, useCallback } from "react";
import {
  ImagingStudy,
  TargetLesion,
  RECISTAssessment,
  LesionMeasurement
} from "@/types/imaging";

// ============================================================================
// TYPES
// ============================================================================

interface ChartProps {
  targetLesions: TargetLesion[];
  assessments: RECISTAssessment[];
  studies?: ImagingStudy[];
  onLesionSelect?: (lesionId: string) => void;
  onStudySelect?: (studyId: string) => void;
}

// ============================================================================
// TUMOR BURDEN WATERFALL CHART
// ============================================================================

/**
 * Waterfall chart showing % change from baseline for each target lesion
 * Inspired by oncology clinical trial publications
 * 
 * Colors: 
 * - Blue/Green = shrinkage (good)
 * - Red = growth (bad)
 * - Threshold lines for PR (-30%) and PD (+20%)
 */
export function TumorBurdenWaterfall({ 
  targetLesions, 
  onLesionSelect 
}: ChartProps) {
  const [hoveredLesion, setHoveredLesion] = useState<string | null>(null);
  const [selectedTimepoint, setSelectedTimepoint] = useState<number>(-1); // -1 = latest

  // Calculate % change from baseline for each lesion
  const waterfallData = useMemo(() => {
    return targetLesions.map(lesion => {
      const baseline = lesion.measurements[0];
      const timepointIdx = selectedTimepoint === -1 
        ? lesion.measurements.length - 1 
        : Math.min(selectedTimepoint, lesion.measurements.length - 1);
      const current = lesion.measurements[timepointIdx];
      
      const baselineSize = lesion.isLymphNode 
        ? (baseline.shortAxis || baseline.longAxis) 
        : baseline.longAxis;
      const currentSize = lesion.isLymphNode 
        ? (current.shortAxis || current.longAxis) 
        : current.longAxis;
      
      const percentChange = baselineSize > 0 
        ? ((currentSize - baselineSize) / baselineSize) * 100 
        : 0;

      return {
        id: lesion.id,
        location: lesion.location,
        organ: lesion.organ,
        isLymphNode: lesion.isLymphNode,
        baselineSize,
        currentSize,
        percentChange,
        absoluteChange: currentSize - baselineSize
      };
    }).sort((a, b) => a.percentChange - b.percentChange); // Sort by % change
  }, [targetLesions, selectedTimepoint]);

  // Get available timepoints
  const timepoints = useMemo(() => {
    const maxMeasurements = Math.max(...targetLesions.map(l => l.measurements.length));
    return Array.from({ length: maxMeasurements }, (_, i) => i);
  }, [targetLesions]);

  const maxAbsChange = Math.max(
    Math.abs(Math.min(...waterfallData.map(d => d.percentChange))),
    Math.abs(Math.max(...waterfallData.map(d => d.percentChange))),
    50
  );

  if (targetLesions.length === 0) {
    return <EmptyChartState message="No target lesions to display" />;
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Tumor Burden Waterfall</h3>
            <p className="text-xs text-slate-400 mt-1">% change from baseline per lesion</p>
          </div>
          
          {/* Timepoint selector */}
          {timepoints.length > 1 && (
            <select
              value={selectedTimepoint}
              onChange={(e) => setSelectedTimepoint(Number(e.target.value))}
              className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-1 border border-slate-600"
            >
              <option value={-1}>Latest</option>
              {timepoints.slice(1).map(t => (
                <option key={t} value={t}>Timepoint {t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Chart area */}
        <div className="relative" style={{ height: `${Math.max(200, waterfallData.length * 32)}px` }}>
          {/* Threshold lines */}
          <div className="absolute inset-0">
            {/* Zero line */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-slate-500"
              style={{ left: '50%' }}
            />
            {/* -30% PR threshold */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-blue-500/50 border-dashed"
              style={{ left: `${50 - (30 / maxAbsChange) * 50}%` }}
            >
              <span className="absolute top-0 -translate-x-1/2 text-xs text-blue-400 bg-slate-800 px-1">
                -30%
              </span>
            </div>
            {/* +20% PD threshold */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-red-500/50 border-dashed"
              style={{ left: `${50 + (20 / maxAbsChange) * 50}%` }}
            >
              <span className="absolute top-0 -translate-x-1/2 text-xs text-red-400 bg-slate-800 px-1">
                +20%
              </span>
            </div>
          </div>

          {/* Bars */}
          <div className="relative h-full flex flex-col justify-around py-2">
            {waterfallData.map((lesion, idx) => {
              const barWidth = (Math.abs(lesion.percentChange) / maxAbsChange) * 50;
              const isNegative = lesion.percentChange < 0;
              const isHovered = hoveredLesion === lesion.id;

              // Color based on change
              const getBarColor = () => {
                if (lesion.percentChange <= -30) return 'bg-emerald-500';
                if (lesion.percentChange < 0) return 'bg-blue-500';
                if (lesion.percentChange < 20) return 'bg-yellow-500';
                return 'bg-red-500';
              };

              return (
                <div 
                  key={lesion.id}
                  className="relative flex items-center h-6 group cursor-pointer"
                  onMouseEnter={() => setHoveredLesion(lesion.id)}
                  onMouseLeave={() => setHoveredLesion(null)}
                  onClick={() => onLesionSelect?.(lesion.id)}
                >
                  {/* Bar */}
                  <div 
                    className={`absolute h-5 rounded transition-all ${getBarColor()} ${
                      isHovered ? 'opacity-100 h-6' : 'opacity-80'
                    }`}
                    style={{
                      width: `${barWidth}%`,
                      left: isNegative ? `${50 - barWidth}%` : '50%',
                    }}
                  />
                  
                  {/* Label on the side */}
                  <div 
                    className={`absolute text-xs truncate transition-opacity ${
                      isHovered ? 'opacity-100' : 'opacity-70'
                    }`}
                    style={{
                      [isNegative ? 'left' : 'right']: isNegative 
                        ? `${50 - barWidth - 2}%` 
                        : `${50 - barWidth - 2}%`,
                      maxWidth: isNegative ? `${50 - barWidth - 2}%` : `${50 - barWidth - 2}%`,
                      textAlign: isNegative ? 'right' : 'left',
                      [isNegative ? 'right' : 'left']: `${50 + barWidth + 2}%`
                    }}
                  >
                    <span className="text-slate-300">{lesion.location}</span>
                  </div>

                  {/* Value label */}
                  <div 
                    className="absolute text-xs font-medium text-white"
                    style={{
                      left: isNegative ? `${50 - barWidth + 1}%` : `${50 + barWidth - 8}%`,
                    }}
                  >
                    {lesion.percentChange > 0 ? '+' : ''}{lesion.percentChange.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredLesion && (
          <div className="mt-4 p-3 bg-slate-900/80 rounded-lg text-sm">
            {(() => {
              const lesion = waterfallData.find(l => l.id === hoveredLesion);
              if (!lesion) return null;
              return (
                <div className="space-y-1">
                  <p className="font-medium text-white">{lesion.location}</p>
                  <p className="text-slate-400">
                    Organ: {lesion.organ} {lesion.isLymphNode && '(Lymph Node)'}
                  </p>
                  <p className="text-slate-400">
                    Baseline: {lesion.baselineSize.toFixed(1)}mm → Current: {lesion.currentSize.toFixed(1)}mm
                  </p>
                  <p className={`font-medium ${
                    lesion.percentChange <= -30 ? 'text-emerald-400' :
                    lesion.percentChange < 0 ? 'text-blue-400' :
                    lesion.percentChange < 20 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    Change: {lesion.percentChange > 0 ? '+' : ''}{lesion.percentChange.toFixed(1)}% ({lesion.absoluteChange > 0 ? '+' : ''}{lesion.absoluteChange.toFixed(1)}mm)
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500" /> PR (≤-30%)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" /> Shrinking
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" /> Stable
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" /> PD (≥+20%)
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SWIMMER PLOT - Timeline View
// ============================================================================

/**
 * Swimmer plot showing treatment response over time
 * Each "lane" is a timepoint showing response status
 * Commonly used in oncology publications
 */
export function SwimmerPlot({
  targetLesions,
  assessments,
  studies,
  onStudySelect
}: ChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Build timeline data
  const timelineData = useMemo(() => {
    if (assessments.length === 0) return [];

    const baselineDate = new Date(assessments[0].baselineDate);
    
    return assessments.map((assessment, idx) => {
      const currentDate = new Date(assessment.currentDate);
      const daysFromBaseline = Math.floor(
        (currentDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeksFromBaseline = Math.floor(daysFromBaseline / 7);

      return {
        id: assessment.id,
        date: currentDate,
        daysFromBaseline,
        weeksFromBaseline,
        response: assessment.overallResponse,
        percentChange: assessment.percentChangeFromBaseline,
        sum: assessment.currentSum,
        isBaseline: idx === 0,
        newLesions: assessment.newLesions
      };
    });
  }, [assessments]);

  if (timelineData.length === 0) {
    return <EmptyChartState message="No assessment data for timeline" />;
  }

  const maxWeeks = Math.max(...timelineData.map(d => d.weeksFromBaseline), 12);

  // Response color mapping
  const getResponseColor = (response: RECISTAssessment['response']) => {
    switch (response) {
      case 'CR': return { bg: 'bg-emerald-500', text: 'text-emerald-400' };
      case 'PR': return { bg: 'bg-blue-500', text: 'text-blue-400' };
      case 'SD': return { bg: 'bg-yellow-500', text: 'text-yellow-400' };
      case 'PD': return { bg: 'bg-red-500', text: 'text-red-400' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-400' };
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Treatment Timeline (Swimmer Plot)</h3>
        <p className="text-xs text-slate-400 mt-1">Response status over time from baseline</p>
      </div>

      <div className="p-4">
        {/* Week markers */}
        <div className="flex items-center mb-2 text-xs text-slate-500">
          <span className="w-20">Weeks:</span>
          <div className="flex-1 flex justify-between">
            {Array.from({ length: Math.ceil(maxWeeks / 4) + 1 }, (_, i) => i * 4).map(week => (
              <span key={week}>{week}</span>
            ))}
          </div>
        </div>

        {/* Swimmer lane */}
        <div className="relative h-16 bg-slate-900/50 rounded-lg overflow-hidden">
          {/* Background grid */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: Math.ceil(maxWeeks / 4) }, (_, i) => (
              <div 
                key={i} 
                className="flex-1 border-r border-slate-700/50"
              />
            ))}
          </div>

          {/* Response segments */}
          <div className="absolute inset-y-4 left-0 right-0">
            {timelineData.map((point, idx) => {
              const nextPoint = timelineData[idx + 1];
              const startPercent = (point.weeksFromBaseline / maxWeeks) * 100;
              const endPercent = nextPoint 
                ? (nextPoint.weeksFromBaseline / maxWeeks) * 100 
                : 100;
              const width = endPercent - startPercent;
              const colors = getResponseColor(point.response);

              return (
                <div
                  key={point.id}
                  className={`absolute h-full ${colors.bg} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${width}%`
                  }}
                  onMouseEnter={() => setHoveredPoint(point.id)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => {
                    const study = studies?.find(s => 
                      new Date(s.studyDate).toDateString() === point.date.toDateString()
                    );
                    if (study) onStudySelect?.(study.id);
                  }}
                />
              );
            })}
          </div>

          {/* Markers for each assessment */}
          {timelineData.map((point, idx) => {
            const leftPercent = (point.weeksFromBaseline / maxWeeks) * 100;
            const colors = getResponseColor(point.response);

            return (
              <div
                key={point.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${leftPercent}%` }}
              >
                <div 
                  className={`w-4 h-4 rounded-full border-2 border-white ${colors.bg} shadow-lg`}
                  title={`${point.response} - Week ${point.weeksFromBaseline}`}
                />
                {point.newLesions && (
                  <div className="absolute -top-3 -right-1 text-red-400 text-xs">
                    *
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {hoveredPoint && (
          <div className="mt-4 p-3 bg-slate-900/80 rounded-lg text-sm">
            {(() => {
              const point = timelineData.find(p => p.id === hoveredPoint);
              if (!point) return null;
              const colors = getResponseColor(point.response);
              return (
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded ${colors.bg} text-white font-medium`}>
                    {point.response}
                  </div>
                  <div>
                    <p className="text-slate-300">
                      Week {point.weeksFromBaseline} ({point.date.toLocaleDateString()})
                    </p>
                    <p className="text-slate-400">
                      Sum: {point.sum.toFixed(1)}mm ({point.percentChange > 0 ? '+' : ''}{point.percentChange.toFixed(1)}% from baseline)
                    </p>
                    {point.newLesions && (
                      <p className="text-red-400">New lesions detected</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          {['CR', 'PR', 'SD', 'PD'].map(response => {
            const colors = getResponseColor(response as RECISTAssessment['response']);
            return (
              <span key={response} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${colors.bg}`} />
                <span className={colors.text}>{response}</span>
              </span>
            );
          })}
          <span className="flex items-center gap-1 text-slate-400">
            <span className="text-red-400">*</span> New lesions
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANATOMICAL HEAT MAP
// ============================================================================

/**
 * Simple anatomical visualization showing lesion locations
 * Uses body silhouette with colored markers
 * Size of marker = tumor size, Color = response
 */
export function AnatomicalHeatMap({
  targetLesions,
  onLesionSelect
}: ChartProps) {
  const [hoveredLesion, setHoveredLesion] = useState<string | null>(null);

  // Map organs to body positions (simplified)
  const organPositions: Record<string, { x: number; y: number }> = {
    'Lung': { x: 50, y: 30 },
    'Liver': { x: 35, y: 45 },
    'Lymph Node': { x: 50, y: 20 },
    'Bone': { x: 50, y: 70 },
    'Brain': { x: 50, y: 8 },
    'Adrenal': { x: 45, y: 48 },
    'Kidney': { x: 60, y: 48 },
    'Spleen': { x: 65, y: 45 },
    'Pancreas': { x: 50, y: 50 },
    'Pleura': { x: 40, y: 35 },
    'Peritoneum': { x: 50, y: 55 },
    'Mediastinum': { x: 50, y: 25 },
    'Other': { x: 50, y: 60 }
  };

  // Calculate lesion display data
  const lesionDisplayData = useMemo(() => {
    return targetLesions.map(lesion => {
      const baseline = lesion.measurements[0];
      const current = lesion.measurements[lesion.measurements.length - 1];
      
      const baselineSize = lesion.isLymphNode 
        ? (baseline.shortAxis || baseline.longAxis) 
        : baseline.longAxis;
      const currentSize = lesion.isLymphNode 
        ? (current?.shortAxis || current?.longAxis || 0) 
        : (current?.longAxis || 0);
      
      const percentChange = baselineSize > 0 
        ? ((currentSize - baselineSize) / baselineSize) * 100 
        : 0;

      const position = organPositions[lesion.organ] || organPositions['Other'];
      
      // Add slight random offset if multiple lesions in same organ
      const offset = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10
      };

      return {
        ...lesion,
        currentSize,
        percentChange,
        position: {
          x: position.x + offset.x,
          y: position.y + offset.y
        }
      };
    });
  }, [targetLesions]);

  // Get color based on response
  const getColor = (percentChange: number) => {
    if (percentChange <= -30) return '#10b981'; // emerald
    if (percentChange < 0) return '#3b82f6'; // blue
    if (percentChange < 20) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // Normalize size for display (min 10px, max 40px)
  const getDisplaySize = (size: number) => {
    const maxSize = Math.max(...lesionDisplayData.map(l => l.currentSize), 50);
    return Math.max(10, (size / maxSize) * 40);
  };

  if (targetLesions.length === 0) {
    return <EmptyChartState message="No lesion data to display" />;
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Lesion Location Map</h3>
        <p className="text-xs text-slate-400 mt-1">Circle size = tumor size, Color = response</p>
      </div>

      <div className="p-4">
        {/* Body outline SVG with lesion markers */}
        <div className="relative w-full max-w-xs mx-auto" style={{ aspectRatio: '1/2' }}>
          {/* Simple body silhouette */}
          <svg viewBox="0 0 100 200" className="w-full h-full">
            {/* Body outline - simplified human form */}
            <path
              d="M50 15 
                 C35 15 30 25 30 35
                 C30 45 35 50 40 52
                 L38 55
                 C25 57 20 65 20 75
                 L22 120
                 C22 125 25 130 30 132
                 L35 180
                 C35 185 40 190 45 190
                 L55 190
                 C60 190 65 185 65 180
                 L70 132
                 C75 130 78 125 78 120
                 L80 75
                 C80 65 75 57 62 55
                 L60 52
                 C65 50 70 45 70 35
                 C70 25 65 15 50 15"
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              className="opacity-50"
            />
            {/* Head */}
            <circle cx="50" cy="10" r="8" fill="none" stroke="#475569" strokeWidth="1" className="opacity-50" />
            {/* Arms */}
            <path d="M30 55 L10 90 M70 55 L90 90" stroke="#475569" strokeWidth="1" className="opacity-50" />
          </svg>

          {/* Lesion markers */}
          {lesionDisplayData.map(lesion => {
            const size = getDisplaySize(lesion.currentSize);
            const color = getColor(lesion.percentChange);
            const isHovered = hoveredLesion === lesion.id;

            return (
              <div
                key={lesion.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all"
                style={{
                  left: `${lesion.position.x}%`,
                  top: `${lesion.position.y}%`,
                  zIndex: isHovered ? 10 : 1
                }}
                onMouseEnter={() => setHoveredLesion(lesion.id)}
                onMouseLeave={() => setHoveredLesion(null)}
                onClick={() => onLesionSelect?.(lesion.id)}
              >
                <div
                  className="rounded-full border-2 border-white/50 shadow-lg transition-transform"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    opacity: isHovered ? 1 : 0.8,
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
                
                {/* Tooltip on hover */}
                {isHovered && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-900 rounded px-2 py-1 text-xs whitespace-nowrap z-20 shadow-lg">
                    <p className="text-white font-medium">{lesion.location}</p>
                    <p className="text-slate-400">{lesion.currentSize.toFixed(1)}mm</p>
                    <p style={{ color }}>
                      {lesion.percentChange > 0 ? '+' : ''}{lesion.percentChange.toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Responding
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Stable
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" /> Growing
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RESPONSE DONUT CHART
// ============================================================================

/**
 * Simple donut chart showing proportion of lesions by response
 * At-a-glance understanding of overall burden status
 */
export function ResponseDonut({ targetLesions }: ChartProps) {
  // Count lesions by response category
  const responseCounts = useMemo(() => {
    const counts = { responding: 0, stable: 0, growing: 0 };
    
    targetLesions.forEach(lesion => {
      const baseline = lesion.measurements[0];
      const current = lesion.measurements[lesion.measurements.length - 1];
      
      const baselineSize = lesion.isLymphNode 
        ? (baseline.shortAxis || baseline.longAxis) 
        : baseline.longAxis;
      const currentSize = lesion.isLymphNode 
        ? (current?.shortAxis || current?.longAxis || 0) 
        : (current?.longAxis || 0);
      
      const percentChange = baselineSize > 0 
        ? ((currentSize - baselineSize) / baselineSize) * 100 
        : 0;

      if (percentChange <= -30) counts.responding++;
      else if (percentChange >= 20) counts.growing++;
      else counts.stable++;
    });

    return counts;
  }, [targetLesions]);

  const total = targetLesions.length;
  if (total === 0) {
    return <EmptyChartState message="No lesion data" />;
  }

  // Calculate percentages and angles
  const segments = [
    { key: 'responding', count: responseCounts.responding, color: '#10b981', label: 'Responding' },
    { key: 'stable', count: responseCounts.stable, color: '#eab308', label: 'Stable' },
    { key: 'growing', count: responseCounts.growing, color: '#ef4444', label: 'Growing' }
  ].filter(s => s.count > 0);

  // Create SVG arc paths
  let startAngle = -90; // Start from top
  const arcs = segments.map(segment => {
    const angle = (segment.count / total) * 360;
    const endAngle = startAngle + angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + 35 * Math.cos(startRad);
    const y1 = 50 + 35 * Math.sin(startRad);
    const x2 = 50 + 35 * Math.cos(endRad);
    const y2 = 50 + 35 * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const path = `M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    startAngle = endAngle;
    
    return { ...segment, path };
  });

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Lesion Response Summary</h3>
      </div>

      <div className="p-4 flex items-center justify-center gap-8">
        {/* Donut chart */}
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {arcs.map((arc, idx) => (
              <path
                key={arc.key}
                d={arc.path}
                fill={arc.color}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
            {/* Center hole */}
            <circle cx="50" cy="50" r="20" fill="#1e293b" />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-slate-400">lesions</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {segments.map(segment => (
            <div key={segment.key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-slate-300">
                {segment.label}: <span className="font-medium text-white">{segment.count}</span>
                <span className="text-slate-500 ml-1">
                  ({((segment.count / total) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
      <div className="text-slate-500 text-sm">{message}</div>
    </div>
  );
}

// ============================================================================
// COMBINED DASHBOARD
// ============================================================================

/**
 * Combined dashboard showing all charts together
 * Allows users to see multiple perspectives at once
 */
export function ProgressionDashboard(props: ChartProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TumorBurdenWaterfall {...props} />
        <div className="space-y-6">
          <ResponseDonut {...props} />
          <AnatomicalHeatMap {...props} />
        </div>
      </div>
      <SwimmerPlot {...props} />
    </div>
  );
}
