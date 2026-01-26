/**
 * RAG Connector - Gemini File Search Integration
 * 
 * Connects to the indic-layman-radonc GCP project's File Search resources
 * for guideline retrieval (NCCN, ESMO, ASTRO, ACR, CAP, ClinVar/CIViC).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GuidelineSource, Citation } from "../types";
import type { RAGQuery, RAGResult, RAGConfig } from "./types";
import { GUIDELINE_SOURCES } from "./types";

/**
 * File Search Store IDs by guideline source
 * From indic-layman-radonc GCP project (gen-lang-client-0198594002)
 */
const FILE_SEARCH_STORES: Record<GuidelineSource, string> = {
  nccn: process.env.FILE_SEARCH_NCCN || "nccnguidelinesrag-4ffdfolxso0s",
  "nccn-resource-stratified": process.env.FILE_SEARCH_NCCN || "nccnguidelinesrag-4ffdfolxso0s", // Same as NCCN for now
  esmo: process.env.FILE_SEARCH_ESMO || "esmoguidelinesen-4tjmgeq3y1h8",
  astro: process.env.FILE_SEARCH_ASTRO || "astroguidelinesrag-xanee0h0rgpp",
  acr: process.env.FILE_SEARCH_ACR || "acrradiologyguidelinesrag-qt98zl8un2ht",
  cap: process.env.FILE_SEARCH_CAP || "capcancerprotocolsrag-55nmm2prh0xs",
  clinvar: process.env.FILE_SEARCH_GENOMICS || "clinvarcivicgenomicsrag-uat87mzcqtum",
  civic: process.env.FILE_SEARCH_GENOMICS || "clinvarcivicgenomicsrag-uat87mzcqtum",
  sso: process.env.FILE_SEARCH_SSO || "ssoguidelinesrag-pending", // SSO: Pending File Search store creation
};

/**
 * RAG Connector class for guideline retrieval via Gemini File Search
 */
export class RAGConnector {
  private config: RAGConfig;
  private genAI: GoogleGenerativeAI | null = null;
  private initialized: boolean = false;

  constructor(config: RAGConfig = {}) {
    this.config = {
      geminiApiKey: process.env.GOOGLE_AI_API_KEY,
      gcpProjectId: process.env.GCP_PROJECT_ID || "gen-lang-client-0198594002",
      useMock: !process.env.GOOGLE_AI_API_KEY, // Use mock if no API key
      ...config,
    };
  }

  /**
   * Initialize connection to Gemini
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.useMock || !this.config.geminiApiKey) {
      console.log("[RAG] No Gemini API key found - using mock implementation");
      this.initialized = true;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
      console.log("[RAG] Connected to Gemini API");
      console.log(`[RAG] GCP Project: ${this.config.gcpProjectId}`);
      this.initialized = true;
    } catch (error) {
      console.error("[RAG] Failed to initialize Gemini:", error);
      this.config.useMock = true;
      this.initialized = true;
    }
  }

  /**
   * Query guidelines for relevant content using Gemini File Search
   */
  async query(params: RAGQuery): Promise<RAGResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.config.useMock || !this.genAI) {
      return this.mockQuery(params);
    }

    const { query, source, cancerType, maxResults = 3 } = params;
    const storeId = FILE_SEARCH_STORES[source];

    if (!storeId) {
      console.warn(`[RAG] No File Search store for source: ${source}`);
      return this.mockQuery(params);
    }

    try {
      // Use Gemini with grounding via File Search
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: [
          {
            // @ts-expect-error - Gemini SDK types may not include fileSearch yet
            fileSearch: {
              storeIds: [storeId],
            },
          },
        ],
      });

      const contextPrompt = cancerType
        ? `For ${cancerType} cancer: ${query}`
        : query;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Search the ${GUIDELINE_SOURCES[source].name} guidelines and return the most relevant information for:

${contextPrompt}

Please provide:
1. The specific guideline recommendations
2. Evidence levels/categories if available
3. Exact section references for citation

Be concise but comprehensive.`,
              },
            ],
          },
        ],
      });

      const response = result.response;
      const text = response.text();

      // Extract grounding metadata if available
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const citations: Citation[] = [];

      // Note: Google SDK has a typo in 'groundingChuncks' (should be 'groundingChunks')
      const groundingChunks = (groundingMetadata as any)?.groundingChunks || (groundingMetadata as any)?.groundingChuncks;
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.retrievedContext) {
            citations.push({
              id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              source,
              title: chunk.retrievedContext.title || GUIDELINE_SOURCES[source].name,
              section: chunk.retrievedContext.uri?.split("/").pop(),
              retrievedAt: new Date(),
            });
          }
        }
      }

      // If no grounding metadata, create a generic citation
      if (citations.length === 0) {
        citations.push(this.createCitation(source, cancerType, "Retrieved content"));
      }

      return [
        {
          content: text,
          source,
          citation: citations[0],
          relevanceScore: 0.9,
        },
      ];
    } catch (error) {
      console.error(`[RAG] File Search query failed for ${source}:`, error);
      // Fallback to mock on error
      return this.mockQuery(params);
    }
  }

  /**
   * Query multiple sources in parallel
   */
  async queryMultipleSources(
    query: string,
    sources: GuidelineSource[],
    cancerType?: string
  ): Promise<Map<GuidelineSource, RAGResult[]>> {
    const results = new Map<GuidelineSource, RAGResult[]>();

    const queries = sources.map(async (source) => {
      const sourceResults = await this.query({
        query,
        source,
        cancerType,
        maxResults: 3,
      });
      results.set(source, sourceResults);
    });

    await Promise.all(queries);
    return results;
  }

  /**
   * Get guideline context for caching
   */
  async getGuidelineContext(
    source: GuidelineSource,
    cancerType: string
  ): Promise<string> {
    const results = await this.query({
      query: `Overview and treatment algorithms for ${cancerType}`,
      source,
      cancerType,
      maxResults: 5,
    });

    return results.map((r) => r.content).join("\n\n---\n\n");
  }

  /**
   * Create a citation object
   */
  private createCitation(
    source: GuidelineSource,
    cancerType: string | undefined,
    section: string
  ): Citation {
    return {
      id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      source,
      title: `${GUIDELINE_SOURCES[source].name}${cancerType ? ` - ${cancerType.toUpperCase()}` : ""}`,
      section,
      retrievedAt: new Date(),
    };
  }

  /**
   * Mock implementation for testing (when Gemini API not available)
   */
  private async mockQuery(params: RAGQuery): Promise<RAGResult[]> {
    const { query, source, cancerType, maxResults = 3 } = params;
    const mockResults: RAGResult[] = [];

    // Simulate relevant content based on common oncology queries
    if (query.toLowerCase().includes("stage iii") || query.toLowerCase().includes("locally advanced")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "locally_advanced"),
        source,
        citation: this.createCitation(source, cancerType, "Locally Advanced Disease"),
        relevanceScore: 0.95,
      });
    }

    if (query.toLowerCase().includes("chemo") || query.toLowerCase().includes("systemic")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "systemic_therapy"),
        source,
        citation: this.createCitation(source, cancerType, "Systemic Therapy"),
        relevanceScore: 0.92,
      });
    }

    if (query.toLowerCase().includes("surgery") || query.toLowerCase().includes("resect")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "surgical"),
        source,
        citation: this.createCitation(source, cancerType, "Surgical Management"),
        relevanceScore: 0.90,
      });
    }

    if (query.toLowerCase().includes("radiation") || query.toLowerCase().includes("rt")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "radiation"),
        source,
        citation: this.createCitation(source, cancerType, "Radiation Therapy"),
        relevanceScore: 0.88,
      });
    }

    if (query.toLowerCase().includes("kras") || query.toLowerCase().includes("targeted")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "targeted"),
        source,
        citation: this.createCitation(source, cancerType, "Targeted Therapy"),
        relevanceScore: 0.93,
      });
    }

    if (query.toLowerCase().includes("immunotherapy") || query.toLowerCase().includes("pd-l1")) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "lung", "immunotherapy"),
        source,
        citation: this.createCitation(source, cancerType, "Immunotherapy"),
        relevanceScore: 0.91,
      });
    }

    // Always return at least one generic result
    if (mockResults.length === 0) {
      mockResults.push({
        content: this.getMockContent(source, cancerType || "general", "overview"),
        source,
        citation: this.createCitation(source, cancerType, "Overview"),
        relevanceScore: 0.75,
      });
    }

    return mockResults.slice(0, maxResults);
  }

  private getMockContent(source: GuidelineSource, cancerType: string, topic: string): string {
    const mockContents: Record<string, Record<string, string>> = {
      nccn: {
        locally_advanced: `NCCN Guidelines for Locally Advanced NSCLC (Stage IIIA-IIIB):
- Concurrent chemoradiation with durvalumab consolidation is preferred (Category 1)
- Definitive dose: 60 Gy in 30 fractions with concurrent platinum-based chemotherapy
- For select T3N1, T4N0-1: Consider surgical resection with adjuvant therapy
- Mediastinal staging required (EBUS/mediastinoscopy) before treatment decision
[NCCN NSCLC v2.2025, STAGE-3]`,
        systemic_therapy: `NCCN Systemic Therapy Options for Advanced NSCLC:
First-line by biomarker:
- EGFR mutation: Osimertinib (preferred, Category 1)
- ALK rearrangement: Alectinib (preferred, Category 1)
- ROS1 rearrangement: Crizotinib or entrectinib
- KRAS G12C: Sotorasib or adagrasib
- PD-L1 ≥50%: Pembrolizumab monotherapy (Category 1)
- PD-L1 <50% or unknown: Pembrolizumab + pemetrexed + platinum
[NCCN NSCLC v2.2025, SYST-A]`,
        targeted: `NCCN Guidelines for KRAS G12C Mutated NSCLC:
- Sotorasib: FDA approved for KRAS G12C mutated NSCLC after prior systemic therapy
- Adagrasib: FDA approved as second option
- Consider in second-line setting after progression on first-line therapy
- Note: Not currently approved or widely available for first-line use
- Clinical trials available for KRAS G12C in various settings
[NCCN NSCLC v2.2025, KRAS-1]`,
        immunotherapy: `NCCN Immunotherapy for NSCLC:
- PD-L1 ≥50%: Pembrolizumab monotherapy acceptable (Category 1)
- PD-L1 1-49%: Pembrolizumab + chemotherapy
- Durvalumab consolidation after concurrent chemoRT for unresectable Stage III (Category 1)
- Check for contraindications: autoimmune disease, organ transplant, etc.
[NCCN NSCLC v2.2025, IMMUNO-1]`,
        surgical: `NCCN Surgical Guidelines for NSCLC:
- Lobectomy with systematic lymph node dissection is standard
- Segmentectomy for peripheral tumors ≤2cm with adequate margins
- Minimum 6 N2 and 3 N1 nodes sampled
- Negative margins (R0) is goal
- VATS/robotic approaches preferred when feasible
[NCCN NSCLC v2.2025, SURG-1]`,
        radiation: `NCCN Radiation Therapy for NSCLC:
- Definitive: 60-70 Gy in 2 Gy fractions with concurrent chemotherapy
- SBRT for early-stage: 48-54 Gy in 3-4 fractions (peripheral), 50-60 Gy in 5 fractions (central)
- Post-operative RT: Consider for N2, positive margins
- Concurrent chemotherapy: Cisplatin/etoposide or carboplatin/paclitaxel
[NCCN NSCLC v2.2025, RT-1]`,
        overview: `NCCN Clinical Practice Guidelines provide evidence-based, consensus-driven recommendations for cancer treatment. Updated regularly with latest evidence. Categories: 1 (high-level evidence, uniform consensus), 2A (lower-level evidence, uniform consensus), 2B (lower-level evidence, non-uniform consensus), 3 (any level evidence, major disagreement).`,
      },
      astro: {
        locally_advanced: `ASTRO Guidelines for Locally Advanced Lung Cancer:
- Definitive concurrent chemoradiation: 60 Gy in 30 fractions (2 Gy/fraction)
- Higher doses (66-74 Gy) NOT proven superior in RTOG 0617
- Treatment time: Complete within 6-7 weeks
- Image guidance: Daily CBCT recommended
- Motion management: 4D-CT simulation, ITV-based planning
[ASTRO Lung Cancer Guideline 2024]`,
        radiation: `ASTRO Evidence-Based Radiation Guidelines:
- IMRT/VMAT preferred over 3D-CRT for complex volumes
- Reduces lung V20 and esophageal toxicity
- OAR constraints: Lung V20 <35%, Mean lung dose <20 Gy
- Esophagus: Mean dose <34 Gy, V60 <17%
- Heart: Mean dose <26 Gy, V30 <46%
[ASTRO Technical Standards]`,
        overview: `ASTRO evidence-based guidelines provide radiation oncology recommendations based on systematic literature review and expert consensus.`,
      },
      esmo: {
        systemic_therapy: `ESMO Guidelines for Advanced NSCLC:
- Biomarker testing mandatory before first-line therapy
- Resource-stratified recommendations available for LMICs
- ESMO-MCBS score guides prioritization
- Consider access and cost in treatment decisions
[ESMO NSCLC Guidelines 2023]`,
        overview: `ESMO Clinical Practice Guidelines provide pan-European recommendations with resource stratification for global applicability.`,
      },
      acr: {
        locally_advanced: `ACR Appropriateness Criteria for Lung Cancer Staging:
- PET-CT: Usually appropriate for staging (Rating 9)
- Brain MRI: Usually appropriate for Stage III-IV (Rating 8)
- CT chest/abdomen/pelvis with contrast: Usually appropriate
- Bone scan: May be appropriate if PET not available
[ACR Appropriateness Criteria: Staging of Lung Cancer]`,
        overview: `ACR Appropriateness Criteria provide evidence-based imaging recommendations rated 1-9 (9 = most appropriate).`,
      },
      cap: {
        overview: `CAP Cancer Protocols provide standardized pathology reporting templates ensuring all required elements are documented for treatment decisions.`,
      },
      clinvar: {
        targeted: `ClinVar/CIViC for KRAS G12C:
- Classification: Pathogenic
- Clinical significance: Predictive of response to KRAS G12C inhibitors
- Associated drugs: Sotorasib (FDA approved), Adagrasib (FDA approved)
- Evidence level: Level A (FDA approved therapy)
[CIViC Evidence ID: 6955, ClinVar: VCV000012582]`,
        overview: `ClinVar provides variant classification. CIViC provides clinical interpretation and therapeutic implications of cancer variants.`,
      },
      civic: {
        targeted: `CIViC Evidence for KRAS G12C:
- Gene: KRAS
- Variant: G12C (c.34G>T)
- Disease: Non-small cell lung carcinoma
- Evidence Type: Predictive
- Evidence Level: A (Validated)
- Drugs: Sotorasib, Adagrasib
- Evidence Direction: Supports Sensitivity
[CIViC EID:6955]`,
        overview: `CIViC (Clinical Interpretation of Variants in Cancer) provides crowd-sourced, expert-curated clinical interpretations of cancer variants.`,
      },
      sso: {
        surgical: `SSO Surgical Oncology Principles:
- Adequate margins are critical for oncologic outcomes
- Lymph node assessment per disease-specific protocols
- Consider neoadjuvant therapy for borderline resectable tumors
- Minimally invasive approaches when oncologically appropriate
- Multidisciplinary tumor board discussion for complex cases
[SSO Clinical Recommendations]`,
        breast: `SSO Breast Surgery Recommendations:
- Breast-conserving surgery (BCS) with negative margins preferred for early-stage
- Negative margin = no ink on tumor (SSO-ASTRO consensus 2014)
- DCIS margins: 2mm preferred (SSO-ASTRO-ASCO consensus 2016)
- Contralateral prophylactic mastectomy: Consider for BRCA1/2, strong family history
- Sentinel lymph node biopsy standard for clinically node-negative
- Axillary management: SLNB alone if 1-2 positive nodes + BCS + whole breast RT + systemic therapy
[SSO-ASTRO Margin Consensus Guidelines]`,
        melanoma: `SSO Melanoma Surgery Recommendations:
- Wide local excision margins based on Breslow thickness:
  * In situ: 0.5-1cm margin
  * <1mm: 1cm margin
  * 1-2mm: 1-2cm margin
  * >2mm: 2cm margin
- Sentinel lymph node biopsy: Recommended for tumors >=0.8mm or with ulceration
- Gene expression profiling (GEP): NOT recommended for routine clinical decision-making (SSO 2024)
- GEP should not be used to select patients for SLNB
- Completion lymph node dissection: Consider based on tumor burden in SLN
[SSO Melanoma Disease-Site Work Group Consensus 2024]`,
        colorectal: `SSO Colorectal Surgery Recommendations:
- Complete mesocolic excision (CME) for colon cancer
- Total mesorectal excision (TME) for rectal cancer - sharp dissection in holy plane
- Circumferential resection margin (CRM) >1mm required for rectal cancer
- Minimum 12 lymph nodes for adequate staging
- Watch-and-wait/organ preservation: Consider for clinical complete response after chemoRT
- Transanal approaches (taTME, TAMIS) for select low rectal tumors
[SSO-ASTRO Rectal Cancer Radiation Guidelines]`,
        lung: `SSO Thoracic Surgical Oncology:
- Lobectomy with systematic lymph node dissection is standard for resectable NSCLC
- Segmentectomy acceptable for peripheral tumors <=2cm with adequate margins
- VATS/robotic approaches preferred when feasible - equivalent oncologic outcomes
- Minimum N2 sampling: stations 2R, 4R, 7, 8, 9 (right); 4L, 5, 6, 7, 8, 9 (left)
- Sleeve resection preferred over pneumonectomy when feasible
- Post-operative RT for N2 disease: per ASTRO-SSO guidelines
[SSO Thoracic Oncology Principles]`,
        gastric: `SSO Gastric Surgery Recommendations:
- D2 lymphadenectomy recommended for resectable gastric cancer (>=15 nodes)
- D1 acceptable in Western centers with lower volume
- Margins: >=4cm for intestinal type, >=8cm for diffuse type
- Proximal margin more critical than distal
- Peritoneal cytology should be performed
- Staging laparoscopy recommended for cT3-4 or node-positive
[SSO D2 Lymphadenectomy Consensus 2024]`,
        pmrt: `SSO-ASTRO-ASCO Post-Mastectomy Radiation Therapy (PMRT) Guidelines 2025:
- PMRT recommended for: >=4 positive nodes, T3-4 tumors, positive margins
- PMRT generally recommended for 1-3 positive nodes (shared decision-making)
- Regional nodal irradiation should include supraclavicular and internal mammary nodes
- Timing: Can begin 4-8 weeks after mastectomy if no reconstruction complications
- With immediate reconstruction: Discuss with reconstructive surgeon
- Hypofractionation acceptable: 42.5 Gy/16 fractions or 40 Gy/15 fractions
[SSO-ASTRO-ASCO PMRT Clinical Practice Guideline 2025]`,
        choosing_wisely: `SSO Choosing Wisely - 5 Things Physicians and Patients Should Question:
1. Do not perform routine sentinel lymph node biopsy in clinically node-negative breast cancer patients >= 70 years with ER+/HER2- tumors
2. Do not routinely use MRI for breast cancer staging in patients planned for breast-conserving surgery
3. Do not routinely perform contralateral prophylactic mastectomy in average-risk women with unilateral breast cancer
4. Do not perform completion axillary lymph node dissection for micrometastatic disease in sentinel lymph node
5. Do not use gene expression profiling tests in melanoma to select patients for SLNB
[SSO Choosing Wisely 2021]`,
        overview: `Society of Surgical Oncology (SSO) provides evidence-based clinical recommendations for surgical management of solid tumors. SSO collaborates with ASCO, ASTRO, and other societies on multidisciplinary guidelines. Key principles: adequate margins, appropriate lymphadenectomy, minimally invasive when oncologically safe, multidisciplinary planning. SSO Clinical Recommendations available at surgonc.org.`,
      },
    };

    return (
      mockContents[source]?.[topic] ||
      mockContents[source]?.overview ||
      `${GUIDELINE_SOURCES[source].name}: Relevant guidance for ${cancerType} - ${topic}`
    );
  }
}

/**
 * Singleton RAG connector instance
 */
let ragConnectorInstance: RAGConnector | null = null;

export function getRAGConnector(config?: RAGConfig): RAGConnector {
  if (!ragConnectorInstance) {
    ragConnectorInstance = new RAGConnector(config);
  }
  return ragConnectorInstance;
}

export function configureRAG(config: RAGConfig): void {
  ragConnectorInstance = new RAGConnector(config);
}

/**
 * Get the File Search store ID for a guideline source
 */
export function getFileSearchStoreId(source: GuidelineSource): string {
  return FILE_SEARCH_STORES[source];
}
