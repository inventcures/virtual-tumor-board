/**
 * Case-Specific Imaging Configuration
 * Defines tumor/lesion parameters and volume types for each sample case
 */

export type VolumeType = 'ct_thorax' | 'ct_abdomen' | 'ct_pelvis' | 'mri_brain' | 'ct_head_neck';

export interface TumorConfig {
  location: { x: number; y: number; z: number }; // Normalized 0-1
  size: { rx: number; ry: number; rz: number };  // Radius as fraction of volume
  intensity: number;      // HU for CT or signal intensity for MRI
  heterogeneity: number;  // 0-1, how varied the internal texture is
  necrosis?: number;      // 0-1, central necrosis
  enhancement?: number;   // 0-1, rim enhancement
  spiculated?: boolean;   // Spiculated edges
  infiltrative?: boolean; // Infiltrative vs well-defined
}

export interface LymphNodeConfig {
  location: { x: number; y: number; z: number };
  size: number; // Normalized radius
  suspicious: boolean;
}

export interface CaseImagingConfig {
  caseId: string;
  volumeType: VolumeType;
  modality: 'CT' | 'MRI';
  bodyPart: string;
  seriesDescription: string;
  defaultWindow: { center: number; width: number };
  tumors: TumorConfig[];
  lymphNodes?: LymphNodeConfig[];
  metastases?: TumorConfig[];
  additionalFindings?: string[];
}

/**
 * Imaging configurations for all 10 sample cases
 */
export const CASE_IMAGING_CONFIGS: Record<string, CaseImagingConfig> = {
  // Case 1: Lung NSCLC - Right upper lobe mass with mediastinal nodes
  "lung-nsclc-kras-g12c": {
    caseId: "lung-nsclc-kras-g12c",
    volumeType: "ct_thorax",
    modality: "CT",
    bodyPart: "Chest",
    seriesDescription: "CT Chest with Contrast",
    defaultWindow: { center: -600, width: 1500 },
    tumors: [{
      location: { x: 0.65, y: 0.35, z: 0.55 }, // Right upper lobe
      size: { rx: 0.08, ry: 0.075, rz: 0.08 },
      intensity: 45,
      heterogeneity: 0.6,
      necrosis: 0.2,
      spiculated: true,
    }],
    lymphNodes: [
      { location: { x: 0.55, y: 0.45, z: 0.5 }, size: 0.03, suspicious: true }, // Hilar
      { location: { x: 0.5, y: 0.55, z: 0.45 }, size: 0.025, suspicious: true }, // Subcarinal
    ],
    additionalFindings: ["Emphysematous changes", "Coronary calcifications"],
  },

  // Case 2: Breast Cancer - Left breast mass
  "breast-her2-early": {
    caseId: "breast-her2-early",
    volumeType: "ct_thorax",
    modality: "CT",
    bodyPart: "Chest",
    seriesDescription: "CT Chest/Breast",
    defaultWindow: { center: 40, width: 400 },
    tumors: [{
      location: { x: 0.35, y: 0.25, z: 0.5 }, // Left breast, upper outer
      size: { rx: 0.05, ry: 0.045, rz: 0.04 },
      intensity: 55,
      heterogeneity: 0.4,
      spiculated: false,
    }],
    lymphNodes: [
      { location: { x: 0.25, y: 0.35, z: 0.5 }, size: 0.015, suspicious: false }, // Axillary - not enlarged
    ],
  },

  // Case 3: Colorectal - Ascending colon with liver mets
  "colorectal-msi-h-mets": {
    caseId: "colorectal-msi-h-mets",
    volumeType: "ct_abdomen",
    modality: "CT",
    bodyPart: "Abdomen/Pelvis",
    seriesDescription: "CT Abdomen Pelvis with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [{
      location: { x: 0.7, y: 0.45, z: 0.55 }, // Ascending colon
      size: { rx: 0.06, ry: 0.05, rz: 0.07 },
      intensity: 50,
      heterogeneity: 0.5,
      infiltrative: true,
    }],
    metastases: [
      { location: { x: 0.6, y: 0.35, z: 0.6 }, size: { rx: 0.04, ry: 0.035, rz: 0.04 }, intensity: 35, heterogeneity: 0.3, necrosis: 0 }, // Liver met 1
      { location: { x: 0.55, y: 0.3, z: 0.55 }, size: { rx: 0.025, ry: 0.025, rz: 0.025 }, intensity: 35, heterogeneity: 0.3, necrosis: 0 }, // Liver met 2
      { location: { x: 0.65, y: 0.32, z: 0.52 }, size: { rx: 0.02, ry: 0.02, rz: 0.02 }, intensity: 35, heterogeneity: 0.3, necrosis: 0 }, // Liver met 3
    ],
  },

  // Case 4: Head & Neck - Buccal mucosa with mandibular invasion
  "oral-cavity-locally-advanced": {
    caseId: "oral-cavity-locally-advanced",
    volumeType: "ct_head_neck",
    modality: "CT",
    bodyPart: "Head/Neck",
    seriesDescription: "CT Head Neck with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [{
      location: { x: 0.65, y: 0.45, z: 0.4 }, // Right buccal
      size: { rx: 0.07, ry: 0.06, rz: 0.08 },
      intensity: 55,
      heterogeneity: 0.5,
      infiltrative: true,
      enhancement: 0.7,
    }],
    lymphNodes: [
      { location: { x: 0.7, y: 0.6, z: 0.5 }, size: 0.03, suspicious: true }, // Level II
      { location: { x: 0.65, y: 0.65, z: 0.55 }, size: 0.025, suspicious: true }, // Level III
    ],
    additionalFindings: ["Mandibular cortical erosion"],
  },

  // Case 5: Cervical Cancer - Parametrial invasion
  "cervix-locally-advanced": {
    caseId: "cervix-locally-advanced",
    volumeType: "ct_pelvis",
    modality: "CT",
    bodyPart: "Pelvis",
    seriesDescription: "CT Pelvis with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [{
      location: { x: 0.5, y: 0.55, z: 0.45 }, // Cervix
      size: { rx: 0.08, ry: 0.07, rz: 0.09 },
      intensity: 50,
      heterogeneity: 0.6,
      infiltrative: true,
    }],
    lymphNodes: [
      { location: { x: 0.6, y: 0.45, z: 0.5 }, size: 0.025, suspicious: true }, // Right pelvic
      { location: { x: 0.4, y: 0.45, z: 0.5 }, size: 0.02, suspicious: true }, // Left pelvic
    ],
  },

  // Case 6: Prostate - Bone mets
  "prostate-mcrpc": {
    caseId: "prostate-mcrpc",
    volumeType: "ct_pelvis",
    modality: "CT",
    bodyPart: "Pelvis/Spine",
    seriesDescription: "CT Pelvis Bone Window",
    defaultWindow: { center: 400, width: 1800 },
    tumors: [{
      location: { x: 0.5, y: 0.55, z: 0.4 }, // Prostate
      size: { rx: 0.05, ry: 0.045, rz: 0.05 },
      intensity: 50,
      heterogeneity: 0.4,
    }],
    metastases: [
      // Sclerotic bone mets (high intensity for bone window)
      { location: { x: 0.5, y: 0.75, z: 0.3 }, size: { rx: 0.03, ry: 0.025, rz: 0.03 }, intensity: 800, heterogeneity: 0.2, necrosis: 0 }, // L5 vertebra
      { location: { x: 0.5, y: 0.75, z: 0.5 }, size: { rx: 0.025, ry: 0.02, rz: 0.025 }, intensity: 750, heterogeneity: 0.2, necrosis: 0 }, // Sacrum
      { location: { x: 0.35, y: 0.65, z: 0.55 }, size: { rx: 0.02, ry: 0.02, rz: 0.02 }, intensity: 700, heterogeneity: 0.2, necrosis: 0 }, // Left iliac
    ],
    additionalFindings: ["Diffuse sclerotic bone metastases"],
  },

  // Case 7: Gastric Cancer - Antrum mass
  "gastric-stage-iii": {
    caseId: "gastric-stage-iii",
    volumeType: "ct_abdomen",
    modality: "CT",
    bodyPart: "Abdomen",
    seriesDescription: "CT Abdomen with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [{
      location: { x: 0.55, y: 0.35, z: 0.45 }, // Gastric antrum
      size: { rx: 0.06, ry: 0.05, rz: 0.07 },
      intensity: 55,
      heterogeneity: 0.5,
      infiltrative: true,
    }],
    lymphNodes: [
      { location: { x: 0.5, y: 0.4, z: 0.5 }, size: 0.02, suspicious: true }, // Perigastric
    ],
  },

  // Case 8: Ovarian Cancer - Bilateral masses with peritoneal disease
  "ovarian-brca1-hgsoc": {
    caseId: "ovarian-brca1-hgsoc",
    volumeType: "ct_abdomen",
    modality: "CT",
    bodyPart: "Abdomen/Pelvis",
    seriesDescription: "CT Abdomen Pelvis with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [
      {
        location: { x: 0.6, y: 0.55, z: 0.4 }, // Right ovary
        size: { rx: 0.08, ry: 0.07, rz: 0.09 },
        intensity: 45,
        heterogeneity: 0.7,
        necrosis: 0.3,
      },
      {
        location: { x: 0.4, y: 0.55, z: 0.4 }, // Left ovary
        size: { rx: 0.06, ry: 0.055, rz: 0.065 },
        intensity: 45,
        heterogeneity: 0.6,
        necrosis: 0.2,
      },
    ],
    metastases: [
      { location: { x: 0.5, y: 0.6, z: 0.6 }, size: { rx: 0.03, ry: 0.025, rz: 0.03 }, intensity: 40, heterogeneity: 0.4, necrosis: 0 }, // Peritoneal implant
    ],
    additionalFindings: ["Omental caking", "Moderate ascites"],
  },

  // Case 9: Esophageal Cancer - Distal esophagus/GEJ
  "esophageal-neoadjuvant": {
    caseId: "esophageal-neoadjuvant",
    volumeType: "ct_thorax",
    modality: "CT",
    bodyPart: "Chest/Upper Abdomen",
    seriesDescription: "CT Chest Abdomen with Contrast",
    defaultWindow: { center: 40, width: 350 },
    tumors: [{
      location: { x: 0.5, y: 0.55, z: 0.25 }, // Distal esophagus/GEJ
      size: { rx: 0.04, ry: 0.05, rz: 0.08 },
      intensity: 50,
      heterogeneity: 0.5,
      infiltrative: true,
    }],
    lymphNodes: [
      { location: { x: 0.55, y: 0.5, z: 0.3 }, size: 0.015, suspicious: false }, // Paraesophageal
    ],
  },

  // Case 10: Pediatric GBM - Brain MRI
  "pediatric-gbm-brain": {
    caseId: "pediatric-gbm-brain",
    volumeType: "mri_brain",
    modality: "MRI",
    bodyPart: "Brain",
    seriesDescription: "MRI Brain T1 Post-Contrast",
    defaultWindow: { center: 500, width: 1000 },
    tumors: [{
      location: { x: 0.45, y: 0.55, z: 0.5 }, // Left frontal/parietal
      size: { rx: 0.12, ry: 0.11, rz: 0.10 },
      intensity: 800, // Bright on T1 post-contrast
      heterogeneity: 0.8,
      necrosis: 0.4,
      enhancement: 0.9, // Strong rim enhancement
      infiltrative: true,
    }],
    additionalFindings: ["Surrounding edema", "Midline shift 8mm to right", "Ventricular compression"],
  },
};

/**
 * Get imaging config for a case
 */
export function getCaseImagingConfig(caseId: string): CaseImagingConfig | undefined {
  return CASE_IMAGING_CONFIGS[caseId];
}

/**
 * Get default config for unknown cases
 */
export function getDefaultImagingConfig(): CaseImagingConfig {
  return {
    caseId: "default",
    volumeType: "ct_thorax",
    modality: "CT",
    bodyPart: "Chest",
    seriesDescription: "CT Chest",
    defaultWindow: { center: -600, width: 1500 },
    tumors: [{
      location: { x: 0.6, y: 0.4, z: 0.5 },
      size: { rx: 0.06, ry: 0.055, rz: 0.06 },
      intensity: 50,
      heterogeneity: 0.5,
    }],
  };
}
