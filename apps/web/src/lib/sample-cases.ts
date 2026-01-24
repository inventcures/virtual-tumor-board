// 10 Diverse Sample Cases for Virtual Tumor Board
// Representative across: organ sites, age, gender, staging, biomarkers, treatment modalities
// High incidence in both USA and India

export interface SampleCase {
  id: string;
  caseNumber: number;
  
  // Patient Demographics
  patient: {
    name: string;
    age: number;
    gender: "Male" | "Female";
    ecog: number;
    comorbidities: string;
    smokingHistory?: string;
    insurance: string;
    location: string; // Indian state
  };
  
  // Cancer Details
  cancer: {
    type: string;
    subtype: string;
    histology: string;
    primarySite: string;
    stage: string;
    tnm: {
      t: string;
      n: string;
      m: string;
    };
    stagingSystem: string;
  };
  
  // Biomarkers
  biomarkers: {
    name: string;
    value: string;
    actionable: boolean;
  }[];
  
  // Genomics
  genomics: {
    mutations: {
      gene: string;
      variant: string;
      actionable: boolean;
    }[];
    tmb?: number;
    msi?: string;
  };
  
  // Clinical Question
  clinicalQuestion: string;
  
  // Key considerations for this case
  keyConsiderations: string[];
  
  // Expected treatment modalities (for diversity tracking)
  expectedModalities: string[];
  
  // Incidence context
  incidenceContext: {
    usaRank: number;
    indiaRank: number;
    notes: string;
  };
}

export const SAMPLE_CASES: SampleCase[] = [
  // Case 1: Lung NSCLC (Current demo case)
  {
    id: "lung-nsclc-kras-g12c",
    caseNumber: 1,
    patient: {
      name: "Rajesh Kumar",
      age: 58,
      gender: "Male",
      ecog: 1,
      comorbidities: "Type 2 Diabetes (controlled), Hypertension (controlled)",
      smokingHistory: "30 pack-years, quit 5 years ago",
      insurance: "AYUSHMAN BHARAT",
      location: "MH",
    },
    cancer: {
      type: "LUNG",
      subtype: "NSCLC",
      histology: "Adenocarcinoma",
      primarySite: "Right upper lobe",
      stage: "Stage IIIA",
      tnm: { t: "T2b", n: "N2", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "EGFR", value: "Negative", actionable: false },
      { name: "ALK", value: "Negative", actionable: false },
      { name: "ROS1", value: "Negative", actionable: false },
      { name: "PD-L1", value: "60%", actionable: true },
      { name: "KRAS", value: "G12C Positive", actionable: true },
    ],
    genomics: {
      mutations: [
        { gene: "KRAS", variant: "G12C", actionable: true },
        { gene: "TP53", variant: "R248W", actionable: false },
      ],
      tmb: 8,
      msi: "MSS",
    },
    clinicalQuestion: "58-year-old male with Stage IIIA NSCLC (cT2bN2M0), adenocarcinoma. KRAS G12C positive, PD-L1 60%. Is this patient a candidate for definitive chemoradiotherapy vs. surgery? Should we consider KRAS G12C targeted therapy or immunotherapy consolidation?",
    keyConsiderations: ["N2 disease management", "KRAS G12C in stage III", "Durvalumab consolidation", "Indian drug availability"],
    expectedModalities: ["Chemoradiation", "Immunotherapy", "Possible targeted therapy"],
    incidenceContext: { usaRank: 2, indiaRank: 2, notes: "Leading cause of cancer death globally" },
  },

  // Case 2: Breast Cancer - HER2+ Early Stage
  {
    id: "breast-her2-early",
    caseNumber: 2,
    patient: {
      name: "Priya Sharma",
      age: 42,
      gender: "Female",
      ecog: 0,
      comorbidities: "None",
      insurance: "Private (Star Health)",
      location: "KA",
    },
    cancer: {
      type: "BREAST",
      subtype: "Invasive Ductal Carcinoma",
      histology: "IDC, Grade 2",
      primarySite: "Left breast, upper outer quadrant",
      stage: "Stage IIA",
      tnm: { t: "T2", n: "N0", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "ER", value: "Positive (90%)", actionable: true },
      { name: "PR", value: "Positive (75%)", actionable: true },
      { name: "HER2", value: "3+ (IHC)", actionable: true },
      { name: "Ki-67", value: "35%", actionable: false },
    ],
    genomics: {
      mutations: [
        { gene: "PIK3CA", variant: "H1047R", actionable: true },
      ],
      tmb: 3,
      msi: "MSS",
    },
    clinicalQuestion: "42-year-old premenopausal woman with Stage IIA (T2N0M0) left breast IDC, ER+/PR+/HER2+, Ki-67 35%. What is the optimal neoadjuvant vs adjuvant approach? Role of pertuzumab? Consideration for fertility preservation? Optimal endocrine therapy duration?",
    keyConsiderations: ["HER2+ treatment escalation", "Premenopausal endocrine therapy", "Fertility preservation", "Neoadjuvant vs adjuvant", "OncotypeDX utility in HER2+"],
    expectedModalities: ["Surgery", "Chemotherapy", "Anti-HER2 therapy", "Endocrine therapy", "Radiation"],
    incidenceContext: { usaRank: 1, indiaRank: 1, notes: "Most common cancer in women globally" },
  },

  // Case 3: Colorectal Cancer - Stage IV with Liver Mets, MSI-H
  {
    id: "colorectal-msi-h-mets",
    caseNumber: 3,
    patient: {
      name: "Venkatesh Reddy",
      age: 65,
      gender: "Male",
      ecog: 1,
      comorbidities: "Atrial fibrillation on warfarin, Mild CKD (eGFR 55)",
      insurance: "AYUSHMAN BHARAT",
      location: "AP",
    },
    cancer: {
      type: "COLORECTAL",
      subtype: "Adenocarcinoma",
      histology: "Moderately differentiated adenocarcinoma",
      primarySite: "Ascending colon",
      stage: "Stage IVA",
      tnm: { t: "T3", n: "N1", m: "M1a" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "CEA", value: "125 ng/mL", actionable: false },
      { name: "KRAS", value: "Wild-type", actionable: true },
      { name: "NRAS", value: "Wild-type", actionable: true },
      { name: "BRAF", value: "Wild-type", actionable: true },
      { name: "MSI", value: "MSI-High", actionable: true },
    ],
    genomics: {
      mutations: [
        { gene: "MLH1", variant: "Promoter hypermethylation", actionable: true },
        { gene: "APC", variant: "R1450*", actionable: false },
      ],
      tmb: 45,
      msi: "MSI-H",
    },
    clinicalQuestion: "65-year-old male with Stage IVA colon adenocarcinoma with 3 resectable liver metastases (largest 3.2cm). MSI-H, RAS/BRAF wild-type. Should we pursue upfront liver resection vs neoadjuvant immunotherapy? Role of anti-EGFR therapy in MSI-H tumors?",
    keyConsiderations: ["MSI-H immunotherapy", "Oligometastatic disease", "Liver resection timing", "Anticoagulation management", "Lynch syndrome workup"],
    expectedModalities: ["Surgery", "Immunotherapy", "Possible chemotherapy", "Anti-EGFR consideration"],
    incidenceContext: { usaRank: 4, indiaRank: 5, notes: "Rising incidence in young adults" },
  },

  // Case 4: Head & Neck (Oral Cavity) - Locally Advanced, HPV-
  {
    id: "oral-cavity-locally-advanced",
    caseNumber: 4,
    patient: {
      name: "Suresh Yadav",
      age: 55,
      gender: "Male",
      ecog: 1,
      comorbidities: "Chronic tobacco chewer (35 years), Mild hepatic dysfunction (Child-Pugh A)",
      smokingHistory: "Bidi smoker 20 pack-years",
      insurance: "PMJAY",
      location: "UP",
    },
    cancer: {
      type: "HEAD_NECK",
      subtype: "Oral Cavity SCC",
      histology: "Squamous cell carcinoma, moderately differentiated",
      primarySite: "Buccal mucosa, right",
      stage: "Stage IVA",
      tnm: { t: "T4a", n: "N2b", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "p16", value: "Negative", actionable: true },
      { name: "HPV", value: "Negative", actionable: true },
      { name: "PD-L1 CPS", value: "25", actionable: true },
    ],
    genomics: {
      mutations: [
        { gene: "TP53", variant: "R175H", actionable: false },
        { gene: "CDKN2A", variant: "Deletion", actionable: false },
        { gene: "PIK3CA", variant: "E545K", actionable: false },
      ],
      tmb: 12,
    },
    clinicalQuestion: "55-year-old male with Stage IVA (T4aN2bM0) right buccal mucosa SCC, HPV-negative, with mandibular invasion. Is this surgically resectable? Role of neoadjuvant chemotherapy? Optimal reconstruction? Post-operative RT vs CRT?",
    keyConsiderations: ["Surgical resectability with mandibular invasion", "HPV-negative prognosis", "Tobacco cessation", "Reconstruction planning", "PORT vs POCRT"],
    expectedModalities: ["Surgery with reconstruction", "Post-operative radiation", "Concurrent chemotherapy"],
    incidenceContext: { usaRank: 9, indiaRank: 3, notes: "Very high in India due to tobacco/betel nut" },
  },

  // Case 5: Cervical Cancer - Locally Advanced
  {
    id: "cervix-locally-advanced",
    caseNumber: 5,
    patient: {
      name: "Lakshmi Devi",
      age: 48,
      gender: "Female",
      ecog: 1,
      comorbidities: "Anemia (Hb 9.2), HIV negative",
      insurance: "Rashtriya Swasthya Bima Yojana",
      location: "BR",
    },
    cancer: {
      type: "CERVIX",
      subtype: "Squamous Cell Carcinoma",
      histology: "Keratinizing SCC",
      primarySite: "Cervix",
      stage: "Stage IIIB",
      tnm: { t: "T3b", n: "N1", m: "M0" },
      stagingSystem: "FIGO 2018",
    },
    biomarkers: [
      { name: "HPV", value: "HPV 16 Positive", actionable: false },
      { name: "PD-L1 CPS", value: "15", actionable: true },
      { name: "SCC-Ag", value: "28 ng/mL", actionable: false },
    ],
    genomics: {
      mutations: [
        { gene: "PIK3CA", variant: "E545K", actionable: false },
      ],
      tmb: 6,
    },
    clinicalQuestion: "48-year-old woman with FIGO Stage IIIB (T3bN1M0) cervical SCC with bilateral parametrial invasion and pelvic lymph node involvement. What is the optimal curative-intent treatment? Role of extended field RT? Addition of pembrolizumab to standard CRT?",
    keyConsiderations: ["Definitive chemoradiation", "Brachytherapy access in India", "Immunotherapy in cervical cancer", "Anemia management before RT", "Extended field RT for positive nodes"],
    expectedModalities: ["External beam radiation", "Brachytherapy", "Concurrent cisplatin", "Immunotherapy consideration"],
    incidenceContext: { usaRank: 14, indiaRank: 2, notes: "Major cause of cancer death in Indian women" },
  },

  // Case 6: Prostate Cancer - Metastatic Castration-Resistant
  {
    id: "prostate-mcrpc",
    caseNumber: 6,
    patient: {
      name: "Krishnamurthy Iyer",
      age: 72,
      gender: "Male",
      ecog: 2,
      comorbidities: "Coronary artery disease (s/p stent 2022), Diabetes, Osteoporosis",
      insurance: "Private (HDFC ERGO)",
      location: "TN",
    },
    cancer: {
      type: "PROSTATE",
      subtype: "Adenocarcinoma",
      histology: "Acinar adenocarcinoma, Gleason 4+5=9",
      primarySite: "Prostate",
      stage: "Stage IVB",
      tnm: { t: "T3b", n: "N1", m: "M1b" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "PSA", value: "245 ng/mL (rising on ADT)", actionable: false },
      { name: "AR-V7", value: "Negative", actionable: true },
      { name: "PSMA PET", value: "Diffuse bone uptake", actionable: true },
    ],
    genomics: {
      mutations: [
        { gene: "BRCA2", variant: "Germline c.5946delT", actionable: true },
        { gene: "ATM", variant: "Somatic loss", actionable: true },
      ],
      tmb: 4,
      msi: "MSS",
    },
    clinicalQuestion: "72-year-old male with mCRPC, progressing on enzalutamide after 14 months. Germline BRCA2 positive. Multiple bone metastases, no visceral disease. ECOG 2 with bone pain. Best next-line therapy? Role of PARP inhibitor? Radium-223 eligibility? Family counseling for BRCA2?",
    keyConsiderations: ["BRCA2 and PARP inhibitor", "Bone-targeted therapy", "Pain management", "ECOG 2 treatment tolerance", "Genetic counseling for family"],
    expectedModalities: ["PARP inhibitor", "Bone-targeted therapy", "Palliative radiation", "ADT continuation"],
    incidenceContext: { usaRank: 3, indiaRank: 10, notes: "Rising in India, often presents late" },
  },

  // Case 7: Gastric Cancer - Stage III
  {
    id: "gastric-stage-iii",
    caseNumber: 7,
    patient: {
      name: "Mohammad Hussain",
      age: 60,
      gender: "Male",
      ecog: 1,
      comorbidities: "H. pylori treated, Mild COPD",
      smokingHistory: "Ex-smoker, 15 pack-years",
      insurance: "AYUSHMAN BHARAT",
      location: "JK",
    },
    cancer: {
      type: "GASTRIC",
      subtype: "Adenocarcinoma",
      histology: "Intestinal type adenocarcinoma, poorly differentiated",
      primarySite: "Gastric antrum",
      stage: "Stage IIIA",
      tnm: { t: "T4a", n: "N1", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "HER2", value: "Negative (IHC 1+)", actionable: false },
      { name: "PD-L1 CPS", value: "8", actionable: true },
      { name: "EBV", value: "Negative", actionable: false },
      { name: "MSI", value: "MSS", actionable: false },
    ],
    genomics: {
      mutations: [
        { gene: "TP53", variant: "R273C", actionable: false },
        { gene: "CDH1", variant: "Wild-type", actionable: false },
      ],
      tmb: 5,
      msi: "MSS",
    },
    clinicalQuestion: "60-year-old male with Stage IIIA (T4aN1M0) gastric antrum adenocarcinoma, HER2-negative, PD-L1 CPS 8. What is the optimal perioperative approach? Role of FLOT vs other regimens? Should nivolumab be added? Extent of lymphadenectomy (D1 vs D2)?",
    keyConsiderations: ["Perioperative chemotherapy", "D2 lymphadenectomy", "Immunotherapy in gastric cancer", "Nutritional support", "H. pylori eradication confirmed"],
    expectedModalities: ["Perioperative chemotherapy", "Surgery with D2 lymphadenectomy", "Immunotherapy consideration"],
    incidenceContext: { usaRank: 15, indiaRank: 6, notes: "High in Northeast India, Kashmir" },
  },

  // Case 8: Ovarian Cancer - BRCA1+, High Grade Serous
  {
    id: "ovarian-brca1-hgsoc",
    caseNumber: 8,
    patient: {
      name: "Anita Menon",
      age: 55,
      gender: "Female",
      ecog: 1,
      comorbidities: "Hypothyroidism (controlled)",
      insurance: "Private (Max Bupa)",
      location: "KL",
    },
    cancer: {
      type: "OVARIAN",
      subtype: "High Grade Serous Carcinoma",
      histology: "HGSOC",
      primarySite: "Bilateral ovaries",
      stage: "Stage IIIC",
      tnm: { t: "T3c", n: "N1", m: "M0" },
      stagingSystem: "FIGO",
    },
    biomarkers: [
      { name: "CA-125", value: "1,250 U/mL", actionable: false },
      { name: "HE4", value: "Elevated", actionable: false },
      { name: "HRD Score", value: "Positive (score 52)", actionable: true },
    ],
    genomics: {
      mutations: [
        { gene: "BRCA1", variant: "Germline 185delAG", actionable: true },
        { gene: "TP53", variant: "R248Q", actionable: false },
      ],
      tmb: 3,
      msi: "MSS",
    },
    clinicalQuestion: "55-year-old woman with Stage IIIC (T3cN1M0) HGSOC, BRCA1 germline mutation, HRD positive. Optimal surgical approach (PDS vs NACT-IDS)? Role of HIPEC? Maintenance therapy selection - bevacizumab vs olaparib vs combination? Family screening recommendations?",
    keyConsiderations: ["Primary debulking vs NACT", "BRCA1 and PARP inhibitor maintenance", "HIPEC consideration", "Bevacizumab role", "Genetic counseling for family"],
    expectedModalities: ["Cytoreductive surgery", "Platinum-based chemotherapy", "PARP inhibitor maintenance", "Bevacizumab consideration"],
    incidenceContext: { usaRank: 11, indiaRank: 7, notes: "Often presents at advanced stage" },
  },

  // Case 9: Esophageal Cancer - Neoadjuvant Approach
  {
    id: "esophageal-neoadjuvant",
    caseNumber: 9,
    patient: {
      name: "Ramachandra Rao",
      age: 62,
      gender: "Male",
      ecog: 1,
      comorbidities: "GERD (chronic), Barrett's esophagus history, Mild hypertension",
      smokingHistory: "Never smoker",
      insurance: "CGHS",
      location: "TS",
    },
    cancer: {
      type: "ESOPHAGEAL",
      subtype: "Adenocarcinoma",
      histology: "Moderately differentiated adenocarcinoma",
      primarySite: "Distal esophagus/GEJ (Siewert Type I)",
      stage: "Stage IIB",
      tnm: { t: "T3", n: "N0", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "HER2", value: "2+ (FISH negative)", actionable: false },
      { name: "PD-L1 CPS", value: "12", actionable: true },
      { name: "MSI", value: "MSS", actionable: false },
    ],
    genomics: {
      mutations: [
        { gene: "TP53", variant: "G245S", actionable: false },
        { gene: "ERBB2", variant: "Amplification absent", actionable: false },
      ],
      tmb: 7,
      msi: "MSS",
    },
    clinicalQuestion: "62-year-old male with Stage IIB (T3N0M0) distal esophageal adenocarcinoma (Siewert I GEJ). Optimal neoadjuvant approach - CROSS vs FLOT vs chemo-immunotherapy? Surgical approach (transthoracic vs transhiatal)? Role of adjuvant nivolumab (CheckMate 577)?",
    keyConsiderations: ["Neoadjuvant chemoradiation vs chemotherapy", "Surgical approach", "Adjuvant immunotherapy if residual disease", "Nutritional optimization", "Barrett's surveillance in remaining esophagus"],
    expectedModalities: ["Neoadjuvant chemoradiation", "Esophagectomy", "Adjuvant immunotherapy consideration"],
    incidenceContext: { usaRank: 18, indiaRank: 8, notes: "High in specific regions (Kashmir, Northeast)" },
  },

  // Case 10: Pancreatic Cancer - Borderline Resectable (High Palliative Need)
  {
    id: "pancreatic-borderline-palliative",
    caseNumber: 10,
    patient: {
      name: "Kamala Sundaram",
      age: 68,
      gender: "Female",
      ecog: 2,
      comorbidities: "New-onset diabetes (3 months), Weight loss 8kg in 2 months, Chronic back pain",
      insurance: "AYUSHMAN BHARAT",
      location: "WB",
    },
    cancer: {
      type: "PANCREATIC",
      subtype: "Ductal Adenocarcinoma",
      histology: "Pancreatic ductal adenocarcinoma, moderately differentiated",
      primarySite: "Pancreatic body",
      stage: "Stage III (Borderline Resectable)",
      tnm: { t: "T4", n: "N0", m: "M0" },
      stagingSystem: "AJCC8",
    },
    biomarkers: [
      { name: "CA 19-9", value: "2,450 U/mL", actionable: false },
      { name: "CEA", value: "12 ng/mL", actionable: false },
      { name: "MSI", value: "MSS", actionable: false },
    ],
    genomics: {
      mutations: [
        { gene: "KRAS", variant: "G12D", actionable: false },
        { gene: "TP53", variant: "R175H", actionable: false },
        { gene: "CDKN2A", variant: "Homozygous deletion", actionable: false },
        { gene: "SMAD4", variant: "Loss", actionable: false },
      ],
      tmb: 2,
      msi: "MSS",
    },
    clinicalQuestion: "68-year-old woman with borderline resectable pancreatic body adenocarcinoma, CA 19-9 2,450, ECOG 2, significant weight loss and pain. SMV involvement but no distant mets on staging. Is she a surgical candidate? Role of neoadjuvant FOLFIRINOX vs gem/nab-paclitaxel? Pain management? Early palliative care integration? Goals of care discussion?",
    keyConsiderations: ["Borderline resectable assessment", "Neoadjuvant therapy selection", "Pain management (celiac plexus block)", "Nutritional support (enzyme replacement)", "Early palliative care integration", "Realistic prognosis discussion"],
    expectedModalities: ["Neoadjuvant chemotherapy", "Possible surgery if downstaged", "Palliative care integration", "Pain management"],
    incidenceContext: { usaRank: 10, indiaRank: 13, notes: "Poor prognosis, high palliative care needs" },
  },
];

// Helper function to get case by ID
export function getCaseById(id: string): SampleCase | undefined {
  return SAMPLE_CASES.find(c => c.id === id);
}

// Helper function to get case by number (1-indexed)
export function getCaseByNumber(num: number): SampleCase | undefined {
  return SAMPLE_CASES.find(c => c.caseNumber === num);
}

// Helper function to get next case in sequence
export function getNextCase(currentNumber: number): SampleCase {
  const nextNumber = (currentNumber % SAMPLE_CASES.length) + 1;
  return getCaseByNumber(nextNumber) || SAMPLE_CASES[0];
}

// Summary stats for UI
export const CASE_SUMMARY = {
  totalCases: SAMPLE_CASES.length,
  organSites: [...new Set(SAMPLE_CASES.map(c => c.cancer.type))],
  genderDistribution: {
    male: SAMPLE_CASES.filter(c => c.patient.gender === "Male").length,
    female: SAMPLE_CASES.filter(c => c.patient.gender === "Female").length,
  },
  stageDistribution: {
    early: SAMPLE_CASES.filter(c => c.cancer.stage.includes("II") && !c.cancer.stage.includes("III") && !c.cancer.stage.includes("IV")).length,
    locallyAdvanced: SAMPLE_CASES.filter(c => c.cancer.stage.includes("III")).length,
    metastatic: SAMPLE_CASES.filter(c => c.cancer.stage.includes("IV")).length,
  },
};
