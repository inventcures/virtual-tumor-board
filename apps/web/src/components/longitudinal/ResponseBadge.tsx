"use client";

/**
 * ResponseBadge Component
 * 
 * Displays RECIST response status (CR/PR/SD/PD) with color coding.
 * The most important visual element - immediately communicates clinical status.
 * 
 * Design follows Saloni's Data Visualization principles:
 * - Colors match clinical concepts (Green=good, Yellow=caution, Red=alert)
 * - Plain language for patients
 * - Colorblind-safe palette
 */

import { 
  CheckCircle, 
  TrendingDown, 
  Minus, 
  TrendingUp, 
  HelpCircle,
  ArrowDown,
  ArrowUp,
  ArrowRight,
} from "lucide-react";
import { 
  ResponseCategory, 
  TrendDirection, 
  RESPONSE_CONFIG, 
  ResponseBadgeProps 
} from "@/types/longitudinal-imaging";

// Size configurations
const SIZE_CONFIG = {
  sm: {
    badge: "px-2 py-1 text-xs",
    icon: "w-3 h-3",
    percent: "text-xs",
  },
  md: {
    badge: "px-3 py-1.5 text-sm",
    icon: "w-4 h-4",
    percent: "text-sm",
  },
  lg: {
    badge: "px-4 py-2 text-base",
    icon: "w-5 h-5",
    percent: "text-lg font-semibold",
  },
};

// Icon mapping
const RESPONSE_ICONS = {
  CR: CheckCircle,
  PR: TrendingDown,
  SD: Minus,
  PD: TrendingUp,
  NE: HelpCircle,
};

const TREND_ICONS = {
  improving: ArrowDown,
  stable: ArrowRight,
  worsening: ArrowUp,
};

export function ResponseBadge({ 
  response, 
  percentChange, 
  trend,
  size = 'md' 
}: ResponseBadgeProps) {
  const config = RESPONSE_CONFIG[response];
  const sizeConfig = SIZE_CONFIG[size];
  const ResponseIcon = RESPONSE_ICONS[response];
  const TrendIcon = TREND_ICONS[trend];
  
  // Format percent change with sign
  const formattedPercent = percentChange >= 0 
    ? `+${percentChange.toFixed(0)}%` 
    : `${percentChange.toFixed(0)}%`;

  return (
    <div className="flex items-center gap-2">
      {/* Main Response Badge */}
      <div 
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium
          ${config.color} text-white
          ${sizeConfig.badge}
        `}
      >
        <ResponseIcon className={sizeConfig.icon} />
        <span>{config.shortLabel}</span>
      </div>

      {/* Percent Change */}
      <span 
        className={`
          font-mono font-semibold
          ${percentChange < 0 ? 'text-green-400' : percentChange > 0 ? 'text-red-400' : 'text-slate-400'}
          ${sizeConfig.percent}
        `}
      >
        {formattedPercent}
      </span>

      {/* Trend Indicator (only for md/lg) */}
      {size !== 'sm' && (
        <TrendIcon 
          className={`
            ${sizeConfig.icon}
            ${trend === 'improving' ? 'text-green-400' : 
              trend === 'worsening' ? 'text-red-400' : 'text-slate-400'}
          `}
        />
      )}
    </div>
  );
}

// ============================================================================
// Expanded Response Card (for detailed view)
// ============================================================================

interface ResponseCardProps {
  response: ResponseCategory;
  percentChange: number;
  trend: TrendDirection;
  sumOfDiameters: number;
  baselineSum: number;
  nadirSum: number;
  showDetails?: boolean;
}

export function ResponseCard({
  response,
  percentChange,
  trend,
  sumOfDiameters,
  baselineSum,
  nadirSum,
  showDetails = true,
}: ResponseCardProps) {
  const config = RESPONSE_CONFIG[response];
  const ResponseIcon = RESPONSE_ICONS[response];
  
  const percentFromNadir = nadirSum > 0 
    ? ((sumOfDiameters - nadirSum) / nadirSum) * 100 
    : 0;

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} bg-slate-800/50 p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${config.color}`}>
            <ResponseIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className={`font-semibold ${config.textColor}`}>
              {config.label}
            </div>
            <div className="text-xs text-slate-400">
              {config.description}
            </div>
          </div>
        </div>
        
        {/* Large percent change */}
        <div 
          className={`
            text-3xl font-bold font-mono
            ${percentChange < 0 ? 'text-green-400' : 
              percentChange > 0 ? 'text-red-400' : 'text-slate-400'}
          `}
        >
          {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(0)}%
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Current</div>
            <div className="text-lg font-semibold text-white">
              {sumOfDiameters.toFixed(0)}mm
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Baseline</div>
            <div className="text-lg font-semibold text-slate-400">
              {baselineSum.toFixed(0)}mm
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Nadir</div>
            <div className="text-lg font-semibold text-slate-400">
              {nadirSum.toFixed(0)}mm
            </div>
            {percentFromNadir !== 0 && (
              <div className={`text-xs ${percentFromNadir > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {percentFromNadir >= 0 ? '+' : ''}{percentFromNadir.toFixed(0)}% from nadir
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Patient-Friendly Summary
// ============================================================================

interface PatientSummaryProps {
  response: ResponseCategory;
  percentChange: number;
  trend: TrendDirection;
}

export function PatientFriendlySummary({
  response,
  percentChange,
  trend,
}: PatientSummaryProps) {
  // Plain language descriptions
  const getMessage = () => {
    switch (response) {
      case 'CR':
        return {
          headline: "Great news!",
          description: "The visible tumors have disappeared on your scans.",
          encouragement: "Your treatment is working very well.",
        };
      case 'PR':
        return {
          headline: "Good progress!",
          description: `Your tumors have shrunk by ${Math.abs(percentChange).toFixed(0)}% since starting treatment.`,
          encouragement: "Your treatment is working.",
        };
      case 'SD':
        return {
          headline: "Staying stable",
          description: "Your tumors have not grown significantly.",
          encouragement: trend === 'improving' 
            ? "There are signs of improvement." 
            : "We continue to monitor closely.",
        };
      case 'PD':
        return {
          headline: "Changes detected",
          description: `Your tumors have grown by ${percentChange.toFixed(0)}% since their smallest size.`,
          encouragement: "Your care team will discuss next steps with you.",
        };
      case 'NE':
        return {
          headline: "Scan review needed",
          description: "We need additional information to assess your response.",
          encouragement: "Your care team will follow up with you.",
        };
    }
  };

  const message = getMessage();
  const config = RESPONSE_CONFIG[response];

  return (
    <div className={`rounded-xl border-2 ${config.borderColor} bg-slate-800/80 p-6`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-full ${config.color} flex-shrink-0`}>
          {response === 'CR' || response === 'PR' ? (
            <TrendingDown className="w-8 h-8 text-white" />
          ) : response === 'PD' ? (
            <TrendingUp className="w-8 h-8 text-white" />
          ) : (
            <Minus className="w-8 h-8 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`text-2xl font-bold ${config.textColor} mb-2`}>
            {message.headline}
          </h3>
          <p className="text-lg text-white mb-2">
            {message.description}
          </p>
          <p className="text-slate-400">
            {message.encouragement}
          </p>
        </div>
      </div>

      {/* Visual indicator bar */}
      <div className="mt-6 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${config.color} transition-all duration-500`}
          style={{ 
            width: `${Math.min(100, Math.max(0, 50 - percentChange / 2))}%` 
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>Smaller</span>
        <span>Baseline</span>
        <span>Larger</span>
      </div>
    </div>
  );
}

// ============================================================================
// Mini Badge (for timeline entries)
// ============================================================================

interface MiniBadgeProps {
  response: ResponseCategory;
}

export function ResponseMiniBadge({ response }: MiniBadgeProps) {
  const config = RESPONSE_CONFIG[response];
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center
        w-6 h-6 rounded-full text-xs font-bold
        ${config.color} text-white
      `}
    >
      {config.shortLabel}
    </span>
  );
}
