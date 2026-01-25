"use client";

/**
 * Imaging Review Tab
 * Modern DICOM viewer integrated into the Virtual Tumor Board
 */

import { ModernDicomViewer } from "./imaging/ModernDicomViewer";

interface ImagingReviewTabProps {
  caseId: string;
  cancerType?: string;
  patientName?: string;
}

export function ImagingReviewTab({ 
  caseId, 
  cancerType = "Unknown",
  patientName = "Demo Patient"
}: ImagingReviewTabProps) {
  return (
    <ModernDicomViewer
      caseId={caseId}
      cancerType={cancerType}
      patientName={patientName}
      studyDate={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    />
  );
}
