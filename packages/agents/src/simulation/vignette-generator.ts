
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CaseData } from "../types";

export interface VignetteConfig {
  cancerType: string;
  stage?: string;
  difficulty: "standard" | "complex" | "refractory";
  missingInformation?: boolean; // Simulate incomplete records?
}

const DEFAULT_CONFIG: VignetteConfig = {
  cancerType: "breast",
  difficulty: "standard",
  missingInformation: false,
};

/**
 * Generates synthetic clinical vignettes for tumor board simulation.
 * Uses Gemini Pro to create realistic, detailed patient cases.
 */
export class VignetteGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string = process.env.GEMINI_API_KEY || "") {
    if (!apiKey) {
      console.warn("VignetteGenerator: No GEMINI_API_KEY provided. Generation will fail.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  /**
   * Generate a single patient vignette
   */
  async generate(config: Partial<VignetteConfig> = {}): Promise<CaseData> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    const prompt = `
      You are an expert Medical Case Writer for oncology board examinations.
      Generate a detailed clinical vignette for a Virtual Tumor Board simulation.
      
      PARAMETERS:
      - Cancer Type: ${finalConfig.cancerType}
      - Difficulty: ${finalConfig.difficulty} ${finalConfig.difficulty === 'refractory' ? '(Patient has failed multiple lines of therapy)' : ''}
      - Missing Info: ${finalConfig.missingInformation ? 'Yes (Leave some standard fields ambiguous or "pending")' : 'No (Complete records)'}
      
      REQUIRED OUTPUT FORMAT (JSON):
      {
        "id": "synthetic-[random-string]",
        "patient": {
          "age": number,
          "gender": "male" | "female",
          "ecogPs": number (0-4),
          "comorbidities": string[]
        },
        "clinicalQuestion": "string (The specific question for the board, e.g. 'Adjuvant therapy recommendations?')",
        "tumor": {
          "site": "string",
          "histology": "string",
          "stage": "string (TNM)",
          "grade": "string",
          "biomarkers": { "marker": "status" }
        },
        "history": "string (Detailed HPI, past treatments, social history)",
        "imaging": "string (Summary of CT/MRI/PET findings)",
        "pathology": "string (Summary of biopsy/surgical pathology)"
      }

      Ensure the case is clinically realistic, internally consistent, and challenging.
      For 'refractory' cases, include a history of prior progressions.
      Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Clean up potential markdown blocks
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const caseData = JSON.parse(jsonStr) as CaseData;
      
      // Ensure ID is unique-ish
      if (!caseData.id || caseData.id === "synthetic-") {
        caseData.id = `synthetic-${Date.now()}`;
      }

      return caseData;
    } catch (error) {
      console.error("Failed to generate vignette:", error);
      throw new Error(`Vignette generation failed: ${error}`);
    }
  }

  /**
   * Generate a suite of test cases
   */
  async generateSuite(count: number, cancerType: string = "breast"): Promise<CaseData[]> {
    const cases: CaseData[] = [];
    const difficulties: VignetteConfig["difficulty"][] = ["standard", "complex", "refractory"];
    
    for (let i = 0; i < count; i++) {
      const difficulty = difficulties[i % 3]; // Rotate difficulties
      console.log(`Generating case ${i + 1}/${count}: ${cancerType} (${difficulty})...`);
      const vignette = await this.generate({ cancerType, difficulty });
      cases.push(vignette);
    }
    
    return cases;
  }
}
