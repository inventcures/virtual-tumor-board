/**
 * Synthetic CT Volume Generator
 * Generates procedural CT-like data for demo purposes
 * Simulates a thorax with anatomical structures
 */

export interface VolumeMetadata {
  shape: [number, number, number]; // [depth, height, width]
  spacing: [number, number, number]; // mm per voxel [z, y, x]
  origin: [number, number, number];
  modality: 'CT' | 'MRI';
  windowPresets: WindowPreset[];
}

export interface WindowPreset {
  name: string;
  center: number;
  width: number;
}

export interface SyntheticVolume {
  data: Float32Array; // Flattened 3D array in HU
  metadata: VolumeMetadata;
  getSlice: (axis: 'axial' | 'sagittal' | 'coronal', index: number) => Float32Array;
  getSliceAsImageData: (
    axis: 'axial' | 'sagittal' | 'coronal',
    index: number,
    windowCenter: number,
    windowWidth: number
  ) => ImageData;
}

// CT Hounsfield Unit reference values
const HU = {
  AIR: -1000,
  LUNG: -500,
  FAT: -100,
  WATER: 0,
  SOFT_TISSUE: 40,
  BLOOD: 40,
  MUSCLE: 40,
  LIVER: 60,
  BONE_CANCELLOUS: 300,
  BONE_CORTICAL: 1000,
  TUMOR: 60, // Similar to soft tissue but distinct
};

// Windowing presets for CT
export const CT_WINDOW_PRESETS: WindowPreset[] = [
  { name: 'Lung', center: -600, width: 1500 },
  { name: 'Soft Tissue', center: 40, width: 400 },
  { name: 'Bone', center: 400, width: 1800 },
  { name: 'Brain', center: 40, width: 80 },
  { name: 'Mediastinum', center: 50, width: 350 },
  { name: 'Liver', center: 60, width: 150 },
];

/**
 * Simple seeded random number generator for reproducibility
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Smooth noise function using bilinear interpolation
 */
function smoothNoise(x: number, y: number, z: number, random: () => number): number {
  const intX = Math.floor(x);
  const intY = Math.floor(y);
  const intZ = Math.floor(z);
  
  const fracX = x - intX;
  const fracY = y - intY;
  const fracZ = z - intZ;
  
  // Simplified noise - just use position-based seed
  const noise = (ix: number, iy: number, iz: number) => {
    const n = ix + iy * 57 + iz * 113;
    const seed = (n * 15731 + 789221) * n + 1376312589;
    return ((seed & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  };
  
  // Trilinear interpolation
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

/**
 * Distance from point to ellipsoid surface
 */
function ellipsoidSDF(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number
): number {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const dz = (z - cz) / rz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1;
}

/**
 * Distance from point to cylinder (along z-axis)
 */
function cylinderSDF(
  x: number, y: number, z: number,
  cx: number, cy: number,
  radius: number,
  zMin: number, zMax: number
): number {
  const dx = x - cx;
  const dy = y - cy;
  const radialDist = Math.sqrt(dx * dx + dy * dy) - radius;
  const zDist = Math.max(zMin - z, z - zMax);
  return Math.max(radialDist, zDist);
}

/**
 * Smooth step function for blending
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generate a synthetic thorax CT volume
 */
export function generateSyntheticThorax(
  width: number = 256,
  height: number = 256,
  depth: number = 100,
  tumorLocation?: { x: number; y: number; z: number; radius: number }
): SyntheticVolume {
  const data = new Float32Array(width * height * depth);
  const random = seededRandom(42);
  
  // Volume center
  const cx = width / 2;
  const cy = height / 2;
  const cz = depth / 2;
  
  // Default tumor in right upper lobe if not specified
  const tumor = tumorLocation || {
    x: cx + 40, // Right side
    y: cy - 30, // Upper
    z: cz + 10,
    radius: 20,
  };
  
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * height * width + y * width + x;
        let hu = HU.AIR;
        
        // Body outline (ellipsoid)
        const bodyDist = ellipsoidSDF(x, y, z, cx, cy, cz, 100, 80, 45);
        
        if (bodyDist < 0) {
          // Inside body - start with soft tissue
          hu = HU.SOFT_TISSUE;
          
          // Add some texture noise
          const noise = smoothNoise(x * 0.1, y * 0.1, z * 0.1, random) * 20;
          hu += noise;
          
          // Lung fields (two ellipsoids, left and right)
          const rightLungDist = ellipsoidSDF(
            x, y, z,
            cx + 35, cy, cz,
            35, 50, 35
          );
          const leftLungDist = ellipsoidSDF(
            x, y, z,
            cx - 35, cy, cz,
            35, 50, 35
          );
          
          if (rightLungDist < 0 || leftLungDist < 0) {
            // Inside lung
            hu = HU.LUNG;
            // Add lung texture (vessels, parenchyma variation)
            const lungNoise = smoothNoise(x * 0.2, y * 0.2, z * 0.2, random) * 100;
            hu += lungNoise;
            
            // Pulmonary vessels (random lines)
            const vesselNoise = Math.abs(smoothNoise(x * 0.05, y * 0.05, z * 0.1, random));
            if (vesselNoise > 0.7) {
              hu = HU.BLOOD + 20;
            }
          }
          
          // Spine (cylinder along z-axis)
          const spineDist = cylinderSDF(x, y, z, cx, cy + 60, 15, 0, depth);
          if (spineDist < 0) {
            hu = HU.BONE_CANCELLOUS;
            // Cortical bone shell
            if (spineDist > -3) {
              hu = HU.BONE_CORTICAL;
            }
          }
          
          // Ribs (curved cylinders - simplified as ellipsoids)
          for (let ribZ = 10; ribZ < depth - 10; ribZ += 15) {
            const ribAngle = (ribZ / depth) * 0.3;
            // Right rib
            const rightRibDist = ellipsoidSDF(
              x, y, z,
              cx + 70 * Math.cos(ribAngle), cy + 30, ribZ,
              8, 40, 4
            );
            // Left rib
            const leftRibDist = ellipsoidSDF(
              x, y, z,
              cx - 70 * Math.cos(ribAngle), cy + 30, ribZ,
              8, 40, 4
            );
            
            if (rightRibDist < 0 || leftRibDist < 0) {
              hu = HU.BONE_CORTICAL;
            }
          }
          
          // Heart (ellipsoid, left-center)
          const heartDist = ellipsoidSDF(
            x, y, z,
            cx - 15, cy + 10, cz - 5,
            30, 35, 25
          );
          if (heartDist < 0) {
            hu = HU.BLOOD + 10;
            // Heart chambers variation
            const chamberNoise = smoothNoise(x * 0.15, y * 0.15, z * 0.15, random) * 30;
            hu += chamberNoise;
          }
          
          // Aorta (cylinder)
          const aortaDist = cylinderSDF(x, y, z, cx + 5, cy + 20, 12, cz - 30, cz + 40);
          if (aortaDist < 0) {
            hu = HU.BLOOD + 30; // Contrast-enhanced
          }
          
          // Tumor (if in lung field and tumor specified)
          const tumorDist = ellipsoidSDF(
            x, y, z,
            tumor.x, tumor.y, tumor.z,
            tumor.radius, tumor.radius * 0.9, tumor.radius * 0.8
          );
          if (tumorDist < 0) {
            hu = HU.TUMOR + 20;
            // Tumor heterogeneity
            const tumorNoise = smoothNoise(x * 0.3, y * 0.3, z * 0.3, random) * 40;
            hu += tumorNoise;
            
            // Spiculated edges
            if (tumorDist > -3) {
              const spicNoise = smoothNoise(x * 0.5, y * 0.5, z * 0.5, random);
              if (spicNoise > 0.3) {
                hu = HU.LUNG;
              }
            }
          }
          
          // Blend at body boundary for smooth edge
          if (bodyDist > -5) {
            const blend = smoothstep(-5, 0, bodyDist);
            hu = hu * (1 - blend) + HU.AIR * blend;
          }
        }
        
        data[idx] = hu;
      }
    }
  }
  
  const metadata: VolumeMetadata = {
    shape: [depth, height, width],
    spacing: [3.0, 1.0, 1.0], // 3mm slices, 1mm in-plane
    origin: [0, 0, 0],
    modality: 'CT',
    windowPresets: CT_WINDOW_PRESETS,
  };
  
  // Helper functions
  const getSlice = (axis: 'axial' | 'sagittal' | 'coronal', index: number): Float32Array => {
    let sliceData: Float32Array;
    
    switch (axis) {
      case 'axial':
        // XY plane at z=index
        sliceData = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            sliceData[y * width + x] = data[index * height * width + y * width + x];
          }
        }
        break;
      case 'sagittal':
        // YZ plane at x=index
        sliceData = new Float32Array(depth * height);
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            sliceData[z * height + y] = data[z * height * width + y * width + index];
          }
        }
        break;
      case 'coronal':
        // XZ plane at y=index
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
  
  const getSliceAsImageData = (
    axis: 'axial' | 'sagittal' | 'coronal',
    index: number,
    windowCenter: number,
    windowWidth: number
  ): ImageData => {
    const sliceData = getSlice(axis, index);
    
    let sliceWidth: number, sliceHeight: number;
    switch (axis) {
      case 'axial':
        sliceWidth = width;
        sliceHeight = height;
        break;
      case 'sagittal':
        sliceWidth = height;
        sliceHeight = depth;
        break;
      case 'coronal':
        sliceWidth = width;
        sliceHeight = depth;
        break;
    }
    
    const imageData = new ImageData(sliceWidth, sliceHeight);
    const minHU = windowCenter - windowWidth / 2;
    const maxHU = windowCenter + windowWidth / 2;
    
    for (let i = 0; i < sliceData.length; i++) {
      const hu = sliceData[i];
      // Apply windowing
      let normalized = (hu - minHU) / (maxHU - minHU);
      normalized = Math.max(0, Math.min(1, normalized));
      const gray = Math.round(normalized * 255);
      
      const pixelIdx = i * 4;
      imageData.data[pixelIdx] = gray;     // R
      imageData.data[pixelIdx + 1] = gray; // G
      imageData.data[pixelIdx + 2] = gray; // B
      imageData.data[pixelIdx + 3] = 255;  // A
    }
    
    return imageData;
  };
  
  return {
    data,
    metadata,
    getSlice,
    getSliceAsImageData,
  };
}

/**
 * Get slice dimensions for a given axis
 */
export function getSliceDimensions(
  metadata: VolumeMetadata,
  axis: 'axial' | 'sagittal' | 'coronal'
): { width: number; height: number; maxSlice: number } {
  const [depth, height, width] = metadata.shape;
  
  switch (axis) {
    case 'axial':
      return { width, height, maxSlice: depth - 1 };
    case 'sagittal':
      return { width: height, height: depth, maxSlice: width - 1 };
    case 'coronal':
      return { width, height: depth, maxSlice: height - 1 };
  }
}
