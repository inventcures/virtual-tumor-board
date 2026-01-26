# V17 Specification: SSO & ACS Surgical Oncology Guidelines RAG Integration

**Date:** 2026-01-27  
**Status:** Planning  
**Priority:** High  
**Author:** AI-assisted (Claude)

---

## 1. Executive Summary

The Surgical Oncologist agent (Dr. Shalya) currently uses NCCN as its primary guideline source, but lacks integration with the actual surgical oncology society guidelines:
- **SSO** (Society of Surgical Oncology) - Clinical Recommendations
- **ACS/CoC** (American College of Surgeons / Commission on Cancer) - Operative Standards

This spec outlines the plan to:
1. Download/scrape SSO and ACS surgical oncology guidelines
2. Create Gemini File Search indexes for managed RAG
3. Update the RAG connector and agent configuration
4. Add surgical-specific mock content for fallback

---

## 2. Current State Analysis

### 2.1 Existing RAG Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Virtual Tumor Board                          │
├─────────────────────────────────────────────────────────────────┤
│  Specialist Agents → Tool Executor → RAG Connector → Gemini API │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Cloud Platform (External)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  NCCN   │ │  ASTRO  │ │   ACR   │ │   CAP   │ │ ClinVar │   │
│  │(67 docs)│ │(20 docs)│ │(42 docs)│ │(103docs)│ │ (5 docs)│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
│  Project ID: gen-lang-client-0198594002                        │
└─────────────────────────────────────────────────────────────────┘
```

**Current File Search Store IDs:**
| Source | Store ID | Doc Count |
|--------|----------|-----------|
| NCCN | `nccnguidelinesrag-4ffdfolxso0s` | 67 |
| ESMO | `esmoguidelinesen-4tjmgeq3y1h8` | 19 |
| ASTRO | `astroguidelinesrag-xanee0h0rgpp` | 20 |
| ACR | `acrradiologyguidelinesrag-qt98zl8un2ht` | 42 |
| CAP | `capcancerprotocolsrag-55nmm2prh0xs` | 103 |
| ClinVar/CIViC | `clinvarcivicgenomicsrag-uat87mzcqtum` | 5 |

### 2.2 Current Surgical Oncologist Agent Configuration

**File:** `packages/agents/src/specialists/surgical-oncologist.ts`

```typescript
export const SURGICAL_ONCOLOGIST: AgentPersona = {
  id: "surgical-oncologist",
  name: "Dr. Shalya",
  specialty: "Surgical Oncology",
  primaryGuideline: "nccn",  // <-- NOT SSO/ACS!
  secondaryGuidelines: [],   // <-- EMPTY!
  domains: ["surgical_resectability"],
  // ...
};
```

**Problem:** Dr. Shalya uses NCCN (generic) instead of SSO/ACS (surgical-specific).

---

## 3. SSO Guidelines Research

### 3.1 SSO Clinical Recommendations Overview

**Source:** https://surgonc.org/resources/clinical-recommendations/

SSO provides clinical recommendations in several categories:

#### 3.1.1 SSO-Developed Recommendations
| Topic | Year | Link |
|-------|------|------|
| Choosing Wisely: 5 Things Physicians Should Question | 2021 | [PDF](https://surgonc.org/wp-content/uploads/2024/09/SSO-5things-List_2021-Updates.pdf) |
| Gene Expression Profiling for Cutaneous Melanoma | 2024 | [Springer](https://link.springer.com/article/10.1245/s10434-024-16379-2) |
| Contralateral Mastectomy Indications | 2024 | [Springer](https://link.springer.com/article/10.1245/s10434-024-14893-x) |
| D2 Lymphadenectomy for Gastric Cancer | 2024 | SSO Developed |
| PMRT Guidelines (In Development) | TBD | |

#### 3.1.2 SSO-Collaborated/Endorsed Recommendations
| Topic | Collaborators | Year |
|-------|--------------|------|
| Germline Testing in Breast Cancer | ASCO, SSO | 2024 |
| Hereditary Breast Cancer Management | ASCO, ASTRO, SSO | 2020 |
| Breast-Conserving Surgery Margins (DCIS) | SSO, ASTRO, ASCO | 2016 |
| Breast-Conserving Surgery Margins (Invasive) | SSO, ASTRO | 2014 |
| Partial Breast Irradiation | ASTRO (SSO endorsed) | 2023 |
| PMRT Guidelines | ASTRO, ASCO, SSO | In Development |
| Radiation for Rectal Cancer | ASTRO (SSO endorsed) | 2020 |
| Radiation for Gastric Cancer | ASTRO (SSO endorsed) | In Development |
| External Beam RT for Liver Cancer | ASTRO (SSO endorsed) | 2021 |
| Radiation for Pancreatic Cancer | ASTRO (SSO expert) | 2019 |
| RT for Basal/Squamous Cell Skin Cancer | ASTRO (SSO endorsed) | 2019 |

#### 3.1.3 Disease-Site Specific Recommendations
- **Breast:** 8 recommendations
- **Colorectal:** 2 recommendations
- **Gastrointestinal:** 1 recommendation + 1 in development
- **Hepato-Pancreato-Biliary:** 3 recommendations
- **Melanoma:** 2 recommendations

### 3.2 SSO Document Availability Analysis

| Document Type | Availability | Format | Download Strategy |
|---------------|--------------|--------|-------------------|
| Choosing Wisely PDF | Direct download | PDF | `wget` |
| Consensus Statement | Direct download | PDF | `wget` |
| Annals of Surgical Oncology articles | Springer (paywalled) | HTML/PDF | Web scrape abstract + request full text |
| ASCO collaborative guidelines | ASCO JCO (open access some) | HTML/PDF | Web scrape or API |
| ASTRO collaborative guidelines | PRO journal (some open) | HTML/PDF | Web scrape |

### 3.3 Downloadable SSO Documents (Direct)

```bash
# Directly downloadable PDFs from surgonc.org
https://surgonc.org/wp-content/uploads/2024/09/SSO-5things-List_2021-Updates.pdf
https://surgonc.org/wp-content/uploads/2025/10/Consensus-Statement.pdf
https://surgonc.org/wp-content/uploads/2025/10/jimenez-et-al-2025-postmastectomy-radiation-therapy-an-astro-asco-sso-clinical-practice-guideline.pdf
https://surgonc.org/wp-content/uploads/2024/10/3GEP-Appendix-FINAL-9.23.24.pdf
https://surgonc.org/wp-content/uploads/2024/10/4Evidentiary-tables-by-question-FINAL-9.23.24.pdf
```

---

## 4. ACS/CoC Guidelines Research

### 4.1 Commission on Cancer Standards Overview

**Source:** https://www.facs.org/quality-programs/cancer-programs/commission-on-cancer/standards-and-resources/2020/

#### 4.1.1 Core Document
- **Optimal Resources for Cancer Care (2020 Standards)** - Primary accreditation standards document
- Last updated: October 2025
- Includes Standards 5.3-5.8 (Operative Standards)

#### 4.1.2 Operative Standards for Cancer Surgery (OSCS)
The CoC 2020 Standards include six operative standards derived from:
- **OSCS Volume I** - General principles
- **OSCS Volume II** - Disease-specific standards

**Disease Sites Covered:**
- Breast
- Colon
- Rectal
- Gastric
- Lung
- Esophagus
- Pancreas
- Hepatobiliary
- Melanoma

### 4.2 ACS Document Availability Analysis

| Document | Availability | Notes |
|----------|--------------|-------|
| Optimal Resources for Cancer Care (2020) | Members-only PDF | Requires ACS login |
| OSCS Vol I & II | Purchasable book | Not freely available |
| Standards Changelog | Public PDF | [Link](https://accreditation.facs.org/accreditationdocuments/CoC/Standards/CoC_Standards_Change_Log.pdf) |
| CAnswer Forum Q&A | Public (registration) | Forum content |

### 4.3 ACS Content Use Restrictions

**IMPORTANT:** ACS website explicitly states:
> "RESTRICTED USE: Visitors to this website are strictly prohibited from using, uploading, sharing, or incorporating any content, materials, data, or information provided by the ACS into any third-party applications, platforms, software, or websites without prior written authorization from the ACS. This restriction explicitly includes, but is not limited to, the integration of ACS content into tools leveraging artificial intelligence (AI), machine learning, large language models, or generative AI technologies and infrastructures."

**Implication:** We CANNOT scrape or use ACS content without explicit authorization.

---

## 5. Implementation Strategy

### 5.1 Phase 1: Download Freely Available SSO Documents

#### 5.1.1 Direct PDF Downloads

```bash
#!/bin/bash
# scripts/download_sso_guidelines.sh

SSO_DIR="guidelines/sso"
mkdir -p $SSO_DIR

# Directly downloadable SSO documents
wget -O "$SSO_DIR/SSO_Choosing_Wisely_2021.pdf" \
  "https://surgonc.org/wp-content/uploads/2024/09/SSO-5things-List_2021-Updates.pdf"

wget -O "$SSO_DIR/SSO_Consensus_Statement.pdf" \
  "https://surgonc.org/wp-content/uploads/2025/10/Consensus-Statement.pdf"

wget -O "$SSO_DIR/SSO_ASTRO_ASCO_PMRT_2025.pdf" \
  "https://surgonc.org/wp-content/uploads/2025/10/jimenez-et-al-2025-postmastectomy-radiation-therapy-an-astro-asco-sso-clinical-practice-guideline.pdf"

wget -O "$SSO_DIR/SSO_Melanoma_GEP_Appendix_2024.pdf" \
  "https://surgonc.org/wp-content/uploads/2024/10/3GEP-Appendix-FINAL-9.23.24.pdf"

wget -O "$SSO_DIR/SSO_Melanoma_GEP_Evidentiary_Tables_2024.pdf" \
  "https://surgonc.org/wp-content/uploads/2024/10/4Evidentiary-tables-by-question-FINAL-9.23.24.pdf"

echo "Downloaded $(ls -1 $SSO_DIR/*.pdf | wc -l) SSO documents"
```

#### 5.1.2 Springer/Journal Article Scraping (Abstracts Only)

For paywalled Annals of Surgical Oncology articles, we can:
1. Scrape the freely available **abstracts** and **key points**
2. Include DOI links for full reference
3. Use Unpaywall API to check for open access versions

```python
# scripts/scrape_sso_journal_abstracts.py

import requests
from bs4 import BeautifulSoup
import json

SSO_ARTICLES = [
    {
        "title": "Gene Expression Profiling of Primary Cutaneous Melanoma",
        "doi": "10.1245/s10434-024-16379-2",
        "year": 2024,
    },
    {
        "title": "Contralateral Mastectomy: Indications, Outcomes, and Risks",
        "doi": "10.1245/s10434-024-14893-x",
        "year": 2024,
    },
    {
        "title": "Updated Guidelines on Germline Testing for Breast Cancer",
        "doi": "10.1245/s10434-024-15638-6",
        "year": 2024,
    },
    # ... more articles
]

def check_open_access(doi):
    """Check Unpaywall for open access version"""
    url = f"https://api.unpaywall.org/v2/{doi}?email=your@email.com"
    resp = requests.get(url)
    if resp.ok:
        data = resp.json()
        if data.get("is_oa"):
            return data.get("best_oa_location", {}).get("url_for_pdf")
    return None

def scrape_springer_abstract(doi):
    """Scrape abstract from Springer"""
    url = f"https://link.springer.com/article/{doi}"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    soup = BeautifulSoup(resp.text, "html.parser")
    
    abstract = soup.find("div", {"id": "Abs1-content"})
    return abstract.get_text() if abstract else None
```

### 5.2 Phase 2: Alternative Sources for Surgical Guidelines

Since ACS/CoC content is restricted, we'll use alternative authoritative sources:

#### 5.2.1 Open Access Surgical Oncology Guidelines

| Source | Content | Availability |
|--------|---------|--------------|
| **PubMed/PMC** | SSO consensus papers (open access versions) | Free |
| **ASCO Guidelines** | Collaborative SSO guidelines | Many open access |
| **ASTRO Guidelines** | SSO-endorsed RT guidelines | Some open access |
| **ESMO Surgical Guidelines** | European surgical oncology recommendations | Free |
| **WHO Classification** | Tumor classification standards | Reference material |

#### 5.2.2 PubMed Central Search Strategy

```bash
# Search PubMed Central for open access SSO guidelines
# Query: (("Society of Surgical Oncology"[Affiliation]) OR ("SSO"[Title])) 
#        AND ("guideline"[Title] OR "consensus"[Title] OR "recommendation"[Title])
#        AND "open access"[Filter]
```

### 5.3 Phase 3: Create Gemini File Search Index

#### 5.3.1 Prepare Documents

```python
# scripts/prepare_sso_for_indexing.py

import os
from pathlib import Path
import fitz  # PyMuPDF for PDF processing

def prepare_documents(input_dir: str, output_dir: str):
    """
    Prepare SSO documents for Gemini File Search indexing.
    - Extract text from PDFs
    - Chunk into appropriate sizes
    - Add metadata
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    for pdf_file in Path(input_dir).glob("*.pdf"):
        doc = fitz.open(pdf_file)
        
        # Extract text with page references
        chunks = []
        for page_num, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                chunks.append({
                    "source": "SSO",
                    "document": pdf_file.stem,
                    "page": page_num + 1,
                    "content": text
                })
        
        # Save as JSONL for indexing
        output_file = Path(output_dir) / f"{pdf_file.stem}.jsonl"
        with open(output_file, "w") as f:
            for chunk in chunks:
                f.write(json.dumps(chunk) + "\n")
```

#### 5.3.2 Upload to Gemini File Search

```python
# scripts/create_sso_file_search_store.py

from google import genai
from google.genai import types

def create_file_search_store():
    """Create Gemini File Search store for SSO guidelines"""
    
    client = genai.Client()
    
    # Create corpus (File Search store)
    corpus = client.corpora.create(
        display_name="SSO Surgical Oncology Guidelines",
        description="Society of Surgical Oncology clinical recommendations and consensus statements"
    )
    
    print(f"Created corpus: {corpus.name}")
    print(f"Store ID: {corpus.name.split('/')[-1]}")
    
    return corpus

def upload_documents(corpus_name: str, documents_dir: str):
    """Upload documents to the File Search store"""
    
    client = genai.Client()
    
    for doc_file in Path(documents_dir).glob("*.pdf"):
        # Upload file
        file = client.files.upload(
            file=doc_file,
            config=types.UploadFileConfig(
                display_name=doc_file.stem,
                mime_type="application/pdf"
            )
        )
        
        # Create document in corpus
        doc = client.corpora.documents.create(
            parent=corpus_name,
            document=types.Document(
                display_name=doc_file.stem,
                raw_document=types.RawDocument(
                    file=file.name
                )
            )
        )
        
        print(f"Uploaded: {doc_file.name} -> {doc.name}")
```

### 5.4 Phase 4: Update RAG Connector

#### 5.4.1 Add SSO to GuidelineSource Type

**File:** `packages/agents/src/types.ts`

```typescript
export type GuidelineSource =
  | "nccn"
  | "nccn-resource-stratified"
  | "esmo"
  | "astro"
  | "acr"
  | "cap"
  | "clinvar"
  | "civic"
  | "sso"   // NEW: Society of Surgical Oncology
  // Note: ACS/CoC removed due to content restrictions
  ;
```

#### 5.4.2 Add SSO to File Search Stores

**File:** `packages/agents/src/rag/connector.ts`

```typescript
const FILE_SEARCH_STORES: Record<GuidelineSource, string> = {
  nccn: process.env.FILE_SEARCH_NCCN || "nccnguidelinesrag-4ffdfolxso0s",
  esmo: process.env.FILE_SEARCH_ESMO || "esmoguidelinesen-4tjmgeq3y1h8",
  astro: process.env.FILE_SEARCH_ASTRO || "astroguidelinesrag-xanee0h0rgpp",
  acr: process.env.FILE_SEARCH_ACR || "acrradiologyguidelinesrag-qt98zl8un2ht",
  cap: process.env.FILE_SEARCH_CAP || "capcancerprotocolsrag-55nmm2prh0xs",
  clinvar: process.env.FILE_SEARCH_GENOMICS || "clinvarcivicgenomicsrag-uat87mzcqtum",
  civic: process.env.FILE_SEARCH_GENOMICS || "clinvarcivicgenomicsrag-uat87mzcqtum",
  // NEW
  sso: process.env.FILE_SEARCH_SSO || "ssoguidelinesrag-PLACEHOLDER",
};
```

#### 5.4.3 Add SSO to Guideline Source Info

**File:** `packages/agents/src/rag/types.ts`

```typescript
export const GUIDELINE_SOURCES: Record<GuidelineSource, GuidelineSourceInfo> = {
  // ... existing sources ...
  
  sso: {
    id: "sso",
    name: "SSO Clinical Recommendations",
    itemCount: 15, // Initial estimate
    description: "Society of Surgical Oncology clinical recommendations and consensus statements",
    citationFormat: "SSO {topic} {year}",
    fileSearchStoreId: "ssoguidelinesrag-PLACEHOLDER",
  },
};
```

#### 5.4.4 Add SSO Mock Content

**File:** `packages/agents/src/rag/connector.ts` (in getMockContent)

```typescript
sso: {
  surgical: `SSO Surgical Oncology Principles:
- Adequate margins are critical for oncologic outcomes
- Lymph node assessment per disease-specific protocols
- Consider neoadjuvant therapy for borderline resectable tumors
- Minimally invasive approaches when oncologically appropriate
- Multidisciplinary tumor board discussion for complex cases
[SSO Clinical Recommendations]`,

  breast: `SSO Breast Surgery Recommendations:
- Breast-conserving surgery (BCS) with negative margins preferred for early-stage
- Negative margin = no ink on tumor (SSO-ASTRO consensus 2014)
- DCIS margins: 2mm preferred (SSO-ASTRO-ASCO consensus 2016)
- Contralateral prophylactic mastectomy: Consider for BRCA1/2, strong family history
- Sentinel lymph node biopsy standard for clinically node-negative
[SSO-ASTRO Consensus Guidelines]`,

  melanoma: `SSO Melanoma Surgery Recommendations:
- Wide local excision margins based on Breslow thickness
- <1mm: 1cm margin; 1-2mm: 1-2cm margin; >2mm: 2cm margin
- Sentinel lymph node biopsy for ≥0.8mm thickness or ulceration
- Gene expression profiling: Not recommended for routine clinical use (2024)
- Consider completion lymph node dissection based on tumor burden
[SSO Melanoma DSWG Consensus 2024]`,

  colorectal: `SSO Colorectal Surgery Recommendations:
- Complete mesocolic excision (CME) for colon cancer
- Total mesorectal excision (TME) for rectal cancer
- Circumferential resection margin (CRM) >1mm required
- Minimum 12 lymph nodes for adequate staging
- Organ preservation strategies for rectal cancer post-chemoRT
[SSO-ASTRO Rectal Cancer Guidelines]`,

  overview: `Society of Surgical Oncology (SSO) provides evidence-based clinical recommendations for surgical management of solid tumors. SSO collaborates with ASCO, ASTRO, and other societies on multidisciplinary guidelines. Key principles: adequate margins, appropriate lymphadenectomy, minimally invasive when safe, multidisciplinary planning.`,
},
```

### 5.5 Phase 5: Update Surgical Oncologist Agent

**File:** `packages/agents/src/specialists/surgical-oncologist.ts`

```typescript
export const SURGICAL_ONCOLOGIST: AgentPersona = {
  id: "surgical-oncologist",
  name: "Dr. Shalya",
  specialty: "Surgical Oncology",
  personality: "Pragmatic, outcomes-focused, considers functional preservation",
  primaryGuideline: "sso",       // CHANGED from "nccn"
  secondaryGuidelines: ["nccn"], // ADDED: Fall back to NCCN for comprehensive coverage
  domains: ["surgical_resectability"],
  evaluationFramework: [
    "RESECTABILITY: Is this surgically resectable? R0 possible?",
    "OPERABILITY: Patient fitness (ECOG, comorbidities)?",
    "TIMING: Upfront surgery vs. neoadjuvant approach?",
    "TECHNIQUE: Minimally invasive vs. open? Organ preservation?",
    "MARGINS: Required margins? Lymph node dissection extent?",
    "RECONSTRUCTION: Immediate vs. delayed? Options?",
  ],
  indianContextConsiderations: [
    "Equipment/expertise availability at patient's center",
    "Patient's ability to travel for specialized surgery",
    "Cost implications of different approaches (robotic vs. open)",
    "Late-stage presentations requiring more extensive resections",
  ],
};
```

---

## 6. Document Inventory (Target)

### 6.1 SSO Documents to Index

| # | Document | Source | Type | Priority |
|---|----------|--------|------|----------|
| 1 | Choosing Wisely 2021 | surgonc.org | PDF | High |
| 2 | Consensus Statement | surgonc.org | PDF | High |
| 3 | PMRT Guidelines (ASTRO-ASCO-SSO) | surgonc.org | PDF | High |
| 4 | Melanoma GEP Consensus 2024 | Springer | Abstract | High |
| 5 | Melanoma GEP Appendix | surgonc.org | PDF | Medium |
| 6 | Melanoma GEP Evidentiary Tables | surgonc.org | PDF | Medium |
| 7 | Contralateral Mastectomy 2024 | Springer | Abstract | High |
| 8 | Germline Testing (ASCO-SSO) 2024 | JCO | Open Access | High |
| 9 | Hereditary Breast Cancer 2020 | JCO | Open Access | High |
| 10 | BCS Margins DCIS 2016 | JCO | Open Access | High |
| 11 | BCS Margins Invasive 2014 | Annals | Abstract | High |
| 12 | D2 Lymphadenectomy Gastric | SSO | TBD | Medium |

### 6.2 Supplementary Open Access Sources

| # | Document | Source | Coverage |
|---|----------|--------|----------|
| 1 | ASCO Surgical Guidelines | asco.org | Breast, Colorectal, Lung |
| 2 | ESMO Surgical Recommendations | esmo.org | All sites |
| 3 | NICE Surgical Guidelines | nice.org.uk | UK perspective |
| 4 | Cochrane Reviews (Surgical) | cochrane.org | Systematic reviews |

---

## 7. Environment Variables

Add to `.env.example`:

```bash
# SSO File Search Store (new)
FILE_SEARCH_SSO=ssoguidelinesrag-PLACEHOLDER  # Update after creation
```

---

## 8. Testing Plan

### 8.1 Unit Tests

```typescript
// packages/agents/src/rag/__tests__/sso-connector.test.ts

describe("SSO RAG Connector", () => {
  it("should query SSO guidelines for breast surgery margins", async () => {
    const result = await rag.query({
      query: "What are the recommended margins for breast-conserving surgery?",
      source: "sso",
      cancerType: "breast"
    });
    
    expect(result[0].content).toContain("margin");
    expect(result[0].citation.source).toBe("sso");
  });
  
  it("should query SSO guidelines for melanoma GEP", async () => {
    const result = await rag.query({
      query: "Is gene expression profiling recommended for melanoma?",
      source: "sso",
      cancerType: "melanoma"
    });
    
    expect(result[0].content).toContain("gene expression");
  });
});
```

### 8.2 Integration Tests

```typescript
// Test surgical oncologist uses SSO as primary source
describe("Surgical Oncologist Agent", () => {
  it("should use SSO guidelines for surgical recommendations", async () => {
    const response = await agent.evaluate(breastCancerCase);
    
    // Check citations include SSO
    const ssoСitations = response.citations.filter(c => c.source === "sso");
    expect(ssoСitations.length).toBeGreaterThan(0);
  });
});
```

---

## 9. Implementation Timeline

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Download SSO PDFs | 1 day | None |
| 2 | Scrape journal abstracts | 2 days | Phase 1 |
| 3 | Create File Search store | 1 day | Phase 2 |
| 4 | Upload documents to Gemini | 1 day | Phase 3 |
| 5 | Update RAG connector code | 1 day | Phase 4 |
| 6 | Update surgical oncologist agent | 0.5 day | Phase 5 |
| 7 | Add mock content | 0.5 day | Phase 5 |
| 8 | Testing | 2 days | Phase 7 |
| **Total** | | **9 days** | |

---

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ACS content restrictions | High | Medium | Use SSO + NCCN instead; note in docs |
| Paywalled journal articles | High | Medium | Use abstracts + open access versions |
| Gemini File Search quota limits | Low | High | Batch uploads; monitor quota |
| SSO website structure changes | Medium | Low | Robust scraping with fallbacks |
| Limited SSO document count | Medium | Medium | Supplement with ASCO/ESMO surgical content |

---

## 11. Open Questions

1. **ACS Authorization:** Should we formally request permission from ACS to use CoC content? (Likely to be denied for AI use)

2. **SSO Membership:** Can we get institutional access to full-text Annals articles?

3. **ASCO Content:** ASCO guidelines are more permissive - should we prioritize ASCO surgical content over trying to get ACS?

4. **European Guidelines:** ESMO surgical guidelines are freely available - should we include them for Dr. Shalya?

---

## 12. Appendix: Key SSO Clinical Recommendations URLs

```
# Direct PDFs
https://surgonc.org/wp-content/uploads/2024/09/SSO-5things-List_2021-Updates.pdf
https://surgonc.org/wp-content/uploads/2025/10/Consensus-Statement.pdf
https://surgonc.org/wp-content/uploads/2025/10/jimenez-et-al-2025-postmastectomy-radiation-therapy-an-astro-asco-sso-clinical-practice-guideline.pdf

# Clinical Recommendations Page
https://surgonc.org/resources/clinical-recommendations/

# Annals of Surgical Oncology (Springer)
https://link.springer.com/journal/10434

# DOIs for key articles
10.1245/s10434-024-16379-2  # Melanoma GEP Consensus
10.1245/s10434-024-14893-x  # Contralateral Mastectomy
10.1245/s10434-024-15638-6  # Germline Testing Editorial
10.1245/s10434-024-15639-5  # PBI Surgical Perspectives
```

---

## 13. Next Steps

1. [ ] Run download script for SSO PDFs
2. [ ] Set up journal abstract scraping
3. [ ] Create GCP File Search store for SSO
4. [ ] Upload documents and verify indexing
5. [ ] Update RAG connector code
6. [ ] Update surgical oncologist agent config
7. [ ] Add comprehensive mock content
8. [ ] Test end-to-end
9. [ ] Update documentation
10. [ ] Deploy to production

---

*This specification will be updated as implementation progresses.*
