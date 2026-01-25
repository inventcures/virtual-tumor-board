/**
 * OncoSeg - Medical Image Segmentation
 * 
 * Integration with the Onco-Seg HuggingFace Space for 3D medical volume segmentation.
 * Uses MedSAM3 (SAM3 + LoRA fine-tuned on 98K+ medical imaging cases).
 */

export {
  OncoSegClient,
  getOncoSegClient,
  niftiToBase64,
  decodeMask,
  calculateTumorVolume,
  CHECKPOINT_INFO,
} from './client';

export type {
  OncoSegConfig,
  OncoSegSliceRequest,
  OncoSegVolumeRequest,
  OncoSegSliceResponse,
  OncoSegVolumeResponse,
  OncoSegCheckpoint,
  Contour,
} from './client';
