"use client";

/**
 * DicomUploader - DICOM and NIfTI file upload with drag-drop support
 * Supports:
 * - DICOM files (.dcm, .dicom, no extension)
 * - NIfTI files (.nii, .nii.gz) - common in neuroimaging/research
 * 
 * Parses files in browser using dicom-parser and nifti-reader-js
 */

import { useState, useCallback, useRef } from "react";
import { 
  Upload, Disc, FolderOpen, X, CheckCircle, 
  AlertCircle, Loader2, FileImage, ChevronLeft, Brain
} from "lucide-react";
import { ImagingStudy } from "@/types/imaging";

interface DicomUploaderProps {
  onUpload: (study: ImagingStudy, imageData: string) => void;
  onCancel: () => void;
}

interface ProcessedFile {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  fileType: 'dicom' | 'nifti' | 'image';
  metadata?: {
    patientName?: string;
    studyDate?: string;
    modality?: string;
    bodyPart?: string;
    rows?: number;
    cols?: number;
    slices?: number; // For NIfTI volumes
    dimensions?: [number, number, number]; // x, y, z dimensions
  };
}

export function DicomUploader({ onUpload, onCancel }: DicomUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageData, setProcessedImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  // Process NIfTI files (.nii, .nii.gz)
  const processNiftiFiles = async (niftiFiles: File[]) => {
    setIsProcessing(true);
    setFiles([{
      name: niftiFiles[0].name,
      status: 'processing',
      fileType: 'nifti'
    }]);

    try {
      const file = niftiFiles[0];
      let arrayBuffer = await file.arrayBuffer();
      
      // Decompress if .nii.gz
      if (file.name.toLowerCase().endsWith('.gz')) {
        const pako = await import('pako');
        const decompressed = pako.inflate(new Uint8Array(arrayBuffer));
        arrayBuffer = decompressed.buffer;
      }
      
      // Dynamic import of nifti-reader-js
      const nifti = await import('nifti-reader-js');
      
      if (!nifti.isNIFTI(arrayBuffer)) {
        throw new Error('Invalid NIfTI file');
      }
      
      const header = nifti.readHeader(arrayBuffer);
      const image = nifti.readImage(header, arrayBuffer);
      
      // Get dimensions
      const dims = header.dims;
      const nx = dims[1]; // x dimension
      const ny = dims[2]; // y dimension  
      const nz = dims[3]; // z dimension (slices)
      
      // Get middle slice for preview
      const middleSlice = Math.floor(nz / 2);
      const sliceSize = nx * ny;
      const sliceOffset = middleSlice * sliceSize;
      
      // Create typed array based on datatype
      let typedData: Float32Array | Int16Array | Uint8Array;
      const datatype = header.datatypeCode;
      
      if (datatype === 16) { // Float32
        typedData = new Float32Array(image);
      } else if (datatype === 4) { // Int16
        typedData = new Int16Array(image);
      } else if (datatype === 2) { // Uint8
        typedData = new Uint8Array(image);
      } else {
        // Default to Float32
        typedData = new Float32Array(image);
      }
      
      // Extract middle slice data
      const sliceData = typedData.slice(sliceOffset, sliceOffset + sliceSize);
      
      // Find min/max for normalization
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < sliceData.length; i++) {
        if (sliceData[i] < min) min = sliceData[i];
        if (sliceData[i] > max) max = sliceData[i];
      }
      
      // Create canvas and render
      const canvas = document.createElement('canvas');
      canvas.width = nx;
      canvas.height = ny;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(nx, ny);
      
      const range = max - min || 1;
      for (let i = 0; i < sliceData.length; i++) {
        const normalized = (sliceData[i] - min) / range;
        const gray = Math.round(normalized * 255);
        imageData.data[i * 4] = gray;
        imageData.data[i * 4 + 1] = gray;
        imageData.data[i * 4 + 2] = gray;
        imageData.data[i * 4 + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setProcessedImageData(dataUrl);
      
      // Update file status with metadata
      setFiles([{
        name: file.name,
        status: 'complete',
        fileType: 'nifti',
        metadata: {
          modality: 'MR', // NIfTI is typically MRI
          bodyPart: 'Brain', // Most common for NIfTI
          rows: ny,
          cols: nx,
          slices: nz,
          dimensions: [nx, ny, nz],
          studyDate: new Date().toISOString().split('T')[0],
        }
      }]);
      
    } catch (error) {
      console.error('NIfTI parsing error:', error);
      setFiles([{
        name: niftiFiles[0].name,
        status: 'error',
        fileType: 'nifti',
        error: 'Failed to parse NIfTI file'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processFiles = async (selectedFiles: File[]) => {
    // Check for NIfTI files first (.nii, .nii.gz)
    const niftiFiles = selectedFiles.filter(f => 
      f.name.toLowerCase().endsWith('.nii') ||
      f.name.toLowerCase().endsWith('.nii.gz')
    );
    
    if (niftiFiles.length > 0) {
      await processNiftiFiles(niftiFiles);
      return;
    }
    
    // Filter for DICOM files (no extension or .dcm)
    const dicomFiles = selectedFiles.filter(f => 
      !f.name.includes('.') || 
      f.name.toLowerCase().endsWith('.dcm') ||
      f.name.toLowerCase().endsWith('.dicom')
    );

    if (dicomFiles.length === 0) {
      // Try to process as image files
      const imageFiles = selectedFiles.filter(f => 
        f.type.startsWith('image/') ||
        f.name.toLowerCase().endsWith('.jpg') ||
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.png')
      );
      
      if (imageFiles.length > 0) {
        // Handle as regular images
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setProcessedImageData(dataUrl);
          setFiles([{
            name: imageFiles[0].name,
            status: 'complete',
            fileType: 'image',
            metadata: { modality: 'OT' }
          }]);
        };
        reader.readAsDataURL(imageFiles[0]);
        return;
      }
      
      alert('Please select DICOM (.dcm), NIfTI (.nii, .nii.gz), or image files (JPG, PNG)');
      return;
    }

    setIsProcessing(true);
    const processedFiles: ProcessedFile[] = dicomFiles.map(f => ({
      name: f.name,
      status: 'pending' as const,
      fileType: 'dicom' as const
    }));
    setFiles(processedFiles);

    // Process first DICOM file for preview
    try {
      const firstFile = dicomFiles[0];
      const arrayBuffer = await firstFile.arrayBuffer();
      
      // Dynamic import of dicom-parser
      const dicomParser = await import('dicom-parser');
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      
      // Extract metadata
      const metadata = {
        patientName: dataSet.string('x00100010') || 'Unknown',
        studyDate: dataSet.string('x00080020') || new Date().toISOString().split('T')[0],
        modality: dataSet.string('x00080060') || 'CT',
        bodyPart: dataSet.string('x00180015') || 'Unknown',
        rows: dataSet.uint16('x00280010') || 512,
        cols: dataSet.uint16('x00280011') || 512,
      };

      // Extract pixel data and convert to image
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (pixelDataElement) {
        const rows = metadata.rows;
        const cols = metadata.cols;
        const bitsAllocated = dataSet.uint16('x00280100') || 16;
        const pixelRepresentation = dataSet.uint16('x00280103') || 0;
        const windowCenter = parseFloat(dataSet.string('x00281050') || '40');
        const windowWidth = parseFloat(dataSet.string('x00281051') || '400');
        const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
        const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');

        let pixelData: Int16Array | Uint16Array | Uint8Array;
        
        if (bitsAllocated === 16) {
          if (pixelRepresentation === 1) {
            pixelData = new Int16Array(arrayBuffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);
          } else {
            pixelData = new Uint16Array(arrayBuffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);
          }
        } else {
          pixelData = new Uint8Array(arrayBuffer, pixelDataElement.dataOffset, pixelDataElement.length);
        }

        // Create canvas and render
        const canvas = document.createElement('canvas');
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d')!;
        const imageData = ctx.createImageData(cols, rows);

        const minVal = windowCenter - windowWidth / 2;
        const maxVal = windowCenter + windowWidth / 2;

        for (let i = 0; i < pixelData.length && i < rows * cols; i++) {
          let rawValue = pixelData[i];
          let hu = rawValue * rescaleSlope + rescaleIntercept;
          
          // Apply windowing
          let normalized = (hu - minVal) / (maxVal - minVal);
          normalized = Math.max(0, Math.min(1, normalized));
          const gray = Math.round(normalized * 255);

          imageData.data[i * 4] = gray;
          imageData.data[i * 4 + 1] = gray;
          imageData.data[i * 4 + 2] = gray;
          imageData.data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setProcessedImageData(dataUrl);
      }

      // Update files status
      setFiles(prev => prev.map((f, idx) => 
        idx === 0 
          ? { ...f, status: 'complete' as const, metadata }
          : { ...f, status: 'complete' as const }
      ));
    } catch (error) {
      console.error('DICOM parsing error:', error);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: 'Failed to parse DICOM file'
      })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!processedImageData || files.length === 0) return;

    const metadata = files[0].metadata || {};
    const study: ImagingStudy = {
      id: `study-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      studyDate: new Date(metadata.studyDate || Date.now()),
      uploadDate: new Date(),
      modality: metadata.modality || 'CT',
      bodyPart: metadata.bodyPart || 'Unknown',
      description: `${metadata.modality || 'DICOM'} - ${files.length} files`,
      sliceCount: files.length,
      source: 'dicom',
      measurements: [],
      isBaseline: true,
      timepoint: 'baseline',
      thumbnailDataUrl: processedImageData,
    };

    onUpload(study, processedImageData);
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
          <h2 className="text-lg font-semibold text-white">Upload Medical Imaging</h2>
          <p className="text-sm text-slate-400">DICOM, NIfTI (.nii.gz), or images from CD/USB</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-slate-600 hover:border-slate-500'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom,.nii,.nii.gz,image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Disc className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-white font-medium mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop medical imaging files'}
          </p>
          <p className="text-sm text-slate-400 mb-4">or click to browse</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-700/50 rounded">.dcm</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded">.dicom</span>
            <span className="px-2 py-1 bg-cyan-700/30 text-cyan-400 rounded flex items-center gap-1">
              <Brain className="w-3 h-3" />
              .nii / .nii.gz
            </span>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            {isProcessing ? 'Processing...' : `${files.length} file(s) ready`}
          </h3>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {files.slice(0, 5).map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
              >
                {file.fileType === 'nifti' ? (
                  <Brain className="w-5 h-5 text-cyan-400" />
                ) : (
                  <FileImage className="w-5 h-5 text-slate-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  {file.metadata && (
                    <p className="text-xs text-slate-400">
                      {file.metadata.modality} | {file.metadata.bodyPart}
                      {file.metadata.dimensions && (
                        <span className="ml-2 text-cyan-400">
                          {file.metadata.dimensions.join(' × ')} voxels
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {file.status === 'processing' && (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
                {file.status === 'complete' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            ))}
            {files.length > 5 && (
              <p className="text-sm text-slate-400 text-center py-2">
                +{files.length - 5} more files
              </p>
            )}
          </div>

          {/* Preview */}
          {processedImageData && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Preview (middle slice)</p>
              <img 
                src={processedImageData} 
                alt="DICOM preview"
                className="max-h-64 mx-auto rounded"
              />
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
        <button
          onClick={handleConfirm}
          disabled={!processedImageData || isProcessing}
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
      </div>
    </div>
  );
}
