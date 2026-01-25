/**
 * Realistic Brain MRI Generator
 * 
 * Creates anatomically accurate brain MRI appearance based on:
 * - Real brain atlas morphology (gyri, sulci, ventricles)
 * - Proper T1 post-contrast signal intensities
 * - Realistic GBM imaging characteristics
 * 
 * References:
 * - MNI brain template for morphology
 * - BraTS dataset characteristics for tumor appearance
 * - Standard neuroradiology texts for signal intensities
 */

// T1 Post-Contrast MRI Signal Intensities (normalized 0-1000)
const T1_SIGNALS = {
  // Background/Air
  AIR: 0,
  
  // CSF is DARK on T1
  CSF: 80,
  
  // Brain tissue
  GRAY_MATTER: 520,      // Cortex - slightly darker than WM
  WHITE_MATTER: 620,     // Bright on T1
  DEEP_GRAY: 480,        // Basal ganglia, thalamus
  
  // Skull/Scalp
  SKULL_OUTER: 100,      // Cortical bone - dark
  SKULL_DIPLOE: 600,     // Marrow - bright (fat)
  SKULL_INNER: 100,
  SCALP_FAT: 800,        // Subcutaneous fat - very bright
  SCALP_SKIN: 400,
  
  // Vessels (post-contrast)
  VESSEL_ENHANCED: 750,  // Enhancing vessels
  
  // Tumor (GBM characteristics)
  TUMOR_ENHANCING: 850,  // Ring enhancement - very bright
  TUMOR_NECROSIS: 150,   // Central necrosis - dark (similar to CSF)
  TUMOR_SOLID: 550,      // Non-enhancing solid tumor
  EDEMA: 400,            // T2 shine-through on T1, dark
  
  // Falx/Dura (enhances)
  DURA: 700,
};

// Anatomical landmarks for brain structure (normalized coordinates 0-1)
// Based on MNI template proportions
const BRAIN_ANATOMY = {
  // Lateral ventricle bodies
  leftLateralVentricle: { x: 0.42, y: 0.50, z: 0.52, rx: 0.04, ry: 0.12, rz: 0.15 },
  rightLateralVentricle: { x: 0.58, y: 0.50, z: 0.52, rx: 0.04, ry: 0.12, rz: 0.15 },
  
  // Frontal horns
  leftFrontalHorn: { x: 0.44, y: 0.42, z: 0.55, rx: 0.025, ry: 0.04, rz: 0.06 },
  rightFrontalHorn: { x: 0.56, y: 0.42, z: 0.55, rx: 0.025, ry: 0.04, rz: 0.06 },
  
  // Third ventricle
  thirdVentricle: { x: 0.50, y: 0.52, z: 0.48, rx: 0.015, ry: 0.04, rz: 0.08 },
  
  // Fourth ventricle
  fourthVentricle: { x: 0.50, y: 0.68, z: 0.30, rx: 0.02, ry: 0.03, rz: 0.04 },
  
  // Cerebral aqueduct
  aqueduct: { x: 0.50, y: 0.60, z: 0.38, rx: 0.008, ry: 0.008, rz: 0.06 },
  
  // Deep gray matter structures
  leftThalamus: { x: 0.44, y: 0.54, z: 0.48, rx: 0.04, ry: 0.04, rz: 0.05 },
  rightThalamus: { x: 0.56, y: 0.54, z: 0.48, rx: 0.04, ry: 0.04, rz: 0.05 },
  leftCaudate: { x: 0.40, y: 0.46, z: 0.55, rx: 0.02, ry: 0.06, rz: 0.08 },
  rightCaudate: { x: 0.60, y: 0.46, z: 0.55, rx: 0.02, ry: 0.06, rz: 0.08 },
  leftPutamen: { x: 0.36, y: 0.50, z: 0.50, rx: 0.03, ry: 0.04, rz: 0.05 },
  rightPutamen: { x: 0.64, y: 0.50, z: 0.50, rx: 0.03, ry: 0.04, rz: 0.05 },
  
  // Corpus callosum
  corpusCallosum: { x: 0.50, y: 0.48, z: 0.55, rx: 0.08, ry: 0.02, rz: 0.15 },
  
  // Brainstem
  midbrain: { x: 0.50, y: 0.62, z: 0.35, rx: 0.04, ry: 0.04, rz: 0.05 },
  pons: { x: 0.50, y: 0.68, z: 0.28, rx: 0.05, ry: 0.04, rz: 0.05 },
  medulla: { x: 0.50, y: 0.72, z: 0.22, rx: 0.03, ry: 0.03, rz: 0.05 },
  
  // Cerebellum
  leftCerebellum: { x: 0.38, y: 0.70, z: 0.28, rx: 0.10, ry: 0.08, rz: 0.10 },
  rightCerebellum: { x: 0.62, y: 0.70, z: 0.28, rx: 0.10, ry: 0.08, rz: 0.10 },
};

// Generate perlin-like noise for texture
function noise3D(x: number, y: number, z: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothNoise3D(x: number, y: number, z: number, seed: number = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  
  // Smooth interpolation
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  
  // 8 corners
  const n000 = noise3D(ix, iy, iz, seed);
  const n100 = noise3D(ix + 1, iy, iz, seed);
  const n010 = noise3D(ix, iy + 1, iz, seed);
  const n110 = noise3D(ix + 1, iy + 1, iz, seed);
  const n001 = noise3D(ix, iy, iz + 1, seed);
  const n101 = noise3D(ix + 1, iy, iz + 1, seed);
  const n011 = noise3D(ix, iy + 1, iz + 1, seed);
  const n111 = noise3D(ix + 1, iy + 1, iz + 1, seed);
  
  // Trilinear interpolation
  const n00 = n000 * (1 - sx) + n100 * sx;
  const n10 = n010 * (1 - sx) + n110 * sx;
  const n01 = n001 * (1 - sx) + n101 * sx;
  const n11 = n011 * (1 - sx) + n111 * sx;
  
  const n0 = n00 * (1 - sy) + n10 * sy;
  const n1 = n01 * (1 - sy) + n11 * sy;
  
  return n0 * (1 - sz) + n1 * sz;
}

// Fractal Brownian Motion for realistic texture
function fbm(x: number, y: number, z: number, octaves: number = 4, seed: number = 0): number {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise3D(x * frequency, y * frequency, z * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

// Distance to ellipsoid surface (negative inside)
function ellipsoidDist(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number
): number {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const dz = (z - cz) / rz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1;
}

// Smoothstep for blending
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generate realistic brain cortex pattern with gyri and sulci
 */
function generateCortexPattern(x: number, y: number, z: number, brainDist: number): number {
  if (brainDist > 0 || brainDist < -0.15) return 0;
  
  // Gyri/sulci pattern using noise
  const gyriNoise = fbm(x * 8, y * 8, z * 6, 3, 42);
  const sulcusDepth = gyriNoise * 0.03;
  
  // Cortical ribbon thickness varies
  const cortexThickness = 0.025 + gyriNoise * 0.008;
  
  // Distance from surface
  const surfaceDist = -brainDist;
  
  if (surfaceDist < cortexThickness + sulcusDepth) {
    // Gray matter (cortex)
    return T1_SIGNALS.GRAY_MATTER + fbm(x * 20, y * 20, z * 15, 2, 123) * 30;
  }
  
  return 0; // Not cortex
}

/**
 * Check if point is inside a CSF structure
 */
function isInCSF(nx: number, ny: number, nz: number): boolean {
  // Check all ventricle structures
  const structures = [
    BRAIN_ANATOMY.leftLateralVentricle,
    BRAIN_ANATOMY.rightLateralVentricle,
    BRAIN_ANATOMY.leftFrontalHorn,
    BRAIN_ANATOMY.rightFrontalHorn,
    BRAIN_ANATOMY.thirdVentricle,
    BRAIN_ANATOMY.fourthVentricle,
    BRAIN_ANATOMY.aqueduct,
  ];
  
  for (const s of structures) {
    const dist = ellipsoidDist(nx, ny, nz, s.x, s.y, s.z, s.rx, s.ry, s.rz);
    if (dist < 0) return true;
  }
  
  return false;
}

/**
 * Get signal intensity for deep gray matter
 */
function getDeepGraySignal(nx: number, ny: number, nz: number): number | null {
  const structures = [
    { ...BRAIN_ANATOMY.leftThalamus, signal: T1_SIGNALS.DEEP_GRAY },
    { ...BRAIN_ANATOMY.rightThalamus, signal: T1_SIGNALS.DEEP_GRAY },
    { ...BRAIN_ANATOMY.leftCaudate, signal: T1_SIGNALS.DEEP_GRAY - 20 },
    { ...BRAIN_ANATOMY.rightCaudate, signal: T1_SIGNALS.DEEP_GRAY - 20 },
    { ...BRAIN_ANATOMY.leftPutamen, signal: T1_SIGNALS.DEEP_GRAY - 10 },
    { ...BRAIN_ANATOMY.rightPutamen, signal: T1_SIGNALS.DEEP_GRAY - 10 },
  ];
  
  for (const s of structures) {
    const dist = ellipsoidDist(nx, ny, nz, s.x, s.y, s.z, s.rx, s.ry, s.rz);
    if (dist < 0) {
      return s.signal + fbm(nx * 30, ny * 30, nz * 30, 2) * 15;
    }
  }
  
  return null;
}

/**
 * Generate a realistic brain MRI volume
 */
export function generateRealisticBrainMRI(
  width: number,
  height: number,
  depth: number,
  tumorConfig?: {
    centerX: number;  // 0-1 normalized
    centerY: number;
    centerZ: number;
    radiusX: number;
    radiusY: number;
    radiusZ: number;
    necrosisRatio: number;  // 0-1
    hasEdema: boolean;
  }
): { data: Float32Array; mask: Uint8Array } {
  const data = new Float32Array(width * height * depth);
  const mask = new Uint8Array(width * height * depth);
  
  for (let z = 0; z < depth; z++) {
    const nz = z / depth;  // Normalized z (0 = inferior, 1 = superior)
    
    for (let y = 0; y < height; y++) {
      const ny = y / height;  // Normalized y (0 = anterior, 1 = posterior)
      
      for (let x = 0; x < width; x++) {
        const nx = x / width;  // Normalized x (0 = right, 1 = left)
        const idx = z * height * width + y * width + x;
        
        let signal = T1_SIGNALS.AIR;
        
        // === SKULL AND SCALP ===
        // Outer skull boundary (ellipsoid)
        const skullOuterDist = ellipsoidDist(nx, ny, nz, 0.5, 0.52, 0.5, 0.44, 0.46, 0.44);
        const skullInnerDist = ellipsoidDist(nx, ny, nz, 0.5, 0.52, 0.5, 0.40, 0.42, 0.40);
        const scalpDist = ellipsoidDist(nx, ny, nz, 0.5, 0.52, 0.5, 0.47, 0.49, 0.47);
        
        if (scalpDist < 0 && skullOuterDist >= 0) {
          // Scalp layers
          const scalpDepth = -scalpDist / 0.03;
          if (scalpDepth < 0.3) {
            signal = T1_SIGNALS.SCALP_SKIN;
          } else if (scalpDepth < 0.8) {
            signal = T1_SIGNALS.SCALP_FAT + fbm(nx * 20, ny * 20, nz * 15, 2) * 50;
          } else {
            signal = T1_SIGNALS.SCALP_SKIN;
          }
        } else if (skullOuterDist < 0 && skullInnerDist >= 0) {
          // Skull - three layers
          const skullDepth = -skullOuterDist / (-skullOuterDist + skullInnerDist);
          if (skullDepth < 0.25) {
            signal = T1_SIGNALS.SKULL_OUTER;
          } else if (skullDepth < 0.75) {
            signal = T1_SIGNALS.SKULL_DIPLOE + fbm(nx * 15, ny * 15, nz * 10, 2) * 80;
          } else {
            signal = T1_SIGNALS.SKULL_INNER;
          }
        } else if (skullInnerDist < 0) {
          // === INTRACRANIAL CONTENTS ===
          
          // Brain parenchyma boundary
          const brainDist = ellipsoidDist(nx, ny, nz, 0.5, 0.52, 0.5, 0.38, 0.40, 0.38);
          
          // Falx cerebri (midline dura)
          const falxDist = Math.abs(nx - 0.5) - 0.005;
          if (falxDist < 0 && brainDist < 0 && nz > 0.3) {
            signal = T1_SIGNALS.DURA;
          }
          // Tentorium cerebelli
          else if (Math.abs(nz - 0.32) < 0.015 && brainDist < 0 && ny > 0.5) {
            signal = T1_SIGNALS.DURA;
          }
          // CSF in subarachnoid space
          else if (brainDist >= 0 && brainDist < 0.02) {
            signal = T1_SIGNALS.CSF + fbm(nx * 30, ny * 30, nz * 20, 2) * 10;
          }
          // Ventricular CSF
          else if (isInCSF(nx, ny, nz)) {
            signal = T1_SIGNALS.CSF + fbm(nx * 25, ny * 25, nz * 20, 2) * 8;
          }
          // Deep gray matter structures
          else {
            const deepGray = getDeepGraySignal(nx, ny, nz);
            if (deepGray !== null) {
              signal = deepGray;
            }
            // Corpus callosum (white matter)
            else if (ellipsoidDist(nx, ny, nz, 
                BRAIN_ANATOMY.corpusCallosum.x,
                BRAIN_ANATOMY.corpusCallosum.y,
                BRAIN_ANATOMY.corpusCallosum.z,
                BRAIN_ANATOMY.corpusCallosum.rx,
                BRAIN_ANATOMY.corpusCallosum.ry,
                BRAIN_ANATOMY.corpusCallosum.rz) < 0) {
              signal = T1_SIGNALS.WHITE_MATTER + fbm(nx * 25, ny * 25, nz * 20, 2) * 20;
            }
            // Brainstem
            else if (
              ellipsoidDist(nx, ny, nz, BRAIN_ANATOMY.midbrain.x, BRAIN_ANATOMY.midbrain.y, BRAIN_ANATOMY.midbrain.z, 
                BRAIN_ANATOMY.midbrain.rx, BRAIN_ANATOMY.midbrain.ry, BRAIN_ANATOMY.midbrain.rz) < 0 ||
              ellipsoidDist(nx, ny, nz, BRAIN_ANATOMY.pons.x, BRAIN_ANATOMY.pons.y, BRAIN_ANATOMY.pons.z,
                BRAIN_ANATOMY.pons.rx, BRAIN_ANATOMY.pons.ry, BRAIN_ANATOMY.pons.rz) < 0 ||
              ellipsoidDist(nx, ny, nz, BRAIN_ANATOMY.medulla.x, BRAIN_ANATOMY.medulla.y, BRAIN_ANATOMY.medulla.z,
                BRAIN_ANATOMY.medulla.rx, BRAIN_ANATOMY.medulla.ry, BRAIN_ANATOMY.medulla.rz) < 0
            ) {
              signal = T1_SIGNALS.WHITE_MATTER * 0.9 + fbm(nx * 20, ny * 20, nz * 15, 2) * 25;
            }
            // Cerebellum
            else if (
              ellipsoidDist(nx, ny, nz, BRAIN_ANATOMY.leftCerebellum.x, BRAIN_ANATOMY.leftCerebellum.y, 
                BRAIN_ANATOMY.leftCerebellum.z, BRAIN_ANATOMY.leftCerebellum.rx, 
                BRAIN_ANATOMY.leftCerebellum.ry, BRAIN_ANATOMY.leftCerebellum.rz) < 0 ||
              ellipsoidDist(nx, ny, nz, BRAIN_ANATOMY.rightCerebellum.x, BRAIN_ANATOMY.rightCerebellum.y,
                BRAIN_ANATOMY.rightCerebellum.z, BRAIN_ANATOMY.rightCerebellum.rx,
                BRAIN_ANATOMY.rightCerebellum.ry, BRAIN_ANATOMY.rightCerebellum.rz) < 0
            ) {
              // Cerebellum has distinct foliation pattern
              const foliaPattern = Math.sin(nx * 60) * Math.sin(nz * 40);
              if (foliaPattern > 0.5) {
                signal = T1_SIGNALS.WHITE_MATTER + fbm(nx * 30, ny * 30, nz * 25, 2) * 15;
              } else {
                signal = T1_SIGNALS.GRAY_MATTER + fbm(nx * 30, ny * 30, nz * 25, 2) * 15;
              }
            }
            // Cerebral cortex and white matter
            else if (brainDist < 0) {
              const cortexSignal = generateCortexPattern(nx, ny, nz, brainDist);
              if (cortexSignal > 0) {
                signal = cortexSignal;
              } else {
                // White matter with subtle texture
                signal = T1_SIGNALS.WHITE_MATTER + fbm(nx * 15, ny * 15, nz * 12, 3) * 25;
              }
            }
            // Extradural but inside skull
            else {
              signal = T1_SIGNALS.CSF;
            }
          }
        }
        
        // === TUMOR (if configured) ===
        if (tumorConfig) {
          const tcx = tumorConfig.centerX;
          const tcy = tumorConfig.centerY;
          const tcz = tumorConfig.centerZ;
          const trx = tumorConfig.radiusX;
          const try_ = tumorConfig.radiusY;
          const trz = tumorConfig.radiusZ;
          
          // Irregular tumor shape
          const tumorBaseDist = ellipsoidDist(nx, ny, nz, tcx, tcy, tcz, trx, try_, trz);
          
          // Add irregularity
          const irregularity = fbm(nx * 12 + 100, ny * 12, nz * 10, 4) * 0.3;
          const tumorDist = tumorBaseDist - irregularity;
          
          // Edema zone (T2 hyperintense, T1 hypointense)
          const edemaDist = ellipsoidDist(nx, ny, nz, tcx, tcy, tcz, trx * 1.8, try_ * 1.7, trz * 1.6);
          const edemaIrregularity = fbm(nx * 8 + 200, ny * 8, nz * 6, 3) * 0.4;
          
          if (tumorConfig.hasEdema && edemaDist - edemaIrregularity < 0 && tumorDist > 0) {
            // Edema - follows white matter tracts, finger-like
            const edemaSignal = T1_SIGNALS.EDEMA + fbm(nx * 10, ny * 15, nz * 8, 3) * 40;
            signal = signal * 0.3 + edemaSignal * 0.7;
          }
          
          if (tumorDist < 0) {
            mask[idx] = 1;  // Mark as tumor
            
            // Necrotic core
            const necrosisDist = ellipsoidDist(nx, ny, nz, tcx, tcy + 0.02, tcz, 
              trx * tumorConfig.necrosisRatio * 0.8,
              try_ * tumorConfig.necrosisRatio * 0.7,
              trz * tumorConfig.necrosisRatio * 0.75
            );
            
            // Irregular necrosis boundary
            const necrosisIrreg = fbm(nx * 15 + 300, ny * 15, nz * 12, 3) * 0.25;
            
            if (necrosisDist - necrosisIrreg < 0) {
              // Central necrosis - dark with fluid-fluid levels
              signal = T1_SIGNALS.TUMOR_NECROSIS + fbm(nx * 20, ny * 20, nz * 15, 3) * 40;
            } else if (tumorDist > -0.08) {
              // Enhancing rim - bright, thick, irregular
              const rimThickness = 0.08 + fbm(nx * 10, ny * 10, nz * 8, 2) * 0.04;
              if (tumorDist > -rimThickness) {
                signal = T1_SIGNALS.TUMOR_ENHANCING + fbm(nx * 25, ny * 25, nz * 20, 2) * 60;
              } else {
                // Non-enhancing solid tumor
                signal = T1_SIGNALS.TUMOR_SOLID + fbm(nx * 20, ny * 20, nz * 15, 3) * 50;
              }
            } else {
              // Non-enhancing solid tumor
              signal = T1_SIGNALS.TUMOR_SOLID + fbm(nx * 20, ny * 20, nz * 15, 3) * 50;
            }
          }
        }
        
        data[idx] = signal;
      }
    }
  }
  
  return { data, mask };
}

/**
 * Get appropriate window/level for brain MRI
 */
export function getBrainMRIWindow(): { center: number; width: number } {
  return { center: 500, width: 1000 };
}
