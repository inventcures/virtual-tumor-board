/**
 * MedGemma API Client
 * 
 * Priority order:
 * 1. Vertex AI Model Garden (Primary) - google/medgemma-27b-it
 * 2. HuggingFace Space (Fallback) - MedGemma 27B on ZeroGPU
 * 3. Gemini (Final fallback) - For when MedGemma is unavailable
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

// HuggingFace Space running MedGemma 27B on ZeroGPU (fallback)
const MEDGEMMA_27B_SPACE = "warshanks/medgemma-27b-it";
const MEDGEMMA_SPACE_URL = `https://${MEDGEMMA_27B_SPACE.replace('/', '-')}.hf.space`;

// Vertex AI Model Garden endpoint
const VERTEX_AI_LOCATION = "us-central1";
const VERTEX_AI_MODEL = "medgemma-27b-it";

const DEFAULT_CONFIG: MedGemmaConfig = {
  provider: 'vertex-ai', // Use Vertex AI as primary
  model: 'medgemma-27b-it',
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

    // Priority 1: Vertex AI (Primary)
    if (this.config.provider === 'vertex-ai' || process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        console.log('[MedGemma] Attempting Vertex AI (Primary)...');
        const response = await this.callVertexAI(image, prompt);
        response.modelInfo = {
          model: 'medgemma-27b-it',
          provider: 'Google Vertex AI',
          version: 'Model Garden'
        };
        return response;
      } catch (error) {
        console.warn('[MedGemma] Vertex AI failed, trying HF Space fallback:', error);
      }
    }

    // Priority 2: HuggingFace Space (Fallback - MedGemma 27B)
    try {
      console.log('[MedGemma] Attempting HuggingFace Space (Fallback)...');
      const response = await this.callHFSpace(image, prompt);
      response.modelInfo = {
        model: 'medgemma-27b-it',
        provider: 'HuggingFace Space',
        version: 'ZeroGPU (warshanks/medgemma-27b-it)'
      };
      return response;
    } catch (error) {
      console.warn('[MedGemma] HF Space failed, trying Gemini fallback:', error);
    }

    // Priority 3: Gemini (Final fallback)
    try {
      console.log('[MedGemma] Attempting Gemini (Final fallback)...');
      const response = await this.callGemini(image, prompt);
      response.modelInfo = {
        model: 'gemini-2.0-flash-exp',
        provider: 'Google AI Studio',
        version: 'Gemini 2.0 Flash (Vision fallback)'
      };
      return response;
    } catch (error) {
      console.error('[MedGemma] All providers failed:', error);
      return this.generateDemoResponse(image.metadata, context);
    }
  }

  /**
   * Call Vertex AI Model Garden - MedGemma 27B
   * Requires: GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS
   */
  private async callVertexAI(
    image: MedGemmaImageInput,
    prompt: string
  ): Promise<MedGemmaResponse> {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || VERTEX_AI_LOCATION;
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT not configured');
    }

    // Get access token (requires gcloud auth or service account)
    const accessToken = await this.getGoogleAccessToken();
    
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${VERTEX_AI_MODEL}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64.replace(/^data:image\/\w+;base64,/, ''),
              }
            },
            { text: prompt }
          ]
        }],
        systemInstruction: {
          parts: [{ text: 'You are an expert radiologist providing detailed medical image analysis.' }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.parseResponse(text);
  }

  /**
   * Get Google Cloud access token
   * Uses Application Default Credentials or service account
   */
  private async getGoogleAccessToken(): Promise<string> {
    // Option 1: Use provided access token from environment
    if (process.env.GOOGLE_ACCESS_TOKEN) {
      return process.env.GOOGLE_ACCESS_TOKEN;
    }

    // Option 2: Use service account JSON key
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      return await this.getAccessTokenFromServiceAccount(key);
    }

    // Option 3: Try metadata server (works on GCP)
    try {
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    } catch {
      // Not running on GCP
    }

    throw new Error('No Google Cloud credentials available. Set GOOGLE_ACCESS_TOKEN or GOOGLE_SERVICE_ACCOUNT_KEY');
  }

  /**
   * Get access token from service account key
   */
  private async getAccessTokenFromServiceAccount(key: {
    client_email: string;
    private_key: string;
    token_uri: string;
  }): Promise<string> {
    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: key.client_email,
      sub: key.client_email,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    // Note: In production, use a proper JWT library
    // This is a simplified implementation
    const jwt = await this.signJWT(header, payload, key.private_key);

    const response = await fetch(key.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!response.ok) {
      throw new Error('Failed to get access token from service account');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Sign JWT with RSA private key (simplified)
   */
  private async signJWT(
    header: object, 
    payload: object, 
    privateKey: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(payload));
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    // Import private key
    const pemContents = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  /**
   * Call HuggingFace Space running MedGemma 27B
   * Uses Gradio async API (call + poll for result)
   * 
   * The warshanks/medgemma-27b-it space uses ZeroGPU which means:
   * - Space sleeps when not in use (may take 20-60s to wake up)
   * - Uses async pattern: POST to /call/chat, then GET result with event_id
   */
  private async callHFSpace(
    image: MedGemmaImageInput,
    prompt: string
  ): Promise<MedGemmaResponse> {
    const spaceUrl = this.config.spaceId 
      ? `https://${this.config.spaceId.replace('/', '-')}.hf.space`
      : MEDGEMMA_SPACE_URL;

    const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || this.config.apiKey;
    
    console.log(`[MedGemma] Calling HF Space: ${spaceUrl}`);

    // Step 1: Initiate the async call
    // The /chat endpoint expects: [message_with_files, system_prompt, max_tokens]
    const initResponse = await fetch(`${spaceUrl}/gradio_api/call/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {}),
      },
      body: JSON.stringify({
        data: [
          // Message with image (MultimodalData format)
          {
            text: prompt,
            files: [{
              path: image.base64, // For base64, we use path field
              url: image.base64,  // Some Gradio versions want url
              orig_name: 'scan.png',
              mime_type: image.mimeType,
              meta: { _type: 'gradio.FileData' }
            }]
          },
          // System prompt
          'You are an expert radiologist providing detailed medical image analysis. Provide structured findings with locations, measurements, and clinical significance.',
          // Max tokens
          2048
        ],
      }),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      // Check if space is sleeping
      if (initResponse.status === 503 || errorText.includes('loading') || errorText.includes('sleeping')) {
        throw new Error(`HF Space is sleeping/loading. Please try again in 30-60 seconds. Status: ${initResponse.status}`);
      }
      throw new Error(`HF Space init error: ${initResponse.status} - ${errorText}`);
    }

    const initData = await initResponse.json();
    const eventId = initData.event_id;
    
    if (!eventId) {
      throw new Error('HF Space did not return event_id');
    }

    console.log(`[MedGemma] HF Space event_id: ${eventId}, polling for result...`);

    // Step 2: Poll for result (SSE endpoint)
    // The result comes as Server-Sent Events
    const resultResponse = await fetch(`${spaceUrl}/gradio_api/call/chat/${eventId}`, {
      method: 'GET',
      headers: {
        ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {}),
      },
    });

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      throw new Error(`HF Space result error: ${resultResponse.status} - ${errorText}`);
    }

    // Parse SSE response
    const resultText = await resultResponse.text();
    console.log(`[MedGemma] HF Space raw response length: ${resultText.length}`);
    
    // SSE format: "event: complete\ndata: [result]\n\n" or "event: error\ndata: null\n\n"
    const lines = resultText.split('\n');
    let eventType = '';
    let data = '';
    
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
      }
    }

    if (eventType === 'error' || !data || data === 'null') {
      // Space might be warming up or GPU quota exceeded
      throw new Error(`HF Space returned error or empty result. Event: ${eventType}. The space may be warming up (ZeroGPU) - try again in 30s.`);
    }

    // Parse the JSON result
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      throw new Error(`Failed to parse HF Space response: ${data.substring(0, 200)}`);
    }

    // Extract the generated text from the response
    // Format varies but typically: [{"role": "assistant", "content": "..."}] or just the text
    let generatedText = '';
    if (Array.isArray(parsedData)) {
      // Could be array of messages or array with single result
      const lastItem = parsedData[parsedData.length - 1];
      if (typeof lastItem === 'string') {
        generatedText = lastItem;
      } else if (lastItem?.content) {
        generatedText = lastItem.content;
      } else if (lastItem?.[1]) {
        // Chat format: [[user, assistant], ...]
        generatedText = lastItem[1];
      }
    } else if (typeof parsedData === 'string') {
      generatedText = parsedData;
    } else if (parsedData?.content) {
      generatedText = parsedData.content;
    }

    if (!generatedText) {
      console.warn('[MedGemma] Could not extract text from HF response:', JSON.stringify(parsedData).substring(0, 500));
      throw new Error('Could not extract generated text from HF Space response');
    }

    console.log(`[MedGemma] HF Space generated ${generatedText.length} chars`);
    return this.parseResponse(generatedText);
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
      modelInfo: {
        model: 'demo-mode',
        provider: 'Local Demo',
        version: 'No API configured'
      }
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
