# V14: Clinical Reasoning Enhancement - Insights from CABot/CPC-Bench

## Overview

This specification document captures actionable techniques from the **Dr. CaBot** paper ("Advancing Medical Artificial Intelligence Using a Century of Cases", Manrai et al., arXiv:2509.12194) that can enhance the Virtual Tumor Board's clinical reasoning capabilities.

**Paper Source:** `papers/cabot_paper_arjun-manrai____2509.12194v1.pdf`

---

## 1. Executive Summary

### What CABot Teaches Us

The CABot paper introduces **CPC-Bench** - a benchmark derived from 100+ years of NEJM Clinicopathological Conferences. Key insights applicable to VTB:

| CABot Technique | VTB Application | Priority |
|-----------------|-----------------|----------|
| **Diagnostic Touchpoints** | Treatment Decision Touchpoints | HIGH |
| **Confirmatory/Disconfirmatory Evidence** | Explicit reasoning for/against treatments | HIGH |
| **Similar Case Retrieval** | Retrieve similar oncology cases for context | MEDIUM |
| **Information Omission Testing** | Robustness testing for extraction | LOW |
| **Structured Clinical Reasoning Output** | Enhance agent output format | HIGH |

### Key CABot Architecture Components

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Dr. CaBot Pipeline                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐   │
│  │  Similar    │────▶│   Iterative     │────▶│  Style-Mimicry   │   │
│  │    Case     │     │   Literature    │     │   Generation     │   │
│  │  Retrieval  │     │     Search      │     │  (2-shot DDx)    │   │
│  └─────────────┘     └─────────────────┘     └──────────────────┘   │
│        │                                              │              │
│        ▼                                              ▼              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Structured Reasoning Output                     │    │
│  │  • DDx with confidence scores                               │    │
│  │  • Confirmatory evidence for each diagnosis                 │    │
│  │  • Disconfirmatory evidence for each diagnosis              │    │
│  │  • Information gaps identified                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. CPC-Bench Task Mapping to VTB

### 2.1 Original CPC-Bench Tasks (Diagnostic Focus)

| Task | Description | Metric |
|------|-------------|--------|
| DDx | Generate ranked differential diagnosis | Top-1, Top-10 accuracy |
| Testing Plan | Recommend next diagnostic test | Accuracy |
| Literature Search | Find citations supporting reasoning | Relevance |
| Diagnostic Touchpoints | DDx at each clinical event | Per-touchpoint accuracy |
| Question-Answering | MCQ about the case | Accuracy |
| Clinical Reasoning | Explain confirmatory/disconfirmatory evidence | Human eval |
| Information Omission | DDx without normal findings | Robustness delta |
| Visual QA | Interpret radiology/pathology images | Accuracy |
| Visual DDx | Diagnosis from images only | Top-1, Top-10 accuracy |
| Image Challenge | NEJM Image Challenge format | Accuracy |

### 2.2 VTB-Adapted Tasks (Treatment Focus)

| Original Task | VTB Adaptation | Description |
|---------------|----------------|-------------|
| **DDx** | **Treatment Differential (TDx)** | Ranked treatment options (Surgery vs ChemoRT vs Immunotherapy) |
| **Testing Plan** | **Staging/Workup Plan** | What additional tests needed before treatment decision |
| **Literature Search** | **Guideline + Trial Search** | NCCN/ESMO guidelines + relevant clinical trial evidence |
| **Diagnostic Touchpoints** | **Treatment Decision Touchpoints** | Re-evaluate at: Pre-treatment, Post-neoadjuvant, Post-surgery, Surveillance |
| **Clinical Reasoning** | **Treatment Rationale** | Confirmatory/disconfirmatory evidence for each treatment option |
| **Information Omission** | **Missing Data Robustness** | How does recommendation change without staging scans, biomarkers, etc. |
| **Visual QA** | **Imaging Assessment** | RECIST measurement, treatment response evaluation |

---

## 3. Proposed Enhancements

### 3.1 Treatment Decision Touchpoints (HIGH PRIORITY)

**Concept:** Don't just give one final recommendation - provide staged reasoning at key clinical decision points.

**Current VTB Flow:**
```
Case Data → Specialists → Debate → Single Final Recommendation
```

**Enhanced VTB Flow with Touchpoints:**
```
Case Data → Specialists → Debate → TOUCHPOINT-BASED RECOMMENDATIONS
                                      │
                                      ├── Touchpoint 1: Initial Staging Complete
                                      │   └── Treatment Options + Rationale
                                      │
                                      ├── Touchpoint 2: Post-Neoadjuvant (if applicable)
                                      │   └── Response-based recommendation update
                                      │
                                      ├── Touchpoint 3: Post-Surgery (if applicable)
                                      │   └── Adjuvant therapy decision
                                      │
                                      └── Touchpoint 4: Surveillance/Recurrence
                                          └── Monitoring plan + recurrence management
```

**Implementation:**

```typescript
// packages/agents/src/types.ts - New types

export interface TreatmentTouchpoint {
  id: string;
  name: string;
  timing: string;  // e.g., "After initial staging", "Post-neoadjuvant"
  applicableTo: CancerType[];
  requiredData: string[];  // What data needed to make decision at this point
}

export interface TouchpointRecommendation {
  touchpointId: string;
  treatmentOptions: TreatmentOption[];
  selectedOption: TreatmentOption;
  rationale: ClinicalReasoning;
  confidence: "high" | "moderate" | "low";
  contingencies: ContingencyPlan[];  // "If X happens, do Y instead"
}

export interface TreatmentOption {
  id: string;
  modality: "surgery" | "chemotherapy" | "radiation" | "chemoradiation" | "immunotherapy" | "targeted" | "observation";
  regimen?: string;
  confirmatoryEvidence: Evidence[];
  disconfirmatoryEvidence: Evidence[];
  score: number;  // 0-1 based on evidence balance
}

// Pre-defined touchpoints by cancer type
export const TREATMENT_TOUCHPOINTS: Record<CancerType, TreatmentTouchpoint[]> = {
  "rectal-cancer": [
    {
      id: "rc-initial",
      name: "Initial Treatment Decision",
      timing: "After staging workup complete",
      applicableTo: ["rectal-cancer"],
      requiredData: ["MRI staging", "CEA", "CT chest/abdomen", "Colonoscopy with biopsy"],
    },
    {
      id: "rc-post-neoadjuvant",
      name: "Post-Neoadjuvant Response",
      timing: "6-8 weeks after chemoRT",
      applicableTo: ["rectal-cancer"],
      requiredData: ["Restaging MRI", "Clinical exam", "CEA trend"],
    },
    {
      id: "rc-post-surgery",
      name: "Adjuvant Decision",
      timing: "After surgical pathology",
      applicableTo: ["rectal-cancer"],
      requiredData: ["Final pathology", "Margin status", "LN involvement", "MMR/MSI status"],
    },
    {
      id: "rc-surveillance",
      name: "Surveillance Planning",
      timing: "Post-treatment completion",
      applicableTo: ["rectal-cancer"],
      requiredData: ["Treatment response", "Final stage", "Patient preferences"],
    },
  ],
  // ... other cancer types
};
```

**Orchestrator Changes:**

```typescript
// packages/agents/src/orchestrator/index.ts - New method

/**
 * Execute touchpoint-based deliberation
 * Returns recommendations at each clinical decision point
 */
async deliberateWithTouchpoints(
  caseData: CaseData,
  options: DeliberationOptions = {}
): Promise<TouchpointDeliberationResult> {
  const cancerType = this.detectCancerType(caseData);
  const touchpoints = TREATMENT_TOUCHPOINTS[cancerType] || TREATMENT_TOUCHPOINTS.default;
  
  const touchpointResults: TouchpointRecommendation[] = [];
  
  for (const touchpoint of touchpoints) {
    // Check if we have data for this touchpoint
    const hasRequiredData = this.checkRequiredData(caseData, touchpoint.requiredData);
    
    if (!hasRequiredData) {
      // Record what's missing, provide conditional recommendation
      touchpointResults.push({
        touchpointId: touchpoint.id,
        treatmentOptions: [],
        selectedOption: null,
        rationale: { missingData: touchpoint.requiredData.filter(d => !caseData[d]) },
        confidence: "low",
        contingencies: [],
      });
      continue;
    }
    
    // Execute deliberation for this touchpoint
    const result = await this.deliberateAtTouchpoint(caseData, touchpoint, options);
    touchpointResults.push(result);
  }
  
  return {
    caseId: caseData.id,
    cancerType,
    touchpointRecommendations: touchpointResults,
    overallPlan: this.synthesizeTouchpointPlan(touchpointResults),
  };
}
```

### 3.2 Confirmatory/Disconfirmatory Evidence Structure (HIGH PRIORITY)

**Concept:** For each treatment option, explicitly list evidence FOR and AGAINST.

**Current Agent Output:**
```
"Recommend neoadjuvant chemoradiation followed by TME given the T3N1 staging..."
```

**Enhanced Agent Output with Evidence Structure:**
```json
{
  "recommendedTreatment": "Neoadjuvant chemoradiation followed by TME",
  "treatmentDifferential": [
    {
      "option": "Neoadjuvant chemoRT → Surgery",
      "rank": 1,
      "confirmatoryEvidence": [
        "T3 tumor with mesorectal fascia involvement (MRF+) on MRI",
        "N1 disease with suspicious lymph nodes",
        "NCCN Category 1 recommendation for locally advanced rectal cancer",
        "Potential for tumor downstaging and sphincter preservation"
      ],
      "disconfirmatoryEvidence": [
        "Elderly patient (78yo) - increased chemoRT toxicity risk",
        "Pre-existing neuropathy may worsen with oxaliplatin"
      ],
      "netScore": 0.82
    },
    {
      "option": "Upfront Surgery (TME)",
      "rank": 2,
      "confirmatoryEvidence": [
        "Faster definitive treatment",
        "Avoids chemoRT toxicity"
      ],
      "disconfirmatoryEvidence": [
        "Higher risk of positive margins with MRF+ tumor",
        "Miss opportunity for tumor downstaging",
        "Higher local recurrence risk without neoadjuvant therapy"
      ],
      "netScore": 0.45
    },
    {
      "option": "Total Neoadjuvant Therapy (TNT)",
      "rank": 3,
      "confirmatoryEvidence": [
        "Highest pathologic complete response rate",
        "May improve distant metastasis-free survival"
      ],
      "disconfirmatoryEvidence": [
        "Patient age and comorbidities increase toxicity risk",
        "Prolonged treatment duration (5-6 months before surgery)",
        "Not yet Category 1 for all locally advanced patients"
      ],
      "netScore": 0.58
    }
  ]
}
```

**Prompt Enhancement for Specialists:**

```typescript
// packages/agents/src/orchestrator/prompts.ts - Enhanced prompt

export function getAgentSystemPrompt(agentId: AgentId): string {
  const persona = AGENT_PERSONAS[agentId];
  
  return `You are ${persona.name}, a ${persona.specialty} at a comprehensive cancer center.

## YOUR ROLE
${persona.instructions}

## CRITICAL: STRUCTURED REASONING REQUIREMENT

For EVERY treatment option you discuss, you MUST provide:

1. **CONFIRMATORY EVIDENCE** - Factors that SUPPORT this treatment:
   - Patient-specific factors (age, PS, comorbidities)
   - Tumor factors (stage, grade, biomarkers)
   - Guideline support (NCCN category, evidence level)
   - Clinical trial evidence

2. **DISCONFIRMATORY EVIDENCE** - Factors that ARGUE AGAINST this treatment:
   - Contraindications
   - Risk factors
   - Guideline caveats
   - Lack of evidence for this specific scenario

3. **NET ASSESSMENT** - Your weighted conclusion

Format your reasoning as:
\`\`\`
TREATMENT OPTION: [Name]
CONFIRMATORY (+):
- [Evidence 1]
- [Evidence 2]
DISCONFIRMATORY (-):
- [Evidence 1]
- [Evidence 2]
NET ASSESSMENT: [Favorable/Unfavorable] because [reason]
\`\`\`

This structured approach prevents anchoring bias and ensures comprehensive evaluation.
`;
}
```

### 3.3 Similar Case Retrieval (MEDIUM PRIORITY)

**Concept:** Retrieve similar historical cases to provide reasoning examples and validate recommendations.

**Implementation Plan:**

```typescript
// packages/agents/src/similar-cases/index.ts - New module

export interface SimilarCase {
  id: string;
  similarity: number;  // 0-1
  summary: string;
  cancerType: string;
  stage: string;
  treatment: string;
  outcome: string;
  source: "internal" | "literature" | "nccn-example";
}

export interface CaseEmbedding {
  caseId: string;
  embedding: number[];  // 768/1536 dim vector
  metadata: {
    cancerType: string;
    stage: string;
    biomarkers: Record<string, string>;
    patientFactors: string[];
  };
}

export class SimilarCaseRetriever {
  private embeddingModel: string;
  private vectorStore: VectorStore;  // Pinecone, Chroma, or in-memory
  
  constructor(config: { embeddingModel: string; vectorStore: VectorStore }) {
    this.embeddingModel = config.embeddingModel;
    this.vectorStore = config.vectorStore;
  }
  
  /**
   * Generate embedding for a case
   */
  async embedCase(caseData: CaseData): Promise<number[]> {
    const caseText = this.formatCaseForEmbedding(caseData);
    // Use embedding API (OpenAI, Cohere, or local model)
    return await this.generateEmbedding(caseText);
  }
  
  /**
   * Retrieve K most similar cases
   */
  async retrieveSimilar(caseData: CaseData, k: number = 5): Promise<SimilarCase[]> {
    const queryEmbedding = await this.embedCase(caseData);
    const results = await this.vectorStore.query(queryEmbedding, k);
    return results.map(r => ({
      id: r.id,
      similarity: r.score,
      ...r.metadata,
    }));
  }
  
  /**
   * Format similar cases for inclusion in agent prompt
   */
  formatForPrompt(similarCases: SimilarCase[]): string {
    return `
## SIMILAR HISTORICAL CASES (for reference)

${similarCases.map((c, i) => `
### Case ${i + 1} (${(c.similarity * 100).toFixed(0)}% similar)
- **Cancer:** ${c.cancerType}, ${c.stage}
- **Treatment:** ${c.treatment}
- **Outcome:** ${c.outcome}
- **Key Insight:** ${c.summary}
`).join('\n')}

Use these cases to inform your reasoning, but remember each patient is unique.
`;
  }
}
```

**Integration with Orchestrator:**

```typescript
// In orchestrator/index.ts

private async executeRound1WithSimilarCases(
  caseData: CaseData,
  agents: AgentId[],
  options: DeliberationOptions
): Promise<Round1Result> {
  // 1. Retrieve similar cases
  const similarCases = await this.caseRetriever.retrieveSimilar(caseData, 3);
  const similarCasesContext = this.caseRetriever.formatForPrompt(similarCases);
  
  // 2. Inject similar cases into case context
  const enrichedCaseData: CaseData = {
    ...caseData,
    additionalContext: {
      ...caseData.additionalContext,
      similarCases: similarCasesContext,
    },
  };
  
  // 3. Execute agent consultations with enriched context
  return this.executeRound1(enrichedCaseData, agents, options);
}
```

### 3.4 Treatment Rationale Scoring (HIGH PRIORITY)

**Concept:** Implement a scoring mechanism similar to CABot's DDx scoring for treatment options.

**Scoring Dimensions:**

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Guideline Support** | 30% | NCCN/ESMO category and evidence level |
| **Patient Fit** | 25% | Age, PS, comorbidities alignment |
| **Tumor Biology Match** | 25% | Stage, biomarkers, histology appropriateness |
| **Evidence Strength** | 20% | RCT vs observational, meta-analysis support |

```typescript
// packages/agents/src/scoring/treatment-scorer.ts

export interface TreatmentScore {
  overall: number;  // 0-1
  dimensions: {
    guidelineSupport: number;
    patientFit: number;
    tumorBiologyMatch: number;
    evidenceStrength: number;
  };
  confidence: "high" | "moderate" | "low";
  explanation: string;
}

export class TreatmentScorer {
  /**
   * Score a treatment option for a given case
   */
  async score(
    treatment: TreatmentOption,
    caseData: CaseData,
    guidelineData: GuidelineResult
  ): Promise<TreatmentScore> {
    // 1. Guideline Support (30%)
    const guidelineScore = this.scoreGuidelineSupport(treatment, guidelineData);
    
    // 2. Patient Fit (25%)
    const patientFitScore = this.scorePatientFit(treatment, caseData);
    
    // 3. Tumor Biology Match (25%)
    const tumorScore = this.scoreTumorBiologyMatch(treatment, caseData);
    
    // 4. Evidence Strength (20%)
    const evidenceScore = this.scoreEvidenceStrength(treatment);
    
    const overall = 
      guidelineScore * 0.30 +
      patientFitScore * 0.25 +
      tumorScore * 0.25 +
      evidenceScore * 0.20;
    
    return {
      overall,
      dimensions: {
        guidelineSupport: guidelineScore,
        patientFit: patientFitScore,
        tumorBiologyMatch: tumorScore,
        evidenceStrength: evidenceScore,
      },
      confidence: overall > 0.8 ? "high" : overall > 0.6 ? "moderate" : "low",
      explanation: this.generateExplanation(treatment, overall, {
        guidelineScore, patientFitScore, tumorScore, evidenceScore
      }),
    };
  }
  
  private scoreGuidelineSupport(treatment: TreatmentOption, guideline: GuidelineResult): number {
    // NCCN Categories: 1, 2A, 2B, 3
    const categoryScores: Record<string, number> = {
      "1": 1.0,
      "2A": 0.85,
      "2B": 0.65,
      "3": 0.4,
      "unknown": 0.5,
    };
    return categoryScores[guideline.category] || 0.5;
  }
  
  private scorePatientFit(treatment: TreatmentOption, caseData: CaseData): number {
    let score = 1.0;
    
    // Age penalty for aggressive treatments
    if (caseData.patient.age > 75 && treatment.modality === "chemoradiation") {
      score -= 0.2;
    }
    
    // Performance status
    if (caseData.patient.ecogPs >= 2 && treatment.modality === "surgery") {
      score -= 0.3;
    }
    
    // Comorbidities
    if (caseData.patient.comorbidities?.includes("cardiac") && 
        treatment.regimen?.includes("anthracycline")) {
      score -= 0.4;
    }
    
    return Math.max(0, score);
  }
  
  private scoreTumorBiologyMatch(treatment: TreatmentOption, caseData: CaseData): number {
    let score = 0.5;  // Base score
    
    // MSI-H tumors + immunotherapy
    if (caseData.tumor.msiStatus === "MSI-H" && treatment.modality === "immunotherapy") {
      score += 0.4;
    }
    
    // EGFR+ and targeted therapy
    if (caseData.tumor.biomarkers?.EGFR === "positive" && treatment.modality === "targeted") {
      score += 0.4;
    }
    
    // Stage-appropriate surgery
    if (caseData.tumor.stage.startsWith("I") && treatment.modality === "surgery") {
      score += 0.3;
    }
    
    return Math.min(1, score);
  }
  
  private scoreEvidenceStrength(treatment: TreatmentOption): number {
    // Based on evidence type backing the treatment
    const evidenceScores = {
      "phase3-rct": 1.0,
      "phase2-rct": 0.8,
      "meta-analysis": 0.9,
      "retrospective": 0.6,
      "case-series": 0.4,
      "expert-opinion": 0.3,
    };
    
    const evidenceTypes = treatment.confirmatoryEvidence
      .map(e => e.type)
      .filter(t => t in evidenceScores);
    
    if (evidenceTypes.length === 0) return 0.5;
    
    const maxScore = Math.max(...evidenceTypes.map(t => evidenceScores[t]));
    return maxScore;
  }
}
```

---

## 4. Implementation Roadmap

### Phase 1: Structured Reasoning Output (Week 1)

1. **Update Agent Prompts** - Add confirmatory/disconfirmatory evidence requirement
2. **Update Response Parsing** - Extract structured evidence from agent responses
3. **Add Treatment Scoring** - Implement TreatmentScorer class
4. **Update Types** - Add TreatmentOption, Evidence, ClinicalReasoning types

**Files to Modify:**
- `packages/agents/src/orchestrator/prompts.ts`
- `packages/agents/src/types.ts`
- `packages/agents/src/orchestrator/index.ts`

**New Files:**
- `packages/agents/src/scoring/treatment-scorer.ts`
- `packages/agents/src/scoring/index.ts`

### Phase 2: Treatment Decision Touchpoints (Week 2)

1. **Define Touchpoints** - Create touchpoint definitions for major cancer types
2. **Implement Touchpoint Deliberation** - Add `deliberateWithTouchpoints` method
3. **Update Consensus Building** - Synthesize touchpoint-aware treatment plan
4. **UI Updates** - Display touchpoint-based recommendations

**Files to Modify:**
- `packages/agents/src/orchestrator/index.ts`
- `apps/web/src/components/deliberation/...`

**New Files:**
- `packages/agents/src/touchpoints/index.ts`
- `packages/agents/src/touchpoints/cancer-specific.ts`

### Phase 3: Similar Case Retrieval (Week 3)

1. **Set Up Vector Store** - Configure Pinecone or Chroma
2. **Build Case Corpus** - Embed existing cases + literature examples
3. **Implement Retrieval** - SimilarCaseRetriever class
4. **Integration** - Inject similar cases into deliberation context

**New Files:**
- `packages/agents/src/similar-cases/index.ts`
- `packages/agents/src/similar-cases/embeddings.ts`
- `packages/agents/src/similar-cases/corpus.ts`

### Phase 4: Testing & Validation (Week 4)

1. **Unit Tests** - Test scoring, touchpoints, retrieval components
2. **Integration Tests** - End-to-end deliberation with new features
3. **Clinical Validation** - Review outputs with oncologist advisors
4. **Performance Benchmarking** - Compare with/without enhancements

---

## 5. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Reasoning Completeness** | Unstructured | 90%+ have confirmatory/disconfirmatory | Automated parsing |
| **Guideline Compliance** | ~70% | 90%+ | NCCN alignment check |
| **Touchpoint Coverage** | 0 (single recommendation) | 3-4 touchpoints per case | Count per deliberation |
| **Similar Case Retrieval** | None | Top-3 >60% relevance | Human evaluation |
| **Treatment Score Calibration** | N/A | Score correlates with expert ranking | Expert validation |

---

## 6. CABot Techniques NOT Applicable to VTB

For transparency, here are CABot techniques that don't directly map to our use case:

| Technique | Reason Not Applicable |
|-----------|----------------------|
| **DDx Generation** | VTB receives diagnosis as input, focuses on treatment |
| **Video Presentation** | VTB outputs structured JSON/markdown, not video |
| **NEJM Style Mimicry** | Our output format is clinical recommendation, not case discussion |
| **Image Challenge Format** | VTB doesn't do diagnostic challenges |

---

## 7. Future Enhancements (Beyond V14)

### 7.1 Uncertainty Quantification

From CABot: Implement explicit uncertainty bounds on recommendations.

```typescript
interface UncertaintyQuantification {
  recommendation: string;
  confidence: number;  // 0-1
  uncertaintySources: {
    dataQuality: number;      // Missing/conflicting data
    evidenceGaps: number;     // Limited clinical trial evidence
    patientSpecific: number;  // Unusual patient characteristics
  };
  sensitivityAnalysis: {
    // How would recommendation change if key factors were different
    ifYoungerPatient: string;
    ifBetterPS: string;
    ifDifferentBiomarker: string;
  };
}
```

### 7.2 LLM Judge for Treatment Appropriateness

Similar to CABot's GPT-4.1 judge for DDx accuracy:

```typescript
interface TreatmentJudge {
  /**
   * Evaluate if a treatment recommendation is appropriate
   * Using a second LLM as evaluator
   */
  async judge(
    caseData: CaseData,
    recommendation: TreatmentRecommendation,
    guidelineContext: string
  ): Promise<{
    appropriate: boolean;
    score: number;  // 0-1
    issues: string[];
    suggestions: string[];
  }>;
}
```

### 7.3 Counter-Factual Reasoning

Test recommendation robustness by asking "what if":

```typescript
interface CounterFactualTest {
  scenario: string;  // "What if the patient was EGFR positive?"
  modifiedCaseData: CaseData;
  newRecommendation: TreatmentRecommendation;
  changeRationale: string;
}

async function testCounterFactuals(
  caseData: CaseData,
  recommendation: TreatmentRecommendation
): Promise<CounterFactualTest[]> {
  const scenarios = generateCounterFactualScenarios(caseData);
  return Promise.all(
    scenarios.map(s => evaluateCounterFactual(s, recommendation))
  );
}
```

---

## 8. References

1. **Dr. CaBot Paper:** "Advancing Medical Artificial Intelligence Using a Century of Cases" (Manrai et al., 2025)
   - arXiv: 2509.12194
   - Key contribution: CPC-Bench benchmark and diagnostic touchpoints

2. **Related VTB Specs:**
   - V7: Deliberation Engine (adversarial debate structure)
   - V13: MARC-v1 Reliability Loop (evaluator-optimizer pattern)

3. **Existing Implementation:**
   - `packages/agents/src/orchestrator/index.ts` - Current deliberation flow
   - `packages/agents/src/specialists/` - Agent definitions

---

*Document Version: 1.0*  
*Created: 2026-01-26*  
*Author: VTB Development Team*
