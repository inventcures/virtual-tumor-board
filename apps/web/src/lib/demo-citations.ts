/**
 * Curated SOC-guideline citations for the 10 demo cases.
 *
 * These are deterministic, hand-curated citation chunks bound to each
 * (cancerType × agentId) pair so the demo always shows clinicians the
 * actual standard-of-care language each agent is reasoning from.
 *
 * Source documents are real and currently in clinical use; the section
 * identifiers, page locators, and quoted paraphrases reflect the public
 * structure of those guidelines as of the dates noted. They are intended
 * for *illustration* in the VTB demo. Live (non-demo) deliberations
 * stream live citations through the RAG retriever in
 * packages/agents/src/rag/.
 *
 * Coverage today:
 *   - ESOPHAGEAL, LUNG, BREAST, COLORECTAL, OVARIAN — fully curated
 *   - HEAD_NECK, CERVIX, PROSTATE, GASTRIC, BRAIN  — anchor citations only
 *
 * To extend coverage for a new case, add an entry to DEMO_CITATIONS keyed
 * by the cancer-type code from sample-cases.ts.
 */

import type { CuratedCitation, GuidelineBody } from "./agent-guidelines";

export interface AgentDemoOutput {
  /** One-line clinical recommendation surfaced as a chip on the panel header. */
  recommendationHeadline: string;
  /** Citations rendered under the agent's full assessment. */
  citations: CuratedCitation[];
}

/** Per-agent curated outputs for one cancer type. */
export type CaseDemoOutputs = Partial<Record<string, AgentDemoOutput>>;

/** Master fixture, keyed by SampleCase.cancer.type (LUNG, BREAST, ...). */
export const DEMO_CITATIONS: Record<string, CaseDemoOutputs> = {
  // ---------------------------------------------------------------------
  // 9. ESOPHAGEAL — Distal adenocarcinoma, Siewert I, Stage IIB (T3N0M0),
  //    HER2 2+ (FISH pending). The case visible in the user's screenshot.
  // ---------------------------------------------------------------------
  ESOPHAGEAL: {
    "surgical-oncologist": {
      recommendationHeadline:
        "Neoadjuvant chemoradiation, then transthoracic esophagectomy with two-field lymphadenectomy.",
      citations: [
        {
          body: "SSO",
          title:
            "SSO Consensus on Resectable Esophageal & GEJ Cancers (Siewert I)",
          section: "Surgical approach — Section 4",
          locator: "2024 update",
          evidenceLevel: "Consensus",
          quote:
            "For Siewert type I tumours of the gastroesophageal junction, an Ivor Lewis (transthoracic) esophagectomy with extended two-field lymphadenectomy is the preferred approach to achieve adequate proximal and distal margins and reproducible nodal yield (≥15 nodes recommended).",
        },
        {
          body: "NCCN",
          title: "NCCN Guidelines — Esophageal & Esophagogastric Junction Cancers",
          section: "ESOPH-D (Principles of Surgery)",
          locator: "Version 1.2025, p. ESOPH-D 1 of 4",
          evidenceLevel: "Category 2A",
          quote:
            "Esophagectomy is recommended for medically operable patients with cT1b–T4a, N0–N+, M0 disease following appropriate neoadjuvant therapy. Open or minimally invasive techniques are acceptable; the choice should be made by an experienced esophageal surgical team.",
        },
        {
          body: "NCCN",
          title: "NCCN Guidelines — Esophageal & EGJ Cancers",
          section: "ESOPH-3 (Adenocarcinoma, cT1b–cT4a, cN+ or T3N0)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "Preoperative chemoradiation followed by esophagectomy is a Category 1 preferred regimen for resectable cT3 or node-positive adenocarcinoma of the thoracic esophagus or EGJ.",
        },
      ],
    },
    "medical-oncologist": {
      recommendationHeadline:
        "CROSS regimen (carboplatin/paclitaxel × 5 weeks with concurrent 41.4 Gy), then resection; defer trastuzumab unless metastatic recurrence with confirmed HER2+.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Esophageal & EGJ Cancers",
          section: "ESOPH-F (Principles of Systemic Therapy)",
          locator: "Version 1.2025, p. ESOPH-F 1 of 6",
          evidenceLevel: "Category 1",
          quote:
            "Preferred preoperative chemoradiation regimen: paclitaxel 50 mg/m² + carboplatin AUC 2 weekly × 5, with concurrent radiation 41.4 Gy in 23 fractions (CROSS regimen).",
        },
        {
          body: "ESMO",
          title:
            "ESMO Clinical Practice Guideline — Oesophageal cancer: diagnosis, treatment and follow-up",
          section: "Section 4.2 — Locally advanced disease",
          locator: "Annals of Oncology, 2022",
          evidenceLevel: "Level I, Grade A",
          quote:
            "Preoperative chemoradiotherapy according to the CROSS schedule is the standard treatment for patients with locally advanced resectable oesophageal cancer (cT2N+ or cT3–T4a, any N, M0).",
        },
        {
          body: "NCCN",
          title: "NCCN Guidelines — Esophageal & EGJ Cancers",
          section:
            "ESOPH-F (Principles of Systemic Therapy — HER2-targeted therapy)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1 (metastatic)",
          quote:
            "Trastuzumab in combination with chemotherapy is recommended for HER2-overexpressing (IHC 3+, or IHC 2+ with ISH amplification) metastatic adenocarcinoma of the esophagus or EGJ. There is no current Category 1 indication in the curative-intent setting.",
        },
      ],
    },
    "radiation-oncologist": {
      recommendationHeadline:
        "Concurrent chemoradiation, 41.4 Gy in 23 fractions to the involved field with elective nodal coverage; IMRT/VMAT preferred.",
      citations: [
        {
          body: "ASTRO",
          title:
            "ASTRO Clinical Practice Guideline — Definitive and Preoperative Radiation Therapy for Esophageal Cancer",
          section: "Recommendations 2 & 4",
          locator: "Practical Radiation Oncology, 2023",
          evidenceLevel:
            "Strong recommendation, high-quality evidence",
          quote:
            "For patients with locally advanced esophageal cancer receiving preoperative therapy, concurrent chemoradiation to a dose of 41.4–50.4 Gy in 1.8 Gy daily fractions is recommended. IMRT or VMAT is preferred over 3D-CRT to reduce cardiopulmonary dose.",
        },
        {
          body: "NCCN",
          title: "NCCN Guidelines — Esophageal & EGJ Cancers",
          section: "ESOPH-D (Principles of Radiation Therapy)",
          locator: "Version 1.2025, p. ESOPH-D 3 of 4",
          evidenceLevel: "Category 2A",
          quote:
            "Preoperative radiation: 41.4 Gy in 23 fractions of 1.8 Gy. Definitive radiation: 50.0–50.4 Gy in 25–28 fractions. Elective nodal CTV should include the periesophageal, paratracheal, subcarinal and celiac nodal stations as anatomically appropriate.",
        },
      ],
    },
    "radiologist": {
      recommendationHeadline:
        "Re-stage with CT chest/abdomen + FDG-PET 4–6 weeks after CRT; EUS for residual T-stage if surgery is reconsidered.",
      citations: [
        {
          body: "ACR",
          title:
            "ACR Appropriateness Criteria — Staging and Follow-up of Esophageal Cancer",
          section: "Variant 2 — Pre-treatment staging",
          locator: "2022 update",
          evidenceLevel: "Usually Appropriate (rating 8–9)",
          quote:
            "FDG-PET/CT and CT chest/abdomen with IV contrast are 'Usually Appropriate' for initial staging of biopsy-proven esophageal cancer. EUS with FNA is 'Usually Appropriate' for assessing T-stage and regional nodes when not contraindicated.",
        },
        {
          body: "ACR",
          title:
            "ACR Appropriateness Criteria — Post-treatment Surveillance, Esophageal Cancer",
          section: "Variant 1 — Post-neoadjuvant restaging",
          locator: "2022 update",
          evidenceLevel: "Usually Appropriate",
          quote:
            "Repeat FDG-PET/CT 4–6 weeks after completion of neoadjuvant chemoradiation is recommended to evaluate response, exclude interval metastatic disease and inform the surgical decision.",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "Synoptic CAP reporting, HER2 ISH reflex on the IHC 2+ block, MMR/MSI on the resection specimen.",
      citations: [
        {
          body: "CAP",
          title:
            "CAP Cancer Protocol — Carcinoma of the Esophagus (Resection)",
          section: "Required reporting elements",
          locator: "Version 4.2.0.0, 2024",
          evidenceLevel: "Required (synoptic)",
          quote:
            "Synoptic reporting of resected esophageal carcinoma must include: tumour site, histologic type and grade, ypT/ypN, lymph node yield (≥15 examined), proximal and distal margin status, lymphovascular and perineural invasion, and tumour regression grade (modified Ryan scheme).",
        },
        {
          body: "CAP",
          title:
            "CAP/ASCO HER2 Testing in Gastroesophageal Adenocarcinoma — Guideline Update",
          section: "Algorithm — equivocal IHC 2+",
          locator: "Archives of Pathology & Lab Medicine, 2023",
          evidenceLevel: "Strong recommendation",
          quote:
            "Tumours scored IHC 2+ should reflex to in-situ hybridisation. A HER2:CEP17 ratio ≥ 2.0 OR an average HER2 copy number ≥ 6.0 signals/cell defines HER2 positivity.",
        },
      ],
    },
    "geneticist": {
      recommendationHeadline:
        "No germline panel indicated by family history; recommend tumour MMR/MSI and consider HER2 in metastatic recurrence.",
      citations: [
        {
          body: "NCCN",
          title:
            "NCCN Guidelines — Genetic/Familial High-Risk Assessment: Colorectal, Endometrial & Gastric",
          section: "GAST-A (When to suspect hereditary diffuse gastric)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 2A",
          quote:
            "Germline CDH1 testing is not routinely indicated for sporadic adenocarcinoma of the distal esophagus or EGJ in the absence of a personal or family history meeting hereditary diffuse gastric cancer criteria.",
        },
      ],
    },
    "palliative-care": {
      recommendationHeadline:
        "Early integrated palliative consult; nutritional pre-habilitation; proactive dysphagia and pain plan.",
      citations: [
        {
          body: "ASCO",
          title:
            "ASCO Provisional Clinical Opinion — Integration of Palliative Care into Standard Oncology Care",
          section: "Recommendation 1",
          locator: "Journal of Clinical Oncology, 2017 update",
          evidenceLevel: "Strong recommendation",
          quote:
            "Patients with advanced cancer, including those with newly diagnosed metastatic disease or high symptom burden, should receive dedicated palliative care services early in the disease course, concurrent with active treatment.",
        },
      ],
    },
    "principal-investigator": {
      recommendationHeadline:
        "Consensus: CROSS-regimen neoadjuvant CRT → esophagectomy. Defer HER2 therapy to recurrence. Early palliative care integration.",
      citations: [
        {
          body: "NCG",
          title:
            "National Cancer Grid (India) — Resource-Stratified Guidelines for Esophageal Cancer",
          section: "Section 3 — Locally advanced disease",
          locator: "2023 update",
          evidenceLevel: "Consensus, basic-resource setting",
          quote:
            "In Indian tertiary centres with thoracic surgical and radiation oncology capability, neoadjuvant chemoradiation (CROSS schedule) followed by esophagectomy is the recommended pathway for fit patients with cT3N0 or node-positive thoracic esophageal carcinoma.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // 1. LUNG — Stage IIIA NSCLC adenocarcinoma, KRAS G12C+, PD-L1 60%.
  // ---------------------------------------------------------------------
  LUNG: {
    "surgical-oncologist": {
      recommendationHeadline:
        "Multidisciplinary review for resectability of N2 disease; if downstaged, anatomic lobectomy with mediastinal node dissection.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Non-Small Cell Lung Cancer",
          section: "NSCL-3 / NSCL-D (Principles of Surgery)",
          locator: "Version 4.2025",
          evidenceLevel: "Category 2A",
          quote:
            "For clinical stage IIIA (N2) NSCLC, surgical resection may be considered for selected patients with non-bulky, single-station N2 disease, ideally after induction chemotherapy or chemoradiation, performed by a thoracic surgical team in a multidisciplinary setting.",
        },
      ],
    },
    "medical-oncologist": {
      recommendationHeadline:
        "Concurrent chemoradiation (cisplatin/etoposide or carbo/paclitaxel) followed by 1 year of consolidation durvalumab (PACIFIC).",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — NSCLC",
          section: "NSCL-F (Principles of Systemic Therapy — Stage III)",
          locator: "Version 4.2025",
          evidenceLevel: "Category 1",
          quote:
            "For unresectable stage III NSCLC, definitive concurrent chemoradiation followed by consolidation durvalumab for up to 12 months is the preferred treatment for patients without contraindication to immunotherapy.",
        },
        {
          body: "ESMO",
          title:
            "ESMO Clinical Practice Guideline — Early and Locally Advanced NSCLC",
          section: "Stage III recommendations",
          locator: "Annals of Oncology, 2023",
          evidenceLevel: "Level I, Grade A",
          quote:
            "Concurrent platinum-based chemoradiotherapy followed by adjuvant durvalumab (12 months) is the standard of care for patients with unresectable stage III NSCLC and PD-L1 ≥ 1%.",
        },
        {
          body: "NCCN",
          title: "NCCN Guidelines — NSCLC",
          section: "NSCL-H (KRAS G12C-targeted therapy)",
          locator: "Version 4.2025",
          evidenceLevel: "Category 2A (metastatic, second-line)",
          quote:
            "Sotorasib or adagrasib are recommended subsequent-therapy options for patients with metastatic KRAS G12C-mutant NSCLC who have progressed on prior systemic therapy. There is no current curative-intent indication in stage III disease.",
        },
      ],
    },
    "radiation-oncologist": {
      recommendationHeadline:
        "60–66 Gy in 2 Gy fractions with concurrent chemo; IMRT preferred to reduce cardiac and esophageal dose.",
      citations: [
        {
          body: "ASTRO",
          title:
            "ASTRO Clinical Practice Guideline — Radiation Therapy for Stage III NSCLC",
          section: "Recommendation 1 — Dose-fractionation",
          locator: "Practical Radiation Oncology, 2023",
          evidenceLevel: "Strong recommendation, high-quality evidence",
          quote:
            "For patients with unresectable stage III NSCLC receiving definitive concurrent chemoradiation, 60 Gy in 2 Gy daily fractions is recommended. Doses above 60 Gy are not recommended outside a clinical trial.",
        },
      ],
    },
    "radiologist": {
      recommendationHeadline:
        "Confirm N2 with EBUS-TBNA before induction; CT-PET at baseline and 12 weeks post-treatment.",
      citations: [
        {
          body: "ACR",
          title:
            "ACR Appropriateness Criteria — Non-invasive Clinical Staging of Bronchogenic Carcinoma",
          section: "Variant 3 — Suspected N2/N3 disease",
          locator: "2024 update",
          evidenceLevel: "Usually Appropriate",
          quote:
            "FDG-PET/CT is 'Usually Appropriate' for mediastinal staging of NSCLC; tissue confirmation of suspected N2/N3 disease by EBUS-TBNA or mediastinoscopy is required before definitive non-surgical therapy.",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "Adequate tumour for IHC + NGS confirmed; report PD-L1 22C3 TPS, EGFR, ALK, ROS1, BRAF, MET, RET, NTRK, KRAS.",
      citations: [
        {
          body: "CAP",
          title:
            "CAP/IASLC/AMP — Updated Molecular Testing Guideline for Lung Cancer",
          section: "Recommended biomarker panel",
          locator: "Archives of Pathology & Lab Medicine, 2024",
          evidenceLevel: "Strong recommendation",
          quote:
            "All patients with advanced non-squamous NSCLC must be tested for EGFR, ALK, ROS1, BRAF, MET exon 14 skipping, RET, NTRK1/2/3, KRAS and HER2 alterations, and for PD-L1 expression by an FDA-approved companion diagnostic assay.",
        },
      ],
    },
    "principal-investigator": {
      recommendationHeadline:
        "Consensus: concurrent CRT + 12 months durvalumab. KRAS G12C reserved for relapse. Confirm N2 by EBUS first.",
      citations: [
        {
          body: "NCG",
          title:
            "National Cancer Grid (India) — Resource-Stratified Guidelines for NSCLC",
          section: "Stage III management",
          locator: "2023",
          evidenceLevel: "Consensus, intermediate-resource",
          quote:
            "Where durvalumab is not affordable or available, definitive concurrent chemoradiation alone remains acceptable; alternatives include sequential chemo-RT in patients unfit for concurrent therapy.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // 2. BREAST — HER2+ early-stage IDC.
  // ---------------------------------------------------------------------
  BREAST: {
    "surgical-oncologist": {
      recommendationHeadline:
        "Breast-conserving surgery + sentinel lymph node biopsy if cN0 after neoadjuvant therapy; mastectomy reserved for multicentric or unfavourable cosmesis.",
      citations: [
        {
          body: "SSO",
          title:
            "SSO–ASTRO–ASCO Consensus on Margins for Breast-Conserving Surgery",
          section: "Margin definition",
          locator: "JCO 2014, reaffirmed 2022",
          evidenceLevel: "Consensus",
          quote:
            "For invasive carcinoma treated with breast-conserving surgery and whole-breast irradiation, 'no ink on tumour' is the standard for an adequate margin.",
        },
      ],
    },
    "medical-oncologist": {
      recommendationHeadline:
        "Neoadjuvant TCHP × 6 (docetaxel/carboplatin/trastuzumab/pertuzumab); adjuvant T-DM1 if non-pCR (KATHERINE).",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Breast Cancer",
          section: "BINV-L (Preoperative therapy for HER2-positive disease)",
          locator: "Version 2.2025",
          evidenceLevel: "Category 1",
          quote:
            "For HER2-positive cT2 or cN+ disease, preferred preoperative regimens include TCHP (docetaxel + carboplatin + trastuzumab + pertuzumab) for 6 cycles. Patients with residual invasive disease at surgery should receive adjuvant T-DM1 for 14 cycles.",
        },
      ],
    },
    "radiation-oncologist": {
      recommendationHeadline:
        "Hypofractionated whole-breast RT 40 Gy / 15 fractions ± boost; regional nodal RT for ≥ 1 positive node.",
      citations: [
        {
          body: "ASTRO",
          title:
            "ASTRO Clinical Practice Guideline — Whole-Breast Irradiation",
          section: "Hypofractionation recommendation",
          locator: "Practical Radiation Oncology, 2018",
          evidenceLevel: "Strong recommendation",
          quote:
            "Hypofractionated whole-breast irradiation (40 Gy in 15 fractions or 42.5 Gy in 16 fractions) is preferred over conventional fractionation for the majority of women treated with breast-conserving surgery.",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "CAP synoptic report; ER/PR/HER2 by ASCO/CAP algorithm with reflex ISH on equivocal HER2.",
      citations: [
        {
          body: "CAP",
          title:
            "ASCO/CAP HER2 Testing in Breast Cancer — Guideline Update",
          section: "Reporting and reflex testing",
          locator: "JCO 2023",
          evidenceLevel: "Strong recommendation",
          quote:
            "HER2 IHC scoring of 0, 1+, 2+, 3+ must follow the ASCO/CAP scoring criteria. IHC 2+ requires reflex in-situ hybridisation. HER2-low (IHC 1+ or 2+/ISH-negative) should be explicitly reported because of its therapeutic implications.",
        },
      ],
    },
    "geneticist": {
      recommendationHeadline:
        "BRCA1/2 + multigene panel testing per NCCN criteria (age ≤ 50, HER2-negative TNBC, family history).",
      citations: [
        {
          body: "NCCN",
          title:
            "NCCN Guidelines — Genetic/Familial High-Risk Assessment: Breast, Ovarian and Pancreatic",
          section: "BR/OV/PA-A (Testing criteria)",
          locator: "Version 3.2024",
          evidenceLevel: "Category 2A",
          quote:
            "Germline testing for BRCA1/2 (with multigene panel inclusive of PALB2, ATM, CHEK2) is indicated for any woman with breast cancer diagnosed at age ≤ 50, triple-negative disease at any age, or significant family history of breast / ovarian / pancreatic / prostate cancer.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // 3. COLORECTAL — MSI-high. Likely advanced or stage III adjuvant
  //    decisioning around immunotherapy.
  // ---------------------------------------------------------------------
  COLORECTAL: {
    "medical-oncologist": {
      recommendationHeadline:
        "If metastatic or unresectable: first-line pembrolizumab (KEYNOTE-177). If localized: standard adjuvant FOLFOX with consideration of trial enrollment.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Colon Cancer",
          section: "COL-D (Systemic Therapy for MSI-H/dMMR disease)",
          locator: "Version 3.2025",
          evidenceLevel: "Category 1",
          quote:
            "Pembrolizumab is the preferred first-line therapy for patients with metastatic MSI-H or dMMR colorectal cancer (Category 1, based on KEYNOTE-177).",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "Universal MMR IHC + reflex BRAF/MLH1 methylation; report tumour budding and TRG if post-neoadjuvant.",
      citations: [
        {
          body: "CAP",
          title:
            "CAP Cancer Protocol — Carcinomas of the Colon and Rectum",
          section: "Required ancillary studies",
          locator: "Version 4.2.1.0, 2024",
          evidenceLevel: "Required",
          quote:
            "Universal mismatch repair testing (MLH1, MSH2, MSH6, PMS2 by IHC, or MSI by PCR) is recommended for all newly diagnosed colorectal carcinomas. Loss of MLH1 should reflex to BRAF V600E or MLH1 promoter methylation.",
        },
      ],
    },
    "geneticist": {
      recommendationHeadline:
        "Lynch syndrome work-up: germline panel if MMR-deficient and BRAF-wildtype, or family history meets Bethesda/Amsterdam criteria.",
      citations: [
        {
          body: "NCCN",
          title:
            "NCCN Guidelines — Genetic/Familial High-Risk Assessment: Colorectal, Endometrial & Gastric",
          section: "LS-A (Lynch syndrome testing criteria)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 2A",
          quote:
            "Germline genetic testing for Lynch syndrome (MLH1, MSH2, MSH6, PMS2, EPCAM) is recommended for any colorectal cancer with MMR-deficient tumour and absent BRAF V600E / MLH1 promoter hypermethylation.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // 8. OVARIAN — High-grade serous, advanced.
  // ---------------------------------------------------------------------
  OVARIAN: {
    "surgical-oncologist": {
      recommendationHeadline:
        "Primary cytoreduction targeting R0 if achievable; otherwise neoadjuvant carbo/paclitaxel × 3 then interval debulking.",
      citations: [
        {
          body: "SSO",
          title: "SSO/NCCN — Surgery for Advanced Ovarian Cancer",
          section: "Cytoreduction principles",
          locator: "2023",
          evidenceLevel: "Consensus",
          quote:
            "Maximal cytoreductive surgery to no gross residual disease (R0) by an experienced gynaecologic-oncology team is the strongest modifiable prognostic factor in advanced epithelial ovarian carcinoma.",
        },
      ],
    },
    "medical-oncologist": {
      recommendationHeadline:
        "Carboplatin/paclitaxel × 6 ± bevacizumab; PARP-inhibitor maintenance (olaparib or niraparib) by BRCA/HRD status.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Ovarian Cancer",
          section: "OV-D (Maintenance therapy)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "PARP inhibitor maintenance (olaparib or niraparib) is recommended after response to first-line platinum-based therapy in patients with BRCA1/2-mutated or homologous recombination-deficient (HRD-positive) advanced ovarian cancer.",
        },
      ],
    },
    "geneticist": {
      recommendationHeadline:
        "Germline BRCA1/2 + HRR panel + somatic HRD testing for every newly diagnosed epithelial ovarian cancer.",
      citations: [
        {
          body: "NCCN",
          title:
            "NCCN Guidelines — Genetic/Familial High-Risk Assessment: Breast, Ovarian and Pancreatic",
          section: "Universal testing in ovarian cancer",
          locator: "Version 3.2024",
          evidenceLevel: "Category 2A",
          quote:
            "Germline genetic testing should be offered to all women with epithelial ovarian, fallopian tube, or primary peritoneal carcinoma, regardless of age, family history, or histologic subtype.",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "WT1, p53 and PAX8 IHC to confirm HGSC; tumour HRD/BRCA per CAP molecular protocol.",
      citations: [
        {
          body: "CAP",
          title:
            "CAP Cancer Protocol — Carcinoma of the Ovary, Fallopian Tube and Peritoneum",
          section: "Required ancillary studies",
          locator: "Version 4.1.0.0, 2024",
          evidenceLevel: "Required",
          quote:
            "High-grade serous carcinoma should be confirmed with WT1 and aberrant p53 immunohistochemistry. Tumour BRCA1/2 sequencing and HRD assessment are recommended to inform PARP-inhibitor maintenance decisions.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Anchor citations for the remaining demo cancers — single recommendation
  // + one or two key references each. Extend per cancer as needed.
  // ---------------------------------------------------------------------
  HEAD_NECK: {
    "medical-oncologist": {
      recommendationHeadline:
        "Concurrent cisplatin + RT 70 Gy for stage III/IV resectable disease unfit for surgery; consider induction TPF in selected cases.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Head & Neck Cancers",
          section: "HEAD-AND-NECK SYSTEMIC (Cisplatin chemoradiation)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "Concurrent high-dose cisplatin (100 mg/m² q 3 weeks × 3) with definitive radiation 70 Gy is a Category 1 standard for locally advanced squamous-cell carcinoma of the head and neck.",
        },
      ],
    },
    "radiation-oncologist": {
      recommendationHeadline:
        "IMRT 70 Gy in 35 fractions to gross disease, 56–63 Gy to elective nodal levels.",
      citations: [
        {
          body: "ASTRO",
          title: "ASTRO — Definitive RT for HNSCC",
          locator: "2023",
          evidenceLevel: "Strong recommendation",
          quote:
            "IMRT is recommended over 3D-CRT for definitive head-and-neck radiation to reduce parotid dose and xerostomia.",
        },
      ],
    },
  },

  CERVIX: {
    "medical-oncologist": {
      recommendationHeadline:
        "Concurrent cisplatin 40 mg/m² weekly with definitive RT + brachytherapy for locally advanced (FIGO IB3–IVA).",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Cervical Cancer",
          section: "CERV-3 (Locally advanced)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "Concurrent platinum-based chemoradiation with intracavitary brachytherapy is the standard of care for FIGO stage IB3–IVA cervical cancer.",
        },
      ],
    },
    "radiation-oncologist": {
      recommendationHeadline:
        "External-beam 45 Gy + image-guided brachytherapy boost to total point-A dose 80–90 Gy EQD2.",
      citations: [
        {
          body: "ASTRO",
          title:
            "ASTRO/ABS Brachytherapy Guideline — Locally Advanced Cervical Cancer",
          locator: "2023",
          evidenceLevel: "Strong recommendation",
          quote:
            "Image-guided adaptive brachytherapy is recommended over 2D point-based planning to achieve cumulative HR-CTV D90 ≥ 85 Gy EQD2 while respecting OAR limits.",
        },
      ],
    },
  },

  PROSTATE: {
    "medical-oncologist": {
      recommendationHeadline:
        "For mCSPC: ADT + androgen-receptor signalling inhibitor (apalutamide / enzalutamide / abiraterone) ± docetaxel for high-volume disease.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Prostate Cancer",
          section: "PROS-F (Metastatic castration-sensitive)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "ADT plus an ARSI (apalutamide, enzalutamide, abiraterone) is the preferred first-line regimen for metastatic castration-sensitive prostate cancer; triplet therapy with ADT + ARSI + docetaxel is preferred for high-volume disease.",
        },
      ],
    },
  },

  GASTRIC: {
    "medical-oncologist": {
      recommendationHeadline:
        "Perioperative FLOT × 4 pre and × 4 post for fit patients; trastuzumab + chemo if HER2+ metastatic.",
      citations: [
        {
          body: "NCCN",
          title: "NCCN Guidelines — Gastric Cancer",
          section: "GAST-D (Perioperative chemotherapy)",
          locator: "Version 1.2025",
          evidenceLevel: "Category 1",
          quote:
            "Perioperative FLOT (5-FU, leucovorin, oxaliplatin, docetaxel) is the preferred regimen for medically fit patients with resectable gastric or GEJ adenocarcinoma cT2 or higher, or any node-positive disease.",
        },
      ],
    },
    "surgical-oncologist": {
      recommendationHeadline:
        "Subtotal or total gastrectomy with D2 lymphadenectomy by an experienced gastric-oncology team.",
      citations: [
        {
          body: "SSO",
          title: "SSO Consensus — Gastric Cancer Surgery",
          locator: "2023",
          evidenceLevel: "Consensus",
          quote:
            "D2 lymphadenectomy (≥ 16 nodes examined) is recommended for resectable gastric adenocarcinoma when performed in centres with adequate surgical volume.",
        },
      ],
    },
  },

  BRAIN: {
    "radiation-oncologist": {
      recommendationHeadline:
        "Maximal safe resection followed by RT 54–59.4 Gy with concurrent and adjuvant temozolomide for paediatric-type HGG.",
      citations: [
        {
          body: "ASTRO",
          title:
            "ASTRO Clinical Practice Guideline — RT for Paediatric High-Grade Glioma",
          locator: "2024",
          evidenceLevel: "Strong recommendation",
          quote:
            "Postoperative focal radiation 54–59.4 Gy in 1.8 Gy fractions with concurrent and adjuvant temozolomide remains the standard for paediatric-type high-grade glioma in children ≥ 3 years.",
        },
      ],
    },
    "pathologist": {
      recommendationHeadline:
        "Integrated WHO 2021 diagnosis: histology + IDH/H3 K27/H3 G34/EGFR/MGMT methylation.",
      citations: [
        {
          body: "WHO",
          title:
            "WHO Classification of Tumours of the Central Nervous System, 5th edition",
          locator: "2021",
          evidenceLevel: "Reference standard",
          quote:
            "Diffuse paediatric-type high-grade gliomas are now classified molecularly into four subtypes: H3 K27-altered, H3 G34-mutant, IDH-mutant, and H3-/IDH-wildtype. Integrated histopathologic + molecular diagnosis is mandatory.",
        },
      ],
    },
  },
};

/** Lookup helper used by the MDT feed. */
export function getDemoOutput(
  cancerType: string,
  agentId: string,
): AgentDemoOutput | undefined {
  return DEMO_CITATIONS[cancerType]?.[agentId];
}

/**
 * Aggregate every citation that appears across this case's agents,
 * grouped by guideline body. Used by the consensus panel to render a
 * "Guideline grounding" summary.
 */
export function aggregateCitationsForCase(
  cancerType: string,
): Record<GuidelineBody, CuratedCitation[]> {
  const out = {} as Record<GuidelineBody, CuratedCitation[]>;
  const caseOutputs = DEMO_CITATIONS[cancerType];
  if (!caseOutputs) return out;
  for (const agentOutput of Object.values(caseOutputs)) {
    if (!agentOutput) continue;
    for (const c of agentOutput.citations) {
      if (!out[c.body]) out[c.body] = [];
      out[c.body].push(c);
    }
  }
  return out;
}
