# V7: Next-Gen Deliberation Engine Specifications
## "Nuanced, Rigorous, and Adversarial"

**Status:** Draft
**Influences:** 
- *Sequential Diagnosis with Language Models (MAI-DxO)* - Microsoft AI
- *The Virtual Lab (AI-Human Collaboration)* - Zou Group, Stanford/Nature

---

## 1. Executive Summary

The current VTB deliberation is a linear "Round Robin" conversation. While effective for standard cases, it lacks the rigor required for complex, edge-case scenarios where guidelines are ambiguous or conflicting. 

V7 introduces a **Hierarchical Multi-Agent Orchestration** architecture inspired by the "Virtual Lab" and "MAI-DxO" papers. It moves from a flat chat to a **structured, adversarial debate system** with explicit roles for **Hypothesis Generation**, **Stewardship**, **Critique**, and **Domain-Specific Veto Power**.

## 2. Core Architectural Concepts

### 2.1 The "Virtual Tumor Board Lab" Structure
Adapted from *The Virtual Lab*, we organize agents not just as peers, but with functional roles:

1.  **The Principal Investigator (PI) / Moderator:**
    *   **Role:** Sets the agenda, guides the discussion, synthesizing results, and writes the final consensus.
    *   **Superpower:** Can spawn *Parallel Meetings* (simulating multiple boards) and merge their insights to avoid local minima (hallucinations).

2.  **The Scientific Critic (The "Dr. Challenger"):**
    *   **Role:** Does *not* propose treatments. Solely exists to find flaws, guideline violations, and safety risks in others' proposals.
    *   **Inspiration:** MAI-DxO's "Dr. Challenger" and Virtual Lab's "Scientific Critic".
    *   **Behavior:** Checks for anchoring bias (sticking to initial diagnosis), premature closure, and hallucinated evidence.

3.  **The Clinical Specialists (with Domain Authority):**
    *   **Medical Oncologist, Surgical Oncologist, Radiation Oncologist, etc.**
    *   **New Mechanism: Domain Veto.** A specialist has "Veto Power" or "5x Voting Weight" on topics strictly within their domain.
        *   *Example:* If MedOnc suggests "Radiation", but RadOnc says "Anatomy prevents safe delivery", RadOnc wins automatically.

4.  **Dr. Stewardship (The Cost/Toxicity Watchdog):**
    *   **Role:** Explicitly weighs "Financial Toxicity" and "Patient Quality of Life" against marginal survival benefits.
    *   **Inspiration:** MAI-DxO's "Dr. Stewardship".

### 2.2 The "Chain of Debate" Workflow
Instead of a single pass, deliberation happens in **Phases**:

#### Phase 1: The Information Gap (The "Gatekeeper" Pattern)
*   **Concept:** Agents shouldn't just hallucinate a plan if data is missing.
*   **Action:** Before proposing treatment, agents must "Ask" the Patient Proxy (Gatekeeper).
*   **Mechanism:** 
    *   Moderator: "Review the case. What is missing?"
    *   Agents: "Is EGFR mutation status available?", "What is the ECOG performance status?"
    *   System: If data exists, reveal it. If not, explicitly state "Unknown - Proceed with assumption X or recommend testing."

#### Phase 2: Independent Hypothesis Generation (Parallel Thinking)
*   **Concept:** Avoid groupthink.
*   **Action:** Each specialist generates their *ideal* plan in isolation (private chain-of-thought) before seeing others' opinions.

#### Phase 3: The Adversarial Debate (The Meeting)
*   **Round 1 - Proposals:** Agents present their independent plans.
*   **Round 2 - The Critique:** The **Scientific Critic** analyzes all plans for:
    *   Guideline adherence (NCCN/ESMO).
    *   Drug interactions.
    *   Patient safety risks.
    *   Logic gaps.
*   **Round 3 - Rebuttal & Convergence:** Agents update plans based on critique.

#### Phase 4: Conflict Resolution & Veto
*   **Algorithm:**
    *   Identify conflict (e.g., Surgery vs. Neoadjuvant Chemo).
    *   Check **Domain Authority**.
        *   Is the conflict about surgical resectability? -> **Surgical Oncologist** has Veto.
        *   Is the conflict about chemo tolerance? -> **Medical Oncologist** has Veto.
    *   If domain is shared/ambiguous, invoke **The Moderator** to synthesize a "Shared Decision Making" option presenting risks/benefits of both.

## 3. Implementation Details

### 3.1 Data Structures

```typescript
type AuthorityDomain = 'systemic_therapy' | 'surgical_resectability' | 'radiation_safety' | 'pathology_diagnosis';

interface SpecialistAgent {
  role: string;
  domains: AuthorityDomain[]; // Areas where this agent has Veto power
  model: string; // e.g., 'gpt-4o', 'o1-preview'
}

interface DebateTurn {
  agentId: string;
  content: string;
  intent: 'proposal' | 'critique' | 'agreement' | 'veto';
  targetAgentId?: string; // Who are they responding to?
}
```

### 3.2 The "Parallel Meeting" Algorithm (Ensembling)
For extremely high-stakes decisions (e.g., "Hospice vs. Aggressive Treatment"), the Moderator triggers the **Ensemble Protocol**:
1.  Spin up 3 parallel, isolated "Virtual Tumor Board" sessions with high temperature (0.7).
2.  Run the debate in each.
3.  Moderator (Low Temp 0.2) reads all 3 transcripts.
4.  Synthesize the "Meta-Consensus" (e.g., "In 2 out of 3 simulations, the board recommended Surgery. The 3rd recommended Chemo due to comorbidity risk X. Final recommendation: Surgery, but strictly screen for risk X first.").

### 3.3 Prompt Engineering Strategy
*   **Critic Prompt:** "You are the Safety Officer. You do not treat patients. Your only job is to find *why the proposed plan might kill the patient* or *violate NCCN guidelines*. Be ruthless but factual."
*   **Stewardship Prompt:** "You are the Financial Advocate. The proposed drug costs $20k/month. Is the 2-week survival benefit worth the bankruptcy risk for this specific patient family? Argue for value."

## 4. Roadmap

1.  **Refactor Agent Definitions:** Add `AuthorityDomain` and `SystemInstruction` fields to `agents.ts`.
2.  **Create "The Critic" Agent:** A specialized prompt optimized for logic checking.
3.  **Implement "Meeting" Class:** A controller that manages the multi-round state (Proposal -> Critique -> Rebuttal).
4.  **Add "Gatekeeper" Logic:** A pre-processing step to identify missing data.
5.  **UI Update:** Show the "Debate" structure visually (e.g., collapsible "Critique" sections, "Veto" badges).

## 5. Success Metrics
*   **Guideline Compliance:** % of recommendations matching NCCN guidelines.
*   **Hallucination Rate:** Frequency of inventing non-existent patient data (should be near 0 with Gatekeeper).
*   **Conflict Resolution:** Rate of successfully resolved disagreements without generic "consult your doctor" disclaimers.
