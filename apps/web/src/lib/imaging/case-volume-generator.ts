/**
 * Case-Specific Volume Generator
 * Generates realistic synthetic CT/MRI volumes with tumors and GT segmentation masks
 */

import { getCaseImagingConfig, getDefaultImagingConfig, TumorConfig, CaseImagingConfig } from './case-imaging-config';

export interface VolumeMetadata {
  shape: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  modality: 'CT' | 'MRI';
  bodyPart: string;
  seriesDescription: string;
}

export interface CaseVolume {
  data: Float32Array;
  tumorMask: Uint8Array; // Binary mask for all tumors/lesions
  metadata: VolumeMetadata;
  defaultWindow: { center: number; width: number };
  getSlice: (axis: 'axial' | 'sagittal' | 'coronal', index: number) => Float32Array;
  getTumorMaskSlice: (axis: 'axial' | 'sagittal' | 'coronal', index: number) => Uint8Array;
  getSliceAsImageData: (
    axis: 'axial' | 'sagittal' | 'coronal',
    index: number,
    windowCenter: number,
    windowWidth: number,
    showTumorOverlay?: boolean
  ) => ImageData;
}

// Intensity values
const HU = {
  AIR: -1000, LUNG: -500, FAT: -100, WATER: 0,
  SOFT_TISSUE: 40, BLOOD: 45, MUSCLE: 50, LIVER: 60,
  KIDNEY: 30, SPLEEN: 45, PANCREAS: 40,
  BONE_CANCELLOUS: 300, BONE_CORTICAL: 1000,
  BRAIN_GM: 37, BRAIN_WM: 30, CSF: 5,
  TUMOR_SOFT: 55, TUMOR_NECROSIS: 20, TUMOR_ENHANCED: 80,
};

// MRI intensities (T1 post-contrast approximate)
const MRI = {
  CSF: 100, BRAIN_WM: 600, BRAIN_GM: 500,
  TUMOR_SOLID: 750, TUMOR_NECROSIS: 200, TUMOR_ENHANCED: 900,
  EDEMA: 350, FAT: 800, BONE: 50,
};

// Seeded random for reproducibility
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Smooth noise
function smoothNoise(x: number, y: number, z: number): number {
  const intX = Math.floor(x), intY = Math.floor(y), intZ = Math.floor(z);
  const fracX = x - intX, fracY = y - intY, fracZ = z - intZ;
  
  const noise = (ix: number, iy: number, iz: number) => {
    const n = ix + iy * 57 + iz * 113;
    const seed = (n * 15731 + 789221) * n + 1376312589;
    return ((seed & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  };
  
  const v000 = noise(intX, intY, intZ);
  const v100 = noise(intX + 1, intY, intZ);
  const v010 = noise(intX, intY + 1, intZ);
  const v110 = noise(intX + 1, intY + 1, intZ);
  const v001 = noise(intX, intY, intZ + 1);
  const v101 = noise(intX + 1, intY, intZ + 1);
  const v011 = noise(intX, intY + 1, intZ + 1);
  const v111 = noise(intX + 1, intY + 1, intZ + 1);
  
  const v00 = v000 * (1 - fracX) + v100 * fracX;
  const v10 = v010 * (1 - fracX) + v110 * fracX;
  const v01 = v001 * (1 - fracX) + v101 * fracX;
  const v11 = v011 * (1 - fracX) + v111 * fracX;
  
  const v0 = v00 * (1 - fracY) + v10 * fracY;
  const v1 = v01 * (1 - fracY) + v11 * fracY;
  
  return v0 * (1 - fracZ) + v1 * fracZ;
}

// Ellipsoid SDF
function ellipsoidSDF(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): number {
  const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1;
}

// Cylinder SDF
function cylinderSDF(x: number, y: number, cx: number, cy: number, radius: number): number {
  const dx = x - cx, dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

// Smoothstep
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generate CT Thorax volume
 */
function generateThoraxCT(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  const cx = width / 2, cy = height / 2, cz = depth / 2;
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let hu = HU.AIR;
        
        // Body outline
        const bodyDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.4, height * 0.35, depth * 0.45);
        
        if (bodyDist < 0) {
          hu = HU.SOFT_TISSUE + smoothNoise(x * 0.1, y * 0.1, z * 0.1) * 15;
          
          // Lungs
          const rightLungDist = ellipsoidSDF(x, y, z, cx + width * 0.14, cy, cz, width * 0.14, height * 0.22, depth * 0.38);
          const leftLungDist = ellipsoidSDF(x, y, z, cx - width * 0.14, cy, cz, width * 0.14, height * 0.22, depth * 0.38);
          
          if (rightLungDist < 0 || leftLungDist < 0) {
            hu = HU.LUNG + smoothNoise(x * 0.2, y * 0.2, z * 0.2) * 80;
            // Pulmonary vessels
            if (Math.abs(smoothNoise(x * 0.05, y * 0.05, z * 0.1)) > 0.65) {
              hu = HU.BLOOD + 15;
            }
          }
          
          // Heart
          const heartDist = ellipsoidSDF(x, y, z, cx - width * 0.06, cy + height * 0.04, cz, width * 0.12, height * 0.14, depth * 0.25);
          if (heartDist < 0) {
            hu = HU.BLOOD + 10 + smoothNoise(x * 0.15, y * 0.15, z * 0.15) * 20;
          }
          
          // Spine
          const spineDist = cylinderSDF(x, y, cx, cy + height * 0.25, width * 0.06);
          if (spineDist < 0 && z > depth * 0.1 && z < depth * 0.9) {
            hu = spineDist > -width * 0.015 ? HU.BONE_CORTICAL : HU.BONE_CANCELLOUS;
          }
          
          // Ribs
          for (let ribZ = depth * 0.15; ribZ < depth * 0.85; ribZ += depth * 0.12) {
            const rightRibDist = ellipsoidSDF(x, y, z, cx + width * 0.28, cy + height * 0.12, ribZ, width * 0.03, height * 0.16, depth * 0.04);
            const leftRibDist = ellipsoidSDF(x, y, z, cx - width * 0.28, cy + height * 0.12, ribZ, width * 0.03, height * 0.16, depth * 0.04);
            if (rightRibDist < 0 || leftRibDist < 0) hu = HU.BONE_CORTICAL;
          }
          
          // Blend body edge
          if (bodyDist > -5) hu = hu * (1 - smoothstep(-5, 0, bodyDist)) + HU.AIR * smoothstep(-5, 0, bodyDist);
        }
        
        data[idx] = hu;
      }
    }
  }
  
  // Add tumors from config
  addTumorsToVolume(data, mask, width, height, depth, config, HU.TUMOR_SOFT, HU.TUMOR_NECROSIS);
  
  return { data, mask };
}

/**
 * Generate Brain MRI volume
 */
function generateBrainMRI(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  const cx = width / 2, cy = height / 2, cz = depth / 2;
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let intensity = 0;
        
        // Skull (outer)
        const skullOuterDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.42, height * 0.45, depth * 0.42);
        const skullInnerDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.38, height * 0.41, depth * 0.38);
        
        if (skullOuterDist < 0 && skullInnerDist >= 0) {
          intensity = MRI.BONE; // Skull
        } else if (skullInnerDist < 0) {
          // Inside brain
          // Gray matter (cortex)
          const cortexDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.36, height * 0.39, depth * 0.36);
          
          if (cortexDist > -width * 0.03) {
            intensity = MRI.BRAIN_GM + smoothNoise(x * 0.2, y * 0.2, z * 0.2) * 50;
          } else {
            // White matter
            intensity = MRI.BRAIN_WM + smoothNoise(x * 0.15, y * 0.15, z * 0.15) * 40;
          }
          
          // Ventricles (CSF)
          const latVentRightDist = ellipsoidSDF(x, y, z, cx + width * 0.06, cy + height * 0.05, cz, width * 0.04, height * 0.12, depth * 0.15);
          const latVentLeftDist = ellipsoidSDF(x, y, z, cx - width * 0.06, cy + height * 0.05, cz, width * 0.04, height * 0.12, depth * 0.15);
          const thirdVentDist = ellipsoidSDF(x, y, z, cx, cy + height * 0.08, cz, width * 0.015, height * 0.06, depth * 0.08);
          
          if (latVentRightDist < 0 || latVentLeftDist < 0 || thirdVentDist < 0) {
            intensity = MRI.CSF;
          }
          
          // Deep gray matter structures
          const thalamusDist = ellipsoidSDF(x, y, z, cx, cy + height * 0.05, cz, width * 0.06, height * 0.04, depth * 0.06);
          if (thalamusDist < 0) {
            intensity = MRI.BRAIN_GM + 30;
          }
        }
        
        data[idx] = intensity;
      }
    }
  }
  
  // Add tumors with edema for brain
  addBrainTumorsToVolume(data, mask, width, height, depth, config);
  
  return { data, mask };
}

/**
 * Generate Abdomen CT volume
 */
function generateAbdomenCT(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  const cx = width / 2, cy = height / 2, cz = depth / 2;
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let hu = HU.AIR;
        
        // Body outline
        const bodyDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.42, height * 0.38, depth * 0.45);
        
        if (bodyDist < 0) {
          hu = HU.SOFT_TISSUE + smoothNoise(x * 0.1, y * 0.1, z * 0.1) * 12;
          
          // Liver (right upper)
          const liverDist = ellipsoidSDF(x, y, z, cx + width * 0.12, cy - height * 0.05, cz + depth * 0.15, width * 0.18, height * 0.12, depth * 0.2);
          if (liverDist < 0) {
            hu = HU.LIVER + smoothNoise(x * 0.12, y * 0.12, z * 0.12) * 15;
          }
          
          // Spleen (left upper)
          const spleenDist = ellipsoidSDF(x, y, z, cx - width * 0.22, cy - height * 0.02, cz + depth * 0.2, width * 0.06, height * 0.08, depth * 0.1);
          if (spleenDist < 0) {
            hu = HU.SPLEEN + smoothNoise(x * 0.15, y * 0.15, z * 0.15) * 10;
          }
          
          // Kidneys
          const rightKidneyDist = ellipsoidSDF(x, y, z, cx + width * 0.18, cy + height * 0.1, cz, width * 0.05, height * 0.1, depth * 0.12);
          const leftKidneyDist = ellipsoidSDF(x, y, z, cx - width * 0.18, cy + height * 0.1, cz, width * 0.05, height * 0.1, depth * 0.12);
          if (rightKidneyDist < 0 || leftKidneyDist < 0) {
            hu = HU.KIDNEY + 20 + smoothNoise(x * 0.2, y * 0.2, z * 0.2) * 15;
          }
          
          // Aorta
          const aortaDist = cylinderSDF(x, y, cx + width * 0.02, cy + height * 0.15, width * 0.03);
          if (aortaDist < 0) hu = HU.BLOOD + 35;
          
          // Spine
          const spineDist = cylinderSDF(x, y, cx, cy + height * 0.28, width * 0.05);
          if (spineDist < 0) {
            hu = spineDist > -width * 0.012 ? HU.BONE_CORTICAL : HU.BONE_CANCELLOUS;
          }
          
          // Colon (simplified as tube around periphery)
          const colonRadius = width * 0.03;
          const colonPath = Math.sin(z / depth * Math.PI * 2) * width * 0.15;
          const ascendingColonDist = cylinderSDF(x, y, cx + width * 0.25, cy + colonPath * 0.3, colonRadius);
          if (ascendingColonDist < 0 && z > depth * 0.3 && z < depth * 0.7) {
            hu = HU.SOFT_TISSUE - 10 + smoothNoise(x * 0.3, y * 0.3, z * 0.3) * 20;
          }
          
          // Blend edge
          if (bodyDist > -4) hu = hu * (1 - smoothstep(-4, 0, bodyDist)) + HU.AIR * smoothstep(-4, 0, bodyDist);
        }
        
        data[idx] = hu;
      }
    }
  }
  
  addTumorsToVolume(data, mask, width, height, depth, config, HU.TUMOR_SOFT, HU.TUMOR_NECROSIS);
  
  return { data, mask };
}

/**
 * Generate Pelvis CT volume
 */
function generatePelvisCT(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  const cx = width / 2, cy = height / 2, cz = depth / 2;
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let hu = HU.AIR;
        
        // Body outline (wider for pelvis)
        const bodyDist = ellipsoidSDF(x, y, z, cx, cy, cz, width * 0.45, height * 0.4, depth * 0.45);
        
        if (bodyDist < 0) {
          hu = HU.SOFT_TISSUE + smoothNoise(x * 0.1, y * 0.1, z * 0.1) * 12;
          
          // Bladder
          const bladderDist = ellipsoidSDF(x, y, z, cx, cy - height * 0.05, cz - depth * 0.1, width * 0.08, height * 0.07, depth * 0.08);
          if (bladderDist < 0) {
            hu = HU.WATER + 10;
          }
          
          // Rectum
          const rectumDist = cylinderSDF(x, y, cx, cy + height * 0.12, width * 0.035);
          if (rectumDist < 0 && z > depth * 0.2 && z < depth * 0.6) {
            hu = HU.SOFT_TISSUE - 15 + smoothNoise(x * 0.25, y * 0.25, z * 0.25) * 20;
          }
          
          // Iliac bones
          const rightIliacDist = ellipsoidSDF(x, y, z, cx + width * 0.25, cy + height * 0.05, cz + depth * 0.1, width * 0.12, height * 0.2, depth * 0.25);
          const leftIliacDist = ellipsoidSDF(x, y, z, cx - width * 0.25, cy + height * 0.05, cz + depth * 0.1, width * 0.12, height * 0.2, depth * 0.25);
          if (rightIliacDist < 0 || leftIliacDist < 0) {
            const dist = Math.min(rightIliacDist, leftIliacDist);
            hu = dist > -width * 0.02 ? HU.BONE_CORTICAL : HU.BONE_CANCELLOUS;
          }
          
          // Sacrum
          const sacrumDist = ellipsoidSDF(x, y, z, cx, cy + height * 0.22, cz + depth * 0.15, width * 0.08, height * 0.1, depth * 0.15);
          if (sacrumDist < 0) {
            hu = sacrumDist > -width * 0.015 ? HU.BONE_CORTICAL : HU.BONE_CANCELLOUS;
          }
          
          // Femoral heads
          const rightFemurDist = ellipsoidSDF(x, y, z, cx + width * 0.2, cy + height * 0.05, cz - depth * 0.25, width * 0.055, height * 0.055, depth * 0.055);
          const leftFemurDist = ellipsoidSDF(x, y, z, cx - width * 0.2, cy + height * 0.05, cz - depth * 0.25, width * 0.055, height * 0.055, depth * 0.055);
          if (rightFemurDist < 0 || leftFemurDist < 0) {
            hu = HU.BONE_CORTICAL;
          }
          
          if (bodyDist > -4) hu = hu * (1 - smoothstep(-4, 0, bodyDist)) + HU.AIR * smoothstep(-4, 0, bodyDist);
        }
        
        data[idx] = hu;
      }
    }
  }
  
  addTumorsToVolume(data, mask, width, height, depth, config, HU.TUMOR_SOFT, HU.TUMOR_NECROSIS);
  
  return { data, mask };
}

/**
 * Generate Head/Neck CT volume
 */
function generateHeadNeckCT(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  const cx = width / 2, cy = height / 2, cz = depth / 2;
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let hu = HU.AIR;
        
        // Head outline
        const headDist = ellipsoidSDF(x, y, z, cx, cy, cz + depth * 0.15, width * 0.38, height * 0.42, depth * 0.35);
        // Neck
        const neckDist = cylinderSDF(x, y, cx, cy + height * 0.05, width * 0.15);
        const inNeck = neckDist < 0 && z < depth * 0.35;
        
        if (headDist < 0 || inNeck) {
          hu = HU.SOFT_TISSUE + smoothNoise(x * 0.12, y * 0.12, z * 0.12) * 12;
          
          // Mandible
          if (z > depth * 0.25 && z < depth * 0.5) {
            const mandibleDist = ellipsoidSDF(x, y, z, cx, cy - height * 0.15, cz - depth * 0.1, width * 0.2, height * 0.08, depth * 0.1);
            if (mandibleDist < 0 && mandibleDist > -width * 0.025) {
              hu = HU.BONE_CORTICAL;
            }
          }
          
          // Oral cavity (air)
          const oralCavityDist = ellipsoidSDF(x, y, z, cx, cy - height * 0.08, cz - depth * 0.05, width * 0.12, height * 0.06, depth * 0.08);
          if (oralCavityDist < 0 && z > depth * 0.35 && z < depth * 0.55) {
            hu = HU.AIR;
          }
          
          // Cervical spine
          const cSpineDist = cylinderSDF(x, y, cx, cy + height * 0.22, width * 0.04);
          if (cSpineDist < 0) {
            hu = cSpineDist > -width * 0.01 ? HU.BONE_CORTICAL : HU.BONE_CANCELLOUS;
          }
          
          // Carotid arteries
          const rightCarotidDist = cylinderSDF(x, y, cx + width * 0.08, cy + height * 0.08, width * 0.015);
          const leftCarotidDist = cylinderSDF(x, y, cx - width * 0.08, cy + height * 0.08, width * 0.015);
          if ((rightCarotidDist < 0 || leftCarotidDist < 0) && z < depth * 0.6) {
            hu = HU.BLOOD + 40;
          }
        }
        
        data[idx] = hu;
      }
    }
  }
  
  addTumorsToVolume(data, mask, width, height, depth, config, HU.TUMOR_ENHANCED, HU.TUMOR_NECROSIS);
  
  return { data, mask };
}

/**
 * Add tumors to CT volume with mask
 */
function addTumorsToVolume(
  data: Float32Array, mask: Uint8Array, 
  width: number, height: number, depth: number, 
  config: CaseImagingConfig,
  tumorIntensity: number, necrosisIntensity: number
) {
  const allTumors = [...config.tumors, ...(config.metastases || [])];
  
  for (const tumor of allTumors) {
    const tcx = tumor.location.x * width;
    const tcy = tumor.location.y * height;
    const tcz = tumor.location.z * depth;
    const trx = tumor.size.rx * width;
    const try_ = tumor.size.ry * height;
    const trz = tumor.size.rz * depth;
    
    for (let z = Math.floor(tcz - trz - 5); z <= Math.ceil(tcz + trz + 5); z++) {
      for (let y = Math.floor(tcy - try_ - 5); y <= Math.ceil(tcy + try_ + 5); y++) {
        for (let x = Math.floor(tcx - trx - 5); x <= Math.ceil(tcx + trx + 5); x++) {
          if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) continue;
          
          const idx = z * height * width + y * width + x;
          const dist = ellipsoidSDF(x, y, z, tcx, tcy, tcz, trx, try_, trz);
          
          if (dist < 0) {
            mask[idx] = 1; // Mark as tumor
            
            // Tumor with optional necrosis
            const necrosisDist = dist / (tumor.necrosis || 0.01);
            if (necrosisDist > -0.5 && tumor.necrosis) {
              data[idx] = necrosisIntensity + smoothNoise(x * 0.3, y * 0.3, z * 0.3) * 15;
            } else {
              let intensity = tumor.intensity || tumorIntensity;
              intensity += smoothNoise(x * 0.25, y * 0.25, z * 0.25) * 20 * (tumor.heterogeneity || 0.5);
              
              // Rim enhancement
              if (tumor.enhancement && dist > -3) {
                intensity += 30 * tumor.enhancement;
              }
              
              data[idx] = intensity;
            }
            
            // Spiculated edges
            if (tumor.spiculated && dist > -2) {
              if (smoothNoise(x * 0.4, y * 0.4, z * 0.4) > 0.3) {
                mask[idx] = 0;
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Add brain tumors with edema
 */
function addBrainTumorsToVolume(
  data: Float32Array, mask: Uint8Array,
  width: number, height: number, depth: number,
  config: CaseImagingConfig
) {
  for (const tumor of config.tumors) {
    const tcx = tumor.location.x * width;
    const tcy = tumor.location.y * height;
    const tcz = tumor.location.z * depth;
    const trx = tumor.size.rx * width;
    const try_ = tumor.size.ry * height;
    const trz = tumor.size.rz * depth;
    
    // Edema extends 1.5x tumor size
    const edemaRx = trx * 1.5, edemaRy = try_ * 1.5, edemaRz = trz * 1.5;
    
    for (let z = Math.floor(tcz - edemaRz - 5); z <= Math.ceil(tcz + edemaRz + 5); z++) {
      for (let y = Math.floor(tcy - edemaRy - 5); y <= Math.ceil(tcy + edemaRy + 5); y++) {
        for (let x = Math.floor(tcx - edemaRx - 5); x <= Math.ceil(tcx + edemaRx + 5); x++) {
          if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) continue;
          
          const idx = z * height * width + y * width + x;
          const tumorDist = ellipsoidSDF(x, y, z, tcx, tcy, tcz, trx, try_, trz);
          const edemaDist = ellipsoidSDF(x, y, z, tcx, tcy, tcz, edemaRx, edemaRy, edemaRz);
          
          if (tumorDist < 0) {
            mask[idx] = 1;
            
            // Necrotic center
            const necrosisDist = tumorDist / (tumor.necrosis || 0.01);
            if (necrosisDist > -0.4 && tumor.necrosis) {
              data[idx] = MRI.TUMOR_NECROSIS + smoothNoise(x * 0.3, y * 0.3, z * 0.3) * 30;
            } else if (tumor.enhancement && tumorDist > -4) {
              // Enhancing rim
              data[idx] = MRI.TUMOR_ENHANCED + smoothNoise(x * 0.2, y * 0.2, z * 0.2) * 50;
            } else {
              data[idx] = MRI.TUMOR_SOLID + smoothNoise(x * 0.25, y * 0.25, z * 0.25) * 60 * (tumor.heterogeneity || 0.5);
            }
          } else if (edemaDist < 0) {
            // Surrounding edema (not marked in mask - only tumor is)
            const edemaBlend = smoothstep(-1, 0, edemaDist);
            data[idx] = MRI.EDEMA * (1 - edemaBlend) + data[idx] * edemaBlend;
          }
        }
      }
    }
  }
}

/**
 * Main function to generate case-specific volume
 */
export function generateCaseVolume(caseId: string, width: number = 256, height: number = 256, depth: number = 100): CaseVolume {
  const config = getCaseImagingConfig(caseId) || getDefaultImagingConfig();
  
  let volumeData: { data: Float32Array; mask: Uint8Array };
  
  switch (config.volumeType) {
    case 'mri_brain':
      volumeData = generateBrainMRI(width, height, depth, config);
      break;
    case 'ct_abdomen':
      volumeData = generateAbdomenCT(width, height, depth, config);
      break;
    case 'ct_pelvis':
      volumeData = generatePelvisCT(width, height, depth, config);
      break;
    case 'ct_head_neck':
      volumeData = generateHeadNeckCT(width, height, depth, config);
      break;
    case 'ct_thorax':
    default:
      volumeData = generateThoraxCT(width, height, depth, config);
      break;
  }
  
  const { data, mask } = volumeData;
  
  const metadata: VolumeMetadata = {
    shape: [depth, height, width],
    spacing: [3.0, 1.0, 1.0],
    origin: [0, 0, 0],
    modality: config.modality,
    bodyPart: config.bodyPart,
    seriesDescription: config.seriesDescription,
  };
  
  // Slice extraction helpers
  const getSlice = (axis: 'axial' | 'sagittal' | 'coronal', index: number): Float32Array => {
    let sliceData: Float32Array;
    switch (axis) {
      case 'axial':
        sliceData = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            sliceData[y * width + x] = data[index * height * width + y * width + x];
          }
        }
        break;
      case 'sagittal':
        sliceData = new Float32Array(depth * height);
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            sliceData[z * height + y] = data[z * height * width + y * width + index];
          }
        }
        break;
      case 'coronal':
        sliceData = new Float32Array(depth * width);
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            sliceData[z * width + x] = data[z * height * width + index * width + x];
          }
        }
        break;
    }
    return sliceData;
  };
  
  const getTumorMaskSlice = (axis: 'axial' | 'sagittal' | 'coronal', index: number): Uint8Array => {
    let sliceData: Uint8Array;
    switch (axis) {
      case 'axial':
        sliceData = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            sliceData[y * width + x] = mask[index * height * width + y * width + x];
          }
        }
        break;
      case 'sagittal':
        sliceData = new Uint8Array(depth * height);
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            sliceData[z * height + y] = mask[z * height * width + y * width + index];
          }
        }
        break;
      case 'coronal':
        sliceData = new Uint8Array(depth * width);
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            sliceData[z * width + x] = mask[z * height * width + index * width + x];
          }
        }
        break;
    }
    return sliceData;
  };
  
  const getSliceAsImageData = (
    axis: 'axial' | 'sagittal' | 'coronal',
    index: number,
    windowCenter: number,
    windowWidth: number,
    showTumorOverlay: boolean = false
  ): ImageData => {
    const sliceData = getSlice(axis, index);
    const maskData = showTumorOverlay ? getTumorMaskSlice(axis, index) : null;
    
    let sliceWidth: number, sliceHeight: number;
    switch (axis) {
      case 'axial': sliceWidth = width; sliceHeight = height; break;
      case 'sagittal': sliceWidth = height; sliceHeight = depth; break;
      case 'coronal': sliceWidth = width; sliceHeight = depth; break;
    }
    
    const imageData = new ImageData(sliceWidth, sliceHeight);
    const minVal = windowCenter - windowWidth / 2;
    const maxVal = windowCenter + windowWidth / 2;
    
    for (let i = 0; i < sliceData.length; i++) {
      const val = sliceData[i];
      let normalized = (val - minVal) / (maxVal - minVal);
      normalized = Math.max(0, Math.min(1, normalized));
      const gray = Math.round(normalized * 255);
      
      const pixelIdx = i * 4;
      
      if (maskData && maskData[i] === 1) {
        // Tumor pixel - tint with red overlay
        imageData.data[pixelIdx] = Math.min(255, gray + 80);     // R - boosted
        imageData.data[pixelIdx + 1] = Math.floor(gray * 0.7);   // G - reduced
        imageData.data[pixelIdx + 2] = Math.floor(gray * 0.7);   // B - reduced
      } else {
        imageData.data[pixelIdx] = gray;
        imageData.data[pixelIdx + 1] = gray;
        imageData.data[pixelIdx + 2] = gray;
      }
      imageData.data[pixelIdx + 3] = 255;
    }
    
    // Draw contour if showing overlay
    if (maskData) {
      drawTumorContour(imageData, maskData, sliceWidth, sliceHeight);
    }
    
    return imageData;
  };
  
  return {
    data,
    tumorMask: mask,
    metadata,
    defaultWindow: config.defaultWindow,
    getSlice,
    getTumorMaskSlice,
    getSliceAsImageData,
  };
}

/**
 * Draw red contour around tumor mask
 */
function drawTumorContour(imageData: ImageData, mask: Uint8Array, width: number, height: number) {
  const contourColor = { r: 255, g: 50, b: 50 }; // Bright red
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (mask[idx] === 1) {
        // Check if this is a boundary pixel
        const isEdge = 
          mask[idx - 1] === 0 || mask[idx + 1] === 0 ||
          mask[idx - width] === 0 || mask[idx + width] === 0 ||
          mask[idx - width - 1] === 0 || mask[idx - width + 1] === 0 ||
          mask[idx + width - 1] === 0 || mask[idx + width + 1] === 0;
        
        if (isEdge) {
          const pixelIdx = idx * 4;
          imageData.data[pixelIdx] = contourColor.r;
          imageData.data[pixelIdx + 1] = contourColor.g;
          imageData.data[pixelIdx + 2] = contourColor.b;
        }
      }
    }
  }
}

/**
 * Get slice dimensions
 */
export function getSliceDimensions(
  metadata: VolumeMetadata,
  axis: 'axial' | 'sagittal' | 'coronal'
): { width: number; height: number; maxSlice: number } {
  const [depth, height, width] = metadata.shape;
  switch (axis) {
    case 'axial': return { width, height, maxSlice: depth - 1 };
    case 'sagittal': return { width: height, height: depth, maxSlice: width - 1 };
    case 'coronal': return { width, height: depth, maxSlice: height - 1 };
  }
}
