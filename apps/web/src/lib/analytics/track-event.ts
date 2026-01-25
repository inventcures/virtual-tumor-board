/**
 * Client-side Feature Event Tracking
 * 
 * Use this to track feature usage (deliberation, imaging, etc.)
 * from client components.
 * 
 * Usage:
 *   import { trackFeatureEvent } from '@/lib/analytics/track-event';
 *   
 *   // Track a deliberation
 *   trackFeatureEvent('deliberation', 'start', { caseId: '123' });
 *   
 *   // Track with timing
 *   const startTime = Date.now();
 *   // ... do work ...
 *   trackFeatureEvent('imaging_analysis', 'complete', { 
 *     modality: 'CT' 
 *   }, Date.now() - startTime, true);
 */

import { FeatureType } from './types';

interface TrackEventOptions {
  metadata?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Track a feature event
 * 
 * @param feature - The feature being used
 * @param action - What action was taken (e.g., 'start', 'complete', 'error')
 * @param options - Additional tracking options
 */
export function trackFeatureEvent(
  feature: FeatureType,
  action: string,
  options: TrackEventOptions = {}
): void {
  // Fire and forget - don't block the UI
  try {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature,
        action,
        metadata: options.metadata,
        durationMs: options.durationMs,
        success: options.success ?? true,
        errorMessage: options.errorMessage,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently ignore - analytics should never break the app
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Create a timer for tracking feature duration
 * 
 * Usage:
 *   const timer = createFeatureTimer('deliberation', 'process');
 *   // ... do work ...
 *   timer.complete({ caseId: '123' }); // or timer.error('Something went wrong');
 */
export function createFeatureTimer(feature: FeatureType, action: string) {
  const startTime = Date.now();
  
  return {
    complete(metadata?: Record<string, unknown>) {
      trackFeatureEvent(feature, action, {
        metadata,
        durationMs: Date.now() - startTime,
        success: true,
      });
    },
    error(errorMessage: string, metadata?: Record<string, unknown>) {
      trackFeatureEvent(feature, action, {
        metadata,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage,
      });
    },
  };
}
