/**
 * OncoSeg Segmentation API Route
 * 
 * Provides 3D tumor segmentation using OncoSeg (MedSAM3 fine-tuned on 98K+ medical images).
 * 
 * POST /api/imaging/segment
 * Body: { niftiBase64: string, checkpoint: string, sliceIdx?: number }
 * 
 * Returns: Segmentation contours and tumor volume estimation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOncoSegClient,
  OncoSegCheckpoint,
  calculateTumorVolume,
  CHECKPOINT_INFO
} from '@/lib/oncoseg';
import { verifyApiAuth } from '@/lib/api-auth';

export const maxDuration = 120; // Allow 2 minutes for GPU inference

interface SegmentRequest {
  niftiBase64: string;
  checkpoint?: OncoSegCheckpoint;
  sliceIdx?: number;
  textPrompt?: string;
  segmentVolume?: boolean; // If true, segment all slices
  voxelSpacing?: [number, number, number]; // For volume calculation [x,y,z] in mm
}

export async function POST(request: NextRequest) {
  const authError = verifyApiAuth(request);
  if (authError) return authError;

  try {
    const body: SegmentRequest = await request.json();

    if (!body.niftiBase64) {
      return NextResponse.json(
        { error: 'niftiBase64 is required' },
        { status: 400 }
      );
    }

    const client = getOncoSegClient();
    const checkpoint = body.checkpoint || 'brain';
    
    console.log(`[OncoSeg API] Segmenting with checkpoint: ${checkpoint}, volume: ${body.segmentVolume}`);

    // Check if OncoSeg space is available
    const health = await client.healthCheck();
    if (!health.available) {
      console.warn(`[OncoSeg API] Space status: ${health.status}`);
      // Continue anyway - the client will handle errors
    }

    if (body.segmentVolume) {
      // Full volume segmentation
      const result = await client.segmentVolume({
        niftiBase64: body.niftiBase64,
        checkpoint,
        textPrompt: body.textPrompt || 'tumor',
        skipEmpty: true,
        minArea: 50,
      });

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || 'Segmentation failed',
            spaceStatus: health.status,
            retryHint: 'The OncoSeg space may be sleeping. Wait 30-60 seconds and try again.'
          },
          { status: 503 }
        );
      }

      // Calculate tumor volume if voxel spacing provided
      let tumorVolume = null;
      if (body.voxelSpacing && Object.keys(result.contours).length > 0) {
        tumorVolume = calculateTumorVolume(result.contours, body.voxelSpacing);
      }

      return NextResponse.json({
        success: true,
        backend: result.backend,
        checkpoint: result.checkpoint,
        checkpointInfo: CHECKPOINT_INFO[checkpoint],
        contours: result.contours,
        numSlices: result.numSlices,
        slicesWithTumor: result.slicesWithTumor,
        tumorVolume,
        inferenceTimeMs: result.inferenceTimeMs,
      });

    } else {
      // Single slice segmentation
      const sliceIdx = body.sliceIdx ?? 0;
      
      const result = await client.segmentSlice({
        niftiBase64: body.niftiBase64,
        sliceIdx,
        checkpoint,
        textPrompt: body.textPrompt || 'tumor',
      });

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || 'Segmentation failed',
            spaceStatus: health.status,
            retryHint: 'The OncoSeg space may be sleeping. Wait 30-60 seconds and try again.'
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        success: true,
        backend: result.backend,
        checkpoint: result.checkpoint,
        checkpointInfo: CHECKPOINT_INFO[checkpoint],
        sliceIdx: result.sliceIdx,
        contours: result.contours,
        maskBase64: result.maskBase64,
        maskShape: result.maskShape,
        inferenceTimeMs: result.inferenceTimeMs,
      });
    }

  } catch (error) {
    console.error('[OncoSeg API] Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        hint: 'Check if the OncoSeg HuggingFace Space is running at https://huggingface.co/spaces/tp53/oncoseg-api'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const client = getOncoSegClient();
    const health = await client.healthCheck();
    
    return NextResponse.json({
      service: 'oncoseg',
      ...health,
      checkpoints: Object.entries(CHECKPOINT_INFO).map(([id, info]) => ({
        id,
        ...info,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        service: 'oncoseg',
        available: false, 
        status: 'Error checking health',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
