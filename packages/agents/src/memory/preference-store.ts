import fs from "fs/promises";
import path from "path";

export interface PreferenceRecord {
  caseId: string;
  clinicianId: string;
  originalRecommendation: string;
  clinicianOverride: string;
  rationale: string;
  timestamp: string;
}

export class PreferenceMemoryStore {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), ".clinic-memory.json");
  }

  async loadPreferences(): Promise<PreferenceRecord[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data) as PreferenceRecord[];
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async savePreference(record: PreferenceRecord): Promise<void> {
    const preferences = await this.loadPreferences();
    preferences.push(record);
    await fs.writeFile(this.filePath, JSON.stringify(preferences, null, 2), "utf-8");
  }

  async getPreferencesForClinician(clinicianId: string): Promise<PreferenceRecord[]> {
    const preferences = await this.loadPreferences();
    return preferences.filter((p) => p.clinicianId === clinicianId);
  }

  async getFormattedPreferencesContext(clinicianId: string): Promise<string> {
    const prefs = await this.getPreferencesForClinician(clinicianId);
    if (prefs.length === 0) return "";

    const formattedPrefs = prefs
      .map((p, idx) => `Preference ${idx + 1}:\\nOverride: ${p.clinicianOverride}\\nRationale: ${p.rationale}`)
      .join("\\n\\n");

    return `## CLINICIAN PREFERENCES MEMORY
The following are historical preferences and overrides made by this clinician in past cases.
You must strongly consider these established practice patterns when formulating your recommendation, provided they do not directly contradict Level 1 evidence/guidelines.

${formattedPrefs}`;
  }
}