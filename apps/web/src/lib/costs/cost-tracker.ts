/**
 * Gemini API Cost Tracker
 * 
 * Tracks API usage and costs for:
 * - MARC-v1 document extraction
 * - RAG guideline lookups
 * - Imaging analysis
 * - General LLM calls
 * 
 * Stores in-memory with aggregation capabilities
 */

import { 
  calculateCallCost, 
  estimateTokens, 
  formatCost, 
  formatTokens,
  DEFAULT_MODEL,
  GEMINI_PRICING,
} from './gemini-pricing';

// ============================================================================
// Types
// ============================================================================

export type UsageCategory = 
  | 'marc_extraction'      // MARC-v1 document extraction
  | 'marc_evaluation'      // MARC-v1 quality evaluation
  | 'rag_lookup'           // RAG guideline queries
  | 'imaging_analysis'     // MedGemma imaging
  | 'deliberation'         // Agent deliberation
  | 'other';

export interface APIUsageEvent {
  id: string;
  timestamp: string;
  
  // Model info
  model: string;
  
  // Token counts
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Costs (USD)
  inputCost: number;
  outputCost: number;
  totalCost: number;
  
  // Categorization
  category: UsageCategory;
  
  // Context
  documentId?: string;
  sessionId?: string;
  
  // Performance
  latencyMs?: number;
}

export interface CostSummary {
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Totals
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  
  // By category
  byCategory: Record<UsageCategory, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  
  // By model
  byModel: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  
  // Time series (hourly for daily, daily for weekly/monthly)
  timeSeries: Array<{
    period: string;
    calls: number;
    tokens: number;
    cost: number;
  }>;
  
  // Projections
  projectedDailyCost?: number;
  projectedMonthlyCost?: number;
}

// ============================================================================
// In-Memory Store
// ============================================================================

const MAX_EVENTS = 50000;  // Keep last 50K events (~30 days at moderate usage)
const usageEvents: APIUsageEvent[] = [];

/**
 * Log an API usage event
 */
export function logAPIUsage(params: {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  inputText?: string;      // Alternative: estimate from text
  outputText?: string;
  category: UsageCategory;
  documentId?: string;
  sessionId?: string;
  latencyMs?: number;
}): APIUsageEvent {
  const model = params.model || DEFAULT_MODEL;
  
  // Calculate tokens (use provided or estimate from text)
  const inputTokens = params.inputTokens ?? 
    (params.inputText ? estimateTokens(params.inputText) : 0);
  const outputTokens = params.outputTokens ??
    (params.outputText ? estimateTokens(params.outputText) : 0);
  
  // Calculate costs
  const { inputCost, outputCost, totalCost } = calculateCallCost(
    model, inputTokens, outputTokens
  );
  
  const event: APIUsageEvent = {
    id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost,
    category: params.category,
    documentId: params.documentId,
    sessionId: params.sessionId,
    latencyMs: params.latencyMs,
  };
  
  usageEvents.unshift(event);
  
  // Prune old events
  if (usageEvents.length > MAX_EVENTS) {
    usageEvents.length = MAX_EVENTS;
  }
  
  return event;
}

/**
 * Get usage events within a time range
 */
export function getUsageEvents(since?: Date, limit = 1000): APIUsageEvent[] {
  let filtered = usageEvents;
  
  if (since) {
    const sinceTime = since.getTime();
    filtered = usageEvents.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
  }
  
  return filtered.slice(0, limit);
}

/**
 * Calculate cost summary for a time period
 */
export function getCostSummary(hours: number): CostSummary {
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const events = getUsageEvents(since, MAX_EVENTS);
  
  // Initialize summary
  const summary: CostSummary = {
    period: hours <= 24 ? `last_${hours}h` : hours <= 168 ? `last_${Math.round(hours/24)}d` : `last_${Math.round(hours/24/30)}mo`,
    periodStart: since.toISOString(),
    periodEnd: now.toISOString(),
    totalCalls: events.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    byCategory: {
      marc_extraction: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      marc_evaluation: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      rag_lookup: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      imaging_analysis: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      deliberation: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      other: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
    },
    byModel: {},
    timeSeries: [],
  };
  
  // Aggregate events
  const timeSeriesMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  
  for (const event of events) {
    // Totals
    summary.totalInputTokens += event.inputTokens;
    summary.totalOutputTokens += event.outputTokens;
    summary.totalTokens += event.totalTokens;
    summary.totalCost += event.totalCost;
    
    // By category
    const cat = summary.byCategory[event.category];
    cat.calls++;
    cat.inputTokens += event.inputTokens;
    cat.outputTokens += event.outputTokens;
    cat.cost += event.totalCost;
    
    // By model
    if (!summary.byModel[event.model]) {
      summary.byModel[event.model] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    }
    const model = summary.byModel[event.model];
    model.calls++;
    model.inputTokens += event.inputTokens;
    model.outputTokens += event.outputTokens;
    model.cost += event.totalCost;
    
    // Time series (hourly for daily, daily for weekly+)
    const periodKey = hours <= 24 
      ? new Date(event.timestamp).toISOString().slice(0, 13) + ':00:00Z'
      : new Date(event.timestamp).toISOString().slice(0, 10);
    
    if (!timeSeriesMap.has(periodKey)) {
      timeSeriesMap.set(periodKey, { calls: 0, tokens: 0, cost: 0 });
    }
    const ts = timeSeriesMap.get(periodKey)!;
    ts.calls++;
    ts.tokens += event.totalTokens;
    ts.cost += event.totalCost;
  }
  
  // Convert time series map to array
  summary.timeSeries = Array.from(timeSeriesMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
  
  // Calculate projections
  if (events.length > 0) {
    const hoursElapsed = hours;
    const costPerHour = summary.totalCost / hoursElapsed;
    summary.projectedDailyCost = costPerHour * 24;
    summary.projectedMonthlyCost = costPerHour * 24 * 30;
  }
  
  return summary;
}

/**
 * Get a formatted cost report for email
 */
export function generateCostReport(hours: number): string {
  const summary = getCostSummary(hours);
  const periodLabel = hours === 24 ? 'Daily' : hours === 168 ? 'Weekly' : 'Monthly';
  
  let report = `# Virtual Tumor Board - ${periodLabel} Cost Report\n\n`;
  report += `**Period:** ${new Date(summary.periodStart).toLocaleString()} - ${new Date(summary.periodEnd).toLocaleString()}\n\n`;
  
  // Overview
  report += `## Overview\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total API Calls | ${summary.totalCalls.toLocaleString()} |\n`;
  report += `| Total Tokens | ${formatTokens(summary.totalTokens)} |\n`;
  report += `| Input Tokens | ${formatTokens(summary.totalInputTokens)} |\n`;
  report += `| Output Tokens | ${formatTokens(summary.totalOutputTokens)} |\n`;
  report += `| **Total Cost** | **${formatCost(summary.totalCost)}** |\n`;
  
  if (summary.projectedMonthlyCost) {
    report += `| Projected Monthly | ${formatCost(summary.projectedMonthlyCost)} |\n`;
  }
  report += `\n`;
  
  // By Category
  report += `## Cost by Category\n\n`;
  report += `| Category | Calls | Tokens | Cost |\n`;
  report += `|----------|-------|--------|------|\n`;
  
  for (const [cat, data] of Object.entries(summary.byCategory)) {
    if (data.calls > 0) {
      report += `| ${cat.replace(/_/g, ' ')} | ${data.calls} | ${formatTokens(data.inputTokens + data.outputTokens)} | ${formatCost(data.cost)} |\n`;
    }
  }
  report += `\n`;
  
  // By Model
  if (Object.keys(summary.byModel).length > 0) {
    report += `## Cost by Model\n\n`;
    report += `| Model | Calls | Cost |\n`;
    report += `|-------|-------|------|\n`;
    
    for (const [model, data] of Object.entries(summary.byModel)) {
      report += `| ${model} | ${data.calls} | ${formatCost(data.cost)} |\n`;
    }
    report += `\n`;
  }
  
  // Pricing Reference
  report += `## Pricing Reference (Gemini 2.0 Flash)\n\n`;
  const pricing = GEMINI_PRICING[DEFAULT_MODEL];
  report += `- Input: $${pricing.inputPricePerMillion}/1M tokens\n`;
  report += `- Output: $${pricing.outputPricePerMillion}/1M tokens\n\n`;
  
  report += `---\n`;
  report += `*Generated at ${new Date().toISOString()}*\n`;
  
  return report;
}

// Export for testing
export { usageEvents };
