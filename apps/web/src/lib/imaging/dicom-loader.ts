/**
 * DICOM Loader
 * 
 * Loads and parses real DICOM files using dicom-parser.
 * Renders DICOM pixel data with proper windowing.
 */

import dicomParser from 'dicom-parser';

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  modality?: string;
  seriesDescription?: string;
  instanceNumber?: number;
  sliceLocation?: number;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number;
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept: number;
  rescaleSlope: number;
  photometricInterpretation?: string;
}

export interface DicomSlice {
  metadata: DicomMetadata;
  pixelData: Int16Array | Uint16Array;
  instanceNumber: number;
}

export interface DicomSeries {
  folder: string;
  slices: DicomSlice[];
  loaded: boolean;
  error?: string;
  // Computed from slices
  minValue: number;
  maxValue: number;
  defaultWindowCenter: number;
  defaultWindowWidth: number;
}

// Map case IDs to DICOM folders
export const CASE_DICOM_MAPPING: Record<string, { folder: string; description: string }> = {
  'lung-nsclc-kras-g12c': { folder: 'lung', description: 'NSCLC-Radiomics CT Chest' },
  'breast-her2-early': { folder: 'breast', description: 'TCGA-BRCA Breast CT/MRI' },
  'colorectal-msi-h-mets': { folder: 'colorectal', description: 'StageII Colorectal CT' },
  'oral-cavity-locally-advanced': { folder: 'headneck', description: 'TCGA-THCA Head/Neck CT' },
  'cervix-locally-advanced': { folder: 'cervix', description: 'Pelvic Reference CT' },
  'prostate-mcrpc': { folder: 'prostate', description: 'TCGA-PRAD Prostate CT' },
  'gastric-stage-iii': { folder: 'gastric', description: 'TCGA-STAD Gastric CT' },
  'ovarian-brca1-hgsoc': { folder: 'ovarian', description: 'TCGA-OV Ovarian CT' },
  'esophageal-neoadjuvant': { folder: 'esophageal', description: 'TCGA-ESCA Esophageal CT' },
  'pediatric-gbm-brain': { folder: 'brain', description: 'Brain MRI/NIfTI' },
};

/**
 * Fetch DICOM file list from API
 */
export async function fetchDicomFileList(folder: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/dicom/${folder}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file list: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error(`[DicomLoader] Error fetching file list for ${folder}:`, error);
    return [];
  }
}

/**
 * Parse a single DICOM file
 */
export async function parseDicomFile(url: string): Promise<DicomSlice | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch DICOM: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);
    
    // Extract metadata
    const metadata: DicomMetadata = {
      patientName: dataSet.string('x00100010'),
      patientId: dataSet.string('x00100020'),
      studyDate: dataSet.string('x00080020'),
      modality: dataSet.string('x00080060'),
      seriesDescription: dataSet.string('x0008103e'),
      instanceNumber: dataSet.intString('x00200013'),
      sliceLocation: dataSet.floatString('x00201041'),
      rows: dataSet.uint16('x00280010') || 512,
      columns: dataSet.uint16('x00280011') || 512,
      bitsAllocated: dataSet.uint16('x00280100') || 16,
      bitsStored: dataSet.uint16('x00280101') || 12,
      highBit: dataSet.uint16('x00280102') || 11,
      pixelRepresentation: dataSet.uint16('x00280103') || 0, // 0 = unsigned, 1 = signed
      windowCenter: parseWindowValue(dataSet.string('x00281050')),
      windowWidth: parseWindowValue(dataSet.string('x00281051')),
      rescaleIntercept: dataSet.floatString('x00281052') || 0,
      rescaleSlope: dataSet.floatString('x00281053') || 1,
      photometricInterpretation: dataSet.string('x00280004'),
    };
    
    // Extract pixel data
    const pixelDataElement = dataSet.elements.x7fe00010;
    if (!pixelDataElement) {
      console.warn(`[DicomLoader] No pixel data in ${url}`);
      return null;
    }
    
    const pixelData = extractPixelData(dataSet, metadata);
    if (!pixelData) {
      return null;
    }
    
    return {
      metadata,
      pixelData,
      instanceNumber: metadata.instanceNumber || 0,
    };
  } catch (error) {
    console.error(`[DicomLoader] Error parsing ${url}:`, error);
    return null;
  }
}

/**
 * Parse window value (can be single number or array in DICOM)
 */
function parseWindowValue(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // Window values can be arrays like "40\400", take first value
  const parts = value.split('\\');
  return parseFloat(parts[0]);
}

/**
 * Extract pixel data from DICOM dataset
 */
function extractPixelData(
  dataSet: dicomParser.DataSet, 
  metadata: DicomMetadata
): Int16Array | Uint16Array | null {
  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) return null;
  
  const { rows, columns, bitsAllocated, pixelRepresentation } = metadata;
  const numPixels = rows * columns;
  
  if (bitsAllocated === 16) {
    if (pixelRepresentation === 1) {
      // Signed 16-bit
      return new Int16Array(
        dataSet.byteArray.buffer,
        pixelDataElement.dataOffset,
        numPixels
      );
    } else {
      // Unsigned 16-bit
      return new Uint16Array(
        dataSet.byteArray.buffer,
        pixelDataElement.dataOffset,
        numPixels
      );
    }
  } else if (bitsAllocated === 8) {
    // 8-bit data, convert to 16-bit for consistency
    const uint8 = new Uint8Array(
      dataSet.byteArray.buffer,
      pixelDataElement.dataOffset,
      numPixels
    );
    const int16 = new Int16Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
      int16[i] = uint8[i];
    }
    return int16;
  }
  
  console.warn(`[DicomLoader] Unsupported bits allocated: ${bitsAllocated}`);
  return null;
}

/**
 * Load a complete DICOM series for a case
 */
export async function loadDicomSeries(
  caseId: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<DicomSeries | null> {
  const mapping = CASE_DICOM_MAPPING[caseId];
  if (!mapping) {
    console.log(`[DicomLoader] No DICOM mapping for case: ${caseId}`);
    return null;
  }
  
  const { folder } = mapping;
  console.log(`[DicomLoader] Loading DICOM series from ${folder}...`);
  
  // Get file list
  const files = await fetchDicomFileList(folder);
  if (files.length === 0) {
    console.error(`[DicomLoader] No DICOM files found in ${folder}`);
    return { folder, slices: [], loaded: false, error: 'No files found', minValue: 0, maxValue: 0, defaultWindowCenter: 40, defaultWindowWidth: 400 };
  }
  
  console.log(`[DicomLoader] Found ${files.length} DICOM files`);
  
  // Load slices in batches
  const slices: DicomSlice[] = [];
  const batchSize = 5;
  let minValue = Infinity;
  let maxValue = -Infinity;
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(file => 
      parseDicomFile(`/dicom/${folder}/${file}`)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const slice of batchResults) {
      if (slice) {
        slices.push(slice);
        // Track min/max for windowing
        for (let j = 0; j < slice.pixelData.length; j++) {
          const val = slice.pixelData[j] * slice.metadata.rescaleSlope + slice.metadata.rescaleIntercept;
          if (val < minValue) minValue = val;
          if (val > maxValue) maxValue = val;
        }
      }
    }
    
    onProgress?.(Math.min(i + batchSize, files.length), files.length);
  }
  
  // Sort by instance number or slice location
  slices.sort((a, b) => {
    if (a.metadata.sliceLocation !== undefined && b.metadata.sliceLocation !== undefined) {
      return a.metadata.sliceLocation - b.metadata.sliceLocation;
    }
    return (a.instanceNumber || 0) - (b.instanceNumber || 0);
  });
  
  // Compute default window from first slice or data range
  let defaultWindowCenter = 40;
  let defaultWindowWidth = 400;
  
  if (slices.length > 0) {
    const firstSlice = slices[0];
    if (firstSlice.metadata.windowCenter !== undefined) {
      defaultWindowCenter = firstSlice.metadata.windowCenter;
    }
    if (firstSlice.metadata.windowWidth !== undefined) {
      defaultWindowWidth = firstSlice.metadata.windowWidth;
    }
  }
  
  // If no window values in DICOM, compute from data
  if (defaultWindowCenter === 40 && defaultWindowWidth === 400 && isFinite(minValue) && isFinite(maxValue)) {
    defaultWindowCenter = (minValue + maxValue) / 2;
    defaultWindowWidth = maxValue - minValue;
  }
  
  console.log(`[DicomLoader] Loaded ${slices.length} slices. Window: C=${defaultWindowCenter}, W=${defaultWindowWidth}`);
  
  return {
    folder,
    slices,
    loaded: slices.length > 0,
    minValue: isFinite(minValue) ? minValue : 0,
    maxValue: isFinite(maxValue) ? maxValue : 4095,
    defaultWindowCenter,
    defaultWindowWidth,
  };
}

/**
 * Render a DICOM slice to ImageData with windowing
 */
export function renderDicomSlice(
  slice: DicomSlice,
  windowCenter: number,
  windowWidth: number,
  brightness: number = 100,
  contrast: number = 100
): ImageData {
  const { metadata, pixelData } = slice;
  const { rows, columns, rescaleSlope, rescaleIntercept } = metadata;
  
  const imageData = new ImageData(columns, rows);
  const data = imageData.data;
  
  // Window calculations
  const windowMin = windowCenter - windowWidth / 2;
  const windowMax = windowCenter + windowWidth / 2;
  
  // Brightness/contrast adjustments
  const brightFactor = brightness / 100;
  const contrastFactor = (259 * (contrast + 155)) / (255 * (259 - contrast + 155));
  
  for (let i = 0; i < pixelData.length; i++) {
    // Apply rescale transform (Hounsfield units for CT)
    let value = pixelData[i] * rescaleSlope + rescaleIntercept;
    
    // Apply windowing
    let normalized: number;
    if (value <= windowMin) {
      normalized = 0;
    } else if (value >= windowMax) {
      normalized = 255;
    } else {
      normalized = ((value - windowMin) / windowWidth) * 255;
    }
    
    // Apply brightness
    normalized *= brightFactor;
    
    // Apply contrast
    normalized = contrastFactor * (normalized - 128) + 128;
    
    // Clamp
    const finalValue = Math.max(0, Math.min(255, Math.round(normalized)));
    
    // Set RGBA (grayscale)
    const pixelIndex = i * 4;
    data[pixelIndex] = finalValue;     // R
    data[pixelIndex + 1] = finalValue; // G
    data[pixelIndex + 2] = finalValue; // B
    data[pixelIndex + 3] = 255;        // A
  }
  
  return imageData;
}

/**
 * Check if DICOM files are available for a case
 */
export function hasDicomFiles(caseId: string): boolean {
  return caseId in CASE_DICOM_MAPPING;
}

/**
 * Get DICOM folder for a case
 */
export function getDicomFolder(caseId: string): string | null {
  const mapping = CASE_DICOM_MAPPING[caseId];
  return mapping ? mapping.folder : null;
}
