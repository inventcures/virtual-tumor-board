# V19 Specification & Implementation Plan: Next-Gen CDSS "Thought Partner"

**Date:** 2026-02-26  
**Status:** Planning  
**Priority:** Critical (North Star Alignment)  

---

## 0. Vision & North Star

**North Star**: Get patients the best possible outcomes (OS, Survival, Prognosis, Survivorship) and keep them engaged throughout the Cancer Care Journey Continuum.

**Philosophy**: 
The Virtual Tumor Board (VTB) must evolve from a static "answer generator" into a **Clinical "Pairing" Intern**. It must not replace cognitive clinical reasoning. Instead, it must:
1. **Adapt** to the oncologist's level of expertise and interaction patterns.
2. **Learn** from the oncologist's corrections and preferences.
3. **Challenge** the oncologist constructively (Socratic feedback) to prevent cognitive bias.
4. **Extend** the physician's reach into survivorship and patient engagement.

---

## 1. Feature Specifications

### Feature A: Adaptive Clinician Profiling & Socratic Mode
* **Concept**: The VTB profiles the user (e.g., "Senior Medical Oncologist", "1st-year Fellow") and adjusts its UI verbosity, jargon level, and deliberation exposure. 
* **Socratic Mode**: Before revealing its consensus, the VTB asks: *"Dr. Smith, what is your initial leaning for this case?"* It then compares the user's plan against the multi-agent consensus, highlighting blind spots, omitted guidelines, or confirming alignment.

### Feature B: Continuous "Adaptive Learning" (Clinician Memory)
* **Concept**: When an oncologist overrides a VTB recommendation or tweaks a treatment plan, the VTB captures this rationale. 
* **Implementation**: Introduce a new `ClinicianPreferenceMemory` module using vector RAG. If Dr. X prefers a specific sequencing for borderline resectable pancreas cancer (supported by evidence), the VTB learns this and incorporates it into future debates as "Dr. X's institutional pattern."

### Feature C: Survivorship & Patient Journey Agent
* **Concept**: A dedicated agent (`patient-advocate` or `survivorship-specialist`) added to the deliberation.
* **Role**: Focuses exclusively on Quality of Life (QoL), toxicity management, financial toxicity, and survivorship care plans. Generates a patient-facing, empathetic summary of the tumor board's decision to foster patient engagement.

### Feature D: Longitudinal Outcome Loop (The "North Star" Tracker)
* **Concept**: A dashboard bridging the gap between decision and outcome. Allows oncologists to update the VTB on how the patient actually responded to the treatment 6, 12, 24 months later. The VTB uses this outcome data to weight its future confidence in similar clinical scenarios.

---

# Implementation Plan: V19 Next-Gen "Thought Partner" Features

## Approach
To build the "clinical pairing intern," we will implement these features iteratively. We will start by augmenting the existing Next.js frontend and the `packages/agents/src/orchestrator/index.ts` to support interactive "Socratic" yielding, followed by persistent memory (Learning), and concluding with the new Survivorship Agent.

## Steps

### Phase 1: Socratic Interaction Mode & Adaptive UI (Feature A)
1. **Core Implementation** 
   - Files to create: `packages/agents/src/orchestrator/socratic-evaluator.ts`
   - Files to modify: `apps/web/src/components/deliberation-stream.tsx`, `packages/agents/src/orchestrator/index.ts`
   - Details: Add a step in the orchestrator. After Round 2 (Debate), if Socratic Mode is ON, pause and prompt the user via UI: "Enter your initial clinical hypothesis". The Orchestrator then generates a "Delta Report" comparing user hypothesis vs. VTB consensus.
2. **Integration**
   - Hook into the streaming SSE endpoint to emit a `socratic_prompt` event.
   - UI shows an input box, waits for submission, then resumes Phase 4/5.

### Phase 2: Adaptive Learning & Preference Memory (Feature B)
1. **Core Implementation**
   - Files to create: `packages/agents/src/memory/preference-store.ts`
   - Files to modify: `packages/agents/src/orchestrator/index.ts`
   - Details: Integrate a simple vector store or local JSON DB (`.clinic-memory.json`) to store user overrides. During Phase 1 (Independent Hypothesis), inject retrieved preferences into the prompt context.
2. **Integration**
   - Create an API route in Next.js `apps/web/src/app/api/feedback/route.ts` to capture user corrections.

### Phase 3: Survivorship & Patient Advocate Agent (Feature C)
1. **Core Implementation**
   - Files to modify: `packages/agents/src/specialists.ts`
   - Details: Add `patient-advocate` to `AGENT_PERSONAS`.
   - Prompt design: Focus on QoL, managing side effects, and creating patient-friendly summaries.
2. **Integration**
   - Ensure the Orchestrator's final consensus explicitly extracts the Survivorship plan and the Patient-Facing summary to the UI.

### Phase 4: Longitudinal Outcome Tracker (Feature D)
1. **Core Implementation**
   - Files to create: `apps/web/src/app/outcomes/page.tsx`, `apps/web/src/components/outcome-tracker.tsx`
   - Details: A simple UI to fetch past cases, log OS/PFS/Toxicity events, and save them.

## Timeline
| Phase | Duration |
|-------|----------|
| Phase 1: Socratic Mode | 1.5 hours |
| Phase 2: Adaptive Learning | 2 hours |
| Phase 3: Survivorship Agent | 1 hour |
| Phase 4: Outcome Tracker | 1.5 hours |
| **Total** | **6 hours** |

## Rollback Plan
- All state changes in `packages/agents` will be modular. If the Orchestrator fails in Socratic mode, it will fallback to the standard `deliberate()` flow.
- We will commit after each Phase. Reverting is a simple `git revert` of the respective Phase commit.

## Security Checklist
- [x] Input validation on clinician text inputs (Socratic mode).
- [x] PHI/PII scrubbing before saving to Preference Memory.
- [x] Clear demarcation between "Guidelines" and "Learned Preferences" so evidence-based medicine is not accidentally overridden by a single clinician's bias.
