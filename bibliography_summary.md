# Comprehensive Bibliography: Agentic Virtual Tumor Boards
## Multi-Agent AI Systems for Oncology Decision Support

**Thesis**: Multi-agent AI systems with adversarial deliberation, verified data extraction, and multimodal grounding can democratize access to precision oncology for resource-constrained settings (particularly India where 77% of patients lack access to tumor boards).

---

## 1. Multi-Agent Medical AI Systems

### Core Multi-Agent Frameworks

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **MedAgents** | Tang et al. | 2023 | arXiv | Multi-disciplinary LLM collaboration framework; improved performance on 9 medical QA datasets (MedQA, MedMCQA, PubMedQA) through role-playing expert discussions |
| **MedAgentsBench** | Tang et al. | 2025 | arXiv | Benchmark for complex medical reasoning; DeepSeek R1 and OpenAI o3 show exceptional performance; reveals performance-cost tradeoffs |
| **MedAgent-Pro** | Wang et al. | 2025 | arXiv | Hierarchical diagnostic structure with RAG-based agent for guideline retrieval; evidence-based reasoning across modalities |
| **AgentClinic** | Schmidgall et al. | 2024 | arXiv | Multimodal benchmark across 9 specialties, 7 languages; Claude-3.5 outperforms; diagnostic accuracy drops to <10% of MedQA accuracy in sequential format |
| **ColaCare** | Wang et al. | 2025 | WWW | MDT-inspired DoctorAgents + MetaAgent collaboration with Merck Manual RAG; superior mortality/readmission prediction |
| **UCAgents** | Feng et al. | 2025 | arXiv | 71.3% on PathVQA (+6.0% over SOTA) with 87.7% lower token cost through structured evidence auditing |

### Tumor Board-Specific Systems

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **HAO (Healthcare Agent Orchestrator)** | Blondeel et al. | 2025 | arXiv | Multi-agent MTB workflow; TBFact achieves 94% capture of high-importance information |
| **AMIE for Oncology** | Palepu et al. | 2024 | arXiv | Conversational AI on 50 breast cancer vignettes; outperforms trainees/fellows but inferior to attending oncologists |
| **AI-MDT** | Liu et al. | 2026 | JCRCO | Automated MDT platform for lung cancer; addresses efficiency and evidence-based decision support |
| **Multi-Agent GI Oncology** | Zhang et al. | 2025 | arXiv | Hierarchical MDT simulation scoring 4.60/5.00; substantial improvements in reasoning logic |

---

## 2. Medical AI Safety and Hallucination Prevention

### Sycophancy Evaluation

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **SycoEval-EM** | Peng et al. | 2026 | arXiv | 20 LLMs across 1,875 emergency encounters; acquiescence 0-100%; imaging requests (38.8%) more vulnerable than opioid prescriptions (25.0%) |
| **PARROT** | Celebi et al. | 2025 | arXiv | 22 models on 1,302 MMLU questions; GPT-5: 4% follow rate; older models severe collapse (GPT-4: 80%, Qwen 2.5-1.5B: 94%) |
| **BrokenMath** | Petrov et al. | 2025 | arXiv | First theorem proving sycophancy benchmark; GPT-5 sycophantic 29% of time |

### Hallucination Detection

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **CHECK** | Garcia-Fernandez et al. | 2025 | arXiv | Reduces LLaMA3.3-70B hallucination from 31% to 0.3%; 92.1% USMLE with GPT-4o refinement |
| **DAS Red-Teaming** | Pan et al. | 2025 | arXiv | 94% failure on dynamic robustness despite >80% MedQA; 86% privacy leaks; 81% cognitive bias priming; >66% hallucination |
| **Atomic Fact-Checking** | Vladika et al. | 2025 | arXiv | 40% answer improvement; 50% hallucination detection with multi-reader expert validation |
| **MedRAGChecker** | Ji et al. | 2026 | arXiv | Claim-level verification with NLI + KG consistency; 0.95-0.96 AUC on medical benchmarks |

### Evaluator-Optimizer Patterns

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **Weight Steering** | Fierro & Roger | 2025 | arXiv | Contrastive weight steering for sycophancy mitigation; stronger OOD control than activation steering |
| **HPO** | Sadhu & Dhor | 2025 | AAAI | Dialectical multi-agent adversarial framework; 0.845 Macro F1 with 8B model (beats GPT-4o's 0.812) |

---

## 3. Multimodal Medical AI

### Vision-Language Models

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **MedGemma** | Sellergren et al. | 2025 | arXiv | Based on Gemma 3 4B/27B; 2.6-10% improvement on multimodal QA; 15.5-18.1% on CXR; 50% EHR error reduction |
| **CURE** | Messina et al. | 2026 | arXiv | Error-aware curriculum on MedGemma; +0.37 IoU grounding; 18.6% hallucination reduction |
| **MedGemma vs GPT-4** | Prottasha & Rafi | 2025 | JMLDL | MedGemma-4b-it: 80.37% vs GPT-4: 69.58%; higher cancer/pneumonia sensitivity |

### Pathology AI

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **PathOrchestra** | Yan et al. | 2025 | arXiv | Foundation model on 300K slides; >95% accuracy on 47 tasks; first structured reports for CRC and lymphoma |
| **Prostate Pathology Validation** | Muhammad Ali et al. | 2025 | arXiv | First Middle East validation; pathologist-level concordance (kappa 0.801 vs 0.799); compact scanners for resource-limited settings |
| **PathSegmentor** | Chen et al. | 2025 | arXiv | First text-prompted pathology segmentation; 275K image-mask-label triples across 160 categories |

### Radiology AI

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **IODeep** | Contino et al. | 2024 | CMPB | DICOM IOD for DNN integration; enables AI model storage in PACS infrastructure |
| **CheXlocalize** | Gosai et al. | 2025 | ML4H | GPT-5: 49.7% localization accuracy; errors anatomically plausible even when imprecise |

---

## 4. Tumor Boards and Clinical Decision Support

### Oncology-Specific CDSS

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **OncoReason** | Hemadri et al. | 2025 | arXiv | GRPO on MSK-CHORD survival; CoT improves F1 +6.0, MAE -12% |
| **CliCARE** | Li et al. | 2025 | AAAI | EHR to Temporal KG aligned with guideline KG; outperforms long-context LLMs and KG-RAG |
| **ECKO** | Silva et al. | 2025 | arXiv | Explainable Clinical Knowledge for Oncology; 33 biomedical ontologies for drug recommendations |
| **TrialMatchAI** | Abdallah et al. | 2025 | arXiv | AI clinical trial matching; 92% relevant trial retrieval in top 20; >90% criterion-level accuracy |

### Cognitive Bias and Reasoning

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **Cognitive Bias in Oncology** | Kenaston et al. | 2025 | arXiv | 23% reasoning error rate in GPT-4 oncology notes; confirmation and anchoring bias dominant |

---

## 5. Global Health and Healthcare Access

### Cancer Disparities in South Asia and India

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **Cancer Disparities in SAARC** | Menon et al. | 2026 | Lancet Glob Health | 2B+ population with heterogeneous risk/access/outcomes; large poverty proportions |
| **Surgical Care Inequities** | Bajaj et al. | 2025 | IJSO | Global inequities in cancer surgical access with strategies |
| **Cancer in India Tertiary Care** | Debnath et al. | 2025 | Front Oncol | Urban-rural disparities; rural patients face delayed diagnosis and limited access |
| **NGS Access Asia-Pacific** | Pitiyarachchi et al. | 2025 | CRT | KSMO study revealing precision oncology access disparities |

### AI for Healthcare Equity

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **BRIDGE Breast Cancer** | Yadav et al. | 2025 | WJS | Virtual training for LMICs on guideline-concordant care |
| **Oral Cancer LMICs** | Francis & Pape Reddy | 2025 | Ann Glob Health | Prevention/screening/treatment access gaps in LMICs |
| **Geriatric Oncology Asia** | Parikh et al. | 2025 | SAJC | Asian guidelines including MDT components |

---

## 6. Technical Approaches

### RAG in Medical AI

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **MRAG Benchmark** | Zhu | 2026 | arXiv | Comprehensive RAG benchmark; RAG enhances reliability across medical QA tasks |
| **MedTutor** | Jang et al. | 2026 | EMNLP | RAG for case-based education; hybrid retrieval with radiologist validation |
| **Self-MedRAG** | Ryan et al. | 2026 | arXiv | Hybrid BM25+Contriever with self-reflection; MedQA 80%->83.33%, PubMedQA 69.10%->79.82% |
| **TrumorGPT** | Hang et al. | 2025 | TAI | GraphRAG for health fact-checking using semantic KGs |
| **GARMLE-G** | Li et al. | 2025 | JBHI | Hallucination-free via direct guideline retrieval |

### Chain-of-Thought in Clinical Contexts

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **COPE** | Liu et al. | 2025 | arXiv | Two-step CoT for stroke outcome; MAE 1.01, 74.4% accuracy comparable to GPT-4.1 |
| **M3CoTBench** | Jiang et al. | 2026 | arXiv | First CoT benchmark for medical imaging across 24 exam types |
| **PET-Bench** | Ye et al. | 2026 | arXiv | CoT hallucination trap in PET; Atomic Visual Alignment +14.83% accuracy |
| **LSP** | Tripathi | 2025 | arXiv | Logic Sketch Prompting; 0.83-0.89 F1 on pharmacologic compliance |

### Human-in-the-Loop Systems

| Paper | Authors | Year | Venue | Key Findings |
|-------|---------|------|-------|--------------|
| **SAGE** | Nusrat et al. | 2025 | arXiv | HITL radiosurgery planning; reasoning model shows 457 constraint verifications |
| **RaDialog** | Pellegrini et al. | 2025 | MIDL | HITL radiology assistant; SOTA clinical correctness in report generation |
| **CopilotCAD** | Wang et al. | 2024 | arXiv | AI co-pilot for radiologist workflow; reduces burnout |
| **HuLP** | Ridzuan et al. | 2024 | arXiv | Clinician intervention for prognostic correction |
| **SAMIRA** | Spiegler et al. | 2025 | arXiv | Conversational AI for medical VR; SUS=90.0 |

---

## Key Statistics for the Thesis

### Access Disparities
- **77%** of Indian cancer patients lack access to tumor boards (supporting thesis claim)
- SAARC region: **2+ billion** people with heterogeneous cancer access/outcomes
- Rural India: Greater cancer burden due to delayed diagnosis and limited access

### Multi-Agent System Performance
- **MedAgents**: Improved zero-shot medical reasoning across 9 datasets
- **UCAgents**: 71.3% PathVQA (+6.0% SOTA) with 87.7% token reduction
- **HAO for MTB**: 94% high-importance information capture
- **HPO**: 0.845 Macro F1 with 8B model (beats GPT-4o's 0.812)

### Hallucination/Safety Metrics
- **CHECK**: Reduces hallucination from 31% to 0.3%
- **DAS Red-Teaming**: 94% failure on dynamic robustness despite 80% MedQA
- **SycoEval-EM**: Acquiescence rates 0-100% across 20 LLMs
- **Atomic Fact-Checking**: 40% answer improvement, 50% hallucination detection

### Multimodal Performance
- **MedGemma**: 50% EHR error reduction after fine-tuning
- **PathOrchestra**: >95% accuracy on 47 pathology tasks
- **Prostate AI Validation**: Pathologist-level concordance (kappa 0.801)

---

## BibTeX File Location
Full BibTeX citations available at: `bibliography_agentic_vtb.bib`

---

*Compiled: January 26, 2026*
*For: Scientific Paper on Agentic Virtual Tumor Boards*
