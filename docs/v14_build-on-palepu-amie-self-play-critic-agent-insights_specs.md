# V14: Advanced Clinical Reasoning with Self-Play & Critic Loops (Palepu/AMIE Adaptation)

## Overview

This specification integrates advanced clinical reasoning techniques from two landmark Google Research papers:
1.  **Palepu et al. (2024):** *Exploring Large Language Models for Specialist-level Oncology Care*
2.  **AMIE (Tu et al., 2024):** *Towards Conversational Diagnostic AI*

**Goal:** Transform VTB specialist agents from "one-shot responders" into **"Reflective Agents"** that utilize **Search-Augmented Self-Critique** and **Inference-Time Chain-of-Reasoning** to achieve specialist-level accuracy and safety.

---

## 1. Key Insights & Adaptations

### 1.1 The "Palepu Inference Strategy" (Search-Augmented Self-Critique)
*Source: Palepu et al., Figure 2*

The Palepu paper demonstrates that LLMs in oncology underperform when conducting simple generation. They achieve specialist performance via a multi-step loop:
1.  **Draft Response:** Initial best guess.
2.  **Search Retrieval:** Targeted fetching of guidelines/evidence for specific plan components (Neoadjuvant, Surgery, Adjuvant, etc.).
3.  **Self-Critique:** Evaluating the draft against retrieved evidence.
4.  **Revision:** Generating the final response.

**VTB Adaptation:** We will implement this **4-step loop** for *every* specialist agent (Medical Oncologist, Surgical Oncologist, etc.) within the Orchestrator.

### 1.2 AMIE's Inference-Time Chain-of-Reasoning
*Source: AMIE Paper, Section 2.4*

AMIE uses a structured internal monologue to "think before speaking":
1.  **Analyze:** Summarize history, DDx, missing info.
2.  **Formulate:** Draft response and actions.
3.  **Refine:** Check against safety/communication criteria.

**VTB Adaptation:** We will enforce a structured **"Inner Monologue"** output format for agents, hidden from the final user but used for the revision step.

### 1.3 Inner-Loop Critic (Self-Play)
*Source: AMIE Paper, Section 2.2*

AMIE uses an "Inner Self-Play Loop" where a Critic agent gives feedback to improve the dialogue *during training*.
**VTB Adaptation:** We will move this to **Inference Time**. The "Scientific Critic" (Dr. Tark) will not just critique the *final* group consensus, but will actively critique *individual specialist drafts* before they are presented to the group.

---

## 2. Architecture: The "Reflective Specialist"

We will upgrade the `consultAgent` function in the Orchestrator to support a **Reflective Loop**.

### 2.1 The 4-Step Reflective Loop

For each specialist request:

#### Step 1: Draft Hypothesis (Zero-Shot)
The agent generates an initial plan based on its persona and the case data.
*   *Prompt:* "Given the case, what is your initial management plan? Be concise."

#### Step 2: Targeted Evidence Retrieval (Search/RAG)
The agent (or orchestrator) generates queries for the RAG system based on the draft.
*   *Example Queries:*
    *   "NCCN guidelines for [Cancer Type] Stage [Stage] neoadjuvant therapy"
    *   "Management of [Biomarker] positive [Cancer Type]"
    *   "[Drug Name] toxicity in elderly patients"

#### Step 3: Self-Critique & Safety Check
The agent critiques its own draft using the retrieved evidence and specific safety constraints (Palepu Rubric).
*   *Critique Prompt:*
    *   **Guideline Alignment:** "Does the draft align with retrieved NCCN guidelines?"
    *   **Safety:** "Is this safe for a patient with ECOG [Score] and [Comorbidities]?"
    *   **Completeness:** "Did I address Neoadjuvant, Surgery, Adjuvant, and Genetic testing?"
    *   **Bias:** "Is there any demographic bias?"

#### Step 4: Revised Specialist Output
The agent regenerates the response, incorporating the critique. This is the "final" output visible to the user and other agents.

---

## 3. Implementation Details

### 3.1 New Interface: `ReflectiveAgentConfig`

```typescript
// packages/agents/src/types.ts

export interface ReflectiveAgentConfig {
  enableSelfCritique: boolean; // Default: true for V14
  searchEnabled: boolean;      // Default: true
  critiqueModel: string;       // e.g., "gemini-1.5-pro" (stronger model for critique)
}

export interface CritiqueResult {
  passed: boolean;
  score: number; // 0-1
  issues: string[];
  missingGuidelines: string[];
  safetyFlags: string[];
}
```

### 3.2 Specialist Prompt Templates (Palepu-Style)

**File:** `packages/agents/src/orchestrator/prompts.ts`

**Draft Prompt:**
```text
You are Dr. [Name], a [Specialty].
Review this case: [Case Data]
Draft your initial management plan. Focus on:
1. Neoadjuvant?
2. Surgery?
3. Adjuvant?
4. Genetics?
```

**Critique Prompt (The "Palepu Critic"):**
```text
You are a Supervisor monitoring Dr. [Name].
Review their draft plan against these retrieved guidelines:
[Retrieved Context]

Critique the plan on these axes (from Palepu et al. 2024):
1. **Standard of Care:** Is it consistent with NCCN/guidelines?
2. **Safety:** Is it safe for THIS specific patient (Age, Comorbidities, ECOG)?
3. **Sequencing:** Is the order of treatments correct?
4. **Dosing/Specifics:** Are regimens specified (e.g., "AC-T" vs just "Chemo")?

Output a structured critique.
```

**Revision Prompt:**
```text
You are Dr. [Name].
Your supervisor provided this critique:
[Critique]

Please REWRITE your management plan to address these points.
Ensure you cite the guidelines explicitly.
```

### 3.3 Orchestrator Logic Update

**File:** `packages/agents/src/orchestrator/index.ts`

```typescript
// Pseudo-code for new consultAgent flow

async function consultReflectiveAgent(agentId, caseData) {
  // 1. Draft
  const draft = await generate(agentId, "draft_prompt", caseData);
  
  // 2. Search (Simulated or Real RAG)
  // Extract key terms from draft to query knowledge base
  const queries = extractSearchQueries(draft);
  const evidence = await rag.search(queries);
  
  // 3. Critique
  const critique = await generate("scientific-critic", "critique_prompt", { draft, evidence, caseData });
  
  // 4. Revise
  const finalResponse = await generate(agentId, "revision_prompt", { draft, critique, evidence });
  
  return finalResponse;
}
```

---

## 4. Evaluation Rubric (Palepu Adaptation)

We will implement an **Auto-Evaluator** (using a separate LLM call) to grade VTB outputs based on the Palepu paper's rubric. This serves as a quality metric.

**Rubric Dimensions:**
1.  **Management Reasoning:**
    *   Standard of care alignment?
    *   Neoadjuvant/Adjuvant sequencing correct?
    *   Surgical plan appropriate?
2.  **Safety:**
    *   Harmful recommendations?
    *   Aligned with ECOG?
    *   Demographic bias?
3.  **Completeness:**
    *   Genetic counseling addressed?
    *   Psychosocial support addressed?

---

## 5. Simulated Patient Generator (AMIE Adaptation)

To robustly test these new agents, we need diverse cases. We will create a **Vignette Generator** tool.

**Module:** `packages/agents/src/simulation/vignette-generator.ts`

**Functionality:**
*   Input: `CancerType` (e.g., "Breast"), `Difficulty` (e.g., "Complex/Refractory")
*   Logic: Uses LLM to generate a full `CaseData` object including:
    *   History of Present Illness (HPI)
    *   Pathology Report (simulated text)
    *   Imaging Report
    *   Biomarkers (ER/PR/HER2, etc.)
    *   Comorbidities (Cardiac, Renal, etc. to test safety)
*   Output: JSON `CaseData` compatible with VTB.

---

## 6. Roadmap

1.  **Phase 1: Vignette Generator (Test Data)**
    *   Create `vignette-generator.ts` to generate synthetic Palepu-style cases (Treatment-Naive & Refractory).
    *   Generate 5 test cases.

2.  **Phase 2: Reflective Agent Loop**
    *   Implement `ReflectiveAgent` wrapper in Orchestrator.
    *   Implement `Draft -> Critique -> Revise` prompts.
    *   Connect to existing RAG (or mock if RAG is offline).

3.  **Phase 3: Auto-Evaluator**
    *   Implement `PalepuRubricEvaluator` to score runs.

4.  **Phase 4: Integration**
    *   Enable Reflective Mode in the main VTB flow (`/api/deliberate`).

---

## 7. References

*   **Palepu et al. (2024):** *Exploring Large Language Models for Specialist-level Oncology Care* (arXiv:2411.03395)
*   **Tu et al. (2024):** *Towards Conversational Diagnostic AI (AMIE)* (arXiv:2401.05654)
