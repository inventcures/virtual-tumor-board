/**
 * API Route: /api/imaging/analyze
 * Analyze medical images using MedGemma or Gemini fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { getMedGemmaClient } from "@/lib/medgemma/client";
import { MedGemmaImageInput, AnalysisContext } from "@/types/imaging";

export const maxDuration = 60; // Allow up to 60 seconds for analysis

interface AnalyzeRequest {
  imageData: string;  // Base64 data URL
  modality?: string;
  bodyPart?: string;
  source?: 'dicom' | 'photo' | 'gallery';
  analysisType?: 'general' | 'oncology' | 'recist';
  cancerType?: string;
  clinicalQuestion?: string;
  priorStudyDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    
    if (!body.imageData) {
      return NextResponse.json(
        { error: "imageData is required" },
        { status: 400 }
      );
    }

    // Parse image data
    let base64Data = body.imageData;
    let mimeType: 'image/png' | 'image/jpeg' = 'image/png';
    
    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1] as 'image/png' | 'image/jpeg';
        base64Data = match[2];
      }
    }

    // Prepare image input
    const imageInput: MedGemmaImageInput = {
      base64: base64Data,
      mimeType,
      metadata: {
        modality: body.modality || 'OT',
        bodyPart: body.bodyPart || 'Unknown',
        source: body.source || 'photo',
      },
    };

    // Prepare analysis context
    const context: AnalysisContext = {
      analysisType: body.analysisType || 'oncology',
      cancerType: body.cancerType,
      clinicalQuestion: body.clinicalQuestion,
      priorStudyDate: body.priorStudyDate,
    };

    // Initialize MedGemma client with API keys
    const client = getMedGemmaClient({
      provider: process.env.HUGGINGFACE_API_KEY ? 'huggingface' : 'huggingface',
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });

    // Analyze image
    const result = await client.analyzeImage(imageInput, context);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Image analysis error:", error);
    
    // Return a helpful error response
    return NextResponse.json(
      { 
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
        // Return demo response so UI still works
        interpretation: "Analysis temporarily unavailable. Please try again.",
        findings: [],
        measurements: [],
        impression: "Unable to analyze image at this time.",
        recommendations: ["Please retry the analysis or check API configuration."],
        confidence: 0.1,
      },
      { status: 500 }
    );
  }
}
