"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { SyntheticVolume, getSliceDimensions } from "@/lib/imaging/synthetic-volume";

export type ViewAxis = "axial" | "sagittal" | "coronal";

interface ViewportPanelProps {
  volume: SyntheticVolume | null;
  axis: ViewAxis;
  sliceIndex: number;
  onSliceChange: (index: number) => void;
  windowCenter: number;
  windowWidth: number;
  onWindowChange?: (center: number, width: number) => void;
  crosshairPosition?: { x: number; y: number } | null;
  onCrosshairMove?: (position: { x: number; y: number; slice: number }) => void;
  showCrosshair?: boolean;
  collaboratorCursors?: Array<{ userId: string; x: number; y: number; color: string }>;
  label?: string;
}

const AXIS_LABELS: Record<ViewAxis, string> = {
  axial: "Axial",
  sagittal: "Sagittal",
  coronal: "Coronal",
};

const AXIS_COLORS: Record<ViewAxis, string> = {
  axial: "#3b82f6", // blue
  sagittal: "#10b981", // green
  coronal: "#f59e0b", // amber
};

export function ViewportPanel({
  volume,
  axis,
  sliceIndex,
  onSliceChange,
  windowCenter,
  windowWidth,
  onWindowChange,
  crosshairPosition,
  onCrosshairMove,
  showCrosshair = true,
  collaboratorCursors = [],
  label,
}: ViewportPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; wc: number; ww: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 256, height: 256 });

  // Get slice dimensions
  const dimensions = volume ? getSliceDimensions(volume.metadata, axis) : { width: 256, height: 256, maxSlice: 99 };

  // Render slice to canvas
  useEffect(() => {
    if (!canvasRef.current || !volume) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get slice as ImageData
    const imageData = volume.getSliceAsImageData(axis, sliceIndex, windowCenter, windowWidth);

    // Resize canvas to match slice dimensions
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Draw the image
    ctx.putImageData(imageData, 0, 0);
  }, [volume, axis, sliceIndex, windowCenter, windowWidth]);

  // Handle mouse wheel for slice navigation
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(dimensions.maxSlice, sliceIndex + delta));
      if (newIndex !== sliceIndex) {
        onSliceChange(newIndex);
      }
    },
    [sliceIndex, dimensions.maxSlice, onSliceChange]
  );

  // Handle mouse down - start window/level drag with right button
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        // Right click - window/level
        e.preventDefault();
        setIsWindowDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY, wc: windowCenter, ww: windowWidth });
      } else if (e.button === 0) {
        // Left click - might be for crosshair
        setIsDragging(true);
      }
    },
    [windowCenter, windowWidth]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setMousePos({ x, y });

      // Window/level dragging
      if (isWindowDragging && dragStart && onWindowChange) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const newCenter = dragStart.wc - dy * 2;
        const newWidth = Math.max(1, dragStart.ww + dx * 4);
        onWindowChange(newCenter, newWidth);
      }

      // Crosshair update
      if (isDragging && onCrosshairMove) {
        onCrosshairMove({ x, y, slice: sliceIndex });
      }
    },
    [isWindowDragging, isDragging, dragStart, onWindowChange, onCrosshairMove, sliceIndex]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsWindowDragging(false);
    setDragStart(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
    setIsDragging(false);
    setIsWindowDragging(false);
    setDragStart(null);
  }, []);

  // Prevent context menu on right click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Handle click for crosshair
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !onCrosshairMove) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      onCrosshairMove({ x, y, slice: sliceIndex });
    },
    [onCrosshairMove, sliceIndex]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700"
        style={{ backgroundColor: `${AXIS_COLORS[axis]}15` }}
      >
        <span className="text-sm font-medium" style={{ color: AXIS_COLORS[axis] }}>
          {label || AXIS_LABELS[axis]}
        </span>
        <span className="text-xs text-slate-400">
          Slice {sliceIndex + 1}/{dimensions.maxSlice + 1}
        </span>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Crosshair overlay */}
        {showCrosshair && mousePos && (
          <>
            <div
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{
                top: `${(mousePos.y / dimensions.height) * 100}%`,
                background: "rgba(0, 255, 255, 0.5)",
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${(mousePos.x / dimensions.width) * 100}%`,
                background: "rgba(0, 255, 255, 0.5)",
              }}
            />
          </>
        )}

        {/* Collaborator cursors */}
        {collaboratorCursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute w-4 h-4 pointer-events-none"
            style={{
              left: `${(cursor.x / dimensions.width) * 100}%`,
              top: `${(cursor.y / dimensions.height) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 animate-pulse"
              style={{ borderColor: cursor.color }}
            />
          </div>
        ))}

        {/* No volume loaded state */}
        {!volume && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <span className="text-sm">No volume loaded</span>
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="px-3 py-2 bg-slate-800/50">
        <input
          type="range"
          min={0}
          max={dimensions.maxSlice}
          value={sliceIndex}
          onChange={(e) => onSliceChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
