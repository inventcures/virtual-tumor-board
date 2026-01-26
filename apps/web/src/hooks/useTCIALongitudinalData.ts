/**
 * useTCIALongitudinalData Hook
 * 
 * Loads real TCIA DICOM data for longitudinal viewing.
 * Simulates treatment response by modifying tumor contours across timepoints.
 * 
 * Architecture:
 * - Loads baseline scan from TCIA (Cloudflare R2 / GitHub fallback)
 * - Creates synthetic follow-up timepoints with modified tumor sizes
 * - Tumor contours shrink/grow based on RECIST response percentages
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LongitudinalStudy,
  ImagingTimepoint,
  TrackedLesion,
  RECISTAssessment,
  ProgressionSummary,
  ResponseCategory,
  TrendDirection,
} from '@/types/longitudinal-imaging';
import {
  loadDicomSeries,
  DicomSeries,
  DicomSlice,
  renderDicomSlice,
  CASE_DICOM_MAPPING,
} from '@/lib/imaging/dicom-loader';

// Default case to load (lung CT has good tumor visibility)
const DEFAULT_CASE_ID = 'lung-nsclc-kras-g12c';

// Tumor contour definitions (slice ranges and approximate positions)
// These define where tumors appear in the baseline scan
interface TumorContour {
  id: string;
  name: string;
  location: string;
  organ: string;
  color: string;
  // Slice range where tumor is visible
  sliceStart: number;
  sliceEnd: number;
  // Position in image (normalized 0-1)
  centerX: number;
  centerY: number;
  // Base radius in pixels (at baseline)
  baseRadius: number;
  // Whether it's a lymph node (uses short axis)
  isLymphNode: boolean;
}

// Pre-defined tumor locations for lung CT
const LUNG_TUMOR_CONTOURS: TumorContour[] = [
  {
    id: 'lesion-1',
    name: 'RUL Lung Mass',
    location: 'Right Upper Lobe',
    organ: 'Lung',
    color: '#3B82F6', // Blue
    sliceStart: 40,
    sliceEnd: 70,
    centerX: 0.35,
    centerY: 0.35,
    baseRadius: 35,
    isLymphNode: false,
  },
  {
    id: 'lesion-2',
    name: 'Subcarinal LN',
    location: 'Station 7',
    organ: 'Lymph node',
    color: '#10B981', // Green
    sliceStart: 50,
    sliceEnd: 65,
    centerX: 0.5,
    centerY: 0.55,
    baseRadius: 18,
    isLymphNode: true,
  },
  {
    id: 'lesion-3',
    name: 'Paratracheal LN',
    location: 'Station 4R',
    organ: 'Lymph node',
    color: '#F59E0B', // Amber
    sliceStart: 35,
    sliceEnd: 50,
    centerX: 0.55,
    centerY: 0.4,
    baseRadius: 12,
    isLymphNode: true,
  },
];

// Timepoint configuration for demo
interface TimepointConfig {
  label: string;
  weeksFromBaseline: number;
  percentChangeFromBaseline: number;
  treatmentContext: string;
}

const DEMO_TIMEPOINTS: TimepointConfig[] = [
  { label: 'Baseline', weeksFromBaseline: 0, percentChangeFromBaseline: 0, treatmentContext: 'Pre-treatment' },
  { label: 'Week 8', weeksFromBaseline: 8, percentChangeFromBaseline: -18, treatmentContext: 'Post-Cycle 2' },
  { label: 'Week 16', weeksFromBaseline: 16, percentChangeFromBaseline: -35, treatmentContext: 'Post-Cycle 4' },
  { label: 'Week 24', weeksFromBaseline: 24, percentChangeFromBaseline: -42, treatmentContext: 'Post-Cycle 6' },
];

export interface TCIASliceData {
  imageData: ImageData;
  sliceIndex: number;
  timepointId: string;
}

export interface UseTCIALongitudinalDataReturn {
  // Data
  study: LongitudinalStudy | null;
  timepoints: ImagingTimepoint[];
  lesions: TrackedLesion[];
  assessments: RECISTAssessment[];
  progressionSummary: ProgressionSummary | null;
  dicomSeries: DicomSeries | null;
  
  // Slice rendering
  getSliceWithTumors: (timepointId: string, sliceIndex: number) => ImageData | null;
  getTumorContours: (timepointId: string, sliceIndex: number) => TumorOverlay[];
  
  // Loading state
  isLoading: boolean;
  loadingProgress: { loaded: number; total: number };
  error: string | null;
  
  // Actions
  loadTCIAData: (caseId?: string) => Promise<void>;
}

export interface TumorOverlay {
  contour: TumorContour;
  radius: number; // Adjusted for timepoint
  centerX: number;
  centerY: number;
  measurement: number; // mm
  visible: boolean;
}

export function useTCIALongitudinalData(): UseTCIALongitudinalDataReturn {
  const [dicomSeries, setDicomSeries] = useState<DicomSeries | null>(null);
  const [study, setStudy] = useState<LongitudinalStudy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // Cache for rendered slices
  const sliceCache = useRef<Map<string, ImageData>>(new Map());
  
  // Derived data
  const timepoints = study?.studies || [];
  const lesions = study?.targetLesions || [];
  const assessments = study?.assessments || [];
  
  // Calculate progression summary
  const progressionSummary: ProgressionSummary | null = study && assessments.length > 0
    ? calculateProgressionSummary(assessments)
    : null;
  
  // Load TCIA DICOM data
  const loadTCIAData = useCallback(async (caseId: string = DEFAULT_CASE_ID) => {
    setIsLoading(true);
    setError(null);
    sliceCache.current.clear();
    
    try {
      console.log(`[TCIA] Loading DICOM series for ${caseId}...`);
      
      const series = await loadDicomSeries(caseId, (loaded, total) => {
        setLoadingProgress({ loaded, total });
      });
      
      if (!series || !series.loaded) {
        throw new Error(`Failed to load DICOM series for ${caseId}`);
      }
      
      console.log(`[TCIA] Loaded ${series.slices.length} slices`);
      setDicomSeries(series);
      
      // Create longitudinal study with timepoints
      const longitudinalStudy = createLongitudinalStudy(series, caseId);
      setStudy(longitudinalStudy);
      
    } catch (err) {
      console.error('[TCIA] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load TCIA data');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Render a slice with tumor overlays for a specific timepoint
  const getSliceWithTumors = useCallback((timepointId: string, sliceIndex: number): ImageData | null => {
    if (!dicomSeries || sliceIndex >= dicomSeries.slices.length) {
      return null;
    }
    
    const cacheKey = `${timepointId}-${sliceIndex}`;
    
    // Check cache
    if (sliceCache.current.has(cacheKey)) {
      return sliceCache.current.get(cacheKey)!;
    }
    
    // Get the timepoint to determine tumor size modification
    const timepoint = timepoints.find(tp => tp.id === timepointId);
    if (!timepoint) return null;
    
    // Render base DICOM slice
    const slice = dicomSeries.slices[sliceIndex];
    const imageData = renderDicomSlice(
      slice,
      dicomSeries.defaultWindowCenter,
      dicomSeries.defaultWindowWidth,
      100, // brightness
      100  // contrast
    );
    
    // Draw tumor contours on the image
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    // Get assessment for this timepoint
    const assessment = assessments.find(a => a.timepointId === timepointId);
    const percentChange = assessment?.targetLesions.percentChangeFromBaseline || 0;
    
    // Draw tumors
    LUNG_TUMOR_CONTOURS.forEach(contour => {
      if (sliceIndex >= contour.sliceStart && sliceIndex <= contour.sliceEnd) {
        // Calculate visibility based on distance from center slice
        const centerSlice = (contour.sliceStart + contour.sliceEnd) / 2;
        const sliceDistance = Math.abs(sliceIndex - centerSlice);
        const maxDistance = (contour.sliceEnd - contour.sliceStart) / 2;
        const visibility = 1 - (sliceDistance / maxDistance) * 0.7;
        
        // Adjust radius based on treatment response
        const adjustedRadius = contour.baseRadius * (1 + percentChange / 100) * visibility;
        
        if (adjustedRadius > 3) {
          drawTumorContour(ctx, contour, adjustedRadius, imageData.width, imageData.height);
        }
      }
    });
    
    // Get modified image data
    const modifiedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Cache it
    sliceCache.current.set(cacheKey, modifiedImageData);
    
    return modifiedImageData;
  }, [dicomSeries, timepoints, assessments]);
  
  // Get tumor contour overlays for a slice (for annotation rendering)
  const getTumorContours = useCallback((timepointId: string, sliceIndex: number): TumorOverlay[] => {
    const assessment = assessments.find(a => a.timepointId === timepointId);
    const percentChange = assessment?.targetLesions.percentChangeFromBaseline || 0;
    
    return LUNG_TUMOR_CONTOURS.map(contour => {
      const visible = sliceIndex >= contour.sliceStart && sliceIndex <= contour.sliceEnd;
      
      // Calculate visibility based on distance from center slice
      const centerSlice = (contour.sliceStart + contour.sliceEnd) / 2;
      const sliceDistance = Math.abs(sliceIndex - centerSlice);
      const maxDistance = (contour.sliceEnd - contour.sliceStart) / 2;
      const visibility = visible ? 1 - (sliceDistance / maxDistance) * 0.7 : 0;
      
      const adjustedRadius = contour.baseRadius * (1 + percentChange / 100) * visibility;
      
      // Calculate measurement in mm (assuming ~0.7mm/pixel for typical CT)
      const measurementMm = Math.round(adjustedRadius * 2 * 0.7);
      
      return {
        contour,
        radius: adjustedRadius,
        centerX: contour.centerX,
        centerY: contour.centerY,
        measurement: measurementMm,
        visible: visible && adjustedRadius > 3,
      };
    });
  }, [assessments]);
  
  return {
    study,
    timepoints,
    lesions,
    assessments,
    progressionSummary,
    dicomSeries,
    getSliceWithTumors,
    getTumorContours,
    isLoading,
    loadingProgress,
    error,
    loadTCIAData,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function createLongitudinalStudy(series: DicomSeries, caseId: string): LongitudinalStudy {
  const baseDate = new Date();
  const totalSlices = series.slices.length;
  
  // Create timepoints
  const studies: ImagingTimepoint[] = DEMO_TIMEPOINTS.map((config, index) => {
    const studyDate = new Date(baseDate);
    studyDate.setDate(studyDate.getDate() - (DEMO_TIMEPOINTS.length - 1 - index) * 7 * config.weeksFromBaseline / 8);
    
    return {
      id: `tp-${index}`,
      studyDate,
      studyInstanceUID: `1.2.3.4.5.${index}`,
      modality: series.slices[0]?.metadata.modality || 'CT',
      bodyPart: 'CHEST',
      series: [{
        seriesInstanceUID: `1.2.3.4.5.${index}.1`,
        seriesNumber: 1,
        seriesDescription: 'Axial',
        modality: 'CT',
        sliceCount: totalSlices,
        sliceThickness: 3,
      }],
      isBaseline: index === 0,
      timepoint: index === 0 ? 'baseline' : 'follow-up',
      daysFromBaseline: config.weeksFromBaseline * 7,
      treatmentContext: config.treatmentContext,
      totalSlices,
    };
  });
  
  // Create lesions with measurements
  const lesions: TrackedLesion[] = LUNG_TUMOR_CONTOURS.map(contour => {
    const baselineMeasurement = Math.round(contour.baseRadius * 2 * 0.7); // Convert to mm
    
    return {
      id: contour.id,
      name: contour.name,
      location: contour.location,
      organ: contour.organ,
      isLymphNode: contour.isLymphNode,
      status: 'target',
      color: contour.color,
      measurements: DEMO_TIMEPOINTS.map((config, tpIndex) => {
        const adjustedMeasurement = Math.round(baselineMeasurement * (1 + config.percentChangeFromBaseline / 100));
        return {
          id: `m-${contour.id}-${tpIndex}`,
          timepointId: `tp-${tpIndex}`,
          date: studies[tpIndex].studyDate,
          longAxis: adjustedMeasurement,
          shortAxis: contour.isLymphNode ? Math.round(adjustedMeasurement * 0.7) : undefined,
          sliceNumber: Math.round((contour.sliceStart + contour.sliceEnd) / 2),
          annotationCoords: [
            { x: contour.centerX * 256 - adjustedMeasurement / 2, y: contour.centerY * 256 },
            { x: contour.centerX * 256 + adjustedMeasurement / 2, y: contour.centerY * 256 },
          ],
          measuredBy: 'ai' as const,
          confidence: 0.92,
        };
      }),
    };
  });
  
  // Calculate assessments
  const baselineSum = lesions.reduce((sum, l) => sum + l.measurements[0].longAxis, 0);
  
  const assessments: RECISTAssessment[] = DEMO_TIMEPOINTS.map((config, index) => {
    const currentSum = Math.round(baselineSum * (1 + config.percentChangeFromBaseline / 100));
    const percentChange = config.percentChangeFromBaseline;
    
    let response: ResponseCategory;
    if (currentSum === 0) response = 'CR';
    else if (percentChange <= -30) response = 'PR';
    else if (percentChange >= 20) response = 'PD';
    else response = 'SD';
    
    return {
      id: `assessment-${index}`,
      timepointId: `tp-${index}`,
      date: studies[index].studyDate,
      targetLesions: {
        sumOfDiameters: currentSum,
        percentChangeFromBaseline: percentChange,
        percentChangeFromNadir: percentChange,
        nadir: index === 0 ? baselineSum : Math.min(baselineSum, currentSum),
        response,
      },
      nonTargetLesions: {
        status: 'Non-CR/Non-PD',
        progression: false,
      },
      newLesions: {
        present: false,
        count: 0,
        locations: [],
      },
      overallResponse: response,
      reasoning: `Sum of target lesion diameters: ${currentSum}mm (${percentChange >= 0 ? '+' : ''}${percentChange}% from baseline)`,
      isBestResponse: index === DEMO_TIMEPOINTS.length - 1,
    };
  });
  
  return {
    id: `study-tcia-${Date.now()}`,
    patientId: caseId,
    studies,
    baselineStudyId: 'tp-0',
    targetLesions: lesions,
    assessments,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function calculateProgressionSummary(assessments: RECISTAssessment[]): ProgressionSummary {
  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const latest = sortedAssessments[sortedAssessments.length - 1];
  const baseline = sortedAssessments[0];
  
  // Find best response
  const bestAssessment = sortedAssessments.reduce((best, curr) => {
    const responseOrder: Record<ResponseCategory, number> = { CR: 0, PR: 1, SD: 2, NE: 3, PD: 4 };
    return responseOrder[curr.overallResponse] < responseOrder[best.overallResponse] ? curr : best;
  }, sortedAssessments[0]);
  
  // Determine trend
  let trend: TrendDirection = 'stable';
  if (sortedAssessments.length >= 2) {
    const prev = sortedAssessments[sortedAssessments.length - 2];
    const currSum = latest.targetLesions.sumOfDiameters;
    const prevSum = prev.targetLesions.sumOfDiameters;
    if (currSum < prevSum - 2) trend = 'improving';
    else if (currSum > prevSum + 2) trend = 'worsening';
  }
  
  return {
    currentResponse: latest.overallResponse,
    percentChangeFromBaseline: latest.targetLesions.percentChangeFromBaseline,
    percentChangeFromNadir: latest.targetLesions.percentChangeFromNadir,
    bestResponse: bestAssessment.overallResponse,
    bestResponseDate: new Date(bestAssessment.date),
    newLesions: latest.newLesions.present,
    trend,
    sumOfDiameters: latest.targetLesions.sumOfDiameters,
    baselineSumOfDiameters: baseline.targetLesions.sumOfDiameters,
    nadirSumOfDiameters: latest.targetLesions.nadir,
  };
}

function drawTumorContour(
  ctx: CanvasRenderingContext2D,
  contour: TumorContour,
  radius: number,
  width: number,
  height: number
) {
  const cx = contour.centerX * width;
  const cy = contour.centerY * height;
  
  // Draw semi-transparent tumor fill
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = `${contour.color}20`; // 12% opacity
  ctx.fill();
  
  // Draw contour outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = contour.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw measurement line
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.strokeStyle = contour.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Draw endpoints
  ctx.beginPath();
  ctx.arc(cx - radius, cy, 3, 0, Math.PI * 2);
  ctx.arc(cx + radius, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = contour.color;
  ctx.fill();
  
  // Draw label
  const measurementMm = Math.round(radius * 2 * 0.7);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  const label = `${contour.name}: ${measurementMm}mm`;
  ctx.strokeText(label, cx, cy - radius - 8);
  ctx.fillText(label, cx, cy - radius - 8);
}
