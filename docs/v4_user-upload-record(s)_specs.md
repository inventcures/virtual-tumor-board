# V4 Feature Specs: User Upload Cancer Records for Tumor Board Review

## Executive Summary

Enable patients, oncologists, and non-oncology doctors to upload real cancer medical records (pathology reports, radiology scans, genomic reports, prescriptions, etc.) and receive AI-powered Virtual Tumor Board opinions. The system intelligently warns users when the clinical picture is incomplete.

---

## 1. Problem Statement

### Current State
- Virtual Tumor Board only works with 10 pre-defined demo cases
- No ability for users to upload their own medical records
- Real oncologists and patients cannot get personalized tumor board consultations

### Target Users
1. **Patients/Caregivers**: Upload their cancer records to understand treatment options
2. **Oncologists**: Get second opinions on complex cases from AI tumor board
3. **Non-Oncology Doctors**: Referring physicians who need oncology guidance

### User Pain Points
- Cancer patients often wait weeks for multi-disciplinary tumor board meetings
- Rural/tier-2 cities lack access to comprehensive tumor boards
- Single-specialist consultations miss multi-disciplinary perspectives

---

## 2. Feature Goals & North Star Metrics

### Primary Goals
1. **Democratize Access**: Any user can get tumor board-quality opinions
2. **Clinical Completeness Awareness**: System clearly communicates data gaps
3. **Actionable Insights**: Generate recommendations users can discuss with their doctors

### Success Metrics
| Metric | Target |
|--------|--------|
| Upload completion rate | >70% |
| Time to first agent opinion | <30 seconds |
| User returns with additional docs | >40% |
| NPS from oncologist users | >50 |

---

## 3. User Flow & UX Specifications

### 3.1 Entry Points

```
[Homepage] 
    |
    +-- [Demo Cases] --> Existing 10 pre-built cases
    |
    +-- [Upload Your Records] --> NEW: User upload flow
```

### 3.2 Upload Flow (5 Steps)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: User Type Selection                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Who are you?                                                      │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │   Patient/   │  │  Oncologist  │  │ Non-Oncology │             │
│   │  Caregiver   │  │              │  │    Doctor    │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│   (Affects language complexity and recommendations framing)         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Cancer Information                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Cancer Site: [Dropdown with common sites + "Other"]               │
│   ┌─────────────────────────────────────────────────────┐           │
│   │ ▼ Select Cancer Site                                │           │
│   ├─────────────────────────────────────────────────────┤           │
│   │   Lung                                              │           │
│   │   Breast                                            │           │
│   │   Colorectal                                        │           │
│   │   Head & Neck (Oral Cavity)                         │           │
│   │   Cervix                                            │           │
│   │   Prostate                                          │           │
│   │   Gastric/Stomach                                   │           │
│   │   Ovarian                                           │           │
│   │   Esophageal                                        │           │
│   │   Brain/CNS                                         │           │
│   │   Pancreatic                                        │           │
│   │   Liver/Hepatocellular                              │           │
│   │   Kidney/Renal                                      │           │
│   │   Bladder                                           │           │
│   │   Thyroid                                           │           │
│   │   Leukemia                                          │           │
│   │   Lymphoma                                          │           │
│   │   Multiple Myeloma                                  │           │
│   │   Melanoma                                          │           │
│   │   Sarcoma                                           │           │
│   │   Other (specify)                                   │           │
│   └─────────────────────────────────────────────────────┘           │
│                                                                     │
│   Staging Information (Optional but Recommended):                   │
│   ┌─────────────────────────────────────────────────────┐           │
│   │ Stage: [I] [II] [III] [IV] [Unknown]                │           │
│   │                                                     │           │
│   │ OR describe staging in your own words:              │           │
│   │ ┌─────────────────────────────────────────────────┐ │           │
│   │ │ e.g., "T2N1M0" or "locally advanced" or         │ │           │
│   │ │ "metastatic to liver"                           │ │           │
│   │ └─────────────────────────────────────────────────┘ │           │
│   └─────────────────────────────────────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Document Upload                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │     📁 Drag & drop files here                               │   │
│   │        or click to browse                                   │   │
│   │                                                             │   │
│   │     Supported: PDF, JPG, PNG (max 10MB each, 25 files)      │   │
│   │                                                             │   │
│   │     📸 Take Photo (mobile)                                  │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Uploaded Documents:                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ ✅ pathology_report.pdf     [Pathology] [Auto-detected]     │   │
│   │ ✅ ct_scan_chest.pdf        [Radiology] [Auto-detected]     │   │
│   │ ⏳ pet_scan.jpg             [Processing...]                 │   │
│   │ ❌ blurry_image.jpg         [Unreadable - retake photo]     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Document Type Override (if auto-detection wrong):                 │
│   [Pathology] [Radiology] [Genomics] [Prescription] [Discharge]    │
│   [Lab Report] [Clinical Notes] [Other]                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Clinical Completeness Warning                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ⚠️  IMPORTANT: Incomplete Clinical Picture                        │
│                                                                     │
│   You've uploaded 2 documents. For a comprehensive tumor board      │
│   review, we typically need:                                        │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Document Type           │ Status      │ Impact              │   │
│   ├─────────────────────────┼─────────────┼─────────────────────│   │
│   │ ✅ Pathology Report     │ Uploaded    │ Essential           │   │
│   │ ✅ Radiology (CT/PET)   │ Uploaded    │ Essential           │   │
│   │ ❌ Genomic/Molecular    │ Missing     │ May affect targeted │   │
│   │                         │             │ therapy options     │   │
│   │ ❌ Prior Treatment Hx   │ Missing     │ Affects sequencing  │   │
│   │ ❌ Lab Reports (CBC,    │ Missing     │ Affects chemo       │   │
│   │    LFT, KFT)           │             │ eligibility         │   │
│   │ ⚪ Surgical Notes       │ Optional    │ If surgery done     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   The Tumor Board agents will provide opinions based on available   │
│   data, but recommendations may be LIMITED or CONDITIONAL.          │
│                                                                     │
│   [Upload More Documents]  [Proceed Anyway →]                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Tumor Board Deliberation                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Existing Tumor Board UI with streaming agent responses]          │
│                                                                     │
│   Key Modifications:                                                │
│   - Yellow banner: "Based on X uploaded documents (incomplete)"     │
│   - Each agent prefaces opinion with data limitations              │
│   - "Request More Information" suggestions in consensus             │
│   - Download summary as PDF                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Mobile-First Design Considerations

- Large tap targets (min 48px)
- Camera capture prominent on mobile
- Progressive disclosure (don't overwhelm)
- Offline-capable document queue
- Hindi/regional language support (Phase 2)

---

## 4. Technical Architecture

### 4.1 Component Hierarchy

```
src/
├── app/
│   ├── upload/                          # NEW: Upload flow pages
│   │   ├── page.tsx                     # Entry point (Step 1)
│   │   ├── cancer-info/page.tsx         # Step 2: Cancer site/staging
│   │   ├── documents/page.tsx           # Step 3: File upload
│   │   └── review/page.tsx              # Step 4: Completeness check
│   │
│   └── api/
│       ├── upload/                      # NEW: Upload API routes
│       │   ├── process/route.ts         # Document processing
│       │   ├── classify/route.ts        # Document classification
│       │   └── extract/route.ts         # Data extraction
│       │
│       └── deliberate/                  # MODIFIED: Accept user cases
│           ├── stream/route.ts          # Add user case support
│           └── user-case/route.ts       # NEW: User case handler
│
├── components/
│   ├── upload/                          # NEW: Upload components
│   │   ├── UserTypeSelector.tsx
│   │   ├── CancerSiteSelector.tsx
│   │   ├── StagingInput.tsx
│   │   ├── MultiDocumentUpload.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── CompletenessWarning.tsx
│   │   └── UploadProgress.tsx
│   │
│   └── tumor-board/                     # MODIFIED
│       ├── UserCaseBanner.tsx           # NEW: Data limitation banner
│       └── AgentOpinion.tsx             # Add caveat support
│
├── lib/
│   ├── upload/                          # NEW: Upload utilities
│   │   ├── constants.ts                 # Limits, MIME types
│   │   ├── file-validation.ts           # Magic byte validation
│   │   ├── document-classifier.ts       # ML-based classification
│   │   ├── data-extractor.ts            # Extract clinical data
│   │   └── completeness-checker.ts      # Check data gaps
│   │
│   └── cases/                           # MODIFIED
│       ├── user-case-builder.ts         # NEW: Build case from uploads
│       └── sample-cases.ts              # Existing demo cases
│
└── types/
    └── user-upload.ts                   # NEW: Upload types
```

### 4.2 Database Schema (Future: Supabase/PostgreSQL)

For MVP, use browser localStorage + sessionStorage. Future schema:

```sql
-- User upload sessions
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL, -- 'patient', 'oncologist', 'doctor'
    cancer_site VARCHAR(100),
    stage VARCHAR(50),
    stage_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Auto-delete after 24h for privacy
    ip_hash VARCHAR(64) -- Anonymized for rate limiting
);

-- Uploaded documents (metadata only, files in R2)
CREATE TABLE uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER,
    storage_key VARCHAR(500), -- R2 object key (encrypted)
    document_type VARCHAR(50), -- 'pathology', 'radiology', etc.
    auto_detected BOOLEAN DEFAULT true,
    processing_status VARCHAR(50), -- 'pending', 'processing', 'done', 'error'
    extracted_data JSONB, -- Structured extraction results
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tumor board deliberations for user cases
CREATE TABLE user_deliberations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
    agent_opinions JSONB, -- {agent_id: opinion_text, ...}
    consensus_summary TEXT,
    data_gaps JSONB, -- Missing information identified
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 API Specifications

#### POST /api/upload/process

Process uploaded document, classify type, extract clinical data.

```typescript
// Request
interface ProcessDocumentRequest {
  fileBase64: string;           // Base64 encoded file
  mimeType: string;             // 'application/pdf' | 'image/jpeg' | 'image/png'
  filename: string;
  sessionId: string;
  documentTypeOverride?: DocumentType; // Optional manual override
}

// Response
interface ProcessDocumentResponse {
  documentId: string;
  classifiedType: DocumentType;
  confidence: number;           // 0-1 classification confidence
  extractedData: ExtractedClinicalData;
  warnings: string[];           // OCR quality issues, etc.
}

type DocumentType = 
  | 'pathology'
  | 'radiology' 
  | 'genomics'
  | 'prescription'
  | 'lab-report'
  | 'clinical-notes'
  | 'discharge-summary'
  | 'surgical-notes'
  | 'unknown';

interface ExtractedClinicalData {
  // Pathology
  histology?: string;
  grade?: string;
  margins?: string;
  ihcMarkers?: Record<string, string>; // ER, PR, HER2, etc.
  
  // Radiology
  findings?: string[];
  measurements?: { site: string; size: string }[];
  impression?: string;
  
  // Genomics
  mutations?: { gene: string; variant: string; actionable: boolean }[];
  msi_status?: string;
  tmb?: number;
  
  // Labs
  labValues?: { test: string; value: string; unit: string; flag?: 'high' | 'low' }[];
  
  // Common
  date?: string;
  institution?: string;
  rawText?: string;             // Full OCR text for context
}
```

#### POST /api/upload/completeness-check

Analyze uploaded documents and identify gaps.

```typescript
// Request
interface CompletenessCheckRequest {
  sessionId: string;
  cancerSite: string;
  stage?: string;
  documentIds: string[];
}

// Response
interface CompletenessCheckResponse {
  completenessScore: number;    // 0-100
  uploadedTypes: DocumentType[];
  missingCritical: MissingDocument[];
  missingRecommended: MissingDocument[];
  agentLimitations: AgentLimitation[];
}

interface MissingDocument {
  type: DocumentType;
  importance: 'critical' | 'recommended' | 'optional';
  impact: string;               // User-friendly explanation
  example: string;              // "e.g., CT Chest with contrast"
}

interface AgentLimitation {
  agentId: string;              // 'medical-oncologist', etc.
  limitation: string;           // What this agent can't assess
  canStillOpine: boolean;
}
```

#### POST /api/deliberate/user-case

Start tumor board deliberation for user-uploaded case.

```typescript
// Request
interface UserCaseDeliberationRequest {
  sessionId: string;
  userType: 'patient' | 'oncologist' | 'doctor';
  cancerSite: string;
  stage?: string;
  stageDescription?: string;
  documentIds: string[];
  extractedData: ExtractedClinicalData[];
  missingDocuments: MissingDocument[];
}

// Response: Server-Sent Events stream (same format as existing)
// Each agent opinion includes:
// - dataCaveats: string[] (what they couldn't assess)
// - confidenceLevel: 'high' | 'moderate' | 'low'
// - needsMoreInfo: string[] (specific questions)
```

### 4.4 Document Classification Logic

```typescript
// Heuristic-based classification (fast, runs first)
const DOCUMENT_PATTERNS: Record<DocumentType, RegExp[]> = {
  'pathology': [
    /histopath/i, /biopsy/i, /specimen/i, /microscop/i,
    /carcinoma/i, /adenoma/i, /grade\s*[1-3]/i,
    /immunohistochem/i, /ihc/i, /er\s*positive/i
  ],
  'radiology': [
    /ct\s*scan/i, /mri/i, /pet\s*scan/i, /x-ray/i,
    /ultrasound/i, /impression:/i, /findings:/i,
    /hounsfield/i, /suv/i, /contrast/i
  ],
  'genomics': [
    /ngs/i, /next\s*gen/i, /sequencing/i, /mutation/i,
    /variant/i, /egfr/i, /kras/i, /braf/i, /foundation/i,
    /guardant/i, /msi-h/i, /tmb/i
  ],
  'prescription': [
    /rx/i, /prescription/i, /dosage/i, /mg\/m2/i,
    /cycles/i, /chemotherapy/i, /regimen/i
  ],
  'lab-report': [
    /cbc/i, /complete\s*blood/i, /hemoglobin/i,
    /creatinine/i, /bilirubin/i, /sgot/i, /sgpt/i,
    /reference\s*range/i
  ],
  // ... more patterns
};

// LLM-based classification (for ambiguous cases)
async function classifyWithLLM(text: string): Promise<{
  type: DocumentType;
  confidence: number;
}> {
  const prompt = `Classify this medical document into one category:
    - pathology (biopsy, histopathology reports)
    - radiology (CT, MRI, PET, X-ray reports)
    - genomics (NGS, mutation testing, molecular reports)
    - prescription (treatment plans, drug orders)
    - lab-report (blood tests, biochemistry)
    - clinical-notes (consultation notes, follow-up)
    - discharge-summary
    - surgical-notes
    - unknown
    
    Document text:
    ${text.slice(0, 3000)}
    
    Respond with JSON: {"type": "...", "confidence": 0.0-1.0}`;
  
  // Use Gemini Flash for speed
  return await callGemini(prompt);
}
```

### 4.5 Completeness Logic by Cancer Site

```typescript
const REQUIRED_DOCUMENTS: Record<string, {
  critical: DocumentType[];
  recommended: DocumentType[];
  optional: DocumentType[];
}> = {
  'lung': {
    critical: ['pathology', 'radiology'],
    recommended: ['genomics', 'lab-report'], // EGFR, ALK, ROS1, PD-L1
    optional: ['clinical-notes', 'prescription']
  },
  'breast': {
    critical: ['pathology'], // Must have ER/PR/HER2
    recommended: ['radiology', 'genomics'], // Oncotype DX
    optional: ['surgical-notes']
  },
  'colorectal': {
    critical: ['pathology', 'radiology'],
    recommended: ['genomics'], // MSI, KRAS, BRAF
    optional: ['lab-report']
  },
  // ... all 20+ cancer sites
};

function getRequiredDocuments(cancerSite: string): RequiredDocs {
  return REQUIRED_DOCUMENTS[cancerSite] || {
    critical: ['pathology'],
    recommended: ['radiology'],
    optional: []
  };
}
```

---

## 5. Agent Prompt Modifications

### 5.1 System Prompt Additions for User Cases

```typescript
const USER_CASE_SYSTEM_PROMPT_ADDITION = `
## IMPORTANT: User-Uploaded Case with Limited Data

This is a user-uploaded case, NOT a complete medical record. 

### Available Documents:
{{#each uploadedDocuments}}
- {{this.type}}: {{this.summary}}
{{/each}}

### Missing Information:
{{#each missingDocuments}}
- {{this.type}}: {{this.impact}}
{{/each}}

### Your Response MUST:
1. Start with a DATA LIMITATIONS caveat if relevant to your specialty
2. Clearly state what you CAN and CANNOT assess
3. Use conditional language ("If staging is confirmed as...", "Assuming no prior treatment...")
4. End with specific questions/tests you would need to give a definitive opinion

### Example Caveat:
"⚠️ **Data Limitation**: I don't have access to genomic testing results. My targeted therapy recommendations are conditional on EGFR/ALK/ROS1 status, which should be tested if not already done."

### Confidence Levels:
- HIGH: All critical data available, can give definitive recommendation
- MODERATE: Some gaps but can give directional guidance
- LOW: Major gaps, can only give general principles
`;
```

### 5.2 Consensus Prompt Modifications

```typescript
const USER_CASE_CONSENSUS_PROMPT_ADDITION = `
## Consensus for User-Uploaded Case

Given the data limitations, your consensus should:

1. **Highlight Agreement**: Where all agents agree despite limited data
2. **Flag Uncertainties**: Where opinions diverge due to missing info
3. **Prioritize Next Steps**: What additional tests/documents would resolve uncertainties
4. **Patient-Actionable Summary**: Clear next steps the patient can discuss with their doctor

### Required Sections:
1. "What We Can Recommend Now" (high-confidence items)
2. "Pending More Information" (conditional recommendations)
3. "Recommended Next Steps" (tests, consultations, documents to obtain)
4. "Questions for Your Doctor" (specific discussion points)
`;
```

---

## 6. Security & Privacy Considerations

### 6.1 Data Handling

| Concern | Mitigation |
|---------|------------|
| PHI in uploads | PII redaction before LLM processing; no storage of raw PHI |
| File storage | Encrypt at rest (R2); auto-delete after 24h |
| Session tracking | Use anonymous session IDs, no user accounts required |
| Rate limiting | IP-based limits (10 uploads/hour, 50 documents/day) |
| MIME validation | Magic byte validation, not just extension |

### 6.2 PII Redaction Pipeline

```typescript
// Before sending to LLM
function redactPII(text: string): string {
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PATIENT_NAME]')  // Names
    .replace(/\b\d{10,12}\b/g, '[PHONE]')                       // Phone
    .replace(/\b[A-Z]{2}\d{6,8}\b/g, '[MRN]')                   // MRN
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '[DATE]')          // Dates
    .replace(/\b\d{12}\b/g, '[AADHAAR]')                        // Aadhaar
    // ... more patterns
}
```

### 6.3 Disclaimer & Consent

```
⚠️ IMPORTANT DISCLAIMER

This AI-powered Virtual Tumor Board is for EDUCATIONAL and INFORMATIONAL 
purposes only. It is NOT a substitute for professional medical advice, 
diagnosis, or treatment.

By uploading documents, you confirm:
✓ You have the right to share these medical records
✓ You understand this is AI-generated, not human physician advice
✓ You will discuss any recommendations with your treating physician
✓ Your documents will be processed by AI and auto-deleted within 24 hours

[I Understand and Agree] [Cancel]
```

---

## 7. UI Component Specifications

### 7.1 CancerSiteSelector Component

```typescript
interface CancerSiteSelectorProps {
  value: string;
  onChange: (site: string) => void;
  showCommonFirst?: boolean;    // Show India-prevalent cancers first
}

const CANCER_SITES = [
  // Common in India (show first)
  { id: 'oral-cavity', label: 'Oral Cavity / Mouth', prevalence: 'high-india' },
  { id: 'breast', label: 'Breast', prevalence: 'high' },
  { id: 'cervix', label: 'Cervix', prevalence: 'high-india' },
  { id: 'lung', label: 'Lung', prevalence: 'high' },
  { id: 'colorectal', label: 'Colorectal / Colon', prevalence: 'high' },
  { id: 'stomach', label: 'Stomach / Gastric', prevalence: 'high-india' },
  { id: 'esophagus', label: 'Esophagus / Food Pipe', prevalence: 'high-india' },
  // ... rest alphabetically
  { id: 'other', label: 'Other (specify)', prevalence: 'low' },
];
```

### 7.2 StagingInput Component

```typescript
interface StagingInputProps {
  stage: string;
  stageDescription: string;
  onChange: (stage: string, description: string) => void;
  cancerSite: string;           // To show site-specific staging help
}

// Render logic:
// 1. Quick stage buttons: [I] [II] [III] [IV] [Unknown]
// 2. OR free-text input with examples
// 3. Helper tooltip with staging explanation for selected cancer
```

### 7.3 CompletenessWarning Component

```typescript
interface CompletenessWarningProps {
  completenessScore: number;
  uploaded: { type: DocumentType; count: number }[];
  missing: MissingDocument[];
  onUploadMore: () => void;
  onProceed: () => void;
}

// Visual design:
// - Red/yellow/green progress bar based on score
// - Table of uploaded vs missing documents
// - Clear impact statements for each missing item
// - Prominent "Upload More" CTA, secondary "Proceed Anyway"
```

---

## 8. Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Upload flow UI (5 steps)
- [ ] Basic document classification (heuristic + simple LLM)
- [ ] Completeness checking
- [ ] Modified agent prompts for user cases
- [ ] Session storage (localStorage)
- [ ] Basic PII redaction

### Phase 2: Enhanced Extraction (Week 3)
- [ ] Deep extraction for pathology reports
- [ ] Structured radiology findings extraction
- [ ] Genomics mutation parsing
- [ ] Lab value normalization

### Phase 3: Persistence & Polish (Week 4)
- [ ] R2 storage for documents
- [ ] Supabase for session persistence
- [ ] PDF export of tumor board summary
- [ ] Mobile camera optimization
- [ ] Hindi language support

### Phase 4: Advanced Features (Future)
- [ ] Document comparison (baseline vs follow-up)
- [ ] Treatment timeline visualization
- [ ] Integration with DICOM viewer
- [ ] Multi-case comparison for oncologists

---

## 9. Testing Strategy

### 9.1 Test Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Upload 1 pathology report | Warning: 70% completeness, proceed available |
| Upload pathology + CT | Warning: 85% completeness for solid tumors |
| Upload blurry image | Error: "Image quality too low, please retake" |
| Upload non-medical doc | Error: "This doesn't appear to be a medical document" |
| Upload 30 files | Error: "Maximum 25 files per session" |
| Malicious PDF | Blocked by file signature validation |

### 9.2 Document Classification Accuracy Targets

| Document Type | Precision Target | Recall Target |
|---------------|------------------|---------------|
| Pathology | >95% | >90% |
| Radiology | >90% | >85% |
| Genomics | >85% | >80% |
| Lab Report | >90% | >85% |
| Unknown | N/A | <15% false negatives |

---

## 10. Metrics & Analytics

### Track These Events

```typescript
// Upload funnel
track('upload_started', { userType });
track('cancer_site_selected', { site, hasStaging });
track('document_uploaded', { type, autoDetected, fileSize });
track('completeness_warning_shown', { score, missingCount });
track('upload_completed', { documentCount, completenessScore });
track('deliberation_started', { userType, documentCount });
track('deliberation_completed', { agentCount, hasConsensus });

// Errors
track('upload_error', { errorType, mimeType });
track('classification_override', { autoType, manualType });
track('extraction_failed', { documentType, reason });
```

---

## 11. Error Handling

### User-Facing Error Messages

| Error Code | User Message |
|------------|--------------|
| `FILE_TOO_LARGE` | "This file is larger than 10MB. Please compress or split it." |
| `UNSUPPORTED_FORMAT` | "We support PDF, JPG, and PNG files. Please convert your document." |
| `OCR_FAILED` | "We couldn't read this document. Please ensure it's not handwritten and is clearly visible." |
| `NOT_MEDICAL` | "This doesn't appear to be a medical document. Please upload cancer-related records." |
| `SESSION_EXPIRED` | "Your upload session has expired. Please start again." |
| `RATE_LIMITED` | "Too many uploads. Please wait 10 minutes and try again." |

---

## 12. Accessibility (a11y)

- ARIA labels on all interactive elements
- Keyboard navigation for upload flow
- Screen reader announcements for upload progress
- High contrast mode support
- Focus management between steps

---

## 13. Dependencies

### New NPM Packages

```json
{
  "react-dropzone": "^14.2.3",      // Drag-drop uploads
  "browser-image-compression": "^2.0.2",  // Client-side compression
  "pdf-parse": "^1.1.1",            // PDF text extraction (server)
  "tesseract.js": "^5.0.4",         // Client-side OCR fallback
  "zod": "^3.22.4"                  // Request validation (already have)
}
```

### AI Services

- **Gemini 2.5 Flash**: Document classification, extraction (fast, cheap)
- **Gemini 2.5 Pro**: Agent deliberation (existing)
- **Claude 3.5 Sonnet**: Fallback for complex extractions

---

## 14. Open Questions

1. **Should we require email for session recovery?** 
   - Pro: Users can return to session
   - Con: Privacy concern, friction

2. **Should oncologists get different/more detailed outputs?**
   - Pro: Professional-grade recommendations
   - Con: Complexity, potential misuse

3. **How to handle pediatric cancers?**
   - Different staging systems, different agent expertise needed

4. **Multi-language OCR?**
   - Many Indian reports mix Hindi/regional languages with English

---

## 15. References

### Similar Implementations
- `/Users/tp53/Downloads/code_macbook-air-m1__tp53/radonc_ka_cg/src/components/MultiFileUpload.tsx`
- `/Users/tp53/Downloads/code_macbook-air-m1__tp53/radonc_ka_cg/src/lib/document-classifier.ts`
- `/Users/tp53/Downloads/code_macbook-air-m1__tp53/radonc_ka_cg/src/lib/llm.ts`

### Medical Standards
- AJCC Cancer Staging Manual (8th Edition)
- CAP Cancer Protocols for pathology reporting
- NCCN Guidelines for treatment recommendations

---

*Document Version: 1.0*
*Created: January 25, 2026*
*Author: AI Assistant with human guidance*
*Status: DRAFT - Ready for Review*
