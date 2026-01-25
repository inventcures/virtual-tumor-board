/**
 * OncoSeg API Client
 * 
 * Client for the Onco-Seg HuggingFace Space API.
 * Provides 3D medical volume segmentation using MedSAM3 (SAM3 + LoRA fine-tuned on medical images).
 * 
 * API: https://tp53-oncoseg-inference-api.hf.space
 * Model: tp53/oncoseg (98K+ medical imaging cases)
 * 
 * Capabilities:
 * - Brain tumor segmentation (BraTS MRI)
 * - Liver lesion segmentation (CT)
 * - Breast tumor segmentation (DCE-MRI)
 * - Lung nodule/cancer segmentation (CT)
 * - Kidney tumor segmentation (CT)
 */

export interface OncoSegConfig {
  spaceUrl?: string;
  hfToken?: string;
  timeout?: number;
}

export interface OncoSegSliceRequest {
  niftiBase64: string;
  sliceIdx: number;
  textPrompt?: string;
  checkpoint?: OncoSegCheckpoint;
  pointX?: number;
  pointY?: number;
}

export interface OncoSegVolumeRequest {
  niftiBase64: string;
  textPrompt?: string;
  checkpoint?: OncoSegCheckpoint;
  skipEmpty?: boolean;
  minArea?: number;
}

export interface Contour {
  points: [number, number][];
}

export interface OncoSegSliceResponse {
  success: boolean;
  error?: string;
  backend: 'sam3' | 'fallback';
  maskBase64?: string;
  maskShape?: [number, number];
  contours?: Contour[];
  sliceIdx: number;
  inferenceTimeMs: number;
  checkpoint: string;
}

export interface OncoSegVolumeResponse {
  success: boolean;
  error?: string;
  backend: 'sam3' | 'fallback';
  contours: Record<string, Contour[]>;  // slice index -> contours
  numSlices: number;
  slicesWithTumor: string[];
  inferenceTimeMs: number;
  checkpoint: string;
}

export type OncoSegCheckpoint = 'brain' | 'liver' | 'breast' | 'lung' | 'kidney' | 'spine';

// Default HF Space URL
const DEFAULT_SPACE_URL = 'https://tp53-oncoseg-inference-api.hf.space';

// Checkpoint descriptions for UI
export const CHECKPOINT_INFO: Record<OncoSegCheckpoint, { name: string; modality: string; description: string }> = {
  brain: { name: 'Brain Tumor', modality: 'MRI', description: 'Glioblastoma, brain tumors (BraTS)' },
  liver: { name: 'Liver', modality: 'CT', description: 'Liver lesions, HCC' },
  breast: { name: 'Breast', modality: 'MRI', description: 'Breast tumors (DCE-MRI)' },
  lung: { name: 'Lung', modality: 'CT', description: 'Lung cancer, nodules' },
  kidney: { name: 'Kidney', modality: 'CT', description: 'Kidney tumors (KiTS)' },
  spine: { name: 'Spine', modality: 'CT', description: 'Spine structures' },
};

export class OncoSegClient {
  private config: Required<OncoSegConfig>;

  constructor(config: OncoSegConfig = {}) {
    this.config = {
      spaceUrl: config.spaceUrl || process.env.ONCOSEG_SPACE_URL || DEFAULT_SPACE_URL,
      hfToken: config.hfToken || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '',
      timeout: config.timeout || 120000, // 2 minutes default (model loading can be slow)
    };
  }

  /**
   * Segment a single slice from a NIfTI volume
   */
  async segmentSlice(request: OncoSegSliceRequest): Promise<OncoSegSliceResponse> {
    const startTime = Date.now();
    
    console.log(`[OncoSeg] Segmenting slice ${request.sliceIdx} with checkpoint: ${request.checkpoint || 'brain'}`);

    try {
      // Gradio API uses async pattern: POST to initiate, then GET result
      const initResponse = await fetch(`${this.config.spaceUrl}/gradio_api/call/segment_slice_api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.hfToken ? { 'Authorization': `Bearer ${this.config.hfToken}` } : {}),
        },
        body: JSON.stringify({
          data: [
            request.niftiBase64,
            request.sliceIdx,
            request.textPrompt || 'tumor',
            request.checkpoint || 'brain',
            request.pointX ?? null,
            request.pointY ?? null,
          ],
        }),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        
        // Check if space is sleeping/loading
        if (initResponse.status === 503 || errorText.includes('loading') || errorText.includes('sleeping')) {
          throw new Error(`OncoSeg Space is loading. Please wait 30-60 seconds and try again.`);
        }
        
        throw new Error(`OncoSeg API error: ${initResponse.status} - ${errorText}`);
      }

      const initData = await initResponse.json();
      const eventId = initData.event_id;

      if (!eventId) {
        throw new Error('OncoSeg API did not return event_id');
      }

      console.log(`[OncoSeg] Got event_id: ${eventId}, polling for result...`);

      // Poll for result (SSE endpoint)
      const resultResponse = await fetch(`${this.config.spaceUrl}/gradio_api/call/segment_slice_api/${eventId}`, {
        method: 'GET',
        headers: {
          ...(this.config.hfToken ? { 'Authorization': `Bearer ${this.config.hfToken}` } : {}),
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`OncoSeg result error: ${resultResponse.status}`);
      }

      // Parse SSE response
      const resultText = await resultResponse.text();
      const result = this.parseSSEResponse(resultText);

      if (!result.success) {
        throw new Error(result.error || 'Segmentation failed');
      }

      const totalTime = Date.now() - startTime;
      console.log(`[OncoSeg] Segmentation complete in ${totalTime}ms (inference: ${result.inferenceTimeMs}ms)`);

      return result;

    } catch (error) {
      console.error('[OncoSeg] Segmentation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        backend: 'fallback',
        sliceIdx: request.sliceIdx,
        inferenceTimeMs: Date.now() - startTime,
        checkpoint: request.checkpoint || 'brain',
      };
    }
  }

  /**
   * Segment an entire NIfTI volume (all slices)
   */
  async segmentVolume(request: OncoSegVolumeRequest): Promise<OncoSegVolumeResponse> {
    const startTime = Date.now();
    
    console.log(`[OncoSeg] Segmenting full volume with checkpoint: ${request.checkpoint || 'brain'}`);

    try {
      const initResponse = await fetch(`${this.config.spaceUrl}/gradio_api/call/segment_volume_api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.hfToken ? { 'Authorization': `Bearer ${this.config.hfToken}` } : {}),
        },
        body: JSON.stringify({
          data: [
            request.niftiBase64,
            request.textPrompt || 'tumor',
            request.checkpoint || 'brain',
            request.skipEmpty ?? true,
            request.minArea ?? 50,
          ],
        }),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`OncoSeg API error: ${initResponse.status} - ${errorText}`);
      }

      const initData = await initResponse.json();
      const eventId = initData.event_id;

      if (!eventId) {
        throw new Error('OncoSeg API did not return event_id');
      }

      // Poll for result - volume segmentation takes longer
      const resultResponse = await fetch(`${this.config.spaceUrl}/gradio_api/call/segment_volume_api/${eventId}`, {
        method: 'GET',
        headers: {
          ...(this.config.hfToken ? { 'Authorization': `Bearer ${this.config.hfToken}` } : {}),
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`OncoSeg result error: ${resultResponse.status}`);
      }

      const resultText = await resultResponse.text();
      const result = this.parseSSEVolumeResponse(resultText);

      const totalTime = Date.now() - startTime;
      console.log(`[OncoSeg] Volume segmentation complete in ${totalTime}ms, ${result.slicesWithTumor.length} slices with detections`);

      return result;

    } catch (error) {
      console.error('[OncoSeg] Volume segmentation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        backend: 'fallback',
        contours: {},
        numSlices: 0,
        slicesWithTumor: [],
        inferenceTimeMs: Date.now() - startTime,
        checkpoint: request.checkpoint || 'brain',
      };
    }
  }

  /**
   * Parse SSE response for slice segmentation
   */
  private parseSSEResponse(sseText: string): OncoSegSliceResponse {
    const lines = sseText.split('\n');
    let eventType = '';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
      }
    }

    if (eventType === 'error' || !data || data === 'null') {
      return {
        success: false,
        error: 'Space returned error or empty result. It may be warming up - try again in 30s.',
        backend: 'fallback',
        sliceIdx: -1,
        inferenceTimeMs: 0,
        checkpoint: 'brain',
      };
    }

    try {
      const parsed = JSON.parse(data);
      
      // Handle Gradio response format (array or object)
      const result = Array.isArray(parsed) ? parsed[0] : parsed;

      return {
        success: result.success ?? true,
        error: result.error,
        backend: result.backend || 'sam3',
        maskBase64: result.mask_b64,
        maskShape: result.mask_shape,
        contours: result.contours?.map((c: number[][]) => ({ points: c })),
        sliceIdx: result.slice_idx ?? -1,
        inferenceTimeMs: result.inference_time_ms ?? 0,
        checkpoint: result.checkpoint || 'brain',
      };
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse response: ${data.substring(0, 100)}`,
        backend: 'fallback',
        sliceIdx: -1,
        inferenceTimeMs: 0,
        checkpoint: 'brain',
      };
    }
  }

  /**
   * Parse SSE response for volume segmentation
   */
  private parseSSEVolumeResponse(sseText: string): OncoSegVolumeResponse {
    const lines = sseText.split('\n');
    let data = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
      }
    }

    if (!data || data === 'null') {
      return {
        success: false,
        error: 'Empty response',
        backend: 'fallback',
        contours: {},
        numSlices: 0,
        slicesWithTumor: [],
        inferenceTimeMs: 0,
        checkpoint: 'brain',
      };
    }

    try {
      const parsed = JSON.parse(data);
      const result = Array.isArray(parsed) ? parsed[0] : parsed;

      // Convert contours format
      const contours: Record<string, Contour[]> = {};
      if (result.contours) {
        for (const [sliceIdx, sliceContours] of Object.entries(result.contours)) {
          contours[sliceIdx] = (sliceContours as number[][][]).map(c => ({ points: c as [number, number][] }));
        }
      }

      return {
        success: result.success ?? true,
        error: result.error,
        backend: result.backend || 'sam3',
        contours,
        numSlices: result.num_slices ?? 0,
        slicesWithTumor: result.slices_with_tumor ?? [],
        inferenceTimeMs: result.inference_time_ms ?? 0,
        checkpoint: result.checkpoint || 'brain',
      };
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse response`,
        backend: 'fallback',
        contours: {},
        numSlices: 0,
        slicesWithTumor: [],
        inferenceTimeMs: 0,
        checkpoint: 'brain',
      };
    }
  }

  /**
   * Check if the OncoSeg Space is available
   */
  async healthCheck(): Promise<{ available: boolean; status: string }> {
    try {
      const response = await fetch(`${this.config.spaceUrl}/gradio_api/info`, {
        method: 'GET',
        headers: {
          ...(this.config.hfToken ? { 'Authorization': `Bearer ${this.config.hfToken}` } : {}),
        },
      });

      if (response.ok) {
        return { available: true, status: 'Space is running' };
      } else if (response.status === 503) {
        return { available: false, status: 'Space is sleeping - will wake on first request' };
      } else {
        return { available: false, status: `Space returned ${response.status}` };
      }
    } catch (error) {
      return { available: false, status: `Connection failed: ${error}` };
    }
  }
}

// Singleton instance
let clientInstance: OncoSegClient | null = null;

export function getOncoSegClient(config?: OncoSegConfig): OncoSegClient {
  if (!clientInstance || config) {
    clientInstance = new OncoSegClient(config);
  }
  return clientInstance;
}

/**
 * Utility: Convert NIfTI ArrayBuffer to base64
 */
export function niftiToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility: Decode mask from base64
 */
export function decodeMask(maskBase64: string, shape: [number, number]): Uint8Array {
  const binary = atob(maskBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Utility: Calculate tumor volume from contours across slices
 */
export function calculateTumorVolume(
  contours: Record<string, Contour[]>,
  voxelSpacing: [number, number, number] // [x, y, z] in mm
): { volumeMm3: number; volumeCc: number } {
  let totalArea = 0;

  for (const sliceContours of Object.values(contours)) {
    for (const contour of sliceContours) {
      // Calculate polygon area using shoelace formula
      const points = contour.points;
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
      }
      totalArea += Math.abs(area) / 2;
    }
  }

  // Convert pixel area to mm² and then to volume
  const pixelAreaMm2 = totalArea * voxelSpacing[0] * voxelSpacing[1];
  const volumeMm3 = pixelAreaMm2 * voxelSpacing[2] * Object.keys(contours).length;
  const volumeCc = volumeMm3 / 1000;

  return { volumeMm3, volumeCc };
}
