/**
 * Case Formatter
 * 
 * Formats case data for agent consumption.
 */

import type { CaseData } from "../types";

/**
 * Format case data into a readable context for agents
 */
export function formatCaseContext(caseData: CaseData): string {
  const { patient, diagnosis, clinicalQuestion } = caseData;

  const biomarkersStr = diagnosis.biomarkers
    .map((b) => `- ${b.name}: ${b.result}${b.interpretation ? ` (${b.interpretation})` : ""}${b.method ? ` [${b.method}]` : ""}`)
    .join("\n");

  const mutationsStr = diagnosis.genomics?.mutations
    .map((m) => `- ${m.gene} ${m.variant}: ${m.classification}${m.actionable ? " [ACTIONABLE]" : ""} (VAF: ${m.vaf || "N/A"}%)`)
    .join("\n") || "Not performed or not available";

  const comorbiditiesStr = patient.comorbidities?.length 
    ? patient.comorbidities.join(", ") 
    : "None documented";

  return `
## PATIENT INFORMATION
- **Name**: ${patient.name}
- **Age/Gender**: ${patient.age} years, ${patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : "Other"}
- **MRN**: ${patient.mrn || "Not provided"}
- **ECOG Performance Status**: ${patient.ecogPs}
- **Comorbidities**: ${comorbiditiesStr}
- **Smoking History**: ${patient.smokingHistory || "Not documented"}
- **Insurance**: ${patient.insuranceType || "Not documented"}
- **Location**: ${patient.state || "Not documented"}

## DIAGNOSIS
- **Cancer Type**: ${diagnosis.cancerType}
- **Histology**: ${diagnosis.histology}${diagnosis.histologyCode ? ` (${diagnosis.histologyCode})` : ""}
- **Primary Site**: ${diagnosis.primarySite}${diagnosis.primarySiteCode ? ` (${diagnosis.primarySiteCode})` : ""}
- **Diagnosis Date**: ${diagnosis.diagnosisDate instanceof Date ? diagnosis.diagnosisDate.toISOString().split("T")[0] : diagnosis.diagnosisDate}

## STAGING (${diagnosis.stage.stagingSystem.toUpperCase()})
- **Clinical Stage**: c${diagnosis.stage.clinical.t}${diagnosis.stage.clinical.n}${diagnosis.stage.clinical.m}
${diagnosis.stage.pathological ? `- **Pathological Stage**: p${diagnosis.stage.pathological.t}${diagnosis.stage.pathological.n}${diagnosis.stage.pathological.m}` : "- **Pathological Stage**: Not available (pre-operative)"}
- **Composite Stage Group**: ${diagnosis.stage.composite}

## BIOMARKERS
${biomarkersStr || "No biomarker results available"}

## MOLECULAR/GENOMIC PROFILE
- **Test Type**: ${diagnosis.genomics?.testType || "Not performed"}
- **TMB**: ${diagnosis.genomics?.tmb !== undefined ? `${diagnosis.genomics.tmb} mut/Mb` : "N/A"}
- **MSI Status**: ${diagnosis.genomics?.msi || "N/A"}

### Key Mutations
${mutationsStr}

## CLINICAL QUESTION FOR TUMOR BOARD
${clinicalQuestion}

---
*Case Priority: ${caseData.priority.toUpperCase()}*
`.trim();
}

/**
 * Create a brief case summary for headers/titles
 */
export function formatCaseSummary(caseData: CaseData): string {
  const { patient, diagnosis } = caseData;
  return `${patient.name}, ${patient.age}${patient.gender === "male" ? "M" : "F"} | ${diagnosis.histology} ${diagnosis.primarySite} | ${diagnosis.stage.composite}`;
}
