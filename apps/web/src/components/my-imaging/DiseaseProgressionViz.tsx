"use client";

/**
 * DiseaseProgressionViz - Progressive Disclosure Visualization System
 * 
 * Implements Human-Computer Interaction (HCI) principles to reduce cognitive load:
 * - Progressive disclosure: Show complexity only when needed
 * - Match colors to concepts (Saloni's principle)
 * - Direct labeling (no hunting for legends)
 * - Guide viewers through complex data
 * - Show multiple perspectives of same data
 * 
 * 4 Expertise Levels:
 * 1. Patient/Caregiver - "Traffic light" simplicity, plain language
 * 2. Non-Oncologist Clinician - Clinical context, actionable summary
 * 3. Oncologist - RECIST details, treatment response data
 * 4. Radiology/Expert - Full technical measurements, comparison tools
 */

import { useState, useMemo } from "react";
import {
  ImagingStudy,
  TargetLesion,
  RECISTAssessment,
  LesionMeasurement
} from "@/types/imaging";
import { formatRECISTResponse } from "@/lib/medgemma/recist-calculator";

// ============================================================================
// TYPES
// ============================================================================

export type ExpertiseLevel = 'patient' | 'clinician' | 'oncologist' | 'radiologist';

interface DiseaseProgressionVizProps {
  studies: ImagingStudy[];
  targetLesions: TargetLesion[];
  assessments: RECISTAssessment[];
  defaultLevel?: ExpertiseLevel;
  onStudySelect?: (studyId: string) => void;
  cancerType?: string;
  patientName?: string;
}

interface TimelinePoint {
  date: Date;
  studyId: string;
  sum: number;
  response?: RECISTAssessment['response'];
  percentChange: number;
  isBaseline: boolean;
  isNadir: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DiseaseProgressionViz({
  studies,
  targetLesions,
  assessments,
  defaultLevel = 'patient',
  onStudySelect,
  cancerType,
  patientName
}: DiseaseProgressionVizProps) {
  const [expertiseLevel, setExpertiseLevel] = useState<ExpertiseLevel>(defaultLevel);
  const [showExplanation, setShowExplanation] = useState(true);

  // Calculate timeline data
  const timelineData = useMemo(() => calculateTimelineData(studies, targetLesions, assessments), 
    [studies, targetLesions, assessments]);

  const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;

  if (studies.length === 0 && targetLesions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Level Selector */}
      <ExpertiseLevelSelector 
        level={expertiseLevel} 
        onChange={setExpertiseLevel} 
      />

      {/* Main Visualization - Changes based on expertise level */}
      {expertiseLevel === 'patient' && (
        <PatientView 
          assessment={latestAssessment}
          timelineData={timelineData}
          showExplanation={showExplanation}
          onToggleExplanation={() => setShowExplanation(!showExplanation)}
          cancerType={cancerType}
        />
      )}

      {expertiseLevel === 'clinician' && (
        <ClinicianView
          assessment={latestAssessment}
          timelineData={timelineData}
          studies={studies}
          cancerType={cancerType}
        />
      )}

      {expertiseLevel === 'oncologist' && (
        <OncologistView
          assessment={latestAssessment}
          timelineData={timelineData}
          targetLesions={targetLesions}
          studies={studies}
        />
      )}

      {expertiseLevel === 'radiologist' && (
        <RadiologistView
          assessment={latestAssessment}
          assessments={assessments}
          timelineData={timelineData}
          targetLesions={targetLesions}
          studies={studies}
          onStudySelect={onStudySelect}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPERTISE LEVEL SELECTOR
// ============================================================================

function ExpertiseLevelSelector({ 
  level, 
  onChange 
}: { 
  level: ExpertiseLevel; 
  onChange: (level: ExpertiseLevel) => void;
}) {
  const levels: { id: ExpertiseLevel; label: string; description: string }[] = [
    { id: 'patient', label: 'Simple', description: 'Patient/Caregiver view' },
    { id: 'clinician', label: 'Clinical', description: 'Non-oncology clinician' },
    { id: 'oncologist', label: 'Detailed', description: 'Oncologist view' },
    { id: 'radiologist', label: 'Technical', description: 'Full technical detail' },
  ];

  return (
    <div className="p-3 bg-slate-900/50 border-b border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Detail Level</span>
        <div className="flex gap-1">
          {levels.map((l) => (
            <button
              key={l.id}
              onClick={() => onChange(l.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                level === l.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
              title={l.description}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PATIENT VIEW - "Traffic Light" Simplicity
// ============================================================================

function PatientView({
  assessment,
  timelineData,
  showExplanation,
  onToggleExplanation,
  cancerType
}: {
  assessment: RECISTAssessment | null;
  timelineData: TimelinePoint[];
  showExplanation: boolean;
  onToggleExplanation: () => void;
  cancerType?: string;
}) {
  if (!assessment) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-white mb-2">Waiting for Scan Results</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Once your doctor reviews your scans, you'll see a simple summary of how your treatment is working.
        </p>
      </div>
    );
  }

  // Traffic light metaphor
  const getTrafficLight = (response: RECISTAssessment['response']) => {
    switch (response) {
      case 'CR':
        return {
          color: 'emerald',
          emoji: '🌟',
          title: 'Excellent Response',
          subtitle: 'No visible cancer',
          message: 'The scans show no visible signs of cancer. This is the best possible response to treatment.',
          bgClass: 'bg-emerald-500/20 border-emerald-500/50',
          textClass: 'text-emerald-400'
        };
      case 'PR':
        return {
          color: 'blue',
          emoji: '👍',
          title: 'Good Response',
          subtitle: 'Cancer is shrinking',
          message: 'Your treatment is working! The cancer has gotten smaller. Your doctor will want to continue monitoring.',
          bgClass: 'bg-blue-500/20 border-blue-500/50',
          textClass: 'text-blue-400'
        };
      case 'SD':
        return {
          color: 'yellow',
          emoji: '➡️',
          title: 'Stable',
          subtitle: 'No significant change',
          message: 'The cancer hasn\'t grown or shrunk significantly. Stable disease can be a positive sign that treatment is keeping things under control.',
          bgClass: 'bg-yellow-500/20 border-yellow-500/50',
          textClass: 'text-yellow-400'
        };
      case 'PD':
        return {
          color: 'red',
          emoji: '⚠️',
          title: 'Needs Attention',
          subtitle: 'Cancer may be growing',
          message: 'The scans show the cancer may be growing. Your doctor will discuss next steps and treatment options with you.',
          bgClass: 'bg-red-500/20 border-red-500/50',
          textClass: 'text-red-400'
        };
      default:
        return {
          color: 'gray',
          emoji: '❓',
          title: 'Under Review',
          subtitle: 'Results being analyzed',
          message: 'Your scan results are still being analyzed. Your doctor will discuss the findings with you soon.',
          bgClass: 'bg-slate-500/20 border-slate-500/50',
          textClass: 'text-slate-400'
        };
    }
  };

  const light = getTrafficLight(assessment.overallResponse);

  return (
    <div className="p-6">
      {/* Main Traffic Light Display */}
      <div className={`rounded-xl border-2 p-6 mb-6 ${light.bgClass}`}>
        <div className="flex items-start gap-4">
          <div className="text-5xl">{light.emoji}</div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${light.textClass}`}>{light.title}</h2>
            <p className="text-lg text-slate-300 mt-1">{light.subtitle}</p>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{light.message}</p>
          </div>
        </div>
      </div>

      {/* Simple Visual Timeline - Horizontal Journey */}
      {timelineData.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Your Treatment Journey</h3>
          <SimpleJourneyTimeline data={timelineData} />
        </div>
      )}

      {/* Plain Language Explanation Toggle */}
      <button
        onClick={onToggleExplanation}
        className="w-full text-left p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            {showExplanation ? 'Hide' : 'Show'} explanation of what this means
          </span>
          <svg 
            className={`w-5 h-5 text-slate-400 transition-transform ${showExplanation ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {showExplanation && (
          <div className="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-400 space-y-3">
            <p>
              <strong className="text-slate-300">How we measure response:</strong> Your doctor measures specific spots (called "lesions") on your scans. By comparing measurements over time, we can see if they're shrinking, stable, or growing.
            </p>
            {assessment.percentChangeFromBaseline !== 0 && (
              <p>
                <strong className="text-slate-300">Your change:</strong> Compared to your first scan, the total size of measured spots has changed by{' '}
                <span className={assessment.percentChangeFromBaseline < 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {Math.abs(assessment.percentChangeFromBaseline).toFixed(0)}%
                </span>
                {assessment.percentChangeFromBaseline < 0 ? ' (smaller)' : ' (larger)'}.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Always discuss these results with your doctor. They can explain what this means for your specific situation.
            </p>
          </div>
        )}
      </button>
    </div>
  );
}

// Simple horizontal journey timeline for patients
function SimpleJourneyTimeline({ data }: { data: TimelinePoint[] }) {
  const baseline = data[0];
  const latest = data[data.length - 1];
  
  // Normalize to show relative size change
  const maxSum = Math.max(...data.map(d => d.sum));
  
  return (
    <div className="relative">
      {/* Journey path */}
      <div className="flex items-center justify-between px-4">
        {data.map((point, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === data.length - 1;
          const sizePercent = maxSum > 0 ? (point.sum / maxSum) * 100 : 50;
          
          // Color based on trend
          const getColor = () => {
            if (isFirst) return 'bg-slate-500';
            if (point.percentChange <= -30) return 'bg-emerald-500';
            if (point.percentChange < 0) return 'bg-blue-500';
            if (point.percentChange < 20) return 'bg-yellow-500';
            return 'bg-red-500';
          };

          return (
            <div key={idx} className="flex flex-col items-center relative">
              {/* Connecting line */}
              {!isFirst && (
                <div className="absolute right-1/2 top-6 w-full h-0.5 bg-slate-600 -z-10" 
                     style={{ transform: 'translateX(-50%)' }} />
              )}
              
              {/* Circle representing tumor burden */}
              <div 
                className={`rounded-full ${getColor()} transition-all flex items-center justify-center`}
                style={{ 
                  width: `${Math.max(24, sizePercent * 0.5)}px`,
                  height: `${Math.max(24, sizePercent * 0.5)}px`
                }}
              >
                {isFirst && <span className="text-white text-xs font-bold">1</span>}
                {isLast && !isFirst && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              
              {/* Date label */}
              <span className="text-xs text-slate-400 mt-2">
                {new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
              
              {/* Label for first/last */}
              {isFirst && <span className="text-xs text-slate-500 mt-1">Start</span>}
              {isLast && !isFirst && <span className="text-xs text-slate-500 mt-1">Now</span>}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
        <span>Circle size = tumor measurements</span>
        <span>|</span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Shrinking
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" /> Stable
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" /> Growing
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// CLINICIAN VIEW - Clinical Context + Actionable Summary
// ============================================================================

function ClinicianView({
  assessment,
  timelineData,
  studies,
  cancerType
}: {
  assessment: RECISTAssessment | null;
  timelineData: TimelinePoint[];
  studies: ImagingStudy[];
  cancerType?: string;
}) {
  if (!assessment) {
    return (
      <div className="p-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400">Awaiting RECIST assessment. Baseline imaging required.</p>
        </div>
      </div>
    );
  }

  const responseInfo = formatRECISTResponse(assessment.overallResponse);

  // Clinical action suggestions based on response
  const getClinicalActions = (response: RECISTAssessment['response']) => {
    switch (response) {
      case 'CR':
        return [
          'Continue current treatment regimen per protocol',
          'Schedule surveillance imaging per guidelines',
          'Consider maintenance therapy discussion'
        ];
      case 'PR':
        return [
          'Continue current treatment',
          'Monitor for continued response',
          'Assess for treatment tolerability'
        ];
      case 'SD':
        return [
          'Continue current treatment if tolerable',
          'Consider tumor board discussion for optimization',
          'Evaluate clinical benefit vs side effects'
        ];
      case 'PD':
        return [
          'Urgent oncology consultation recommended',
          'Consider alternative treatment options',
          'Evaluate for clinical trial eligibility'
        ];
      default:
        return ['Await complete assessment'];
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Response Summary Card */}
      <div className={`rounded-lg border-l-4 p-4 ${
        assessment.overallResponse === 'CR' ? 'bg-emerald-500/10 border-emerald-500' :
        assessment.overallResponse === 'PR' ? 'bg-blue-500/10 border-blue-500' :
        assessment.overallResponse === 'SD' ? 'bg-yellow-500/10 border-yellow-500' :
        assessment.overallResponse === 'PD' ? 'bg-red-500/10 border-red-500' :
        'bg-slate-500/10 border-slate-500'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${
              assessment.overallResponse === 'CR' ? 'text-emerald-400' :
              assessment.overallResponse === 'PR' ? 'text-blue-400' :
              assessment.overallResponse === 'SD' ? 'text-yellow-400' :
              assessment.overallResponse === 'PD' ? 'text-red-400' :
              'text-slate-400'
            }`}>
              {responseInfo.label} ({assessment.overallResponse})
            </h3>
            <p className="text-sm text-slate-400 mt-1">{responseInfo.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {assessment.percentChangeFromBaseline > 0 ? '+' : ''}
              {assessment.percentChangeFromBaseline.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400">from baseline</p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Easy to scan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          label="Baseline Sum" 
          value={`${assessment.baselineSum.toFixed(0)}mm`}
          date={new Date(assessment.baselineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <MetricCard 
          label="Current Sum" 
          value={`${assessment.currentSum.toFixed(0)}mm`}
          date={new Date(assessment.currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          highlight={assessment.percentChangeFromBaseline < 0 ? 'positive' : assessment.percentChangeFromBaseline > 20 ? 'negative' : 'neutral'}
        />
        <MetricCard 
          label="Nadir Sum" 
          value={`${assessment.nadirSum.toFixed(0)}mm`}
          subtext="Lowest point"
        />
        <MetricCard 
          label="From Nadir" 
          value={`${assessment.percentChangeFromNadir > 0 ? '+' : ''}${assessment.percentChangeFromNadir.toFixed(0)}%`}
          highlight={assessment.percentChangeFromNadir >= 20 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Waterfall-style Change Visualization */}
      <WaterfallChart data={timelineData} />

      {/* Clinical Actions */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Suggested Clinical Actions</h4>
        <ul className="space-y-2">
          {getClinicalActions(assessment.overallResponse).map((action, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-indigo-400 mt-0.5">•</span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-2">
        {assessment.newLesions && (
          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/50">
            New Lesions Detected
          </span>
        )}
        {assessment.nonTargetProgression && (
          <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded border border-orange-500/50">
            Non-Target Progression
          </span>
        )}
        {studies.length > 0 && (
          <span className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded border border-slate-500/50">
            {studies.length} Imaging Studies
          </span>
        )}
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  date, 
  subtext,
  highlight = 'neutral'
}: { 
  label: string; 
  value: string; 
  date?: string;
  subtext?: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className={`p-3 rounded-lg border ${
      highlight === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30' :
      highlight === 'negative' ? 'bg-red-500/10 border-red-500/30' :
      'bg-slate-900/50 border-slate-700'
    }`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${
        highlight === 'positive' ? 'text-emerald-400' :
        highlight === 'negative' ? 'text-red-400' :
        'text-white'
      }`}>{value}</p>
      {date && <p className="text-xs text-slate-500">{date}</p>}
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}

// Waterfall chart showing changes from baseline
function WaterfallChart({ data }: { data: TimelinePoint[] }) {
  if (data.length < 2) return null;

  // Skip baseline for waterfall
  const changeData = data.slice(1);
  const maxAbsChange = Math.max(...changeData.map(d => Math.abs(d.percentChange)), 30);

  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <h4 className="text-sm font-medium text-slate-300 mb-4">Response Over Time (% Change from Baseline)</h4>
      
      {/* RECIST threshold lines */}
      <div className="relative h-40 mb-2">
        {/* Grid lines with labels */}
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-500">
          <div className="flex items-center">
            <span className="w-8 text-right pr-2">+{maxAbsChange.toFixed(0)}%</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>
          <div className="flex items-center">
            <span className="w-8 text-right pr-2 text-red-400">+20%</span>
            <div className="flex-1 border-t border-red-500/30 border-dashed" />
            <span className="text-red-400 text-xs ml-2">PD threshold</span>
          </div>
          <div className="flex items-center">
            <span className="w-8 text-right pr-2">0%</span>
            <div className="flex-1 border-t border-slate-600" />
          </div>
          <div className="flex items-center">
            <span className="w-8 text-right pr-2 text-blue-400">-30%</span>
            <div className="flex-1 border-t border-blue-500/30 border-dashed" />
            <span className="text-blue-400 text-xs ml-2">PR threshold</span>
          </div>
          <div className="flex items-center">
            <span className="w-8 text-right pr-2">-{maxAbsChange.toFixed(0)}%</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>
        </div>

        {/* Bars */}
        <div className="absolute left-10 right-0 top-0 bottom-0 flex items-center justify-around">
          {changeData.map((point, idx) => {
            const heightPercent = (Math.abs(point.percentChange) / maxAbsChange) * 50;
            const isPositive = point.percentChange > 0;
            
            return (
              <div key={idx} className="flex flex-col items-center h-full justify-center relative group">
                {/* Bar */}
                <div 
                  className={`w-12 rounded transition-all ${
                    isPositive ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    marginTop: isPositive ? '0' : 'auto',
                    marginBottom: isPositive ? 'auto' : '0',
                    position: 'absolute',
                    top: isPositive ? '50%' : undefined,
                    bottom: isPositive ? undefined : '50%'
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap z-10">
                  {point.percentChange > 0 ? '+' : ''}{point.percentChange.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-around ml-10 text-xs text-slate-400">
        {changeData.map((point, idx) => (
          <span key={idx}>
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ONCOLOGIST VIEW - RECIST Details + Treatment Response
// ============================================================================

function OncologistView({
  assessment,
  timelineData,
  targetLesions,
  studies
}: {
  assessment: RECISTAssessment | null;
  timelineData: TimelinePoint[];
  targetLesions: TargetLesion[];
  studies: ImagingStudy[];
}) {
  const [expandedLesion, setExpandedLesion] = useState<string | null>(null);

  if (!assessment) {
    return (
      <div className="p-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400">Insufficient data for RECIST 1.1 assessment. Requires baseline + follow-up imaging with measurable disease.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* RECIST Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">RECIST 1.1 Assessment</h3>
          <p className="text-sm text-slate-400">{targetLesions.length} target lesions tracked</p>
        </div>
        <RECISTBadge response={assessment.overallResponse} size="large" />
      </div>

      {/* Response Reasoning */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Assessment Reasoning</h4>
        <p className="text-sm text-slate-400">{assessment.reasoning}</p>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Sum of Target Lesions</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{assessment.currentSum.toFixed(1)}</span>
            <span className="text-slate-400">mm</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Baseline: {assessment.baselineSum.toFixed(1)}mm | Nadir: {assessment.nadirSum.toFixed(1)}mm
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Change from Baseline</p>
          <div className={`text-2xl font-bold ${
            assessment.percentChangeFromBaseline <= -30 ? 'text-blue-400' :
            assessment.percentChangeFromBaseline >= 20 ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {assessment.percentChangeFromBaseline > 0 ? '+' : ''}
            {assessment.percentChangeFromBaseline.toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            PR threshold: -30% | PD threshold: +20%
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Change from Nadir</p>
          <div className={`text-2xl font-bold ${
            assessment.percentChangeFromNadir >= 20 ? 'text-red-400' : 'text-white'
          }`}>
            {assessment.percentChangeFromNadir > 0 ? '+' : ''}
            {assessment.percentChangeFromNadir.toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            PD requires ≥20% AND ≥5mm absolute increase
          </p>
        </div>
      </div>

      {/* Spider Plot - Individual Lesion Tracking */}
      <SpiderPlot targetLesions={targetLesions} />

      {/* Individual Target Lesion Table */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white">Target Lesion Measurements</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-3 text-slate-400 font-medium">Lesion</th>
                <th className="text-left p-3 text-slate-400 font-medium">Location</th>
                <th className="text-right p-3 text-slate-400 font-medium">Baseline</th>
                <th className="text-right p-3 text-slate-400 font-medium">Current</th>
                <th className="text-right p-3 text-slate-400 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {targetLesions.map((lesion, idx) => {
                const baseline = lesion.measurements[0];
                const current = lesion.measurements[lesion.measurements.length - 1];
                const baselineSize = lesion.isLymphNode ? (baseline.shortAxis || baseline.longAxis) : baseline.longAxis;
                const currentSize = lesion.isLymphNode ? (current.shortAxis || current.longAxis) : current.longAxis;
                const change = baselineSize > 0 ? ((currentSize - baselineSize) / baselineSize) * 100 : 0;

                return (
                  <tr 
                    key={lesion.id} 
                    className="border-t border-slate-700/50 hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setExpandedLesion(expandedLesion === lesion.id ? null : lesion.id)}
                  >
                    <td className="p-3 text-white">
                      {idx + 1}
                      {lesion.isLymphNode && <span className="ml-1 text-xs text-orange-400">(LN)</span>}
                    </td>
                    <td className="p-3 text-slate-300">{lesion.location}</td>
                    <td className="p-3 text-right text-slate-300">{baselineSize.toFixed(1)}mm</td>
                    <td className="p-3 text-right text-white font-medium">{currentSize.toFixed(1)}mm</td>
                    <td className={`p-3 text-right font-medium ${
                      change <= -30 ? 'text-emerald-400' :
                      change >= 20 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Flags */}
      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-2 ${assessment.newLesions ? 'text-red-400' : 'text-slate-400'}`}>
          <div className={`w-3 h-3 rounded-full ${assessment.newLesions ? 'bg-red-500' : 'bg-slate-600'}`} />
          New Lesions: {assessment.newLesions ? 'Yes' : 'No'}
        </div>
        <div className={`flex items-center gap-2 ${assessment.nonTargetProgression ? 'text-red-400' : 'text-slate-400'}`}>
          <div className={`w-3 h-3 rounded-full ${assessment.nonTargetProgression ? 'bg-red-500' : 'bg-slate-600'}`} />
          Non-Target Progression: {assessment.nonTargetProgression ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
}

// Spider plot showing individual lesion trajectories
function SpiderPlot({ targetLesions }: { targetLesions: TargetLesion[] }) {
  if (targetLesions.length === 0 || targetLesions[0].measurements.length < 2) return null;

  // Calculate percent change from baseline for each lesion at each timepoint
  const lesionLines = targetLesions.map((lesion, lesionIdx) => {
    const baseline = lesion.isLymphNode 
      ? (lesion.measurements[0].shortAxis || lesion.measurements[0].longAxis)
      : lesion.measurements[0].longAxis;

    return lesion.measurements.map((m, idx) => {
      const size = lesion.isLymphNode ? (m.shortAxis || m.longAxis) : m.longAxis;
      return {
        timepoint: idx,
        percentChange: baseline > 0 ? ((size - baseline) / baseline) * 100 : 0,
        date: m.date
      };
    });
  });

  const maxTimepoints = Math.max(...lesionLines.map(l => l.length));
  const maxChange = Math.max(...lesionLines.flat().map(p => Math.abs(p.percentChange)), 50);

  // Colors for different lesions
  const colors = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171'];

  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <h4 className="text-sm font-medium text-slate-300 mb-4">Individual Lesion Response (Spider Plot)</h4>
      
      <div className="relative h-48">
        {/* Y-axis grid */}
        <div className="absolute inset-0">
          {[-50, -30, 0, 20, 50].map(val => {
            const top = ((maxChange - val) / (maxChange * 2)) * 100;
            return (
              <div 
                key={val} 
                className="absolute left-8 right-0 flex items-center"
                style={{ top: `${top}%` }}
              >
                <span className="w-8 text-right pr-2 text-xs text-slate-500">{val}%</span>
                <div className={`flex-1 border-t ${
                  val === 0 ? 'border-slate-500' :
                  val === -30 ? 'border-blue-500/30 border-dashed' :
                  val === 20 ? 'border-red-500/30 border-dashed' :
                  'border-slate-700'
                }`} />
              </div>
            );
          })}
        </div>

        {/* Plot area with SVG lines */}
        <svg className="absolute left-10 top-0 right-0 bottom-0" preserveAspectRatio="none">
          {lesionLines.map((line, lesionIdx) => {
            const points = line.map((point, idx) => {
              const x = (idx / (maxTimepoints - 1)) * 100;
              const y = ((maxChange - point.percentChange) / (maxChange * 2)) * 100;
              return `${x}%,${y}%`;
            }).join(' ');

            return (
              <polyline
                key={lesionIdx}
                points={points}
                fill="none"
                stroke={colors[lesionIdx % colors.length]}
                strokeWidth="2"
                className="drop-shadow-sm"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {targetLesions.map((lesion, idx) => (
          <div key={lesion.id} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-slate-400">{lesion.location}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// RADIOLOGIST VIEW - Full Technical Detail
// ============================================================================

function RadiologistView({
  assessment,
  assessments,
  timelineData,
  targetLesions,
  studies,
  onStudySelect
}: {
  assessment: RECISTAssessment | null;
  assessments: RECISTAssessment[];
  timelineData: TimelinePoint[];
  targetLesions: TargetLesion[];
  studies: ImagingStudy[];
  onStudySelect?: (studyId: string) => void;
}) {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStudies, setCompareStudies] = useState<string[]>([]);

  return (
    <div className="p-6 space-y-6">
      {/* Technical Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Technical Imaging Analysis</h3>
          <p className="text-sm text-slate-400">
            {studies.length} studies | {targetLesions.length} target lesions | RECIST 1.1
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 text-xs rounded ${
              compareMode 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Studies'}
          </button>
          {assessment && <RECISTBadge response={assessment.overallResponse} size="medium" />}
        </div>
      </div>

      {/* All Assessments History */}
      {assessments.length > 1 && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Assessment History</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left p-2 text-slate-400">Date</th>
                  <th className="text-center p-2 text-slate-400">Response</th>
                  <th className="text-right p-2 text-slate-400">Sum (mm)</th>
                  <th className="text-right p-2 text-slate-400">Δ Baseline</th>
                  <th className="text-right p-2 text-slate-400">Δ Nadir</th>
                  <th className="text-center p-2 text-slate-400">New Les.</th>
                  <th className="text-center p-2 text-slate-400">NT Prog.</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, idx) => (
                  <tr key={a.id} className="border-t border-slate-700/50">
                    <td className="p-2 text-slate-300">
                      {new Date(a.currentDate).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-center">
                      <RECISTBadge response={a.overallResponse} size="small" />
                    </td>
                    <td className="p-2 text-right text-white">{a.currentSum.toFixed(1)}</td>
                    <td className={`p-2 text-right ${
                      a.percentChangeFromBaseline <= -30 ? 'text-blue-400' :
                      a.percentChangeFromBaseline >= 20 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {a.percentChangeFromBaseline > 0 ? '+' : ''}{a.percentChangeFromBaseline.toFixed(1)}%
                    </td>
                    <td className={`p-2 text-right ${
                      a.percentChangeFromNadir >= 20 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {a.percentChangeFromNadir > 0 ? '+' : ''}{a.percentChangeFromNadir.toFixed(1)}%
                    </td>
                    <td className="p-2 text-center">
                      {a.newLesions ? <span className="text-red-400">Yes</span> : <span className="text-slate-500">No</span>}
                    </td>
                    <td className="p-2 text-center">
                      {a.nonTargetProgression ? <span className="text-red-400">Yes</span> : <span className="text-slate-500">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Measurement Matrix */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-3 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white">Complete Measurement Matrix</h4>
        </div>
        <div className="overflow-x-auto">
          <MeasurementMatrix targetLesions={targetLesions} />
        </div>
      </div>

      {/* Study Timeline with Technical Details */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="p-3 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white">Study Details</h4>
        </div>
        <div className="divide-y divide-slate-700/50">
          {studies.map((study, idx) => (
            <div 
              key={study.id}
              className={`p-4 hover:bg-slate-800/30 cursor-pointer ${
                compareMode && compareStudies.includes(study.id) ? 'bg-indigo-900/20 border-l-2 border-indigo-500' : ''
              }`}
              onClick={() => {
                if (compareMode) {
                  if (compareStudies.includes(study.id)) {
                    setCompareStudies(compareStudies.filter(id => id !== study.id));
                  } else if (compareStudies.length < 2) {
                    setCompareStudies([...compareStudies, study.id]);
                  }
                } else {
                  onStudySelect?.(study.id);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {new Date(study.studyDate).toLocaleDateString()}
                    </span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded">
                        Baseline
                      </span>
                    )}
                    {study.timepoint === 'response-assessment' && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                        Response Assessment
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {study.modality} | {study.bodyPart} | {study.description}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{study.sliceCount} slices</p>
                  <p className="capitalize">{study.source}</p>
                </div>
              </div>

              {/* Technical metadata */}
              {study.studyInstanceUID && (
                <p className="text-xs text-slate-500 mt-2 font-mono truncate">
                  UID: {study.studyInstanceUID}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Compare button */}
      {compareMode && compareStudies.length === 2 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              // Trigger comparison view
              console.log('Comparing:', compareStudies);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
          >
            Compare Selected Studies
          </button>
        </div>
      )}
    </div>
  );
}

// Full measurement matrix table
function MeasurementMatrix({ targetLesions }: { targetLesions: TargetLesion[] }) {
  if (targetLesions.length === 0) return <p className="p-4 text-slate-400 text-sm">No target lesions</p>;

  // Get all unique dates
  const allDates = new Set<string>();
  targetLesions.forEach(lesion => {
    lesion.measurements.forEach(m => {
      allDates.add(new Date(m.date).toISOString().split('T')[0]);
    });
  });
  const sortedDates = Array.from(allDates).sort();

  return (
    <table className="w-full text-xs">
      <thead className="bg-slate-800/50">
        <tr>
          <th className="text-left p-2 text-slate-400 sticky left-0 bg-slate-800/50">#</th>
          <th className="text-left p-2 text-slate-400 sticky left-6 bg-slate-800/50 min-w-[120px]">Location</th>
          <th className="text-center p-2 text-slate-400">Type</th>
          {sortedDates.map((date, idx) => (
            <th key={date} className="text-right p-2 text-slate-400 min-w-[80px]">
              {idx === 0 ? 'Baseline' : `T${idx}`}
              <br />
              <span className="text-slate-500 font-normal">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {targetLesions.map((lesion, lesionIdx) => {
          const baseline = lesion.isLymphNode 
            ? (lesion.measurements[0].shortAxis || lesion.measurements[0].longAxis)
            : lesion.measurements[0].longAxis;

          return (
            <tr key={lesion.id} className="border-t border-slate-700/50">
              <td className="p-2 text-slate-300 sticky left-0 bg-slate-900/50">{lesionIdx + 1}</td>
              <td className="p-2 text-slate-300 sticky left-6 bg-slate-900/50">{lesion.location}</td>
              <td className="p-2 text-center">
                {lesion.isLymphNode 
                  ? <span className="text-orange-400">LN</span>
                  : <span className="text-slate-400">TL</span>
                }
              </td>
              {sortedDates.map((dateStr, dateIdx) => {
                const measurement = lesion.measurements.find(m => 
                  new Date(m.date).toISOString().split('T')[0] === dateStr
                );
                
                if (!measurement) {
                  return <td key={dateStr} className="p-2 text-right text-slate-500">-</td>;
                }

                const size = lesion.isLymphNode 
                  ? (measurement.shortAxis || measurement.longAxis)
                  : measurement.longAxis;
                const change = dateIdx === 0 ? 0 : ((size - baseline) / baseline) * 100;

                return (
                  <td key={dateStr} className="p-2 text-right">
                    <span className="text-white">{size.toFixed(1)}</span>
                    {dateIdx > 0 && (
                      <span className={`ml-1 text-xs ${
                        change <= -30 ? 'text-emerald-400' :
                        change >= 20 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        ({change > 0 ? '+' : ''}{change.toFixed(0)}%)
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
        {/* Sum row */}
        <tr className="border-t-2 border-slate-600 bg-slate-800/30">
          <td colSpan={3} className="p-2 text-white font-medium sticky left-0 bg-slate-800/30">
            Sum of Target Lesions
          </td>
          {sortedDates.map((dateStr, dateIdx) => {
            let sum = 0;
            targetLesions.forEach(lesion => {
              const measurement = lesion.measurements.find(m => 
                new Date(m.date).toISOString().split('T')[0] === dateStr
              );
              if (measurement) {
                sum += lesion.isLymphNode 
                  ? (measurement.shortAxis || measurement.longAxis)
                  : measurement.longAxis;
              }
            });

            const baselineSum = targetLesions.reduce((acc, lesion) => {
              const m = lesion.measurements[0];
              return acc + (lesion.isLymphNode ? (m.shortAxis || m.longAxis) : m.longAxis);
            }, 0);
            const change = dateIdx === 0 ? 0 : ((sum - baselineSum) / baselineSum) * 100;

            return (
              <td key={dateStr} className="p-2 text-right">
                <span className="text-white font-medium">{sum.toFixed(1)}</span>
                {dateIdx > 0 && (
                  <span className={`ml-1 text-xs ${
                    change <= -30 ? 'text-blue-400' :
                    change >= 20 ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    ({change > 0 ? '+' : ''}{change.toFixed(0)}%)
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function RECISTBadge({ 
  response, 
  size = 'medium' 
}: { 
  response: RECISTAssessment['response']; 
  size?: 'small' | 'medium' | 'large';
}) {
  const info = formatRECISTResponse(response);
  
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const colorClasses = {
    CR: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    PR: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    SD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    PD: 'bg-red-500/20 text-red-400 border-red-500/50',
    NE: 'bg-slate-500/20 text-slate-400 border-slate-500/50'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[response]}`}>
      {response}
      {size !== 'small' && <span className="opacity-75">• {info.label}</span>}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
      <div className="text-5xl mb-4">📊</div>
      <h3 className="text-lg font-medium text-white mb-2">No Progression Data Yet</h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        Upload scans from different time points to track disease progression and see how your treatment is working.
      </p>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateTimelineData(
  studies: ImagingStudy[],
  targetLesions: TargetLesion[],
  assessments: RECISTAssessment[]
): TimelinePoint[] {
  if (targetLesions.length === 0) return [];

  // Get all unique measurement dates
  const dateMap = new Map<string, { sum: number; studyId: string }>();
  
  for (const lesion of targetLesions) {
    for (const m of lesion.measurements) {
      const dateStr = new Date(m.date).toISOString().split('T')[0];
      const diameter = lesion.isLymphNode 
        ? (m.shortAxis || m.longAxis)
        : m.longAxis;
      
      const existing = dateMap.get(dateStr) || { sum: 0, studyId: m.studyId };
      dateMap.set(dateStr, { 
        sum: existing.sum + diameter, 
        studyId: existing.studyId || m.studyId 
      });
    }
  }

  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  if (sortedDates.length === 0) return [];

  const baselineSum = sortedDates[0][1].sum;
  let nadirSum = baselineSum;
  let nadirDate = sortedDates[0][0];

  // Find nadir
  for (const [dateStr, data] of sortedDates) {
    if (data.sum < nadirSum) {
      nadirSum = data.sum;
      nadirDate = dateStr;
    }
  }

  return sortedDates.map(([dateStr, data], idx) => {
    const assessment = assessments.find(a => 
      new Date(a.currentDate).toISOString().split('T')[0] === dateStr
    );

    return {
      date: new Date(dateStr),
      studyId: data.studyId,
      sum: data.sum,
      response: assessment?.overallResponse,
      percentChange: baselineSum > 0 ? ((data.sum - baselineSum) / baselineSum) * 100 : 0,
      isBaseline: idx === 0,
      isNadir: dateStr === nadirDate
    };
  });
}
