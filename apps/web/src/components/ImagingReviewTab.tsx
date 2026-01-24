"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { DicomViewer } from "./imaging/DicomViewer";
import { RadiologistReport } from "./imaging/RadiologistReport";
import { CollaborationOverlay } from "./imaging/CollaborationOverlay";
import { getRadiologyReport, generatePlaceholderReport } from "@/lib/imaging/radiology-reports";
import { useCollaboration } from "@/lib/collaboration/use-collaboration";
import { Share2 } from "lucide-react";

interface ImagingReviewTabProps {
  caseId: string;
  cancerType?: string;
}

// Generate a stable random user ID for this session
function generateUserId(): string {
  if (typeof window !== "undefined") {
    let userId = sessionStorage.getItem("vtb-user-id");
    if (!userId) {
      userId = `user-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("vtb-user-id", userId);
    }
    return userId;
  }
  return `user-${Math.random().toString(36).substring(2, 9)}`;
}

// Demo specialties to randomly assign
const DEMO_SPECIALTIES = [
  "Medical Oncology",
  "Surgical Oncology",
  "Radiation Oncology",
  "Radiology",
  "Pathology",
];

const DEMO_NAMES = [
  "Dr. Shalya",
  "Dr. Chikitsa",
  "Dr. Kirann",
  "Dr. Chitran",
  "Dr. Vaidya",
  "Dr. Arogyam",
];

export function ImagingReviewTab({ caseId, cancerType = "Unknown" }: ImagingReviewTabProps) {
  const [currentSlice, setCurrentSlice] = useState(50);
  const [currentAxis, setCurrentAxis] = useState<"axial" | "sagittal" | "coronal">("axial");
  const viewerRef = useRef<{ goToSlice: (slice: number) => void } | null>(null);
  
  // Stable user info for this session
  const userId = useMemo(() => generateUserId(), []);
  const userName = useMemo(() => {
    if (typeof window !== "undefined") {
      let name = sessionStorage.getItem("vtb-user-name");
      if (!name) {
        name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
        sessionStorage.setItem("vtb-user-name", name);
      }
      return name;
    }
    return DEMO_NAMES[0];
  }, []);
  const specialty = useMemo(() => {
    if (typeof window !== "undefined") {
      let spec = sessionStorage.getItem("vtb-user-specialty");
      if (!spec) {
        spec = DEMO_SPECIALTIES[Math.floor(Math.random() * DEMO_SPECIALTIES.length)];
        sessionStorage.setItem("vtb-user-specialty", spec);
      }
      return spec;
    }
    return DEMO_SPECIALTIES[0];
  }, []);

  // Connect to collaboration
  const collaboration = useCollaboration({
    caseId,
    userId,
    userName,
    specialty,
    isLeader: false,
  });

  // Get or generate report
  const report = getRadiologyReport(caseId) || generatePlaceholderReport(caseId, cancerType);

  // Handle clicking a measurement in the report to navigate to that slice
  const handleMeasurementClick = useCallback((slice: number) => {
    setCurrentSlice(slice);
    setCurrentAxis("axial");
    // In a real implementation, we'd call viewerRef.current?.goToSlice(slice)
    console.log(`Navigate to slice ${slice}`);
  }, []);

  // Handle slice changes from the viewer
  const handleSliceChange = useCallback((axis: string, index: number) => {
    if (axis === "axial" || axis === "sagittal" || axis === "coronal") {
      setCurrentAxis(axis as "axial" | "sagittal" | "coronal");
    }
    if (axis === "axial") {
      setCurrentSlice(index);
    }
  }, []);

  // Handle cursor movements for collaboration
  const handleCursorMove = useCallback((x: number, y: number, axis: "axial" | "sagittal" | "coronal", slice: number) => {
    collaboration.sendCursor({ x, y, axis, slice });
  }, [collaboration]);

  // Convert collaboration cursors to the format ViewportPanel expects
  const collaboratorCursors = useMemo(() => {
    return collaboration.cursors
      .filter((c) => c.axis === currentAxis)
      .map((cursor) => {
        const user = collaboration.users.find((u) => u.id === cursor.userId);
        return {
          userId: cursor.userId,
          x: cursor.x,
          y: cursor.y,
          color: user?.color || "#888888",
        };
      });
  }, [collaboration.cursors, collaboration.users, currentAxis]);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col gap-4">
      {/* Collaboration Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <CollaborationOverlay
          users={collaboration.users}
          cursors={collaboration.cursors}
          annotations={collaboration.annotations}
          leaderId={collaboration.leaderId}
          currentUserId={userId}
          following={collaboration.following}
          onFollowUser={collaboration.setFollowing}
          onBecomeLeader={collaboration.becomeLeader}
          connected={collaboration.connected}
        />
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            You: <span className="text-slate-300">{userName}</span>
          </span>
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
            collaboratorCursors={collaboratorCursors}
            onCursorMove={handleCursorMove}
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
          <span>View: <span className="text-slate-300 capitalize">{currentAxis}</span></span>
          <span>Case: <span className="text-slate-300">{caseId}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className={collaboration.connected ? "text-green-400" : "text-red-400"}>
            {collaboration.connected ? "Connected" : "Disconnected"}
          </span>
          <span>{collaboration.users.length} participant{collaboration.users.length !== 1 ? "s" : ""}</span>
          <span>Synthetic CT Demo</span>
        </div>
      </div>
    </div>
  );
}
