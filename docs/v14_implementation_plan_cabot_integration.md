# V14.5: Integration Plan - CABot Insights into Reflective Agents

## Overview

This plan outlines the feasibility and steps to integrate key clinical reasoning insights from the **Dr. CaBot** paper (Manrai et al., 2025) into the newly implemented **Reflective Agent Architecture** (V14).

**Reference Spec:** `docs/v14_build-on-top-of-clinical-reasoning-insights-if-any-from-cabot-paper_specs.md`

---

## 1. Feasibility Analysis

| CABot Feature | Feasibility | Integration Strategy |
|---------------|-------------|----------------------|
| **Confirmatory/Disconfirmatory Evidence** | **High** | Directly modify `getReflectiveDraftPrompt` and `getRevisionPrompt`. |
| **Treatment Rationale Scoring** | **High** | Enhance `PalepuEvaluator` to include CABot's 4 dimensions. |
| **Similar Case Retrieval** | **Medium** | Generate corpus via `VignetteGenerator`. Use in-memory embeddings (or LLM selection) to retrieve. |
| **Treatment Decision Touchpoints** | **Low (Complex)** | Requires major refactor of `CaseData` to be temporal. Postpone to V15. |

---

## 2. Implementation Phases

### Phase 1: Structured Evidence (Immediate)
**Goal:** Force agents to explicitly list evidence *for* and *against* their recommendations.

**Actions:**
1.  Modify `packages/agents/src/orchestrator/prompts.ts`:
    *   Update `getReflectiveDraftPrompt` to require the `CONFIRMATORY (+)` / `DISCONFIRMATORY (-)` format.
    *   Update `getRevisionPrompt` to enforce this structure in the final output.
2.  Update `packages/agents/src/types.ts`:
    *   Add `evidence` structure to `TreatmentRecommendation`.

**Example Output:**
```markdown
**Recommendation:** Neoadjuvant Chemotherapy
**Confirmatory (+):** 
- Tumor > 2cm (T2)
- Node positive (N1)
- HER2+ status (Targetable)
**Disconfirmatory (-):**
- Patient age > 75 (Toxicity risk)
```

### Phase 2: Enhanced Evaluation (Immediate)
**Goal:** Grade the reasoning quality using CABot's dimensions.

**Actions:**
1.  Modify `packages/agents/src/evaluation/palepu-evaluator.ts`:
    *   Add `CabotScore` interface.
    *   Update prompt to score:
        *   **Guideline Support** (30%)
        *   **Patient Fit** (25%)
        *   **Tumor Biology Match** (25%)
        *   **Evidence Strength** (20%)

### Phase 3: "Lite" Similar Case Retrieval (Stretch)
**Goal:** Provide 1-2 similar examples to the agent during drafting.

**Actions:**
1.  Generate a small corpus (10 cases) using `generate-cases.ts`.
2.  In `consultReflectiveAgent`, use a lightweight lookup (e.g., matching Cancer Type + Stage) to inject a "Similar Case" summary into the context.

---

## 3. Next Steps

We will proceed with **Phase 1** and **Phase 2** immediately as they directly enhance the quality of the current Reflective Agent system without architectural upheaval.
