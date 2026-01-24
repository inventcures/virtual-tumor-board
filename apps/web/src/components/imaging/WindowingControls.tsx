"use client";

import { useState } from "react";
import { CT_PRESETS, WindowPreset } from "@/lib/imaging/windowing-presets";
import { Settings2, RotateCcw } from "lucide-react";

interface WindowingControlsProps {
  center: number;
  width: number;
  onChange: (center: number, width: number) => void;
  presets?: WindowPreset[];
}

export function WindowingControls({
  center,
  width,
  onChange,
  presets = CT_PRESETS,
}: WindowingControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePresetClick = (preset: WindowPreset) => {
    onChange(preset.center, preset.width);
  };

  const handleReset = () => {
    // Default to Lung window
    onChange(-600, 1500);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Settings2 className="w-4 h-4" />
          <span>Windowing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            C:{center} W:{width}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/50">
          {/* Presets */}
          <div className="pt-3">
            <div className="text-xs text-slate-500 mb-2">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {presets.slice(0, 6).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    center === preset.center && width === preset.width
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Manual controls */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Manual Adjustment</div>
            
            {/* Center */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-14">Center</label>
              <input
                type="range"
                min={-1000}
                max={1000}
                value={center}
                onChange={(e) => onChange(parseInt(e.target.value), width)}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={center}
                onChange={(e) => onChange(parseInt(e.target.value) || 0, width)}
                className="w-16 px-2 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 text-center"
              />
            </div>

            {/* Width */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-14">Width</label>
              <input
                type="range"
                min={1}
                max={4000}
                value={width}
                onChange={(e) => onChange(center, parseInt(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={width}
                onChange={(e) => onChange(center, Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 text-center"
              />
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Lung
          </button>

          {/* Help text */}
          <div className="text-xs text-slate-500 italic">
            Tip: Right-click + drag on image to adjust window/level
          </div>
        </div>
      )}
    </div>
  );
}
