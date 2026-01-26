"use client";

/**
 * ProgressionChart Component
 * 
 * Visualizes tumor progression over time with two modes:
 * 1. TREND LINE - Sum of diameters over time with RECIST thresholds
 * 2. WATERFALL PLOT - Per-lesion percent change from baseline
 * 
 * Follows Saloni's Data Visualization principles:
 * - Familiar visual language
 * - Color-coded by response status
 * - Reference lines for clinical thresholds
 */

import { useMemo, useState } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  BarChart3,
  LineChart,
} from "lucide-react";
import {
  RECISTAssessment,
  TrackedLesion,
  ChartMode,
  RESPONSE_CONFIG,
  RECIST_THRESHOLDS,
  COLORBLIND_SAFE_PALETTE,
} from "@/types/longitudinal-imaging";

interface ProgressionChartProps {
  assessments: RECISTAssessment[];
  lesions: TrackedLesion[];
  mode?: ChartMode;
  height?: number;
  onTimepointClick?: (timepointId: string) => void;
  showLegend?: boolean;
}

export function ProgressionChart({
  assessments,
  lesions,
  mode: initialMode = 'trend',
  height = 200,
  onTimepointClick,
  showLegend = true,
}: ProgressionChartProps) {
  const [mode, setMode] = useState<ChartMode>(initialMode);

  // Sort assessments by date
  const sortedAssessments = useMemo(() => 
    [...assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [assessments]
  );

  if (sortedAssessments.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No assessment data available
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Progression Chart</h3>
        
        <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
          <button
            onClick={() => setMode('trend')}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
              ${mode === 'trend' 
                ? 'bg-slate-600 text-white' 
                : 'text-slate-400 hover:text-white'}
            `}
          >
            <LineChart className="w-3 h-3" />
            Trend
          </button>
          <button
            onClick={() => setMode('waterfall')}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
              ${mode === 'waterfall' 
                ? 'bg-slate-600 text-white' 
                : 'text-slate-400 hover:text-white'}
            `}
          >
            <BarChart3 className="w-3 h-3" />
            Waterfall
          </button>
        </div>
      </div>

      {/* Chart */}
      {mode === 'trend' ? (
        <TrendLineChart
          assessments={sortedAssessments}
          height={height}
          onTimepointClick={onTimepointClick}
        />
      ) : (
        <WaterfallChart
          assessments={sortedAssessments}
          lesions={lesions}
          height={height}
          onTimepointClick={onTimepointClick}
        />
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" />
            <span className="text-slate-400">PR threshold (-30%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" />
            <span className="text-slate-400">PD threshold (+20%)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Trend Line Chart
// ============================================================================

interface TrendLineChartProps {
  assessments: RECISTAssessment[];
  height: number;
  onTimepointClick?: (timepointId: string) => void;
}

function TrendLineChart({ assessments, height, onTimepointClick }: TrendLineChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 400; // Will be responsive via viewBox
  
  // Calculate data bounds
  const baselineSum = assessments[0]?.targetLesions.sumOfDiameters || 0;
  const allSums = assessments.map(a => a.targetLesions.sumOfDiameters);
  const minSum = Math.min(...allSums) * 0.9;
  const maxSum = Math.max(...allSums) * 1.1;
  
  // Calculate scales
  const xScale = (index: number) => 
    padding.left + (index / (assessments.length - 1 || 1)) * (width - padding.left - padding.right);
  
  const yScale = (value: number) => 
    padding.top + ((maxSum - value) / (maxSum - minSum || 1)) * (height - padding.top - padding.bottom);
  
  // Calculate threshold lines
  const prThreshold = baselineSum * (1 + RECIST_THRESHOLDS.PR_THRESHOLD / 100);
  const pdThreshold = baselineSum * (1 + RECIST_THRESHOLDS.PD_THRESHOLD / 100);
  
  // Generate path
  const linePath = assessments
    .map((a, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(a.targetLesions.sumOfDiameters)}`)
    .join(' ');

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full"
      style={{ height: `${height}px` }}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padding.top + t * (height - padding.top - padding.bottom);
        return (
          <line 
            key={t}
            x1={padding.left} 
            y1={y} 
            x2={width - padding.right} 
            y2={y}
            stroke="#334155"
            strokeDasharray="2,2"
          />
        );
      })}

      {/* PR threshold line (green) */}
      {prThreshold >= minSum && prThreshold <= maxSum && (
        <>
          <line
            x1={padding.left}
            y1={yScale(prThreshold)}
            x2={width - padding.right}
            y2={yScale(prThreshold)}
            stroke={COLORBLIND_SAFE_PALETTE.regression}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text
            x={width - padding.right + 5}
            y={yScale(prThreshold)}
            fill={COLORBLIND_SAFE_PALETTE.regression}
            fontSize={10}
            alignmentBaseline="middle"
          >
            -30%
          </text>
        </>
      )}

      {/* PD threshold line (red) */}
      {pdThreshold >= minSum && pdThreshold <= maxSum && (
        <>
          <line
            x1={padding.left}
            y1={yScale(pdThreshold)}
            x2={width - padding.right}
            y2={yScale(pdThreshold)}
            stroke={COLORBLIND_SAFE_PALETTE.progression}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text
            x={width - padding.right + 5}
            y={yScale(pdThreshold)}
            fill={COLORBLIND_SAFE_PALETTE.progression}
            fontSize={10}
            alignmentBaseline="middle"
          >
            +20%
          </text>
        </>
      )}

      {/* Line path */}
      <path
        d={linePath}
        fill="none"
        stroke="#60A5FA"
        strokeWidth={2}
      />

      {/* Data points */}
      {assessments.map((a, i) => {
        const x = xScale(i);
        const y = yScale(a.targetLesions.sumOfDiameters);
        const config = RESPONSE_CONFIG[a.overallResponse];
        
        return (
          <g key={a.id}>
            <circle
              cx={x}
              cy={y}
              r={6}
              fill={getResponseColor(a.overallResponse)}
              stroke="#1E293B"
              strokeWidth={2}
              className="cursor-pointer hover:r-8 transition-all"
              onClick={() => onTimepointClick?.(a.timepointId)}
            />
            
            {/* Value label */}
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              fill="#E2E8F0"
              fontSize={10}
            >
              {a.targetLesions.sumOfDiameters.toFixed(0)}mm
            </text>
          </g>
        );
      })}

      {/* Y-axis label */}
      <text
        x={15}
        y={height / 2}
        fill="#94A3B8"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90, 15, ${height / 2})`}
      >
        Sum of Diameters (mm)
      </text>

      {/* X-axis labels (dates) */}
      {assessments.map((a, i) => {
        const x = xScale(i);
        const date = new Date(a.date);
        const label = i === 0 ? 'Baseline' : `W${Math.floor((date.getTime() - new Date(assessments[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
        
        return (
          <text
            key={a.id}
            x={x}
            y={height - 10}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize={10}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================================================
// Waterfall Chart
// ============================================================================

interface WaterfallChartProps {
  assessments: RECISTAssessment[];
  lesions: TrackedLesion[];
  height: number;
  onTimepointClick?: (timepointId: string) => void;
}

function WaterfallChart({ assessments, lesions, height, onTimepointClick }: WaterfallChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 400;
  
  // Get the latest assessment
  const latestAssessment = assessments[assessments.length - 1];
  const baselineAssessment = assessments[0];
  
  if (!latestAssessment || !baselineAssessment) {
    return <div className="text-slate-500 text-center py-4">Insufficient data</div>;
  }

  // Calculate per-lesion changes
  const lesionChanges = lesions.map(lesion => {
    const baselineMeasurement = lesion.measurements.find(
      m => m.timepointId === baselineAssessment.timepointId
    );
    const latestMeasurement = lesion.measurements.find(
      m => m.timepointId === latestAssessment.timepointId
    );
    
    if (!baselineMeasurement || !latestMeasurement) return null;
    
    const percentChange = ((latestMeasurement.longAxis - baselineMeasurement.longAxis) / baselineMeasurement.longAxis) * 100;
    
    return {
      lesion,
      percentChange,
      baseline: baselineMeasurement.longAxis,
      current: latestMeasurement.longAxis,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Sort by percent change (best to worst)
  const sortedChanges = [...lesionChanges].sort((a, b) => a.percentChange - b.percentChange);
  
  // Calculate scales
  const maxChange = Math.max(30, ...sortedChanges.map(c => Math.abs(c.percentChange)));
  const barWidth = (width - padding.left - padding.right) / (sortedChanges.length || 1) * 0.8;
  const gap = (width - padding.left - padding.right) / (sortedChanges.length || 1) * 0.2;
  
  const xScale = (index: number) => 
    padding.left + index * (barWidth + gap) + barWidth / 2;
  
  const yScale = (value: number) => {
    const chartHeight = height - padding.top - padding.bottom;
    const midY = padding.top + chartHeight / 2;
    return midY - (value / maxChange) * (chartHeight / 2);
  };

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full"
      style={{ height: `${height}px` }}
    >
      {/* Zero line */}
      <line
        x1={padding.left}
        y1={yScale(0)}
        x2={width - padding.right}
        y2={yScale(0)}
        stroke="#64748B"
        strokeWidth={1}
      />

      {/* Threshold lines */}
      <line
        x1={padding.left}
        y1={yScale(-30)}
        x2={width - padding.right}
        y2={yScale(-30)}
        stroke={COLORBLIND_SAFE_PALETTE.regression}
        strokeDasharray="4,4"
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={yScale(20)}
        x2={width - padding.right}
        y2={yScale(20)}
        stroke={COLORBLIND_SAFE_PALETTE.progression}
        strokeDasharray="4,4"
        strokeWidth={1}
      />

      {/* Bars */}
      {sortedChanges.map((item, i) => {
        const x = xScale(i);
        const barHeight = Math.abs(yScale(item.percentChange) - yScale(0));
        const barY = item.percentChange < 0 ? yScale(0) : yScale(item.percentChange);
        const color = item.percentChange < 0 
          ? COLORBLIND_SAFE_PALETTE.regression 
          : item.percentChange > 0 
            ? COLORBLIND_SAFE_PALETTE.progression 
            : COLORBLIND_SAFE_PALETTE.neutral;

        return (
          <g key={item.lesion.id}>
            <rect
              x={x - barWidth / 2}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={2}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
            
            {/* Value label */}
            <text
              x={x}
              y={item.percentChange < 0 ? yScale(item.percentChange) + 15 : yScale(item.percentChange) - 5}
              textAnchor="middle"
              fill="#E2E8F0"
              fontSize={10}
            >
              {item.percentChange >= 0 ? '+' : ''}{item.percentChange.toFixed(0)}%
            </text>
            
            {/* Lesion label */}
            <text
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize={9}
              transform={`rotate(-45, ${x}, ${height - 10})`}
            >
              {item.lesion.name.length > 12 ? item.lesion.name.slice(0, 10) + '...' : item.lesion.name}
            </text>
          </g>
        );
      })}

      {/* Y-axis label */}
      <text
        x={15}
        y={height / 2}
        fill="#94A3B8"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90, 15, ${height / 2})`}
      >
        % Change from Baseline
      </text>

      {/* Y-axis ticks */}
      {[-30, 0, 20].map(tick => (
        <text
          key={tick}
          x={padding.left - 5}
          y={yScale(tick)}
          textAnchor="end"
          alignmentBaseline="middle"
          fill="#94A3B8"
          fontSize={10}
        >
          {tick >= 0 ? '+' : ''}{tick}%
        </text>
      ))}
    </svg>
  );
}

// ============================================================================
// Mini Sparkline (for compact views)
// ============================================================================

interface SparklineProps {
  assessments: RECISTAssessment[];
  width?: number;
  height?: number;
}

export function ProgressionSparkline({ assessments, width = 80, height = 30 }: SparklineProps) {
  if (assessments.length < 2) return null;

  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const values = sortedAssessments.map(a => a.targetLesions.percentChangeFromBaseline);
  const minVal = Math.min(-40, ...values);
  const maxVal = Math.max(30, ...values);
  const range = maxVal - minVal || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = ((maxVal - v) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const latestChange = values[values.length - 1];
  const strokeColor = latestChange < -30 
    ? COLORBLIND_SAFE_PALETTE.regression 
    : latestChange > 20 
      ? COLORBLIND_SAFE_PALETTE.progression 
      : '#60A5FA';

  return (
    <svg width={width} height={height} className="inline-block">
      {/* Zero line */}
      <line
        x1={0}
        y1={((maxVal - 0) / range) * height}
        x2={width}
        y2={((maxVal - 0) / range) * height}
        stroke="#475569"
        strokeDasharray="2,2"
      />
      
      {/* Sparkline */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        points={points}
      />
      
      {/* End point */}
      <circle
        cx={width}
        cy={((maxVal - latestChange) / range) * height}
        r={2.5}
        fill={strokeColor}
      />
    </svg>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getResponseColor(response: keyof typeof RESPONSE_CONFIG): string {
  switch (response) {
    case 'CR':
    case 'PR':
      return COLORBLIND_SAFE_PALETTE.regression;
    case 'PD':
      return COLORBLIND_SAFE_PALETTE.progression;
    case 'SD':
      return COLORBLIND_SAFE_PALETTE.stable;
    default:
      return COLORBLIND_SAFE_PALETTE.neutral;
  }
}
