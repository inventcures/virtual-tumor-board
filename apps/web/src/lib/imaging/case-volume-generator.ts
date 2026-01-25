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

// MRI intensities (T1 post-contrast, 0-1000 scale)
const MRI = {
  CSF: 80, 
  BRAIN_WM: 620, 
  BRAIN_GM: 480,
  DEEP_GRAY: 450,
  TUMOR_SOLID: 520, 
  TUMOR_NECROSIS: 120, 
  TUMOR_ENHANCED: 900,
  EDEMA: 350, 
  FAT: 850, 
  BONE: 80,
  DURA: 650,
  SCALP_FAT: 850,
  SCALP_MUSCLE: 400,
  SKULL_CORTEX: 80,
  SKULL_DIPLOE: 700,
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

// Multi-octave noise for more natural patterns
function fbmNoise(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

// Spherical harmonics-like deformation for organic tumor shapes
function sphericalDeformation(theta: number, phi: number, seed: number): number {
  // Create irregular lobulated shape using multiple frequency components
  const rand = seededRandom(seed);
  let deformation = 1;
  
  // Add several lobes at different positions
  const numLobes = 3 + Math.floor(rand() * 4); // 3-6 lobes
  for (let i = 0; i < numLobes; i++) {
    const lobeTheta = rand() * Math.PI * 2;
    const lobePhi = rand() * Math.PI;
    const lobeSize = 0.15 + rand() * 0.25;
    const lobeAmp = 0.2 + rand() * 0.3;
    
    // Angular distance to lobe center
    const cosDist = Math.sin(phi) * Math.sin(lobePhi) * Math.cos(theta - lobeTheta) + 
                    Math.cos(phi) * Math.cos(lobePhi);
    const dist = Math.acos(Math.max(-1, Math.min(1, cosDist)));
    
    // Gaussian-like lobe contribution
    deformation += lobeAmp * Math.exp(-dist * dist / (2 * lobeSize * lobeSize));
  }
  
  // Add high-frequency surface irregularity
  deformation += 0.1 * Math.sin(theta * 5 + seed) * Math.sin(phi * 4);
  deformation += 0.05 * Math.sin(theta * 11 + seed * 2) * Math.sin(phi * 9);
  
  return deformation;
}

// Irregular tumor SDF with lobulation and surface roughness
function irregularTumorSDF(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
  seed: number,
  irregularity: number = 0.5, // 0 = smooth ellipsoid, 1 = very irregular
  lobulation: number = 0.5    // 0 = no lobes, 1 = highly lobulated
): number {
  // Normalize to unit sphere space
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const dz = (z - cz) / rz;
  
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (r < 0.001) return -1; // At center
  
  // Convert to spherical coordinates
  const theta = Math.atan2(dy, dx);
  const phi = Math.acos(Math.max(-1, Math.min(1, dz / r)));
  
  // Get deformation factor based on angle
  const deform = sphericalDeformation(theta, phi, seed);
  
  // Add noise-based surface roughness
  const noiseScale = 0.15 * (rx + ry + rz) / 3;
  const surfaceNoise = fbmNoise(
    x / noiseScale + seed,
    y / noiseScale + seed * 2,
    z / noiseScale + seed * 3,
    3
  );
  
  // Combine base shape with deformations
  const effectiveRadius = 1 * (1 + lobulation * (deform - 1)) * (1 + irregularity * surfaceNoise * 0.3);
  
  return r - effectiveRadius;
}

// Generate spiculations (finger-like projections) for certain tumor types
function addSpiculations(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
  seed: number,
  baseDist: number
): number {
  if (baseDist > 0.5 || baseDist < -0.8) return baseDist; // Only near surface
  
  const rand = seededRandom(seed + 1000);
  const numSpicules = 8 + Math.floor(rand() * 8);
  
  let minDist = baseDist;
  
  for (let i = 0; i < numSpicules; i++) {
    // Random direction for spicule
    const spicTheta = rand() * Math.PI * 2;
    const spicPhi = rand() * Math.PI;
    
    const dirX = Math.sin(spicPhi) * Math.cos(spicTheta);
    const dirY = Math.sin(spicPhi) * Math.sin(spicTheta);
    const dirZ = Math.cos(spicPhi);
    
    // Spicule start point (on surface)
    const startX = cx + dirX * rx;
    const startY = cy + dirY * ry;
    const startZ = cz + dirZ * rz;
    
    // Spicule length and width
    const length = (0.3 + rand() * 0.5) * Math.min(rx, ry, rz);
    const width = 0.05 + rand() * 0.08;
    
    // End point
    const endX = startX + dirX * length;
    const endY = startY + dirY * length;
    const endZ = startZ + dirZ * length;
    
    // Distance to line segment (spicule)
    const t = Math.max(0, Math.min(1,
      ((x - startX) * (endX - startX) + (y - startY) * (endY - startY) + (z - startZ) * (endZ - startZ)) /
      (length * length + 0.001)
    ));
    
    const projX = startX + t * (endX - startX);
    const projY = startY + t * (endY - startY);
    const projZ = startZ + t * (endZ - startZ);
    
    const distToSpic = Math.sqrt(
      (x - projX) * (x - projX) + 
      (y - projY) * (y - projY) + 
      (z - projZ) * (z - projZ)
    );
    
    // Tapered spicule (thinner at tip)
    const taperWidth = width * (1 - t * 0.7);
    const spicDist = distToSpic / Math.max(rx, ry, rz) - taperWidth;
    
    minDist = Math.min(minDist, spicDist);
  }
  
  return minDist;
}

// Create irregular necrotic core
function necroticCoreSDF(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
  necrosisRatio: number,
  seed: number
): number {
  // Necrosis is typically 30-70% of tumor volume, offset from center
  const rand = seededRandom(seed + 2000);
  
  // Offset necrotic center
  const offsetX = (rand() - 0.5) * rx * 0.3;
  const offsetY = (rand() - 0.5) * ry * 0.3;
  const offsetZ = (rand() - 0.5) * rz * 0.3;
  
  const ncx = cx + offsetX;
  const ncy = cy + offsetY;
  const ncz = cz + offsetZ;
  
  // Irregular necrotic region
  return irregularTumorSDF(
    x, y, z,
    ncx, ncy, ncz,
    rx * necrosisRatio * 0.7,
    ry * necrosisRatio * 0.8,
    rz * necrosisRatio * 0.75,
    seed + 3000,
    0.6, // More irregular
    0.4
  );
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
 * Generate realistic Brain MRI volume (T1 post-contrast)
 * Based on proper MRI physics and anatomical accuracy
 */
function generateBrainMRI(width: number, height: number, depth: number, config: CaseImagingConfig): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  // T1 post-contrast signal intensities (normalized 0-1000 scale)
  const T1 = {
    AIR: 0,
    CSF: 80,                  // Dark on T1
    GRAY_MATTER: 480,         // Cortex
    WHITE_MATTER: 620,        // Brighter than GM
    DEEP_GRAY: 450,           // Basal ganglia
    SKULL_CORTEX: 80,         // Dark cortical bone
    SKULL_DIPLOE: 700,        // Bright marrow
    SCALP_FAT: 850,           // Very bright
    SCALP_MUSCLE: 400,
    DURA: 650,                // Enhances
    VESSEL: 750,              // Enhanced vessels
    TUMOR_ENHANCE: 900,       // Ring enhancement
    TUMOR_NECROSIS: 120,      // Dark center
    TUMOR_SOLID: 520,
    EDEMA: 350,               // Hypointense
  };
  
  for (let z = 0; z < depth; z++) {
    const nz = z / depth;  // 0 = inferior slices, 1 = vertex
    
    for (let y = 0; y < height; y++) {
      const ny = y / height;  // 0 = anterior, 1 = posterior
      
      for (let x = 0; x < width; x++) {
        const nx = x / width;  // 0 = right, 1 = left
        const idx = z * height * width + y * width + x;
        
        let signal = T1.AIR;
        
        // Scalp outer boundary
        const scalpDist = ellipsoidSDF(nx, ny, nz, 0.5, 0.52, 0.5, 0.47, 0.48, 0.46);
        // Skull outer
        const skullOuterDist = ellipsoidSDF(nx, ny, nz, 0.5, 0.52, 0.5, 0.44, 0.45, 0.43);
        // Skull inner
        const skullInnerDist = ellipsoidSDF(nx, ny, nz, 0.5, 0.52, 0.5, 0.40, 0.41, 0.39);
        
        // Brain parenchyma boundary  
        const brainDist = ellipsoidSDF(nx, ny, nz, 0.5, 0.52, 0.5, 0.38, 0.39, 0.37);
        
        // === SCALP ===
        if (scalpDist < 0 && skullOuterDist >= 0) {
          const depth_in_scalp = -scalpDist / 0.03;
          if (depth_in_scalp < 0.4) {
            signal = T1.SCALP_MUSCLE + fbmNoise(nx * 15, ny * 15, nz * 12, 2) * 30;
          } else {
            signal = T1.SCALP_FAT + fbmNoise(nx * 12, ny * 12, nz * 10, 2) * 40;
          }
        }
        // === SKULL (3-layer) ===
        else if (skullOuterDist < 0 && skullInnerDist >= 0) {
          const skull_depth = -skullOuterDist / (-skullOuterDist + skullInnerDist + 0.001);
          if (skull_depth < 0.25) {
            signal = T1.SKULL_CORTEX;
          } else if (skull_depth < 0.75) {
            signal = T1.SKULL_DIPLOE + fbmNoise(nx * 10, ny * 10, nz * 8, 2) * 60;
          } else {
            signal = T1.SKULL_CORTEX;
          }
        }
        // === INTRACRANIAL ===
        else if (skullInnerDist < 0) {
          // Subarachnoid CSF
          if (brainDist >= 0 && brainDist < 0.015) {
            signal = T1.CSF + fbmNoise(nx * 20, ny * 20, nz * 15, 2) * 15;
          }
          // Falx cerebri (midline dura)
          else if (Math.abs(nx - 0.5) < 0.006 && brainDist < 0 && nz > 0.25) {
            signal = T1.DURA;
          }
          // Tentorium
          else if (Math.abs(nz - 0.30) < 0.012 && ny > 0.45 && brainDist < 0) {
            signal = T1.DURA;
          }
          // Lateral ventricles
          else if (
            ellipsoidSDF(nx, ny, nz, 0.42, 0.48, 0.52, 0.035, 0.10, 0.14) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.58, 0.48, 0.52, 0.035, 0.10, 0.14) < 0 ||
            // Frontal horns
            ellipsoidSDF(nx, ny, nz, 0.44, 0.40, 0.55, 0.022, 0.035, 0.05) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.56, 0.40, 0.55, 0.022, 0.035, 0.05) < 0 ||
            // Third ventricle
            ellipsoidSDF(nx, ny, nz, 0.50, 0.52, 0.48, 0.012, 0.04, 0.07) < 0 ||
            // Fourth ventricle
            ellipsoidSDF(nx, ny, nz, 0.50, 0.68, 0.28, 0.018, 0.025, 0.035) < 0
          ) {
            signal = T1.CSF + fbmNoise(nx * 25, ny * 25, nz * 20, 2) * 10;
          }
          // Deep gray (thalamus, basal ganglia)
          else if (
            ellipsoidSDF(nx, ny, nz, 0.44, 0.54, 0.48, 0.035, 0.035, 0.045) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.56, 0.54, 0.48, 0.035, 0.035, 0.045) < 0 ||
            // Caudate
            ellipsoidSDF(nx, ny, nz, 0.40, 0.46, 0.54, 0.018, 0.05, 0.07) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.60, 0.46, 0.54, 0.018, 0.05, 0.07) < 0 ||
            // Putamen/GP
            ellipsoidSDF(nx, ny, nz, 0.36, 0.50, 0.50, 0.025, 0.035, 0.045) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.64, 0.50, 0.50, 0.025, 0.035, 0.045) < 0
          ) {
            signal = T1.DEEP_GRAY + fbmNoise(nx * 20, ny * 20, nz * 15, 2) * 25;
          }
          // Corpus callosum (white matter)
          else if (ellipsoidSDF(nx, ny, nz, 0.50, 0.47, 0.55, 0.08, 0.018, 0.15) < 0) {
            signal = T1.WHITE_MATTER + fbmNoise(nx * 18, ny * 18, nz * 14, 2) * 20;
          }
          // Brainstem
          else if (
            ellipsoidSDF(nx, ny, nz, 0.50, 0.62, 0.34, 0.035, 0.035, 0.045) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.50, 0.68, 0.26, 0.04, 0.035, 0.045) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.50, 0.72, 0.20, 0.025, 0.025, 0.04) < 0
          ) {
            signal = T1.WHITE_MATTER * 0.92 + fbmNoise(nx * 15, ny * 15, nz * 12, 2) * 25;
          }
          // Cerebellum
          else if (
            ellipsoidSDF(nx, ny, nz, 0.38, 0.70, 0.26, 0.09, 0.07, 0.09) < 0 ||
            ellipsoidSDF(nx, ny, nz, 0.62, 0.70, 0.26, 0.09, 0.07, 0.09) < 0
          ) {
            // Cerebellar folia pattern
            const folia = Math.sin(nx * 80) * Math.sin(nz * 50) * 0.5 + 0.5;
            signal = folia > 0.5 
              ? T1.WHITE_MATTER + fbmNoise(nx * 25, ny * 25, nz * 20, 2) * 15
              : T1.GRAY_MATTER + fbmNoise(nx * 25, ny * 25, nz * 20, 2) * 20;
          }
          // Cerebral cortex and white matter
          else if (brainDist < 0) {
            // Cortical ribbon with gyri/sulci
            const gyri = fbmNoise(nx * 10, ny * 10, nz * 8, 4) * 0.02;
            const cortex_thickness = 0.022 + gyri;
            
            if (-brainDist < cortex_thickness) {
              // Gray matter cortex
              signal = T1.GRAY_MATTER + fbmNoise(nx * 20, ny * 20, nz * 15, 3) * 30;
            } else {
              // White matter
              signal = T1.WHITE_MATTER + fbmNoise(nx * 12, ny * 12, nz * 10, 3) * 25;
            }
          }
          // Extra-axial CSF
          else {
            signal = T1.CSF;
          }
        }
        
        data[idx] = signal;
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
 * Add tumors to CT volume with mask - using realistic irregular shapes
 */
function addTumorsToVolume(
  data: Float32Array, mask: Uint8Array, 
  width: number, height: number, depth: number, 
  config: CaseImagingConfig,
  tumorIntensity: number, necrosisIntensity: number
) {
  const allTumors = [...config.tumors, ...(config.metastases || [])];
  
  // Generate unique seed for each case for reproducibility
  const caseSeed = config.caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let tumorIdx = 0; tumorIdx < allTumors.length; tumorIdx++) {
    const tumor = allTumors[tumorIdx];
    const tumorSeed = caseSeed + tumorIdx * 1000;
    
    const tcx = tumor.location.x * width;
    const tcy = tumor.location.y * height;
    const tcz = tumor.location.z * depth;
    const trx = tumor.size.rx * width;
    const try_ = tumor.size.ry * height;
    const trz = tumor.size.rz * depth;
    
    // Determine irregularity based on tumor type
    const irregularity = tumor.infiltrative ? 0.7 : (tumor.heterogeneity || 0.5);
    const lobulation = tumor.infiltrative ? 0.6 : 0.45;
    
    // Expand search region for irregular shapes
    const margin = Math.max(trx, try_, trz) * 0.5;
    
    for (let z = Math.floor(tcz - trz - margin); z <= Math.ceil(tcz + trz + margin); z++) {
      for (let y = Math.floor(tcy - try_ - margin); y <= Math.ceil(tcy + try_ + margin); y++) {
        for (let x = Math.floor(tcx - trx - margin); x <= Math.ceil(tcx + trx + margin); x++) {
          if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) continue;
          
          const idx = z * height * width + y * width + x;
          
          // Use irregular tumor SDF
          let dist = irregularTumorSDF(
            x, y, z,
            tcx, tcy, tcz,
            trx, try_, trz,
            tumorSeed,
            irregularity,
            lobulation
          );
          
          // Add spiculations for spiculated tumors (like lung adenocarcinoma)
          if (tumor.spiculated) {
            dist = addSpiculations(x, y, z, tcx, tcy, tcz, trx, try_, trz, tumorSeed, dist);
          }
          
          if (dist < 0) {
            mask[idx] = 1; // Mark as tumor
            
            // Check for necrotic core
            if (tumor.necrosis && tumor.necrosis > 0) {
              const necDist = necroticCoreSDF(
                x, y, z,
                tcx, tcy, tcz,
                trx, try_, trz,
                tumor.necrosis,
                tumorSeed
              );
              
              if (necDist < 0) {
                // Inside necrotic region - lower intensity, more heterogeneous
                data[idx] = necrosisIntensity + fbmNoise(x * 0.2, y * 0.2, z * 0.2, 3) * 25;
                continue;
              }
            }
            
            // Solid tumor with heterogeneity
            let intensity = tumor.intensity || tumorIntensity;
            
            // Add internal heterogeneity with noise
            const hetNoise = fbmNoise(
              x * 0.15 + tumorSeed,
              y * 0.15 + tumorSeed * 2,
              z * 0.15 + tumorSeed * 3,
              4
            );
            intensity += hetNoise * 25 * (tumor.heterogeneity || 0.5);
            
            // Rim enhancement (more intense at edges)
            if (tumor.enhancement && dist > -3) {
              const enhancementFactor = smoothstep(-3, 0, dist);
              intensity += 35 * tumor.enhancement * enhancementFactor;
            }
            
            data[idx] = intensity;
          }
        }
      }
    }
  }
}

/**
 * Add brain tumors with edema - using realistic irregular GBM morphology
 */
function addBrainTumorsToVolume(
  data: Float32Array, mask: Uint8Array,
  width: number, height: number, depth: number,
  config: CaseImagingConfig
) {
  const caseSeed = config.caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let tumorIdx = 0; tumorIdx < config.tumors.length; tumorIdx++) {
    const tumor = config.tumors[tumorIdx];
    const tumorSeed = caseSeed + tumorIdx * 1000;
    
    const tcx = tumor.location.x * width;
    const tcy = tumor.location.y * height;
    const tcz = tumor.location.z * depth;
    const trx = tumor.size.rx * width;
    const try_ = tumor.size.ry * height;
    const trz = tumor.size.rz * depth;
    
    // GBMs are highly irregular and infiltrative
    const irregularity = tumor.infiltrative ? 0.8 : 0.6;
    const lobulation = 0.7; // GBMs are typically lobulated
    
    // Edema extends 1.5-2x tumor size, also irregular
    const edemaRx = trx * 1.7, edemaRy = try_ * 1.6, edemaRz = trz * 1.5;
    const margin = Math.max(edemaRx, edemaRy, edemaRz) * 0.3;
    
    for (let z = Math.floor(tcz - edemaRz - margin); z <= Math.ceil(tcz + edemaRz + margin); z++) {
      for (let y = Math.floor(tcy - edemaRy - margin); y <= Math.ceil(tcy + edemaRy + margin); y++) {
        for (let x = Math.floor(tcx - edemaRx - margin); x <= Math.ceil(tcx + edemaRx + margin); x++) {
          if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) continue;
          
          const idx = z * height * width + y * width + x;
          
          // Irregular tumor shape
          const tumorDist = irregularTumorSDF(
            x, y, z,
            tcx, tcy, tcz,
            trx, try_, trz,
            tumorSeed,
            irregularity,
            lobulation
          );
          
          // Irregular edema (finger-like extensions following white matter tracts)
          const edemaDist = irregularTumorSDF(
            x, y, z,
            tcx, tcy, tcz,
            edemaRx, edemaRy, edemaRz,
            tumorSeed + 500,
            0.5, // Less irregular than tumor
            0.3
          );
          
          if (tumorDist < 0) {
            mask[idx] = 1;
            
            // Check for necrotic core (irregular shape)
            if (tumor.necrosis && tumor.necrosis > 0) {
              const necDist = necroticCoreSDF(
                x, y, z,
                tcx, tcy, tcz,
                trx, try_, trz,
                tumor.necrosis,
                tumorSeed
              );
              
              if (necDist < 0) {
                // Necrotic center - low signal with heterogeneity
                data[idx] = MRI.TUMOR_NECROSIS + fbmNoise(x * 0.25, y * 0.25, z * 0.25, 3) * 50;
                continue;
              }
            }
            
            // Enhancing rim (thick, irregular enhancement typical of GBM)
            if (tumor.enhancement && tumorDist > -5) {
              const enhanceFactor = smoothstep(-5, -1, tumorDist);
              const baseEnhance = MRI.TUMOR_ENHANCED;
              // Add irregular enhancement pattern
              const enhanceNoise = fbmNoise(x * 0.2 + tumorSeed, y * 0.2, z * 0.2, 3);
              data[idx] = baseEnhance + enhanceNoise * 80 * enhanceFactor;
            } else {
              // Solid enhancing tumor
              const hetNoise = fbmNoise(x * 0.15, y * 0.15, z * 0.15, 4);
              data[idx] = MRI.TUMOR_SOLID + hetNoise * 80 * (tumor.heterogeneity || 0.5);
            }
          } else if (edemaDist < 0) {
            // Surrounding vasogenic edema (T2 hyperintense)
            // Edema follows white matter tracts - add directional bias
            const edemaIntensity = MRI.EDEMA + fbmNoise(x * 0.1, y * 0.15, z * 0.1, 3) * 60;
            const edemaBlend = smoothstep(-2, 0, edemaDist);
            data[idx] = edemaIntensity * (1 - edemaBlend * 0.5) + data[idx] * (edemaBlend * 0.5);
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
