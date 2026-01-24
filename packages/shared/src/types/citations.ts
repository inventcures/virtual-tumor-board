/**
 * Citation Types for Virtual Tumor Board
 * Represents guideline and literature citations
 */

export interface Citation {
  id: string;
  source: CitationSource;
  title: string;
  section?: string;
  page?: string;
  url?: string;
  evidenceLevel?: string; // e.g., "Category 1", "Level I"
  quote?: string;
  retrievedAt: Date;
}

export type CitationSource =
  | "nccn"
  | "esmo"
  | "astro"
  | "acr"
  | "cap"
  | "clinvar"
  | "civic"
  | "pubmed"
  | "semantic_scholar";

export interface LiteratureCitation extends Citation {
  source: "pubmed" | "semantic_scholar";
  paperId: string;
  authors: string[];
  journal?: string;
  year: number;
  citationCount?: number;
  abstract?: string;
}

export interface GuidelineCitation extends Citation {
  source: "nccn" | "esmo" | "astro" | "acr" | "cap";
  guidelineVersion?: string;
  recommendationCategory?: string; // e.g., "Category 1", "Category 2A"
  pageRange?: string;
}

export interface VariantCitation extends Citation {
  source: "clinvar" | "civic";
  variantId: string;
  gene: string;
  variant: string;
  clinicalSignificance?: string;
  therapeuticImplications?: string[];
}

/**
 * Create a new citation object
 */
export function createCitation(
  source: CitationSource,
  title: string,
  options?: Partial<Citation>
): Citation {
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    title,
    retrievedAt: new Date(),
    ...options,
  };
}

/**
 * Format citation for display
 */
export function formatCitation(citation: Citation): string {
  let formatted = `[${citation.source.toUpperCase()}] ${citation.title}`;
  if (citation.section) {
    formatted += `, Section: ${citation.section}`;
  }
  if (citation.evidenceLevel) {
    formatted += ` (${citation.evidenceLevel})`;
  }
  return formatted;
}
