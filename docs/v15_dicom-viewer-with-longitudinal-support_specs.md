# V15: Longitudinal DICOM Viewer for Oncology Surveillance

## Executive Summary

This specification defines a **Longitudinal DICOM Viewer** optimized for tracking tumor progression, stable disease (SD), and regression across multiple imaging timepoints. The design adapts the excellent architecture from [MiraViewer](https://github.com/blader/MiraViewer) while contextualizing it for oncology tumor board workflows.

**Core Philosophy:** Reduce cognitive load for users (oncologists, non-oncology clinicians, and patients/caregivers) through intuitive visual design guided by [Saloni's Data Visualization Principles](https://www.scientificdiscovery.dev/p/salonis-guide-to-data-visualization).

---

## 1. Problem Statement

### Current State
The existing VTB DicomViewer (`apps/web/src/components/imaging/DicomViewer.tsx`) provides:
- Multi-planar reconstruction (Axial/Sagittal/Coronal)
- Single-timepoint viewing
- Window/level controls
- Synthetic volume generation for demos

### What's Missing
Oncologists need to:
1. **Compare scans across time** - See baseline vs. follow-up side-by-side
2. **Track lesion progression** - Visualize RECIST measurements longitudinally
3. **Detect subtle changes** - Rapid A/B comparison (flicker comparison)
4. **Align misregistered scans** - Patient positioning varies between scans
5. **Share findings** - Non-radiologists and patients need intuitive visual summaries

---

## 2. Design Principles (Saloni's Guide Adaptation)

### 2.1 Reduce Cognitive Load
| Principle | Implementation |
|-----------|----------------|
| **Keep text horizontal** | All labels, dates, measurements readable without head tilting |
| **Label directly** | Lesion annotations on-image, not in separate legend |
| **Match colors to concepts** | Green = regression, Yellow = stable, Red = progression |
| **Plain language** | "Tumor shrunk 30%" not "30% reduction in sum of longest diameters" |

### 2.2 Progressive Disclosure
| User Type | Default View | Advanced Features |
|-----------|--------------|-------------------|
| **Patient/Caregiver** | Timeline + Summary cards | Hidden technical controls |
| **Non-Oncology Clinician** | Side-by-side comparison | RECIST details on demand |
| **Oncologist/Radiologist** | Full measurement tools | Alignment, multi-series |

### 2.3 Visual Hierarchy for Response Assessment
```
RESPONSE STATUS (largest, most prominent)
     ↓
Percent Change (-30%, +20%, etc.)
     ↓
Timeline visualization
     ↓
Technical details (RECIST criteria, lesion IDs)
```

---

## 3. Architecture (Adapted from MiraViewer)

### 3.1 Component Hierarchy

```
LongitudinalViewer
├── TimelineSidebar              # Date selection, progression summary
├── ComparisonMatrix             # Main viewing area
│   ├── GridView                 # Multiple dates simultaneously
│   │   └── DicomPanel[]         # One per timepoint
│   │       └── ViewportPanel    # Cornerstone.js rendering
│   └── OverlayView              # Single panel, rapid switching
│       ├── DateStrip            # Quick date navigation
│       └── FlickerCompare       # Hold-to-compare feature
├── MeasurementPanel             # RECIST lesion tracking
├── ProgressionChart             # Visual trend (sparkline/waterfall)
└── ResponseBadge                # CR/PR/SD/PD indicator
```

### 3.2 State Management (Hook Pattern from MiraViewer)

```typescript
// packages/viewer/src/hooks/

useLongitudinalData.ts      // Fetch & structure studies by date
useComparisonFilters.ts     // Plane/series/date selection
usePanelSettings.ts         // Per-date display settings (zoom, pan, W/L)
useSliceSync.ts             // Synchronized slice navigation
useAutoAlign.ts             // Image registration pipeline
useMeasurements.ts          // RECIST target lesion tracking
useProgressionState.ts      // CR/PR/SD/PD calculation
```

### 3.3 Data Model

```typescript
// apps/web/src/types/longitudinal-imaging.ts

export interface LongitudinalStudy {
  id: string;
  patientId: string;
  studies: ImagingTimepoint[];
  baselineStudyId: string;
  targetLesions: TrackedLesion[];
  assessments: RECISTAssessment[];
}

export interface ImagingTimepoint {
  id: string;
  studyDate: Date;
  studyInstanceUID: string;
  modality: string;           // CT, MRI, PET-CT
  bodyPart: string;
  series: SeriesInfo[];
  isBaseline: boolean;
  timepoint: 'baseline' | 'follow-up' | 'end-of-treatment' | 'surveillance';
  daysFromBaseline: number;
  treatmentContext?: string;  // "Post-Cycle 2", "Week 12", etc.
}

export interface TrackedLesion {
  id: string;
  name: string;               // "Liver lesion 1", "Lung nodule RUL"
  location: string;
  organ: string;
  isLymphNode: boolean;
  measurements: LesionMeasurement[];
  status: 'target' | 'non-target' | 'new';
}

export interface LesionMeasurement {
  timepointId: string;
  date: Date;
  longAxis: number;           // mm
  shortAxis?: number;         // mm (required for lymph nodes)
  sliceNumber: number;
  seriesUID: string;
  annotationCoords: { x: number; y: number }[];
  measuredBy: 'ai' | 'user' | 'report';
  confidence?: number;
}

export type ResponseCategory = 'CR' | 'PR' | 'SD' | 'PD' | 'NE';

export interface ProgressionSummary {
  currentResponse: ResponseCategory;
  percentChangeFromBaseline: number;
  percentChangeFromNadir: number;
  bestResponse: ResponseCategory;
  bestResponseDate: Date;
  newLesions: boolean;
  trend: 'improving' | 'stable' | 'worsening';
}
```

---

## 4. User Interface Design

### 4.1 Main Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Response Badge: PR -32%]                          [Patient: J. Doe]   │
├───────────┬─────────────────────────────────────────────────────────────┤
│           │                                                             │
│  TIMELINE │                    COMPARISON MATRIX                        │
│           │                                                             │
│  ● Jan 15 │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│    Baseline   │  BASELINE   │   │  WEEK 8     │   │  WEEK 16    │      │
│           │   │  2024-01-15 │   │  2024-03-12 │   │  2024-05-07 │      │
│  ○ Mar 12 │   │             │   │             │   │             │      │
│    Week 8 │   │   [IMAGE]   │   │   [IMAGE]   │   │   [IMAGE]   │      │
│           │   │             │   │             │   │             │      │
│  ● May 07 │   │  Sum: 45mm  │   │  Sum: 38mm  │   │  Sum: 31mm  │      │
│    Week 16│   │             │   │  -16%       │   │  -31%       │      │
│           │   └─────────────┘   └─────────────┘   └─────────────┘      │
│           │                                                             │
│  [+Add]   │   ══════════════════════════════════════════════════       │
│           │   [Synchronized Slice Navigator: ████████░░░░ 67/100]       │
├───────────┴─────────────────────────────────────────────────────────────┤
│  PROGRESSION CHART                                                      │
│  ────────────────────────────────────────────────────────────────────── │
│  Sum of  │    45                                                        │
│  Longest │    ●─────●                                                   │
│  Diameters│          ──────●                                            │
│  (mm)    │                 ─────●                                       │
│          │    30   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (PR threshold: -30%)            │
│          └───────────────────────────────────────────────────────────── │
│               Jan      Mar      May      Jul                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Response Badge (Always Visible)

The **Response Badge** is the most important visual element - it immediately communicates the clinical status.

```typescript
// apps/web/src/components/longitudinal/ResponseBadge.tsx

interface ResponseBadgeProps {
  response: ResponseCategory;
  percentChange: number;
  trend: 'improving' | 'stable' | 'worsening';
}

const RESPONSE_COLORS = {
  CR: { bg: 'bg-green-600', text: 'Complete Response', icon: '✓' },
  PR: { bg: 'bg-green-500', text: 'Partial Response', icon: '↓' },
  SD: { bg: 'bg-yellow-500', text: 'Stable Disease', icon: '→' },
  PD: { bg: 'bg-red-500', text: 'Progressive Disease', icon: '↑' },
  NE: { bg: 'bg-gray-500', text: 'Not Evaluable', icon: '?' },
};
```

**Design Rationale (Saloni's Principle):** Colors match clinical concepts:
- **Green** = Good (regression)
- **Yellow** = Caution (stable, watch closely)
- **Red** = Alert (progression, action needed)

### 4.3 Timeline Sidebar

```typescript
// apps/web/src/components/longitudinal/TimelineSidebar.tsx

interface TimelineEntry {
  date: Date;
  label: string;              // "Baseline", "Week 8", etc.
  isSelected: boolean;
  isBaseline: boolean;
  response?: ResponseCategory;
  sumDiameters?: number;
  hasNewLesions: boolean;
}

// Visual: Vertical timeline with dots
// - Filled dot (●) = Currently displayed
// - Empty dot (○) = Available but not shown
// - Color-coded by response status
// - Treatment annotations ("After Cycle 2", etc.)
```

### 4.4 Comparison Matrix (Adapted from MiraViewer)

#### Grid View (Multiple Dates Simultaneously)

```typescript
// apps/web/src/components/longitudinal/ComparisonGrid.tsx

interface ComparisonGridProps {
  timepoints: ImagingTimepoint[];
  selectedPlane: 'axial' | 'sagittal' | 'coronal';
  globalSlice: number;           // Synchronized across all panels
  panelSettings: Map<string, PanelSettings>;
  measurements: Map<string, LesionMeasurement[]>;
  onMeasurementAdd: (timepointId: string, measurement: LesionMeasurement) => void;
}

// Layout: Responsive grid (2-4 columns depending on screen)
// Each panel shows:
// - Date header with days from baseline
// - DICOM image with lesion annotations
// - Sum of diameters footer
// - Percent change badge
```

#### Overlay View (Rapid A/B Comparison)

```typescript
// apps/web/src/components/longitudinal/OverlayView.tsx

// Key Features:
// 1. Date Strip at top - clickable dates for instant switching
// 2. Keyboard shortcuts: 1-9 for date, ← → for sequential
// 3. Hold Space = "Flicker compare" (show previous date temporarily)
// 4. Playback mode - auto-cycle through dates at configurable speed

interface OverlayViewProps {
  timepoints: ImagingTimepoint[];
  currentIndex: number;
  compareTarget: number;         // Index for hold-to-compare
  playbackSpeed: number;         // ms between frames
  isPlaying: boolean;
}
```

**HCI Rationale:** Flicker comparison (holding Space to briefly show a different timepoint) leverages human visual system's excellent change detection for motion/flicker - much more effective than static side-by-side for subtle differences.

### 4.5 Progression Chart

```typescript
// apps/web/src/components/longitudinal/ProgressionChart.tsx

// Two visualization modes:

// 1. TREND LINE (for tracking over time)
// - X-axis: Time (dates or days from baseline)
// - Y-axis: Sum of longest diameters (mm)
// - Reference lines: -30% (PR threshold), +20% (PD threshold)
// - Color-coded points by response status

// 2. WATERFALL PLOT (for comparing to baseline)
// - Each bar = one lesion
// - Height = percent change from baseline
// - Color: Green (shrunk), Yellow (stable), Red (grew)
// - Sorted by change (best to worst)

interface ProgressionChartProps {
  measurements: LesionMeasurement[][];  // Per timepoint
  mode: 'trend' | 'waterfall';
  showTargetLesions: boolean;
  showNonTargetLesions: boolean;
}
```

**Saloni's Principle Applied:** Use familiar visual language:
- Trend line for "How is it changing over time?"
- Waterfall for "How does each lesion compare to baseline?"

---

## 5. Key Features

### 5.1 Synchronized Slice Navigation

All panels stay anatomically aligned. When user scrolls in one panel, all panels update to show the same anatomical position.

```typescript
// apps/web/src/hooks/useSliceSync.ts

export function useSliceSync(timepoints: ImagingTimepoint[]) {
  // Global slice progress (0.0 - 1.0)
  const [sliceProgress, setSliceProgress] = useState(0.5);
  
  // Calculate actual slice index for each timepoint based on:
  // - Total slices in that series
  // - Slice thickness differences
  // - Registration offsets (from alignment)
  
  const getSliceForTimepoint = (timepointId: string): number => {
    const tp = timepoints.find(t => t.id === timepointId);
    const offset = alignmentOffsets.get(timepointId) || 0;
    return Math.round(sliceProgress * tp.totalSlices) + offset;
  };
  
  return { sliceProgress, setSliceProgress, getSliceForTimepoint };
}
```

### 5.2 Auto-Alignment (from MiraViewer)

Patient positioning varies between scans. Auto-alignment uses 2D affine registration to match anatomy.

```typescript
// apps/web/src/hooks/useAutoAlign.ts

// Pipeline (adapted from MiraViewer):
// 1. Select reference timepoint (usually baseline)
// 2. For each other timepoint:
//    a. Seed registration (128x128 downsampled)
//    b. Slice search (find best matching slice)
//    c. Refinement (512x512 full resolution)
// 3. Store transform per (timepoint, slice)
// 4. Apply transform during rendering

interface AlignmentResult {
  timepointId: string;
  referenceTimepointId: string;
  sliceOffset: number;          // Z-axis offset
  transform: AffineTransform;   // 2D transform
  quality: number;              // 0-1, mutual information score
}
```

### 5.3 Lesion Annotation & Measurement

```typescript
// apps/web/src/components/longitudinal/LesionAnnotation.tsx

interface LesionAnnotationProps {
  lesion: TrackedLesion;
  currentMeasurement: LesionMeasurement;
  previousMeasurement?: LesionMeasurement;
  showChange: boolean;
}

// Visual:
// - Circle/ellipse around lesion
// - Label: "Liver L1: 24mm (-18%)"
// - Color: Based on individual lesion change
// - Clickable to edit measurement
```

**Saloni's Principle:** Direct labeling - measurements shown ON the image, not in a separate table.

### 5.4 Patient-Friendly Summary Mode

For patients/caregivers who need a simplified view:

```typescript
// apps/web/src/components/longitudinal/PatientSummaryView.tsx

// Shows:
// 1. Large response badge with plain-language explanation
//    "Your tumors have shrunk by 32% since starting treatment"
// 
// 2. Simple before/after comparison (2 images only)
//    "BEFORE treatment" | "MOST RECENT scan"
//
// 3. Trend indicator (arrow up/down/sideways)
//    "Your treatment is working" / "Things are stable" / etc.
//
// 4. Next steps
//    "Your next scan is scheduled for..."

// DOES NOT SHOW:
// - Technical measurements
// - Multiple timepoints
// - RECIST criteria details
// - Slice navigation controls
```

---

## 6. Data Flow

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  IndexedDB   │────▶│ useLongitudinalData│────▶│ LongitudinalStudy   │
│  (Storage)   │     │      Hook          │     │    (Structured)     │
└──────────────┘     └───────────────────┘     └─────────────────────┘
                                                         │
                                                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        LongitudinalViewer                            │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │ Timeline    │  │ ComparisonMatrix │  │ ProgressionChart        │ │
│  │ Sidebar     │  │                  │  │                         │ │
│  │             │  │ ┌──────┐┌──────┐ │  │  Sum    45●             │ │
│  │ ● Baseline  │  │ │ T1   ││ T2   │ │  │  (mm)    ●─●            │ │
│  │ ○ Week 8    │  │ │      ││      │ │  │         30──────        │ │
│  │ ● Week 16   │  │ └──────┘└──────┘ │  │              (PR line)  │ │
│  └─────────────┘  └──────────────────┘  └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Roadmap

### Phase 1: Core Viewer (Week 1-2)
- [ ] Set up data model (`longitudinal-imaging.ts`)
- [ ] Implement `useLongitudinalData` hook
- [ ] Create `ComparisonGrid` with synchronized slice navigation
- [ ] Add `TimelineSidebar` for date selection
- [ ] Basic `DicomPanel` with Cornerstone.js rendering

### Phase 2: Comparison Features (Week 3)
- [ ] Implement `OverlayView` with date switching
- [ ] Add flicker comparison (hold-to-compare)
- [ ] Implement playback mode
- [ ] Add keyboard shortcuts

### Phase 3: Measurements & Tracking (Week 4)
- [ ] Lesion annotation UI
- [ ] Measurement persistence
- [ ] RECIST calculation logic
- [ ] `ProgressionChart` (trend line + waterfall)
- [ ] `ResponseBadge` component

### Phase 4: Alignment & Polish (Week 5)
- [ ] Auto-alignment pipeline (adapted from MiraViewer)
- [ ] Per-panel settings (zoom, pan, W/L)
- [ ] Patient-friendly summary mode
- [ ] Mobile-responsive layout

### Phase 5: Integration (Week 6)
- [ ] Connect to existing VTB imaging upload flow
- [ ] Integrate with deliberation context (Dr. Chitran)
- [ ] Add to main tumor board UI
- [ ] User testing & iteration

---

## 8. Technical Dependencies

### From MiraViewer (to adapt)
| Component | MiraViewer Location | VTB Location |
|-----------|---------------------|--------------|
| `ComparisonMatrix.tsx` | `frontend/src/components/` | `apps/web/src/components/longitudinal/` |
| `DicomViewer.tsx` | `frontend/src/components/` | Adapt existing `ViewportPanel.tsx` |
| `useAutoAlign.ts` | `frontend/src/hooks/` | `apps/web/src/hooks/` |
| `usePanelSettings.ts` | `frontend/src/hooks/` | `apps/web/src/hooks/` |
| `useComparisonFilters.ts` | `frontend/src/hooks/` | `apps/web/src/hooks/` |
| IndexedDB schema | `frontend/src/db/schema.ts` | Extend existing storage |

### New Dependencies
```json
{
  "cornerstone-core": "^2.6.1",
  "cornerstone-wado-image-loader": "^4.13.2",
  "dicom-parser": "^1.8.21",
  "idb": "^8.0.0"
}
```

### Existing VTB Integration Points
- `apps/web/src/types/imaging.ts` - Extend with longitudinal types
- `apps/web/src/components/my-imaging/MyImagingTab.tsx` - Add longitudinal view tab
- `apps/web/src/lib/imaging/dicom-loader.ts` - Study organization by date

---

## 9. Accessibility & HCI Considerations

### 9.1 Colorblind-Friendly Palette
```typescript
const COLORBLIND_SAFE = {
  progression: '#D55E00',   // Vermillion (visible to all)
  stable: '#F0E442',        // Yellow
  regression: '#009E73',    // Bluish green
  neutral: '#999999',       // Gray
};
```

### 9.2 Keyboard Navigation
| Key | Action |
|-----|--------|
| `1-9` | Jump to timepoint |
| `← →` | Previous/next timepoint |
| `↑ ↓` | Scroll slices |
| `Space` (hold) | Flicker compare |
| `G` | Toggle grid/overlay view |
| `P` | Toggle playback |
| `R` | Reset alignment |

### 9.3 Screen Reader Support
- All images have `aria-label` describing lesion status
- Response badge announces change on update
- Timeline entries are navigable with tab

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to assess progression | < 30 seconds | User study |
| Comprehension (patients) | 80%+ understand their status | Survey |
| Annotation accuracy | Within 2mm of radiologist | Validation study |
| Alignment success rate | > 90% auto-align works | Automated |

---

## 11. References

1. **MiraViewer** - https://github.com/blader/MiraViewer
   - Architecture, hooks, alignment pipeline
   
2. **MiraViewer DeepWiki** - https://deepwiki.com/blader/MiraViewer
   - Detailed component documentation
   
3. **Saloni's Data Visualization Guide** - https://www.scientificdiscovery.dev/p/salonis-guide-to-data-visualization
   - HCI principles, cognitive load reduction
   
4. **RECIST 1.1 Criteria** - Eisenhauer et al., European Journal of Cancer, 2009
   - Response assessment standards
   
5. **Existing VTB Imaging** - `apps/web/src/components/imaging/`
   - Current DicomViewer, types

---

*Document Version: 1.0*
*Created: 2026-01-26*
*Author: VTB Development Team*
