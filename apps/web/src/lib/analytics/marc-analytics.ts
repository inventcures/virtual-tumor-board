/**
 * MARC-v1 Performance Analytics
 * 
 * Tracks and analyzes MARC reliability loop performance:
 * - Extraction quality scores over time
 * - Iteration counts and convergence patterns
 * - Document type performance breakdown
 * - Threshold achievement rates
 * 
 * Used by /api/upload/process-v2 and /api/analytics/marc endpoints
 */

import type { DocumentType } from '@/types/user-upload';

// ============================================================================
// MARC Analytics Types
// ============================================================================

/**
 * Single MARC extraction event
 */
export interface MARCExtractionEvent {
  id: string;
  timestamp: string;
  
  // Document info
  documentType: DocumentType;
  documentId: string;
  fileSize?: number;
  
  // Loop configuration
  qualityThreshold: number;
  maxIterations: number;
  reliabilityLoopEnabled: boolean;
  
  // Results
  finalScore: number;
  iterations: number;
  metThreshold: boolean;
  stoppedReason: string;
  
  // Score breakdown
  completenessScore?: number;
  accuracyScore?: number;
  consistencyScore?: number;
  clinicalValidityScore?: number;
  
  // Performance
  processingTimeMs: number;
  
  // Per-iteration data (for debugging)
  iterationScores?: number[];
}

/**
 * Aggregated MARC performance metrics
 */
export interface MARCAnalyticsSummary {
  period: string;  // e.g., "last_24h", "last_7d"
  periodStart: string;
  periodEnd: string;
  
  // Volume
  totalExtractions: number;
  reliabilityLoopEnabled: number;
  reliabilityLoopDisabled: number;
  
  // Success rates
  thresholdMetRate: number;  // % that met threshold
  avgFinalScore: number;
  avgIterations: number;
  
  // Score distribution
  scoreDistribution: {
    excellent: number;  // >= 0.95
    good: number;       // 0.85-0.94
    fair: number;       // 0.70-0.84
    poor: number;       // < 0.70
  };
  
  // Per-dimension averages
  avgCompleteness: number;
  avgAccuracy: number;
  avgConsistency: number;
  avgClinicalValidity: number;
  
  // By document type
  byDocumentType: Record<DocumentType, {
    count: number;
    avgScore: number;
    thresholdMetRate: number;
    avgIterations: number;
  }>;
  
  // Performance
  avgProcessingTimeMs: number;
  p50ProcessingTimeMs: number;
  p95ProcessingTimeMs: number;
  
  // Convergence analysis
  iterationDistribution: Record<number, number>;  // iterations -> count
  stoppedReasons: Record<string, number>;
  
  // Time series (hourly)
  scoresByHour: Array<{
    hour: string;
    avgScore: number;
    count: number;
  }>;
}

// ============================================================================
// In-Memory Store for MARC Events
// ============================================================================

const MAX_EVENTS = 10000;
const marcEvents: MARCExtractionEvent[] = [];

/**
 * Log a MARC extraction event
 */
export function logMARCEvent(event: Omit<MARCExtractionEvent, 'id' | 'timestamp'>): void {
  const fullEvent: MARCExtractionEvent = {
    ...event,
    id: `marc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  marcEvents.unshift(fullEvent);
  
  // Prune old events
  if (marcEvents.length > MAX_EVENTS) {
    marcEvents.length = MAX_EVENTS;
  }
}

/**
 * Get recent MARC events
 */
export function getMARCEvents(since?: Date, limit = 100): MARCExtractionEvent[] {
  let filtered = marcEvents;
  
  if (since) {
    const sinceTime = since.getTime();
    filtered = marcEvents.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
  }
  
  return filtered.slice(0, limit);
}

/**
 * Calculate MARC analytics summary
 */
export function getMARCSummary(hours = 24): MARCAnalyticsSummary {
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const events = getMARCEvents(since, MAX_EVENTS);
  
  if (events.length === 0) {
    return createEmptySummary(hours, since, now);
  }
  
  // Calculate metrics
  const enabledEvents = events.filter(e => e.reliabilityLoopEnabled);
  const thresholdMetEvents = events.filter(e => e.metThreshold);
  
  const scores = events.map(e => e.finalScore);
  const avgScore = average(scores);
  const avgIterations = average(events.map(e => e.iterations));
  const processingTimes = events.map(e => e.processingTimeMs).sort((a, b) => a - b);
  
  // Score distribution
  const scoreDistribution = {
    excellent: events.filter(e => e.finalScore >= 0.95).length,
    good: events.filter(e => e.finalScore >= 0.85 && e.finalScore < 0.95).length,
    fair: events.filter(e => e.finalScore >= 0.70 && e.finalScore < 0.85).length,
    poor: events.filter(e => e.finalScore < 0.70).length,
  };
  
  // By document type
  const byDocumentType = {} as MARCAnalyticsSummary['byDocumentType'];
  const docTypes = [...new Set(events.map(e => e.documentType))];
  for (const dt of docTypes) {
    const dtEvents = events.filter(e => e.documentType === dt);
    byDocumentType[dt] = {
      count: dtEvents.length,
      avgScore: average(dtEvents.map(e => e.finalScore)),
      thresholdMetRate: dtEvents.filter(e => e.metThreshold).length / dtEvents.length,
      avgIterations: average(dtEvents.map(e => e.iterations)),
    };
  }
  
  // Iteration distribution
  const iterationDistribution: Record<number, number> = {};
  for (const e of events) {
    iterationDistribution[e.iterations] = (iterationDistribution[e.iterations] || 0) + 1;
  }
  
  // Stopped reasons
  const stoppedReasons: Record<string, number> = {};
  for (const e of events) {
    const reason = simplifyReason(e.stoppedReason);
    stoppedReasons[reason] = (stoppedReasons[reason] || 0) + 1;
  }
  
  // Scores by hour
  const scoresByHour = calculateHourlyScores(events);
  
  return {
    period: `last_${hours}h`,
    periodStart: since.toISOString(),
    periodEnd: now.toISOString(),
    
    totalExtractions: events.length,
    reliabilityLoopEnabled: enabledEvents.length,
    reliabilityLoopDisabled: events.length - enabledEvents.length,
    
    thresholdMetRate: thresholdMetEvents.length / events.length,
    avgFinalScore: avgScore,
    avgIterations,
    
    scoreDistribution,
    
    avgCompleteness: average(events.map(e => e.completenessScore).filter(Boolean) as number[]),
    avgAccuracy: average(events.map(e => e.accuracyScore).filter(Boolean) as number[]),
    avgConsistency: average(events.map(e => e.consistencyScore).filter(Boolean) as number[]),
    avgClinicalValidity: average(events.map(e => e.clinicalValidityScore).filter(Boolean) as number[]),
    
    byDocumentType,
    
    avgProcessingTimeMs: average(processingTimes),
    p50ProcessingTimeMs: percentile(processingTimes, 50),
    p95ProcessingTimeMs: percentile(processingTimes, 95),
    
    iterationDistribution,
    stoppedReasons,
    scoresByHour,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, idx)];
}

function simplifyReason(reason: string): string {
  if (reason.includes('threshold')) return 'threshold_met';
  if (reason.includes('Max iterations')) return 'max_iterations';
  if (reason.includes('improvement')) return 'insufficient_improvement';
  if (reason.includes('Timeout')) return 'timeout';
  if (reason.includes('failed')) return 'error';
  return 'other';
}

function calculateHourlyScores(events: MARCExtractionEvent[]): MARCAnalyticsSummary['scoresByHour'] {
  const hourlyData: Record<string, { scores: number[]; count: number }> = {};
  
  for (const e of events) {
    const hour = new Date(e.timestamp).toISOString().slice(0, 13) + ':00:00Z';
    if (!hourlyData[hour]) {
      hourlyData[hour] = { scores: [], count: 0 };
    }
    hourlyData[hour].scores.push(e.finalScore);
    hourlyData[hour].count++;
  }
  
  return Object.entries(hourlyData)
    .map(([hour, data]) => ({
      hour,
      avgScore: average(data.scores),
      count: data.count,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function createEmptySummary(hours: number, since: Date, now: Date): MARCAnalyticsSummary {
  return {
    period: `last_${hours}h`,
    periodStart: since.toISOString(),
    periodEnd: now.toISOString(),
    totalExtractions: 0,
    reliabilityLoopEnabled: 0,
    reliabilityLoopDisabled: 0,
    thresholdMetRate: 0,
    avgFinalScore: 0,
    avgIterations: 0,
    scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
    avgCompleteness: 0,
    avgAccuracy: 0,
    avgConsistency: 0,
    avgClinicalValidity: 0,
    byDocumentType: {} as MARCAnalyticsSummary['byDocumentType'],
    avgProcessingTimeMs: 0,
    p50ProcessingTimeMs: 0,
    p95ProcessingTimeMs: 0,
    iterationDistribution: {},
    stoppedReasons: {},
    scoresByHour: [],
  };
}

// ============================================================================
// Export for API routes
// ============================================================================

export { marcEvents };
