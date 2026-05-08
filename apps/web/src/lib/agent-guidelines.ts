/**
 * Subspecialty → guideline-body mapping for the MDT UI.
 *
 * Each oncology subspecialty has a primary standard-of-care body that
 * clinicians reach for first. We surface that body as a badge on every
 * agent panel so a clinician can tell, at a glance, which guideline
 * universe an agent's recommendation is grounded in.
 */

export type GuidelineBody =
  | "NCCN"
  | "ESMO"
  | "ASCO"
  | "ASTRO"
  | "ACR"
  | "CAP"
  | "SSO"
  | "NSGC"
  | "WHO"
  | "ICMR"
  | "NCG";

export interface GuidelineBodyMeta {
  code: GuidelineBody;
  fullName: string;
  /** Tailwind classes for the badge (bg + text + border). */
  badgeClass: string;
  /** Brand-anchored accent colour for panel rule. */
  accentClass: string;
}

export const GUIDELINE_BODIES: Record<GuidelineBody, GuidelineBodyMeta> = {
  NCCN: {
    code: "NCCN",
    fullName: "National Comprehensive Cancer Network",
    badgeClass: "bg-blue-900/40 text-blue-200 border-blue-700/60",
    accentClass: "bg-blue-500",
  },
  ESMO: {
    code: "ESMO",
    fullName: "European Society for Medical Oncology",
    badgeClass: "bg-teal-900/40 text-teal-200 border-teal-700/60",
    accentClass: "bg-teal-500",
  },
  ASCO: {
    code: "ASCO",
    fullName: "American Society of Clinical Oncology",
    badgeClass: "bg-sky-900/40 text-sky-200 border-sky-700/60",
    accentClass: "bg-sky-500",
  },
  ASTRO: {
    code: "ASTRO",
    fullName: "American Society for Radiation Oncology",
    badgeClass: "bg-amber-900/40 text-amber-200 border-amber-700/60",
    accentClass: "bg-amber-500",
  },
  ACR: {
    code: "ACR",
    fullName: "American College of Radiology",
    badgeClass: "bg-red-900/40 text-red-200 border-red-700/60",
    accentClass: "bg-red-500",
  },
  CAP: {
    code: "CAP",
    fullName: "College of American Pathologists",
    badgeClass: "bg-pink-900/40 text-pink-200 border-pink-700/60",
    accentClass: "bg-pink-500",
  },
  SSO: {
    code: "SSO",
    fullName: "Society of Surgical Oncology",
    badgeClass: "bg-rose-900/40 text-rose-200 border-rose-700/60",
    accentClass: "bg-rose-500",
  },
  NSGC: {
    code: "NSGC",
    fullName: "National Society of Genetic Counselors",
    badgeClass: "bg-emerald-900/40 text-emerald-200 border-emerald-700/60",
    accentClass: "bg-emerald-500",
  },
  WHO: {
    code: "WHO",
    fullName: "World Health Organization",
    badgeClass: "bg-purple-900/40 text-purple-200 border-purple-700/60",
    accentClass: "bg-purple-500",
  },
  ICMR: {
    code: "ICMR",
    fullName: "Indian Council of Medical Research",
    badgeClass: "bg-orange-900/40 text-orange-200 border-orange-700/60",
    accentClass: "bg-orange-500",
  },
  NCG: {
    code: "NCG",
    fullName: "National Cancer Grid (India)",
    badgeClass: "bg-orange-900/40 text-orange-200 border-orange-700/60",
    accentClass: "bg-orange-500",
  },
};

export interface AgentGuidelineMapping {
  primary: GuidelineBody;
  secondary: GuidelineBody[];
}

/**
 * Per-agent primary + secondary guideline bodies.
 *
 * Sources used by clinicians for each subspecialty (paraphrased):
 *   - Surgical onc       → SSO + NCCN site-specific surgical sections
 *   - Medical onc        → NCCN + ESMO + ASCO
 *   - Radiation onc      → ASTRO + NCCN
 *   - Onco-radiology     → ACR Appropriateness Criteria + LI-RADS / PI-RADS
 *   - Pathology          → CAP cancer protocols + WHO classification
 *   - Genetics           → NCCN-Genetic / NSGC + ASCO germline
 *   - Palliative care    → ASCO palliative + WHO essential medicines
 *   - Critic / steward   → cross-cuts NCCN, ESMO, NCG India
 *   - Moderator (PI)     → NCCN + ESMO + NCG India for Indian-context overlay
 */
export const AGENT_GUIDELINES: Record<string, AgentGuidelineMapping> = {
  "surgical-oncologist": { primary: "SSO", secondary: ["NCCN"] },
  "medical-oncologist": { primary: "NCCN", secondary: ["ESMO", "ASCO"] },
  "radiation-oncologist": { primary: "ASTRO", secondary: ["NCCN"] },
  "radiologist": { primary: "ACR", secondary: ["NCCN"] },
  "pathologist": { primary: "CAP", secondary: ["WHO"] },
  "geneticist": { primary: "NCCN", secondary: ["NSGC", "ASCO"] },
  "palliative-care": { primary: "ASCO", secondary: ["WHO"] },
  "scientific-critic": { primary: "NCCN", secondary: ["ESMO", "ASTRO", "CAP"] },
  "stewardship": { primary: "NCG", secondary: ["NCCN", "WHO"] },
  "principal-investigator": { primary: "NCCN", secondary: ["ESMO", "NCG"] },
};

/** A single curated guideline citation, surfaced under each agent panel. */
export interface CuratedCitation {
  body: GuidelineBody;
  /** Short title — what the document is. */
  title: string;
  /** Section identifier within the document, e.g. "ESOPH-3", "Principles of Systemic Therapy". */
  section?: string;
  /** Page reference, version year, or other locator. */
  locator?: string;
  /** The actual chunk / paragraph the agent's recommendation rests on. */
  quote: string;
  /** Strength of evidence (Category 1, 2A, 2B, 3 for NCCN; or "consensus", "level I", etc.). */
  evidenceLevel?: string;
  /** Optional public URL. */
  url?: string;
}

/** Lookup by agent → primary guideline body, with fallback. */
export function primaryBodyForAgent(agentId: string): GuidelineBody {
  return AGENT_GUIDELINES[agentId]?.primary ?? "NCCN";
}
