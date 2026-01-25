/**
 * CT/MRI Windowing Presets
 * Standard window/level settings for different tissue types
 */

export interface WindowPreset {
  name: string;
  center: number; // Window center (level)
  width: number;  // Window width
  description: string;
}

export const CT_PRESETS: WindowPreset[] = [
  {
    name: 'Lung',
    center: -600,
    width: 1500,
    description: 'Optimized for lung parenchyma and airways',
  },
  {
    name: 'Mediastinum',
    center: 50,
    width: 350,
    description: 'Mediastinal structures, lymph nodes, vessels',
  },
  {
    name: 'Soft Tissue',
    center: 40,
    width: 400,
    description: 'General soft tissue visualization',
  },
  {
    name: 'Bone',
    center: 400,
    width: 1800,
    description: 'Cortical and cancellous bone',
  },
  {
    name: 'Brain',
    center: 40,
    width: 80,
    description: 'Brain parenchyma (narrow window)',
  },
  {
    name: 'Liver',
    center: 60,
    width: 150,
    description: 'Hepatic parenchyma and lesions',
  },
  {
    name: 'Abdomen',
    center: 40,
    width: 350,
    description: 'Abdominal organs',
  },
  {
    name: 'Stroke',
    center: 40,
    width: 40,
    description: 'Ultra-narrow for acute stroke detection',
  },
];

export const MRI_PRESETS: WindowPreset[] = [
  {
    name: 'Default',
    center: 500,
    width: 1000,
    description: 'General MRI viewing',
  },
  {
    name: 'Narrow',
    center: 400,
    width: 400,
    description: 'Enhanced contrast for subtle differences',
  },
  {
    name: 'Wide',
    center: 600,
    width: 1500,
    description: 'Full dynamic range',
  },
];

/**
 * Apply window/level to a pixel value
 */
export function applyWindowing(
  value: number,
  center: number,
  width: number
): number {
  const minValue = center - width / 2;
  const maxValue = center + width / 2;
  
  if (value <= minValue) return 0;
  if (value >= maxValue) return 255;
  
  return Math.round(((value - minValue) / width) * 255);
}

/**
 * Convert raw data to display values using windowing
 */
export function applyWindowingToArray(
  data: Float32Array | number[],
  center: number,
  width: number
): Uint8Array {
  const result = new Uint8Array(data.length);
  const minValue = center - width / 2;
  
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (value <= minValue) {
      result[i] = 0;
    } else if (value >= minValue + width) {
      result[i] = 255;
    } else {
      result[i] = Math.round(((value - minValue) / width) * 255);
    }
  }
  
  return result;
}

/**
 * Auto-window based on histogram
 */
export function autoWindow(data: Float32Array | number[]): { center: number; width: number } {
  // Calculate percentiles
  const sorted = [...data].sort((a, b) => a - b);
  const p5 = sorted[Math.floor(sorted.length * 0.05)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  const width = p95 - p5;
  const center = p5 + width / 2;
  
  return { center, width };
}

// Convenient object format for presets
export const WINDOWING_PRESETS: Record<string, WindowPreset> = {
  lung: CT_PRESETS[0],
  mediastinum: CT_PRESETS[1],
  softTissue: CT_PRESETS[2],
  bone: CT_PRESETS[3],
  brain: CT_PRESETS[4],
  liver: CT_PRESETS[5],
  abdomen: CT_PRESETS[6],
  stroke: CT_PRESETS[7],
};

// Type alias for clarity
export type WindowingPreset = WindowPreset;
