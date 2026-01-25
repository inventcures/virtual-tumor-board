"use client";

/**
 * CameraCapture - Phone camera capture for X-ray films and printed scans
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  Camera, X, RotateCcw, Zap, ZapOff, Grid3X3,
  ChevronLeft, CheckCircle, AlertTriangle, Loader2
} from "lucide-react";
import { CapturedImage, QualityIssue } from "@/types/imaging";

type ImageType = 'xray' | 'mammogram' | 'ct-print' | 'ultrasound' | 'other';

interface CameraCaptureProps {
  onCapture: (image: CapturedImage) => void;
  onCancel: () => void;
  imageType: ImageType;
}

export function CameraCapture({ onCapture, onCancel, imageType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Start camera on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Back camera
            width: { ideal: 3840 },    // 4K if available
            height: { ideal: 2160 },
          }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Camera access error:', error);
        setCameraError('Unable to access camera. Please check permissions.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Analyze image quality
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qualityAnalysis = analyzeImageQuality(imageData);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const captured: CapturedImage = {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date(),
      qualityScore: qualityAnalysis.score,
      issues: qualityAnalysis.issues,
    };

    setCapturedImage(captured);
  }, []);

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Quality analysis
  function analyzeImageQuality(imageData: ImageData): {
    score: number;
    issues: QualityIssue[];
  } {
    const issues: QualityIssue[] = [];
    let score = 100;

    const data = imageData.data;
    let totalBrightness = 0;
    let brightPixels = 0;
    let darkPixels = 0;

    // Sample every 100th pixel for performance
    for (let i = 0; i < data.length; i += 400) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;

      if (brightness > 250) brightPixels++;
      if (brightness < 20) darkPixels++;
    }

    const avgBrightness = totalBrightness / (data.length / 400);
    const totalSamples = data.length / 400;

    // Check brightness
    if (avgBrightness < 60) {
      issues.push('too_dark');
      score -= 25;
    } else if (avgBrightness > 200) {
      issues.push('too_bright');
      score -= 20;
    }

    // Check for glare (high percentage of very bright pixels)
    const glareRatio = brightPixels / totalSamples;
    if (glareRatio > 0.1) {
      issues.push('glare_detected');
      score -= 20;
    }

    // Check resolution
    if (imageData.width < 1920 || imageData.height < 1080) {
      issues.push('low_resolution');
      score -= 15;
    }

    return { score: Math.max(0, score), issues };
  }

  const getQualityColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getIssueMessage = (issue: QualityIssue): string => {
    switch (issue) {
      case 'too_dark': return 'Image is too dark - try adding more light';
      case 'too_bright': return 'Image is too bright - reduce lighting';
      case 'glare_detected': return 'Glare detected - adjust angle to avoid reflections';
      case 'low_resolution': return 'Low resolution - move closer to the scan';
      case 'blurry': return 'Image appears blurry - hold camera steady';
      default: return 'Quality issue detected';
    }
  };

  // Camera error state
  if (cameraError) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-700">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">Camera Capture</h2>
        </div>
        
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Camera Access Required</p>
          <p className="text-sm text-slate-400 mb-6">{cameraError}</p>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Captured image review state
  if (capturedImage) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleRetake} className="p-2 rounded-lg hover:bg-slate-700">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">Review Photo</h2>
        </div>

        {/* Image Preview */}
        <div className="bg-slate-900 rounded-lg overflow-hidden mb-4">
          <img 
            src={capturedImage.dataUrl} 
            alt="Captured scan"
            className="w-full h-auto max-h-[60vh] object-contain"
          />
        </div>

        {/* Quality Assessment */}
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Image Quality</span>
            <span className={`font-medium ${getQualityColor(capturedImage.qualityScore)}`}>
              {capturedImage.qualityScore}%
            </span>
          </div>
          
          {capturedImage.issues.length > 0 ? (
            <div className="space-y-2">
              {capturedImage.issues.map((issue, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-yellow-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{getIssueMessage(issue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Good image quality</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retake
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera capture state
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-700">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h2 className="font-semibold text-white">Capture Scan Photo</h2>
            <p className="text-xs text-slate-400">Position your {imageType} within the frame</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          </div>
        )}

        {/* Capture Button */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 hover:bg-slate-100 active:scale-95 transition-transform flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200" />
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-slate-900/50">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Tips for best results:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Use good, even lighting</li>
          <li>• Avoid glare and shadows</li>
          <li>• Keep camera steady and parallel to the scan</li>
          <li>• Fill the frame with the scan area</li>
        </ul>
      </div>
    </div>
  );
}
