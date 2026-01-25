/**
 * RECIST 1.1 Calculator
 * 
 * Response Evaluation Criteria In Solid Tumors (RECIST) version 1.1
 * 
 * Target Lesion Criteria:
 * - Maximum 5 total lesions (max 2 per organ)
 * - Measurable: >=10mm longest diameter (>=15mm short axis for lymph nodes)
 * 
 * Response Categories:
 * - CR (Complete Response): Disappearance of all target lesions
 * - PR (Partial Response): >=30% decrease in sum of diameters from baseline
 * - PD (Progressive Disease): >=20% increase from nadir AND >=5mm absolute increase
 * - SD (Stable Disease): Neither PR nor PD criteria met
 */

import {
  TargetLesion,
  LesionMeasurement,
  RECISTAssessment,
  Measurement
} from "@/types/imaging";

export interface RECISTInput {
  targetLesions: TargetLesion[];
  currentDate: Date;
  newLesionsDetected: boolean;
  nonTargetProgression: boolean;
}

export interface RECISTCalculationResult {
  assessment: RECISTAssessment;
  details: {
    targetLesionDetails: {
      lesionId: string;
      location: string;
      baselineSize: number;
      currentSize: number;
      percentChange: number;
    }[];
    sumCalculation: {
      baseline: number;
      nadir: number;
      current: number;
    };
  };
}

/**
 * Calculate RECIST 1.1 response assessment
 */
export function calculateRECISTResponse(input: RECISTInput): RECISTCalculationResult {
  const { targetLesions, currentDate, newLesionsDetected, nonTargetProgression } = input;

  if (targetLesions.length === 0) {
    return {
      assessment: {
        id: `recist-${Date.now()}`,
        baselineDate: new Date(),
        currentDate,
        baselineSum: 0,
        currentSum: 0,
        nadirSum: 0,
        percentChangeFromBaseline: 0,
        percentChangeFromNadir: 0,
        response: 'NE',
        reasoning: 'No target lesions available for assessment',
        newLesions: newLesionsDetected,
        nonTargetProgression,
        overallResponse: newLesionsDetected ? 'PD' : 'NE',
      },
      details: {
        targetLesionDetails: [],
        sumCalculation: { baseline: 0, nadir: 0, current: 0 },
      },
    };
  }

  // Get baseline measurements (first measurement for each lesion)
  const baselineMeasurements = targetLesions.map(lesion => {
    const baseline = lesion.measurements[0];
    return {
      lesionId: lesion.id,
      location: lesion.location,
      // For lymph nodes, use short axis; for others, use long axis
      diameter: lesion.isLymphNode ? (baseline.shortAxis || baseline.longAxis) : baseline.longAxis,
    };
  });

  // Get current measurements (closest to currentDate)
  const currentMeasurements = targetLesions.map(lesion => {
    // Find measurement closest to current date
    const sortedByDate = [...lesion.measurements].sort((a, b) => 
      Math.abs(new Date(b.date).getTime() - currentDate.getTime()) -
      Math.abs(new Date(a.date).getTime() - currentDate.getTime())
    );
    const current = sortedByDate[0];
    
    return {
      lesionId: lesion.id,
      location: lesion.location,
      diameter: lesion.isLymphNode ? (current?.shortAxis || current?.longAxis || 0) : (current?.longAxis || 0),
      date: current?.date,
    };
  });

  // Calculate sums
  const baselineSum = baselineMeasurements.reduce((sum, m) => sum + m.diameter, 0);
  const currentSum = currentMeasurements.reduce((sum, m) => sum + m.diameter, 0);

  // Find nadir (lowest sum during treatment)
  const allSums = getAllIntermediateSums(targetLesions);
  const nadirSum = Math.min(...allSums, baselineSum);

  // Calculate percent changes
  const percentChangeFromBaseline = baselineSum > 0 
    ? ((currentSum - baselineSum) / baselineSum) * 100 
    : 0;
  const percentChangeFromNadir = nadirSum > 0 
    ? ((currentSum - nadirSum) / nadirSum) * 100 
    : 0;
  const absoluteChangeFromNadir = currentSum - nadirSum;

  // Check for complete response (all target lesions disappeared)
  const allLesionsDisappeared = checkAllLesionsDisappeared(targetLesions, currentDate);

  // Determine target lesion response
  let targetResponse: RECISTAssessment['response'];
  let reasoning: string;

  if (allLesionsDisappeared) {
    targetResponse = 'CR';
    reasoning = 'Complete disappearance of all target lesions (lymph nodes must be <10mm short axis)';
  } else if (percentChangeFromBaseline <= -30) {
    targetResponse = 'PR';
    reasoning = `${Math.abs(percentChangeFromBaseline).toFixed(1)}% decrease from baseline (>=30% required for PR). Sum: ${baselineSum}mm -> ${currentSum}mm`;
  } else if (percentChangeFromNadir >= 20 && absoluteChangeFromNadir >= 5) {
    targetResponse = 'PD';
    reasoning = `${percentChangeFromNadir.toFixed(1)}% increase from nadir with ${absoluteChangeFromNadir.toFixed(1)}mm absolute increase (>=20% and >=5mm required for PD)`;
  } else {
    targetResponse = 'SD';
    reasoning = `${percentChangeFromBaseline.toFixed(1)}% change from baseline. Does not meet PR criteria (>=30% decrease) or PD criteria (>=20% increase from nadir with >=5mm absolute increase)`;
  }

  // Determine overall response (incorporating new lesions and non-target)
  let overallResponse = targetResponse;
  let additionalReasoning = '';

  if (newLesionsDetected) {
    overallResponse = 'PD';
    additionalReasoning = '. New lesions detected = PD regardless of target lesion response';
  } else if (nonTargetProgression && targetResponse !== 'PD') {
    overallResponse = 'PD';
    additionalReasoning = '. Unequivocal non-target progression = PD';
  }

  // Build detailed lesion comparison
  const targetLesionDetails = baselineMeasurements.map((baseline, idx) => {
    const current = currentMeasurements[idx];
    const percentChange = baseline.diameter > 0
      ? ((current.diameter - baseline.diameter) / baseline.diameter) * 100
      : 0;

    return {
      lesionId: baseline.lesionId,
      location: baseline.location,
      baselineSize: baseline.diameter,
      currentSize: current.diameter,
      percentChange,
    };
  });

  return {
    assessment: {
      id: `recist-${Date.now()}`,
      baselineDate: targetLesions[0].measurements[0].date,
      currentDate,
      baselineSum,
      currentSum,
      nadirSum,
      percentChangeFromBaseline,
      percentChangeFromNadir,
      response: targetResponse,
      reasoning: reasoning + additionalReasoning,
      newLesions: newLesionsDetected,
      nonTargetProgression,
      overallResponse,
    },
    details: {
      targetLesionDetails,
      sumCalculation: {
        baseline: baselineSum,
        nadir: nadirSum,
        current: currentSum,
      },
    },
  };
}

/**
 * Get all intermediate sums for nadir calculation
 */
function getAllIntermediateSums(targetLesions: TargetLesion[]): number[] {
  if (targetLesions.length === 0) return [];

  // Get all unique dates
  const allDates = new Set<string>();
  targetLesions.forEach(lesion => {
    lesion.measurements.forEach(m => {
      allDates.add(new Date(m.date).toISOString().split('T')[0]);
    });
  });

  // Calculate sum for each date
  const sums: number[] = [];
  
  for (const dateStr of allDates) {
    const date = new Date(dateStr);
    let sum = 0;
    
    for (const lesion of targetLesions) {
      // Find measurement closest to this date
      const measurement = lesion.measurements.find(m => 
        new Date(m.date).toISOString().split('T')[0] === dateStr
      );
      
      if (measurement) {
        sum += lesion.isLymphNode 
          ? (measurement.shortAxis || measurement.longAxis)
          : measurement.longAxis;
      }
    }
    
    if (sum > 0) {
      sums.push(sum);
    }
  }

  return sums;
}

/**
 * Check if all target lesions have disappeared (CR criteria)
 */
function checkAllLesionsDisappeared(targetLesions: TargetLesion[], currentDate: Date): boolean {
  for (const lesion of targetLesions) {
    // Find most recent measurement
    const sortedMeasurements = [...lesion.measurements].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latest = sortedMeasurements[0];
    
    if (!latest) return false;

    // For non-lymph node: must be 0mm
    // For lymph node: short axis must be <10mm
    if (lesion.isLymphNode) {
      if ((latest.shortAxis || latest.longAxis) >= 10) {
        return false;
      }
    } else {
      if (latest.longAxis > 0) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Convert measurements from MedGemma to target lesions
 */
export function convertMeasurementsToTargetLesions(
  measurements: Measurement[],
  studyDate: Date,
  studyId: string
): TargetLesion[] {
  // Filter for target-eligible lesions (>= 10mm, or >= 15mm short axis for lymph nodes)
  const targetEligible = measurements.filter(m => {
    const isLymphNode = m.location.toLowerCase().includes('lymph') || 
                        m.location.toLowerCase().includes('node');
    
    if (isLymphNode) {
      return (m.dimensions.short || m.dimensions.long) >= 15;
    }
    return m.dimensions.long >= 10;
  });

  // Limit to 5 total (RECIST requirement)
  const selectedTargets = targetEligible.slice(0, 5);

  return selectedTargets.map(m => {
    const isLymphNode = m.location.toLowerCase().includes('lymph') || 
                        m.location.toLowerCase().includes('node');
    
    // Determine organ from location
    const organ = extractOrganFromLocation(m.location);

    return {
      id: m.lesionId,
      location: m.location,
      organ,
      isLymphNode,
      measurements: [{
        date: studyDate,
        studyId,
        longAxis: m.dimensions.long,
        shortAxis: m.dimensions.short,
        sliceNumber: m.sliceNumber,
      }],
    };
  });
}

/**
 * Extract organ from location string
 */
function extractOrganFromLocation(location: string): string {
  const lower = location.toLowerCase();
  
  const organMappings: [RegExp, string][] = [
    [/lung|pulmonary/, 'Lung'],
    [/liver|hepatic/, 'Liver'],
    [/lymph|node/, 'Lymph Node'],
    [/bone|osseous/, 'Bone'],
    [/brain|cerebr/, 'Brain'],
    [/adrenal/, 'Adrenal'],
    [/kidney|renal/, 'Kidney'],
    [/spleen|splenic/, 'Spleen'],
    [/pancrea/, 'Pancreas'],
    [/pleura/, 'Pleura'],
    [/periton/, 'Peritoneum'],
    [/mediastin/, 'Mediastinum'],
  ];

  for (const [pattern, organ] of organMappings) {
    if (pattern.test(lower)) {
      return organ;
    }
  }

  return 'Other';
}

/**
 * Add follow-up measurements to existing target lesions
 */
export function addFollowUpMeasurements(
  existingLesions: TargetLesion[],
  newMeasurements: Measurement[],
  studyDate: Date,
  studyId: string
): TargetLesion[] {
  return existingLesions.map(lesion => {
    // Find matching measurement in new study
    const matchingMeasurement = findMatchingMeasurement(lesion, newMeasurements);
    
    if (matchingMeasurement) {
      return {
        ...lesion,
        measurements: [
          ...lesion.measurements,
          {
            date: studyDate,
            studyId,
            longAxis: matchingMeasurement.dimensions.long,
            shortAxis: matchingMeasurement.dimensions.short,
            sliceNumber: matchingMeasurement.sliceNumber,
          },
        ],
      };
    }
    
    // If no matching measurement found, lesion may have disappeared (use 0)
    return {
      ...lesion,
      measurements: [
        ...lesion.measurements,
        {
          date: studyDate,
          studyId,
          longAxis: 0,
          shortAxis: 0,
          sliceNumber: -1,
        },
      ],
    };
  });
}

/**
 * Find matching measurement for a target lesion
 */
function findMatchingMeasurement(
  lesion: TargetLesion,
  measurements: Measurement[]
): Measurement | undefined {
  // Try to match by location similarity
  const lesionLocation = lesion.location.toLowerCase();
  
  return measurements.find(m => {
    const mLocation = m.location.toLowerCase();
    
    // Check for significant word overlap
    const lesionWords = lesionLocation.split(/\s+/);
    const mWords = mLocation.split(/\s+/);
    
    const matchingWords = lesionWords.filter(w => 
      mWords.some(mw => mw.includes(w) || w.includes(mw))
    );
    
    // Consider a match if >50% words match
    return matchingWords.length / lesionWords.length > 0.5;
  });
}

/**
 * Format RECIST response for display
 */
export function formatRECISTResponse(response: RECISTAssessment['response']): {
  label: string;
  color: string;
  description: string;
} {
  switch (response) {
    case 'CR':
      return {
        label: 'Complete Response',
        color: 'emerald',
        description: 'Disappearance of all target lesions'
      };
    case 'PR':
      return {
        label: 'Partial Response',
        color: 'blue',
        description: '>=30% decrease in sum of diameters'
      };
    case 'SD':
      return {
        label: 'Stable Disease',
        color: 'yellow',
        description: 'Neither PR nor PD criteria met'
      };
    case 'PD':
      return {
        label: 'Progressive Disease',
        color: 'red',
        description: '>=20% increase from nadir or new lesions'
      };
    case 'NE':
      return {
        label: 'Not Evaluable',
        color: 'gray',
        description: 'Unable to assess response'
      };
  }
}
