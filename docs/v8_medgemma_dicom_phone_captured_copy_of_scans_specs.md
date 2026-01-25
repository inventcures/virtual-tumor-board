# V8 Feature Specs: MedGemma Integration with DICOM Upload & Phone-Captured Imaging

## Executive Summary

Add a dedicated **Imaging Tab** to the Virtual Tumor Board that allows users to upload their own medical imaging scans via:
1. **DICOM files** from CDs or digital copies
2. **Phone camera photos** of X-rays, mammograms, CT films, etc.

Integrate **Google MedGemma** (multimodal medical AI) for automated image interpretation, disease progression tracking, and RECIST-based response assessment.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Feature Goals & Success Metrics](#2-feature-goals--success-metrics)
3. [MedGemma Overview](#3-medgemma-overview)
4. [User Flow & UX Specifications](#4-user-flow--ux-specifications)
5. [Technical Architecture](#5-technical-architecture)
6. [DICOM Upload Implementation](#6-dicom-upload-implementation)
7. [Phone Camera Capture Implementation](#7-phone-camera-capture-implementation)
8. [MedGemma Integration](#8-medgemma-integration)
9. [Disease Progression & RECIST Tracking](#9-disease-progression--recist-tracking)
10. [**Dr. Chitran (Onco-Radiologist) Agent Integration**](#10-dr-chitran-onco-radiologist-agent-integration) **NEW**
11. [Security & Privacy](#11-security--privacy)
12. [Implementation Phases](#12-implementation-phases)
13. [API Specifications](#13-api-specifications)
14. [UI Component Specifications](#14-ui-component-specifications)
15. [Testing Strategy](#15-testing-strategy)
16. [Deployment Options](#16-deployment-options)
17. [Dependencies](#17-dependencies)
18. [Open Questions](#18-open-questions)

---

## 1. Problem Statement

### Current State
- Existing DICOM viewer only loads sample TCIA (The Cancer Imaging Archive) cases from Cloudflare R2 CDN
- Users can upload DICOM files via drag-drop in the viewer, but there's no AI interpretation
- No support for phone-captured photos of physical X-ray films or mammograms
- No disease progression tracking or response assessment over time
- No integration with state-of-the-art medical imaging AI models

### Target Users
1. **Patients/Caregivers**: Upload their scan CDs from hospitals to get AI interpretation
2. **Rural/Remote Patients**: Capture photos of X-ray films with their phones
3. **Oncologists**: Track disease progression across multiple timepoints
4. **Radiologists**: Get AI second-read assistance for complex cases

### User Pain Points
- Patients often receive CD/DVDs with DICOM images but cannot view or understand them
- In rural India, many imaging studies are still on physical films (X-rays, mammograms)
- No easy way to compare baseline vs follow-up scans for response assessment
- RECIST measurements require specialized training and are time-consuming

---

## 2. Feature Goals & Success Metrics

### Primary Goals
1. **Democratize Imaging Access**: Enable any user to upload and understand their scans
2. **AI-Powered Interpretation**: Use MedGemma for automated radiology reports
3. **Longitudinal Tracking**: Track disease progression, response, recurrence over time
4. **Mobile-First**: Optimize for phone camera capture on mobile devices

### Success Metrics

| Metric | Target |
|--------|--------|
| DICOM upload success rate | >90% |
| Phone photo quality acceptance | >75% |
| MedGemma interpretation latency | <15 seconds |
| RECIST calculation accuracy | >85% agreement with radiologist |
| User satisfaction (NPS) | >60 |
| Longitudinal tracking adoption | >30% return users |

---

## 3. MedGemma Overview

### What is MedGemma?
MedGemma is Google's collection of open models for medical text and image comprehension, built on Gemma 3. Available versions:

| Model | Parameters | Modality | Use Case |
|-------|------------|----------|----------|
| MedGemma 1.5 4B | 4 billion | Multimodal | Medical image interpretation, CT/MRI/WSI analysis |
| MedGemma 1 27B | 27 billion | Text-only | Complex clinical reasoning |
| MedGemma 1 27B | 27 billion | Multimodal | High-accuracy image + text |

### MedGemma 1.5 4B Capabilities
- **High-dimensional imaging**: CT, MRI, Whole-slide histopathology (WSI)
- **Longitudinal imaging**: Compare baseline vs follow-up scans
- **Anatomical localization**: Identify specific anatomical structures
- **Medical document understanding**: Extract structured data from reports
- **EHR interpretation**: Parse text-based electronic health records

### Access Methods
1. **Hugging Face**: `google/medgemma-4b-it` - Free for research
2. **Vertex AI Model Garden**: Scalable HTTPS endpoint deployment
3. **Local/Self-hosted**: Download and run on GPU servers

### Key Resources
- Kaggle Competition: https://www.kaggle.com/competitions/med-gemma-impact-challenge
- Developer Docs: https://developers.google.com/health-ai-developer-foundations/medgemma
- GitHub: https://github.com/google-health/medgemma
- Notebooks:
  - Quick Start: `notebooks/quick_start_with_hugging_face.ipynb`
  - Fine-tuning: `notebooks/fine_tune_with_hugging_face.ipynb`
  - Model Garden: `notebooks/quick_start_with_model_garden.ipynb`

---

## 4. User Flow & UX Specifications

### 4.1 Entry Points

```
[Homepage / Demo Page]
     |
     +-- [Case Summary Tab]  --> Existing: Patient info, biomarkers
     |
     +-- [Imaging Review Tab]  --> Existing: DICOM viewer for demo cases
     |
     +-- [My Imaging Tab] --> NEW: User's own scan uploads
              |
              +-- [Upload DICOM from CD/USB]
              |
              +-- [Capture Photo with Phone]
              |
              +-- [Upload from Gallery]
              |
              +-- [View Progression Timeline]
```

### 4.2 New "My Imaging" Tab Flow

```
+-----------------------------------------------------------------------------+
|  STEP 1: Select Upload Method                                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  How would you like to add your scans?                                      |
|                                                                             |
|  +-------------------+  +-------------------+  +-------------------+        |
|  |                   |  |                   |  |                   |        |
|  |   [CD/USB Icon]   |  |  [Camera Icon]    |  |  [Gallery Icon]   |        |
|  |                   |  |                   |  |                   |        |
|  |  Upload DICOM     |  |  Take Photo       |  |  Upload from      |        |
|  |  from CD/USB      |  |  of X-ray/Film    |  |  Phone Gallery    |        |
|  |                   |  |                   |  |                   |        |
|  +-------------------+  +-------------------+  +-------------------+        |
|                                                                             |
|  OR drag & drop DICOM files / photos anywhere on this page                  |
|                                                                             |
+-----------------------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------------------+
|  STEP 2: File Processing & Metadata                                          |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Processing your images...                                                  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  | File                  | Status          | Type        | Date         |  |
|  |-----------------------|-----------------|-------------|--------------|  |
|  | CT_CHEST_001.dcm      | [=====] 100%    | CT Thorax   | 2024-01-15   |  |
|  | CT_CHEST_002.dcm      | [====  ] 80%    | CT Thorax   | 2024-01-15   |  |
|  | ...135 more files     | [==    ] 40%    | CT Thorax   | 2024-01-15   |  |
|  | xray_chest_photo.jpg  | [======] Done   | CXR Photo   | 2024-01-20   |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  Detected Study: CT Chest with Contrast - 137 slices                        |
|  Patient: [Auto-detected or editable] ________________________              |
|  Study Date: [Auto-detected] 2024-01-15                                     |
|  Body Part: [Auto-detected] Chest                                           |
|  Modality: [Auto-detected] CT                                               |
|                                                                             |
|  [ ] This is a follow-up scan (I have a baseline)                           |
|                                                                             |
+-----------------------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------------------+
|  STEP 3: AI Analysis with MedGemma                                           |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-------------------------------------+  +-------------------------------+  |
|  |                                     |  |                               |  |
|  |   [DICOM Viewer]                    |  |   AI Interpretation           |  |
|  |                                     |  |   (powered by MedGemma)       |  |
|  |   +-----------------------------+   |  |                               |  |
|  |   |                             |   |  |   Analyzing... [====  ] 60%   |  |
|  |   |   Axial CT Slice 75/137     |   |  |                               |  |
|  |   |   [Image with AI overlay]   |   |  |   FINDINGS:                   |  |
|  |   |                             |   |  |   - 2.3cm RUL mass identified |  |
|  |   +-----------------------------+   |  |   - Mediastinal lymphadenopathy|  |
|  |                                     |  |   - No pleural effusion       |  |
|  |   [Slice] ===|====== [137]          |  |                               |  |
|  |   [Windowing: Lung v] [Tools...]    |  |   IMPRESSION:                 |  |
|  |                                     |  |   Suspicious for primary lung |  |
|  |   [AI Findings Overlay] [On/Off]    |  |   malignancy. Recommend...    |  |
|  |                                     |  |                               |  |
|  +-------------------------------------+  +-------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |  MEASUREMENTS (Click to verify/edit)                                  |  |
|  |  +------------------+------------------+------------------+            |  |
|  |  | Lesion 1 (RUL)   | Lesion 2 (LN)    | Add Lesion...    |            |  |
|  |  | 23mm x 18mm      | 12mm             |                  |            |  |
|  |  | Target: Yes      | Target: Yes      |                  |            |  |
|  |  +------------------+------------------+------------------+            |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  [Save to My Timeline]  [Download Report (PDF)]  [Share with Doctor]        |
|                                                                             |
+-----------------------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------------------+
|  STEP 4: Progression Timeline (for returning users)                          |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Disease Progression Timeline                                               |
|                                                                             |
|  Jan 2024          Apr 2024          Jul 2024          Oct 2024             |
|      |                |                  |                 |                |
|      v                v                  v                 v                |
|  [Baseline]      [Follow-up 1]      [Follow-up 2]     [Follow-up 3]        |
|  CT Chest        CT Chest           CT Chest          CT Chest             |
|  RUL: 23mm       RUL: 18mm          RUL: 12mm         RUL: 8mm             |
|                  Response: PR        Response: PR      Response: PR         |
|                  (-22%)              (-33%)            (-33%)               |
|                                                                             |
|  Overall Response: PARTIAL RESPONSE (RECIST 1.1)                            |
|  Sum of Target Lesions: 35mm -> 27mm -> 18mm -> 12mm                        |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  [Line chart showing lesion size over time]                           |  |
|  |                                                                       |  |
|  |  35mm  |  *                                                           |  |
|  |  30mm  |    \                                                         |  |
|  |  25mm  |      \                                                       |  |
|  |  20mm  |        *                                                     |  |
|  |  15mm  |          \                                                   |  |
|  |  10mm  |            *---*                                             |  |
|  |        +------+------+------+------+                                  |  |
|  |             Jan    Apr    Jul    Oct                                  |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  [Add New Scan]  [Export Full Report]  [Share Timeline with Oncologist]     |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 4.3 Mobile-Specific UX (Phone Camera Capture)

```
+---------------------------+
|  [<] Capture Scan Photo   |
+---------------------------+
|                           |
|  +---------------------+  |
|  |                     |  |
|  |   [Camera Preview]  |  |
|  |                     |  |
|  |   Position your     |  |
|  |   X-ray/film within |  |
|  |   the frame         |  |
|  |                     |  |
|  |   [Alignment Guide] |  |
|  |                     |  |
|  +---------------------+  |
|                           |
|  Tips:                    |
|  - Use good lighting      |
|  - Avoid glare/shadows    |
|  - Keep camera steady     |
|  - Fill frame with scan   |
|                           |
|  [Flash: Auto] [Grid: On] |
|                           |
|     [ Capture Photo ]     |
|                           |
+---------------------------+
```

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
+-----------------------------------------------------------------------------+
|                          Virtual Tumor Board App                             |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +---------------------------+  +---------------------------+               |
|  |    Frontend (Next.js)     |  |    My Imaging Tab         |               |
|  |                           |  |    (NEW)                  |               |
|  |  +---------------------+  |  |  +---------------------+  |               |
|  |  | ModernDicomViewer   |  |  |  | ImagingUploadPanel  |  |               |
|  |  | (existing)          |  |  |  | - DICOM dropzone    |  |               |
|  |  +---------------------+  |  |  | - Camera capture    |  |               |
|  |                           |  |  | - Gallery upload    |  |               |
|  |  +---------------------+  |  |  +---------------------+  |               |
|  |  | DicomParser         |  |  |                           |               |
|  |  | (client-side)       |  |  |  +---------------------+  |               |
|  |  +---------------------+  |  |  | MedGemmaPanel       |  |               |
|  +---------------------------+  |  | - AI interpretation |  |               |
|                                 |  | - Measurements      |  |               |
|                                 |  +---------------------+  |               |
|                                 |                           |               |
|                                 |  +---------------------+  |               |
|                                 |  | ProgressionTimeline |  |               |
|                                 |  | - RECIST tracking   |  |               |
|                                 |  | - Response charts   |  |               |
|                                 |  +---------------------+  |               |
|                                 +---------------------------+               |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      | API Calls
                                      v
+-----------------------------------------------------------------------------+
|                           API Layer (Next.js API Routes)                     |
+-----------------------------------------------------------------------------+
|                                                                             |
|  /api/imaging/                                                              |
|  +-------------------+  +-------------------+  +-------------------+        |
|  | upload/route.ts   |  | analyze/route.ts  |  | progress/route.ts |        |
|  | - DICOM upload    |  | - MedGemma call   |  | - RECIST calc     |        |
|  | - Photo upload    |  | - Report gen      |  | - Timeline data   |        |
|  +-------------------+  +-------------------+  +-------------------+        |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      | External Services
                                      v
+-----------------------------------------------------------------------------+
|                           AI/ML Services                                     |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Option A: Vertex AI                    Option B: HuggingFace Pro           |
|  +-----------------------------+        +-----------------------------+     |
|  | Model Garden                |        | Inference API               |     |
|  | - MedGemma 4B endpoint      |        | - medgemma-4b-it            |     |
|  | - Auto-scaling              |        | - Dedicated endpoint        |     |
|  | - Low latency               |        | - Cost-effective            |     |
|  +-----------------------------+        +-----------------------------+     |
|                                                                             |
|  Option C: Self-Hosted (Railway/Render)                                     |
|  +-----------------------------+                                            |
|  | Python Service              |                                            |
|  | - vLLM / TGI serving        |                                            |
|  | - A100 GPU                  |                                            |
|  | - Full control              |                                            |
|  +-----------------------------+                                            |
|                                                                             |
+-----------------------------------------------------------------------------+
                                      |
                                      | Storage
                                      v
+-----------------------------------------------------------------------------+
|                           Storage Layer                                      |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Cloudflare R2 (existing)           Browser Storage (MVP)                   |
|  +-----------------------------+    +-----------------------------+         |
|  | User DICOM uploads          |    | IndexedDB                   |         |
|  | - Encrypted at rest         |    | - DICOM pixel data cache    |         |
|  | - Auto-delete after 7 days  |    | - Measurement history       |         |
|  +-----------------------------+    +-----------------------------+         |
|                                                                             |
|  Supabase (Future)                                                          |
|  +-----------------------------+                                            |
|  | imaging_sessions            |                                            |
|  | imaging_studies             |                                            |
|  | imaging_measurements        |                                            |
|  | progression_timelines       |                                            |
|  +-----------------------------+                                            |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 5.2 Component Hierarchy

```
apps/web/src/
├── app/
│   ├── demo/
│   │   └── page.tsx                    # MODIFIED: Add "My Imaging" tab
│   │
│   └── api/
│       └── imaging/                    # NEW: Imaging API routes
│           ├── upload/route.ts         # Handle DICOM/photo uploads
│           ├── analyze/route.ts        # MedGemma analysis endpoint
│           ├── measurements/route.ts   # Save/retrieve measurements
│           └── progression/route.ts    # RECIST calculations
│
├── components/
│   ├── imaging/                        # EXISTING: Modify
│   │   ├── ModernDicomViewer.tsx      # MODIFY: Integrate MedGemma overlay
│   │   └── ...
│   │
│   └── my-imaging/                     # NEW: User imaging components
│       ├── MyImagingTab.tsx           # Main tab container
│       ├── ImagingUploadPanel.tsx     # Upload method selection
│       ├── DicomUploader.tsx          # DICOM file upload component
│       ├── CameraCapture.tsx          # Phone camera component
│       ├── GalleryUpload.tsx          # Photo gallery upload
│       ├── MedGemmaPanel.tsx          # AI interpretation display
│       ├── MeasurementTools.tsx       # RECIST measurement UI
│       ├── ProgressionTimeline.tsx    # Disease tracking timeline
│       ├── ResponseChart.tsx          # Lesion size charts
│       └── StudyMetadata.tsx          # Study info editor
│
├── lib/
│   ├── imaging/                        # EXISTING
│   │   ├── dicom-loader.ts            # MODIFY: Add user upload handling
│   │   └── ...
│   │
│   └── medgemma/                       # NEW: MedGemma integration
│       ├── client.ts                  # MedGemma API client
│       ├── prompts.ts                 # Specialized imaging prompts
│       ├── image-preprocessing.ts     # Prepare images for MedGemma
│       ├── response-parser.ts         # Parse MedGemma outputs
│       └── recist-calculator.ts       # RECIST 1.1 implementation
│
└── types/
    └── imaging.ts                      # NEW: Imaging-related types
```

---

## 6. DICOM Upload Implementation

### 6.1 Supported DICOM Sources

| Source | Method | Complexity |
|--------|--------|------------|
| CD/DVD from hospital | Drag-drop folder/files | Medium |
| USB drive copy | Drag-drop folder/files | Medium |
| PACS export (ZIP) | Upload ZIP, auto-extract | Low |
| Single DICOM file | Drag-drop single file | Low |
| DICOMDIR structured | Parse DICOMDIR index | High |

### 6.2 DICOM Processing Pipeline

```typescript
// lib/imaging/dicom-processor.ts

interface DicomProcessingResult {
  success: boolean;
  studies: DicomStudy[];
  errors: ProcessingError[];
}

interface DicomStudy {
  studyInstanceUID: string;
  studyDate: string;
  studyDescription: string;
  patientName: string;
  patientId: string;
  modality: string;
  bodyPart: string;
  series: DicomSeriesInfo[];
  totalSlices: number;
}

async function processDicomUpload(files: File[]): Promise<DicomProcessingResult> {
  const studies: DicomStudy[] = [];
  const errors: ProcessingError[] = [];
  
  // Step 1: Group files by Study Instance UID
  const filesByStudy = new Map<string, File[]>();
  
  for (const file of files) {
    try {
      // Parse DICOM header (first 1KB is usually enough for metadata)
      const headerBuffer = await file.slice(0, 1024).arrayBuffer();
      const dataSet = dicomParser.parseDicom(new Uint8Array(headerBuffer));
      
      const studyUID = dataSet.string('x0020000d');
      if (!filesByStudy.has(studyUID)) {
        filesByStudy.set(studyUID, []);
      }
      filesByStudy.get(studyUID)!.push(file);
    } catch (e) {
      errors.push({ file: file.name, error: 'Invalid DICOM file' });
    }
  }
  
  // Step 2: Process each study
  for (const [studyUID, studyFiles] of filesByStudy) {
    const study = await processStudy(studyUID, studyFiles);
    studies.push(study);
  }
  
  // Step 3: Cache pixel data in IndexedDB for viewer
  for (const study of studies) {
    await cacheStudyPixelData(study);
  }
  
  return { success: errors.length === 0, studies, errors };
}
```

### 6.3 DICOM to Image Conversion for MedGemma

MedGemma expects standard image formats (PNG/JPEG). We need to convert DICOM:

```typescript
// lib/medgemma/image-preprocessing.ts

interface MedGemmaImageInput {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
  metadata: {
    modality: string;
    bodyPart: string;
    sliceIndex: number;
    totalSlices: number;
    windowCenter: number;
    windowWidth: number;
  };
}

async function prepareDicomForMedGemma(
  dicomFile: File,
  windowPreset: WindowingPreset
): Promise<MedGemmaImageInput> {
  // Parse full DICOM file
  const arrayBuffer = await dicomFile.arrayBuffer();
  const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
  
  // Extract pixel data
  const pixelDataElement = dataSet.elements.x7fe00010;
  const pixelData = new Int16Array(
    arrayBuffer, 
    pixelDataElement.dataOffset, 
    pixelDataElement.length / 2
  );
  
  // Get image dimensions
  const rows = dataSet.uint16('x00280010');
  const cols = dataSet.uint16('x00280011');
  
  // Apply windowing (convert to 8-bit grayscale)
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(cols, rows);
  
  for (let i = 0; i < pixelData.length; i++) {
    const hu = pixelData[i]; // Hounsfield units for CT
    const normalized = applyWindowing(hu, windowPreset.center, windowPreset.width);
    const gray = Math.round(normalized * 255);
    
    imageData.data[i * 4] = gray;     // R
    imageData.data[i * 4 + 1] = gray; // G
    imageData.data[i * 4 + 2] = gray; // B
    imageData.data[i * 4 + 3] = 255;  // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to base64 PNG
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  
  return {
    base64,
    mimeType: 'image/png',
    metadata: {
      modality: dataSet.string('x00080060'),
      bodyPart: dataSet.string('x00180015'),
      sliceIndex: parseInt(dataSet.string('x00200013') || '1'),
      totalSlices: -1, // Set by caller
      windowCenter: windowPreset.center,
      windowWidth: windowPreset.width,
    }
  };
}

function applyWindowing(hu: number, center: number, width: number): number {
  const lower = center - width / 2;
  const upper = center + width / 2;
  
  if (hu <= lower) return 0;
  if (hu >= upper) return 1;
  return (hu - lower) / width;
}
```

---

## 7. Phone Camera Capture Implementation

### 7.1 Supported Image Types

| Image Type | Example | Quality Requirements |
|------------|---------|---------------------|
| Chest X-ray film | PA/AP view on lightbox | >5MP, good lighting |
| Mammogram film | CC/MLO views | >8MP, even illumination |
| CT printout | Key slices printed | >3MP, no glare |
| Ultrasound photo | Screen capture or print | >3MP |
| PET printout | SUV annotated images | >3MP |

### 7.2 Camera Capture Component

```typescript
// components/my-imaging/CameraCapture.tsx

interface CameraCaptureProps {
  onCapture: (image: CapturedImage) => void;
  imageType: 'xray' | 'mammogram' | 'ct-print' | 'ultrasound' | 'other';
}

interface CapturedImage {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
  qualityScore: number;
  issues: QualityIssue[];
}

type QualityIssue = 
  | 'too_dark'
  | 'too_bright'
  | 'blurry'
  | 'glare_detected'
  | 'incomplete_frame'
  | 'low_resolution';

function CameraCapture({ onCapture, imageType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [showGrid, setShowGrid] = useState(true);
  
  // Request camera access
  useEffect(() => {
    const startCamera = async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 4096 },    // Request high resolution
          height: { ideal: 3072 },
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    };
    startCamera();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);
  
  const capturePhoto = async () => {
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
    
    onCapture({
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date(),
      qualityScore: qualityAnalysis.score,
      issues: qualityAnalysis.issues,
    });
  };
  
  return (
    <div className="camera-capture">
      <video ref={videoRef} autoPlay playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {showGrid && <AlignmentGrid imageType={imageType} />}
      
      <CaptureGuidance imageType={imageType} />
      
      <div className="controls">
        <FlashToggle mode={flashMode} onChange={setFlashMode} />
        <GridToggle enabled={showGrid} onChange={setShowGrid} />
        <CaptureButton onClick={capturePhoto} />
      </div>
    </div>
  );
}

function analyzeImageQuality(imageData: ImageData): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  let score = 100;
  
  // Check brightness
  const brightness = calculateAverageBrightness(imageData);
  if (brightness < 50) {
    issues.push('too_dark');
    score -= 20;
  } else if (brightness > 200) {
    issues.push('too_bright');
    score -= 20;
  }
  
  // Check for blur (Laplacian variance)
  const sharpness = calculateSharpness(imageData);
  if (sharpness < 100) {
    issues.push('blurry');
    score -= 30;
  }
  
  // Check for glare (high-intensity spots)
  const glareRatio = detectGlare(imageData);
  if (glareRatio > 0.05) {
    issues.push('glare_detected');
    score -= 25;
  }
  
  // Check resolution
  if (imageData.width < 2000 || imageData.height < 2000) {
    issues.push('low_resolution');
    score -= 15;
  }
  
  return { score: Math.max(0, score), issues };
}
```

### 7.3 Image Enhancement for Phone Photos

```typescript
// lib/medgemma/image-preprocessing.ts

interface EnhancedImage {
  original: string;  // base64
  enhanced: string;  // base64
  enhancements: string[];
}

async function enhanceXrayPhoto(imageDataUrl: string): Promise<EnhancedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = await loadImage(imageDataUrl);
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  const enhancements: string[] = [];
  
  // 1. Convert to grayscale
  applyGrayscale(ctx, canvas);
  enhancements.push('grayscale');
  
  // 2. Correct perspective if needed (detect edges)
  const perspectiveCorrected = await correctPerspective(canvas);
  if (perspectiveCorrected) {
    enhancements.push('perspective_correction');
  }
  
  // 3. Normalize contrast (histogram equalization)
  applyHistogramEqualization(ctx, canvas);
  enhancements.push('contrast_normalization');
  
  // 4. Remove glare artifacts
  const glareRemoved = removeGlare(ctx, canvas);
  if (glareRemoved) {
    enhancements.push('glare_removal');
  }
  
  // 5. Invert if needed (match X-ray convention)
  const needsInvert = detectInversion(ctx, canvas);
  if (needsInvert) {
    applyInvert(ctx, canvas);
    enhancements.push('inversion');
  }
  
  return {
    original: imageDataUrl,
    enhanced: canvas.toDataURL('image/png'),
    enhancements,
  };
}
```

---

## 8. MedGemma Integration

### 8.1 MedGemma Client Setup

```typescript
// lib/medgemma/client.ts

interface MedGemmaConfig {
  provider: 'vertex-ai' | 'huggingface' | 'self-hosted';
  model: 'medgemma-4b-it' | 'medgemma-27b-it';
  apiKey?: string;
  endpoint?: string;
}

interface MedGemmaResponse {
  interpretation: string;
  findings: Finding[];
  measurements: Measurement[];
  impression: string;
  recommendations: string[];
  confidence: number;
}

interface Finding {
  description: string;
  location: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  sliceNumbers?: number[];
}

interface Measurement {
  lesionId: string;
  description: string;
  dimensions: {
    long: number;   // mm
    short?: number; // mm
  };
  location: string;
  isTarget: boolean;  // RECIST target lesion
  sliceNumber: number;
}

class MedGemmaClient {
  private config: MedGemmaConfig;
  
  constructor(config: MedGemmaConfig) {
    this.config = config;
  }
  
  async analyzeImage(
    image: MedGemmaImageInput,
    context: AnalysisContext
  ): Promise<MedGemmaResponse> {
    const prompt = buildAnalysisPrompt(image.metadata, context);
    
    switch (this.config.provider) {
      case 'vertex-ai':
        return this.callVertexAI(image, prompt);
      case 'huggingface':
        return this.callHuggingFace(image, prompt);
      case 'self-hosted':
        return this.callSelfHosted(image, prompt);
    }
  }
  
  private async callVertexAI(
    image: MedGemmaImageInput, 
    prompt: string
  ): Promise<MedGemmaResponse> {
    const { VertexAI } = await import('@google-cloud/aiplatform');
    
    const vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: 'us-central1',
    });
    
    const model = vertexAI.getGenerativeModel({
      model: 'medgemma-4b-it',
    });
    
    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          { text: prompt },
        ],
      }],
    });
    
    return parseResponse(response.response.text());
  }
  
  private async callHuggingFace(
    image: MedGemmaImageInput,
    prompt: string
  ): Promise<MedGemmaResponse> {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/medgemma-4b-it',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.3,
          },
          // For vision models, image is passed differently
          image: image.base64,
        }),
      }
    );
    
    const data = await response.json();
    return parseResponse(data[0].generated_text);
  }
}
```

### 8.2 Analysis Prompts

```typescript
// lib/medgemma/prompts.ts

export const IMAGING_ANALYSIS_PROMPTS = {
  // Chest X-ray Analysis
  CXR: `You are an expert radiologist analyzing a chest X-ray image.

Analyze this chest X-ray and provide a structured report including:

1. TECHNICAL QUALITY
- Image quality assessment
- Patient positioning
- Any technical limitations

2. FINDINGS (be systematic)
- Lungs: parenchyma, pleura, costophrenic angles
- Heart: size, contour, mediastinum
- Bones: ribs, spine, clavicles
- Soft tissues
- Lines/tubes if present

3. MEASUREMENTS (if abnormalities found)
- Lesion dimensions in mm
- Cardiothoracic ratio if relevant
- Precise anatomical location

4. IMPRESSION
- Summary of key findings
- Differential diagnosis
- Urgency level (routine/urgent/emergent)

5. RECOMMENDATIONS
- Suggested follow-up imaging
- Clinical correlation needed

Format your response as JSON matching the MedGemmaResponse schema.`,

  // CT Analysis (general)
  CT: `You are an expert radiologist analyzing a CT scan image.

Image metadata:
- Body Part: {{bodyPart}}
- Slice: {{sliceIndex}} of {{totalSlices}}
- Window: {{windowPreset}} (C: {{windowCenter}}, W: {{windowWidth}})

{{#if priorStudy}}
COMPARISON STUDY available from {{priorStudyDate}}
{{/if}}

Analyze this CT slice and provide:

1. FINDINGS
- Describe all visible abnormalities
- Note normal structures as appropriate
- Reference slice numbers where findings are visible

2. MEASUREMENTS (for any lesions)
- Long axis and short axis in mm
- Precise anatomical location (lobe, segment, etc.)
- Mark as "target" if meets RECIST criteria (>10mm for lymph nodes, >10mm for other)

3. COMPARISON (if prior study available)
- Size change from prior
- New findings
- Resolved findings

4. IMPRESSION
- Key findings summary
- Staging implications if oncology relevant

Format your response as JSON matching the MedGemmaResponse schema.`,

  // Mammogram Analysis
  MAMMO: `You are an expert breast radiologist analyzing a mammogram.

Analyze this mammogram and provide:

1. BREAST COMPOSITION (BI-RADS density)
- A: Fatty
- B: Scattered fibroglandular
- C: Heterogeneously dense
- D: Extremely dense

2. FINDINGS
- Masses: size, shape, margins, density
- Calcifications: morphology, distribution
- Asymmetries: focal, global, developing
- Architectural distortion
- Associated features

3. BI-RADS ASSESSMENT
- Category 0-6 with justification

4. RECOMMENDATIONS
- Follow-up imaging
- Biopsy recommendation if indicated

Format your response as JSON matching the MedGemmaResponse schema.`,

  // Longitudinal Comparison for RECIST
  RECIST_COMPARISON: `You are an expert radiologist performing RECIST 1.1 response assessment.

BASELINE STUDY: {{baselineDate}}
Target lesions at baseline:
{{#each baselineLesions}}
- {{this.id}}: {{this.location}} - {{this.long}}mm x {{this.short}}mm
{{/each}}
Sum of longest diameters at baseline: {{baselineSum}}mm

CURRENT STUDY: {{currentDate}}
Please measure the same target lesions on this scan.

For each target lesion:
1. Identify the corresponding lesion from baseline
2. Measure current longest diameter
3. Calculate % change from baseline

Then provide:
- Current sum of longest diameters
- % change from baseline
- RECIST 1.1 response category:
  - Complete Response (CR): Disappearance of all target lesions
  - Partial Response (PR): >=30% decrease in sum
  - Progressive Disease (PD): >=20% increase in sum AND >=5mm absolute increase
  - Stable Disease (SD): Neither PR nor PD

Also assess for:
- New lesions (would indicate PD)
- Non-target lesion progression

Format your response as JSON with response category and detailed measurements.`,
};
```

### 8.3 Response Parser

```typescript
// lib/medgemma/response-parser.ts

interface ParsedMedGemmaResponse {
  raw: string;
  structured: MedGemmaResponse;
  parseErrors: string[];
}

function parseResponse(rawText: string): MedGemmaResponse {
  // Try to extract JSON from response
  const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      // Fall through to text parsing
    }
  }
  
  // Parse unstructured text response
  return parseUnstructuredResponse(rawText);
}

function parseUnstructuredResponse(text: string): MedGemmaResponse {
  const findings: Finding[] = [];
  const measurements: Measurement[] = [];
  const recommendations: string[] = [];
  
  // Extract findings section
  const findingsMatch = text.match(/FINDINGS[:\s]*([\s\S]*?)(?=MEASUREMENTS|IMPRESSION|$)/i);
  if (findingsMatch) {
    const findingsText = findingsMatch[1];
    // Parse bullet points or numbered items
    const items = findingsText.split(/[-•\d.]\s+/).filter(Boolean);
    items.forEach(item => {
      findings.push({
        description: item.trim(),
        location: extractLocation(item),
        severity: inferSeverity(item),
      });
    });
  }
  
  // Extract measurements (e.g., "2.3 x 1.8 cm", "23mm")
  const measurementRegex = /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(cm|mm)|(\d+(?:\.\d+)?)\s*(cm|mm)/gi;
  let match;
  while ((match = measurementRegex.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 100), match.index + match[0].length + 50);
    measurements.push({
      lesionId: `lesion_${measurements.length + 1}`,
      description: extractLesionDescription(context),
      dimensions: parseDimensions(match),
      location: extractLocation(context),
      isTarget: true, // Assume target unless too small
      sliceNumber: -1,
    });
  }
  
  // Extract impression
  const impressionMatch = text.match(/IMPRESSION[:\s]*([\s\S]*?)(?=RECOMMENDATION|$)/i);
  const impression = impressionMatch ? impressionMatch[1].trim() : '';
  
  // Extract recommendations
  const recsMatch = text.match(/RECOMMENDATION[S]?[:\s]*([\s\S]*?)$/i);
  if (recsMatch) {
    const recsText = recsMatch[1];
    const items = recsText.split(/[-•\d.]\s+/).filter(Boolean);
    recommendations.push(...items.map(r => r.trim()));
  }
  
  return {
    interpretation: text,
    findings,
    measurements,
    impression,
    recommendations,
    confidence: calculateConfidence(findings, measurements, impression),
  };
}
```

---

## 9. Disease Progression & RECIST Tracking

### 9.1 RECIST 1.1 Implementation

```typescript
// lib/medgemma/recist-calculator.ts

/**
 * RECIST 1.1 (Response Evaluation Criteria In Solid Tumors)
 * 
 * Target Lesions:
 * - Max 5 total (max 2 per organ)
 * - Measurable: >=10mm long axis (>=15mm for lymph nodes short axis)
 * 
 * Response Categories:
 * - CR (Complete Response): Disappearance of all target lesions
 * - PR (Partial Response): >=30% decrease in sum of diameters
 * - PD (Progressive Disease): >=20% increase AND >=5mm absolute increase
 * - SD (Stable Disease): Neither PR nor PD
 */

interface TargetLesion {
  id: string;
  location: string;
  organ: string;
  isLymphNode: boolean;
  measurements: LesionMeasurement[];
}

interface LesionMeasurement {
  date: Date;
  studyId: string;
  longAxis: number;  // mm
  shortAxis?: number; // mm (required for lymph nodes)
  sliceNumber: number;
}

interface RECISTAssessment {
  baselineDate: Date;
  currentDate: Date;
  baselineSum: number;
  currentSum: number;
  nadirSum: number;
  percentChangeFromBaseline: number;
  percentChangeFromNadir: number;
  response: 'CR' | 'PR' | 'SD' | 'PD' | 'NE';
  reasoning: string;
  newLesions: boolean;
  nonTargetProgression: boolean;
  overallResponse: 'CR' | 'PR' | 'SD' | 'PD' | 'NE';
}

function calculateRECISTResponse(
  targetLesions: TargetLesion[],
  currentDate: Date,
  newLesionsDetected: boolean,
  nonTargetProgression: boolean
): RECISTAssessment {
  // Get baseline measurements (first measurement for each lesion)
  const baselineMeasurements = targetLesions.map(lesion => {
    const baseline = lesion.measurements[0];
    return {
      lesionId: lesion.id,
      diameter: lesion.isLymphNode ? baseline.shortAxis! : baseline.longAxis,
    };
  });
  
  // Get current measurements
  const currentMeasurements = targetLesions.map(lesion => {
    const current = lesion.measurements.find(m => 
      m.date.toDateString() === currentDate.toDateString()
    );
    if (!current) return null;
    return {
      lesionId: lesion.id,
      diameter: lesion.isLymphNode ? current.shortAxis! : current.longAxis,
    };
  }).filter(Boolean);
  
  // Calculate sums
  const baselineSum = baselineMeasurements.reduce((sum, m) => sum + m.diameter, 0);
  const currentSum = currentMeasurements.reduce((sum, m) => sum + m!.diameter, 0);
  
  // Find nadir (lowest sum during treatment)
  const allSums = getAllIntermediateSums(targetLesions);
  const nadirSum = Math.min(...allSums, baselineSum);
  
  // Calculate percent changes
  const percentChangeFromBaseline = ((currentSum - baselineSum) / baselineSum) * 100;
  const percentChangeFromNadir = ((currentSum - nadirSum) / nadirSum) * 100;
  const absoluteChangeFromNadir = currentSum - nadirSum;
  
  // Determine target lesion response
  let targetResponse: 'CR' | 'PR' | 'SD' | 'PD' | 'NE';
  let reasoning: string;
  
  if (currentSum === 0 && allLesionsDisappeared(targetLesions, currentDate)) {
    targetResponse = 'CR';
    reasoning = 'Complete disappearance of all target lesions';
  } else if (percentChangeFromBaseline <= -30) {
    targetResponse = 'PR';
    reasoning = `${Math.abs(percentChangeFromBaseline).toFixed(1)}% decrease from baseline (>=30% required for PR)`;
  } else if (percentChangeFromNadir >= 20 && absoluteChangeFromNadir >= 5) {
    targetResponse = 'PD';
    reasoning = `${percentChangeFromNadir.toFixed(1)}% increase from nadir with ${absoluteChangeFromNadir}mm absolute increase`;
  } else {
    targetResponse = 'SD';
    reasoning = `${percentChangeFromBaseline.toFixed(1)}% change from baseline (does not meet PR or PD criteria)`;
  }
  
  // Determine overall response (incorporating new lesions and non-target)
  let overallResponse = targetResponse;
  
  if (newLesionsDetected) {
    overallResponse = 'PD';
    reasoning += '; New lesions detected = PD regardless of target response';
  } else if (nonTargetProgression && targetResponse !== 'PD') {
    overallResponse = 'PD';
    reasoning += '; Unequivocal non-target progression = PD';
  }
  
  return {
    baselineDate: targetLesions[0].measurements[0].date,
    currentDate,
    baselineSum,
    currentSum,
    nadirSum,
    percentChangeFromBaseline,
    percentChangeFromNadir,
    response: targetResponse,
    reasoning,
    newLesions: newLesionsDetected,
    nonTargetProgression,
    overallResponse,
  };
}
```

### 9.2 Volumetric RECIST (vRECIST)

```typescript
// lib/medgemma/vrecist-calculator.ts

/**
 * Volumetric RECIST (vRECIST)
 * Uses 3D tumor volumes instead of unidimensional diameters
 * 
 * Response thresholds (based on sphere volume relationship):
 * - CR: Disappearance
 * - PR: >=65% volume decrease (equivalent to 30% diameter decrease)
 * - PD: >=73% volume increase (equivalent to 20% diameter increase)
 * - SD: Neither PR nor PD
 */

interface VolumetricMeasurement {
  date: Date;
  studyId: string;
  volume: number;  // mm³
  segmentationMethod: 'manual' | 'semi-auto' | 'auto';
  confidence: number;
}

interface vRECISTAssessment {
  baselineVolume: number;
  currentVolume: number;
  percentVolumeChange: number;
  response: 'CR' | 'PR' | 'SD' | 'PD';
  equivalentDiameterChange: number;  // For comparison with standard RECIST
}

function calculateVolumetricResponse(
  baselineVolume: number,
  currentVolume: number
): vRECISTAssessment {
  const percentChange = ((currentVolume - baselineVolume) / baselineVolume) * 100;
  
  // Convert to equivalent diameter change
  // Volume = (4/3) * π * (d/2)³ = (π/6) * d³
  // If V2/V1 = r, then d2/d1 = r^(1/3)
  const volumeRatio = currentVolume / baselineVolume;
  const diameterRatio = Math.pow(volumeRatio, 1/3);
  const equivalentDiameterChange = (diameterRatio - 1) * 100;
  
  let response: 'CR' | 'PR' | 'SD' | 'PD';
  
  if (currentVolume === 0) {
    response = 'CR';
  } else if (percentChange <= -65) {
    response = 'PR';
  } else if (percentChange >= 73) {
    response = 'PD';
  } else {
    response = 'SD';
  }
  
  return {
    baselineVolume,
    currentVolume,
    percentVolumeChange: percentChange,
    response,
    equivalentDiameterChange,
  };
}
```

### 9.3 Progression Timeline Storage

```typescript
// types/imaging.ts

interface ImagingSession {
  id: string;
  userId?: string;  // Anonymous sessions allowed
  createdAt: Date;
  expiresAt: Date;
  studies: ImagingStudy[];
  targetLesions: TargetLesion[];
  assessments: RECISTAssessment[];
}

interface ImagingStudy {
  id: string;
  sessionId: string;
  studyInstanceUID: string;
  studyDate: Date;
  uploadDate: Date;
  modality: string;
  bodyPart: string;
  description: string;
  sliceCount: number;
  storageKey: string;  // R2 object key
  medgemmaAnalysis?: MedGemmaResponse;
  measurements: Measurement[];
  isBaseline: boolean;
  timepoint: 'baseline' | 'follow-up' | 'response-assessment';
}

// Browser storage schema (IndexedDB)
const IMAGING_DB_SCHEMA = {
  name: 'vtb-imaging',
  version: 1,
  stores: {
    sessions: { keyPath: 'id' },
    studies: { keyPath: 'id', indexes: ['sessionId', 'studyDate'] },
    pixelData: { keyPath: 'sliceKey' },  // Cache for fast viewing
    measurements: { keyPath: 'id', indexes: ['studyId', 'lesionId'] },
  },
};
```

---

## 10. Dr. Chitran (Onco-Radiologist) Agent Integration

### 10.1 Overview

**Dr. Chitran** is the Onco-Radiology specialist agent in the Virtual Tumor Board. This section details how Dr. Chitran will leverage MedGemma to analyze user-uploaded DICOM images and phone-captured scans, reconcile AI findings with uploaded radiology reports, and synthesize this with all other clinical documents for comprehensive tumor board deliberation.

### 10.2 Dr. Chitran's Enhanced Capabilities

```
+-----------------------------------------------------------------------------+
|                    Dr. Chitran - Onco-Radiology Agent                        |
|                    Enhanced with MedGemma Integration                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|  INPUT SOURCES:                                                             |
|  +------------------+  +------------------+  +------------------+           |
|  | DICOM/Phone      |  | Radiology        |  | Other Clinical   |           |
|  | Images           |  | Reports (PDF)    |  | Documents        |           |
|  | (User Uploaded)  |  | (User Uploaded)  |  | (Path, Genomics) |           |
|  +--------+---------+  +--------+---------+  +--------+---------+           |
|           |                     |                     |                     |
|           v                     v                     v                     |
|  +------------------+  +------------------+  +------------------+           |
|  | MedGemma         |  | Text Extraction  |  | Document         |           |
|  | Image Analysis   |  | & Parsing        |  | Classification   |           |
|  +--------+---------+  +--------+---------+  +--------+---------+           |
|           |                     |                     |                     |
|           +----------+----------+----------+----------+                     |
|                      |                                                      |
|                      v                                                      |
|           +------------------------+                                        |
|           | RECONCILIATION ENGINE  |                                        |
|           | - Compare AI vs Report |                                        |
|           | - Flag discrepancies   |                                        |
|           | - Identify new findings|                                        |
|           +------------------------+                                        |
|                      |                                                      |
|                      v                                                      |
|           +------------------------+                                        |
|           | Dr. Chitran's Opinion  |                                        |
|           | - Integrated analysis  |                                        |
|           | - Staging implications |                                        |
|           | - Response assessment  |                                        |
|           +------------------------+                                        |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 10.3 Multi-Source Data Reconciliation

Dr. Chitran performs intelligent reconciliation between:

1. **MedGemma AI Analysis** (from uploaded DICOM/photos)
2. **Existing Radiology Reports** (uploaded PDFs with findings & interpretations)
3. **Clinical Context** (pathology, genomics, treatment history)

#### Reconciliation Logic

```typescript
// packages/agents/src/specialists/onco-radiologist.ts

interface ReconciliationResult {
  agreement: AgreementItem[];
  discrepancies: DiscrepancyItem[];
  newAIFindings: Finding[];
  missedInReport: Finding[];
  additionalContext: string[];
  overallAssessment: string;
  confidenceLevel: 'high' | 'moderate' | 'low';
}

interface AgreementItem {
  finding: string;
  aiDescription: string;
  reportDescription: string;
  location: string;
  measurements?: {
    ai: string;
    report: string;
    difference?: string;
  };
}

interface DiscrepancyItem {
  type: 'measurement_mismatch' | 'finding_mismatch' | 'interpretation_mismatch' | 'staging_mismatch';
  severity: 'minor' | 'moderate' | 'significant';
  aiPosition: string;
  reportPosition: string;
  clinicalImplication: string;
  recommendation: string;
}

async function reconcileImagingData(
  medgemmaAnalysis: MedGemmaResponse,
  radiologyReport: ExtractedRadiologyReport,
  clinicalContext: ClinicalContext
): Promise<ReconciliationResult> {
  
  const agreement: AgreementItem[] = [];
  const discrepancies: DiscrepancyItem[] = [];
  const newAIFindings: Finding[] = [];
  const missedInReport: Finding[] = [];
  
  // Step 1: Match findings between AI and report
  for (const aiFinding of medgemmaAnalysis.findings) {
    const matchingReportFinding = findMatchingFinding(aiFinding, radiologyReport.findings);
    
    if (matchingReportFinding) {
      // Found a match - check for agreement or discrepancy
      const measurementMatch = compareMeasurements(
        aiFinding.measurements,
        matchingReportFinding.measurements
      );
      
      if (measurementMatch.isWithinTolerance) {
        agreement.push({
          finding: aiFinding.description,
          aiDescription: aiFinding.description,
          reportDescription: matchingReportFinding.description,
          location: aiFinding.location,
          measurements: {
            ai: formatMeasurement(aiFinding.measurements),
            report: formatMeasurement(matchingReportFinding.measurements),
          }
        });
      } else {
        discrepancies.push({
          type: 'measurement_mismatch',
          severity: measurementMatch.severity,
          aiPosition: `${formatMeasurement(aiFinding.measurements)} at ${aiFinding.location}`,
          reportPosition: `${formatMeasurement(matchingReportFinding.measurements)} at ${matchingReportFinding.location}`,
          clinicalImplication: assessClinicalImplication(measurementMatch, clinicalContext),
          recommendation: generateRecommendation(measurementMatch),
        });
      }
    } else {
      // AI found something not in report
      newAIFindings.push(aiFinding);
    }
  }
  
  // Step 2: Check for findings in report not detected by AI
  for (const reportFinding of radiologyReport.findings) {
    const matchingAIFinding = findMatchingFinding(reportFinding, medgemmaAnalysis.findings);
    if (!matchingAIFinding) {
      missedInReport.push({
        description: reportFinding.description,
        location: reportFinding.location,
        severity: 'unknown',
        note: 'Reported by radiologist but not detected by AI - may require manual verification'
      });
    }
  }
  
  // Step 3: Compare staging implications
  const stagingDiscrepancy = compareStaging(
    medgemmaAnalysis.stagingImplication,
    radiologyReport.impression,
    clinicalContext.pathologyStage
  );
  
  if (stagingDiscrepancy) {
    discrepancies.push(stagingDiscrepancy);
  }
  
  return {
    agreement,
    discrepancies,
    newAIFindings,
    missedInReport,
    additionalContext: generateAdditionalContext(clinicalContext),
    overallAssessment: generateOverallAssessment(agreement, discrepancies, newAIFindings),
    confidenceLevel: calculateConfidence(agreement.length, discrepancies.length, newAIFindings.length),
  };
}
```

### 10.4 Dr. Chitran's Enhanced System Prompt

```typescript
// packages/agents/src/prompts/onco-radiologist-prompt.ts

export const DR_CHITRAN_ENHANCED_PROMPT = `
You are Dr. Chitran, a senior Onco-Radiologist with 20+ years of experience in cancer imaging.

## YOUR ENHANCED ROLE

You now have access to:
1. **Direct image analysis** via MedGemma AI (when DICOM/photos uploaded)
2. **Uploaded radiology reports** with findings and interpretations
3. **All other clinical documents** (pathology, genomics, labs, clinical notes)

## YOUR RESPONSIBILITIES

### When Images ARE Uploaded:
1. **Review MedGemma AI Analysis**
   - Examine the AI-generated findings, measurements, and impressions
   - Note the confidence levels and any limitations flagged by the AI
   
2. **Compare with Radiology Reports (if available)**
   - Identify areas of agreement between AI and human radiologist
   - FLAG any discrepancies in:
     * Lesion measurements (>20% difference is significant for RECIST)
     * Number of lesions identified
     * Staging interpretations
     * Response assessments
   
3. **Reconcile and Synthesize**
   - Provide your expert opinion on which interpretation is more likely correct
   - Consider clinical context when resolving discrepancies
   - Note if discrepancies could change treatment decisions

### When Only Reports Are Uploaded (No Images):
- Analyze the radiology report findings
- Correlate with pathology and clinical staging
- Note any imaging gaps that would be helpful for the tumor board

### When Only Images Are Uploaded (No Reports):
- Rely on MedGemma analysis as primary source
- Clearly state this is AI-interpretation without human radiologist verification
- Recommend obtaining formal radiologist reading if clinically significant findings

## OUTPUT FORMAT

Structure your opinion as follows:

### IMAGING ASSESSMENT

**Data Sources Available:**
- [ ] DICOM/Photo Images (MedGemma analyzed)
- [ ] Radiology Reports
- [ ] Prior Imaging for Comparison

**Key Findings:**
[List major findings with measurements]

**AI vs Report Reconciliation:** (if both available)
| Finding | MedGemma AI | Radiology Report | Assessment |
|---------|-------------|------------------|------------|
| [finding] | [AI measurement] | [Report measurement] | [Agree/Discrepancy] |

**Discrepancies Requiring Attention:**
[List any significant disagreements and your expert opinion]

**Staging Implications:**
- T Stage: [assessment]
- N Stage: [assessment]  
- M Stage: [assessment]
- Overall: [stage]

**Response Assessment (if follow-up):**
- RECIST 1.1: [CR/PR/SD/PD]
- Key changes from baseline: [summary]

**Recommendations:**
1. [imaging recommendations]
2. [clinical correlation needed]

**Confidence Level:** [High/Moderate/Low]
**Limitations:** [list any caveats]
`;
```

### 10.5 Integration with Tumor Board Deliberation

When a user uploads images AND initiates a tumor board deliberation, the flow is:

```
+-----------------------------------------------------------------------------+
|                    TUMOR BOARD DELIBERATION FLOW                             |
|                    (With Uploaded Imaging)                                   |
+-----------------------------------------------------------------------------+
|                                                                             |
|  STEP 1: Pre-Processing (Before Deliberation Starts)                        |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  User uploads: DICOM files + Radiology PDF + Pathology + Genomics     |  |
|  |                      |                                                |  |
|  |                      v                                                |  |
|  |  +-------------------+-------------------+-------------------+        |  |
|  |  | MedGemma Analysis | Report Extraction | Document Parsing  |        |  |
|  |  | (Async, ~15 sec)  | (Async, ~5 sec)   | (Async, ~5 sec)   |        |  |
|  |  +-------------------+-------------------+-------------------+        |  |
|  |                      |                                                |  |
|  |                      v                                                |  |
|  |              [All data ready for agents]                              |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  STEP 2: Agent Deliberation (7 Specialists)                                 |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Agent Order (Dr. Chitran goes FIRST when images present):            |  |
|  |                                                                       |  |
|  |  1. Dr. Chitran (Onco-Radiology) ***FIRST***                         |  |
|  |     - Reviews MedGemma analysis                                       |  |
|  |     - Reconciles with radiology reports                               |  |
|  |     - Sets imaging context for all other agents                       |  |
|  |     - Provides staging assessment                                     |  |
|  |                                                                       |  |
|  |  2. Dr. Marga (Pathology)                                             |  |
|  |     - Can now correlate path findings with imaging                    |  |
|  |                                                                       |  |
|  |  3. Dr. Shalya (Surgical Oncology)                                    |  |
|  |     - Uses imaging for resectability assessment                       |  |
|  |                                                                       |  |
|  |  4. Dr. Chikitsa (Medical Oncology)                                   |  |
|  |     - Treatment planning with imaging response data                   |  |
|  |                                                                       |  |
|  |  5. Dr. Kirann (Radiation Oncology)                                   |  |
|  |     - Target volume delineation guidance                              |  |
|  |                                                                       |  |
|  |  6. Dr. Anuvamsha (Genetics)                                          |  |
|  |     - Genomic-imaging correlations                                    |  |
|  |                                                                       |  |
|  |  7. Dr. Shanti (Palliative Care)                                      |  |
|  |     - Symptom burden from imaging findings                            |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  STEP 3: Consensus Generation                                               |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Consensus includes:                                                  |  |
|  |  - Integrated imaging + pathology staging                             |  |
|  |  - Any imaging-based contraindications to treatment                   |  |
|  |  - Response assessment summary (if follow-up imaging)                 |  |
|  |  - Imaging surveillance recommendations                               |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 10.6 API Integration for Dr. Chitran

```typescript
// app/api/deliberate/stream/route.ts (MODIFIED)

interface EnhancedDeliberationContext {
  // Existing fields
  caseData: CaseData;
  userType: 'patient' | 'oncologist' | 'doctor';
  
  // NEW: Imaging data for Dr. Chitran
  imagingContext?: {
    hasUploadedImages: boolean;
    medgemmaAnalysis?: MedGemmaResponse;
    uploadedReports?: ExtractedRadiologyReport[];
    reconciliationResult?: ReconciliationResult;
    progressionData?: {
      baselineDate: string;
      currentDate: string;
      recistResponse: 'CR' | 'PR' | 'SD' | 'PD';
      percentChange: number;
    };
  };
}

async function prepareAgentContext(
  context: EnhancedDeliberationContext,
  agentId: string
): Promise<string> {
  
  if (agentId === 'onco-radiologist' && context.imagingContext) {
    // Dr. Chitran gets full imaging context
    return buildOncoRadiologistContext(context.imagingContext);
  }
  
  // Other agents get imaging summary
  if (context.imagingContext?.hasUploadedImages) {
    return buildImagingSummaryForAgent(context.imagingContext, agentId);
  }
  
  return buildStandardContext(context, agentId);
}

function buildOncoRadiologistContext(imaging: ImagingContext): string {
  let context = `
## IMAGING DATA AVAILABLE FOR THIS CASE

### Uploaded Images
${imaging.hasUploadedImages ? 'YES - DICOM/Photos analyzed by MedGemma' : 'NO - Only radiology reports available'}

`;

  if (imaging.medgemmaAnalysis) {
    context += `
### MedGemma AI Analysis
**Findings:**
${imaging.medgemmaAnalysis.findings.map(f => `- ${f.description} (${f.location})`).join('\n')}

**Measurements:**
${imaging.medgemmaAnalysis.measurements.map(m => `- ${m.description}: ${m.dimensions.long}mm x ${m.dimensions.short || 'N/A'}mm`).join('\n')}

**AI Impression:**
${imaging.medgemmaAnalysis.impression}

**AI Confidence:** ${(imaging.medgemmaAnalysis.confidence * 100).toFixed(0)}%
`;
  }

  if (imaging.uploadedReports?.length) {
    context += `
### Uploaded Radiology Reports
${imaging.uploadedReports.map(r => `
**Report Date:** ${r.date}
**Modality:** ${r.modality}
**Findings:** ${r.findings}
**Impression:** ${r.impression}
`).join('\n---\n')}
`;
  }

  if (imaging.reconciliationResult) {
    context += `
### AI vs Report Reconciliation

**Areas of Agreement:**
${imaging.reconciliationResult.agreement.map(a => `- ${a.finding}: AI=${a.measurements?.ai}, Report=${a.measurements?.report}`).join('\n')}

**Discrepancies Found:**
${imaging.reconciliationResult.discrepancies.map(d => `
- **${d.type}** (${d.severity}):
  - AI: ${d.aiPosition}
  - Report: ${d.reportPosition}
  - Clinical Implication: ${d.clinicalImplication}
`).join('\n')}

**New Findings by AI (not in report):**
${imaging.reconciliationResult.newAIFindings.map(f => `- ${f.description}`).join('\n') || 'None'}

**Please provide your expert reconciliation and final imaging assessment.**
`;
  }

  if (imaging.progressionData) {
    context += `
### Response Assessment Data
- Baseline: ${imaging.progressionData.baselineDate}
- Current: ${imaging.progressionData.currentDate}
- RECIST Response: **${imaging.progressionData.recistResponse}**
- Change from Baseline: ${imaging.progressionData.percentChange > 0 ? '+' : ''}${imaging.progressionData.percentChange.toFixed(1)}%
`;
  }

  return context;
}
```

### 10.7 UI Display of Reconciliation Results

```typescript
// components/tumor-board/ImagingReconciliationPanel.tsx

interface ImagingReconciliationPanelProps {
  reconciliation: ReconciliationResult;
  onViewInViewer: (finding: Finding) => void;
}

function ImagingReconciliationPanel({ 
  reconciliation, 
  onViewInViewer 
}: ImagingReconciliationPanelProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span>AI vs Radiologist Reconciliation</span>
        <ConfidenceBadge level={reconciliation.confidenceLevel} />
      </h3>
      
      {/* Agreement Section */}
      {reconciliation.agreement.length > 0 && (
        <div className="mb-4">
          <h4 className="text-green-400 font-medium mb-2">
            Findings in Agreement ({reconciliation.agreement.length})
          </h4>
          <div className="space-y-2">
            {reconciliation.agreement.map((item, i) => (
              <div key={i} className="bg-green-900/20 p-2 rounded text-sm">
                <span className="text-white">{item.finding}</span>
                {item.measurements && (
                  <span className="text-gray-400 ml-2">
                    (AI: {item.measurements.ai} | Report: {item.measurements.report})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Discrepancies Section */}
      {reconciliation.discrepancies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Discrepancies Requiring Review ({reconciliation.discrepancies.length})
          </h4>
          <div className="space-y-3">
            {reconciliation.discrepancies.map((item, i) => (
              <div 
                key={i} 
                className={`p-3 rounded ${
                  item.severity === 'significant' 
                    ? 'bg-red-900/30 border border-red-500/50' 
                    : 'bg-yellow-900/20 border border-yellow-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium capitalize">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <SeverityBadge severity={item.severity} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <span className="text-blue-400">MedGemma AI:</span>
                    <p className="text-gray-300">{item.aiPosition}</p>
                  </div>
                  <div>
                    <span className="text-purple-400">Radiology Report:</span>
                    <p className="text-gray-300">{item.reportPosition}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-orange-400">Clinical Implication:</span>
                  <p className="text-gray-300">{item.clinicalImplication}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* New AI Findings */}
      {reconciliation.newAIFindings.length > 0 && (
        <div className="mb-4">
          <h4 className="text-blue-400 font-medium mb-2">
            New Findings by AI (not in original report)
          </h4>
          <div className="space-y-2">
            {reconciliation.newAIFindings.map((finding, i) => (
              <div 
                key={i} 
                className="bg-blue-900/20 p-2 rounded text-sm flex justify-between items-center"
              >
                <span className="text-white">{finding.description}</span>
                <button 
                  onClick={() => onViewInViewer(finding)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  View in DICOM
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Overall Assessment */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <h4 className="text-white font-medium mb-2">Dr. Chitran's Assessment</h4>
        <p className="text-gray-300 text-sm">{reconciliation.overallAssessment}</p>
      </div>
    </div>
  );
}
```

### 10.8 Clinical Scenarios & Examples

#### Scenario 1: Agreement Between AI and Report

```
Patient: 58M with NSCLC, post 4 cycles chemotherapy
Uploaded: CT Chest DICOM + Radiology Report PDF

MedGemma Analysis:
- RUL mass: 18mm (baseline was 32mm)
- Mediastinal LN: 8mm (baseline was 15mm)
- No new lesions

Radiology Report:
- RUL mass: 19mm (previously 32mm, -41%)
- Mediastinal LN: 9mm (previously 15mm)
- Impression: Partial response

Dr. Chitran's Reconciliation:
"Excellent agreement between AI and radiologist. Both identify significant 
reduction in primary tumor (AI: 18mm, Report: 19mm - within measurement 
variability). RECIST 1.1 assessment: PARTIAL RESPONSE confirmed.
Sum of target lesions decreased from 47mm to 27mm (-43%).
Confidence: HIGH"
```

#### Scenario 2: Discrepancy Requiring Attention

```
Patient: 45F with breast cancer, restaging CT
Uploaded: CT Chest/Abdomen DICOM + Outside Hospital Report PDF

MedGemma Analysis:
- 3 hepatic lesions identified (segments 4, 6, 7)
- Largest: 22mm in segment 6

Radiology Report (from outside hospital):
- 2 hepatic lesions (segments 6, 7)
- Largest: 18mm in segment 6

Dr. Chitran's Reconciliation:
"SIGNIFICANT DISCREPANCY: AI identifies 3 liver lesions while report 
documents only 2. The segment 4 lesion (12mm) may be subtle or was 
developing at time of outside read.

CLINICAL IMPLICATION: If confirmed, this represents disease progression 
with a new metastasis, potentially changing treatment approach.

RECOMMENDATION: 
1. Manual review of segment 4 on current images (slice 145-152)
2. Compare with prior imaging if available
3. Consider MRI liver for better characterization

Confidence: MODERATE - discrepancy requires verification"
```

#### Scenario 3: AI Analysis Only (No Radiology Report)

```
Patient: Rural patient with phone photo of chest X-ray
Uploaded: Phone camera image of CXR film (no formal report)

MedGemma Analysis:
- Large right-sided pleural effusion
- Possible underlying mass in right hilum
- Mediastinal widening

Dr. Chitran's Assessment:
"IMPORTANT CAVEAT: Analysis based solely on AI interpretation of 
phone-captured X-ray image. No radiologist report available for 
comparison.

FINDINGS: Concerning for malignant pleural effusion with possible 
hilar mass. The image quality is acceptable but suboptimal.

STRONG RECOMMENDATION:
1. Obtain formal chest X-ray at imaging center with radiologist read
2. CT Chest with contrast for complete staging
3. Thoracentesis for cytology if effusion confirmed

This patient should be referred urgently for complete workup.
Confidence: LOW (single modality, no comparison, AI-only interpretation)"
```

### 10.9 Data Flow Summary

```typescript
// Complete data flow for Dr. Chitran integration

interface DrChitranDataFlow {
  // Inputs
  inputs: {
    dicomFiles?: File[];           // User uploaded DICOM
    phonePhotos?: File[];          // User captured photos
    radiologyReports?: File[];     // PDF reports with findings
    pathologyReport?: ExtractedPathology;
    genomicsReport?: ExtractedGenomics;
    priorImaging?: ImagingStudy[]; // For progression tracking
    clinicalNotes?: string;
  };
  
  // Processing
  processing: {
    step1_imageAnalysis: {
      service: 'MedGemma 4B';
      output: MedGemmaResponse;
      latency: '10-15 seconds';
    };
    step2_reportExtraction: {
      service: 'Gemini Flash';
      output: ExtractedRadiologyReport;
      latency: '3-5 seconds';
    };
    step3_reconciliation: {
      service: 'Internal logic + LLM';
      output: ReconciliationResult;
      latency: '2-3 seconds';
    };
  };
  
  // Outputs
  outputs: {
    forDrChitran: EnhancedImagingContext;
    forOtherAgents: ImagingSummary;
    forUI: {
      reconciliationPanel: ReconciliationResult;
      viewerOverlays: Finding[];
      measurementTable: Measurement[];
      progressionChart?: ProgressionData;
    };
  };
}
```

---

## 11. Security & Privacy

### 10.1 Data Handling

| Concern | Mitigation |
|---------|------------|
| DICOM contains PHI | Strip PHI tags before upload; display warning |
| Phone photos may have GPS | Strip EXIF data on upload |
| Cloud storage security | Encrypt at rest in R2; auto-delete after 7 days |
| MedGemma API transmission | Use HTTPS; don't store images on API side |
| Session hijacking | Use secure random session IDs; HttpOnly cookies |

### 10.2 DICOM PHI Stripping

```typescript
// lib/imaging/dicom-anonymizer.ts

const PHI_TAGS = [
  'x00100010', // Patient Name
  'x00100020', // Patient ID
  'x00100030', // Patient Birth Date
  'x00100040', // Patient Sex
  'x00080080', // Institution Name
  'x00080081', // Institution Address
  'x00080090', // Referring Physician Name
  'x00081050', // Performing Physician Name
  'x00081070', // Operators Name
  'x00200010', // Study ID
  // ... more PHI tags
];

function anonymizeDicom(dataSet: any): any {
  const anonymized = { ...dataSet };
  
  for (const tag of PHI_TAGS) {
    if (anonymized.elements[tag]) {
      anonymized.elements[tag] = { ...anonymized.elements[tag], value: '[REDACTED]' };
    }
  }
  
  return anonymized;
}
```

### 10.3 Consent & Disclaimer

```
+-----------------------------------------------------------------------------+
|                          IMPORTANT DISCLAIMER                                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  By uploading medical images, you acknowledge and agree:                    |
|                                                                             |
|  1. EDUCATIONAL PURPOSE ONLY                                                |
|     This AI analysis is for educational and informational purposes.         |
|     It is NOT a substitute for professional radiologist interpretation.     |
|                                                                             |
|  2. DATA HANDLING                                                           |
|     - Your images will be processed by AI (MedGemma)                        |
|     - Personal health information will be stripped before analysis          |
|     - Images are auto-deleted after 7 days                                  |
|     - We do not share your images with third parties                        |
|                                                                             |
|  3. ACCURACY LIMITATIONS                                                    |
|     - AI may miss findings or make errors                                   |
|     - Always consult a qualified radiologist for diagnosis                  |
|     - RECIST measurements are approximate and require verification          |
|                                                                             |
|  4. MEDICAL EMERGENCY                                                       |
|     If you have a medical emergency, contact your doctor or emergency       |
|     services immediately. Do not rely on this tool for urgent decisions.    |
|                                                                             |
|  [ ] I have read and agree to these terms                                   |
|                                                                             |
|                    [Cancel]  [I Understand, Continue]                       |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create "My Imaging" tab UI shell
- [ ] Implement DICOM upload with existing viewer integration
- [ ] Add phone camera capture component
- [ ] Set up MedGemma Hugging Face API client
- [ ] Basic single-image analysis (CXR, single CT slice)

### Phase 2: MedGemma Integration (Week 3-4)
- [ ] Multi-slice CT analysis (key slice selection)
- [ ] Structured finding extraction
- [ ] Measurement detection and display
- [ ] AI findings overlay on viewer
- [ ] Deploy MedGemma to Vertex AI (production)
- [ ] **Dr. Chitran Integration**: Enhanced prompt with MedGemma context
- [ ] **Reconciliation Engine**: AI vs Report comparison logic

### Phase 3: RECIST Tracking & Agent Integration (Week 5-6)
- [ ] Target lesion selection UI
- [ ] Baseline vs follow-up study linking
- [ ] RECIST 1.1 calculator implementation
- [ ] Progression timeline component
- [ ] Response charts and visualization
- [ ] **Dr. Chitran Reconciliation Panel UI**
- [ ] **Agent deliberation order adjustment** (Dr. Chitran first when images present)
- [ ] **Imaging context passed to all agents**

### Phase 4: Polish & Production (Week 7-8)
- [ ] IndexedDB caching for offline viewing
- [ ] R2 storage for uploaded images
- [ ] Export reports as PDF
- [ ] Mobile UX optimization
- [ ] Performance optimization (lazy loading, compression)
- [ ] Error handling and edge cases

### Phase 5: Advanced Features (Future)
- [ ] Volumetric RECIST with auto-segmentation
- [ ] Integration with existing segmentation service
- [ ] Multi-user collaboration on measurements
- [ ] DICOM SR (Structured Report) export
- [ ] Integration with hospital PACS (DICOM networking)

---

## 13. API Specifications

### POST /api/imaging/upload

Upload DICOM files or photos.

```typescript
// Request (multipart/form-data)
interface UploadRequest {
  files: File[];
  sessionId?: string;  // Continue existing session
  imageType: 'dicom' | 'photo';
  bodyPart?: string;   // Override auto-detection
}

// Response
interface UploadResponse {
  sessionId: string;
  studies: {
    id: string;
    studyDate: string;
    modality: string;
    bodyPart: string;
    sliceCount: number;
    previewUrl: string;
  }[];
  warnings: string[];
}
```

### POST /api/imaging/analyze

Request MedGemma analysis.

```typescript
// Request
interface AnalyzeRequest {
  sessionId: string;
  studyId: string;
  analysisType: 'general' | 'oncology' | 'recist';
  priorStudyId?: string;  // For comparison
  targetLesions?: {       // For RECIST follow-up
    id: string;
    baselineSize: number;
  }[];
}

// Response (SSE stream)
interface AnalyzeStreamEvent {
  type: 'progress' | 'finding' | 'measurement' | 'complete' | 'error';
  data: {
    progress?: number;
    finding?: Finding;
    measurement?: Measurement;
    response?: MedGemmaResponse;
    error?: string;
  };
}
```

### GET /api/imaging/session/:id

Retrieve session data and progression timeline.

```typescript
// Response
interface SessionResponse {
  session: ImagingSession;
  timeline: {
    studies: ImagingStudy[];
    assessments: RECISTAssessment[];
    chart: {
      dates: string[];
      sumOfDiameters: number[];
      responses: ('CR' | 'PR' | 'SD' | 'PD')[];
    };
  };
}
```

---

## 14. UI Component Specifications

### 14.1 MyImagingTab

```typescript
interface MyImagingTabProps {
  caseId?: string;  // Link to existing case if available
}

// States:
// 1. Empty state: No uploads yet
// 2. Upload in progress: Show progress
// 3. Study loaded: Show viewer + AI panel
// 4. Timeline view: Show progression over time
```

### 14.2 MedGemmaPanel

```typescript
interface MedGemmaPanelProps {
  studyId: string;
  onMeasurementSelect: (measurement: Measurement) => void;
  onFindingHighlight: (finding: Finding, slices: number[]) => void;
}

// Sections:
// 1. Analysis status (loading, complete, error)
// 2. Findings list (clickable to highlight)
// 3. Measurements table (editable)
// 4. Impression summary
// 5. Recommendations
// 6. Confidence indicator
```

### 14.3 ProgressionTimeline

```typescript
interface ProgressionTimelineProps {
  sessionId: string;
  onStudySelect: (studyId: string) => void;
  onCompareSelect: (baselineId: string, followUpId: string) => void;
}

// Features:
// 1. Horizontal timeline with study markers
// 2. Lesion size chart (line graph)
// 3. Response badges (CR/PR/SD/PD)
// 4. Click to view individual study
// 5. Click two studies to compare
```

---

## 15. Testing Strategy

### 15.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| DICOM Parser | Valid DICOM, corrupted files, non-DICOM files |
| Image Quality | Low light, blur, glare detection |
| RECIST Calculator | CR, PR, SD, PD scenarios; edge cases |
| MedGemma Client | API success, timeout, rate limiting |

### 15.2 Integration Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| Upload 100-slice CT | Process within 30s, display in viewer |
| Phone photo of CXR | Enhance, analyze, show findings |
| RECIST follow-up | Calculate response, update timeline |
| Offline usage | Load cached data, queue uploads |

### 15.3 MedGemma Accuracy Validation

| Modality | Test Set | Target Accuracy |
|----------|----------|-----------------|
| Chest X-ray | CheXpert subset | >85% finding detection |
| CT Chest | LIDC-IDRI subset | >80% nodule detection |
| Mammogram | CBIS-DDSM subset | >75% mass detection |
| RECIST | Manual measurements | >90% agreement |

---

## 16. Deployment Options

### 16.1 MedGemma Deployment

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Vertex AI Model Garden** | Scalable, managed, low latency | GCP lock-in, complex setup | ~$0.0005/image |
| **HuggingFace Pro** | Easy setup, good free tier | Rate limits, higher latency | $9/mo + usage |
| **Self-hosted (Railway)** | Full control, no limits | Expensive GPU, maintenance | ~$500/mo (A10G) |
| **Self-hosted (Render)** | Good GPU options | Cold starts | ~$400/mo (A10G) |

### 16.2 Recommended Architecture

```
Production:
- Frontend: Vercel (existing)
- MedGemma: Vertex AI Model Garden (primary) + HuggingFace (fallback)
- Storage: Cloudflare R2 (existing)
- Database: Supabase (future)

Development:
- MedGemma: HuggingFace Inference API
- Storage: Local filesystem
- Database: SQLite / localStorage
```

---

## 17. Dependencies

### New NPM Packages

```json
{
  "dicom-parser": "^1.8.21",           // Already have
  "@cornerstonejs/core": "^4.15.19",   // Already have
  "idb": "^8.0.0",                     // IndexedDB wrapper
  "recharts": "^2.12.0",               // Timeline charts
  "html2canvas": "^1.4.1",             // Export screenshots
  "jspdf": "^2.5.1",                   // Already have
  "@google-cloud/aiplatform": "^3.0.0" // Vertex AI SDK (if using)
}
```

### AI Services

- **MedGemma 4B**: Primary imaging analysis
- **Gemini 2.5 Flash**: Fallback, structured extraction
- **Gemini 2.5 Pro**: Complex reasoning, report generation

---

## 18. Open Questions

1. **Should we support DICOM SR (Structured Reports) export?**
   - Pro: Interoperability with PACS systems
   - Con: Complex implementation

2. **How to handle multi-phase CT (arterial, portal, delayed)?**
   - Option A: Analyze each phase separately
   - Option B: MedGemma multi-image input

3. **Should measurements be editable after MedGemma analysis?**
   - Pro: Allow user correction
   - Con: Liability concerns if user edits incorrectly

4. **Integration with existing agent deliberation?**
   - Can the imaging findings feed into the tumor board discussion?
   - Should Dr. Chitran (Onco-Radiology agent) see the MedGemma analysis?

5. **Rate limiting for MedGemma calls?**
   - Free tier: X analyses per day
   - Premium tier: Unlimited?

6. **Support for 3D visualization?**
   - VTK.js for MPR (multi-planar reconstruction)
   - Significant complexity increase

---

## 19. References

### Medical Standards
- RECIST 1.1: Eisenhauer EA, et al. Eur J Cancer. 2009;45(2):228-247
- BI-RADS: ACR BI-RADS Atlas, 5th Edition
- DICOM Standard: https://www.dicomstandard.org/

### MedGemma Resources
- Model Card: https://developers.google.com/health-ai-developer-foundations/medgemma/model-card
- GitHub: https://github.com/google-health/medgemma
- Kaggle Competition: https://www.kaggle.com/competitions/med-gemma-impact-challenge
- Fine-tuning Guide: https://developers.google.com/health-ai-developer-foundations/medgemma/get-started#fine-tune_medgemma

### Existing Codebase
- ModernDicomViewer: `apps/web/src/components/imaging/ModernDicomViewer.tsx`
- DICOM Loader: `apps/web/src/lib/imaging/dicom-loader.ts`
- Segmentation Service: `services/segmentation/`

---

*Document Version: 1.0*
*Created: January 25, 2026*
*Author: AI Assistant with human guidance*
*Status: DRAFT - Ready for Review*
