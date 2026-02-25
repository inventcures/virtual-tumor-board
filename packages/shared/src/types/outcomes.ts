/**
 * Clinical Outcome Types for VTB Learning Loop
 */

export type ClinicalResponse = 
  | "Complete Response (CR)"
  | "Partial Response (PR)"
  | "Stable Disease (SD)"
  | "Progressive Disease (PD)"
  | "Deceased";

export type ToxicityGrade = 
  | "Grade 0-1 (Mild)"
  | "Grade 2 (Moderate)"
  | "Grade 3 (Severe)"
  | "Grade 4 (Life-threatening)"
  | "Grade 5 (Fatal)";

export interface ClinicalOutcome {
  caseId: string;
  patientId: string;
  clinicianId: string;
  status: ClinicalResponse;
  timeFromTreatmentMonths: number;
  highestToxicityGrade: ToxicityGrade;
  adverseEvents: string[];
  treatmentCompleted: "full" | "reduced" | "discontinued";
  vtbLearningNotes: string;
  timestamp: string;
}
