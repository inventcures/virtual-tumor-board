# V5 Specifications: Timeline Visualization, Smart Caching, and Auto-Staging

**Date**: 25 January 2026  
**Author**: Claude (AI Assistant) & Ashish  
**Status**: Draft Specification  

---

## Table of Contents

1. [Overview](#overview)
2. [Feature 1: Intelligent Backend Caching](#feature-1-intelligent-backend-caching)
3. [Feature 2: "Figure It Out For Me" - Auto-Staging](#feature-2-figure-it-out-for-me---auto-staging)
4. [Feature 3: Treatment Timeline Visualization](#feature-3-treatment-timeline-visualization)
5. [Implementation Plan](#implementation-plan)
6. [Technical Architecture](#technical-architecture)
7. [Data Models](#data-models)
8. [UI/UX Specifications](#uiux-specifications)
9. [Open Questions](#open-questions)

---

## Overview

### Context

The Virtual Tumor Board currently:
1. Processes user-uploaded medical documents through Gemini Flash (OCR + Classification + Extraction)
2. Requires users to manually specify cancer site and staging
3. Shows processed documents in a list format
4. Has no caching - every API call hits Gemini directly

### V5 Enhancements

Three major enhancements are proposed:

| Feature | Description | User Benefit |
|---------|-------------|--------------|
| **Intelligent Caching** | Cache Gemini API responses by content hash | Faster processing, reduced API costs |
| **Auto-Staging** | "I don't know" button that infers cancer site + stage from documents | Reduces user burden, more accurate staging |
| **Treatment Timeline** | Visual chronological timeline of treatment journey | Better understanding of disease progression |

---

## Feature 1: Intelligent Backend Caching

### Problem Statement

Currently, every document upload triggers a fresh Gemini API call, even if:
- The exact same document was processed before (same user re-uploading)
- A nearly identical document template exists (e.g., same hospital's pathology report format)
- Demo cases are run repeatedly (100% redundant API calls)

### Proposed Solution

Implement a **content-hash based caching layer** with multiple tiers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CACHING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Document Upload                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────┐                                        │
│  │ 1. Compute Hash     │  SHA-256 of (base64 + mimeType)        │
│  │    (Content-Based)  │                                        │
│  └─────────┬───────────┘                                        │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────┐     ┌──────────────────┐              │
│  │ 2. Check L1 Cache   │────▶│ In-Memory LRU    │              │
│  │    (Hot Cache)      │     │ 100 items, 5min  │              │
│  └─────────┬───────────┘     └──────────────────┘              │
│            │ MISS                                               │
│            ▼                                                    │
│  ┌─────────────────────┐     ┌──────────────────┐              │
│  │ 3. Check L2 Cache   │────▶│ Redis/KV Store   │              │
│  │    (Persistent)     │     │ 24h TTL          │              │
│  └─────────┬───────────┘     └──────────────────┘              │
│            │ MISS                                               │
│            ▼                                                    │
│  ┌─────────────────────┐     ┌──────────────────┐              │
│  │ 4. Gemini API Call  │────▶│ OCR + Classify   │              │
│  │    (Fresh)          │     │ + Extract        │              │
│  └─────────┬───────────┘     └──────────────────┘              │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────┐                                        │
│  │ 5. Store in Cache   │  Both L1 and L2                        │
│  └─────────────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Key Strategy

```typescript
interface CacheKey {
  // Primary key: hash of content
  contentHash: string;  // SHA-256 of base64Data
  
  // Secondary factors (for cache invalidation)
  mimeType: string;
  modelVersion: string;  // "gemini-2.0-flash" - invalidate on model upgrade
}

// Example cache key: "doc:gemini-2.0-flash:image/jpeg:a1b2c3d4e5f6..."
```

### Cache Entry Structure

```typescript
interface CachedDocumentResult {
  // Cache metadata
  cacheKey: string;
  cachedAt: number;  // Unix timestamp
  ttlSeconds: number;
  hitCount: number;
  
  // Cached result
  classifiedType: DocumentType;
  confidence: number;
  extractedData: ExtractedClinicalData;
  extractedText: string;  // Redacted text
  textLength: number;
  warnings: string[];
  
  // Provenance
  geminiModelUsed: string;
  processingTimeMs: number;
}
```

### Implementation Options for Railway

Since we're on Railway, we have these options:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Railway Redis Add-on** | Native integration, persistent | Adds ~$5/mo cost | **Recommended for production** |
| **Upstash Redis** | Free tier available, edge-ready | External dependency | Good for MVP |
| **In-Memory Only** | Zero cost, simple | Lost on redeploy, limited size | Acceptable for demo |
| **Cloudflare KV** | Already using R2 for DICOM | Another service to manage | Future option |

### Cache Invalidation Rules

1. **TTL-based**: 24 hours default (medical documents don't change)
2. **Model-version based**: Invalidate when Gemini model changes
3. **Manual purge**: Admin API to clear cache for a specific hash
4. **Size-based eviction**: LRU when L1 cache exceeds 100 items

### API Changes

```typescript
// POST /api/upload/process
// Request body unchanged

// Response adds cache info
interface ProcessDocumentResponse {
  documentId: string;
  classifiedType: DocumentType;
  confidence: number;
  extractedData: ExtractedClinicalData;
  warnings: string[];
  textLength: number;
  
  // NEW: Cache info
  cached: boolean;
  cacheHit: 'l1' | 'l2' | 'miss';
  processingTimeMs: number;
}
```

### Metrics to Track

- Cache hit rate (L1 vs L2 vs miss)
- Average processing time (cached vs uncached)
- Cache size and memory usage
- API cost savings estimate

---

## Feature 2: "Figure It Out For Me" - Auto-Staging

### Problem Statement

The current flow requires users to:
1. Select cancer site from a list
2. Specify staging (I, II, III, IV, or unknown)

But many patients/caregivers:
- Don't know the exact cancer site (is it "Breast" or "Breast - Triple Negative"?)
- Don't understand staging nomenclature
- Have all the information in their documents but can't interpret it

### Proposed Solution

Add a **"Let AI Figure It Out"** button on the cancer-info page that:
1. Skips manual selection
2. Goes directly to document upload
3. After documents are processed, AI analyzes ALL documents to determine:
   - Cancer site (with confidence)
   - Stage (with TNM if available)
   - Key biomarkers/mutations
   - Treatment history summary

### User Flow

```
Current Flow:
┌─────────┐    ┌─────────────┐    ┌───────────┐    ┌────────┐
│ Welcome │───▶│ Cancer Info │───▶│ Documents │───▶│ Review │
│         │    │ (Manual)    │    │ (Upload)  │    │        │
└─────────┘    └─────────────┘    └───────────┘    └────────┘

New Flow with "Figure It Out":
┌─────────┐    ┌─────────────┐    ┌───────────┐    ┌────────────┐    ┌────────┐
│ Welcome │───▶│ Cancer Info │───▶│ Documents │───▶│ AI Staging │───▶│ Review │
│         │    │ + "Let AI   │    │ (Upload)  │    │ (Auto)     │    │        │
│         │    │ figure out" │    │           │    │            │    │        │
└─────────┘    └─────────────┘    └───────────┘    └────────────┘    └────────┘
                     │
                     │ Click "Figure it out"
                     ▼
              Skip to Documents
              (cancerSite = "auto-detect")
```

### UI for "Figure It Out" Button

On `/upload/cancer-info`:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  What type of cancer?                                           │
│                                                                  │
│  [Search cancer type...]                                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Breast    │  │    Lung     │  │  Colorectal │  ...       │
│  │   स्तन      │  │    फेफड़ा    │  │   कोलोरेक्टल  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ─────────────────── OR ───────────────────                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🪄  Not sure? Let AI figure it out                      │   │
│  │                                                          │   │
│  │  Upload your documents and we'll automatically detect:   │   │
│  │  • Cancer type and site                                  │   │
│  │  • Stage (TNM and overall)                              │   │
│  │  • Key biomarkers and mutations                         │   │
│  │                                                          │   │
│  │  ────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │  [  Upload Documents & Auto-Detect  →  ]                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Staging Pipeline

After all documents are uploaded and processed, run a **synthesis prompt**:

```typescript
// POST /api/upload/auto-stage
interface AutoStageRequest {
  documents: {
    filename: string;
    classifiedType: DocumentType;
    extractedData: ExtractedClinicalData;
    rawText: string;  // First 2000 chars
  }[];
}

interface AutoStageResponse {
  // Detected cancer info
  cancerSite: {
    id: string;  // e.g., "breast-tnbc"
    label: string;  // e.g., "Breast Cancer - Triple Negative"
    confidence: number;  // 0-1
    evidence: string[];  // ["Pathology shows ER-, PR-, HER2-"]
  };
  
  // Staging
  staging: {
    clinicalStage: 'I' | 'II' | 'III' | 'IV' | 'unknown';
    tnm?: string;  // "T2N1M0"
    confidence: number;
    evidence: string[];
  };
  
  // Key findings summary
  keyFindings: {
    histology?: string;
    grade?: string;
    biomarkers?: Record<string, string>;
    mutations?: string[];
    metastases?: string[];
  };
  
  // Treatment history (if detected)
  treatmentHistory?: {
    surgeries?: string[];
    chemotherapy?: string[];
    radiation?: string[];
    targetedTherapy?: string[];
  };
  
  // Warnings
  warnings: string[];
  
  // Dates extracted (for timeline)
  extractedDates: {
    date: string;  // ISO format
    event: string;
    documentSource: string;
    confidence: number;
  }[];
}
```

### Gemini Prompt for Auto-Staging

```
You are a medical AI assistant analyzing cancer medical documents.

Given the following extracted information from {N} documents, determine:

1. PRIMARY CANCER SITE
   - Identify the primary cancer type (breast, lung, colorectal, etc.)
   - Include subtype if determinable (e.g., "Triple Negative Breast Cancer", "NSCLC Adenocarcinoma")
   - Cite which document(s) support this conclusion

2. STAGING
   - Determine the clinical stage (I, II, III, IV)
   - Provide TNM staging if available from pathology/radiology
   - Note if staging has changed over time (upstaged/downstaged)
   - Cite evidence from radiology and pathology reports

3. KEY BIOMARKERS
   - List all relevant biomarkers (ER, PR, HER2, Ki-67, EGFR, KRAS, BRAF, PD-L1, MSI, etc.)
   - Include values and interpretation
   - Flag actionable mutations

4. TREATMENT HISTORY (if evident from documents)
   - List any surgeries, chemotherapy, radiation, or targeted therapy mentioned
   - Include dates if available

5. IMPORTANT DATES
   - Extract all clinically relevant dates (diagnosis, surgery, scans, reports)
   - Associate each date with the event type

DOCUMENTS:
{for each document}
---
Document #{n}: {filename}
Type: {classifiedType}
Date: {extractedData.date}
Key Data: {extractedData summary}
Text excerpt: {first 1500 chars of rawText}
---
{end for}

Respond in JSON format matching the AutoStageResponse interface.
```

### User Confirmation Flow

After auto-staging, show a confirmation screen:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🔍  AI Analysis Complete                                       │
│                                                                  │
│  Based on your {11} documents, we detected:                     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  CANCER TYPE                                               │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                            │ │
│  │  Breast Cancer - Triple Negative (TNBC)     95% confident │ │
│  │                                                            │ │
│  │  Evidence:                                                 │ │
│  │  • "ER negative, PR negative, HER2 negative" (Pathology)  │ │
│  │  • "Infiltrating ductal carcinoma" (Biopsy)               │ │
│  │                                                            │ │
│  │  [ ✓ Looks correct ]  [ ✏️ Edit ]                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  STAGE                                                     │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                            │ │
│  │  Stage IIA (T2 N0 M0)                       88% confident │ │
│  │                                                            │ │
│  │  Evidence:                                                 │ │
│  │  • Tumor size: 2.8 cm (Pathology)                         │ │
│  │  • No lymph node involvement (PET-CT)                     │ │
│  │  • No distant metastases (PET-CT)                         │ │
│  │                                                            │ │
│  │  [ ✓ Looks correct ]  [ ✏️ Edit ]                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  KEY BIOMARKERS                                            │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                            │ │
│  │  ER: Negative    PR: Negative    HER2: Negative           │ │
│  │  Ki-67: 45% (High)                                        │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│         [ ← Back ]                    [ Proceed to Review → ]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 3: Treatment Timeline Visualization

### Problem Statement

After documents are uploaded, users see a list of documents with types. But there's no:
- Chronological view of the treatment journey
- Visual understanding of disease progression
- Easy way to see "what happened when"

### Proposed Solution

Create an **interactive visual timeline** that:
1. Plots all extracted dates on a horizontal timeline
2. Color-codes events by specialty/document type
3. Shows milestone markers (diagnosis, surgery, chemo cycles, scans)
4. Allows clicking on events to see document details

### Timeline Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  📅  Treatment Journey Timeline                                                  │
│                                                                                  │
│  Jun 2025                Jul 2025                Aug 2025               Sep 2025 │
│  ────┼────────────────────┼────────────────────────┼────────────────────────┼── │
│      │                    │                        │                        │    │
│      ●                    ●                        ●                        ●    │
│   Diagnosis            Surgery                 PET-CT                  Chemo#1  │
│   (Biopsy)        (Mastectomy)              (Restaging)            (AC Cycle 1) │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ● Pathology/Diagnosis    ● Surgery    ● Radiology    ● Treatment       │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Click any event for details                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Color Coding by Specialty

| Document Type | Color | Icon | Specialty |
|---------------|-------|------|-----------|
| `pathology` | Pink (#EC4899) | 🔬 | Pathologist |
| `radiology` | Cyan (#06B6D4) | 📷 | Radiologist |
| `surgical-notes` | Red (#EF4444) | 🔪 | Surgical Oncology |
| `prescription` | Blue (#3B82F6) | 💊 | Medical Oncology |
| `discharge-summary` | Purple (#8B5CF6) | 🏥 | Hospital |
| `lab-report` | Amber (#F59E0B) | 🧪 | Laboratory |
| `clinical-notes` | Slate (#64748B) | 📋 | Clinical |
| `genomics` | Emerald (#10B981) | 🧬 | Genetics |

### Timeline Data Model

```typescript
interface TimelineEvent {
  id: string;
  date: Date;
  dateConfidence: number;  // 0-1, how confident we are about the date
  
  // Event info
  eventType: 'diagnosis' | 'surgery' | 'scan' | 'treatment' | 'lab' | 'consult' | 'other';
  title: string;  // e.g., "PET-CT Scan"
  description: string;  // e.g., "Restaging scan showing no residual disease"
  
  // Source document
  documentId: string;
  documentType: DocumentType;
  
  // Display
  color: string;
  icon: string;
  
  // Grouping
  specialty: 'pathology' | 'radiology' | 'surgery' | 'medical-oncology' | 'radiation' | 'other';
}

interface TreatmentTimeline {
  events: TimelineEvent[];
  
  // Key milestones
  diagnosisDate?: Date;
  surgeryDate?: Date;
  treatmentStartDate?: Date;
  
  // Time span
  earliestDate: Date;
  latestDate: Date;
  durationDays: number;
}
```

### Date Extraction Strategy

Dates can be extracted from:

1. **Document metadata** (file creation date - less reliable)
2. **Extracted text** - Look for patterns:
   - "Date: 15/06/2025"
   - "Report Date: June 15, 2025"
   - "Surgery performed on 20.07.2025"
   - "Specimen received: 14-06-2025"
3. **AI extraction** - Gemini extracts dates during document processing

Date patterns to handle (Indian formats):
```regex
// DD/MM/YYYY
/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/

// DD Month YYYY
/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i

// Month DD, YYYY
/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i
```

### Timeline UI Component

```tsx
// components/TreatmentTimeline.tsx

interface TreatmentTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

export function TreatmentTimeline({ events, onEventClick }: TreatmentTimelineProps) {
  // Sort events by date
  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events]
  );
  
  // Group by month for display
  const eventsByMonth = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of sortedEvents) {
      const key = format(event.date, 'MMM yyyy');
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    }
    return groups;
  }, [sortedEvents]);
  
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-700" />
      
      {/* Events */}
      <div className="space-y-6">
        {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
          <div key={month}>
            {/* Month header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-400">{month}</span>
              </div>
            </div>
            
            {/* Month events */}
            {monthEvents.map(event => (
              <TimelineEventCard 
                key={event.id} 
                event={event} 
                onClick={() => onEventClick?.(event)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEventCard({ event, onClick }: { event: TimelineEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all w-full text-left"
    >
      {/* Color dot */}
      <div 
        className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: event.color }}
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{event.icon}</span>
          <span className="font-medium text-white">{event.title}</span>
          <span className="text-xs text-slate-500 ml-auto">
            {format(event.date, 'dd MMM')}
          </span>
        </div>
        <p className="text-sm text-slate-400 line-clamp-2">{event.description}</p>
        
        {/* Specialty tag */}
        <span 
          className="inline-block mt-2 px-2 py-0.5 rounded text-xs"
          style={{ backgroundColor: `${event.color}20`, color: event.color }}
        >
          {event.specialty}
        </span>
      </div>
    </button>
  );
}
```

### Where to Show Timeline

The timeline should appear on:

1. **Review Page** (`/upload/review`) - After documents are processed
2. **Deliberation Page** (`/deliberate`) - As a tab alongside "Case Summary"
3. **PDF Report** - As a visual section (simplified version)

### Handling Missing/Ambiguous Dates

For documents without clear dates:
- Show at the end with "Date unknown" marker
- Group under "Undated Documents" section
- Allow manual date entry by user

```
┌────────────────────────────────────────────┐
│  📅  Undated Documents                      │
│                                             │
│  These documents don't have clear dates:   │
│                                             │
│  • Lab Report (CBC) - [Enter date]         │
│  • Prescription - [Enter date]             │
│                                             │
└────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend Caching (2-3 hours)

1. [ ] Add cache key generation utility
2. [ ] Implement in-memory LRU cache (L1)
3. [ ] Add cache layer to `/api/upload/process`
4. [ ] Add cache hit/miss logging
5. [ ] (Optional) Add Redis/Upstash integration

### Phase 2: Auto-Staging (3-4 hours)

1. [ ] Add "Figure It Out" button to cancer-info page
2. [ ] Create `/api/upload/auto-stage` endpoint
3. [ ] Implement Gemini synthesis prompt
4. [ ] Create confirmation UI component
5. [ ] Handle "Edit" flow if user disagrees
6. [ ] Update session state with auto-detected info

### Phase 3: Treatment Timeline (4-5 hours)

1. [ ] Enhance date extraction in document processing
2. [ ] Create `TimelineEvent` data model
3. [ ] Create `TreatmentTimeline` component
4. [ ] Add timeline to Review page
5. [ ] Add timeline tab to Deliberation page
6. [ ] Handle undated documents
7. [ ] (Optional) Add to PDF report

### Phase 4: Testing & Polish (2 hours)

1. [ ] Test with real patient documents (Kanta docs)
2. [ ] Fix date parsing edge cases
3. [ ] Mobile responsiveness
4. [ ] Loading states and error handling

**Total Estimated Time: 11-14 hours**

---

## Technical Architecture

### File Structure Changes

```
apps/web/src/
├── app/
│   ├── api/
│   │   └── upload/
│   │       ├── process/route.ts      # Modified: Add caching
│   │       └── auto-stage/route.ts   # NEW: Auto-staging endpoint
│   └── upload/
│       ├── cancer-info/page.tsx      # Modified: Add "Figure it out" button
│       ├── auto-stage/page.tsx       # NEW: Confirmation page
│       └── review/page.tsx           # Modified: Add timeline
│
├── components/
│   ├── TreatmentTimeline.tsx         # NEW: Timeline component
│   ├── TimelineEventCard.tsx         # NEW: Event card
│   ├── AutoStageConfirmation.tsx     # NEW: Confirmation UI
│   └── DateEditor.tsx                # NEW: Manual date entry
│
├── lib/
│   ├── cache/
│   │   ├── document-cache.ts         # NEW: Caching logic
│   │   └── lru-cache.ts              # NEW: LRU implementation
│   ├── timeline/
│   │   ├── date-extractor.ts         # NEW: Date parsing
│   │   └── timeline-builder.ts       # NEW: Timeline construction
│   └── upload/
│       └── auto-stage.ts             # NEW: Auto-staging logic
│
└── types/
    └── user-upload.ts                # Modified: Add timeline types
```

### Dependencies to Add

```json
{
  "dependencies": {
    "date-fns": "^3.x",      // Date formatting (if not already present)
    "lru-cache": "^10.x"     // LRU cache implementation
  },
  "devDependencies": {
    "@types/lru-cache": "^7.x"
  }
}
```

---

## Data Models

### Extended Types

```typescript
// types/user-upload.ts - additions

// Timeline event
export interface TimelineEvent {
  id: string;
  date: Date;
  dateConfidence: number;
  eventType: 'diagnosis' | 'surgery' | 'scan' | 'treatment' | 'lab' | 'consult' | 'other';
  title: string;
  description: string;
  documentId: string;
  documentType: DocumentType;
  color: string;
  icon: string;
  specialty: string;
}

// Treatment timeline
export interface TreatmentTimeline {
  events: TimelineEvent[];
  diagnosisDate?: Date;
  surgeryDate?: Date;
  treatmentStartDate?: Date;
  earliestDate: Date;
  latestDate: Date;
  durationDays: number;
}

// Auto-stage result
export interface AutoStageResult {
  cancerSite: {
    id: string;
    label: string;
    confidence: number;
    evidence: string[];
  };
  staging: {
    clinicalStage: 'I' | 'II' | 'III' | 'IV' | 'unknown';
    tnm?: string;
    confidence: number;
    evidence: string[];
  };
  keyFindings: {
    histology?: string;
    grade?: string;
    biomarkers?: Record<string, string>;
    mutations?: string[];
    metastases?: string[];
  };
  treatmentHistory?: {
    surgeries?: string[];
    chemotherapy?: string[];
    radiation?: string[];
    targetedTherapy?: string[];
  };
  extractedDates: {
    date: string;
    event: string;
    documentSource: string;
    confidence: number;
  }[];
  warnings: string[];
}

// Updated session
export interface UploadSession {
  // ... existing fields ...
  
  // NEW
  autoStageResult?: AutoStageResult;
  timeline?: TreatmentTimeline;
  isAutoStaged: boolean;  // Was cancer site auto-detected?
}
```

---

## UI/UX Specifications

### Mobile Considerations

- Timeline should be vertical on mobile (horizontal on desktop)
- Events should be tappable with sufficient touch target (44px minimum)
- "Figure it out" button should be prominent and accessible
- Date editing should use native date pickers on mobile

### Accessibility

- Timeline events should be keyboard navigable
- Color coding should not be the only differentiator (also use icons)
- Screen reader labels for all interactive elements
- Sufficient color contrast (WCAG AA minimum)

### Animations

- Timeline events should fade in sequentially when first rendered
- Smooth scrolling to clicked event
- Subtle pulse animation on the "Figure it out" button

---

## Open Questions

1. **Cache Persistence**: Should we invest in Redis for persistent caching, or is in-memory sufficient for MVP?

2. **Auto-Stage Accuracy**: What confidence threshold should trigger manual review? (Currently thinking 80%)

3. **Timeline Editing**: Should users be able to edit/delete timeline events, or is it read-only?

4. **Date Conflicts**: What if two documents have conflicting dates for the same event?

5. **Timeline in PDF**: Should the timeline be rendered as SVG in the PDF, or as a simple text list?

6. **Multiple Cancers**: How to handle patients with multiple primary cancers? (e.g., breast + lung)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cache hit rate | >60% | Analytics |
| Auto-stage accuracy | >85% match with user correction | User feedback |
| Timeline completeness | >70% of documents have dates | Automated check |
| User satisfaction | 4+ stars | In-app rating |
| Processing time reduction | >50% for cached docs | Timing logs |

---

## Appendix: Sample Timeline from Kanta Docs

Based on the 11 breast cancer documents in the test folder:

```
Jun 2025                    Jul 2025                    Aug 2025
────┼───────────────────────────┼───────────────────────────┼────

    ●                           ●                           
 Mammogram                   Biopsy                      
 (Initial finding)          (Pathology confirms TNBC)   
    │                           │                         
    └───────────────────────────┴─── ... more events      
```

This timeline would be auto-generated from:
- `mammogram_report.pdf` - Date extracted: Jun 15, 2025
- `biopsy_pathology.pdf` - Date extracted: Jun 28, 2025
- `pet_ct_staging.pdf` - Date extracted: Jul 10, 2025
- `surgery_mastectomy.pdf` - Date extracted: Jul 20, 2025
- etc.

---

## Addendum: V5.1 - Indian Medical Terminology & Discharge Summary Parsing

**Added**: 25 January 2026, 13:30 IST  
**Status**: New Requirements

---

### Problem Statement

1. **Document Classification Not Working Well**: The current classification patterns are based on Western medical terminology, missing common Indian variations.

2. **Indian Medical Terminology Differs**: Indian hospitals use different terms, abbreviations, and document naming conventions:
   - "HPE Report" instead of "Histopathology"
   - "USG" instead of "Ultrasound"
   - "Biopsy HPE" instead of "Pathology Report"
   - "OPD" instead of "Outpatient Notes"
   - "IPD" instead of "Inpatient Notes"

3. **Discharge Summaries Are Goldmines**: Indian discharge summaries often contain comprehensive treatment history including:
   - Past surgeries (mastectomy, SLNB, ALND results)
   - Chemotherapy regimens received
   - Radiation therapy details
   - Pathology summaries
   - Genetic testing results
   - This information should be extracted and distributed to appropriate subspecialty data structures

---

### Feature 4: Enhanced Indian Medical Document Classification

#### Indian Medical Terminology Mapping

```typescript
// Enhanced classification patterns for Indian medical documents
const INDIAN_DOCUMENT_PATTERNS: Record<DocumentType, RegExp[]> = {
  pathology: [
    // Standard terms
    /histopath/i, /biopsy/i, /specimen/i, /microscop/i,
    /carcinoma/i, /adenoma/i, /grade\s*[1-3]/i,
    /immunohistochem/i, /ihc/i, /er\s*positive/i,
    /her2/i, /ki-?67/i, /tumor\s*cells/i, /malignant/i,
    
    // Indian-specific terms
    /hpe\s*report/i,           // HPE Report (Histopathological Examination)
    /histo\s*path/i,           // Histo Path
    /fnac/i,                   // Fine Needle Aspiration Cytology
    /fnab/i,                   // Fine Needle Aspiration Biopsy
    /trucut/i,                 // Trucut biopsy
    /core\s*biopsy/i,
    /slnb/i,                   // Sentinel Lymph Node Biopsy
    /alnd/i,                   // Axillary Lymph Node Dissection
    /frozen\s*section/i,
    /gross\s*examination/i,
    /microscopic\s*examination/i,
    /cytology/i,
    /pap\s*smear/i,
  ],
  
  radiology: [
    // Standard terms
    /ct\s*scan/i, /mri/i, /pet\s*scan/i, /x-?ray/i,
    /ultrasound/i, /impression:/i, /findings:/i,
    /hounsfield/i, /suv/i, /contrast/i,
    
    // Indian-specific terms
    /usg/i,                    // USG (Ultrasonography)
    /sonography/i,
    /mammography/i,
    /mammogram/i,
    /cect/i,                   // Contrast Enhanced CT
    /ncct/i,                   // Non-Contrast CT
    /hrct/i,                   // High Resolution CT
    /mrcp/i,                   // MR Cholangiopancreatography
    /pet-?ct/i,
    /whole\s*body\s*pet/i,
    /bone\s*scan/i,
    /scintigraphy/i,
    /doppler/i,
    /2d\s*echo/i,              // 2D Echocardiography
    /dexa/i,                   // DEXA scan
  ],
  
  genomics: [
    // Standard terms
    /ngs/i, /next\s*gen/i, /sequencing/i, /mutation/i,
    /variant/i, /egfr/i, /kras/i, /braf/i,
    
    // Indian-specific terms
    /brca/i,                   // BRCA testing
    /genetic\s*testing/i,
    /molecular\s*testing/i,
    /oncomine/i,
    /foundation\s*one/i,
    /guardant/i,
    /msi\s*testing/i,
    /mmr\s*testing/i,          // Mismatch Repair
    /pdl1/i,                   // PD-L1
    /her2\s*fish/i,            // HER2 FISH test
    /oncotype/i,               // Oncotype DX
    /mammaprint/i,
  ],
  
  prescription: [
    // Standard terms
    /rx/i, /prescription/i, /dosage/i, /mg\/m2/i,
    /cycles/i, /chemotherapy/i, /regimen/i,
    
    // Indian-specific terms
    /chemo\s*protocol/i,
    /treatment\s*plan/i,
    /day\s*care/i,             // Day care chemotherapy
    /injection/i,
    /infusion/i,
    /cycle\s*\d/i,
    /nact/i,                   // Neo-Adjuvant Chemotherapy
    /act/i,                    // Adjuvant Chemotherapy
    /palliative\s*chemo/i,
    /targeted\s*therapy/i,
    /immunotherapy/i,
    /hormone\s*therapy/i,
  ],
  
  "lab-report": [
    // Standard terms
    /cbc/i, /complete\s*blood/i, /hemoglobin/i,
    /creatinine/i, /bilirubin/i, /sgot/i, /sgpt/i,
    
    // Indian-specific terms
    /lft/i,                    // Liver Function Test
    /kft/i,                    // Kidney Function Test
    /rft/i,                    // Renal Function Test
    /tft/i,                    // Thyroid Function Test
    /lipid\s*profile/i,
    /hba1c/i,
    /tumor\s*marker/i,
    /cea/i,                    // Carcinoembryonic Antigen
    /ca\s*125/i,
    /ca\s*19[\.\-]?9/i,
    /ca\s*15[\.\-]?3/i,
    /afp/i,                    // Alpha-fetoprotein
    /psa/i,                    // Prostate Specific Antigen
    /ldh/i,
    /esr/i,
    /crp/i,
    /pt\s*inr/i,               // Prothrombin Time / INR
    /aptt/i,
  ],
  
  "clinical-notes": [
    // Standard terms
    /consultation/i, /chief\s*complaint/i, /history/i,
    /physical\s*exam/i, /assessment/i, /plan/i,
    
    // Indian-specific terms
    /opd/i,                    // Outpatient Department
    /ipd/i,                    // Inpatient Department
    /follow\s*up/i,
    /f\/u/i,                   // Follow-up abbreviation
    /review/i,
    /opinion/i,
    /referral/i,
    /second\s*opinion/i,
    /case\s*summary/i,
    /mdt/i,                    // Multi-Disciplinary Team
    /tumor\s*board/i,
  ],
  
  "discharge-summary": [
    // Standard terms
    /discharge/i, /admission/i, /hospital\s*stay/i,
    
    // Indian-specific terms
    /disch\s*summary/i,
    /final\s*diagnosis/i,
    /condition\s*at\s*discharge/i,
    /advice\s*on\s*discharge/i,
    /medication\s*on\s*discharge/i,
    /indoor/i,                 // Indoor admission
    /date\s*of\s*admission/i,
    /date\s*of\s*discharge/i,
    /doa/i,                    // Date of Admission
    /dod/i,                    // Date of Discharge
    /brief\s*history/i,
  ],
  
  "surgical-notes": [
    // Standard terms
    /operative/i, /surgery/i, /procedure/i,
    /incision/i, /resection/i, /anastomosis/i,
    
    // Indian-specific terms
    /ot\s*notes/i,             // Operation Theatre notes
    /operation\s*notes/i,
    /post[\-\s]?op/i,          // Post-operative
    /pre[\-\s]?op/i,           // Pre-operative
    /mrm/i,                    // Modified Radical Mastectomy
    /bcs/i,                    // Breast Conserving Surgery
    /wle/i,                    // Wide Local Excision
    /lap\s*surgery/i,          // Laparoscopic surgery
    /robotic/i,
    /surgeon/i,
    /anesthesia/i,
    /anaesthesia/i,            // British spelling common in India
  ],
  
  unknown: [],
};
```

---

### Feature 5: Discharge Summary Parsing for Subspecialty Data

#### Problem

Discharge summaries in Indian hospitals are comprehensive documents that contain summaries of:
- Surgical procedures performed (SLNB results, ALND results, mastectomy type)
- Chemotherapy received (regimen, cycles, dates)
- Radiation therapy details
- Pathology findings
- Genetic testing performed

Currently, we classify the whole document as "discharge-summary" but don't extract these subspecialty sections.

#### Solution: Intelligent Discharge Summary Sectioning

When a document is classified as `discharge-summary`, run a secondary extraction pass to identify and extract subspecialty sections.

```typescript
// Data structure for comprehensive patient cancer journey
interface PatientCancerJourney {
  // Patient identification (anonymized)
  patientId: string;
  cancerType: string;
  diagnosisDate?: string;
  
  // Subspecialty data extracted from all documents including discharge summaries
  pathology: PathologyData;
  radiology: RadiologyData;
  surgery: SurgeryData;
  chemotherapy: ChemotherapyData;
  radiation: RadiationData;
  geneticTesting: GeneticTestingData;
  labResults: LabResultsData;
  
  // Source tracking
  dataSourceDocuments: string[];  // Which documents contributed to each section
}

interface PathologyData {
  histology?: string;
  grade?: string;
  tnmStaging?: {
    t: string;
    n: string;
    m: string;
    stage: string;
  };
  margins?: string;
  
  // Breast-specific IHC
  erStatus?: string;
  prStatus?: string;
  her2Status?: string;
  ki67?: string;
  
  // Lymph node results (often in discharge summary)
  slnbResult?: {
    totalNodesExamined: number;
    positiveNodes: number;
    description: string;
  };
  alndResult?: {
    totalNodesExamined: number;
    positiveNodes: number;
    description: string;
  };
  
  // Sources
  sourceDocuments: string[];
  extractedFrom: ('pathology_report' | 'discharge_summary' | 'surgical_notes')[];
}

interface SurgeryData {
  procedures: {
    name: string;
    date?: string;
    surgeon?: string;
    hospital?: string;
    findings?: string;
    complications?: string;
  }[];
  
  // Common Indian surgery terms
  mrm?: boolean;               // Modified Radical Mastectomy
  bcs?: boolean;               // Breast Conserving Surgery
  wle?: boolean;               // Wide Local Excision
  slnb?: boolean;              // Sentinel Lymph Node Biopsy
  alnd?: boolean;              // Axillary Lymph Node Dissection
  reconstruction?: string;
  
  sourceDocuments: string[];
}

interface ChemotherapyData {
  regimens: {
    name: string;              // e.g., "AC-T", "FOLFOX", "Paclitaxel"
    type: 'neoadjuvant' | 'adjuvant' | 'palliative' | 'unknown';
    startDate?: string;
    endDate?: string;
    cyclesPlanned?: number;
    cyclesCompleted?: number;
    drugs?: string[];
    doseModifications?: string;
    toxicities?: string[];
  }[];
  
  // Common Indian abbreviations
  nact?: boolean;              // Neo-Adjuvant Chemotherapy
  act?: boolean;               // Adjuvant Chemotherapy
  
  sourceDocuments: string[];
}

interface RadiationData {
  treatments: {
    site: string;
    technique?: string;        // IMRT, 3DCRT, etc.
    totalDose?: string;        // e.g., "50 Gy"
    fractions?: number;
    startDate?: string;
    endDate?: string;
    hospital?: string;
  }[];
  
  boostGiven?: boolean;
  
  sourceDocuments: string[];
}

interface GeneticTestingData {
  tests: {
    testName: string;          // BRCA, Oncotype DX, etc.
    result: string;
    interpretation?: string;
    actionable?: boolean;
    date?: string;
    lab?: string;
  }[];
  
  brca1?: string;
  brca2?: string;
  msiStatus?: string;
  mmrStatus?: string;
  
  sourceDocuments: string[];
}

interface RadiologyData {
  scans: {
    modality: string;          // CT, MRI, PET-CT, USG, Mammogram
    site: string;
    date?: string;
    findings: string[];
    impression?: string;
    measurements?: { location: string; size: string }[];
  }[];
  
  sourceDocuments: string[];
}

interface LabResultsData {
  tumorMarkers: {
    marker: string;
    value: string;
    unit: string;
    date?: string;
    trend?: 'increasing' | 'decreasing' | 'stable';
  }[];
  
  bloodCounts: {
    date: string;
    wbc?: string;
    hb?: string;
    platelets?: string;
    anc?: string;
  }[];
  
  organFunction: {
    date: string;
    creatinine?: string;
    bilirubin?: string;
    sgot?: string;
    sgpt?: string;
  }[];
  
  sourceDocuments: string[];
}
```

#### Gemini Prompt for Discharge Summary Sectioning

```
You are analyzing an Indian hospital discharge summary to extract subspecialty information.

This discharge summary may contain sections about:
1. SURGERY - Look for: "Operative procedure", "Surgery performed", "Post-op", "SLNB", "ALND", "MRM", "BCS"
2. PATHOLOGY - Look for: "HPE Report", "Histopathology", "Biopsy", "ER/PR/HER2", "Ki-67", "Grade"
3. CHEMOTHERAPY - Look for: "Chemotherapy", "NACT", "ACT", "Cycles", "Regimen", "Day care"
4. RADIATION - Look for: "Radiotherapy", "RT", "External beam", "Gy", "Fractions"
5. GENETIC TESTING - Look for: "BRCA", "Genetic testing", "Molecular", "NGS"
6. LAB RESULTS - Look for: "Investigations", "CBC", "LFT", "KFT", "Tumor markers"

IMPORTANT INDIAN TERMINOLOGY:
- MRM = Modified Radical Mastectomy
- BCS = Breast Conserving Surgery  
- WLE = Wide Local Excision
- SLNB = Sentinel Lymph Node Biopsy (note the number of nodes examined and positive)
- ALND = Axillary Lymph Node Dissection
- NACT = Neo-Adjuvant Chemotherapy (given before surgery)
- ACT = Adjuvant Chemotherapy (given after surgery)
- HPE = Histopathological Examination
- OT = Operation Theatre
- DOA = Date of Admission
- DOD = Date of Discharge

For each section found, extract:
- Key findings
- Dates (in YYYY-MM-DD format)
- Numerical values with units
- Status/results

DISCHARGE SUMMARY TEXT:
{document_text}

Respond with JSON matching this structure:
{
  "hasSurgerySection": true/false,
  "surgery": { ... extracted surgery data ... },
  
  "hasPathologySection": true/false,
  "pathology": { ... extracted pathology data ... },
  
  "hasChemotherapySection": true/false,
  "chemotherapy": { ... extracted chemo data ... },
  
  "hasRadiationSection": true/false,
  "radiation": { ... extracted RT data ... },
  
  "hasGeneticTestingSection": true/false,
  "geneticTesting": { ... extracted genetic data ... },
  
  "hasLabSection": true/false,
  "labResults": { ... extracted lab data ... },
  
  "keyDates": [
    { "date": "YYYY-MM-DD", "event": "Surgery", "details": "MRM performed" },
    ...
  ]
}
```

---

### Implementation Plan for V5.1

#### Phase 5: Enhanced Indian Classification (2 hours)

1. [x] Update `DOCUMENT_PATTERNS` in `/api/upload/process/route.ts` with Indian terms
2. [ ] Add secondary classification pass for ambiguous documents
3. [ ] Add confidence boosting for multiple matching patterns
4. [ ] Test with Kanta docs folder

#### Phase 6: Discharge Summary Parsing (3 hours)

1. [ ] Create `PatientCancerJourney` data structure
2. [ ] Add discharge summary sectioning logic
3. [ ] Create new Gemini prompt for section extraction
4. [ ] Merge extracted data into subspecialty structures
5. [ ] Update timeline with events from discharge summary sections

#### Phase 7: Journey Data Aggregation (2 hours)

1. [ ] Create aggregation logic to merge data from multiple documents
2. [ ] Handle conflicting information (use most recent, highest confidence)
3. [ ] Display aggregated journey on Review page
4. [ ] Include journey data in tumor board deliberation context

---

### Updated File Structure

```
apps/web/src/
├── lib/
│   ├── classification/
│   │   ├── indian-patterns.ts           # NEW: Indian terminology patterns
│   │   └── discharge-parser.ts          # NEW: Discharge summary sectioning
│   ├── journey/
│   │   ├── patient-journey.ts           # NEW: Journey data structure
│   │   └── data-aggregator.ts           # NEW: Merge data from multiple docs
│   └── ...
└── types/
    └── patient-journey.ts               # NEW: Journey type definitions
```

---

### Testing with Kanta Docs

The 11 breast cancer documents should test:

| Document | Expected Classification | Expected Extractions |
|----------|------------------------|---------------------|
| Mammogram report | `radiology` | Initial finding date, lesion size |
| Biopsy HPE | `pathology` | Histology, grade, ER/PR/HER2/Ki67 |
| PET-CT | `radiology` | Staging, metastases |
| Discharge summary | `discharge-summary` | Surgery (MRM/SLNB/ALND), chemo history |
| IHC Report | `pathology` | Biomarker values |
| Lab reports | `lab-report` | CBC, LFT, tumor markers |

---

### Success Metrics for V5.1

| Metric | Target | Current |
|--------|--------|---------|
| Classification accuracy (Indian docs) | >90% | ~70% |
| Discharge summary section extraction | >80% recall | N/A |
| SLNB/ALND result extraction | >90% accuracy | N/A |
| Chemo regimen detection | >85% | N/A |

---

*End of V5.1 Addendum*
