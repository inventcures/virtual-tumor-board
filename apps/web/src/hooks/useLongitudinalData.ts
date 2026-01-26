/**
 * useLongitudinalData Hook
 * 
 * Manages longitudinal study data, including timepoints, lesions, and RECIST assessments.
 * Provides methods for adding/removing timepoints and calculating progression.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  LongitudinalStudy,
  ImagingTimepoint,
  TrackedLesion,
  LesionMeasurement,
  RECISTAssessment,
  ProgressionSummary,
  ResponseCategory,
  TrendDirection,
  RECIST_THRESHOLDS,
  SyntheticTimepointConfig,
} from '@/types/longitudinal-imaging';

interface UseLongitudinalDataReturn {
  // Data
  study: LongitudinalStudy | null;
  timepoints: ImagingTimepoint[];
  lesions: TrackedLesion[];
  assessments: RECISTAssessment[];
  progressionSummary: ProgressionSummary | null;
  
  // Actions
  initializeStudy: (patientId: string) => void;
  addTimepoint: (timepoint: ImagingTimepoint) => void;
  removeTimepoint: (timepointId: string) => void;
  setBaseline: (timepointId: string) => void;
  addLesion: (lesion: TrackedLesion) => void;
  removeLesion: (lesionId: string) => void;
  addMeasurement: (lesionId: string, measurement: LesionMeasurement) => void;
  calculateAssessment: (timepointId: string) => RECISTAssessment;
  
  // Demo
  loadDemoData: () => void;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useLongitudinalData(): UseLongitudinalDataReturn {
  const [study, setStudy] = useState<LongitudinalStudy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived data
  const timepoints = useMemo(() => 
    study?.studies.sort((a, b) => a.studyDate.getTime() - b.studyDate.getTime()) || [],
    [study?.studies]
  );

  const lesions = useMemo(() => study?.targetLesions || [], [study?.targetLesions]);
  const assessments = useMemo(() => study?.assessments || [], [study?.assessments]);

  // Calculate progression summary
  const progressionSummary = useMemo((): ProgressionSummary | null => {
    if (!study || assessments.length === 0) return null;

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
  }, [study, assessments]);

  // Initialize a new study
  const initializeStudy = useCallback((patientId: string) => {
    setStudy({
      id: `study-${Date.now()}`,
      patientId,
      studies: [],
      baselineStudyId: '',
      targetLesions: [],
      assessments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, []);

  // Add a timepoint
  const addTimepoint = useCallback((timepoint: ImagingTimepoint) => {
    setStudy(prev => {
      if (!prev) return prev;
      
      const studies = [...prev.studies, timepoint].sort(
        (a, b) => a.studyDate.getTime() - b.studyDate.getTime()
      );
      
      // Auto-set baseline if first timepoint
      const baselineStudyId = prev.baselineStudyId || timepoint.id;
      
      // Recalculate daysFromBaseline for all timepoints
      const baselineDate = studies.find(s => s.id === baselineStudyId)?.studyDate || timepoint.studyDate;
      const updatedStudies = studies.map(s => ({
        ...s,
        daysFromBaseline: Math.floor((s.studyDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)),
        isBaseline: s.id === baselineStudyId,
      }));

      return {
        ...prev,
        studies: updatedStudies,
        baselineStudyId,
        updatedAt: new Date(),
      };
    });
  }, []);

  // Remove a timepoint
  const removeTimepoint = useCallback((timepointId: string) => {
    setStudy(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        studies: prev.studies.filter(s => s.id !== timepointId),
        updatedAt: new Date(),
      };
    });
  }, []);

  // Set baseline
  const setBaseline = useCallback((timepointId: string) => {
    setStudy(prev => {
      if (!prev) return prev;
      
      const baselineDate = prev.studies.find(s => s.id === timepointId)?.studyDate;
      if (!baselineDate) return prev;
      
      const updatedStudies = prev.studies.map(s => ({
        ...s,
        daysFromBaseline: Math.floor((s.studyDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)),
        isBaseline: s.id === timepointId,
      }));

      return {
        ...prev,
        studies: updatedStudies,
        baselineStudyId: timepointId,
        updatedAt: new Date(),
      };
    });
  }, []);

  // Add a lesion
  const addLesion = useCallback((lesion: TrackedLesion) => {
    setStudy(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        targetLesions: [...prev.targetLesions, lesion],
        updatedAt: new Date(),
      };
    });
  }, []);

  // Remove a lesion
  const removeLesion = useCallback((lesionId: string) => {
    setStudy(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        targetLesions: prev.targetLesions.filter(l => l.id !== lesionId),
        updatedAt: new Date(),
      };
    });
  }, []);

  // Add a measurement to a lesion
  const addMeasurement = useCallback((lesionId: string, measurement: LesionMeasurement) => {
    setStudy(prev => {
      if (!prev) return prev;
      
      const updatedLesions = prev.targetLesions.map(l => {
        if (l.id !== lesionId) return l;
        return {
          ...l,
          measurements: [...l.measurements, measurement],
        };
      });

      return {
        ...prev,
        targetLesions: updatedLesions,
        updatedAt: new Date(),
      };
    });
  }, []);

  // Calculate RECIST assessment for a timepoint
  const calculateAssessment = useCallback((timepointId: string): RECISTAssessment => {
    if (!study) throw new Error('No study initialized');
    
    const timepoint = study.studies.find(s => s.id === timepointId);
    if (!timepoint) throw new Error('Timepoint not found');

    const baselineTimepoint = study.studies.find(s => s.id === study.baselineStudyId);
    if (!baselineTimepoint) throw new Error('Baseline not set');

    // Get measurements for this timepoint
    const currentMeasurements = study.targetLesions
      .map(l => l.measurements.find(m => m.timepointId === timepointId))
      .filter((m): m is LesionMeasurement => m !== undefined);

    const baselineMeasurements = study.targetLesions
      .map(l => l.measurements.find(m => m.timepointId === study.baselineStudyId))
      .filter((m): m is LesionMeasurement => m !== undefined);

    // Calculate sum of diameters
    const currentSum = currentMeasurements.reduce((sum, m) => sum + m.longAxis, 0);
    const baselineSum = baselineMeasurements.reduce((sum, m) => sum + m.longAxis, 0);

    // Find nadir (lowest sum)
    const allAssessments = study.assessments.filter(
      a => new Date(a.date) < timepoint.studyDate
    );
    const nadir = allAssessments.length > 0
      ? Math.min(...allAssessments.map(a => a.targetLesions.sumOfDiameters), baselineSum)
      : baselineSum;

    // Calculate percent changes
    const percentChangeFromBaseline = baselineSum > 0 
      ? ((currentSum - baselineSum) / baselineSum) * 100 
      : 0;
    const percentChangeFromNadir = nadir > 0 
      ? ((currentSum - nadir) / nadir) * 100 
      : 0;

    // Determine response category
    let response: ResponseCategory;
    if (currentSum === 0 && currentMeasurements.length > 0) {
      response = 'CR';
    } else if (percentChangeFromBaseline <= RECIST_THRESHOLDS.PR_THRESHOLD) {
      response = 'PR';
    } else if (
      percentChangeFromNadir >= RECIST_THRESHOLDS.PD_THRESHOLD && 
      (currentSum - nadir) >= RECIST_THRESHOLDS.PD_ABSOLUTE_INCREASE
    ) {
      response = 'PD';
    } else {
      response = 'SD';
    }

    // Check for new lesions (placeholder - would need actual detection)
    const newLesions = study.targetLesions.filter(l => l.status === 'new');
    const hasNewLesions = newLesions.some(l => 
      l.measurements.some(m => m.timepointId === timepointId)
    );

    // If new lesions, it's PD
    if (hasNewLesions) {
      response = 'PD';
    }

    const assessment: RECISTAssessment = {
      id: `assessment-${timepointId}`,
      timepointId,
      date: timepoint.studyDate,
      targetLesions: {
        sumOfDiameters: currentSum,
        percentChangeFromBaseline,
        percentChangeFromNadir,
        nadir,
        response,
      },
      nonTargetLesions: {
        status: 'Non-CR/Non-PD',
        progression: false,
      },
      newLesions: {
        present: hasNewLesions,
        count: hasNewLesions ? 1 : 0,
        locations: [],
      },
      overallResponse: response,
      reasoning: `Sum of target lesion diameters: ${currentSum.toFixed(1)}mm (${percentChangeFromBaseline >= 0 ? '+' : ''}${percentChangeFromBaseline.toFixed(1)}% from baseline)`,
      isBestResponse: false,
    };

    // Add to study
    setStudy(prev => {
      if (!prev) return prev;
      const existingIndex = prev.assessments.findIndex(a => a.timepointId === timepointId);
      const assessments = existingIndex >= 0
        ? prev.assessments.map((a, i) => i === existingIndex ? assessment : a)
        : [...prev.assessments, assessment];
      
      return {
        ...prev,
        assessments,
        updatedAt: new Date(),
      };
    });

    return assessment;
  }, [study]);

  // Load demo data
  const loadDemoData = useCallback(() => {
    setIsLoading(true);
    
    // Generate synthetic longitudinal data
    const demoStudy = generateDemoStudy();
    setStudy(demoStudy);
    
    setIsLoading(false);
  }, []);

  return {
    study,
    timepoints,
    lesions,
    assessments,
    progressionSummary,
    initializeStudy,
    addTimepoint,
    removeTimepoint,
    setBaseline,
    addLesion,
    removeLesion,
    addMeasurement,
    calculateAssessment,
    loadDemoData,
    isLoading,
    error,
  };
}

// ============================================================================
// Demo Data Generator
// ============================================================================

function generateDemoStudy(): LongitudinalStudy {
  const patientId = 'demo-patient-001';
  const baseDate = new Date('2025-01-15');
  
  // Define timepoint configurations
  const timepointConfigs: SyntheticTimepointConfig[] = [
    { date: new Date('2025-01-15'), label: 'Baseline', percentChangeFromBaseline: 0 },
    { date: new Date('2025-03-12'), label: 'Week 8', percentChangeFromBaseline: -16 },
    { date: new Date('2025-05-07'), label: 'Week 16', percentChangeFromBaseline: -32 },
    { date: new Date('2025-07-02'), label: 'Week 24', percentChangeFromBaseline: -35 },
  ];

  // Create timepoints
  const studies: ImagingTimepoint[] = timepointConfigs.map((config, index) => ({
    id: `tp-${index}`,
    studyDate: config.date,
    studyInstanceUID: `1.2.3.4.5.${index}`,
    modality: 'CT',
    bodyPart: 'CHEST-ABDOMEN',
    series: [
      {
        seriesInstanceUID: `1.2.3.4.5.${index}.1`,
        seriesNumber: 1,
        seriesDescription: 'Axial 5mm',
        modality: 'CT',
        sliceCount: 100,
        sliceThickness: 5,
      }
    ],
    isBaseline: index === 0,
    timepoint: index === 0 ? 'baseline' : 'follow-up',
    daysFromBaseline: Math.floor((config.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)),
    treatmentContext: index === 0 ? 'Pre-treatment' : `Post-Cycle ${Math.ceil(index * 2)}`,
    totalSlices: 100,
  }));

  // Create target lesions with measurements
  const baselineMeasurements = [25, 18, 12]; // mm
  const lesions: TrackedLesion[] = [
    {
      id: 'lesion-1',
      name: 'Liver lesion 1',
      location: 'Segment 7',
      organ: 'Liver',
      isLymphNode: false,
      status: 'target',
      color: '#3B82F6',
      measurements: timepointConfigs.map((config, tpIndex) => ({
        id: `m-1-${tpIndex}`,
        timepointId: `tp-${tpIndex}`,
        date: config.date,
        longAxis: Math.round(baselineMeasurements[0] * (1 + config.percentChangeFromBaseline / 100)),
        sliceNumber: 45,
        annotationCoords: [{ x: 150, y: 120 }, { x: 175, y: 120 }],
        measuredBy: 'ai' as const,
        confidence: 0.92,
      })),
    },
    {
      id: 'lesion-2',
      name: 'Lung nodule RLL',
      location: 'Right lower lobe',
      organ: 'Lung',
      isLymphNode: false,
      status: 'target',
      color: '#10B981',
      measurements: timepointConfigs.map((config, tpIndex) => ({
        id: `m-2-${tpIndex}`,
        timepointId: `tp-${tpIndex}`,
        date: config.date,
        longAxis: Math.round(baselineMeasurements[1] * (1 + config.percentChangeFromBaseline / 100)),
        sliceNumber: 62,
        annotationCoords: [{ x: 200, y: 180 }, { x: 218, y: 180 }],
        measuredBy: 'ai' as const,
        confidence: 0.88,
      })),
    },
    {
      id: 'lesion-3',
      name: 'Mediastinal LN',
      location: 'Station 7',
      organ: 'Lymph node',
      isLymphNode: true,
      status: 'target',
      color: '#F59E0B',
      measurements: timepointConfigs.map((config, tpIndex) => ({
        id: `m-3-${tpIndex}`,
        timepointId: `tp-${tpIndex}`,
        date: config.date,
        longAxis: Math.round(baselineMeasurements[2] * (1 + config.percentChangeFromBaseline / 100)),
        shortAxis: Math.round(baselineMeasurements[2] * 0.8 * (1 + config.percentChangeFromBaseline / 100)),
        sliceNumber: 38,
        annotationCoords: [{ x: 128, y: 90 }, { x: 140, y: 90 }],
        measuredBy: 'ai' as const,
        confidence: 0.85,
      })),
    },
  ];

  // Calculate assessments
  const baselineSum = baselineMeasurements.reduce((a, b) => a + b, 0);
  const assessments: RECISTAssessment[] = timepointConfigs.map((config, index) => {
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
      date: config.date,
      targetLesions: {
        sumOfDiameters: currentSum,
        percentChangeFromBaseline: percentChange,
        percentChangeFromNadir: index === 0 ? 0 : percentChange,
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
      isBestResponse: index === timepointConfigs.length - 1,
    };
  });

  return {
    id: `study-demo-${Date.now()}`,
    patientId,
    studies,
    baselineStudyId: 'tp-0',
    targetLesions: lesions,
    assessments,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
