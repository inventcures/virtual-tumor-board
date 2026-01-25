/**
 * MedGemma API Client
 * Supports HuggingFace, Vertex AI, and Gemini fallback
 */

import { 
  MedGemmaResponse, 
  MedGemmaConfig, 
  MedGemmaImageInput,
  AnalysisContext,
  Finding,
  Measurement
} from "@/types/imaging";
import { IMAGING_ANALYSIS_PROMPTS } from "./prompts";

const DEFAULT_CONFIG: MedGemmaConfig = {
  provider: 'huggingface',
  model: 'medgemma-4b-it',
};

export class MedGemmaClient {
  private config: MedGemmaConfig;

  constructor(config: Partial<MedGemmaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async analyzeImage(
    image: MedGemmaImageInput,
    context: AnalysisContext
  ): Promise<MedGemmaResponse> {
    const prompt = this.buildPrompt(image.metadata, context);

    try {
      // Try MedGemma via HuggingFace first
      if (this.config.provider === 'huggingface' && this.config.apiKey) {
        return await this.callHuggingFace(image, prompt);
      }

      // Fallback to Gemini
      return await this.callGemini(image, prompt);
    } catch (error) {
      console.error('MedGemma analysis error:', error);
      // Return demo response on error
      return this.generateDemoResponse(image.metadata, context);
    }
  }

  private buildPrompt(metadata: MedGemmaImageInput['metadata'], context: AnalysisContext): string {
    // Select base prompt based on modality
    let basePrompt: string;
    
    switch (metadata.modality?.toUpperCase()) {
      case 'CR':
      case 'DX':
        basePrompt = IMAGING_ANALYSIS_PROMPTS.CXR;
        break;
      case 'MG':
        basePrompt = IMAGING_ANALYSIS_PROMPTS.MAMMO;
        break;
      case 'CT':
      case 'MR':
      case 'PT':
      default:
        basePrompt = IMAGING_ANALYSIS_PROMPTS.CT;
    }

    // Add context
    let fullPrompt = basePrompt;
    
    if (context.cancerType) {
      fullPrompt += `\n\nClinical Context: Patient has ${context.cancerType}.`;
    }
    
    if (context.clinicalQuestion) {
      fullPrompt += `\n\nClinical Question: ${context.clinicalQuestion}`;
    }

    if (context.analysisType === 'oncology') {
      fullPrompt += `\n\nFocus on oncology-relevant findings: tumor size, lymph nodes, metastases, treatment response.`;
    }

    return fullPrompt;
  }

  private async callHuggingFace(
    image: MedGemmaImageInput,
    prompt: string
  ): Promise<MedGemmaResponse> {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/medgemma-4b-it',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data[0]?.generated_text || '');
  }

  private async callGemini(
    image: MedGemmaImageInput,
    prompt: string
  ): Promise<MedGemmaResponse> {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.base64.replace(/^data:image\/\w+;base64,/, ''),
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.parseResponse(text);
  }

  private parseResponse(text: string): MedGemmaResponse {
    // Try to extract JSON if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through to text parsing
      }
    }

    // Parse unstructured text
    return this.parseUnstructuredResponse(text);
  }

  private parseUnstructuredResponse(text: string): MedGemmaResponse {
    const findings: Finding[] = [];
    const measurements: Measurement[] = [];
    const recommendations: string[] = [];

    // Extract findings
    const findingsMatch = text.match(/FINDINGS[:\s]*([\s\S]*?)(?=MEASUREMENTS|IMPRESSION|RECOMMENDATIONS|$)/i);
    if (findingsMatch) {
      const lines = findingsMatch[1].split(/[-•\n]/).filter(l => l.trim().length > 10);
      lines.forEach((line, idx) => {
        findings.push({
          id: `finding-${idx}`,
          description: line.trim(),
          location: this.extractLocation(line),
          severity: this.inferSeverity(line),
        });
      });
    }

    // Extract measurements (e.g., "2.3 x 1.8 cm", "23mm")
    const measurementRegex = /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(cm|mm)|(\d+(?:\.\d+)?)\s*(cm|mm)/gi;
    let match;
    let measurementIdx = 0;
    while ((match = measurementRegex.exec(text)) !== null) {
      const context = text.slice(Math.max(0, match.index - 100), match.index + match[0].length + 50);
      
      let longAxis: number;
      let shortAxis: number | undefined;
      
      if (match[1] && match[2]) {
        // Format: "X x Y cm/mm"
        const unit = match[3].toLowerCase();
        longAxis = parseFloat(match[1]) * (unit === 'cm' ? 10 : 1);
        shortAxis = parseFloat(match[2]) * (unit === 'cm' ? 10 : 1);
      } else {
        // Format: "X cm/mm"
        const unit = match[5].toLowerCase();
        longAxis = parseFloat(match[4]) * (unit === 'cm' ? 10 : 1);
      }

      measurements.push({
        lesionId: `lesion-${measurementIdx++}`,
        description: this.extractLesionDescription(context),
        dimensions: { long: longAxis, short: shortAxis },
        location: this.extractLocation(context),
        isTarget: longAxis >= 10, // RECIST: target lesions >= 10mm
        sliceNumber: -1,
      });
    }

    // Extract impression
    const impressionMatch = text.match(/IMPRESSION[:\s]*([\s\S]*?)(?=RECOMMENDATION|$)/i);
    const impression = impressionMatch ? impressionMatch[1].trim() : this.generateImpression(findings);

    // Extract recommendations
    const recsMatch = text.match(/RECOMMENDATION[S]?[:\s]*([\s\S]*?)$/i);
    if (recsMatch) {
      const lines = recsMatch[1].split(/[-•\d.]\s+/).filter(l => l.trim().length > 5);
      recommendations.push(...lines.map(r => r.trim()));
    }

    // Calculate confidence based on completeness
    const confidence = this.calculateConfidence(findings, measurements, impression);

    return {
      interpretation: text,
      findings,
      measurements,
      impression,
      recommendations,
      confidence,
    };
  }

  private extractLocation(text: string): string {
    const locationPatterns = [
      /(?:in|at|of)\s+(?:the\s+)?(\w+(?:\s+\w+)?(?:\s+lobe|\s+segment|\s+region)?)/i,
      /(right|left)\s+(\w+)/i,
      /(upper|lower|middle)\s+(\w+)/i,
      /(mediastin\w*|hilar|perihilar|subcarinal)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return 'Not specified';
  }

  private extractLesionDescription(text: string): string {
    const patterns = [
      /(mass|nodule|lesion|tumor|opacity|consolidation|effusion)/i,
      /(lymph\s*node|adenopathy)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      }
    }

    return 'Lesion';
  }

  private inferSeverity(text: string): Finding['severity'] {
    const lower = text.toLowerCase();
    
    if (/(malignant|suspicious|concern|worrisome|aggressive)/i.test(lower)) {
      return 'severe';
    }
    if (/(moderate|intermediate|indeterminate)/i.test(lower)) {
      return 'moderate';
    }
    if (/(mild|minimal|small|tiny|subtle)/i.test(lower)) {
      return 'mild';
    }
    if (/(normal|unremarkable|no\s+evidence|negative)/i.test(lower)) {
      return 'normal';
    }
    
    return 'unknown';
  }

  private generateImpression(findings: Finding[]): string {
    if (findings.length === 0) {
      return 'No significant abnormalities identified.';
    }

    const severeFindings = findings.filter(f => f.severity === 'severe');
    const moderateFindings = findings.filter(f => f.severity === 'moderate');

    if (severeFindings.length > 0) {
      return `${severeFindings.length} finding(s) requiring urgent attention. Clinical correlation and further workup recommended.`;
    }

    if (moderateFindings.length > 0) {
      return `${moderateFindings.length} finding(s) of moderate concern. Follow-up imaging may be warranted.`;
    }

    return `${findings.length} finding(s) noted. See detailed report above.`;
  }

  private calculateConfidence(findings: Finding[], measurements: Measurement[], impression: string): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence with more structured findings
    if (findings.length > 0) confidence += 0.15;
    if (measurements.length > 0) confidence += 0.15;
    if (impression.length > 50) confidence += 0.1;

    // Lower confidence if many unknowns
    const unknownFindings = findings.filter(f => f.severity === 'unknown').length;
    confidence -= unknownFindings * 0.05;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private generateDemoResponse(
    metadata: MedGemmaImageInput['metadata'],
    context: AnalysisContext
  ): MedGemmaResponse {
    // Generate a realistic demo response when API is unavailable
    return {
      interpretation: `Demo analysis for ${metadata.modality} study of ${metadata.bodyPart || 'unknown region'}.`,
      findings: [
        {
          id: 'demo-1',
          description: 'This is a demonstration finding. In production, MedGemma AI will analyze your actual scan.',
          location: metadata.bodyPart || 'Not specified',
          severity: 'unknown',
        }
      ],
      measurements: [],
      impression: 'Demo mode: Configure MedGemma API for real analysis. This is a placeholder response.',
      recommendations: [
        'Configure HuggingFace API key for MedGemma access',
        'Or configure Google AI API key for Gemini fallback',
      ],
      confidence: 0.3,
    };
  }
}

// Singleton instance
let clientInstance: MedGemmaClient | null = null;

export function getMedGemmaClient(config?: Partial<MedGemmaConfig>): MedGemmaClient {
  if (!clientInstance || config) {
    clientInstance = new MedGemmaClient(config);
  }
  return clientInstance;
}
