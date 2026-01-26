# Changelog

All notable changes to the Virtual Tumor Board project are documented here.

## [2026-01-26] - Scientific Paper & Deliberation Engine

### Added
- **V11 Scientific Paper**: Comprehensive reference audit with 22 verified citations
  - Fixed 17 incorrect arXiv/citation references
  - Removed 1 fabricated reference (Ghafoor et al.)
  - Verified all in-text claims against source papers (MIRIAD, ColaCare, MedGemma, etc.)
- **V10 Scientific Paper**: Commercial version for enterprise licensing
  - Removed all open-source/GitHub references
  - Updated contact to virtualtumorboard.ai
- **V9 Scientific Paper**: 18-page comprehensive expansion with SOTA citations
  - Added Related Work section with current literature
  - TikZ architecture diagrams and evaluation tables
  - Gwern style guide and Saloni visualization principles
- **V7 Deliberation Engine**: Next-generation multi-agent deliberation
  - Phase 1: New specialist agents and types
  - Phase 2: Orchestrator logic and deliberation phases
  - Phase 3-4: UI components and specialist prompts
  - Polished AgentCard and ConsensusPanel components

### Changed
- Updated landing page origin story with real MRI staging scenario
  - Added specific "sclerotic changes vs mets" diagnostic confusion
  - Highlighted privilege of accessing MTB with top oncologists
  - Core mission: democratize access to every cancer patient

### Fixed
- LaTeX itemize/enumerate mismatch in paper
- Pending agents display in deliberation UI
- WhatsApp share functionality on desktop

## [2026-01-25] - MedGemma & Imaging Integration

### Added
- **MedGemma Integration**
  - Vertex AI as primary inference with HuggingFace Space fallback
  - Dr. Chitran imaging agent for radiology reconciliation
  - Progressive disclosure visualization system
- **OncoSeg 3D Tumor Segmentation**
  - NIfTI (.nii, .nii.gz) file support
  - Integration for volumetric tumor analysis
- **Admin Analytics Dashboard**
  - PostgreSQL persistence for analytics
  - Trend charts and CSV export
  - MedGemma and OncoSeg usage logging
- **User Document Upload (V4-V5)**
  - Phase 1: Upload cancer records (PDF, JPG, PNG)
  - Phase 2: Connect uploads to AI tumor board deliberation
  - Auto-staging and caching system
  - Timeline visualization (horizontal/vertical views)
- **Enhanced Reporting**
  - PDF preview modal with WhatsApp sharing
  - Expandable specialist cards with full opinions
  - Medical literacy levels in reports
  - Composite document handling
  - Indian medical terminology support
- **Imaging Infrastructure**
  - DICOM viewer with TCIA cancer scans
  - Camera capture for mobile imaging
  - Cloudflare R2 CDN with GitHub Pages fallback
  - Real-time collaboration layer for imaging review
  - Case-specific volumes with tumor overlays

### Fixed
- Gradio async API compatibility for HuggingFace Spaces
- localStorage 5MB quota exceeded issue
- maxTokens increased to 4000 for full specialist opinions
- Correct API key environment variable handling on Railway

## [2026-01-24] - DICOM Viewer & AI Fallback

### Added
- **DICOM Viewer**
  - Modern Tobi-style UI redesign
  - Synthetic CT generation with radiology reports
  - Realistic tumor morphology with lobulation and spiculation
  - Brain MRI realism with proper anatomy and T1 signal intensities
- **AI Provider Fallback**
  - Gemini fallback when Claude API fails/exhausted
  - Support for Gemini 1.5 Flash, 2.0 Flash, 2.5 Pro, 3 Pro Preview
  - Multiple provider detection and automatic switching
- **Python Segmentation Service**
  - Railway deployment configuration
  - Real-time tumor segmentation capabilities

### Fixed
- Viewer displays case-specific body region and series
- Proper handling of 400 errors for Gemini fallback

## [Earlier] - Foundation

### Added
- Initial project setup with Next.js
- 10 synthetic cancer cases across multiple cancer types
- 7 AI specialist agents (Medical Oncologist, Surgical Oncologist, Radiation Oncologist, Pathologist, Radiologist, Palliative Care, Molecular/Genetics)
- Grounding in international clinical guidelines (NCCN, ESMO, ASTRO, CAP, ACR, ASCO, ACMG)
- Indian clinical context support (PMJAY coverage, biosimilar availability)
- Privacy-first architecture (browser-based processing, no PII storage)

---

## Reference Corrections Log (V11)

Key citation corrections made in the scientific paper:

| Ref | Paper | Incorrect | Corrected |
|-----|-------|-----------|-----------|
| [3] | ColaCare | arXiv:2402.12827 | arXiv:2410.02551 |
| [5] | HAO/Blondeel | AMIA 2025 | arXiv:2509.06602 |
| [6] | CHECK | arXiv:2501.xxxxx | arXiv:2506.11129 |
| [7] | SycEval | arXiv:2501.xxxxx | arXiv:2502.08177 |
| [8] | DAS | arXiv:2501.xxxxx | arXiv:2508.00923 |
| [9] | MARC-v1 | penn-rail.org | github.com/Penn-RAIL/MARC-v1 |
| [10] | MIRIAD | Nature Medicine 2025 | arXiv:2506.06091 |
| [11] | MedGemma | Google Health 2025 | arXiv:2507.05201 |
| [12] | PathFound | CVPR 2025 | arXiv:2512.23545 |
| [13] | AMIE | arXiv:2401.xxxxx | arXiv:2411.03395 |
| [14] | Mohammed NCCN | JCO CCI 2025 | arXiv:2502.15698 |
| [16] | Ke RAG | Anesthesia & Analgesia | arXiv:2402.01733 |
| [18] | MedCoAct | arXiv:2501.xxxxx | arXiv:2510.10461 |
| [19] | Kim TAO | JAMIA 2025 | arXiv:2506.12482 |
| [20] | MedLog/Noori | Lancet Digital Health | arXiv:2510.04033 |
| [21] | Menon | Lancet Oncology 2026 | Lancet Global Health 2026 |
| [22] | Debnath | IJMR 2025 | Frontiers in Oncology 2025 |

**Removed**: Ghafoor et al. "Multi-Agent Refinement Framework" (fabricated/hallucinated reference)
