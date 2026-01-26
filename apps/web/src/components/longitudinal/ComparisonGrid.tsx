"use client";

/**
 * ComparisonGrid Component
 * 
 * Main viewing area for comparing multiple imaging timepoints side-by-side.
 * Supports synchronized slice navigation and lesion annotations.
 * 
 * Adapted from MiraViewer architecture.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Settings,
  Eye,
  EyeOff,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { 
  ImagingTimepoint, 
  RECISTAssessment,
  TrackedLesion,
  LesionMeasurement,
  PanelSettings,
  ViewPlane,
  RESPONSE_CONFIG,
} from "@/types/longitudinal-imaging";
import { ResponseMiniBadge } from "./ResponseBadge";

interface ComparisonGridProps {
  timepoints: ImagingTimepoint[];
  assessments: RECISTAssessment[];
  lesions: TrackedLesion[];
  selectedPlane: ViewPlane;
  sliceProgress: number;
  onSliceChange: (progress: number) => void;
  panelSettings: Map<string, PanelSettings>;
  onPanelSettingsChange: (timepointId: string, settings: Partial<PanelSettings>) => void;
  showMeasurements?: boolean;
  highlightedLesionId?: string;
  onLesionClick?: (lesionId: string) => void;
}

export function ComparisonGrid({
  timepoints,
  assessments,
  lesions,
  selectedPlane,
  sliceProgress,
  onSliceChange,
  panelSettings,
  onPanelSettingsChange,
  showMeasurements = true,
  highlightedLesionId,
  onLesionClick,
}: ComparisonGridProps) {
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  
  // Calculate grid columns based on number of timepoints
  const gridCols = useMemo(() => {
    const count = timepoints.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [timepoints.length]);

  // Get assessment for a timepoint
  const getAssessment = (timepointId: string) => 
    assessments.find(a => a.timepointId === timepointId);

  // Get measurements for a timepoint
  const getMeasurements = (timepointId: string) => {
    return lesions.flatMap(lesion => 
      lesion.measurements
        .filter(m => m.timepointId === timepointId)
        .map(m => ({ ...m, lesion }))
    );
  };

  // Handle scroll for slice navigation
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * 0.01;
    onSliceChange(Math.max(0, Math.min(1, sliceProgress + delta)));
  }, [sliceProgress, onSliceChange]);

  // If maximized, show only that panel
  if (maximizedPanel) {
    const tp = timepoints.find(t => t.id === maximizedPanel);
    if (tp) {
      return (
        <div className="h-full flex flex-col">
          <ComparisonPanel
            timepoint={tp}
            assessment={getAssessment(tp.id)}
            measurements={getMeasurements(tp.id)}
            sliceProgress={sliceProgress}
            settings={panelSettings.get(tp.id) || getDefaultSettings(tp.id)}
            onSettingsChange={(s) => onPanelSettingsChange(tp.id, s)}
            showMeasurements={showMeasurements}
            highlightedLesionId={highlightedLesionId}
            onLesionClick={onLesionClick}
            isMaximized
            onToggleMaximize={() => setMaximizedPanel(null)}
            onWheel={handleWheel}
          />
        </div>
      );
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Grid of panels */}
      <div className={`flex-1 grid ${gridCols} gap-2 p-2`} onWheel={handleWheel}>
        {timepoints.map(tp => (
          <ComparisonPanel
            key={tp.id}
            timepoint={tp}
            assessment={getAssessment(tp.id)}
            measurements={getMeasurements(tp.id)}
            sliceProgress={sliceProgress}
            settings={panelSettings.get(tp.id) || getDefaultSettings(tp.id)}
            onSettingsChange={(s) => onPanelSettingsChange(tp.id, s)}
            showMeasurements={showMeasurements}
            highlightedLesionId={highlightedLesionId}
            onLesionClick={onLesionClick}
            onToggleMaximize={() => setMaximizedPanel(tp.id)}
            onWheel={handleWheel}
          />
        ))}
      </div>

      {/* Slice Navigator */}
      <SliceNavigator
        progress={sliceProgress}
        onChange={onSliceChange}
        totalSlices={timepoints[0]?.totalSlices || 100}
      />
    </div>
  );
}

// ============================================================================
// Comparison Panel (Single Timepoint)
// ============================================================================

interface ComparisonPanelProps {
  timepoint: ImagingTimepoint;
  assessment?: RECISTAssessment;
  measurements: Array<LesionMeasurement & { lesion: TrackedLesion }>;
  sliceProgress: number;
  settings: PanelSettings;
  onSettingsChange: (settings: Partial<PanelSettings>) => void;
  showMeasurements: boolean;
  highlightedLesionId?: string;
  onLesionClick?: (lesionId: string) => void;
  isMaximized?: boolean;
  onToggleMaximize: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

function ComparisonPanel({
  timepoint,
  assessment,
  measurements,
  sliceProgress,
  settings,
  onSettingsChange,
  showMeasurements,
  highlightedLesionId,
  onLesionClick,
  isMaximized = false,
  onToggleMaximize,
  onWheel,
}: ComparisonPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(false);
  
  const response = assessment?.overallResponse;
  const percentChange = assessment?.targetLesions.percentChangeFromBaseline ?? 0;
  const sumDiameters = assessment?.targetLesions.sumOfDiameters ?? 0;

  // Calculate current slice
  const currentSlice = Math.round(sliceProgress * (timepoint.totalSlices - 1));

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate synthetic image data for demo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Generate synthetic CT-like image
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Create circular body shape
        const cx = width / 2;
        const cy = height / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const bodyRadius = Math.min(width, height) * 0.4;
        
        let value = 0;
        
        if (dist < bodyRadius) {
          // Inside body - soft tissue (slightly varying)
          value = 80 + Math.random() * 20 + Math.sin(x / 10 + y / 10) * 10;
          
          // Add some "organs" - darker regions
          const organDist = Math.sqrt((x - cx * 0.7) ** 2 + (y - cy * 0.8) ** 2);
          if (organDist < bodyRadius * 0.3) {
            value = 60 + Math.random() * 15;
          }
          
          // Add spine region
          if (Math.abs(x - cx) < 15 && y > cy) {
            value = 200 + Math.random() * 30; // Bone is bright
          }
          
          // Add synthetic "tumor" that changes size based on assessment
          const tumorCx = cx + 40;
          const tumorCy = cy - 20;
          // Tumor size decreases with negative percent change
          const tumorRadius = 25 * (1 + percentChange / 100);
          const tumorDist = Math.sqrt((x - tumorCx) ** 2 + (y - tumorCy) ** 2);
          if (tumorDist < tumorRadius && tumorRadius > 5) {
            value = 120 + Math.random() * 20;
          }
        } else {
          // Outside body - air (dark)
          value = 10 + Math.random() * 10;
        }
        
        // Apply window/level
        const windowedValue = applyWindowLevel(value, settings.windowCenter, settings.windowWidth);
        const finalValue = settings.invert ? 255 - windowedValue : windowedValue;
        
        data[idx] = finalValue;
        data[idx + 1] = finalValue;
        data[idx + 2] = finalValue;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw measurements if enabled
    if (showMeasurements) {
      measurements.forEach(m => {
        const isHighlighted = m.lesion.id === highlightedLesionId;
        drawLesionAnnotation(ctx, m, isHighlighted, width, height);
      });
    }
  }, [timepoint, sliceProgress, settings, measurements, showMeasurements, highlightedLesionId, percentChange]);

  return (
    <div 
      className={`
        relative flex flex-col bg-slate-900 rounded-lg overflow-hidden
        border border-slate-700 group
        ${isMaximized ? 'h-full' : ''}
      `}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {/* Response badge */}
          {response && <ResponseMiniBadge response={response} />}
          
          {/* Date/Label */}
          <div>
            <div className="text-sm font-medium text-white">
              {timepoint.isBaseline ? 'Baseline' : formatDate(timepoint.studyDate)}
            </div>
            {timepoint.treatmentContext && (
              <div className="text-xs text-slate-400">
                {timepoint.treatmentContext}
              </div>
            )}
          </div>
        </div>

        {/* Maximize button */}
        <button
          onClick={onToggleMaximize}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Image Canvas */}
      <div 
        className="relative flex-1 min-h-0"
        onWheel={onWheel}
      >
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="w-full h-full object-contain bg-black"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Slice indicator */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-mono">
          Slice {currentSlice + 1}/{timepoint.totalSlices}
        </div>

        {/* Hover controls */}
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button 
              onClick={() => onSettingsChange({ zoom: settings.zoom * 1.2 })}
              className="p-1.5 bg-black/60 rounded hover:bg-black/80 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5 text-white" />
            </button>
            <button 
              onClick={() => onSettingsChange({ zoom: settings.zoom / 1.2 })}
              className="p-1.5 bg-black/60 rounded hover:bg-black/80 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5 text-white" />
            </button>
            <button 
              onClick={() => onSettingsChange({ zoom: 1, panX: 0, panY: 0 })}
              className="p-1.5 bg-black/60 rounded hover:bg-black/80 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Footer with measurements */}
      <div className="px-3 py-2 bg-slate-800/80 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Sum: {sumDiameters.toFixed(0)}mm</span>
          {!timepoint.isBaseline && (
            <span 
              className={`font-mono font-semibold ${
                percentChange < 0 ? 'text-green-400' : 
                percentChange > 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Slice Navigator
// ============================================================================

interface SliceNavigatorProps {
  progress: number;
  onChange: (progress: number) => void;
  totalSlices: number;
}

function SliceNavigator({ progress, onChange, totalSlices }: SliceNavigatorProps) {
  const currentSlice = Math.round(progress * (totalSlices - 1));

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 border-t border-slate-700">
      {/* Previous button */}
      <button
        onClick={() => onChange(Math.max(0, progress - 1 / (totalSlices - 1)))}
        className="p-1 rounded hover:bg-slate-700 transition-colors"
        disabled={progress <= 0}
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* Slider */}
      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="1"
          step={1 / (totalSlices - 1)}
          value={progress}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500
                     [&::-webkit-slider-thumb]:cursor-pointer"
        />
        
        {/* Slice counter */}
        <span className="text-sm text-slate-400 font-mono w-20 text-right">
          {currentSlice + 1} / {totalSlices}
        </span>
      </div>

      {/* Next button */}
      <button
        onClick={() => onChange(Math.min(1, progress + 1 / (totalSlices - 1)))}
        className="p-1 rounded hover:bg-slate-700 transition-colors"
        disabled={progress >= 1}
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultSettings(timepointId: string): PanelSettings {
  return {
    timepointId,
    zoom: 1,
    panX: 0,
    panY: 0,
    windowCenter: 40,
    windowWidth: 400,
    invert: false,
  };
}

function applyWindowLevel(value: number, center: number, width: number): number {
  const low = center - width / 2;
  const high = center + width / 2;
  
  if (value <= low) return 0;
  if (value >= high) return 255;
  return Math.round(((value - low) / width) * 255);
}

function drawLesionAnnotation(
  ctx: CanvasRenderingContext2D,
  measurement: LesionMeasurement & { lesion: TrackedLesion },
  isHighlighted: boolean,
  width: number,
  height: number
) {
  const { lesion, longAxis, annotationCoords } = measurement;
  
  if (annotationCoords.length < 2) return;
  
  // Scale coordinates to canvas size
  const scale = Math.min(width, height) / 256;
  const [p1, p2] = annotationCoords;
  const x1 = p1.x * scale;
  const y1 = p1.y * scale;
  const x2 = p2.x * scale;
  const y2 = p2.y * scale;
  
  // Draw measurement line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = isHighlighted ? '#FBBF24' : lesion.color;
  ctx.lineWidth = isHighlighted ? 3 : 2;
  ctx.stroke();
  
  // Draw endpoints
  ctx.beginPath();
  ctx.arc(x1, y1, 3, 0, Math.PI * 2);
  ctx.arc(x2, y2, 3, 0, Math.PI * 2);
  ctx.fillStyle = isHighlighted ? '#FBBF24' : lesion.color;
  ctx.fill();
  
  // Draw label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 10;
  
  ctx.font = '10px sans-serif';
  ctx.fillStyle = isHighlighted ? '#FBBF24' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(`${lesion.name}: ${longAxis}mm`, midX, midY);
}
