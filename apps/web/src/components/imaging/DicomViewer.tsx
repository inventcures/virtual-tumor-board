"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ViewportPanel, ViewAxis } from "./ViewportPanel";
import { WindowingControls } from "./WindowingControls";
import { generateSyntheticThorax, SyntheticVolume } from "@/lib/imaging/synthetic-volume";
import { Loader2, Maximize2, Grid2X2, Info } from "lucide-react";

interface DicomViewerProps {
  caseId?: string;
  tumorLocation?: { x: number; y: number; z: number; radius: number };
  onSliceChange?: (axis: ViewAxis, index: number) => void;
  collaboratorCursors?: Array<{ userId: string; x: number; y: number; axis: ViewAxis; color: string }>;
}

export function DicomViewer({
  caseId,
  tumorLocation,
  onSliceChange,
  collaboratorCursors = [],
}: DicomViewerProps) {
  const [volume, setVolume] = useState<SyntheticVolume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slices, setSlices] = useState({ axial: 50, sagittal: 128, coronal: 128 });
  const [windowCenter, setWindowCenter] = useState(-600);
  const [windowWidth, setWindowWidth] = useState(1500);
  const [activeViewport, setActiveViewport] = useState<ViewAxis | null>(null);

  // Generate synthetic volume on mount
  useEffect(() => {
    setIsLoading(true);
    // Use setTimeout to not block UI
    setTimeout(() => {
      const syntheticVolume = generateSyntheticThorax(256, 256, 100, tumorLocation);
      setVolume(syntheticVolume);
      // Set initial slices to middle
      setSlices({
        axial: Math.floor(syntheticVolume.metadata.shape[0] / 2),
        sagittal: Math.floor(syntheticVolume.metadata.shape[2] / 2),
        coronal: Math.floor(syntheticVolume.metadata.shape[1] / 2),
      });
      setIsLoading(false);
    }, 100);
  }, [caseId, tumorLocation]);

  const handleSliceChange = useCallback(
    (axis: ViewAxis, index: number) => {
      setSlices((prev) => ({ ...prev, [axis]: index }));
      onSliceChange?.(axis, index);
    },
    [onSliceChange]
  );

  const handleWindowChange = useCallback((center: number, width: number) => {
    setWindowCenter(center);
    setWindowWidth(width);
  }, []);

  const handleCrosshairMove = useCallback(
    (axis: ViewAxis, position: { x: number; y: number; slice: number }) => {
      // Could sync crosshairs across views or emit for collaboration
      console.log(`Crosshair on ${axis}:`, position);
    },
    []
  );

  // Filter collaborator cursors by axis
  const getCursorsForAxis = useCallback(
    (axis: ViewAxis) => {
      return collaboratorCursors
        .filter((c) => c.axis === axis)
        .map((c) => ({ userId: c.userId, x: c.x, y: c.y, color: c.color }));
    },
    [collaboratorCursors]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 rounded-lg">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Generating synthetic CT volume...</span>
        </div>
      </div>
    );
  }

  // Full-screen single viewport mode
  if (activeViewport) {
    return (
      <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <span className="text-sm font-medium text-slate-300">
            {activeViewport.charAt(0).toUpperCase() + activeViewport.slice(1)} View
          </span>
          <button
            onClick={() => setActiveViewport(null)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Exit fullscreen"
          >
            <Grid2X2 className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1">
          <ViewportPanel
            volume={volume}
            axis={activeViewport}
            sliceIndex={slices[activeViewport]}
            onSliceChange={(idx) => handleSliceChange(activeViewport, idx)}
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onWindowChange={handleWindowChange}
            onCrosshairMove={(pos) => handleCrosshairMove(activeViewport, pos)}
            collaboratorCursors={getCursorsForAxis(activeViewport)}
          />
        </div>
      </div>
    );
  }

  // Multi-planar 2x2 grid
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Controls bar */}
      <div className="flex items-center gap-4">
        <WindowingControls
          center={windowCenter}
          width={windowWidth}
          onChange={handleWindowChange}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5" />
          <span>Scroll: navigate | Right-drag: window/level | Click: select point</span>
        </div>
      </div>

      {/* 2x2 Viewport Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
        {/* Axial */}
        <div className="relative group">
          <ViewportPanel
            volume={volume}
            axis="axial"
            sliceIndex={slices.axial}
            onSliceChange={(idx) => handleSliceChange("axial", idx)}
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onWindowChange={handleWindowChange}
            onCrosshairMove={(pos) => handleCrosshairMove("axial", pos)}
            collaboratorCursors={getCursorsForAxis("axial")}
          />
          <button
            onClick={() => setActiveViewport("axial")}
            className="absolute top-10 right-2 p-1 bg-slate-800/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Maximize"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Sagittal */}
        <div className="relative group">
          <ViewportPanel
            volume={volume}
            axis="sagittal"
            sliceIndex={slices.sagittal}
            onSliceChange={(idx) => handleSliceChange("sagittal", idx)}
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onWindowChange={handleWindowChange}
            onCrosshairMove={(pos) => handleCrosshairMove("sagittal", pos)}
            collaboratorCursors={getCursorsForAxis("sagittal")}
          />
          <button
            onClick={() => setActiveViewport("sagittal")}
            className="absolute top-10 right-2 p-1 bg-slate-800/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Maximize"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Coronal */}
        <div className="relative group">
          <ViewportPanel
            volume={volume}
            axis="coronal"
            sliceIndex={slices.coronal}
            onSliceChange={(idx) => handleSliceChange("coronal", idx)}
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onWindowChange={handleWindowChange}
            onCrosshairMove={(pos) => handleCrosshairMove("coronal", pos)}
            collaboratorCursors={getCursorsForAxis("coronal")}
          />
          <button
            onClick={() => setActiveViewport("coronal")}
            className="absolute top-10 right-2 p-1 bg-slate-800/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Maximize"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Info Panel */}
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex flex-col">
          <div className="text-sm font-medium text-blue-400 mb-3">Volume Info</div>
          {volume && (
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="text-slate-300 font-mono">
                  {volume.metadata.shape.join(" x ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Spacing (mm):</span>
                <span className="text-slate-300 font-mono">
                  {volume.metadata.spacing.map((s) => s.toFixed(1)).join(" x ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Modality:</span>
                <span className="text-slate-300">{volume.metadata.modality}</span>
              </div>
              <div className="border-t border-slate-700 my-2 pt-2">
                <div className="flex justify-between">
                  <span>Window Center:</span>
                  <span className="text-slate-300 font-mono">{windowCenter}</span>
                </div>
                <div className="flex justify-between">
                  <span>Window Width:</span>
                  <span className="text-slate-300 font-mono">{windowWidth}</span>
                </div>
              </div>
              <div className="border-t border-slate-700 my-2 pt-2">
                <div className="text-slate-500 mb-1">Current Slices:</div>
                <div className="flex justify-between">
                  <span>Axial:</span>
                  <span className="text-slate-300 font-mono">{slices.axial + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sagittal:</span>
                  <span className="text-slate-300 font-mono">{slices.sagittal + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coronal:</span>
                  <span className="text-slate-300 font-mono">{slices.coronal + 1}</span>
                </div>
              </div>
            </div>
          )}
          <div className="mt-auto pt-4 text-xs text-slate-600 italic">
            Synthetic CT for demonstration
          </div>
        </div>
      </div>
    </div>
  );
}
