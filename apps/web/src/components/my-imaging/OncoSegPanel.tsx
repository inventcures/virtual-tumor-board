"use client";

/**
 * OncoSegPanel - Display OncoSeg tumor segmentation results
 * 
 * Shows:
 * - Segmentation contours overlay on the image
 * - Tumor volume calculation
 * - Slice-by-slice navigation for 3D volumes
 * - Checkpoint/model info
 */

import { useState, useEffect, useRef } from "react";
import { 
  Target, Box, Layers, ChevronLeft, ChevronRight,
  Activity, Info, AlertCircle, Loader2, Download
} from "lucide-react";
import { OncoSegCheckpoint, CHECKPOINT_INFO } from "@/lib/oncoseg";
import { OncoSegAnalysis, Contour } from "@/types/imaging";

interface OncoSegPanelProps {
  result: OncoSegAnalysis;
  imageDataUrl?: string; // Base image to overlay contours on
  onSliceChange?: (sliceIdx: number) => void;
}

// Color palette for contours (color-blind friendly from Saloni Dattani's guide)
const CONTOUR_COLORS = [
  '#E53935', // Red - primary tumor
  '#1E88E5', // Blue - secondary
  '#43A047', // Green - tertiary
  '#FB8C00', // Orange
];

export function OncoSegPanel({ 
  result, 
  imageDataUrl, 
  onSliceChange
}: OncoSegPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [showContours, setShowContours] = useState(true);
  
  const totalSlices = result.numSlices || 1;
  const slicesWithTumor = result.slicesWithTumor || [];
  
  // Draw contours on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageDataUrl) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw base image
      ctx.drawImage(img, 0, 0);
      
      // Draw contours if enabled
      if (showContours) {
        // Get contours for current slice from the volume contours
        const sliceContours = result.contours?.[String(currentSlice)] || [];
        
        sliceContours.forEach((contour: Contour, idx: number) => {
          if (contour.points.length < 2) return;
          
          ctx.beginPath();
          ctx.strokeStyle = CONTOUR_COLORS[idx % CONTOUR_COLORS.length];
          ctx.lineWidth = 2;
          ctx.fillStyle = `${CONTOUR_COLORS[idx % CONTOUR_COLORS.length]}33`; // 20% opacity
          
          ctx.moveTo(contour.points[0][0], contour.points[0][1]);
          for (let i = 1; i < contour.points.length; i++) {
            ctx.lineTo(contour.points[i][0], contour.points[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, result.contours, currentSlice, showContours]);

  // Navigate slices
  const handlePrevSlice = () => {
    const newSlice = Math.max(0, currentSlice - 1);
    setCurrentSlice(newSlice);
    onSliceChange?.(newSlice);
  };

  const handleNextSlice = () => {
    const newSlice = Math.min(totalSlices - 1, currentSlice + 1);
    setCurrentSlice(newSlice);
    onSliceChange?.(newSlice);
  };

  // Jump to slice with tumor
  const handleJumpToTumor = (sliceIdx: string) => {
    const idx = parseInt(sliceIdx);
    setCurrentSlice(idx);
    onSliceChange?.(idx);
  };

  const checkpointInfo = CHECKPOINT_INFO[result.checkpoint as OncoSegCheckpoint];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold text-white">Tumor Segmentation</h3>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            result.backend === 'sam3' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {result.backend === 'sam3' ? 'MedSAM3' : 'Fallback'}
          </span>
        </div>
        
        {/* Toggle contours */}
        <button
          onClick={() => setShowContours(!showContours)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            showContours 
              ? 'bg-rose-500/20 text-rose-400' 
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {showContours ? 'Hide Contours' : 'Show Contours'}
        </button>
      </div>

      {/* Error state */}
      {result.error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Segmentation Error</span>
          </div>
          <p className="text-sm text-slate-300">{result.error}</p>
        </div>
      )}

      {/* Canvas with segmentation overlay */}
      {imageDataUrl && (
        <div className="bg-slate-900 rounded-lg overflow-hidden">
          <canvas 
            ref={canvasRef}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Slice Navigation (for volumes) */}
      {totalSlices > 1 && (
        <div className="flex items-center gap-4 bg-slate-900/50 rounded-lg p-3">
          <button
            onClick={handlePrevSlice}
            disabled={currentSlice === 0}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex-1 text-center">
            <span className="text-white font-medium">Slice {currentSlice + 1}</span>
            <span className="text-slate-400"> / {totalSlices}</span>
          </div>
          
          <button
            onClick={handleNextSlice}
            disabled={currentSlice === totalSlices - 1}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Tumor Volume */}
      {result.tumorVolume && (
        <div className="bg-gradient-to-r from-rose-900/30 to-slate-900/30 border border-rose-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-5 h-5 text-rose-400" />
            <h4 className="font-medium text-white">Tumor Volume Estimate</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">
                {result.tumorVolume.volumeCc.toFixed(2)} <span className="text-sm font-normal text-slate-400">cc</span>
              </p>
              <p className="text-xs text-slate-400">cubic centimeters</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {result.tumorVolume.volumeMm3.toFixed(0)} <span className="text-sm font-normal text-slate-400">mm3</span>
              </p>
              <p className="text-xs text-slate-400">cubic millimeters</p>
            </div>
          </div>
        </div>
      )}

      {/* Slices with Tumor */}
      {slicesWithTumor.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              {slicesWithTumor.length} slices with detections
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {slicesWithTumor.slice(0, 20).map(sliceIdx => (
              <button
                key={sliceIdx}
                onClick={() => handleJumpToTumor(sliceIdx)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  String(currentSlice) === sliceIdx
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {parseInt(sliceIdx) + 1}
              </button>
            ))}
            {slicesWithTumor.length > 20 && (
              <span className="px-2 py-1 text-xs text-slate-500">
                +{slicesWithTumor.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Model Info */}
      <div className="bg-slate-900/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Info className="w-4 h-4" />
          <span>Model: {checkpointInfo?.name || result.checkpoint}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Modality: {checkpointInfo?.modality || 'Unknown'}</span>
          <span>Inference: {result.inferenceTimeMs}ms</span>
        </div>
        {checkpointInfo?.description && (
          <p className="text-xs text-slate-500">{checkpointInfo.description}</p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
        <p className="text-xs text-amber-200/70">
          <strong>Research Tool:</strong> Segmentation results are for educational purposes. 
          Contours may not accurately represent tumor boundaries. 
          Always consult a qualified radiologist for diagnosis.
        </p>
      </div>
    </div>
  );
}

/**
 * OncoSeg Loading State
 */
export function OncoSegLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <Target className="absolute inset-0 m-auto w-6 h-6 text-rose-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium">Segmenting with OncoSeg...</p>
        <p className="text-sm text-slate-400 mt-1">This may take 30-60 seconds</p>
      </div>
    </div>
  );
}

/**
 * OncoSeg Checkpoint Selector
 */
export function OncoSegCheckpointSelector({ 
  value, 
  onChange 
}: { 
  value: OncoSegCheckpoint; 
  onChange: (checkpoint: OncoSegCheckpoint) => void;
}) {
  const checkpoints = Object.entries(CHECKPOINT_INFO) as [OncoSegCheckpoint, typeof CHECKPOINT_INFO[OncoSegCheckpoint]][];

  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400">Segmentation Model</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {checkpoints.map(([id, info]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              value === id
                ? 'border-rose-500 bg-rose-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <p className="font-medium text-white text-sm">{info.name}</p>
            <p className="text-xs text-slate-400">{info.modality}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
