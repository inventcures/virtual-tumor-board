"use client";

/**
 * LongitudinalViewer Component
 * 
 * Main container for the V15 Longitudinal DICOM Viewer.
 * Provides tumor progression tracking across multiple imaging timepoints.
 * 
 * Architecture adapted from MiraViewer, HCI principles from Saloni's Guide.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Grid3X3, 
  Layers, 
  Eye,
  EyeOff,
  Play,
  Pause,
  Settings,
  Info,
  User,
  ArrowLeft,
} from "lucide-react";
import { useLongitudinalData } from "@/hooks/useLongitudinalData";
import { useSliceSync, useSlicePlayback } from "@/hooks/useSliceSync";
import { 
  PanelSettings, 
  ViewMode, 
  ViewPlane,
  ProgressionSummary,
} from "@/types/longitudinal-imaging";
import { ResponseBadge, ResponseCard, PatientFriendlySummary } from "./ResponseBadge";
import { TimelineSidebar } from "./TimelineSidebar";
import { ComparisonGrid } from "./ComparisonGrid";
import { ProgressionChart } from "./ProgressionChart";

interface LongitudinalViewerProps {
  patientId?: string;
  onBack?: () => void;
  showPatientSummary?: boolean;
}

export function LongitudinalViewer({
  patientId,
  onBack,
  showPatientSummary = false,
}: LongitudinalViewerProps) {
  // Core data hook
  const {
    study,
    timepoints,
    lesions,
    assessments,
    progressionSummary,
    loadDemoData,
    isLoading,
  } = useLongitudinalData();

  // View state
  const [selectedTimepointIds, setSelectedTimepointIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlane, setSelectedPlane] = useState<ViewPlane>('axial');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [isPatientView, setIsPatientView] = useState(showPatientSummary);
  const [highlightedLesionId, setHighlightedLesionId] = useState<string>();

  // Panel settings per timepoint
  const [panelSettings, setPanelSettings] = useState<Map<string, PanelSettings>>(new Map());

  // Selected timepoints for display
  const selectedTimepoints = useMemo(() => 
    timepoints.filter(tp => selectedTimepointIds.includes(tp.id)),
    [timepoints, selectedTimepointIds]
  );

  // Slice synchronization
  const {
    sliceProgress,
    setSliceProgress,
    handleKeyDown,
  } = useSliceSync({
    timepoints: selectedTimepoints,
  });

  // Playback for animation
  const {
    isPlaying,
    toggle: togglePlayback,
  } = useSlicePlayback({
    totalSlices: selectedTimepoints[0]?.totalSlices || 100,
    speed: 100,
    loop: true,
    onSliceChange: (slice) => {
      const total = selectedTimepoints[0]?.totalSlices || 100;
      setSliceProgress(slice / (total - 1));
    },
  });

  // Load demo data on mount if no study
  useEffect(() => {
    if (!study) {
      loadDemoData();
    }
  }, [study, loadDemoData]);

  // Auto-select first few timepoints
  useEffect(() => {
    if (timepoints.length > 0 && selectedTimepointIds.length === 0) {
      // Select up to 4 timepoints by default
      const initialSelection = timepoints.slice(0, Math.min(4, timepoints.length)).map(tp => tp.id);
      setSelectedTimepointIds(initialSelection);
    }
  }, [timepoints, selectedTimepointIds.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === 'g') {
        setViewMode(prev => prev === 'grid' ? 'overlay' : 'grid');
      } else if (e.key === 'p') {
        togglePlayback();
      } else if (e.key === 'm') {
        setShowMeasurements(prev => !prev);
      } else {
        handleKeyDown(e);
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyDown, togglePlayback]);

  // Handle panel settings change
  const handlePanelSettingsChange = useCallback((timepointId: string, settings: Partial<PanelSettings>) => {
    setPanelSettings(prev => {
      const newSettings = new Map(prev);
      const existing = newSettings.get(timepointId) || {
        timepointId,
        zoom: 1,
        panX: 0,
        panY: 0,
        windowCenter: 40,
        windowWidth: 400,
        invert: false,
      };
      newSettings.set(timepointId, { ...existing, ...settings });
      return newSettings;
    });
  }, []);

  // Handle timepoint click in chart
  const handleTimepointClick = useCallback((timepointId: string) => {
    if (!selectedTimepointIds.includes(timepointId)) {
      setSelectedTimepointIds(prev => [...prev.slice(-3), timepointId]);
    }
  }, [selectedTimepointIds]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 rounded-xl">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading longitudinal study...</span>
        </div>
      </div>
    );
  }

  // Patient-friendly view
  if (isPatientView && progressionSummary) {
    return (
      <div className="h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 hover:bg-slate-700 rounded transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">Your Scan Results</h2>
          </div>
          <button
            onClick={() => setIsPatientView(false)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Detailed View
          </button>
        </div>

        {/* Patient Summary */}
        <div className="flex-1 overflow-y-auto p-6">
          <PatientFriendlySummary
            response={progressionSummary.currentResponse}
            percentChange={progressionSummary.percentChangeFromBaseline}
            trend={progressionSummary.trend}
          />

          {/* Simple before/after */}
          {selectedTimepoints.length >= 2 && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-2">Before Treatment</div>
                <div className="bg-slate-800 rounded-lg p-4 aspect-square flex items-center justify-center text-slate-600">
                  Baseline Scan
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-2">Most Recent</div>
                <div className="bg-slate-800 rounded-lg p-4 aspect-square flex items-center justify-center text-slate-600">
                  Latest Scan
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main clinical view
  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-slate-700 rounded transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
          )}
          
          {/* Response Badge */}
          {progressionSummary && (
            <ResponseBadge
              response={progressionSummary.currentResponse}
              percentChange={progressionSummary.percentChangeFromBaseline}
              trend={progressionSummary.trend}
              size="md"
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-600' : 'hover:bg-slate-600/50'}`}
              title="Grid View (G)"
            >
              <Grid3X3 className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'overlay' ? 'bg-slate-600' : 'hover:bg-slate-600/50'}`}
              title="Overlay View (G)"
            >
              <Layers className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* Playback */}
          <button
            onClick={togglePlayback}
            className={`p-1.5 rounded transition-colors ${isPlaying ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            title="Play/Pause (P)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Measurements Toggle */}
          <button
            onClick={() => setShowMeasurements(prev => !prev)}
            className={`p-1.5 rounded transition-colors ${showMeasurements ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            title="Toggle Measurements (M)"
          >
            {showMeasurements ? (
              <Eye className="w-4 h-4 text-slate-300" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Patient View */}
          <button
            onClick={() => setIsPatientView(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Patient View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Timeline Sidebar */}
        <div className="w-48 flex-shrink-0">
          <TimelineSidebar
            timepoints={timepoints}
            assessments={assessments}
            selectedIds={selectedTimepointIds}
            onSelect={(id) => setSelectedTimepointIds([id])}
            onSelectMultiple={setSelectedTimepointIds}
            maxSelections={4}
          />
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ComparisonGrid
              timepoints={selectedTimepoints}
              assessments={assessments}
              lesions={lesions}
              selectedPlane={selectedPlane}
              sliceProgress={sliceProgress}
              onSliceChange={setSliceProgress}
              panelSettings={panelSettings}
              onPanelSettingsChange={handlePanelSettingsChange}
              showMeasurements={showMeasurements}
              highlightedLesionId={highlightedLesionId}
              onLesionClick={setHighlightedLesionId}
            />
          </div>

          {/* Progression Chart */}
          {showChart && assessments.length > 0 && (
            <div className="flex-shrink-0 border-t border-slate-700">
              <ProgressionChart
                assessments={assessments}
                lesions={lesions}
                onTimepointClick={handleTimepointClick}
                height={150}
              />
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="px-4 py-1.5 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500 flex items-center gap-4">
        <Info className="w-3.5 h-3.5" />
        <span>Scroll: navigate slices</span>
        <span>G: toggle grid/overlay</span>
        <span>P: play/pause</span>
        <span>M: toggle measurements</span>
        <span>Arrow keys: slice navigation</span>
      </div>
    </div>
  );
}

// ============================================================================
// Wrapper for Demo/Standalone Usage
// ============================================================================

export function LongitudinalViewerDemo() {
  return (
    <div className="h-screen bg-slate-950 p-4">
      <LongitudinalViewer />
    </div>
  );
}
