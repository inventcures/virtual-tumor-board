/**
 * Gemini API Pricing Configuration
 * 
 * Prices are per 1M tokens (as of January 2025)
 * Source: https://ai.google.dev/pricing
 * 
 * Note: Prices may change - update this file when Google updates pricing
 */

export interface GeminiModelPricing {
  model: string;
  inputPricePerMillion: number;   // USD per 1M input tokens
  outputPricePerMillion: number;  // USD per 1M output tokens
  contextWindow: number;          // Max context length
  notes?: string;
}

/**
 * Gemini model pricing (January 2025)
 * 
 * gemini-2.0-flash is the primary model used in MARC-v1
 */
export const GEMINI_PRICING: Record<string, GeminiModelPricing> = {
  // Gemini 2.0 Flash - Primary model for MARC-v1
  'gemini-2.0-flash': {
    model: 'gemini-2.0-flash',
    inputPricePerMillion: 0.10,    // $0.10 per 1M input tokens
    outputPricePerMillion: 0.40,   // $0.40 per 1M output tokens
    contextWindow: 1000000,
    notes: 'Primary model for extraction and evaluation',
  },
  
  // Gemini 2.0 Flash Lite - Even cheaper option
  'gemini-2.0-flash-lite': {
    model: 'gemini-2.0-flash-lite',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    contextWindow: 1000000,
    notes: 'Lighter version, faster responses',
  },
  
  // Gemini 1.5 Flash - Legacy but still used
  'gemini-1.5-flash': {
    model: 'gemini-1.5-flash',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    contextWindow: 1000000,
    notes: 'Previous generation flash model',
  },
  
  // Gemini 1.5 Pro - Higher capability
  'gemini-1.5-pro': {
    model: 'gemini-1.5-pro',
    inputPricePerMillion: 1.25,    // Up to 128K context
    outputPricePerMillion: 5.00,
    contextWindow: 2000000,
    notes: 'Pro model, higher cost but better reasoning',
  },
  
  // Gemini 2.0 Flash Thinking - Experimental
  'gemini-2.0-flash-thinking-exp': {
    model: 'gemini-2.0-flash-thinking-exp',
    inputPricePerMillion: 0.0,     // Free during experimental
    outputPricePerMillion: 0.0,
    contextWindow: 32000,
    notes: 'Experimental thinking model (currently free)',
  },
};

// Default model used in MARC-v1
export const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Calculate cost for a single API call
 */
export function calculateCallCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = GEMINI_PRICING[model] || GEMINI_PRICING[DEFAULT_MODEL];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Estimate tokens from text (rough approximation)
 * Gemini uses ~4 characters per token on average for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format large token counts
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}
