// Cache system for deliberation responses
// Stores generated responses and serves them with streaming simulation

import { SampleCase, SAMPLE_CASES } from "./sample-cases";

export interface CachedAgentResponse {
  agentId: string;
  name: string;
  specialty: string;
  response: string;
  citations: string[];
  toolsUsed: string[];
  thinkingTime: number;
  typingSpeed: number;
}

export interface CachedDeliberation {
  caseId: string;
  caseNumber: number;
  generatedAt: string;
  agents: CachedAgentResponse[];
  consensus: string;
}

// In-memory cache (resets on server restart)
const deliberationCache = new Map<string, CachedDeliberation>();

// Pre-cached case 1 (Lung NSCLC) - this is always available
const CASE_1_CACHE: CachedDeliberation = {
  caseId: "lung-nsclc-kras-g12c",
  caseNumber: 1,
  generatedAt: new Date().toISOString(),
  agents: [
    {
      agentId: "surgical-oncologist",
      name: "Dr. Shalya",
      specialty: "Surgical Oncology",
      thinkingTime: 2000,
      typingSpeed: 120,
      citations: ["NCCN NSCLC v2.2025", "Ann Thorac Surg 2024"],
      toolsUsed: ["rag_retrieve", "staging_calculator"],
      response: `## Surgical Assessment

**Resectability**: This case presents a **borderline resectable** Stage IIIA NSCLC with N2 disease (mediastinal lymph node involvement).

### Key Considerations:
1. **Tumor Location**: RUL mass 4.2cm is technically resectable
2. **N2 Disease**: Bulky N2 involvement typically favors definitive chemoradiation over surgery
3. **Patient Fitness**: ECOG 1, age 58 - acceptable surgical candidate if selected

### Recommendation:
Given the N2 disease burden, I recommend **definitive concurrent chemoradiotherapy** over upfront surgery. However, if patient strongly prefers surgery:
- Neoadjuvant chemoimmunotherapy followed by surgery could be considered
- Would require mediastinal restaging after neoadjuvant therapy
- Lobectomy with complete mediastinal lymph node dissection

**Indian Context**: Thoracoscopic lobectomy available at major centers (Tata Memorial, AIIMS, Max). Consider patient's travel burden for post-operative follow-up.

*[NCCN NSCLC v2.2025, STAGE-3]*`,
    },
    {
      agentId: "medical-oncologist",
      name: "Dr. Chikitsa",
      specialty: "Medical Oncology",
      thinkingTime: 2500,
      typingSpeed: 110,
      citations: ["NCCN NSCLC v2.2025", "PACIFIC Trial", "KEYNOTE-789"],
      toolsUsed: ["rag_retrieve", "drug_lookup", "cost_calculator"],
      response: `## Medical Oncology Assessment

### Biomarker Summary:
- **KRAS G12C**: Positive (actionable)
- **PD-L1**: 60% (high expression)
- **EGFR/ALK/ROS1**: Negative

### Treatment Recommendations:

**For Stage IIIA (Unresectable)**:
1. **Concurrent Chemoradiation** with platinum doublet (cisplatin/etoposide or carboplatin/paclitaxel)
2. **Durvalumab Consolidation** x 12 months after chemoRT (Category 1)

**Regarding KRAS G12C**:
- Sotorasib/Adagrasib approved for **metastatic** setting only
- Not indicated in stage III currently
- Consider for future progression

**Regarding PD-L1 60%**:
- Supports immunotherapy approach
- Durvalumab consolidation highly recommended

### Indian Context:
- **Durvalumab**: Available but expensive (~₹3-4 lakh/cycle)
- Check PMJAY coverage for immunotherapy
- Generic carboplatin/paclitaxel affordable (₹5-8K/cycle)
- Sotorasib NOT yet DCGI approved; would require import license

*[NCCN NSCLC v2.2025, SYST-A; PACIFIC Trial]*`,
    },
    {
      agentId: "radiation-oncologist",
      name: "Dr. Kirann",
      specialty: "Radiation Oncology",
      thinkingTime: 2200,
      typingSpeed: 115,
      citations: ["ASTRO Lung Guideline 2024", "RTOG 0617", "INT 0139"],
      toolsUsed: ["rag_retrieve", "dose_calculator"],
      response: `## Radiation Oncology Assessment

### RT Recommendation:
**Definitive Concurrent Chemoradiation** is indicated

### Prescription:
- **Dose**: 60 Gy in 30 fractions (2 Gy/fraction)
- **Technique**: IMRT/VMAT (preferred over 3D-CRT)
- **Duration**: 6 weeks

### Target Volumes:
- GTV: Primary tumor + involved nodes (4R, 7)
- CTV: GTV + 5-8mm margin + elective nodal coverage
- PTV: CTV + 5mm

### OAR Constraints:
| Structure | Constraint |
|-----------|------------|
| Mean Lung Dose | <20 Gy |
| Lung V20 | <35% |
| Esophagus Mean | <34 Gy |
| Heart Mean | <26 Gy |
| Spinal Cord Max | <50 Gy |

### Concurrent Chemotherapy:
Weekly Carboplatin AUC 2 + Paclitaxel 45mg/m² (preferred for tolerability)

### Indian Context:
- IMRT/VMAT available at major centers
- If LINAC wait >4 weeks, consider alternate center
- Daily travel for 6 weeks - assess patient logistics from Maharashtra
- Motion management with 4D-CT recommended

*[ASTRO Lung Guideline 2024; RTOG 0617]*`,
    },
    {
      agentId: "palliative-care",
      name: "Dr. Shanti",
      specialty: "Palliative Care",
      thinkingTime: 1800,
      typingSpeed: 100,
      citations: ["NCCN Supportive Care Guidelines", "WHO Palliative Care"],
      toolsUsed: ["rag_retrieve", "symptom_assessment"],
      response: `## Palliative Care Assessment

### Current Symptom Burden:
- **ECOG 1**: Good functional status
- Chief complaints to assess: Cough, dyspnea, pain, fatigue

### Quality of Life Considerations:
This patient appears to have:
- ✅ Good performance status
- ✅ Controlled comorbidities (DM, HTN)
- ✅ Curative intent treatment possible
- ✅ Family support system

### Recommendations:
1. **Proceed with curative-intent treatment**
2. **Symptom Management During ChemoRT**:
   - Esophagitis: Mucaine gel, PPI, soft diet
   - Fatigue: Activity pacing, light exercise
   - Nausea: Ondansetron + dexamethasone
   - Cough: Codeine-based suppressant if needed

### Goals of Care:
- Formal goals of care discussion before treatment
- Document patient's understanding of 5-year survival (~25-30% with PACIFIC regimen)
- Advance directive discussion

### Indian Context:
- **Family Meeting**: Include family in treatment discussions (cultural norm)
- **Caregiver Identification**: Primary caregiver for 6-week RT course
- **Financial Counseling**: Discuss full treatment costs upfront
- **Travel Support**: Consider patient lodging near RT center

*[NCCN Supportive Care Guidelines]*`,
    },
    {
      agentId: "radiologist",
      name: "Dr. Chitran",
      specialty: "Onco-Radiology",
      thinkingTime: 2000,
      typingSpeed: 105,
      citations: ["ACR Appropriateness Criteria", "RECIST 1.1", "Fleischner Society"],
      toolsUsed: ["rag_retrieve", "staging_validator"],
      response: `## Radiology Assessment

### Staging Completeness:
Current imaging:
- ✅ CT Chest with contrast
- ✅ PET-CT (confirmed N2 staging)

### Key Imaging Findings:
| Finding | Details |
|---------|---------|
| Primary | RUL mass 4.2 cm, spiculated |
| Nodes | 4R (1.8cm), Station 7 (1.5cm) - PET avid |
| Metastases | No distant disease |

### Staging Confirmation:
**cT2bN2M0 - Stage IIIA** is accurate:
- T2b: Tumor >4cm but ≤5cm ✅
- N2: Ipsilateral mediastinal nodes ✅
- M0: No distant disease on PET ✅

### Critical Recommendation:
⚠️ **Brain MRI Required** - Not mentioned in current workup
- 10-15% of Stage III NSCLC have occult brain metastases
- Must be done BEFORE starting curative-intent treatment

### Response Assessment Plan:
- CT chest/abdomen: 6-8 weeks post-RT completion
- Use RECIST 1.1 criteria
- PET-CT at 12 weeks if residual mass >2cm

### Indian Context:
- Brain MRI: ₹8-15K at private centers, ₹2-3K at govt hospitals
- If MRI unavailable: Contrast-enhanced CT brain acceptable
- PET-CT for response: Reserve for equivocal findings (expensive)

*[ACR Appropriateness Criteria: Staging Lung Cancer]*`,
    },
    {
      agentId: "pathologist",
      name: "Dr. Marga",
      specialty: "Pathology",
      thinkingTime: 1900,
      typingSpeed: 100,
      citations: ["CAP NSCLC Protocol", "ASCO/CAP Biomarker Guidelines", "WHO Classification 2021"],
      toolsUsed: ["rag_retrieve", "biomarker_validator"],
      response: `## Pathology Assessment

### Diagnosis Confirmation:
- **Histology**: Adenocarcinoma ✅
- **ICD-O-3 Code**: 8140/3 (correct)
- **Grade**: Moderately differentiated (presumed)

### Biomarker Panel - Complete Workup:
| Marker | Result | Method | Status |
|--------|--------|--------|--------|
| EGFR | Negative | NGS | ✅ |
| ALK | Negative | IHC (D5F3) | ✅ |
| ROS1 | Negative | IHC | ✅ |
| PD-L1 | 60% | IHC (22C3) | ✅ |
| KRAS | G12C | NGS | ✅ |
| TP53 | R248W | NGS | ✅ |
| TMB | 8 mut/Mb | NGS | ✅ |
| MSI | MSS | NGS | ✅ |

### Quality Assessment:
✅ Complete biomarker workup per NCCN guidelines
✅ PD-L1 tested with FDA-approved clone (22C3)
✅ KRAS G12C specifically identified (therapeutically relevant)
✅ NGS panel comprehensive

### Recommendations:
- No additional testing needed currently
- Archive tissue block for future testing at progression
- If biopsy was FNA, consider core biopsy if more tissue needed

### Indian Context:
- Complete NGS panel indicates major center workup - quality assured
- If from peripheral lab, validate PD-L1 at reference lab before durvalumab
- Cost of NGS panel: ₹35-50K (appropriate investment for treatment planning)

*[CAP NSCLC Protocol; ASCO/CAP Biomarker Guidelines 2023]*`,
    },
    {
      agentId: "geneticist",
      name: "Dr. Anuvamsha",
      specialty: "Genetics",
      thinkingTime: 2300,
      typingSpeed: 110,
      citations: ["CIViC Database", "OncoKB", "NCCN NSCLC Biomarker Testing"],
      toolsUsed: ["rag_retrieve", "variant_annotator", "clinical_trials_search"],
      response: `## Genetics/Molecular Oncology Assessment

### Somatic Mutation Analysis:
| Gene | Variant | VAF | Classification | Actionability |
|------|---------|-----|----------------|---------------|
| **KRAS** | G12C | 35% | Pathogenic | **ACTIONABLE** |
| TP53 | R248W | 42% | Pathogenic | Prognostic only |

### KRAS G12C - Therapeutic Implications:

**Current Stage III**:
- ❌ Sotorasib/Adagrasib NOT indicated (metastatic approval only)
- ✅ Standard chemoRT + durvalumab is correct approach

**If/When Metastatic Progression**:
- Sotorasib: 960mg PO daily (ORR ~37%, mPFS ~6.8 months)
- Adagrasib: 600mg PO BID (ORR ~43%, mPFS ~6.5 months)
- Sequence after immunotherapy progression (Level 1 evidence)

### Clinical Trial Opportunities:
Searched ClinicalTrials.gov for "KRAS G12C Stage III NSCLC":
- **CodeBreaK 201**: Sotorasib + pembrolizumab (enrollment status varies)
- **KRYSTAL-7**: Adagrasib + pembrolizumab
- Check Tata Memorial, CMC Vellore for Indian site participation

### Germline Testing:
- **Not indicated** based on current criteria
- No family history suggestive of hereditary cancer syndrome
- Lung adenocarcinoma in former smoker - expected somatic etiology

### Indian Context:
- **Sotorasib**: Not DCGI approved, requires import (~₹4-5 lakh/month)
- **Adagrasib**: Also not available domestically
- **Clinical Trials**: Best option for accessing KRAS inhibitors in India
- Save tissue block - may need re-testing for resistance mutations later

*[CIViC EID:6955; OncoKB; NCCN NSCLC Biomarker Testing v2.2025]*`,
    },
  ],
  consensus: `# Tumor Board Consensus Recommendation

## Treatment Intent: **CURATIVE**

---

## Primary Recommendation

### Definitive Concurrent Chemoradiotherapy + Durvalumab Consolidation

---

## Treatment Plan

### Phase 1: Concurrent Chemoradiation (Weeks 1-6)

| Component | Details |
|-----------|---------|
| **Radiation** | 60 Gy in 30 fractions, IMRT/VMAT |
| **Chemotherapy** | Carboplatin AUC 2 + Paclitaxel 45 mg/m² weekly |
| **Duration** | 6 weeks, Monday-Friday |

### Phase 2: Durvalumab Consolidation (Months 2-14)

| Component | Details |
|-----------|---------|
| **Drug** | Durvalumab 1500 mg IV |
| **Schedule** | Every 4 weeks |
| **Duration** | Up to 12 months |
| **Start** | Within 1-42 days after chemoRT |

---

## Pre-Treatment Requirements

⚠️ **Critical**: Complete these before starting treatment:

1. **Brain MRI** - Rule out occult metastases
2. **Pulmonary Function Tests** - Baseline for RT planning
3. **Dental evaluation** - Before RT (reduces osteoradionecrosis risk)
4. **Baseline labs** - CBC, CMP, LFTs, TFTs

---

## Rationale

| Factor | Implication |
|--------|-------------|
| Stage IIIA with N2 | Surgery not preferred (NCCN Category 2A) |
| PD-L1 60% | Strong durvalumab benefit predictor (PACIFIC HR 0.55) |
| KRAS G12C | Reserve for metastatic setting |
| ECOG 1 | Fit for definitive treatment |
| Age 58 | Acceptable for aggressive therapy |

---

## Cost & Access (Indian Context)

| Item | Estimated Cost | Coverage |
|------|----------------|----------|
| Radiation (IMRT, 30#) | ₹2.5-4 lakh | Partial PMJAY |
| Chemotherapy (6 cycles) | ₹40-60K | PMJAY covered |
| Durvalumab (12 months) | ₹36-48 lakh | Patient assistance available |
| **If cost-prohibitive** | ChemoRT alone | Still curative potential (15-20% 5yr OS) |

### Financial Navigation:
- Apply for AstraZeneca Patient Assistance Program for durvalumab
- Check Ayushman Bharat eligibility
- State cancer schemes (Maharashtra Rajiv Gandhi Jeevandayee)

---

## Alternative Options

1. **If durvalumab unaffordable**: ChemoRT alone (curative potential remains)
2. **If patient strongly prefers surgery**: Neoadjuvant chemo-IO → restaging → surgery (discuss risks)
3. **Clinical trial**: KRAS G12C trials at Tata Memorial if interested

---

## Follow-Up Schedule

| Timeline | Evaluation |
|----------|------------|
| Week 6-8 post-RT | CT chest/abdomen (RECIST 1.1) |
| Q4 weeks on durvalumab | Clinical + labs |
| Q3 months year 1-2 | CT chest |
| Q6 months year 3-5 | CT chest |
| PRN | Brain MRI if neurologic symptoms |

---

## Consensus Confidence: **HIGH** (7/7 specialists concur)

### Specialist Sign-off:
- ✅ Dr. Shalya (Surgical) - Agrees, surgery not first-line
- ✅ Dr. Chikitsa (Medical) - Primary driver of recommendation
- ✅ Dr. Kirann (Radiation) - RT plan confirmed
- ✅ Dr. Shanti (Palliative) - Supports curative intent
- ✅ Dr. Chitran (Radiology) - Staging confirmed, brain MRI needed
- ✅ Dr. Marga (Pathology) - Biomarkers complete
- ✅ Dr. Anuvamsha (Genetics) - KRAS strategy confirmed

---

*Generated by Virtual Tumor Board AI*
*Citations: NCCN NSCLC v2.2025, PACIFIC Trial (NEJM 2018), ASTRO Lung Guidelines 2024*
*Disclaimer: AI-generated recommendation. Final treatment decisions require clinical judgment.*`,
};

// Initialize cache with case 1
deliberationCache.set("lung-nsclc-kras-g12c", CASE_1_CACHE);

// Check if a case is cached
export function isCaseCached(caseId: string): boolean {
  return deliberationCache.has(caseId);
}

// Get cached deliberation
export function getCachedDeliberation(caseId: string): CachedDeliberation | undefined {
  return deliberationCache.get(caseId);
}

// Store a new deliberation in cache
export function cacheDeliberation(deliberation: CachedDeliberation): void {
  deliberationCache.set(deliberation.caseId, deliberation);
}

// Get all cached case IDs
export function getCachedCaseIds(): string[] {
  return Array.from(deliberationCache.keys());
}

// Get cache stats
export function getCacheStats(): { total: number; cached: string[]; uncached: string[] } {
  const allCaseIds = SAMPLE_CASES.map(c => c.id);
  const cachedIds = getCachedCaseIds();
  const uncachedIds = allCaseIds.filter(id => !cachedIds.includes(id));
  
  return {
    total: SAMPLE_CASES.length,
    cached: cachedIds,
    uncached: uncachedIds,
  };
}

// Helper to generate streaming chunks from cached data
export function* streamCachedDeliberation(
  deliberation: CachedDeliberation
): Generator<{ type: string; data: any; delay: number }> {
  // Initial phase change
  yield { type: "phase_change", data: { phase: "round1" }, delay: 500 };

  // Stream each agent's response
  for (const agent of deliberation.agents) {
    // Agent starts thinking
    yield {
      type: "agent_start",
      data: { agentId: agent.agentId, name: agent.name },
      delay: agent.thinkingTime,
    };

    // Stream response in chunks (simulating typing)
    const chunkSize = 50;
    const chunks: string[] = [];
    for (let i = 0; i < agent.response.length; i += chunkSize) {
      chunks.push(agent.response.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      yield {
        type: "agent_chunk",
        data: {
          agentId: agent.agentId,
          chunk: chunks[i],
          isFirst: i === 0,
          isLast: i === chunks.length - 1,
        },
        delay: Math.floor((chunkSize / agent.typingSpeed) * 1000 * 0.3),
      };
    }

    // Agent complete
    yield {
      type: "agent_complete",
      data: {
        agentId: agent.agentId,
        citations: agent.citations,
        toolsUsed: agent.toolsUsed,
      },
      delay: 300,
    };
  }

  // Round 2 - Debate phase
  yield { type: "phase_change", data: { phase: "round2" }, delay: 1500 };
  yield { type: "debate_update", data: { message: "Specialists reviewing each other's recommendations..." }, delay: 2000 };

  // Consensus phase
  yield { type: "phase_change", data: { phase: "consensus" }, delay: 1000 };

  // Stream consensus in chunks
  const consensusChunkSize = 80;
  const consensusChunks: string[] = [];
  for (let i = 0; i < deliberation.consensus.length; i += consensusChunkSize) {
    consensusChunks.push(deliberation.consensus.slice(i, i + consensusChunkSize));
  }

  for (let i = 0; i < consensusChunks.length; i++) {
    yield {
      type: "consensus_chunk",
      data: {
        chunk: consensusChunks[i],
        isFirst: i === 0,
        isLast: i === consensusChunks.length - 1,
      },
      delay: 25,
    };
  }

  // Completed
  yield { type: "phase_change", data: { phase: "completed" }, delay: 500 };
}
