/**
 * Tool Definitions for Claude SDK
 * 
 * Each tool is defined with name, description, and JSON schema for input validation.
 */

import type Anthropic from "@anthropic-ai/sdk";

/**
 * RAG Retrieval Tool - Fetches guideline content from indexed sources
 */
export const ragRetrieveTool: Anthropic.Messages.Tool = {
  name: "rag_retrieve",
  description: `Retrieve clinical guideline content from indexed sources.
Sources available: NCCN (76 documents), ESMO (8), ASTRO (20), ACR (42), CAP (16), ClinVar (5), CIViC (7).
Use this to ground recommendations in evidence-based guidelines.
ALWAYS cite the source and section in your response.`,
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
        description: "Cancer type context (e.g., 'lung_nsclc', 'breast', 'colorectal')",
      },
      max_results: {
        type: "number",
        description: "Maximum number of relevant sections to return (default: 3)",
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
  description: `Search medical literature via Semantic Scholar (200M+ papers indexed).
Use for recent research, clinical trial results, and evidence not yet in guidelines.
Prioritize high-citation papers from reputable journals.`,
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query (e.g., 'KRAS G12C sotorasib lung adenocarcinoma phase 3')",
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
        description: "Number of papers to return (default: 5, max: 20)",
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
Returns stage group and prognostic implications.`,
  input_schema: {
    type: "object" as const,
    properties: {
      cancer_type: {
        type: "string",
        description: "Cancer type (e.g., 'lung_nsclc', 'breast', 'colorectal', 'gastric')",
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
  description: `Look up oncology drug availability and cost in India.
Returns: DCGI approval status, brand names, biosimilar/generic availability, estimated monthly cost, PMJAY coverage.
Use when recommending systemic therapy to check feasibility in Indian context.`,
  input_schema: {
    type: "object" as const,
    properties: {
      drug_name: {
        type: "string",
        description: "Generic drug name (e.g., 'pembrolizumab', 'osimertinib', 'trastuzumab')",
      },
      indication: {
        type: "string",
        description: "Cancer indication being considered",
      },
      include_alternatives: {
        type: "boolean",
        description: "Include therapeutic alternatives if primary unavailable/expensive",
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
Returns actively recruiting trials with eligibility summary.`,
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
        description: "Relevant biomarkers (e.g., ['KRAS G12C', 'PD-L1 high'])",
      },
      stage: {
        type: "string",
        description: "Cancer stage (e.g., 'Stage IIIA', 'Metastatic')",
      },
      location: {
        type: "string",
        description: "Location filter (e.g., 'India', 'Mumbai', 'Delhi')",
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
  description: `Interpret genetic variants and biomarkers using ClinVar and CIViC databases.
Returns: pathogenicity classification, therapeutic implications, approved targeted therapies.
Use for variant interpretation and treatment matching.`,
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
      include_trials: {
        type: "boolean",
        description: "Include mutation-matched clinical trials",
      },
    },
    required: ["gene", "variant"],
  },
};

/**
 * All available tools
 */
export const ALL_TOOLS: Anthropic.Messages.Tool[] = [
  ragRetrieveTool,
  literatureSearchTool,
  stagingCalculatorTool,
  drugLookupTool,
  trialSearchTool,
  biomarkerInterpretTool,
];
