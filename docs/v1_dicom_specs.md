# DICOM Viewer Integration Specs v1

## Overview
Collaborative DICOM viewer for Virtual Tumor Board - allows MTB members to review imaging together with synchronized views and the radiologist report.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Virtual Tumor Board App                         │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  Case Summary    │    │  DICOM Viewer    │  ← New Tab            │
│  │  Deliberation    │    │  Tab             │                       │
│  └──────────────────┘    └────────┬─────────┘                       │
│                                   │                                  │
│  ┌────────────────────────────────┼────────────────────────────────┐│
│  │              Imaging Review Panel                               ││
│  │  ┌─────────────────────────┐  ┌───────────────────────────────┐ ││
│  │  │   Left Pane (60%)       │  │   Right Pane (40%)            │ ││
│  │  │   ┌─────────┬─────────┐ │  │   ┌─────────────────────────┐ │ ││
│  │  │   │ Axial   │ Sagittal│ │  │   │  Radiologist Report     │ │ ││
│  │  │   ├─────────┼─────────┤ │  │   │  (AI-Generated)         │ │ ││
│  │  │   │ Coronal │ 3D/Info │ │  │   │                         │ │ ││
│  │  │   └─────────┴─────────┘ │  │   │  Findings, Measurements │ │ ││
│  │  │   [Windowing] [Tools]   │  │   │  Impressions, Recs      │ │ ││
│  │  └─────────────────────────┘  └───────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              WebSocket Collaboration Layer                       ││
│  │   - Cursor sync across viewers                                   ││
│  │   - Annotation sharing                                           ││
│  │   - Navigation sync (optional)                                   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core DICOM Viewer ✅ COMPLETE
- [x] Install dependencies (cornerstone, dicom-parser)
- [x] Create synthetic volume generator
- [x] Build ViewportPanel component
- [x] Build WindowingControls
- [x] Build DicomViewer (multi-planar container)
- [x] Commit + Push

### Phase 2: Radiologist Report Panel ✅ COMPLETE
- [x] Create report data structure
- [x] Build RadiologistReport component
- [x] Generate sample reports for 10 cases
- [x] Commit + Push

### Phase 3: WebSocket Collaboration (DEFERRED)
- [ ] Create WebSocket API route
- [ ] Build CollaborationOverlay component
- [ ] Implement cursor sync
- [ ] Implement annotation sharing
- [ ] Commit + Push

### Phase 4: Tab Integration ✅ COMPLETE
- [x] Create ImagingReviewTab component
- [x] Update page.tsx with tabs
- [x] Polish UI/UX
- [x] Commit + Push

### Phase 5: Python Segmentation Service (DEFERRED)
- [ ] Create Dockerfile for segmentation
- [ ] Port MedSAM3 predictor
- [ ] Add Railway service config
- [ ] Commit + Push

### Final: Deploy to Railway ✅ COMPLETE
- Live at: https://virtual-tumor-board-production.up.railway.app

## File Structure

```
apps/web/src/
├── components/
│   ├── imaging/
│   │   ├── DicomViewer.tsx          # Main multi-planar viewer
│   │   ├── ViewportPanel.tsx        # Single viewport
│   │   ├── WindowingControls.tsx    # CT window presets
│   │   ├── RadiologistReport.tsx    # Report display
│   │   └── CollaborationOverlay.tsx # Cursors/annotations
│   └── ImagingReviewTab.tsx         # Tab container
├── lib/
│   └── imaging/
│       ├── synthetic-volume.ts      # Procedural CT generator
│       ├── windowing-presets.ts     # CT/MRI presets
│       └── radiology-reports.ts     # Report data
```

## Key Features

### Multi-Planar Viewing
- Axial, Sagittal, Coronal views in 2x2 grid
- Synchronized crosshairs
- Scroll wheel slice navigation
- Right-click drag for window/level

### Windowing Presets
- Lung: C=-600, W=1500
- Mediastinum: C=50, W=350
- Soft Tissue: C=40, W=400
- Bone: C=400, W=1800
- Brain: C=40, W=80
- Liver: C=60, W=150

### Synthetic Volume
- 256x256x100 voxels
- Simulated thorax anatomy
- Lung fields, heart, spine, ribs
- Tumor lesion in right upper lobe
- Realistic HU values for windowing

### Collaboration (WebSocket)
- Real-time cursor position sharing
- Annotation sync (draw, text, arrows)
- "Follow me" mode for radiologist-led review
- User presence indicators

## Dependencies

```json
{
  "@cornerstonejs/core": "^4.15.19",
  "@cornerstonejs/tools": "^4.15.19",
  "dicom-parser": "^1.8.21"
}
```

## API Endpoints

### WebSocket: `/api/collab/ws`
Events:
- `join` - User joins imaging review
- `leave` - User leaves
- `cursor` - Cursor position update
- `slice` - Slice navigation
- `window` - Window/level change
- `annotation` - Add/remove annotation
- `follow` - Toggle follow mode

## Radiologist Report Structure

```typescript
interface RadiologistReport {
  technique: string;
  comparison: string;
  findings: {
    primaryLesion: string;
    lymphNodes: string;
    metastases: string;
    incidental: string;
  };
  measurements: Array<{
    label: string;
    value: string;
    slice: number;
  }>;
  impression: string;
  recommendations: string;
  reporter: string;
  signedAt: string;
}
```
