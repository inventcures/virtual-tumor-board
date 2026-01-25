/**
 * AI Service with Fallback Support
 * 
 * Primary: Claude (Anthropic)
 * Fallback: Gemini (Google)
 * 
 * Automatically falls back to Gemini when:
 * - Claude API credits exhausted (402 Payment Required)
 * - Claude rate limited (429 Too Many Requests)
 * - Claude API errors (5xx)
 */

export type AIProvider = 'claude' | 'gemini' | 'none';

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
}

export interface AIError {
  provider: AIProvider;
  status: number;
  message: string;
  shouldFallback: boolean;
}

// Check if error should trigger fallback
function shouldFallbackToGemini(status: number): boolean {
  return (
    status === 400 ||  // Bad request (often credits exhausted on Anthropic)
    status === 402 ||  // Payment required (credits exhausted)
    status === 429 ||  // Rate limited
    status >= 500      // Server errors
  );
}

/**
 * Call Claude API
 */
async function callClaude(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw { 
      provider: 'claude', 
      status: 401, 
      message: 'ANTHROPIC_API_KEY not configured',
      shouldFallback: true 
    } as AIError;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      provider: 'claude',
      status: response.status,
      message: `Claude API error: ${response.status} - ${errorBody}`,
      shouldFallback: shouldFallbackToGemini(response.status),
    } as AIError;
  }

  const data = await response.json();
  
  return {
    content: data.content[0]?.text || '',
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  };
}

/**
 * Call Gemini API
 */
async function callGemini(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw {
      provider: 'gemini',
      status: 401,
      message: 'GEMINI_API_KEY or GOOGLE_API_KEY not configured',
      shouldFallback: false,
    } as AIError;
  }

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // Gemini uses system instruction separately
  // Using gemini-2.0-flash - good balance of capability and availability
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      provider: 'gemini',
      status: response.status,
      message: `Gemini API error: ${response.status} - ${errorBody}`,
      shouldFallback: false,
    } as AIError;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    content: text,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

/**
 * Main AI call function with automatic fallback
 */
export async function callAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  options?: {
    maxTokens?: number;
    preferredProvider?: AIProvider;
    disableFallback?: boolean;
  }
): Promise<AIResponse> {
  const maxTokens = options?.maxTokens || 4096;
  const preferredProvider = options?.preferredProvider || 'claude';
  const disableFallback = options?.disableFallback || false;

  // Try preferred provider first
  try {
    if (preferredProvider === 'claude') {
      return await callClaude(messages, systemPrompt, maxTokens);
    } else {
      return await callGemini(messages, systemPrompt, maxTokens);
    }
  } catch (error) {
    const aiError = error as AIError;
    
    console.log(`[AI Service] ${aiError.provider} failed: ${aiError.message}`);
    
    // If fallback is disabled or shouldn't fallback, rethrow
    if (disableFallback || !aiError.shouldFallback) {
      throw error;
    }

    // Try fallback provider
    console.log(`[AI Service] Falling back to ${preferredProvider === 'claude' ? 'gemini' : 'claude'}`);
    
    try {
      if (preferredProvider === 'claude') {
        return await callGemini(messages, systemPrompt, maxTokens);
      } else {
        return await callClaude(messages, systemPrompt, maxTokens);
      }
    } catch (fallbackError) {
      const fbError = fallbackError as AIError;
      console.error(`[AI Service] Fallback also failed: ${fbError.message}`);
      
      // Return more informative error
      throw {
        provider: 'none',
        status: 503,
        message: `Both AI providers failed. Primary (${aiError.provider}): ${aiError.message}. Fallback (${fbError.provider}): ${fbError.message}`,
        shouldFallback: false,
      } as AIError;
    }
  }
}

/**
 * Check which AI providers are available
 */
export function getAvailableProviders(): { claude: boolean; gemini: boolean } {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY),
  };
}

/**
 * Generate a tumor board agent response
 */
export async function generateAgentResponse(
  agentPrompt: string,
  caseContext: string,
  agentName: string,
  specialty: string
): Promise<AIResponse> {
  const systemPrompt = `You are ${agentName}, a ${specialty} specialist on a virtual tumor board.
Your role is to provide expert medical opinions based on current clinical guidelines.
Be concise, evidence-based, and cite relevant guidelines when possible.
Consider the Indian healthcare context including drug availability and cost considerations.
Format your response in markdown with clear sections.`;

  const messages = [
    {
      role: 'user',
      content: `${caseContext}\n\n${agentPrompt}`,
    },
  ];

  return callAI(messages, systemPrompt, { maxTokens: 2048 });
}

/**
 * Generate consensus recommendation
 */
export async function generateConsensus(
  agentResponses: { name: string; specialty: string; response: string }[],
  caseContext: string
): Promise<AIResponse> {
  const systemPrompt = `You are the Tumor Board Moderator synthesizing expert opinions into a consensus recommendation.
Provide a balanced, evidence-based consensus that weighs all specialist inputs.
Format as a structured clinical recommendation with:
1. Summary of key points from each specialist
2. Areas of agreement
3. Any disagreements and how to resolve them
4. Final consensus recommendation
5. Recommended follow-up and monitoring plan
Consider Indian healthcare context.`;

  const agentSummary = agentResponses
    .map(a => `### ${a.name} (${a.specialty}):\n${a.response}`)
    .join('\n\n');

  const messages = [
    {
      role: 'user',
      content: `Case Context:\n${caseContext}\n\nSpecialist Opinions:\n${agentSummary}\n\nPlease synthesize these opinions into a consensus recommendation.`,
    },
  ];

  return callAI(messages, systemPrompt, { maxTokens: 4096 });
}
