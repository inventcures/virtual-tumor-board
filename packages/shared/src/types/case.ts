/**
 * Case Types for Virtual Tumor Board
 * Represents patient cases submitted for tumor board discussion
 */

export interface CaseData {
  id: string;
  patient: PatientSummary;
  diagnosis: DiagnosisSummary;
  clinicalQuestion: string;
  priority: "urgent" | "routine";
  documents?: DocumentSummary[];
  submittedAt: Date;
  submittedBy?: string;
}

export interface PatientSummary {
  id: string;
  mrn?: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  ecogPs: number; // 0-4
  comorbidities?: string[];
  smokingHistory?: string;
  insuranceType?: InsuranceType;
  state?: string; // Indian state
  language?: string;
}

export type InsuranceType =
  | "ayushman_bharat"
  | "cghs"
  | "esis"
  | "private"
  | "self_pay";

export interface DiagnosisSummary {
  cancerType: string; // e.g., "lung_nsclc", "breast", "colorectal"
  histology: string;
  histologyCode?: string; // ICD-O-3
  primarySite: string;
  primarySiteCode?: string; // ICD-O-3
  stage: StagingSummary;
  biomarkers: BiomarkerResult[];
  genomics?: GenomicsSummary;
  diagnosisDate: Date;
}

export interface StagingSummary {
  clinical: TNMStage;
  pathological?: TNMStage;
  composite: string; // e.g., "Stage IIIA"
  stagingSystem: "ajcc8" | "figo" | "other";
}

export interface TNMStage {
  t: string;
  n: string;
  m: string;
}

export interface BiomarkerResult {
  name: string; // e.g., "EGFR", "PDL1", "HER2"
  result: string; // e.g., "Positive", "60%", "Equivocal"
  method?: string; // e.g., "IHC", "FISH", "NGS"
  interpretation?: string;
}

export interface GenomicsSummary {
  testType: "panel" | "wes" | "wgs" | "targeted";
  mutations: MutationResult[];
  tmb?: number; // Tumor Mutational Burden
  msi?: "MSS" | "MSI-L" | "MSI-H";
  testDate?: Date;
  lab?: string;
}

export interface MutationResult {
  gene: string;
  variant: string;
  vaf?: number; // Variant Allele Frequency
  classification: "pathogenic" | "likely_pathogenic" | "vus" | "likely_benign" | "benign";
  actionable: boolean;
}

export interface DocumentSummary {
  id: string;
  type: DocumentType;
  name: string;
  uploadedAt: Date;
  extractedText?: string;
}

export type DocumentType =
  | "pathology_report"
  | "radiology_report"
  | "lab_report"
  | "genomic_report"
  | "clinical_note"
  | "prior_treatment"
  | "other";

/**
 * Demo case for testing
 */
export const DEMO_CASE: CaseData = {
  id: "demo-case-001",
  patient: {
    id: "patient-001",
    mrn: "MRN-2024-12345",
    name: "Rajesh Kumar",
    age: 58,
    gender: "male",
    ecogPs: 1,
    comorbidities: ["Type 2 Diabetes", "Hypertension"],
    smokingHistory: "30 pack-years, quit 5 years ago",
    insuranceType: "ayushman_bharat",
    state: "MH", // Maharashtra
    language: "hindi",
  },
  diagnosis: {
    cancerType: "lung_nsclc",
    histology: "Adenocarcinoma",
    histologyCode: "8140/3",
    primarySite: "Right upper lobe",
    primarySiteCode: "C34.1",
    stage: {
      clinical: { t: "T2b", n: "N2", m: "M0" },
      composite: "Stage IIIA",
      stagingSystem: "ajcc8",
    },
    biomarkers: [
      { name: "EGFR", result: "Negative", method: "NGS" },
      { name: "ALK", result: "Negative", method: "IHC/FISH" },
      { name: "ROS1", result: "Negative", method: "IHC" },
      { name: "PD-L1", result: "60%", method: "IHC (22C3)", interpretation: "High expression" },
      { name: "KRAS", result: "G12C Positive", method: "NGS", interpretation: "Actionable mutation" },
    ],
    genomics: {
      testType: "panel",
      mutations: [
        {
          gene: "KRAS",
          variant: "G12C",
          vaf: 35,
          classification: "pathogenic",
          actionable: true,
        },
        {
          gene: "TP53",
          variant: "R248W",
          vaf: 42,
          classification: "pathogenic",
          actionable: false,
        },
      ],
      tmb: 8,
      msi: "MSS",
    },
    diagnosisDate: new Date("2024-01-10"),
  },
  clinicalQuestion:
    "Is this patient a candidate for definitive chemoradiotherapy vs surgery? Should we consider KRAS G12C targeted therapy or immunotherapy given PD-L1 60%?",
  priority: "routine",
  submittedAt: new Date(),
};
