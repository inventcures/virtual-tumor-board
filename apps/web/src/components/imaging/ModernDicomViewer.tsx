"use client";

/**
 * Modern DICOM Viewer - Inspired by Tobi Lutke's MRI viewer
 * Clean, professional medical imaging interface
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Grid2X2,
  Sun, Contrast, Crosshair, Ruler, Circle, Square,
  Download, Share2, Settings, Info, FileText
} from "lucide-react";
import { generateSyntheticThorax, SyntheticVolume, getSliceDimensions } from "@/lib/imaging/synthetic-volume";
import { WINDOWING_PRESETS, WindowingPreset } from "@/lib/imaging/windowing-presets";
import { getRadiologyReport, generatePlaceholderReport } from "@/lib/imaging/radiology-reports";

// Types
type ViewAxis = "axial" | "sagittal" | "coronal";

interface SeriesInfo {
  id: string;
  name: string;
  description: string;
  sliceCount: number;
  bodyRegion: string;
  modality: string;
}

interface StudyInfo {
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  institution: string;
  referringPhysician: string;
  accession: string;
}

// Body regions with their series
const BODY_REGIONS = [
  { id: "chest", name: "Chest", icon: "🫁", count: 168 },
  { id: "abdomen", name: "Abdomen", icon: "🫃", count: 120 },
  { id: "pelvis", name: "Pelvis", icon: "🦴", count: 80 },
  { id: "brain", name: "Brain", icon: "🧠", count: 52 },
  { id: "spine", name: "Spine", icon: "🦴", count: 95 },
];

// Mock series for the current case
const MOCK_SERIES: SeriesInfo[] = [
  { id: "ct-chest-axial", name: "CT Chest Axial", description: "Contrast Enhanced", sliceCount: 100, bodyRegion: "chest", modality: "CT" },
  { id: "ct-chest-lung", name: "CT Chest Lung Window", description: "Lung Algorithm", sliceCount: 100, bodyRegion: "chest", modality: "CT" },
  { id: "ct-chest-bone", name: "CT Chest Bone Window", description: "Bone Algorithm", sliceCount: 100, bodyRegion: "chest", modality: "CT" },
  { id: "pet-ct", name: "PET-CT Fusion", description: "FDG Uptake", sliceCount: 80, bodyRegion: "chest", modality: "PET" },
];

interface ModernDicomViewerProps {
  caseId: string;
  cancerType?: string;
  patientName?: string;
  studyDate?: string;
}

export function ModernDicomViewer({ 
  caseId, 
  cancerType = "Lung",
  patientName = "Demo Patient",
  studyDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}: ModernDicomViewerProps) {
  // State
  const [volume, setVolume] = useState<SyntheticVolume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlice, setCurrentSlice] = useState(50);
  const [maxSlice, setMaxSlice] = useState(99);
  const [currentAxis, setCurrentAxis] = useState<ViewAxis>("axial");
  const [windowCenter, setWindowCenter] = useState(-600);
  const [windowWidth, setWindowWidth] = useState(1500);
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [selectedSeries, setSelectedSeries] = useState(MOCK_SERIES[0]);
  const [expandedRegions, setExpandedRegions] = useState<string[]>(["chest"]);
  const [showReport, setShowReport] = useState(true);
  const [activeTool, setActiveTool] = useState<string>("crosshair");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Study info based on case
  const studyInfo: StudyInfo = useMemo(() => ({
    patientName,
    patientId: `MRN-${caseId.slice(0, 8).toUpperCase()}`,
    studyDate,
    modality: "CT",
    description: `${cancerType} - Staging CT`,
    institution: "Virtual Tumor Board Demo",
    referringPhysician: "Dr. AI Specialist",
    accession: `ACC-${Date.now().toString(36).toUpperCase()}`,
  }), [caseId, cancerType, patientName, studyDate]);

  // Load report
  const report = useMemo(() => 
    getRadiologyReport(caseId) || generatePlaceholderReport(caseId, cancerType),
    [caseId, cancerType]
  );

  // Generate synthetic volume
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const syntheticVolume = generateSyntheticThorax(256, 256, 100);
      setVolume(syntheticVolume);
      setMaxSlice(syntheticVolume.metadata.shape[0] - 1);
      setCurrentSlice(Math.floor(syntheticVolume.metadata.shape[0] / 2));
      setIsLoading(false);
    }, 100);
  }, [caseId]);

  // Render slice to canvas
  useEffect(() => {
    if (!canvasRef.current || !volume) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = volume.getSliceAsImageData(currentAxis, currentSlice, windowCenter, windowWidth);
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }, [volume, currentAxis, currentSlice, windowCenter, windowWidth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        setCurrentSlice(s => Math.max(0, s - 1));
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        setCurrentSlice(s => Math.min(maxSlice, s + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxSlice]);

  // Wheel scroll for slices
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setCurrentSlice(s => Math.max(0, Math.min(maxSlice, s + delta)));
  }, [maxSlice]);

  // Toggle region expansion
  const toggleRegion = (regionId: string) => {
    setExpandedRegions(prev => 
      prev.includes(regionId) 
        ? prev.filter(r => r !== regionId)
        : [...prev, regionId]
    );
  };

  // Apply windowing preset
  const applyPreset = (preset: WindowingPreset) => {
    setWindowCenter(preset.center);
    setWindowWidth(preset.width);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-280px)] min-h-[600px] flex items-center justify-center bg-[#0a0f1a] rounded-xl">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading imaging study...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] min-h-[600px] flex bg-[#0a0f1a] rounded-xl overflow-hidden border border-slate-800">
      {/* Left Sidebar - Body Regions & Series */}
      <div className="w-56 flex-shrink-0 bg-[#0d1320] border-r border-slate-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-800">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Body Regions</div>
        </div>
        
        {/* Series List */}
        <div className="flex-1 overflow-y-auto">
          {BODY_REGIONS.map(region => (
            <div key={region.id}>
              {/* Region Header */}
              <button
                onClick={() => toggleRegion(region.id)}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition-colors ${
                  expandedRegions.includes(region.id) ? "bg-slate-800/30" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{region.icon}</span>
                  <span className="text-sm font-medium text-slate-300">{region.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{region.count}</span>
                  {expandedRegions.includes(region.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>
              
              {/* Series under region */}
              {expandedRegions.includes(region.id) && (
                <div className="bg-slate-900/50">
                  {MOCK_SERIES.filter(s => s.bodyRegion === region.id).map(series => (
                    <button
                      key={series.id}
                      onClick={() => setSelectedSeries(series)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors ${
                        selectedSeries.id === series.id
                          ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500"
                          : "text-slate-400 hover:bg-slate-800/50 border-l-2 border-transparent"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{series.name}</div>
                        <div className="text-xs text-slate-500">{series.description}</div>
                      </div>
                      <span className="text-xs text-slate-500">{series.sliceCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1320]">
          {/* Left - Tools */}
          <div className="flex items-center gap-1">
            <button className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <button 
              onClick={() => setActiveTool("crosshair")}
              className={`p-2 rounded transition-colors ${activeTool === "crosshair" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool("ruler")}
              className={`p-2 rounded transition-colors ${activeTool === "ruler" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Ruler className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool("circle")}
              className={`p-2 rounded transition-colors ${activeTool === "circle" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Circle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTool("rectangle")}
              className={`p-2 rounded transition-colors ${activeTool === "rectangle" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Square className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <button className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Center - Series Info */}
          <div className="text-center">
            <div className="text-sm font-medium text-white">{selectedSeries.name}</div>
            <div className="text-xs text-slate-500">{selectedSeries.modality} · {selectedSeries.description} · {selectedSeries.sliceCount} images</div>
          </div>

          {/* Right - View Options */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowReport(!showReport)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                showReport ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Report
            </button>
            <button className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport & Report */}
        <div className="flex-1 flex min-h-0">
          {/* Image Viewport */}
          <div 
            ref={containerRef}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
            onWheel={handleWheel}
          >
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
              style={{ 
                imageRendering: "pixelated",
                transform: `scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`
              }}
            />

            {/* Overlay Info - Top Left */}
            <div className="absolute top-3 left-3 text-xs font-mono space-y-0.5">
              <div className="text-cyan-400">{selectedSeries.name}</div>
              <div className="text-slate-500">{selectedSeries.modality} · {selectedSeries.description}</div>
            </div>

            {/* Overlay Info - Top Right */}
            <div className="absolute top-3 right-3 text-xs font-mono text-right space-y-0.5">
              <div className="text-amber-400">{currentSlice + 1}/{maxSlice + 1}</div>
              <div className="text-slate-500 capitalize">{currentAxis}</div>
            </div>

            {/* Overlay Info - Bottom Left */}
            <div className="absolute bottom-3 left-3 text-xs font-mono text-slate-500">
              <div>W:{windowWidth} L:{windowCenter}</div>
            </div>

            {/* Overlay Info - Bottom Right */}
            <div className="absolute bottom-3 right-3 text-xs font-mono text-slate-500">
              <div>{zoom.toFixed(1)}x</div>
            </div>

            {/* Side Scroll Indicators */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
              <div className="w-1 h-20 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-slate-500 rounded-full transition-all"
                  style={{ height: `${((currentSlice + 1) / (maxSlice + 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Report Panel */}
          {showReport && (
            <div className="w-72 flex-shrink-0 bg-[#0d1320] border-l border-slate-800 overflow-y-auto">
              {/* Study Info Section */}
              <div className="p-3 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Study Information</span>
                  <button className="text-xs text-blue-400 hover:underline">Info</button>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Study Date</span>
                    <span className="text-slate-300">{studyInfo.studyDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modality</span>
                    <span className="text-slate-300">{studyInfo.modality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Description</span>
                    <span className="text-slate-300 text-right max-w-[140px] truncate">{studyInfo.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Institution</span>
                    <span className="text-slate-300 text-right max-w-[140px] truncate">{studyInfo.institution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accession</span>
                    <span className="text-slate-300 font-mono">{studyInfo.accession.slice(0, 12)}</span>
                  </div>
                </div>
              </div>

              {/* Report Section */}
              <div className="p-3 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Report</span>
                  <span className="text-xs text-emerald-400">Final</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Radiologist</span>
                    <span className="text-slate-300">{report.reporter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Report Date</span>
                    <span className="text-slate-300">{new Date(report.signedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Findings Section */}
              <div className="p-3 border-b border-slate-800">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Key Findings</div>
                <div className="space-y-2">
                  <div className="text-xs">
                    <div className="text-slate-300 font-medium">Primary Lesion</div>
                    <div className="text-slate-500 mt-0.5">{report.findings.primaryLesion.slice(0, 80)}...</div>
                  </div>
                  <div className="text-xs">
                    <div className="text-slate-300 font-medium">Lymph Nodes</div>
                    <div className="text-slate-500 mt-0.5">{report.findings.lymphNodes.slice(0, 80)}...</div>
                  </div>
                  {report.measurements.slice(0, 2).map((m, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlice(m.slice)}
                      className="w-full text-left text-xs p-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    >
                      <div className="text-slate-300">{m.label}</div>
                      <div className="text-blue-400">{m.value} · Slice {m.slice} →</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Series List */}
              <div className="p-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Series ({MOCK_SERIES.length})</div>
                <div className="space-y-1">
                  {MOCK_SERIES.map(series => (
                    <button
                      key={series.id}
                      onClick={() => setSelectedSeries(series)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                        selectedSeries.id === series.id
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{series.bodyRegion.charAt(0).toUpperCase()}</span>
                        <span>{series.name.replace("CT ", "")}</span>
                      </div>
                      <span className="text-slate-500">{series.sliceCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="px-4 py-3 border-t border-slate-800 bg-[#0d1320]">
          {/* Slice Slider */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-slate-500 w-16">Slice: {currentSlice + 1} / {maxSlice + 1}</span>
            <input
              type="range"
              min={0}
              max={maxSlice}
              value={currentSlice}
              onChange={(e) => setCurrentSlice(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Brightness & Contrast */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <Sun className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 w-20">BRIGHTNESS</span>
              <input
                type="range"
                min={50}
                max={150}
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-slate-400 w-12 text-right">{brightness}%</span>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <Contrast className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 w-20">CONTRAST</span>
              <input
                type="range"
                min={50}
                max={150}
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-slate-400 w-12 text-right">{contrast}%</span>
            </div>
          </div>

          {/* Windowing Presets */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-slate-500">Presets:</span>
            {Object.values(WINDOWING_PRESETS).slice(0, 5).map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  windowCenter === preset.center && windowWidth === preset.width
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
