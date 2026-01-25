/**
 * Imaging Analytics for Virtual Tumor Board
 * 
 * Comprehensive analytics following Saloni Dattani's data visualization principles:
 * - Meaningful metrics that answer precise questions
 * - Clear visualizations with direct labels and plain language
 * - Standalone charts with context and units
 * - Color-blind friendly palettes
 * 
 * @see https://www.scientificdiscovery.dev/p/salonis-guide-to-data-visualization
 */

// ============================================================================
// Types
// ============================================================================

export interface ImagingEvent {
  timestamp: string;
  eventId: string;
  eventType: 'upload' | 'analysis' | 'segmentation' | 'view';
  
  // Source info
  source: 'medgemma' | 'oncoseg' | 'dicom' | 'nifti' | 'camera' | 'gallery';
  provider?: string;  // e.g., 'HuggingFace Space', 'Vertex AI'
  model?: string;     // e.g., 'medgemma-27b-it', 'oncoseg-brain'
  
  // Image info
  modality?: string;  // CT, MRI, X-ray, etc.
  bodyPart?: string;
  imageSize?: { width: number; height: number };
  sliceCount?: number;
  
  // Performance
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  
  // Quality metrics (for analysis/segmentation)
  confidence?: number;
  findingsCount?: number;
  maskAreaPercent?: number;
  contourCount?: number;
  
  // User context
  sessionId?: string;
  cancerType?: string;
}

export interface AnalyticsSummary {
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Volume
  totalEvents: number;
  eventsByType: Record<string, number>;
  
  // Success rates
  successRate: number;
  errorsByType: Record<string, number>;
  
  // Performance
  latencyStats: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  
  // Usage patterns
  bySource: Record<string, number>;
  byModality: Record<string, number>;
  byBodyPart: Record<string, number>;
  byHour: Record<string, number>;
  
  // Quality
  avgConfidence: number;
  avgFindingsCount: number;
}

// ============================================================================
// Color Palette (Color-blind friendly, per Saloni's guide)
// ============================================================================

export const ANALYTICS_COLORS = {
  // Primary palette
  primary: '#1E88E5',    // Blue - main accent
  secondary: '#7B1FA2',  // Purple - secondary accent
  
  // Status colors
  success: '#43A047',    // Green - good/success
  warning: '#FB8C00',    // Orange - warning/attention
  error: '#E53935',      // Red - error/failure
  
  // Neutral
  neutral: '#757575',    // Grey - neutral/inactive
  background: '#F5F5F5', // Light grey - background
  
  // Source colors (distinguishable for color-blind users)
  medgemma: '#1E88E5',   // Blue
  oncoseg: '#7B1FA2',    // Purple
  dicom: '#00897B',      // Teal
  camera: '#FB8C00',     // Orange
  gallery: '#5E35B1',    // Deep purple
  
  // Modality colors
  ct: '#1E88E5',
  mri: '#7B1FA2',
  xray: '#00897B',
  ultrasound: '#FB8C00',
  pet: '#E53935',
} as const;

// ============================================================================
// Analytics Collector
// ============================================================================

class ImagingAnalyticsCollector {
  private events: ImagingEvent[] = [];
  private maxEvents = 5000;
  private storageKey = 'vtb_imaging_analytics';
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.events = JSON.parse(stored);
        // Keep only recent events
        if (this.events.length > this.maxEvents) {
          this.events = this.events.slice(-this.maxEvents);
        }
      }
    } catch (e) {
      console.warn('[Analytics] Failed to load from storage:', e);
    }
  }
  
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Keep only recent events
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch (e) {
      console.warn('[Analytics] Failed to save to storage:', e);
    }
  }
  
  /**
   * Log an imaging event
   */
  logEvent(event: Omit<ImagingEvent, 'timestamp' | 'eventId'>): void {
    const fullEvent: ImagingEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.events.push(fullEvent);
    this.saveToStorage();
    
    console.log(
      `[Analytics] ${fullEvent.eventType}:${fullEvent.source} ` +
      `latency=${fullEvent.latencyMs}ms success=${fullEvent.success}`
    );
  }
  
  /**
   * Log a MedGemma analysis event
   */
  logMedGemmaAnalysis(params: {
    model: string;
    provider: string;
    modality?: string;
    bodyPart?: string;
    latencyMs: number;
    success: boolean;
    confidence?: number;
    findingsCount?: number;
    errorMessage?: string;
  }): void {
    this.logEvent({
      eventType: 'analysis',
      source: 'medgemma',
      model: params.model,
      provider: params.provider,
      modality: params.modality,
      bodyPart: params.bodyPart,
      latencyMs: params.latencyMs,
      success: params.success,
      confidence: params.confidence,
      findingsCount: params.findingsCount,
      errorMessage: params.errorMessage,
    });
  }
  
  /**
   * Log an OncoSeg segmentation event
   */
  logOncoSegmentation(params: {
    checkpoint: string;
    backend: 'sam3' | 'fallback';
    modality?: string;
    sliceIdx: number;
    sliceCount: number;
    latencyMs: number;
    success: boolean;
    maskAreaPercent?: number;
    contourCount?: number;
    errorMessage?: string;
  }): void {
    this.logEvent({
      eventType: 'segmentation',
      source: 'oncoseg',
      model: `oncoseg-${params.checkpoint}`,
      provider: params.backend === 'sam3' ? 'HuggingFace ZeroGPU' : 'Fallback',
      modality: params.modality,
      sliceCount: params.sliceCount,
      latencyMs: params.latencyMs,
      success: params.success,
      maskAreaPercent: params.maskAreaPercent,
      contourCount: params.contourCount,
      errorMessage: params.errorMessage,
    });
  }
  
  /**
   * Log an image upload event
   */
  logUpload(params: {
    source: 'dicom' | 'nifti' | 'camera' | 'gallery';
    modality?: string;
    bodyPart?: string;
    imageSize?: { width: number; height: number };
    sliceCount?: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.logEvent({
      eventType: 'upload',
      ...params,
    });
  }
  
  /**
   * Get analytics summary for the last N hours
   */
  getSummary(hours: number = 24): AnalyticsSummary {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString();
    
    const recentEvents = this.events.filter(e => e.timestamp >= cutoffStr);
    
    if (recentEvents.length === 0) {
      return {
        period: `Last ${hours} hours`,
        periodStart: cutoffStr,
        periodEnd: new Date().toISOString(),
        totalEvents: 0,
        eventsByType: {},
        successRate: 0,
        errorsByType: {},
        latencyStats: { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 },
        bySource: {},
        byModality: {},
        byBodyPart: {},
        byHour: {},
        avgConfidence: 0,
        avgFindingsCount: 0,
      };
    }
    
    // Calculate statistics
    const latencies = recentEvents.map(e => e.latencyMs).sort((a, b) => a - b);
    const successful = recentEvents.filter(e => e.success);
    const failed = recentEvents.filter(e => !e.success);
    
    // Group by various dimensions
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byModality: Record<string, number> = {};
    const byBodyPart: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    
    for (const event of recentEvents) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      bySource[event.source] = (bySource[event.source] || 0) + 1;
      
      if (event.modality) {
        byModality[event.modality] = (byModality[event.modality] || 0) + 1;
      }
      if (event.bodyPart) {
        byBodyPart[event.bodyPart] = (byBodyPart[event.bodyPart] || 0) + 1;
      }
      
      const hour = event.timestamp.substring(11, 13);
      byHour[hour] = (byHour[hour] || 0) + 1;
      
      if (!event.success && event.errorMessage) {
        const errorType = event.errorMessage.split(':')[0] || 'Unknown';
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
    }
    
    // Calculate quality metrics
    const confidences = recentEvents
      .filter(e => e.confidence !== undefined)
      .map(e => e.confidence!);
    const findingsCounts = recentEvents
      .filter(e => e.findingsCount !== undefined)
      .map(e => e.findingsCount!);
    
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil(arr.length * p / 100) - 1;
      return arr[Math.max(0, idx)];
    };
    
    const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    return {
      period: `Last ${hours} hours`,
      periodStart: cutoffStr,
      periodEnd: new Date().toISOString(),
      totalEvents: recentEvents.length,
      eventsByType: byType,
      successRate: Math.round((successful.length / recentEvents.length) * 100 * 10) / 10,
      errorsByType,
      latencyStats: {
        mean: Math.round(mean(latencies)),
        median: Math.round(percentile(latencies, 50)),
        p95: Math.round(percentile(latencies, 95)),
        p99: Math.round(percentile(latencies, 99)),
        min: Math.round(Math.min(...latencies)),
        max: Math.round(Math.max(...latencies)),
      },
      bySource,
      byModality,
      byBodyPart,
      byHour,
      avgConfidence: Math.round(mean(confidences) * 100) / 100,
      avgFindingsCount: Math.round(mean(findingsCounts) * 10) / 10,
    };
  }
  
  /**
   * Get recent events for detailed inspection
   */
  getRecentEvents(limit: number = 50): ImagingEvent[] {
    return this.events.slice(-limit).reverse();
  }
  
  /**
   * Export all events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
  
  /**
   * Clear all analytics data
   */
  clearAll(): void {
    this.events = [];
    this.saveToStorage();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyticsInstance: ImagingAnalyticsCollector | null = null;

export function getImagingAnalytics(): ImagingAnalyticsCollector {
  if (!analyticsInstance) {
    analyticsInstance = new ImagingAnalyticsCollector();
  }
  return analyticsInstance;
}

// ============================================================================
// Chart Configuration Helpers (Following Saloni's Principles)
// ============================================================================

/**
 * Generate chart config following Saloni's visualization principles:
 * - Clear titles that state the takeaway
 * - Direct labels (no separate legends when possible)
 * - Plain language descriptions
 * - Color-blind friendly palette
 */
export function generateChartConfig(
  type: 'bar' | 'line' | 'pie' | 'gauge',
  title: string,
  subtitle: string,
  data: { labels: string[]; values: number[]; colors?: string[] }
) {
  // Saloni's principle: Use meaningful, descriptive titles
  // Saloni's principle: Include context in subtitles
  
  const defaultColors = [
    ANALYTICS_COLORS.primary,
    ANALYTICS_COLORS.secondary,
    ANALYTICS_COLORS.success,
    ANALYTICS_COLORS.warning,
    ANALYTICS_COLORS.error,
  ];
  
  return {
    type,
    title,
    subtitle,
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors || defaultColors.slice(0, data.values.length),
        // Saloni's principle: Direct labels reduce cognitive load
        datalabels: {
          display: true,
          color: '#333',
          font: { weight: 'bold' },
        },
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: 'bold' },
          color: '#333',
        },
        subtitle: {
          display: true,
          text: subtitle,
          font: { size: 12 },
          color: '#666',
          padding: { bottom: 10 },
        },
        // Saloni's principle: Minimize legends when possible
        legend: {
          display: data.labels.length > 5, // Only show legend if many items
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            font: { size: 11 },
          },
        },
      },
      // Saloni's principle: Keep text horizontal
      scales: type === 'bar' ? {
        x: {
          ticks: { maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#eee' },
        },
      } : undefined,
    },
  };
}

/**
 * Generate a summary card configuration
 */
export function generateMetricCard(
  title: string,
  value: number | string,
  unit?: string,
  context?: string,
  status?: 'success' | 'warning' | 'error' | 'neutral'
) {
  const statusColors = {
    success: ANALYTICS_COLORS.success,
    warning: ANALYTICS_COLORS.warning,
    error: ANALYTICS_COLORS.error,
    neutral: ANALYTICS_COLORS.primary,
  };
  
  return {
    title,
    value,
    unit,
    context,
    color: statusColors[status || 'neutral'],
  };
}
