/**
 * Cost Tracking Module
 * 
 * Exports for tracking Gemini API costs and sending reports
 */

// Pricing utilities
export {
  GEMINI_PRICING,
  DEFAULT_MODEL,
  calculateCallCost,
  estimateTokens,
  formatCost,
  formatTokens,
} from './gemini-pricing';

export type { GeminiModelPricing } from './gemini-pricing';

// Cost tracking
export {
  logAPIUsage,
  getUsageEvents,
  getCostSummary,
  generateCostReport,
} from './cost-tracker';

export type {
  UsageCategory,
  APIUsageEvent,
  CostSummary,
} from './cost-tracker';

// Email sending
export {
  sendCostReportEmail,
  shouldSendReport,
  getNextReportTime,
} from './email-sender';

export type { ReportType } from './email-sender';
