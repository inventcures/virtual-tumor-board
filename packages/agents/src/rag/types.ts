/**
 * RAG Types for Guideline Retrieval
 */

import type { GuidelineSource, Citation } from "../types";

export interface RAGQuery {
  query: string;
  source: GuidelineSource;
  cancerType?: string;
  maxResults?: number;
}

export interface RAGResult {
  content: string;
  source: GuidelineSource;
  citation: Citation;
  relevanceScore?: number;
  chunkIndex?: number;
}

export interface RAGConfig {
  /** GCP Project ID containing the File Search resources */
  gcpProjectId?: string;
  /** Gemini API Key */
  geminiApiKey?: string;
  /** File Search resource IDs by guideline source */
  fileSearchResources?: Record<GuidelineSource, string>;
  /** Use mock data for testing */
  useMock?: boolean;
}

/**
 * Guideline source metadata
 * Based on indic-layman-radonc GCP project File Search stores
 */
export const GUIDELINE_SOURCES: Record<GuidelineSource, GuidelineSourceInfo> = {
  nccn: {
    id: "nccn",
    name: "NCCN Clinical Practice Guidelines",
    itemCount: 67,
    description: "National Comprehensive Cancer Network guidelines for cancer treatment",
    citationFormat: "NCCN {cancer_type} v{version}, {section}",
    fileSearchStoreId: "nccnguidelinesrag-4ffdfolxso0s",
  },
  esmo: {
    id: "esmo",
    name: "ESMO Clinical Practice Guidelines",
    itemCount: 19,
    description: "European Society for Medical Oncology guidelines (English)",
    citationFormat: "ESMO {cancer_type} Guidelines {year}",
    fileSearchStoreId: "esmoguidelinesen-4tjmgeq3y1h8",
  },
  astro: {
    id: "astro",
    name: "ASTRO Evidence-Based Guidelines",
    itemCount: 20,
    description: "American Society for Radiation Oncology guidelines",
    citationFormat: "ASTRO {topic} Guideline {year}",
    fileSearchStoreId: "astroguidelinesrag-xanee0h0rgpp",
  },
  acr: {
    id: "acr",
    name: "ACR Appropriateness Criteria",
    itemCount: 42,
    description: "American College of Radiology imaging appropriateness criteria",
    citationFormat: "ACR Appropriateness Criteria: {topic}",
    fileSearchStoreId: "acrradiologyguidelinesrag-qt98zl8un2ht",
  },
  cap: {
    id: "cap",
    name: "CAP Cancer Protocols",
    itemCount: 103,
    description: "College of American Pathologists cancer reporting protocols",
    citationFormat: "CAP {cancer_type} Protocol v{version}",
    fileSearchStoreId: "capcancerprotocolsrag-55nmm2prh0xs",
  },
  clinvar: {
    id: "clinvar",
    name: "ClinVar + CIViC Genomics",
    itemCount: 5,
    description: "Combined ClinVar and CIViC genomic variant databases",
    citationFormat: "ClinVar/CIViC: {gene} {variant}",
    fileSearchStoreId: "clinvarcivicgenomicsrag-uat87mzcqtum",
  },
  civic: {
    id: "civic",
    name: "CIViC Database",
    itemCount: 5,
    description: "Clinical Interpretation of Variants in Cancer (shared with ClinVar)",
    citationFormat: "CIViC EID{evidence_id}: {gene} {variant}",
    fileSearchStoreId: "clinvarcivicgenomicsrag-uat87mzcqtum",
  },
};

export interface GuidelineSourceInfo {
  id: GuidelineSource;
  name: string;
  itemCount: number;
  description: string;
  citationFormat: string;
  fileSearchStoreId?: string;
}
