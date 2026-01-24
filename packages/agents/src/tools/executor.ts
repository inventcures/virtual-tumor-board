/**
 * Tool Execution Handler
 * 
 * Executes tool calls made by Claude and returns results.
 */

import type { Citation, GuidelineSource } from "../types";
import { getRAGConnector } from "../rag";

type ToolInput = Record<string, unknown>;

export interface ToolResult {
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
  try {
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

/**
 * RAG Retrieve - Query guidelines
 */
async function executeRAGRetrieve(input: ToolInput): Promise<ToolResult> {
  const { query, source, cancer_type, max_results } = input as {
    query: string;
    source: GuidelineSource;
    cancer_type?: string;
    max_results?: number;
  };

  const rag = getRAGConnector();
  const results = await rag.query({
    query,
    source,
    cancerType: cancer_type,
    maxResults: max_results || 3,
  });

  if (results.length === 0) {
    return {
      success: true,
      data: { message: "No relevant guidelines found for this query." },
      citations: [],
    };
  }

  return {
    success: true,
    data: {
      results: results.map((r) => ({
        content: r.content,
        source: r.source,
        relevance: r.relevanceScore,
      })),
    },
    citations: results.map((r) => r.citation),
  };
}

/**
 * Literature Search - Query Semantic Scholar
 */
async function executeLiteratureSearch(input: ToolInput): Promise<ToolResult> {
  const { query, year_min, year_max, limit } = input as {
    query: string;
    year_min?: number;
    year_max?: number;
    limit?: number;
  };

  // Mock implementation - will integrate with Semantic Scholar API
  const s2ApiKey = process.env.S2_API_KEY;
  
  if (!s2ApiKey) {
    // Return mock data for testing
    return {
      success: true,
      data: {
        papers: [
          {
            title: `Recent advances in ${query.split(" ").slice(0, 3).join(" ")}`,
            authors: ["Smith J", "Johnson A", "Williams B"],
            year: 2024,
            journal: "Journal of Clinical Oncology",
            citationCount: 45,
            abstract: "This study demonstrates significant improvements in outcomes...",
          },
          {
            title: `Phase 3 trial results for ${query.split(" ").slice(0, 2).join(" ")}`,
            authors: ["Brown C", "Davis D"],
            year: 2023,
            journal: "New England Journal of Medicine",
            citationCount: 120,
            abstract: "A randomized controlled trial showing...",
          },
        ],
        total: 2,
        note: "Mock data - configure S2_API_KEY for real results",
      },
    };
  }

  // TODO: Implement actual Semantic Scholar API call
  // const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}`, {
  //   headers: { 'x-api-key': s2ApiKey }
  // });

  return {
    success: true,
    data: { message: "Literature search executed", query },
  };
}

/**
 * Staging Calculator - Compute TNM stage
 */
async function executeStagingCalculator(input: ToolInput): Promise<ToolResult> {
  const { cancer_type, t_stage, n_stage, m_stage, additional_factors } = input as {
    cancer_type: string;
    t_stage: string;
    n_stage: string;
    m_stage: string;
    additional_factors?: Record<string, unknown>;
  };

  // Simplified staging logic for NSCLC (AJCC 8th edition)
  // In production, this would be a comprehensive staging calculator
  
  let stageGroup = "Unknown";
  
  if (cancer_type === "lung_nsclc" || cancer_type.includes("lung")) {
    if (m_stage === "M1" || m_stage.startsWith("M1")) {
      stageGroup = "Stage IV";
    } else if (n_stage === "N3") {
      stageGroup = "Stage IIIB";
    } else if (n_stage === "N2") {
      if (t_stage === "T4") {
        stageGroup = "Stage IIIB";
      } else {
        stageGroup = "Stage IIIA";
      }
    } else if (n_stage === "N1") {
      if (t_stage === "T4") {
        stageGroup = "Stage IIIA";
      } else if (t_stage === "T3" || t_stage === "T2b") {
        stageGroup = "Stage IIIA";
      } else {
        stageGroup = "Stage IIB";
      }
    } else if (n_stage === "N0") {
      if (t_stage === "T4") {
        stageGroup = "Stage IIIA";
      } else if (t_stage === "T3") {
        stageGroup = "Stage IIB";
      } else if (t_stage === "T2b") {
        stageGroup = "Stage IIA";
      } else if (t_stage === "T2a") {
        stageGroup = "Stage IB";
      } else {
        stageGroup = "Stage IA";
      }
    }
  }

  return {
    success: true,
    data: {
      cancer_type,
      tnm: `${t_stage}${n_stage}${m_stage}`,
      stage_group: stageGroup,
      staging_system: "AJCC 8th Edition",
      additional_factors,
      note: "Verify staging with complete pathologic assessment",
    },
  };
}

/**
 * Drug Lookup - Check availability in India
 */
async function executeDrugLookup(input: ToolInput): Promise<ToolResult> {
  const { drug_name, indication, include_alternatives } = input as {
    drug_name: string;
    indication?: string;
    include_alternatives?: boolean;
  };

  // Mock drug database for common oncology drugs in India
  const drugDatabase: Record<string, {
    dcgiApproved: boolean;
    brands: string[];
    biosimilar: boolean;
    generic: boolean;
    monthlyCostINR: { innovator?: number; biosimilar?: number; generic?: number };
    pmjay: boolean;
    alternatives?: string[];
  }> = {
    pembrolizumab: {
      dcgiApproved: true,
      brands: ["Keytruda", "Pembroz"],
      biosimilar: false,
      generic: false,
      monthlyCostINR: { innovator: 350000 },
      pmjay: false,
      alternatives: ["nivolumab"],
    },
    nivolumab: {
      dcgiApproved: true,
      brands: ["Opdyta", "Nivomerc"],
      biosimilar: false,
      generic: false,
      monthlyCostINR: { innovator: 280000 },
      pmjay: false,
    },
    osimertinib: {
      dcgiApproved: true,
      brands: ["Tagrisso", "Osicent"],
      biosimilar: false,
      generic: true,
      monthlyCostINR: { innovator: 180000, generic: 45000 },
      pmjay: false,
      alternatives: ["gefitinib", "erlotinib"],
    },
    gefitinib: {
      dcgiApproved: true,
      brands: ["Iressa", "Geftinat"],
      biosimilar: false,
      generic: true,
      monthlyCostINR: { innovator: 45000, generic: 8000 },
      pmjay: true,
    },
    trastuzumab: {
      dcgiApproved: true,
      brands: ["Herceptin", "Herclon", "Biceltis"],
      biosimilar: true,
      generic: false,
      monthlyCostINR: { innovator: 120000, biosimilar: 25000 },
      pmjay: true,
    },
    carboplatin: {
      dcgiApproved: true,
      brands: ["Paraplatin", "Kemocarb"],
      biosimilar: false,
      generic: true,
      monthlyCostINR: { generic: 3000 },
      pmjay: true,
    },
    paclitaxel: {
      dcgiApproved: true,
      brands: ["Taxol", "Intaxel"],
      biosimilar: false,
      generic: true,
      monthlyCostINR: { generic: 5000 },
      pmjay: true,
    },
    sotorasib: {
      dcgiApproved: false,
      brands: [],
      biosimilar: false,
      generic: false,
      monthlyCostINR: {},
      pmjay: false,
      alternatives: ["consider clinical trial"],
    },
  };

  const drugKey = drug_name.toLowerCase();
  const drugInfo = drugDatabase[drugKey];

  if (!drugInfo) {
    return {
      success: true,
      data: {
        drug_name,
        found: false,
        message: "Drug not found in database. May require import or clinical trial access.",
        recommendation: "Check with institutional pharmacy for availability options.",
      },
    };
  }

  const result: Record<string, unknown> = {
    drug_name,
    found: true,
    dcgi_approved: drugInfo.dcgiApproved,
    brands_available: drugInfo.brands,
    biosimilar_available: drugInfo.biosimilar,
    generic_available: drugInfo.generic,
    estimated_monthly_cost_inr: drugInfo.monthlyCostINR,
    pmjay_coverage: drugInfo.pmjay,
    indication,
  };

  if (include_alternatives && drugInfo.alternatives) {
    result.alternatives = drugInfo.alternatives;
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * Trial Search - Search clinical trials
 */
async function executeTrialSearch(input: ToolInput): Promise<ToolResult> {
  const { condition, biomarkers, stage, location, phase } = input as {
    condition: string;
    biomarkers?: string[];
    stage?: string;
    location?: string;
    phase?: string[];
  };

  // Mock trial data
  const mockTrials = [
    {
      nctId: "NCT05xxx001",
      title: `Phase 3 Study of Novel Agent in ${condition}`,
      phase: "Phase 3",
      status: "Recruiting",
      locations: ["Tata Memorial Hospital, Mumbai", "AIIMS, Delhi"],
      eligibility: `${stage || "Advanced"} ${condition}${biomarkers?.length ? `, ${biomarkers.join(" or ")}` : ""}`,
      contact: "Contact site for details",
    },
    {
      nctId: "CTRI/2024/xxx",
      title: `Indian Multicenter Trial in ${condition}`,
      phase: "Phase 2",
      status: "Recruiting",
      locations: ["Multiple sites across India"],
      eligibility: `${condition}, Indian patients`,
      registry: "CTRI",
    },
  ];

  return {
    success: true,
    data: {
      query: { condition, biomarkers, stage, location, phase },
      trials: mockTrials,
      total: mockTrials.length,
      note: "Mock data - integrate with ClinicalTrials.gov and CTRI APIs for real results",
    },
  };
}

/**
 * Biomarker Interpret - Interpret variants
 */
async function executeBiomarkerInterpret(input: ToolInput): Promise<ToolResult> {
  const { gene, variant, cancer_type, include_trials } = input as {
    gene: string;
    variant: string;
    cancer_type?: string;
    include_trials?: boolean;
  };

  // Mock variant interpretation database
  const variantDatabase: Record<string, {
    classification: string;
    therapeuticLevel: string;
    drugs: string[];
    evidence: string;
  }> = {
    "EGFR_L858R": {
      classification: "Pathogenic",
      therapeuticLevel: "FDA Approved",
      drugs: ["Osimertinib (preferred)", "Erlotinib", "Gefitinib", "Afatinib"],
      evidence: "Level 1 - FDA approved for NSCLC",
    },
    "EGFR_exon19del": {
      classification: "Pathogenic",
      therapeuticLevel: "FDA Approved",
      drugs: ["Osimertinib (preferred)", "Erlotinib", "Gefitinib", "Afatinib"],
      evidence: "Level 1 - FDA approved for NSCLC",
    },
    "KRAS_G12C": {
      classification: "Pathogenic",
      therapeuticLevel: "FDA Approved",
      drugs: ["Sotorasib", "Adagrasib"],
      evidence: "Level 1 - FDA approved for NSCLC (sotorasib not yet DCGI approved in India)",
    },
    "ALK_fusion": {
      classification: "Pathogenic",
      therapeuticLevel: "FDA Approved",
      drugs: ["Alectinib (preferred)", "Brigatinib", "Lorlatinib", "Crizotinib"],
      evidence: "Level 1 - FDA approved for NSCLC",
    },
    "BRCA1_pathogenic": {
      classification: "Pathogenic",
      therapeuticLevel: "FDA Approved",
      drugs: ["Olaparib", "Talazoparib", "Niraparib"],
      evidence: "Level 1 - FDA approved for breast, ovarian, prostate, pancreatic cancers",
    },
  };

  const key = `${gene}_${variant}`.replace(/\s+/g, "");
  const variantInfo = variantDatabase[key];

  if (!variantInfo) {
    return {
      success: true,
      data: {
        gene,
        variant,
        found: false,
        classification: "Check ClinVar/CIViC for interpretation",
        recommendation: "Consider referral to molecular tumor board if variant significance unclear",
      },
    };
  }

  const result: Record<string, unknown> = {
    gene,
    variant,
    found: true,
    classification: variantInfo.classification,
    therapeutic_level: variantInfo.therapeuticLevel,
    matched_drugs: variantInfo.drugs,
    evidence: variantInfo.evidence,
    cancer_context: cancer_type,
  };

  if (include_trials) {
    result.mutation_matched_trials = [
      `Search ClinicalTrials.gov for: ${gene} ${variant} ${cancer_type || "cancer"}`,
    ];
  }

  return {
    success: true,
    data: result,
  };
}
