"use client";

/**
 * GalleryUpload - Upload existing photos from device gallery
 */

import { useState, useCallback, useRef } from "react";
import { 
  Image as ImageIcon, Upload, ChevronLeft, 
  CheckCircle, X, Loader2, AlertTriangle
} from "lucide-react";

interface GalleryUploadProps {
  onUpload: (imageDataUrl: string, file: File) => void;
  onCancel: () => void;
}

export function GalleryUpload({ onUpload, onCancel }: GalleryUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File too large. Maximum size is 25MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setIsProcessing(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      
      // Optionally compress if too large
      compressImage(dataUrl, file.type).then(compressed => {
        setPreviewUrl(compressed);
        setIsProcessing(false);
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const compressImage = async (dataUrl: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Max dimension 2048px
        const maxDim = 2048;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL(mimeType, 0.9));
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original
      img.src = dataUrl;
    });
  };

  const handleConfirm = () => {
    if (previewUrl && selectedFile) {
      onUpload(previewUrl, selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">Upload from Gallery</h2>
          <p className="text-sm text-slate-400">Select existing photos of scans</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File Input / Preview */}
      {!previewUrl ? (
        <label className="block cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-xl p-12 text-center transition-colors">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-white font-medium mb-2">Select an image</p>
            <p className="text-sm text-slate-400">JPG, PNG, WebP up to 25MB</p>
          </div>
        </label>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden">
            {isProcessing ? (
              <div className="aspect-video flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <img 
                src={previewUrl} 
                alt="Selected image"
                className="w-full h-auto max-h-[50vh] object-contain"
              />
            )}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
              <ImageIcon className="w-5 h-5 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        {previewUrl && (
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Analyze with MedGemma
              </>
            )}
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Best practices:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Photos should be clear and well-lit</li>
          <li>• Avoid blurry or partially cropped images</li>
          <li>• Higher resolution provides better analysis</li>
          <li>• Remove any personal documents from the frame</li>
        </ul>
      </div>
    </div>
  );
}
