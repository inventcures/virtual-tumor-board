# Virtual Tumor Board Software v0 - Technical Specifications

## Executive Summary

This document specifies a state-of-the-art **AI-powered Virtual Tumor Board (VTB)** software system designed for Indian tertiary care oncology centers. The system adapts Microsoft's MAI-DxO (Diagnostic Orchestrator) architecture from the "Sequential Diagnosis with Language Models" paper to oncology-specific multi-disciplinary team (MDT) decision-making.

**Core Innovation**: A multi-agent orchestration system where specialized AI agents, each imbued with distinct clinical oncology "personalities" and backed by society-specific clinical guidelines via RAG, deliberate on patient cases in a structured "Chain of Debate" to arrive at evidence-based treatment recommendations.

---

## Table of Contents

1. [Vision and Goals](#1-vision-and-goals)
   - 1.1 Vision Statement
   - 1.2 Key Objectives
   - 1.3 Target Users
   - 1.4 Reference Implementations Studied
   - 1.5 NAVIFY Clinical Hub - Feature Reference (Gold Standard)
2. [Architecture Overview](#2-architecture-overview)
3. [Multi-Agent Orchestrator Design](#3-multi-agent-orchestrator-design)
4. [Specialist Agent Personas](#4-specialist-agent-personas)
5. [RAG Integration Strategy](#5-rag-integration-strategy)
6. [Minimalist Oncology EHR Module](#6-minimalist-oncology-ehr-module)
7. [UI/UX Design Principles](#7-uiux-design-principles)
8. [Indian Context Adaptations](#8-indian-context-adaptations)
9. [Technical Stack](#9-technical-stack)
   - 9.5 [Claude SDK Integration Strategy](#95-claude-sdk-integration-strategy)
10. [Data Models](#10-data-models)
11. [API Specifications](#11-api-specifications)
12. [Security & Compliance](#12-security--compliance)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendices](#14-appendices)

---

## 1. Vision and Goals

### 1.1 Vision Statement

Build an open-source, AI-augmented Virtual Tumor Board platform that:
- Democratizes access to expert-level oncology MDT deliberations for hospitals across India
- Reduces tumor board preparation time from 1-2 hours to under 15 minutes per complex case
- Ensures guideline-adherent recommendations with transparent reasoning
- Functions as both a decision support tool AND a minimalist oncology EHR

### 1.2 Key Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Case preparation time reduction | Minutes per case | < 15 min (from 47 min avg) |
| Guideline adherence documentation | % cases with documented pathway | 100% |
| MDT discussion quality | Coverage of all specialty perspectives | All 7 specialties consulted |
| EHR functionality | Core workflows supported | Registration, staging, notes, orders, follow-up |
| Performance | Time to first recommendation | < 30 seconds |
| Cognitive load | Clicks for common actions | < 3 clicks |

### 1.3 Target Users

**Primary**:
- Medical Oncologists (decision coordinators)
- Surgical Oncologists
- Radiation Oncologists
- Onco-Radiologists
- Pathologists
- Clinical Geneticists/Molecular Oncologists
- Palliative Care Specialists

**Secondary**:
- Tumor Board Coordinators/Cancer Registrars
- Oncology Nurse Navigators
- Hospital Administrators (analytics)

### 1.4 Reference Implementations Studied

1. **MAI-DxO** (Microsoft, 2025) - Multi-agent diagnostic orchestrator with virtual physician panel
2. **NAVIFY Tumor Board** (Roche) - Commercial gold standard for tumor board workflow
3. **NCCN Guidelines App** - Decision tree navigation for clinical guidelines
4. **radonc_ka_cg** (Existing) - Patient information booklet generator with NCCN/ACR/ASTRO RAG

### 1.5 NAVIFY Clinical Hub for Tumor Boards - Feature Reference

> **Source**: NAVIFY Tumor Board Brochure (Roche/GE Healthcare) & [navify.roche.com/marketplace/products/navify-clinical-hub-for-tumor-boards](https://navify.roche.com/marketplace/products/navify-clinical-hub-for-tumor-boards)

The NAVIFY Clinical Hub represents the commercial gold standard. Our implementation should match or exceed these capabilities:

#### 1.5.1 Core Features (from NAVIFY)

| Feature Category | NAVIFY Capability | Our Implementation |
|------------------|-------------------|-------------------|
| **Data Aggregation** | Securely aggregates patient data from EMR, PACS, LIS into single dashboard | Same + AI-extracted insights |
| **Case Preparation** | Streamlined case submission with document attachment | Same + auto-staging |
| **Meeting Coordination** | Schedule meetings, manage attendees, track agenda | Same + async AI pre-review |
| **Guidelines Integration** | NCCN Guidelines app with decision tree navigation | 7 society guidelines via RAG |
| **Clinical Trial Match** | Query ClinicalTrials.gov, EMA, Japan registries | ClinicalTrials.gov + CTRI (India) |
| **Publication Search** | PubMed, ASCO, AACR literature search | Semantic Scholar integration |
| **Decision Documentation** | Capture recommendations, treatment plans | Same + AI rationale trail |
| **Timeline View** | Patient journey visualization | Same + predictive timeline |
| **Remote Participation** | Virtual meeting support | Built-in video + async review |
| **AD Integration** | Single sign-on with hospital Active Directory | OAuth/SAML + AD support |
| **ICD-O-3 Support** | Standard oncology coding dictionary | Full ICD-O-3 + ICD-11 |

#### 1.5.2 Key Benefits (NAVIFY Benchmarks to Match)

| Benefit | NAVIFY Metric | Our Target |
|---------|---------------|------------|
| **Preparation Time Reduction** | 53% decrease in TB prep time | 70% decrease (AI-assisted) |
| **User Satisfaction** | Higher than previous standards | NPS > 50 |
| **Guideline Adherence** | Documented pathway tracking | 100% cases with citations |
| **Meeting Efficiency** | Standardized case presentation | 5 min/case presentation |
| **Remote Collaboration** | Multi-site participation | Real-time + async modes |
| **Compliance** | HIPAA, GDPR, ISO 27001/27017/27018 | Same + Indian DPDP Act |

#### 1.5.3 NAVIFY Clinical Decision Support Apps Ecosystem

```
+------------------+     +------------------+     +------------------+
|    NAVIFY        |     |    NAVIFY        |     |    NAVIFY        |
|   GUIDELINES     |     | CLINICAL TRIAL   |     |  PUBLICATION     |
|      APP         |     |   MATCH APP      |     |   SEARCH APP     |
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| - NCCN decision  |     | - Query global   |     | - PubMed search  |
|   trees          |     |   trial DBs      |     | - ASCO abstracts |
| - Step progres-  |     | - Eligibility    |     | - AACR papers    |
|   sion view      |     |   criteria       |     | - 858K+ pubs     |
| - Alternative    |     | - Patient-       |     | - Biomarker +    |
|   pathway docs   |     |   specific       |     |   cancer type    |
| - Non-adherence  |     |   matching       |     |   filters        |
|   rationale      |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         +-----------------------------------------------+
                                 |
                                 v
                    +------------------------+
                    |   NAVIFY TUMOR BOARD   |
                    |   (Integration Hub)    |
                    +------------------------+
```

**Our Enhanced Equivalent**:
- **Guidelines**: 7-society RAG (NCCN, ESMO, ASTRO, ACR, CAP, ClinVar, CIViC)
- **Trials**: ClinicalTrials.gov + CTRI (Clinical Trials Registry India)
- **Literature**: Semantic Scholar API with 200M+ papers
- **Plus**: Multi-agent AI deliberation layer (unique differentiator)

#### 1.5.4 NAVIFY Workflow Stages (Reference Model)

```
NAVIFY END-TO-END TUMOR BOARD WORKFLOW
======================================

1. EFFICIENT MEETING COORDINATION
   - Prepare ahead: submit patients for discussion in advance
   - Easy coordination of meeting logistics
   - Simple rescheduling when information missing
   - Capture decisions with live edits

2. STREAMLINED CASE PREPARATION
   - Secure data aggregation into cohesive dashboard
   - EMR/PACS integration saves time, reduces errors
   - Remote access and concurrent collaboration
   - Quick access to guidelines, trials, publications

3. INFORMED TUMOR BOARD DISCUSSIONS
   - Holistic view of patient + scientific data
   - Real-time guidelines and publications
   - Clinical trial matches displayed
   - Remote participation supported
   - Standardized presentation format

4. SUPPORTED DECISION-MAKING & DOCUMENTATION
   - Clinical Decision Support apps for evidence-based decisions
   - MDT alignment facilitation
   - Treatment plan documentation
   - Decisions sent to EMR for follow-up
   - Consistent tracking of treatment decisions
   - Tumor board history in one place
```

#### 1.5.5 Features to Implement (Priority Matrix)

| Priority | Feature | NAVIFY Has | We Add |
|----------|---------|------------|--------|
| P0 | Patient dashboard with aggregated data | Yes | AI-extracted insights |
| P0 | Case submission workflow | Yes | Auto-staging from docs |
| P0 | Guidelines lookup (NCCN) | Yes | 7-society multi-RAG |
| P0 | Treatment decision capture | Yes | AI recommendation + human override |
| P1 | Meeting scheduling | Yes | Async AI pre-deliberation |
| P1 | Document upload/viewing | Yes | OCR + auto-extraction |
| P1 | Clinical trial matching | Yes | + CTRI India registry |
| P1 | Literature search | Yes | Semantic Scholar 200M papers |
| P2 | Timeline/journey view | Yes | Predictive modeling |
| P2 | PDF report generation | Yes | Multilingual (6 Indian languages) |
| P2 | Quality insights/analytics | Yes | AI-powered quality metrics |
| P3 | PACS deep linking | Yes | OHIF viewer integration |
| P3 | Pathology viewer | Limited | OpenSeadragon WSI viewer |

---

## 2. Architecture Overview

### 2.1 High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                              VIRTUAL TUMOR BOARD SYSTEM                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------------+    +------------------------+    +------------------+  |
|  |    PRESENTATION      |    |   ORCHESTRATION        |    |   KNOWLEDGE      |  |
|  |       LAYER          |    |       ENGINE           |    |     LAYER        |  |
|  +-----------------------+    +------------------------+    +------------------+  |
|  |                       |    |                        |    |                  |  |
|  | - Patient Dashboard   |    | Meta-Orchestrator      |    | RAG Services     |  |
|  | - Case Presentation   |<-->| (Conductor Agent)      |<-->| - NCCN           |  |
|  | - MDT Deliberation    |    |         |              |    | - ESMO           |  |
|  | - Decision Capture    |    |    +----+----+         |    | - ASTRO          |  |
|  | - EHR Functions       |    |    |         |         |    | - ACR            |  |
|  | - Timeline View       |    | Specialist Agents      |    | - CAP            |  |
|  | - Report Generation   |    | (7 Oncology Personas)  |    | - ClinVar/CIViC  |  |
|  |                       |    |                        |    | - PubMed/S2      |  |
|  +-----------------------+    +------------------------+    +------------------+  |
|           |                            |                            |             |
|           v                            v                            v             |
|  +-----------------------+    +------------------------+    +------------------+  |
|  |     DATA LAYER       |    |    LLM BACKBONE        |    |  EXTERNAL APIs   |  |
|  +-----------------------+    +------------------------+    +------------------+  |
|  |                       |    |                        |    |                  |  |
|  | - Patient Records DB  |    | - Claude/GPT/Gemini    |    | - Semantic       |  |
|  | - Case History        |    | - Model-agnostic       |    |   Scholar        |  |
|  | - TB Meeting Records  |    | - Structured prompts   |    | - ClinicalTrials |  |
|  | - Document Store      |    |                        |    | - Drug DBs       |  |
|  |                       |    |                        |    |                  |  |
|  +-----------------------+    +------------------------+    +------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 2.2 Component Breakdown

```
oss-virtual-tumor-board/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/
│   │   │   ├── (auth)/        # Authentication routes
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── patients/      # Patient management (EHR)
│   │   │   ├── tumor-board/   # TB session management
│   │   │   ├── case/          # Case presentation view
│   │   │   └── api/           # API routes
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn/ui components
│   │   │   ├── patient/       # Patient-specific components
│   │   │   ├── tumor-board/   # TB-specific components
│   │   │   ├── ehr/           # EHR components
│   │   │   └── agents/        # Agent visualization
│   │   └── lib/
│   │       ├── agents/        # Agent definitions & prompts
│   │       ├── orchestrator/  # Meta-orchestrator logic
│   │       ├── rag/           # RAG integration
│   │       ├── llm/           # LLM abstraction layer
│   │       └── utils/         # Utilities
│   │
│   └── mobile/                 # Future: React Native app
│
├── packages/
│   ├── agents/                 # Multi-agent system core
│   │   ├── src/
│   │   │   ├── orchestrator/  # Meta-orchestrator
│   │   │   ├── specialists/   # 7 specialist agents
│   │   │   ├── debate/        # Chain of Debate engine
│   │   │   └── consensus/     # Consensus building
│   │   └── prompts/           # Agent system prompts
│   │
│   ├── rag/                    # RAG system
│   │   ├── src/
│   │   │   ├── connectors/    # Connect to radonc_ka_cg RAG
│   │   │   ├── retrievers/    # Specialty-specific retrievers
│   │   │   └── grounding/     # Citation & grounding logic
│   │   └── guidelines/        # Local guideline cache
│   │
│   ├── ehr/                    # Minimalist EHR module
│   │   ├── src/
│   │   │   ├── patient/       # Patient registration
│   │   │   ├── staging/       # Cancer staging
│   │   │   ├── notes/         # Clinical notes
│   │   │   └── orders/        # Treatment orders
│   │   └── schemas/           # Data schemas
│   │
│   └── shared/                 # Shared types and utilities
│       ├── types/
│       └── utils/
│
├── services/
│   ├── literature-search/      # Semantic Scholar integration
│   └── clinical-trials/        # ClinicalTrials.gov integration
│
├── docs/                       # Documentation
├── papers/                     # Reference papers
└── scripts/                    # Build and utility scripts
```

---

## 3. Multi-Agent Orchestrator Design

### 3.1 Design Philosophy (Adapted from MAI-DxO)

The Virtual Tumor Board Orchestrator (VTB-O) adapts Microsoft's MAI-DxO architecture:

**Original MAI-DxO Roles**:
- Dr. Hypothesis (differential diagnosis)
- Dr. Test-Chooser (test selection)
- Dr. Challenger (devil's advocate)
- Dr. Stewardship (cost-conscious care)
- Dr. Checklist (quality control)

**VTB-O Adaptation for Oncology MDT**:
- 7 Specialist Agents (each representing an oncology sub-specialty)
- 1 Meta-Orchestrator (Conductor) that coordinates deliberation
- Structured "Chain of Debate" mechanism for reaching consensus

### 3.2 Orchestration Flow

```
                    ┌─────────────────────────────────────────┐
                    │         CASE SUBMISSION                 │
                    │  (Patient data + Clinical question)     │
                    └───────────────────┬─────────────────────┘
                                        │
                                        v
                    ┌─────────────────────────────────────────┐
                    │         META-ORCHESTRATOR               │
                    │         (Conductor Agent)               │
                    │                                         │
                    │  1. Parse case & identify question type │
                    │  2. Determine relevant specialties      │
                    │  3. Set deliberation parameters         │
                    │  4. Initialize agent contexts           │
                    └───────────────────┬─────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    v                   v                   v
    ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
    │ ROUND 1: Initial  │ │  (Parallel agent  │ │                   │
    │ Specialty Opinions│ │   consultations)  │ │                   │
    │                   │ │                   │ │                   │
    │ - Surgical Onc    │ │ - Radiation Onc   │ │ - Medical Onc     │
    │ - Radiologist     │ │ - Pathologist     │ │ - Geneticist      │
    │ - Palliative Care │ │                   │ │                   │
    └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
              │                     │                     │
              └──────────────────┬──┴──────────────────┬──┘
                                 │                     │
                                 v                     v
                    ┌─────────────────────────────────────────┐
                    │         ROUND 2: CHAIN OF DEBATE        │
                    │                                         │
                    │  - Cross-specialty review               │
                    │  - Challenge assumptions                │
                    │  - Identify conflicts                   │
                    │  - Propose resolutions                  │
                    └───────────────────┬─────────────────────┘
                                        │
                                        v
                    ┌─────────────────────────────────────────┐
                    │         ROUND 3: CONSENSUS              │
                    │                                         │
                    │  - Synthesize recommendations           │
                    │  - Document dissenting opinions         │
                    │  - Generate action items                │
                    │  - Cite guideline evidence              │
                    └───────────────────┬─────────────────────┘
                                        │
                                        v
                    ┌─────────────────────────────────────────┐
                    │         FINAL OUTPUT                    │
                    │                                         │
                    │  - Treatment recommendation             │
                    │  - Guideline concordance                │
                    │  - Action items by specialty            │
                    │  - Follow-up plan                       │
                    └─────────────────────────────────────────┘
```

### 3.3 Meta-Orchestrator (Conductor Agent)

**Role**: Coordinates the multi-agent deliberation, similar to a TB Chair

**Responsibilities**:
1. **Case Triage**: Determine case complexity and required specialties
2. **Context Distribution**: Provide relevant patient data to each agent
3. **Debate Moderation**: Guide structured deliberation rounds
4. **Conflict Resolution**: Identify and escalate disagreements
5. **Consensus Building**: Synthesize final recommendations
6. **Quality Assurance**: Ensure completeness and guideline grounding

**System Prompt Structure**:
```
You are the Tumor Board Conductor, coordinating a multidisciplinary 
oncology team discussion. Your role is to:

1. UNDERSTAND the clinical question and patient context
2. ACTIVATE relevant specialist agents based on case needs
3. MODERATE structured deliberation ensuring each specialty is heard
4. CHALLENGE assumptions by prompting cross-specialty review
5. SYNTHESIZE recommendations into actionable treatment plans
6. DOCUMENT dissenting opinions and uncertainty

Current Case Context:
{case_summary}

Required Specialists for This Case:
{activated_specialists}

Deliberation Phase:
{current_phase}
```

### 3.4 Chain of Debate Mechanism

Structured deliberation protocol ensuring systematic case review:

```typescript
interface DeliberationRound {
  phase: 'initial_opinions' | 'cross_review' | 'consensus';
  activeAgents: AgentId[];
  prompts: Map<AgentId, string>;
  responses: Map<AgentId, AgentResponse>;
  timeLimit: number; // seconds
}

interface ChainOfDebate {
  caseId: string;
  rounds: DeliberationRound[];
  conflicts: ConflictRecord[];
  consensus: ConsensusRecord | null;
  citations: Citation[];
}
```

---

## 4. Specialist Agent Personas

### 4.1 Agent Overview

| Agent | Specialty | Knowledge Source | Primary Questions |
|-------|-----------|------------------|-------------------|
| **Dr. Shalya** | Surgical Oncology | NCCN Surgical, Institutional SOPs | Resectability? Surgical approach? |
| **Dr. Chikitsa** | Medical Oncology | NCCN/ESMO Systemic Therapy | Chemo regimen? Targeted therapy? |
| **Dr. Kirann** | Radiation Oncology | ASTRO Guidelines | RT indicated? Technique? Dose? |
| **Dr. Shanti** | Palliative Care | NCCN Supportive Care | Symptom burden? Goals of care? |
| **Dr. Chitran** | Onco-Radiology | ACR Appropriateness | Imaging interpretation? Staging accuracy? |
| **Dr. Marga** | Pathology | CAP Protocols | Diagnosis confirmed? Biomarkers? |
| **Dr. Anuvamsha** | Genetics | ClinVar + CIViC | Actionable mutations? Hereditary risk? |

### 4.2 Detailed Agent Specifications

#### 4.2.1 Dr. Shalya - Surgical Oncologist

```yaml
Agent: Dr. Shalya
Specialty: Surgical Oncology
Personality: Pragmatic, outcomes-focused, considers functional preservation
RAG Source: NCCN (Surgical sections), Institutional surgical protocols
Indian Context:
  - Consider resource availability (robotic vs. open)
  - Account for patient travel burden for follow-up
  - Late-stage presentations common
  
System Prompt: |
  You are Dr. Shalya, a Surgical Oncologist on the tumor board.
  
  Your evaluation framework:
  1. RESECTABILITY: Is this surgically resectable? R0 possible?
  2. OPERABILITY: Patient fitness (ECOG, comorbidities)?
  3. TIMING: Upfront surgery vs. neoadjuvant approach?
  4. TECHNIQUE: Minimally invasive vs. open? Organ preservation?
  5. MARGINS: Required margins? Lymph node dissection extent?
  6. RECONSTRUCTION: Immediate vs. delayed? Options?
  
  For Indian context, also consider:
  - Equipment/expertise availability at patient's center
  - Patient's ability to travel for specialized surgery
  - Cost implications of different approaches
  
  Ground your recommendations in NCCN guidelines.
  Cite specific evidence levels when making recommendations.
```

#### 4.2.2 Dr. Chikitsa - Medical Oncologist

```yaml
Agent: Dr. Chikitsa
Specialty: Medical Oncology
Personality: Protocol-driven, evidence-focused, considers patient preferences
RAG Sources:
  - NCCN (Primary - detailed algorithms)
  - ESMO (Cross-reference for European perspective)
Indian Context:
  - Drug availability (many targeted agents expensive/unavailable)
  - Biosimilar availability
  - Out-of-pocket costs
  
System Prompt: |
  You are Dr. Chikitsa, a Medical Oncologist leading systemic therapy discussions.
  
  Your evaluation framework:
  1. STAGE & BIOMARKERS: Confirm staging, check all actionable biomarkers
  2. FIRST-LINE OPTIONS: Per NCCN/ESMO, what are category 1 options?
  3. SEQUENCE: Optimal treatment sequence if progression?
  4. TARGETED THERAPY: Any actionable mutations/biomarkers?
  5. IMMUNOTHERAPY: PD-L1 status? MSI status? TMB?
  6. CLINICAL TRIALS: Any appropriate trials available?
  
  For Indian context, consider:
  - Drug availability in India (check DCGI approvals)
  - Cost-effective alternatives (biosimilars, generics)
  - PMJAY/Ayushman Bharat coverage if applicable
  - Regional formulary constraints
  
  Primary guideline: NCCN
  Cross-reference: ESMO for resource-stratified recommendations
```

#### 4.2.3 Dr. Kirann - Radiation Oncologist

```yaml
Agent: Dr. Kirann
Specialty: Radiation Oncology
Personality: Technical, precision-focused, considers quality of life
RAG Source: ASTRO Guidelines, NCCN RT recommendations
Indian Context:
  - Machine availability (LINAC, Cobalt, Brachy)
  - Wait times for RT in public hospitals
  - Hypofractionation preference (fewer visits)
  
System Prompt: |
  You are Dr. Kirann, a Radiation Oncologist specializing in evidence-based RT.
  
  Your evaluation framework:
  1. RT INDICATION: Is RT indicated? Curative vs. palliative intent?
  2. TIMING: Definitive, adjuvant, neoadjuvant, or concurrent?
  3. TECHNIQUE: 3D-CRT, IMRT, VMAT, SBRT, SRS, Brachy?
  4. DOSE: Total dose and fractionation schedule?
  5. OAR CONSTRAINTS: Critical organs at risk and dose limits?
  6. SEQUENCING: Timing with surgery/systemic therapy?
  
  For Indian context:
  - Recommend hypofractionated regimens where appropriate
  - Consider Cobalt-60 alternatives if LINAC unavailable
  - Account for patient travel for daily fractions
  
  Primary guideline: ASTRO evidence-based guidelines
```

#### 4.2.4 Dr. Shanti - Palliative Care Specialist

```yaml
Agent: Dr. Shanti
Specialty: Palliative Care
Personality: Patient-centered, holistic, advocates for quality of life
RAG Source: NCCN Supportive Care, NCCN Palliative Care
Indian Context:
  - Often late-stage presentations
  - Cultural factors in end-of-life discussions
  - Home-based care needs
  
System Prompt: |
  You are Dr. Shanti, a Palliative Care Specialist ensuring patient comfort
  and quality of life are central to all treatment decisions.
  
  Your evaluation framework:
  1. SYMPTOM ASSESSMENT: Pain, nausea, fatigue, dyspnea, other symptoms?
  2. PERFORMANCE STATUS: Impact on daily function?
  3. GOALS OF CARE: Has this been discussed? Patient preferences?
  4. PROGNOSIS: Honest prognostic estimation needed?
  5. SUPPORTIVE CARE: Symptom management during treatment?
  6. PSYCHOSOCIAL: Patient/family coping, spiritual needs?
  
  For Indian context:
  - Family involvement in decision-making (often joint decisions)
  - Home care feasibility (caregiver availability)
  - Opioid access concerns in India
  - Cultural/religious preferences at end of life
  
  You advocate for the patient's quality of life in all deliberations.
```

#### 4.2.5 Dr. Chitran - Onco-Radiologist

```yaml
Agent: Dr. Chitran
Specialty: Oncologic Radiology
Personality: Detail-oriented, systematic, correlation-focused
RAG Source: ACR Appropriateness Criteria, RECIST/iRECIST criteria
Indian Context:
  - Variable imaging quality
  - PET-CT access limited outside metros
  
System Prompt: |
  You are Dr. Chitran, an Oncologic Radiologist interpreting imaging for staging,
  response assessment, and surveillance.
  
  Your evaluation framework:
  1. STAGING IMAGING: Is staging complete? Any additional imaging needed?
  2. REPORT REVIEW: Key findings, measurements, comparison to prior?
  3. RESPONSE ASSESSMENT: Per RECIST 1.1/iRECIST criteria?
  4. ANATOMIC DETAIL: Surgical planning considerations?
  5. SUSPICIOUS FINDINGS: Any concerning areas needing biopsy?
  6. FOLLOW-UP IMAGING: Recommended surveillance protocol?
  
  For Indian context:
  - Acknowledge variable MRI/PET-CT availability
  - Suggest contrast-enhanced CT alternatives when PET unavailable
  - Consider cost-effective surveillance strategies
  
  Primary guideline: ACR Appropriateness Criteria
```

#### 4.2.6 Dr. Marga - Pathologist

```yaml
Agent: Dr. Marga
Specialty: Anatomic/Molecular Pathology
Personality: Precise, classification-focused, biomarker expert
RAG Source: CAP Cancer Protocols, WHO Classification
Indian Context:
  - IHC availability variable
  - NGS limited to major centers
  
System Prompt: |
  You are Dr. Marga, a Pathologist ensuring diagnostic accuracy and
  complete biomarker characterization.
  
  Your evaluation framework:
  1. DIAGNOSIS: Is the histologic diagnosis definitive?
  2. GRADE: Tumor grade and differentiation?
  3. STAGE (pathologic): pT, pN, margins, LVI, PNI?
  4. BIOMARKERS: All required IHC/FISH/NGS completed?
  5. ADDITIONAL TESTING: Any further tests needed?
  6. SECOND OPINION: Complex case requiring external review?
  
  For Indian context:
  - Check if IHC panel is complete (often incomplete)
  - Recommend essential vs. optional biomarkers
  - Consider cost-effective panel strategies
  - Note if NGS available or refer out
  
  Primary protocol: CAP Cancer Protocols
```

#### 4.2.7 Dr. Anuvamsha - Clinical Geneticist

```yaml
Agent: Dr. Anuvamsha
Specialty: Cancer Genetics / Molecular Oncology
Personality: Analytical, family-focused, precision medicine advocate
RAG Source: ClinVar, CIViC, NCCN Genetic/Familial High-Risk
Indian Context:
  - Genetic testing access limited
  - Founder mutations in certain populations
  
System Prompt: |
  You are Dr. Anuvamsha, a Clinical Geneticist/Molecular Oncologist 
  advising on hereditary risk and targeted therapy implications.
  
  Your evaluation framework:
  1. SOMATIC MUTATIONS: Actionable alterations for targeted therapy?
  2. GERMLINE TESTING: Criteria met? Which genes to test?
  3. VARIANT INTERPRETATION: Pathogenic, VUS, benign per ClinVar/CIViC?
  4. THERAPEUTIC IMPLICATIONS: FDA/DCGI approved targeted agents?
  5. FAMILY IMPLICATIONS: Cascade testing recommendations?
  6. CLINICAL TRIALS: Mutation-matched trial options?
  
  For Indian context:
  - BRCA founder mutations in Parsi/Marwari communities
  - Limited germline testing access outside metros
  - Cost considerations for comprehensive panels
  - Recommend prioritized gene lists
  
  Primary databases: ClinVar + CIViC for variant interpretation
```

---

## 5. RAG Integration Strategy

### 5.1 Leveraging Existing radonc_ka_cg Infrastructure

The existing `radonc_ka_cg` project provides a mature RAG infrastructure:

**Available RAG Sources**:
| Source | Directory | Description |
|--------|-----------|-------------|
| NCCN | `/nccn` (76 items) | Complete NCCN guidelines |
| ACR | `/acr` (42 items) | ACR Appropriateness Criteria |
| ASTRO | `/astro` (20 items) | ASTRO evidence-based guidelines |
| ESMO | `/esmo` (8 items) | ESMO guidelines |
| CAP | `/cap` (16 items) | CAP cancer protocols |
| CIViC | `/civic` (7 items) | Clinical variant database |
| ClinVar | `/clinvar` (5 items) | Genetic variant database |

**Technical Implementation**:
- Gemini File Search API for vector retrieval
- Per-specialty file search configurations
- Citation tracking with source documents

### 5.2 Integration Architecture

```typescript
// rag-connector.ts
import { 
  buildLegacyNCCNContext, 
  getFileSearchToolConfig 
} from '@radonc_ka_cg/lib/nccn';
import { getACRFileSearchToolConfig } from '@radonc_ka_cg/lib/acr';
import { getASTROContext } from '@radonc_ka_cg/lib/astro';
// ... other imports

interface RAGConfig {
  agent: AgentId;
  primarySource: GuidelineSource;
  secondarySources: GuidelineSource[];
  contextWindow: number;
  citationRequired: boolean;
}

const AGENT_RAG_CONFIG: Record<AgentId, RAGConfig> = {
  'surgical-oncologist': {
    agent: 'surgical-oncologist',
    primarySource: 'nccn',
    secondarySources: [],
    contextWindow: 8000,
    citationRequired: true,
  },
  'medical-oncologist': {
    agent: 'medical-oncologist',
    primarySource: 'nccn',
    secondarySources: ['esmo'],
    contextWindow: 12000,
    citationRequired: true,
  },
  'radiation-oncologist': {
    agent: 'radiation-oncologist',
    primarySource: 'astro',
    secondarySources: ['nccn'],
    contextWindow: 8000,
    citationRequired: true,
  },
  'radiologist': {
    agent: 'radiologist',
    primarySource: 'acr',
    secondarySources: [],
    contextWindow: 6000,
    citationRequired: true,
  },
  'pathologist': {
    agent: 'pathologist',
    primarySource: 'cap',
    secondarySources: [],
    contextWindow: 6000,
    citationRequired: true,
  },
  'geneticist': {
    agent: 'geneticist',
    primarySource: 'clinvar',
    secondarySources: ['civic'],
    contextWindow: 6000,
    citationRequired: true,
  },
  'palliative': {
    agent: 'palliative',
    primarySource: 'nccn', // Supportive care guidelines
    secondarySources: [],
    contextWindow: 6000,
    citationRequired: true,
  },
};
```

### 5.3 Literature Search Integration (Semantic Scholar)

```typescript
// services/literature-search/semantic-scholar.ts

const S2_API_KEY = process.env.S2_API_KEY; // 5Jpny5JJeT5huCtZZRnnl1RCZULBJrcn7hvhTv3T

interface S2SearchParams {
  query: string;
  cancerType?: string;
  year?: { min?: number; max?: number };
  fields?: string[];
  limit?: number;
}

interface S2Paper {
  paperId: string;
  title: string;
  abstract: string;
  year: number;
  citationCount: number;
  authors: { name: string }[];
  journal?: { name: string };
  url: string;
}

async function searchRelevantLiterature(params: S2SearchParams): Promise<S2Paper[]> {
  const response = await fetch(
    'https://api.semanticscholar.org/graph/v1/paper/search',
    {
      method: 'GET',
      headers: {
        'x-api-key': S2_API_KEY,
      },
      // ... params
    }
  );
  // Parse and return results
}
```

---

## 6. Minimalist Oncology EHR Module

### 6.1 Design Philosophy

**Problem**: Most Indian oncology departments lack dedicated oncology EHRs, relying on paper records or generic hospital information systems.

**Solution**: Build a lightweight, oncology-specific EHR that covers essential workflows without the complexity of full EMR systems.

**Design Principles**:
1. **Minimal Data Entry**: Auto-extract from uploaded documents where possible
2. **Oncology-Native**: Data model built around cancer care workflow
3. **Tumor Board Integration**: Seamless case submission to TB
4. **Offline-Capable**: Works with intermittent connectivity
5. **Export-Friendly**: Generate reports, export to hospital HIS

### 6.2 Core EHR Functions

```
+------------------+     +------------------+     +------------------+
|   REGISTRATION   | --> |     WORKUP       | --> |    STAGING       |
|                  |     |                  |     |                  |
| - Demographics   |     | - Imaging        |     | - TNM Staging    |
| - Contact        |     | - Pathology      |     | - Composite      |
| - Insurance      |     | - Labs           |     |   Stage Group    |
| - Referral       |     | - Biomarkers     |     | - Prognostic     |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         v                       v                       v
+------------------+     +------------------+     +------------------+
|   TUMOR BOARD    | --> |   TREATMENT      | --> |   FOLLOW-UP      |
|                  |     |                  |     |                  |
| - Case Submit    |     | - Surgery Rx     |     | - Surveillance   |
| - TB Discussion  |     | - Chemo Orders   |     | - Response       |
| - Recommendations|     | - RT Plan        |     | - Recurrence     |
+------------------+     +------------------+     +------------------+
```

### 6.3 Data Model

```typescript
// packages/ehr/schemas/patient.ts

interface Patient {
  id: string;
  mrn: string; // Hospital MRN
  demographics: {
    name: { first: string; middle?: string; last: string };
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    contact: {
      phone: string;
      alternatePhone?: string;
      email?: string;
      address: Address;
    };
    identifiers: {
      aadhaar?: string; // Masked
      healthId?: string; // ABHA
    };
  };
  insurance: {
    type: 'ayushman_bharat' | 'cghs' | 'esis' | 'private' | 'self_pay';
    policyNumber?: string;
    provider?: string;
  };
}

interface CancerDiagnosis {
  id: string;
  patientId: string;
  primarySite: ICDOCode; // ICD-O-3 topography
  histology: ICDOCode;   // ICD-O-3 morphology
  diagnosisDate: Date;
  laterality?: 'left' | 'right' | 'bilateral' | 'na';
  stage: {
    clinical: TNMStage;
    pathological?: TNMStage;
    composite: StageGroup;
    stagingSystem: 'ajcc8' | 'figo' | 'other';
  };
  biomarkers: Biomarker[];
  genomics?: GenomicProfile;
}

interface TumorBoardCase {
  id: string;
  patientId: string;
  diagnosisId: string;
  submittedBy: UserId;
  submittedAt: Date;
  clinicalQuestion: string;
  priority: 'urgent' | 'routine';
  status: 'pending' | 'scheduled' | 'discussed' | 'completed';
  scheduledMeeting?: TumorBoardMeetingId;
  documents: DocumentReference[];
  aiDeliberation?: DeliberationRecord;
  humanRecommendation?: TreatmentPlan;
}

interface TreatmentPlan {
  id: string;
  caseId: string;
  intent: 'curative' | 'palliative';
  components: TreatmentComponent[];
  guidelineReference: Citation[];
  discussedAt: Date;
  attendees: UserId[];
  decisionNotes: string;
  followUpPlan: string;
}
```

### 6.4 Key EHR Screens

1. **Patient Worklist** - Active patients dashboard with status indicators
2. **Patient Chart** - Single-page overview of patient oncology journey
3. **Document Upload** - Drag-drop with auto-extraction
4. **Staging Calculator** - Interactive TNM staging with edition selection
5. **TB Case Submission** - Guided form with document attachment
6. **Treatment Orders** - Chemotherapy/RT order templates

---

## 7. UI/UX Design Principles

### 7.1 Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Minimal Clicks** | Any common action achievable in ≤3 clicks |
| **Information Density** | Show relevant info without scrolling |
| **Progressive Disclosure** | Summary first, details on demand |
| **Keyboard Navigation** | Power users can navigate without mouse |
| **Mobile-Responsive** | Usable on tablets during rounds |
| **Color Coding** | Consistent semantic colors for status/urgency |

### 7.2 Primary Navigation

```
+------------------------------------------------------------------------+
|  [Logo] Virtual Tumor Board        [Search...]     [Notifications] [User]|
+------------------------------------------------------------------------+
|                                                                          |
|  [Dashboard] [Patients] [Tumor Board] [Schedule] [Reports] [Settings]    |
|                                                                          |
+------------------------------------------------------------------------+
|                                                                          |
|                          MAIN CONTENT AREA                               |
|                                                                          |
+------------------------------------------------------------------------+
```

### 7.3 Key UI Components

#### Case Presentation View (Single-Pane Focus)

```
+------------------------------------------------------------------------+
| CASE: Rajesh Kumar, 58M | Lung Adenocarcinoma Stage IIIA | TB: 24-Jan   |
+------------------------------------------------------------------------+
| [Summary] [Pathology] [Radiology] [Labs] [Genomics] [Prior Tx] [Docs]   |
+------------------------------------------------------------------------+
|                                                                          |
|  CLINICAL SUMMARY                       |  STAGING                       |
|  ──────────────────                     |  ────────                       |
|  Chief Complaint: Cough, hemoptysis     |  cT2bN2M0 - Stage IIIA         |
|  Duration: 3 months                     |                                 |
|  ECOG PS: 1                             |  BIOMARKERS                     |
|  Smoking: 30 pack-years, quit 5y        |  ──────────                     |
|                                         |  EGFR: Negative                 |
|  KEY IMAGING FINDINGS                   |  ALK: Negative                  |
|  ─────────────────────                  |  PDL1: 60%                      |
|  RUL mass 4.2cm                         |  KRAS G12C: Positive            |
|  Mediastinal LN 4R, 7 (>1cm)            |                                 |
|  No distant mets on PET-CT              |                                 |
|                                         |                                 |
+------------------------------------------------------------------------+
|  CLINICAL QUESTION                                                       |
|  ─────────────────                                                       |
|  Is this patient a candidate for definitive chemoRT vs surgery?          |
|  Should we add immunotherapy?                                            |
+------------------------------------------------------------------------+
|                                                                          |
|  [Start AI Deliberation]    [Add to Meeting Agenda]    [Edit Case]       |
|                                                                          |
+------------------------------------------------------------------------+
```

#### AI Deliberation View (Multi-Agent Visualization)

```
+------------------------------------------------------------------------+
| AI TUMOR BOARD DELIBERATION - Rajesh Kumar                              |
+------------------------------------------------------------------------+
|                                                                          |
|  ROUND 1: SPECIALIST OPINIONS                           [In Progress]    |
|  ─────────────────────────────                                          |
|                                                                          |
|  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ |
|  │ Dr. Shalya   │  │ Dr. Chikitsa │  │ Dr. Kirann   │  │ Dr. Shanti   │ |
|  │ Surgical Onc │  │ Medical Onc  │  │ Radiation Onc│  │ Palliative   │ |
|  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤ |
|  │ Borderline   │  │ ChemoRT +    │  │ Definitive   │  │ Symptom      │ |
|  │ resectable.  │  │ Durvalumab   │  │ CRT with     │  │ control good.│ |
|  │ Consider tri-│  │ consolidation│  │ concurrent   │  │ Goals of care│ |
|  │ modality if  │  │ per NCCN     │  │ chemo per    │  │ discussed.   │ |
|  │ good PS...   │  │ NSCLC-12...  │  │ ASTRO...     │  │ Proceed.     │ |
|  │              │  │              │  │              │  │              │ |
|  │ [NCCN 2.2025]│  │ [NCCN 2.2025]│  │ [ASTRO 2024] │  │ [NCCN Pall]  │ |
|  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ |
|                                                                          |
|  ROUND 2: CHAIN OF DEBATE                               [Waiting]        |
|  ─────────────────────────                                              |
|                                                                          |
|  CONSENSUS RECOMMENDATION                               [Waiting]        |
|  ────────────────────────                                               |
|                                                                          |
+------------------------------------------------------------------------+
|  [Pause] [Skip to Consensus] [Add Human Comment] [Override]              |
+------------------------------------------------------------------------+
```

### 7.4 Mobile/Tablet View

For ward rounds on tablets, provide a simplified view:
- Patient list with swipe actions
- Quick case summary cards
- Voice note capability
- Barcode/QR scanning for patient lookup

---

## 8. Indian Context Adaptations

### 8.1 Healthcare System Considerations

| Factor | Adaptation |
|--------|------------|
| **Late-stage presentations** | Default to stage III-IV focused guidelines |
| **Resource variability** | Show alternatives when preferred option unavailable |
| **Cost sensitivity** | Display cost estimates, generic/biosimilar options |
| **Insurance fragmentation** | Support multiple insurance categories |
| **Language diversity** | UI in English, patient materials multilingual |
| **Travel burden** | Favor hypofractionation, minimize visits |

### 8.2 Typical Indian Tertiary Oncology Center Workflow

Based on institutions like Tata Memorial Hospital (TMH), Max Healthcare, Cancer Institute Adyar:

```
DAY 1: Registration
  └─> OPD Consultation (Medical/Surgical Onc)
       └─> Investigations ordered (Labs, Imaging, Biopsy)

DAY 2-7: Workup
  └─> Reports collected
       └─> Data entry (often manual)

WEEK 2: Tumor Board
  └─> Case presentation (often paper-based)
       └─> MDT discussion (30+ cases/session)
            └─> Treatment plan documented

WEEK 2+: Treatment
  └─> Surgery / Chemo / RT as per plan
       └─> Follow-up scheduled
```

### 8.3 Indian-Specific Data Fields

```typescript
interface IndianPatientExtension {
  // Government schemes
  ayushmanBharatId?: string;
  cghsNumber?: string;
  esicNumber?: string;
  
  // Regional identifiers
  abhaId?: string; // Ayushman Bharat Health Account
  
  // Geographic
  state: IndianState;
  district: string;
  
  // Social factors
  primaryLanguage: IndianLanguage;
  literacyLevel: 'literate' | 'semi_literate' | 'illiterate';
  
  // Economic
  bplCard?: boolean; // Below Poverty Line
  incomeCategory?: 'bpl' | 'lower_middle' | 'middle' | 'upper';
}

type IndianLanguage = 
  | 'english' | 'hindi' | 'tamil' | 'telugu' 
  | 'marathi' | 'bengali' | 'gujarati' | 'kannada'
  | 'malayalam' | 'punjabi' | 'odia';

type IndianState = 
  | 'AN' | 'AP' | 'AR' | 'AS' | 'BR' | 'CH' | 'CT' | 'DL' 
  | 'GA' | 'GJ' | 'HR' | 'HP' | 'JK' | 'JH' | 'KA' | 'KL'
  | 'LA' | 'LD' | 'MP' | 'MH' | 'MN' | 'ML' | 'MZ' | 'NL'
  | 'OR' | 'PY' | 'PB' | 'RJ' | 'SK' | 'TN' | 'TG' | 'TR'
  | 'UP' | 'UK' | 'WB';
```

### 8.4 Drug Availability Database

Integrate with DCGI approvals and availability:

```typescript
interface DrugAvailability {
  genericName: string;
  brandNames: { name: string; manufacturer: string; price: number }[];
  dcgiApproved: boolean;
  pmjayListed: boolean;
  biosimilarAvailable: boolean;
  genericsAvailable: boolean;
  estimatedMonthlyCost: {
    innovator?: number;
    biosimilar?: number;
    generic?: number;
  };
}
```

---

## 9. Technical Stack

### 9.1 Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 15 (App Router) | SSR, API routes, proven in radonc_ka_cg |
| UI Library | React 19 | Latest features |
| Styling | Tailwind CSS 4 + shadcn/ui | Rapid development, consistent design |
| State | Zustand + React Query | Simple, performant |
| Forms | React Hook Form + Zod | Type-safe validation |
| Charts | Recharts | Tumor response visualization |
| PDF | @react-pdf/renderer | Report generation |

### 9.2 Backend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API | Next.js API Routes | Unified deployment |
| Database | PostgreSQL (Supabase) | Relational data, row-level security |
| Auth | Supabase Auth | Easy integration, row-level security |
| File Storage | Supabase Storage | HIPAA-compliant file handling |
| Caching | Vercel KV (Redis) | Session, rate limiting |
| Search | PostgreSQL Full-Text + pg_trgm | Patient search |

### 9.3 AI/ML

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Primary LLM | Claude 3.5 Sonnet | Best reasoning, cost-effective |
| Backup LLM | Gemini 2.5 Flash | Fast, multimodal |
| RAG | Gemini File Search | Existing infrastructure |
| Embeddings | Gemini Embeddings | Consistency with RAG |
| OCR | Gemini Vision / Tesseract | Document extraction |

### 9.4 Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Hosting | Vercel | Easy deployment, edge functions |
| Database | Supabase | Managed PostgreSQL |
| CDN | Vercel Edge | Fast global delivery |
| Monitoring | Vercel Analytics + Sentry | Performance, errors |
| CI/CD | GitHub Actions | Automated testing, deployment |

### 9.5 Claude SDK Integration Strategy

The multi-agent orchestrator benefits significantly from Claude's SDK features. This section details how to leverage Claude's advanced capabilities for optimal performance, cost efficiency, and architectural elegance.

#### 9.5.1 Tool Use for Specialist Agents

Each specialist agent has access to specialty-specific tools for RAG retrieval, literature search, staging calculations, and drug database lookups.

**Architecture Overview**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLAUDE TOOL USE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐       │
│  │  Dr. Shalya    │     │  Dr. Chikitsa  │     │  Dr. Kirann    │       │
│  │  (Surgical)    │     │  (Medical Onc) │     │  (Radiation)   │       │
│  └───────┬────────┘     └───────┬────────┘     └───────┬────────┘       │
│          │                      │                      │                │
│          ▼                      ▼                      ▼                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     TOOL DEFINITIONS                            │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │  • rag_retrieve      - Fetch guidelines by specialty            │    │
│  │  • literature_search - Query Semantic Scholar                   │    │
│  │  • staging_calculator - Compute TNM/composite stage             │    │
│  │  • drug_lookup       - Check availability, cost, DCGI status    │    │
│  │  • trial_search      - Query ClinicalTrials.gov + CTRI          │    │
│  │  • biomarker_interpret - ClinVar/CIViC variant annotation       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Tool Definitions (TypeScript)**:

```typescript
// packages/agents/src/tools/definitions.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * RAG Retrieval Tool - Fetches guideline content from indexed sources
 */
export const ragRetrieveTool: Anthropic.Messages.Tool = {
  name: "rag_retrieve",
  description: `Retrieve clinical guideline content from indexed sources.
    Sources: NCCN, ESMO, ASTRO, ACR, CAP, ClinVar, CIViC.
    Use this to ground recommendations in evidence-based guidelines.
    Always cite the source and section in your response.`,
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The clinical question or topic to search for",
      },
      source: {
        type: "string",
        enum: ["nccn", "esmo", "astro", "acr", "cap", "clinvar", "civic"],
        description: "Primary guideline source to search",
      },
      cancer_type: {
        type: "string",
        description: "Cancer type (e.g., 'breast', 'lung_nsclc', 'colorectal')",
      },
      max_results: {
        type: "number",
        description: "Maximum number of relevant sections to return (default: 5)",
      },
    },
    required: ["query", "source"],
  },
};

/**
 * Literature Search Tool - Queries Semantic Scholar API
 */
export const literatureSearchTool: Anthropic.Messages.Tool = {
  name: "literature_search",
  description: `Search medical literature via Semantic Scholar.
    200M+ papers indexed. Use for recent research, clinical trials results,
    and evidence not yet in guidelines. Prioritize high-citation papers.`,
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query (e.g., 'KRAS G12C sotorasib lung adenocarcinoma')",
      },
      year_min: {
        type: "number",
        description: "Minimum publication year (e.g., 2022)",
      },
      year_max: {
        type: "number",
        description: "Maximum publication year",
      },
      limit: {
        type: "number",
        description: "Number of papers to return (default: 10, max: 50)",
      },
      fields_of_study: {
        type: "array",
        items: { type: "string" },
        description: "Filter by field (e.g., ['Medicine', 'Biology'])",
      },
    },
    required: ["query"],
  },
};

/**
 * TNM Staging Calculator Tool
 */
export const stagingCalculatorTool: Anthropic.Messages.Tool = {
  name: "staging_calculator",
  description: `Calculate TNM stage and composite stage group.
    Supports AJCC 8th edition for all major cancer types.
    Returns stage group, prognostic factors, and guideline references.`,
  input_schema: {
    type: "object" as const,
    properties: {
      cancer_type: {
        type: "string",
        description: "Cancer type (e.g., 'lung_nsclc', 'breast', 'colorectal')",
      },
      t_stage: {
        type: "string",
        description: "T component (e.g., 'T2b', 'T3', 'Tis')",
      },
      n_stage: {
        type: "string",
        description: "N component (e.g., 'N0', 'N2', 'N3')",
      },
      m_stage: {
        type: "string",
        description: "M component (e.g., 'M0', 'M1a', 'M1b')",
      },
      additional_factors: {
        type: "object",
        description: "Cancer-specific factors (e.g., grade, ER/PR/HER2 for breast)",
      },
    },
    required: ["cancer_type", "t_stage", "n_stage", "m_stage"],
  },
};

/**
 * Drug Lookup Tool - Indian context drug availability and cost
 */
export const drugLookupTool: Anthropic.Messages.Tool = {
  name: "drug_lookup",
  description: `Look up oncology drug availability in India.
    Returns: DCGI approval status, brand names, biosimilar availability,
    estimated cost (innovator vs biosimilar vs generic), PMJAY coverage.
    Use this when recommending systemic therapy to check feasibility.`,
  input_schema: {
    type: "object" as const,
    properties: {
      drug_name: {
        type: "string",
        description: "Generic drug name (e.g., 'pembrolizumab', 'osimertinib')",
      },
      indication: {
        type: "string",
        description: "Cancer indication for which drug is being considered",
      },
      include_alternatives: {
        type: "boolean",
        description: "Include therapeutic alternatives if primary not available",
      },
    },
    required: ["drug_name"],
  },
};

/**
 * Clinical Trial Search Tool
 */
export const trialSearchTool: Anthropic.Messages.Tool = {
  name: "trial_search",
  description: `Search for clinical trials matching patient profile.
    Searches ClinicalTrials.gov and CTRI (Clinical Trials Registry India).
    Returns actively recruiting trials with eligibility criteria summary.`,
  input_schema: {
    type: "object" as const,
    properties: {
      condition: {
        type: "string",
        description: "Cancer condition (e.g., 'non-small cell lung cancer')",
      },
      biomarkers: {
        type: "array",
        items: { type: "string" },
        description: "Relevant biomarkers (e.g., ['EGFR+', 'PDL1 >50%'])",
      },
      stage: {
        type: "string",
        description: "Cancer stage (e.g., 'Stage IIIA', 'Metastatic')",
      },
      location: {
        type: "string",
        description: "Location filter (e.g., 'India', 'Mumbai')",
      },
      phase: {
        type: "array",
        items: { type: "string" },
        description: "Trial phases to include (e.g., ['Phase 2', 'Phase 3'])",
      },
    },
    required: ["condition"],
  },
};

/**
 * Biomarker Interpretation Tool
 */
export const biomarkerInterpretTool: Anthropic.Messages.Tool = {
  name: "biomarker_interpret",
  description: `Interpret genetic variants and biomarkers using ClinVar and CIViC.
    Returns: pathogenicity classification, therapeutic implications,
    FDA/DCGI approved targeted therapies, and clinical actionability.`,
  input_schema: {
    type: "object" as const,
    properties: {
      gene: {
        type: "string",
        description: "Gene name (e.g., 'EGFR', 'BRCA1', 'KRAS')",
      },
      variant: {
        type: "string",
        description: "Variant notation (e.g., 'L858R', 'G12C', 'exon 19 deletion')",
      },
      cancer_type: {
        type: "string",
        description: "Cancer context for interpretation",
      },
      include_clinical_trials: {
        type: "boolean",
        description: "Include mutation-matched clinical trials",
      },
    },
    required: ["gene", "variant"],
  },
};

/**
 * Agent-specific tool configurations
 */
export const AGENT_TOOLS: Record<string, Anthropic.Messages.Tool[]> = {
  "surgical-oncologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
    literatureSearchTool,
  ],
  "medical-oncologist": [
    ragRetrieveTool,
    literatureSearchTool,
    drugLookupTool,
    trialSearchTool,
    biomarkerInterpretTool,
  ],
  "radiation-oncologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
    literatureSearchTool,
  ],
  "palliative-care": [
    ragRetrieveTool,
    drugLookupTool,
  ],
  "radiologist": [
    ragRetrieveTool,
    stagingCalculatorTool,
  ],
  "pathologist": [
    ragRetrieveTool,
    biomarkerInterpretTool,
  ],
  "geneticist": [
    ragRetrieveTool,
    biomarkerInterpretTool,
    trialSearchTool,
    literatureSearchTool,
  ],
};
```

**Tool Execution Handler**:

```typescript
// packages/agents/src/tools/executor.ts

import Anthropic from "@anthropic-ai/sdk";

type ToolInput = Record<string, unknown>;

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  citations?: Citation[];
}

/**
 * Execute a tool call and return structured result
 */
export async function executeToolCall(
  toolName: string,
  toolInput: ToolInput
): Promise<ToolResult> {
  switch (toolName) {
    case "rag_retrieve":
      return await executeRAGRetrieve(toolInput);
    case "literature_search":
      return await executeLiteratureSearch(toolInput);
    case "staging_calculator":
      return await executeStagingCalculator(toolInput);
    case "drug_lookup":
      return await executeDrugLookup(toolInput);
    case "trial_search":
      return await executeTrialSearch(toolInput);
    case "biomarker_interpret":
      return await executeBiomarkerInterpret(toolInput);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Process tool use in agent response and continue conversation
 */
export async function processAgentToolUse(
  client: Anthropic,
  response: Anthropic.Messages.Message,
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string,
  tools: Anthropic.Messages.Tool[]
): Promise<Anthropic.Messages.Message> {
  // Check if response has tool use
  if (response.stop_reason !== "tool_use") {
    return response;
  }

  // Extract tool use blocks
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.Messages.ToolUseBlock =>
      block.type === "tool_use"
  );

  // Execute all tool calls in parallel
  const toolResults = await Promise.all(
    toolUseBlocks.map(async (toolUse) => {
      const result = await executeToolCall(
        toolUse.name,
        toolUse.input as ToolInput
      );
      return {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      };
    })
  );

  // Continue conversation with tool results
  const updatedMessages: Anthropic.Messages.MessageParam[] = [
    ...messages,
    { role: "assistant", content: response.content },
    { role: "user", content: toolResults },
  ];

  // Get final response
  const finalResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages: updatedMessages,
  });

  // Recursively process if more tool calls
  if (finalResponse.stop_reason === "tool_use") {
    return processAgentToolUse(
      client,
      finalResponse,
      updatedMessages,
      systemPrompt,
      tools
    );
  }

  return finalResponse;
}
```

#### 9.5.2 Prompt Caching for Guideline Contexts

Prompt caching provides **90% cost reduction** for repeated guideline contexts. This is critical for tumor board sessions where multiple agents reference the same guidelines.

**Caching Strategy**:

| Cache Target | Size Estimate | TTL | Cost Savings |
|--------------|---------------|-----|--------------|
| NCCN Guidelines (per cancer type) | ~80K tokens | 1 hour | 90% on cache hits |
| ESMO Guidelines | ~40K tokens | 1 hour | 90% |
| Agent System Prompts | ~2K tokens each | 1 hour | 90% |
| Patient Case Context | ~5K tokens | 5 min | 90% |
| Tool Definitions | ~3K tokens | 1 hour | 90% |

**Implementation**:

```typescript
// packages/agents/src/caching/prompt-cache.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * Cache breakpoints for different content types
 * Content marked with cache_control will be cached for the specified TTL
 */

interface CachedSystemPrompt {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Build a cacheable system prompt with guidelines
 * Guidelines are marked for caching (1-hour TTL for ephemeral)
 */
export function buildCachedSystemPrompt(
  agentPersona: string,
  guidelineContext: string,
  caseContext: string
): CachedSystemPrompt[] {
  return [
    // Static agent persona - cached (changes rarely)
    {
      type: "text",
      text: agentPersona,
      cache_control: { type: "ephemeral" }, // 1-hour TTL
    },
    // Guidelines - cached (large, expensive, reusable)
    {
      type: "text",
      text: `\n\n## CLINICAL GUIDELINES CONTEXT\n\n${guidelineContext}`,
      cache_control: { type: "ephemeral" }, // 1-hour TTL
    },
    // Case-specific context - not cached (unique per case)
    {
      type: "text",
      text: `\n\n## CURRENT CASE\n\n${caseContext}`,
      // No cache_control - computed fresh each time
    },
  ];
}

/**
 * Example: Create Medical Oncologist consultation with caching
 */
export async function createMedicalOncologistConsultation(
  client: Anthropic,
  cancerType: string,
  caseData: CaseData
): Promise<Anthropic.Messages.Message> {
  // Load guidelines (these will be cached on first call)
  const nccnGuidelines = await loadNCCNGuidelines(cancerType);
  const esmoGuidelines = await loadESMOGuidelines(cancerType);
  
  const guidelineContext = `
### NCCN ${cancerType.toUpperCase()} Guidelines (v2.2025)
${nccnGuidelines}

### ESMO ${cancerType.toUpperCase()} Guidelines (2024)
${esmoGuidelines}
  `.trim();

  // Build cacheable system prompt
  const systemPromptParts = buildCachedSystemPrompt(
    MEDICAL_ONCOLOGIST_PERSONA,
    guidelineContext,
    formatCaseForAgent(caseData)
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    // System prompt with cache control
    system: systemPromptParts,
    tools: AGENT_TOOLS["medical-oncologist"],
    messages: [
      {
        role: "user",
        content: `Please provide your Medical Oncology assessment for this case.
        
Consider:
1. Biomarker-driven therapy options
2. Guideline-concordant first-line recommendations
3. Cost-effective alternatives available in India
4. Clinical trial eligibility

Ground your recommendations in NCCN/ESMO guidelines with specific citations.`,
      },
    ],
  });

  // Log cache performance
  console.log("Cache stats:", {
    input_tokens: response.usage.input_tokens,
    cache_read_tokens: response.usage.cache_read_input_tokens,
    cache_creation_tokens: response.usage.cache_creation_input_tokens,
    cache_hit_rate: response.usage.cache_read_input_tokens 
      ? (response.usage.cache_read_input_tokens / response.usage.input_tokens * 100).toFixed(1) + "%"
      : "0%",
  });

  return response;
}

/**
 * Cost calculation with caching
 * 
 * Without caching (7 agents × 100K guideline tokens):
 *   7 × 100,000 × $0.003/1K = $2.10 per case
 * 
 * With caching (first agent creates cache, 6 agents read):
 *   1 × 100,000 × $0.00375/1K (write) + 6 × 100,000 × $0.0003/1K (read)
 *   = $0.375 + $0.18 = $0.555 per case
 * 
 * SAVINGS: 74% on first case, 90%+ on subsequent cases in same session
 */
```

**Cache Warming Strategy**:

```typescript
// packages/agents/src/caching/cache-warmer.ts

/**
 * Pre-warm caches at the start of a tumor board session
 * This ensures all agents benefit from cache hits on their first call
 */
export async function warmCachesForTumorBoard(
  client: Anthropic,
  cancerTypes: string[]
): Promise<void> {
  console.log("Warming caches for tumor board session...");
  
  // Warm guideline caches for each cancer type that will be discussed
  for (const cancerType of cancerTypes) {
    // Single "dummy" call to create cache entries
    await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10, // Minimal output
      system: [
        {
          type: "text",
          text: await loadNCCNGuidelines(cancerType),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: await loadESMOGuidelines(cancerType),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: await loadASTROGuidelines(cancerType),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: "Acknowledge." }],
    });
    
    console.log(`  ✓ Cached guidelines for ${cancerType}`);
  }
  
  console.log("Cache warming complete. Guidelines cached for 1 hour.");
}
```

#### 9.5.3 Message Batches API for Parallel Consultations

The Message Batches API provides **50% cost reduction** and is perfect for Round 1 "Initial Opinions" where all 7 specialists respond independently.

**Batch Processing Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROUND 1: PARALLEL CONSULTATIONS                       │
│                         (Message Batches API)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CASE SUBMITTED                                                         │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    CREATE BATCH REQUEST                          │   │
│   │   7 specialist consultations submitted as single batch           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────┐   │
│   │Surgical │ Medical │Radiation│Palliative│Radiology│Pathology│Genet│   │
│   │   Onc   │   Onc   │   Onc   │  Care   │         │         │ics  │   │
│   └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴──┬──┘   │
│        │         │         │         │         │         │       │       │
│        └─────────┴─────────┴────┬────┴─────────┴─────────┴───────┘       │
│                                 │                                        │
│                                 ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    BATCH RESULTS (50% cost)                      │   │
│   │   All 7 opinions returned within 24 hours (typically minutes)    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:

```typescript
// packages/agents/src/batch/parallel-consultation.ts

import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, AGENT_PERSONAS, AGENT_RAG_CONFIG } from "../config";

interface BatchConsultationRequest {
  caseId: string;
  caseData: CaseData;
  agents: AgentId[];
}

interface BatchConsultationResult {
  batchId: string;
  results: Map<AgentId, AgentConsultation>;
  totalCost: number;
  processingTime: number;
}

/**
 * Submit all specialist consultations as a batch for 50% cost savings
 */
export async function submitBatchConsultations(
  client: Anthropic,
  request: BatchConsultationRequest
): Promise<string> {
  const { caseId, caseData, agents } = request;

  // Build batch requests for each agent
  const batchRequests: Anthropic.Messages.BatchCreateParams.Request[] = 
    await Promise.all(
      agents.map(async (agentId) => ({
        custom_id: `${caseId}_${agentId}`,
        params: {
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: await buildAgentSystemPrompt(agentId, caseData),
          tools: AGENT_TOOLS[agentId],
          messages: [
            {
              role: "user" as const,
              content: buildAgentPrompt(agentId, caseData),
            },
          ],
        },
      }))
    );

  // Submit batch
  const batch = await client.messages.batches.create({
    requests: batchRequests,
  });

  console.log(`Batch submitted: ${batch.id}`);
  console.log(`  - Requests: ${batch.request_counts.total}`);
  console.log(`  - Status: ${batch.processing_status}`);

  return batch.id;
}

/**
 * Poll for batch completion and retrieve results
 */
export async function retrieveBatchResults(
  client: Anthropic,
  batchId: string
): Promise<BatchConsultationResult> {
  // Poll until complete
  let batch: Anthropic.Messages.Batch;
  do {
    batch = await client.messages.batches.retrieve(batchId);
    
    if (batch.processing_status === "in_progress") {
      console.log(`Batch ${batchId}: ${batch.request_counts.succeeded}/${batch.request_counts.total} complete`);
      await sleep(5000); // Poll every 5 seconds
    }
  } while (batch.processing_status === "in_progress");

  if (batch.processing_status !== "ended") {
    throw new Error(`Batch failed: ${batch.processing_status}`);
  }

  // Retrieve results
  const results = new Map<AgentId, AgentConsultation>();
  
  // Stream results from the batch
  for await (const result of client.messages.batches.results(batchId)) {
    if (result.result.type === "succeeded") {
      const [caseId, agentId] = result.custom_id.split("_");
      const message = result.result.message;
      
      results.set(agentId as AgentId, {
        agentId: agentId as AgentId,
        response: extractTextContent(message),
        citations: extractCitations(message),
        usage: message.usage,
      });
    } else {
      console.error(`Agent consultation failed: ${result.custom_id}`, result.result.error);
    }
  }

  return {
    batchId,
    results,
    totalCost: calculateBatchCost(results),
    processingTime: Date.now() - batch.created_at.getTime(),
  };
}

/**
 * Full Round 1 workflow using batches
 */
export async function executeRound1WithBatches(
  client: Anthropic,
  caseData: CaseData
): Promise<Round1Results> {
  const agents: AgentId[] = [
    "surgical-oncologist",
    "medical-oncologist", 
    "radiation-oncologist",
    "palliative-care",
    "radiologist",
    "pathologist",
    "geneticist",
  ];

  // Submit batch
  const batchId = await submitBatchConsultations(client, {
    caseId: caseData.id,
    caseData,
    agents,
  });

  // Store batch ID for tracking
  await saveBatchRecord(caseData.id, batchId);

  // For async workflow, return immediately
  // Frontend will poll for results
  return {
    batchId,
    status: "processing",
    estimatedCompletion: new Date(Date.now() + 60000), // ~1 minute typical
  };
}

/**
 * Cost comparison: Regular vs Batch API
 * 
 * Regular API (7 parallel calls):
 *   7 × (100K input + 4K output) × standard pricing
 *   ≈ $2.50 per case
 * 
 * Batch API (7 requests in batch):
 *   Same tokens × 50% discount
 *   ≈ $1.25 per case
 * 
 * ANNUAL SAVINGS (1000 cases/year):
 *   $1,250 saved on Round 1 alone
 */
```

#### 9.5.4 Streaming for Real-Time Deliberation UI

Streaming provides responsive UI during AI deliberation, showing agent responses as they're generated.

```typescript
// packages/agents/src/streaming/deliberation-stream.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * Stream agent response with real-time UI updates
 */
export async function streamAgentDeliberation(
  client: Anthropic,
  agentId: AgentId,
  caseData: CaseData,
  onChunk: (chunk: StreamChunk) => void
): Promise<AgentConsultation> {
  const systemPrompt = await buildAgentSystemPrompt(agentId, caseData);
  
  // Create streaming response
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools: AGENT_TOOLS[agentId],
    messages: [
      {
        role: "user",
        content: buildAgentPrompt(agentId, caseData),
      },
    ],
  });

  let fullText = "";
  const citations: Citation[] = [];

  // Process stream events
  stream.on("text", (text) => {
    fullText += text;
    onChunk({
      type: "text_delta",
      agentId,
      content: text,
      timestamp: Date.now(),
    });
  });

  stream.on("contentBlockStop", (block) => {
    if (block.type === "tool_use") {
      onChunk({
        type: "tool_call",
        agentId,
        toolName: block.name,
        toolInput: block.input,
        timestamp: Date.now(),
      });
    }
  });

  // Wait for completion
  const finalMessage = await stream.finalMessage();

  return {
    agentId,
    response: fullText,
    citations,
    usage: finalMessage.usage,
  };
}

/**
 * Server-Sent Events endpoint for frontend
 */
// app/api/deliberation/[caseId]/stream/route.ts

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } }
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const client = new Anthropic();
      
      // Stream each agent's response
      for (const agentId of ACTIVE_AGENTS) {
        // Send agent start event
        controller.enqueue(
          encoder.encode(`event: agent_start\ndata: ${JSON.stringify({ agentId })}\n\n`)
        );

        // Stream agent response
        await streamAgentDeliberation(
          client,
          agentId,
          caseData,
          (chunk) => {
            controller.enqueue(
              encoder.encode(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`)
            );
          }
        );

        // Send agent complete event
        controller.enqueue(
          encoder.encode(`event: agent_complete\ndata: ${JSON.stringify({ agentId })}\n\n`)
        );
      }

      controller.enqueue(
        encoder.encode(`event: deliberation_complete\ndata: {}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**Frontend Integration**:

```typescript
// apps/web/components/tumor-board/DeliberationView.tsx

"use client";

import { useEffect, useState } from "react";

export function DeliberationView({ caseId }: { caseId: string }) {
  const [agentResponses, setAgentResponses] = useState<Map<string, string>>(new Map());
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/deliberation/${caseId}/stream`);

    eventSource.addEventListener("agent_start", (e) => {
      const { agentId } = JSON.parse(e.data);
      setActiveAgent(agentId);
    });

    eventSource.addEventListener("text_delta", (e) => {
      const { agentId, content } = JSON.parse(e.data);
      setAgentResponses((prev) => {
        const updated = new Map(prev);
        updated.set(agentId, (updated.get(agentId) || "") + content);
        return updated;
      });
    });

    eventSource.addEventListener("deliberation_complete", () => {
      setActiveAgent(null);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [caseId]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {AGENTS.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          response={agentResponses.get(agent.id)}
          isActive={activeAgent === agent.id}
        />
      ))}
    </div>
  );
}
```

#### 9.5.5 Extended Thinking for Complex Cases

Extended thinking enables deeper reasoning for diagnostically challenging cases with unusual presentations or conflicting evidence.

```typescript
// packages/agents/src/thinking/extended-deliberation.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * Use extended thinking for complex cases requiring deeper analysis
 * 
 * Triggers:
 * - Rare cancers or unusual presentations
 * - Conflicting guideline recommendations
 * - Multiple comorbidities affecting treatment
 * - Discordant specialist opinions in Round 2
 */
export async function executeExtendedThinking(
  client: Anthropic,
  caseData: CaseData,
  conflictSummary: string
): Promise<ExtendedThinkingResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    thinking: {
      type: "enabled",
      budget_tokens: 10000, // Allow up to 10K tokens for reasoning
    },
    messages: [
      {
        role: "user",
        content: `You are the Tumor Board Conductor synthesizing a complex case with conflicting specialist opinions.

## CASE SUMMARY
${formatCaseSummary(caseData)}

## SPECIALIST OPINIONS (with conflicts)
${conflictSummary}

## YOUR TASK
Perform deep analysis to resolve the conflicts and arrive at a consensus recommendation.

Consider:
1. Weight of evidence for each position
2. Patient-specific factors that might favor one approach
3. Risk-benefit analysis of each option
4. Indian healthcare context (availability, cost, access)
5. Patient preferences and goals of care

Provide a final consensus recommendation with:
- Primary recommendation with confidence level
- Alternative options if primary not feasible
- Key monitoring points
- Follow-up plan`,
      },
    ],
  });

  // Extract thinking and response
  const thinkingBlock = response.content.find(
    (block): block is Anthropic.Messages.ThinkingBlock => 
      block.type === "thinking"
  );
  
  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => 
      block.type === "text"
  );

  return {
    reasoning: thinkingBlock?.thinking || "",
    recommendation: textBlock?.text || "",
    thinkingTokens: response.usage.thinking_tokens,
  };
}

/**
 * Determine if extended thinking should be triggered
 */
export function shouldUseExtendedThinking(
  caseData: CaseData,
  round1Results: Round1Results
): boolean {
  // Rare cancer check
  const isRareCancer = RARE_CANCER_TYPES.includes(caseData.diagnosis.histologyCode);
  
  // Conflict check (agents disagree on primary treatment)
  const treatmentRecommendations = extractPrimaryTreatments(round1Results);
  const hasConflict = new Set(treatmentRecommendations).size > 2;
  
  // Complexity check
  const complexityScore = calculateCaseComplexity(caseData);
  
  return isRareCancer || hasConflict || complexityScore > 7;
}
```

#### 9.5.6 Structured Outputs for Agent Responses

Guaranteed JSON schema conformance ensures consistent, parseable agent responses.

```typescript
// packages/agents/src/schemas/agent-response.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * Agent consultation response schema
 */
export const AgentConsultationSchema = {
  name: "agent_consultation",
  description: "Structured response from a specialist agent",
  strict: true,
  schema: {
    type: "object",
    properties: {
      agent_id: {
        type: "string",
        description: "Identifier of the responding agent",
      },
      specialty: {
        type: "string",
        description: "Medical specialty of the agent",
      },
      assessment: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Brief summary of key findings relevant to specialty",
          },
          key_issues: {
            type: "array",
            items: { type: "string" },
            description: "List of key clinical issues identified",
          },
        },
        required: ["summary", "key_issues"],
      },
      recommendation: {
        type: "object",
        properties: {
          primary: {
            type: "string",
            description: "Primary treatment recommendation",
          },
          alternatives: {
            type: "array",
            items: { type: "string" },
            description: "Alternative options if primary not feasible",
          },
          rationale: {
            type: "string",
            description: "Clinical rationale for recommendation",
          },
          confidence: {
            type: "string",
            enum: ["high", "moderate", "low"],
            description: "Confidence level in recommendation",
          },
        },
        required: ["primary", "rationale", "confidence"],
      },
      guideline_citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: {
              type: "string",
              description: "Guideline source (e.g., 'NCCN NSCLC v2.2025')",
            },
            section: {
              type: "string",
              description: "Specific section or page reference",
            },
            recommendation_level: {
              type: "string",
              description: "Evidence level (e.g., 'Category 1', 'Category 2A')",
            },
          },
          required: ["source"],
        },
        description: "Citations to clinical guidelines",
      },
      additional_workup: {
        type: "array",
        items: { type: "string" },
        description: "Additional tests or consultations recommended",
      },
      indian_context: {
        type: "object",
        properties: {
          availability_concerns: {
            type: "array",
            items: { type: "string" },
            description: "Drug/equipment availability issues in India",
          },
          cost_considerations: {
            type: "string",
            description: "Cost-related recommendations",
          },
          alternatives_for_india: {
            type: "array",
            items: { type: "string" },
            description: "Alternative options suitable for Indian context",
          },
        },
      },
      follow_up: {
        type: "object",
        properties: {
          timeline: {
            type: "string",
            description: "Recommended follow-up timeline",
          },
          monitoring: {
            type: "array",
            items: { type: "string" },
            description: "Parameters to monitor",
          },
        },
      },
    },
    required: [
      "agent_id",
      "specialty",
      "assessment",
      "recommendation",
      "guideline_citations",
    ],
    additionalProperties: false,
  },
} as const;

/**
 * Create agent consultation with structured output
 */
export async function getStructuredAgentConsultation(
  client: Anthropic,
  agentId: AgentId,
  caseData: CaseData
): Promise<AgentConsultationStructured> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: await buildAgentSystemPrompt(agentId, caseData),
    tools: [
      ...AGENT_TOOLS[agentId],
      {
        name: AgentConsultationSchema.name,
        description: AgentConsultationSchema.description,
        input_schema: AgentConsultationSchema.schema,
      },
    ],
    tool_choice: { type: "tool", name: "agent_consultation" },
    messages: [
      {
        role: "user",
        content: `Provide your ${AGENT_PERSONAS[agentId].specialty} consultation for this case.
        
Use the agent_consultation tool to structure your response.`,
      },
    ],
  });

  // Extract structured response from tool use
  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock =>
      block.type === "tool_use" && block.name === "agent_consultation"
  );

  if (!toolUse) {
    throw new Error("Agent did not return structured consultation");
  }

  return toolUse.input as AgentConsultationStructured;
}
```

#### 9.5.7 Complete Orchestration Example

Putting it all together - a complete tumor board deliberation using all Claude SDK features:

```typescript
// packages/agents/src/orchestrator/complete-deliberation.ts

import Anthropic from "@anthropic-ai/sdk";

/**
 * Complete tumor board deliberation workflow
 * Combines: Prompt Caching + Batch API + Streaming + Extended Thinking + Structured Outputs
 */
export async function executeTumorBoardDeliberation(
  client: Anthropic,
  caseData: CaseData,
  options: DeliberationOptions = {}
): Promise<DeliberationResult> {
  const startTime = Date.now();
  const costs: CostBreakdown = { round1: 0, round2: 0, consensus: 0 };

  // =========================================================================
  // PHASE 0: CACHE WARMING
  // =========================================================================
  if (options.warmCache !== false) {
    await warmCachesForCancerType(client, caseData.diagnosis.cancerType);
    console.log("✓ Guideline caches warmed (1-hour TTL)");
  }

  // =========================================================================
  // ROUND 1: INITIAL OPINIONS (Batch API - 50% cost savings)
  // =========================================================================
  console.log("\n=== ROUND 1: SPECIALIST CONSULTATIONS ===");
  
  const round1Results = await executeRound1WithBatches(client, caseData);
  costs.round1 = round1Results.cost;
  
  console.log(`✓ Round 1 complete: ${round1Results.results.size} specialists responded`);
  console.log(`  Cost: $${costs.round1.toFixed(4)} (50% batch discount applied)`);

  // =========================================================================
  // ROUND 2: CROSS-REVIEW & DEBATE (Streaming for UI)
  // =========================================================================
  console.log("\n=== ROUND 2: CHAIN OF DEBATE ===");
  
  // Identify conflicts from Round 1
  const conflicts = identifyConflicts(round1Results);
  
  if (conflicts.length > 0) {
    console.log(`Found ${conflicts.length} areas of disagreement`);
    
    // Stream debate responses for real-time UI
    const round2Results = await executeRound2WithStreaming(
      client,
      caseData,
      round1Results,
      conflicts,
      options.onStreamChunk
    );
    costs.round2 = round2Results.cost;
    
    console.log(`✓ Round 2 complete: conflicts addressed`);
  } else {
    console.log("No significant conflicts - skipping detailed debate");
  }

  // =========================================================================
  // ROUND 3: CONSENSUS (Extended Thinking for complex cases)
  // =========================================================================
  console.log("\n=== ROUND 3: CONSENSUS BUILDING ===");
  
  let consensusResult: ConsensusResult;
  
  if (shouldUseExtendedThinking(caseData, round1Results)) {
    console.log("Complex case detected - using extended thinking");
    consensusResult = await executeExtendedThinkingConsensus(
      client,
      caseData,
      round1Results,
      round2Results
    );
  } else {
    consensusResult = await executeStandardConsensus(
      client,
      caseData,
      round1Results
    );
  }
  costs.consensus = consensusResult.cost;
  
  // =========================================================================
  // FINAL OUTPUT (Structured)
  // =========================================================================
  const finalResult: DeliberationResult = {
    caseId: caseData.id,
    status: "completed",
    rounds: {
      round1: round1Results,
      round2: round2Results,
      consensus: consensusResult,
    },
    recommendation: {
      treatment: consensusResult.recommendation,
      confidence: consensusResult.confidence,
      dissent: consensusResult.dissentingOpinions,
      citations: aggregateCitations(round1Results, consensusResult),
    },
    costs: {
      ...costs,
      total: costs.round1 + costs.round2 + costs.consensus,
    },
    timing: {
      totalMs: Date.now() - startTime,
      round1Ms: round1Results.timing,
      round2Ms: round2Results?.timing || 0,
      consensusMs: consensusResult.timing,
    },
    cacheStats: {
      hitRate: calculateCacheHitRate(round1Results),
      tokensSaved: calculateTokensSaved(round1Results),
    },
  };

  console.log("\n=== DELIBERATION COMPLETE ===");
  console.log(`Total cost: $${finalResult.costs.total.toFixed(4)}`);
  console.log(`Total time: ${(finalResult.timing.totalMs / 1000).toFixed(1)}s`);
  console.log(`Cache hit rate: ${(finalResult.cacheStats.hitRate * 100).toFixed(1)}%`);

  return finalResult;
}
```

#### 9.5.8 Cost Optimization Summary

| Feature | Savings | Best For |
|---------|---------|----------|
| **Prompt Caching** | 90% on cache hits | Guideline contexts, agent prompts |
| **Message Batches** | 50% flat | Round 1 parallel consultations |
| **Structured Outputs** | Reduces retries | Consistent agent responses |
| **Extended Thinking** | Better first-try accuracy | Complex conflict resolution |

**Estimated Cost Per Case**:

| Scenario | Without Optimization | With Claude SDK | Savings |
|----------|---------------------|-----------------|---------|
| Simple case (3 agents) | $1.50 | $0.45 | 70% |
| Standard case (7 agents) | $3.50 | $0.95 | 73% |
| Complex case (extended thinking) | $5.00 | $1.80 | 64% |
| **Monthly (100 cases)** | **$350** | **$95** | **73%** |

---

## 10. Data Models

### 10.1 Complete Database Schema

```sql
-- Core patient tables
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Demographics
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  
  -- Contact
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  email VARCHAR(255),
  address JSONB,
  
  -- Indian specific
  state VARCHAR(2),
  district VARCHAR(100),
  primary_language VARCHAR(20) DEFAULT 'english',
  
  -- Insurance
  insurance_type VARCHAR(50),
  insurance_details JSONB,
  
  -- Indices
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

-- Cancer diagnoses
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ICD-O-3 coding
  primary_site_code VARCHAR(10) NOT NULL,
  primary_site_description VARCHAR(255),
  histology_code VARCHAR(10) NOT NULL,
  histology_description VARCHAR(255),
  
  diagnosis_date DATE NOT NULL,
  laterality VARCHAR(20),
  
  -- Staging
  clinical_t VARCHAR(10),
  clinical_n VARCHAR(10),
  clinical_m VARCHAR(10),
  pathological_t VARCHAR(10),
  pathological_n VARCHAR(10),
  pathological_m VARCHAR(10),
  stage_group VARCHAR(10),
  staging_system VARCHAR(20) DEFAULT 'ajcc8',
  
  -- Biomarkers (JSONB for flexibility)
  biomarkers JSONB DEFAULT '[]',
  
  -- Genomics
  genomic_profile JSONB
);

-- Tumor board cases
CREATE TABLE tumor_board_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  diagnosis_id UUID REFERENCES diagnoses(id),
  
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  clinical_question TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'routine',
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Meeting assignment
  scheduled_meeting_id UUID,
  discussed_at TIMESTAMPTZ,
  
  -- AI deliberation
  ai_deliberation JSONB,
  ai_recommendation TEXT,
  ai_citations JSONB DEFAULT '[]',
  
  -- Final human decision
  final_recommendation TEXT,
  treatment_plan JSONB,
  follow_up_plan TEXT,
  decision_notes TEXT,
  
  CONSTRAINT valid_priority CHECK (priority IN ('urgent', 'routine')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'scheduled', 'deliberating', 'discussed', 'completed'))
);

-- Documents attached to cases
CREATE TABLE case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES tumor_board_cases(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER,
  
  -- Extracted content
  extracted_text TEXT,
  extraction_status VARCHAR(20) DEFAULT 'pending',
  extracted_data JSONB,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Tumor board meetings
CREATE TABLE tumor_board_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  
  meeting_type VARCHAR(50) DEFAULT 'general', -- general, breast, gi, thoracic, etc.
  location VARCHAR(255),
  virtual_link VARCHAR(500),
  
  status VARCHAR(20) DEFAULT 'scheduled',
  
  chair_id UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI deliberation log (for audit trail)
CREATE TABLE deliberation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES tumor_board_cases(id) ON DELETE CASCADE,
  
  round INTEGER NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  agent_response TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Token usage tracking
  input_tokens INTEGER,
  output_tokens INTEGER,
  model VARCHAR(50)
);

-- Treatment plans
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES tumor_board_cases(id),
  
  intent VARCHAR(20) NOT NULL, -- curative, palliative
  
  -- Treatment components (surgery, chemo, RT, etc.)
  components JSONB NOT NULL DEFAULT '[]',
  
  -- Guideline references
  guideline_citations JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_intent CHECK (intent IN ('curative', 'palliative'))
);
```

---

## 11. API Specifications

### 11.1 RESTful Endpoints

```
Authentication
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/session

Patients
  GET    /api/patients                    # List patients (paginated)
  POST   /api/patients                    # Create patient
  GET    /api/patients/:id                # Get patient details
  PATCH  /api/patients/:id                # Update patient
  GET    /api/patients/:id/diagnoses      # Get patient diagnoses
  GET    /api/patients/:id/cases          # Get patient TB cases

Diagnoses
  POST   /api/diagnoses                   # Create diagnosis
  GET    /api/diagnoses/:id               # Get diagnosis
  PATCH  /api/diagnoses/:id               # Update diagnosis

Tumor Board Cases
  GET    /api/cases                       # List cases (filtered)
  POST   /api/cases                       # Submit new case
  GET    /api/cases/:id                   # Get case details
  PATCH  /api/cases/:id                   # Update case
  POST   /api/cases/:id/documents         # Upload document
  GET    /api/cases/:id/documents         # List case documents

AI Deliberation
  POST   /api/deliberation/start          # Start AI deliberation
  GET    /api/deliberation/:caseId/status # Get deliberation status
  GET    /api/deliberation/:caseId/stream # SSE stream of deliberation
  POST   /api/deliberation/:caseId/stop   # Stop deliberation

Tumor Board Meetings
  GET    /api/meetings                    # List meetings
  POST   /api/meetings                    # Create meeting
  GET    /api/meetings/:id                # Get meeting details
  POST   /api/meetings/:id/cases          # Add case to meeting

Literature Search
  POST   /api/literature/search           # Search Semantic Scholar
  GET    /api/literature/paper/:id        # Get paper details

Clinical Trials
  POST   /api/trials/search               # Search ClinicalTrials.gov
```

### 11.2 AI Deliberation API

```typescript
// POST /api/deliberation/start
interface StartDeliberationRequest {
  caseId: string;
  options?: {
    includeAgents?: AgentId[]; // Default: all 7
    maxRounds?: number;        // Default: 3
    prioritizeCost?: boolean;  // Indian context cost sensitivity
    streamResponse?: boolean;  // Default: true
  };
}

interface StartDeliberationResponse {
  deliberationId: string;
  status: 'started' | 'error';
  streamUrl?: string;
}

// SSE Stream: /api/deliberation/:caseId/stream
// Events:
// - round_start: { round: number, agents: AgentId[] }
// - agent_response: { agent: AgentId, response: string, citations: Citation[] }
// - round_complete: { round: number }
// - debate_point: { from: AgentId, to: AgentId, topic: string }
// - consensus: { recommendation: string, confidence: number }
// - complete: { summary: string, treatmentPlan: TreatmentPlan }
// - error: { message: string }
```

---

## 12. Security & Compliance

### 12.1 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Encryption at rest | Supabase default AES-256 |
| Encryption in transit | TLS 1.3 enforced |
| PHI handling | No PHI in logs, PII redaction |
| Access control | Row-level security (RLS) |
| Audit logging | All PHI access logged |
| Data retention | Configurable per institution |

### 12.2 Authentication & Authorization

```typescript
// Role-based access control
type UserRole = 
  | 'admin'           // Full system access
  | 'oncologist'      // Create/edit cases, view all
  | 'coordinator'     // Schedule meetings, manage cases
  | 'viewer'          // Read-only access
  | 'external_consultant'; // Limited case access

// Row-level security policies
// Example: Oncologists can only see their institution's patients
```

### 12.3 Indian Healthcare Compliance

| Regulation | Compliance Approach |
|------------|---------------------|
| IT Act 2000 | Reasonable security practices |
| DPDP Act 2023 | Consent management, data minimization |
| ABDM Standards | ABHA integration support |
| Telemedicine Guidelines | Audit trail, consent |

---

## 13. Implementation Roadmap

### 13.1 Phase 0: Foundation (Weeks 1-2)

- [ ] Project setup (monorepo, CI/CD)
- [ ] Database schema implementation
- [ ] Basic authentication
- [ ] UI component library setup
- [ ] Integration with radonc_ka_cg RAG

### 13.2 Phase 1: Core EHR (Weeks 3-5)

- [ ] Patient registration
- [ ] Diagnosis entry with staging
- [ ] Document upload with extraction
- [ ] Basic patient search and listing

### 13.3 Phase 2: Multi-Agent System (Weeks 6-9)

- [ ] Meta-orchestrator implementation
- [ ] 7 specialist agent definitions
- [ ] RAG integration per agent
- [ ] Chain of Debate mechanism
- [ ] Consensus building logic

### 13.4 Phase 3: Tumor Board Workflow (Weeks 10-12)

- [ ] Case submission flow
- [ ] AI deliberation UI
- [ ] Meeting scheduling
- [ ] Decision capture
- [ ] Report generation

### 13.5 Phase 4: Polish & Launch (Weeks 13-16)

- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] User testing with oncologists
- [ ] Documentation
- [ ] Beta launch at partner institution

---

## 14. Appendices

### 14.1 Appendix A: ICD-O-3 Common Codes

```
TOPOGRAPHY (Site)
C50.9  Breast, NOS
C34.1  Lung, upper lobe
C18.0  Cecum
C20.9  Rectum, NOS
C61.9  Prostate gland
...

MORPHOLOGY (Histology)
8140/3 Adenocarcinoma, NOS
8070/3 Squamous cell carcinoma, NOS
8500/3 Infiltrating duct carcinoma, NOS
...
```

### 14.2 Appendix B: Biomarker Panel Templates

```typescript
const BREAST_BIOMARKERS: BiomarkerPanel = {
  cancerType: 'breast',
  required: ['ER', 'PR', 'HER2'],
  optional: ['Ki67'],
  reflexTesting: {
    'HER2 equivocal': ['HER2 FISH'],
  },
};

const LUNG_BIOMARKERS: BiomarkerPanel = {
  cancerType: 'lung_adenocarcinoma',
  required: ['EGFR', 'ALK', 'ROS1', 'PDL1'],
  optional: ['KRAS', 'BRAF', 'RET', 'MET', 'NTRK'],
};
```

### 14.3 Appendix C: Agent Prompt Templates

See `packages/agents/prompts/` for complete prompt templates.

### 14.4 Appendix D: Semantic Scholar API Integration

```typescript
// Example search for lung cancer immunotherapy
const searchParams = {
  query: 'lung adenocarcinoma KRAS G12C targeted therapy',
  year: { min: 2022 },
  fields: ['title', 'abstract', 'year', 'citationCount', 'authors', 'journal'],
  limit: 10,
};

// API Key: 5Jpny5JJeT5huCtZZRnnl1RCZULBJrcn7hvhTv3T
```

### 14.5 Appendix E: References

**Primary Papers**:
1. Nori H, et al. "Sequential Diagnosis with Language Models." arXiv:2506.22405v2 (2025)
   - Key contribution: MAI-DxO multi-agent orchestrator architecture

**Commercial Reference Systems**:
2. NAVIFY Tumor Board Brochure. Roche Diagnostics (2020)
3. NAVIFY Clinical Hub for Tumor Boards - Features & Benefits
   - https://navify.roche.com/marketplace/products/navify-clinical-hub-for-tumor-boards#features
   - https://navify.roche.com/marketplace/products/navify-clinical-hub-for-tumor-boards#benefits
4. Guidelines for NAVIFY Tumor Board Case Study (2022)

**Clinical Guidelines Sources**:
5. NCCN Clinical Practice Guidelines in Oncology - https://www.nccn.org/guidelines
6. ESMO Clinical Practice Guidelines - https://www.esmo.org/guidelines
7. ASTRO Evidence-Based Guidelines - https://www.astro.org/Patient-Care-and-Research/Clinical-Practice-Statements
8. ACR Appropriateness Criteria - https://www.acr.org/Clinical-Resources/ACR-Appropriateness-Criteria
9. CAP Cancer Protocols - https://www.cap.org/protocols-and-guidelines

**Genomic Databases**:
10. ClinVar - https://www.ncbi.nlm.nih.gov/clinvar/
11. CIViC (Clinical Interpretation of Variants in Cancer) - https://civicdb.org/

**Literature Search**:
12. Semantic Scholar API - https://api.semanticscholar.org/

**Indian Healthcare Context**:
13. Ayushman Bharat Digital Mission (ABDM) - https://abdm.gov.in/
14. Clinical Trials Registry India (CTRI) - http://ctri.nic.in/
15. ICMR National Cancer Registry Programme - https://ncdirindia.org/

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-01-24 | AI | Initial draft |

---

*This document is a living specification and will be updated as the project evolves.*
