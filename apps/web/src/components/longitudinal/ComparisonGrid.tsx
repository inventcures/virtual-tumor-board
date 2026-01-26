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
  // Optional: Function to get real DICOM slice with tumor overlays
  getSliceWithTumors?: (timepointId: string, sliceIndex: number) => ImageData | null;
  // Flag to indicate if using real TCIA data
  useTCIAData?: boolean;
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
  getSliceWithTumors,
  useTCIAData = false,
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
            getSliceWithTumors={getSliceWithTumors}
            useTCIAData={useTCIAData}
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
            getSliceWithTumors={getSliceWithTumors}
            useTCIAData={useTCIAData}
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
  // Optional: Function to get real DICOM slice with tumor overlays
  getSliceWithTumors?: (timepointId: string, sliceIndex: number) => ImageData | null;
  useTCIAData?: boolean;
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
  getSliceWithTumors,
  useTCIAData = false,
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

  // Render image - either from real TCIA DICOM or synthetic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Try to use real TCIA data if available
    if (useTCIAData && getSliceWithTumors) {
      const realImageData = getSliceWithTumors(timepoint.id, currentSlice);
      if (realImageData) {
        // Scale the real image data to fit canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = realImageData.width;
        tempCanvas.height = realImageData.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(realImageData, 0, 0);
        
        // Draw scaled to our canvas
        ctx.drawImage(tempCanvas, 0, 0, width, height);
        
        // Draw measurement annotations if enabled (on top of real image)
        if (showMeasurements) {
          measurements.forEach(m => {
            const isHighlighted = m.lesion.id === highlightedLesionId;
            drawLesionAnnotation(ctx, m, isHighlighted, width, height, currentSlice, timepoint.totalSlices);
          });
        }
        return;
      }
    }
    
    // Fallback: Generate synthetic CT-like image that varies with slice
    // Seeded random for consistent but varying slices
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const cx = width / 2;
    const cy = height / 2;
    
    // Slice-dependent parameters (simulating anatomical changes through body)
    const sliceNorm = currentSlice / (timepoint.totalSlices - 1); // 0 to 1
    
    // Body cross-section varies - smaller at top/bottom of scan
    const sliceFromCenter = Math.abs(sliceNorm - 0.5) * 2; // 0 at center, 1 at edges
    const bodyRadiusModifier = 1 - sliceFromCenter * 0.3;
    const bodyRadius = Math.min(width, height) * 0.4 * bodyRadiusModifier;
    
    // Organ positions shift with slice
    const liverVisible = sliceNorm > 0.3 && sliceNorm < 0.7;
    const lungVisible = sliceNorm > 0.2 && sliceNorm < 0.6;
    const heartVisible = sliceNorm > 0.25 && sliceNorm < 0.45;
    
    // Tumor visibility depends on slice (tumor is at specific z-level)
    const tumorSliceCenter = 0.45; // Tumor centered at slice 45%
    const tumorSliceWidth = 0.15;
    const tumorVisibility = Math.max(0, 1 - Math.abs(sliceNorm - tumorSliceCenter) / tumorSliceWidth);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        // Use seeded random for deterministic noise pattern per slice
        const noiseSeed = x * 1000 + y + currentSlice * 10000;
        const noise = seededRandom(noiseSeed) * 15;
        
        let value = 0;
        
        if (dist < bodyRadius) {
          // Inside body - base soft tissue
          value = 75 + noise + Math.sin(x / 8 + y / 8 + currentSlice / 3) * 8;
          
          // Right lung (dark air pocket) - varies with slice
          if (lungVisible) {
            const lungRx = cx + 35;
            const lungRy = cy - 25 + (sliceNorm - 0.4) * 30;
            const lungRDist = Math.sqrt((x - lungRx) ** 2 + (y - lungRy) ** 2);
            const lungRRadius = 35 * (1 - Math.abs(sliceNorm - 0.4) * 1.5);
            if (lungRDist < lungRRadius && lungRRadius > 10) {
              value = 20 + noise * 0.5;
            }
          }
          
          // Left lung
          if (lungVisible) {
            const lungLx = cx - 40;
            const lungLy = cy - 25 + (sliceNorm - 0.4) * 30;
            const lungLDist = Math.sqrt((x - lungLx) ** 2 + (y - lungLy) ** 2);
            const lungLRadius = 32 * (1 - Math.abs(sliceNorm - 0.4) * 1.5);
            if (lungLDist < lungLRadius && lungLRadius > 10) {
              value = 20 + noise * 0.5;
            }
          }
          
          // Heart (medium density, oval shape)
          if (heartVisible) {
            const heartX = cx - 10;
            const heartY = cy - 15;
            const heartDistX = (x - heartX) / 25;
            const heartDistY = (y - heartY) / 30;
            const heartDist = Math.sqrt(heartDistX ** 2 + heartDistY ** 2);
            if (heartDist < 1) {
              value = 90 + noise;
            }
          }
          
          // Liver (right side, lower) - larger organ
          if (liverVisible) {
            const liverX = cx + 30;
            const liverY = cy + 25 - (sliceNorm - 0.5) * 40;
            const liverDistX = (x - liverX) / 45;
            const liverDistY = (y - liverY) / 35;
            const liverDist = Math.sqrt(liverDistX ** 2 + liverDistY ** 2);
            if (liverDist < 1) {
              value = 95 + noise;
            }
          }
          
          // Spine - vertebral body (bright bone, position shifts with slice)
          const spineWidth = 18 + Math.sin(currentSlice / 5) * 3;
          const spineOffset = Math.sin(currentSlice / 8) * 5; // Slight S-curve
          if (Math.abs(x - cx - spineOffset) < spineWidth && y > cy + 20) {
            // Vertebral body
            value = 180 + noise;
            // Spinal canal (dark center)
            if (Math.abs(x - cx - spineOffset) < 5 && y > cy + 25 && y < cy + 45) {
              value = 30;
            }
          }
          
          // Ribs (arcs on sides, visible in certain slices)
          if (sliceNorm > 0.2 && sliceNorm < 0.65) {
            const ribAngle = (currentSlice % 10) / 10 * Math.PI * 0.3;
            for (let rib = -2; rib <= 2; rib++) {
              const ribY = cy + rib * 20;
              const ribCurve = Math.sin((x - cx) / 50) * 15;
              if (Math.abs(y - ribY - ribCurve) < 4 && Math.abs(x - cx) > 50 && Math.abs(x - cx) < 90) {
                value = 170 + noise;
              }
            }
          }
          
          // TUMORS - these change size based on assessment (treatment response)
          // Primary tumor in liver
          if (tumorVisibility > 0.3) {
            const tumorCx = cx + 45;
            const tumorCy = cy + 15;
            // Tumor size decreases with negative percent change (treatment response)
            const baseRadius = 22;
            const tumorRadius = baseRadius * (1 + percentChange / 100) * tumorVisibility;
            const tumorDist = Math.sqrt((x - tumorCx) ** 2 + (y - tumorCy) ** 2);
            if (tumorDist < tumorRadius && tumorRadius > 3) {
              // Tumor has heterogeneous density
              const tumorNoise = seededRandom(x * y + currentSlice) * 20;
              value = 110 + tumorNoise;
              // Necrotic center (darker)
              if (tumorDist < tumorRadius * 0.4) {
                value = 70 + tumorNoise * 0.5;
              }
            }
          }
          
          // Secondary tumor (lung nodule) - smaller
          const lungTumorSlice = 0.38;
          const lungTumorVis = Math.max(0, 1 - Math.abs(sliceNorm - lungTumorSlice) / 0.1);
          if (lungTumorVis > 0.3) {
            const ltCx = cx + 50;
            const ltCy = cy - 35;
            const ltRadius = 12 * (1 + percentChange / 100) * lungTumorVis;
            const ltDist = Math.sqrt((x - ltCx) ** 2 + (y - ltCy) ** 2);
            if (ltDist < ltRadius && ltRadius > 2) {
              value = 100 + noise;
            }
          }
          
          // Mediastinal lymph node
          const lnSlice = 0.35;
          const lnVis = Math.max(0, 1 - Math.abs(sliceNorm - lnSlice) / 0.08);
          if (lnVis > 0.3) {
            const lnCx = cx - 5;
            const lnCy = cy - 50;
            const lnRadius = 10 * (1 + percentChange / 100) * lnVis;
            const lnDist = Math.sqrt((x - lnCx) ** 2 + (y - lnCy) ** 2);
            if (lnDist < lnRadius && lnRadius > 2) {
              value = 85 + noise;
            }
          }
          
        } else {
          // Outside body - air (dark with slight noise)
          value = 8 + noise * 0.3;
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
        drawLesionAnnotation(ctx, m, isHighlighted, width, height, currentSlice, timepoint.totalSlices);
      });
    }
  }, [timepoint, currentSlice, settings, measurements, showMeasurements, highlightedLesionId, percentChange, useTCIAData, getSliceWithTumors]);

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
  height: number,
  currentSlice?: number,
  totalSlices?: number
) {
  const { lesion, longAxis, annotationCoords, sliceNumber } = measurement;
  
  if (annotationCoords.length < 2) return;
  
  // Only show annotation if we're on or near the correct slice
  if (currentSlice !== undefined && sliceNumber !== undefined && totalSlices) {
    const sliceDiff = Math.abs(currentSlice - sliceNumber);
    // Show annotation within 5 slices of the actual measurement slice
    if (sliceDiff > 5) return;
  }
  
  // Scale coordinates to canvas size
  const scale = Math.min(width, height) / 256;
  const [p1, p2] = annotationCoords;
  const x1 = p1.x * scale;
  const y1 = p1.y * scale;
  const x2 = p2.x * scale;
  const y2 = p2.y * scale;
  
  // Fade annotation based on distance from measurement slice
  let opacity = 1;
  if (currentSlice !== undefined && sliceNumber !== undefined) {
    const sliceDiff = Math.abs(currentSlice - sliceNumber);
    opacity = Math.max(0.3, 1 - sliceDiff / 5);
  }
  
  // Draw measurement line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = isHighlighted ? `rgba(251, 191, 36, ${opacity})` : hexToRgba(lesion.color, opacity);
  ctx.lineWidth = isHighlighted ? 3 : 2;
  ctx.stroke();
  
  // Draw endpoints
  ctx.beginPath();
  ctx.arc(x1, y1, 3, 0, Math.PI * 2);
  ctx.arc(x2, y2, 3, 0, Math.PI * 2);
  ctx.fillStyle = isHighlighted ? `rgba(251, 191, 36, ${opacity})` : hexToRgba(lesion.color, opacity);
  ctx.fill();
  
  // Draw label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 10;
  
  ctx.font = '10px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.textAlign = 'center';
  ctx.fillText(`${lesion.name}: ${longAxis}mm`, midX, midY);
}

// Helper to convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
