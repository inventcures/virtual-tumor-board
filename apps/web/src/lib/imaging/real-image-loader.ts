/**
 * Real Image Loader
 * 
 * Loads actual medical images from the public/imaging folder
 * instead of using procedural generation.
 */

import { CaseImagingConfig, VolumeType } from './case-imaging-config';

export interface ImageSeriesManifest {
  version: string;
  numSlices: number;
  sliceFiles: string[];
  bodyRegion: string;
  window: { center: number; width: number };
  modality: string;
  description: string;
  synthetic: boolean;
}

export interface RealImageSeries {
  caseId: string;
  bodyRegion: string;
  seriesName: string;
  manifest: ImageSeriesManifest;
  basePath: string;
  images: HTMLImageElement[];
  loaded: boolean;
}

// Map case IDs to their image series folders
const CASE_IMAGE_MAPPING: Record<string, { folder: string; seriesName: string }> = {
  // Brain MRI
  'pediatric-gbm-brain': { folder: 'brain/brain_glioblastoma', seriesName: 'Brain MRI with GBM' },
  
  // Thorax CT
  'lung-nsclc-kras-g12c': { folder: 'thorax/thorax_tumor', seriesName: 'CT Chest with Lung Mass' },
  'breast-her2-early': { folder: 'thorax/thorax_tumor', seriesName: 'CT Chest/Breast' },
  'esophageal-neoadjuvant': { folder: 'thorax/thorax_tumor', seriesName: 'CT Chest/Esophagus' },
  
  // Abdomen CT
  'colorectal-msi-h-mets': { folder: 'abdomen/abdomen_tumor', seriesName: 'CT Abdomen with Colon Mass' },
  'gastric-stage-iii': { folder: 'abdomen/abdomen_tumor', seriesName: 'CT Abdomen Gastric' },
  'ovarian-brca1-hgsoc': { folder: 'abdomen/abdomen_tumor', seriesName: 'CT Abdomen/Pelvis Ovarian' },
  
  // Pelvis CT
  'cervix-locally-advanced': { folder: 'pelvis/pelvis_tumor', seriesName: 'CT Pelvis Cervical' },
  'prostate-mcrpc': { folder: 'pelvis/pelvis_tumor', seriesName: 'CT Pelvis Prostate' },
  
  // Head/Neck CT
  'oral-cavity-locally-advanced': { folder: 'head_neck/head_neck_tumor', seriesName: 'CT Head/Neck Oral Cavity' },
};

/**
 * Load manifest for an image series
 */
export async function loadSeriesManifest(basePath: string): Promise<ImageSeriesManifest | null> {
  try {
    const response = await fetch(`${basePath}/manifest.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`Failed to load manifest from ${basePath}:`, err);
    return null;
  }
}

/**
 * Load a single image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Load all images for a series
 */
export async function loadImageSeries(caseId: string): Promise<RealImageSeries | null> {
  const mapping = CASE_IMAGE_MAPPING[caseId];
  if (!mapping) {
    console.log(`No real images available for case: ${caseId}`);
    return null;
  }

  const basePath = `/imaging/${mapping.folder}`;
  const manifest = await loadSeriesManifest(basePath);
  
  if (!manifest) {
    console.log(`No manifest found for: ${basePath}`);
    return null;
  }

  // Load images in batches to avoid overwhelming the browser
  const images: HTMLImageElement[] = [];
  const batchSize = 10;
  
  for (let i = 0; i < manifest.sliceFiles.length; i += batchSize) {
    const batch = manifest.sliceFiles.slice(i, i + batchSize);
    const batchImages = await Promise.all(
      batch.map(file => loadImage(`${basePath}/${file}`).catch(() => null))
    );
    images.push(...batchImages.filter((img): img is HTMLImageElement => img !== null));
  }

  return {
    caseId,
    bodyRegion: manifest.bodyRegion,
    seriesName: mapping.seriesName,
    manifest,
    basePath,
    images,
    loaded: images.length > 0,
  };
}

/**
 * Get a slice as ImageData from a loaded series
 */
export function getSliceImageData(
  series: RealImageSeries,
  sliceIndex: number,
  windowCenter: number,
  windowWidth: number,
  brightness: number = 100,
  contrast: number = 100
): ImageData | null {
  if (!series.loaded || sliceIndex >= series.images.length) {
    return null;
  }

  const img = series.images[sliceIndex];
  if (!img) return null;

  // Create canvas to extract image data
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Apply brightness/contrast adjustments
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness
    let r = data[i] * (brightness / 100);
    let g = data[i + 1] * (brightness / 100);
    let b = data[i + 2] * (brightness / 100);
    
    // Apply contrast
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
    
    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  
  return imageData;
}

/**
 * Check if real images are available for a case
 */
export function hasRealImages(caseId: string): boolean {
  return caseId in CASE_IMAGE_MAPPING;
}

/**
 * Get the image path for a case
 */
export function getImagePath(caseId: string): string | null {
  const mapping = CASE_IMAGE_MAPPING[caseId];
  return mapping ? `/imaging/${mapping.folder}` : null;
}
