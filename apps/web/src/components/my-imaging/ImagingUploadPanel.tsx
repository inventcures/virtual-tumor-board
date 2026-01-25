"use client";

/**
 * ImagingUploadPanel - Upload method selection UI
 */

import { Disc, Camera, Image as ImageIcon, Upload, Info } from "lucide-react";

type UploadMethod = 'select' | 'dicom' | 'camera' | 'gallery';

interface ImagingUploadPanelProps {
  onSelectMethod: (method: UploadMethod) => void;
}

export function ImagingUploadPanel({ onSelectMethod }: ImagingUploadPanelProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Upload Your Scans</h2>
        <p className="text-slate-400">
          Get AI-powered analysis of your medical imaging using MedGemma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* DICOM Upload */}
        <button
          onClick={() => onSelectMethod('dicom')}
          className="group p-6 rounded-xl border-2 border-slate-600 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-800/50 transition-all text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
            <Disc className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-white mb-2">Upload DICOM</h3>
          <p className="text-sm text-slate-400">
            From CD, USB drive, or digital copy. Supports CT, MRI, X-ray, PET scans.
          </p>
          <div className="mt-3 text-xs text-indigo-400 flex items-center gap-1">
            <span>Drag & drop supported</span>
          </div>
        </button>

        {/* Camera Capture */}
        <button
          onClick={() => onSelectMethod('camera')}
          className="group p-6 rounded-xl border-2 border-slate-600 hover:border-emerald-500 bg-slate-900/50 hover:bg-slate-800/50 transition-all text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
            <Camera className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-white mb-2">Take Photo</h3>
          <p className="text-sm text-slate-400">
            Capture X-ray films, mammograms, or printed scans with your phone camera.
          </p>
          <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
            <span>Best for physical films</span>
          </div>
        </button>

        {/* Gallery Upload */}
        <button
          onClick={() => onSelectMethod('gallery')}
          className="group p-6 rounded-xl border-2 border-slate-600 hover:border-purple-500 bg-slate-900/50 hover:bg-slate-800/50 transition-all text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
            <ImageIcon className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="font-semibold text-white mb-2">From Gallery</h3>
          <p className="text-sm text-slate-400">
            Upload existing photos of scans from your device gallery.
          </p>
          <div className="mt-3 text-xs text-purple-400 flex items-center gap-1">
            <span>JPG, PNG supported</span>
          </div>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900/50 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <p className="mb-1">
            <span className="text-white font-medium">Powered by MedGemma</span> - Google's medical imaging AI
          </p>
          <p>
            Your images are analyzed locally when possible. For cloud analysis, data is encrypted and auto-deleted after processing.
          </p>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Supported Imaging Types</h4>
        <div className="flex flex-wrap gap-2">
          {['Chest X-ray', 'CT Scan', 'MRI', 'PET/CT', 'Mammogram', 'Ultrasound', 'Bone Scan'].map(type => (
            <span 
              key={type}
              className="px-3 py-1 rounded-full text-xs bg-slate-700 text-slate-300"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
