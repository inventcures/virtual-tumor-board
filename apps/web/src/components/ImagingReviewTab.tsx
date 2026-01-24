"use client";

import { useState, useCallback, useRef } from "react";
import { DicomViewer } from "./imaging/DicomViewer";
import { RadiologistReport } from "./imaging/RadiologistReport";
import { getRadiologyReport, generatePlaceholderReport } from "@/lib/imaging/radiology-reports";
import { Users, Radio, Eye, Share2 } from "lucide-react";

interface ImagingReviewTabProps {
  caseId: string;
  cancerType?: string;
}

// Simulated users for collaboration demo
const DEMO_USERS = [
  { id: "dr-shalya", name: "Dr. Shalya", color: "#ef4444", specialty: "Surgical Oncology" },
  { id: "dr-chikitsa", name: "Dr. Chikitsa", color: "#3b82f6", specialty: "Medical Oncology" },
  { id: "dr-kirann", name: "Dr. Kirann", color: "#10b981", specialty: "Radiation Oncology" },
  { id: "dr-chitran", name: "Dr. Chitran", color: "#f59e0b", specialty: "Radiology", isLeader: true },
];

export function ImagingReviewTab({ caseId, cancerType = "Unknown" }: ImagingReviewTabProps) {
  const [currentSlice, setCurrentSlice] = useState(50);
  const viewerRef = useRef<{ goToSlice: (slice: number) => void } | null>(null);
  
  // Get or generate report
  const report = getRadiologyReport(caseId) || generatePlaceholderReport(caseId, cancerType);

  // Handle clicking a measurement in the report to navigate to that slice
  const handleMeasurementClick = useCallback((slice: number) => {
    setCurrentSlice(slice);
    // In a real implementation, we'd call viewerRef.current?.goToSlice(slice)
    console.log(`Navigate to slice ${slice}`);
  }, []);

  // Handle slice changes from the viewer
  const handleSliceChange = useCallback((axis: string, index: number) => {
    if (axis === "axial") {
      setCurrentSlice(index);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col gap-4">
      {/* Collaboration Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Eye className="w-4 h-4 text-green-400" />
            <span>Imaging Review Session</span>
          </div>
          <div className="h-4 w-px bg-slate-600" />
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-slate-400" />
            <div className="flex -space-x-2">
              {DEMO_USERS.map((user) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-slate-800"
                  style={{ backgroundColor: user.color }}
                  title={`${user.name} - ${user.specialty}`}
                >
                  {user.name.split(" ")[1][0]}
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500 ml-2">4 viewing</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-400">
              <span className="text-amber-400">Dr. Chitran</span> is leading
            </span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            Share Screen
          </button>
        </div>
      </div>

      {/* Main Content - Split Pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Pane - DICOM Viewer (60%) */}
        <div className="w-[60%] min-w-0">
          <DicomViewer
            caseId={caseId}
            onSliceChange={handleSliceChange}
            collaboratorCursors={[
              // Demo cursors - in real app these would come from WebSocket
            ]}
          />
        </div>

        {/* Right Pane - Radiologist Report (40%) */}
        <div className="w-[40%] min-w-0">
          <RadiologistReport
            report={report}
            onMeasurementClick={handleMeasurementClick}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800/30 rounded text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Current Slice: <span className="text-slate-300 font-mono">{currentSlice}</span></span>
          <span>Case: <span className="text-slate-300">{caseId}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-400">Connected</span>
          <span>Synthetic CT Demo</span>
        </div>
      </div>
    </div>
  );
}
