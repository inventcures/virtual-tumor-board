/**
 * Analytics Feature Event API
 * 
 * POST /api/analytics/event
 * Records feature usage events (deliberation, imaging, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore, generateId } from '@/lib/analytics/store';
import { persistentStore } from '@/lib/analytics/db';
import { FeatureEvent, FeatureType } from '@/lib/analytics/types';

export const runtime = 'nodejs';

interface EventData {
  feature: FeatureType;
  action: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: EventData = await request.json();
    
    if (!data.feature || !data.action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get visitor ID from cookie
    const visitorId = request.cookies.get('vtb_visitor_id')?.value || 'anonymous';
    const sessionId = request.cookies.get('vtb_session_id')?.value;
    
    const event: FeatureEvent = {
      id: generateId(),
      timestamp: data.timestamp || new Date().toISOString(),
      visitorId,
      sessionId,
      feature: data.feature,
      action: data.action,
      metadata: data.metadata,
      durationMs: data.durationMs,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
    };
    
    // Store in memory
    await analyticsStore.logFeatureEvent(event);
    
    // Also persist to PostgreSQL if available (async, don't wait)
    persistentStore.logFeatureEvent(event).catch(() => {});
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Analytics] Event tracking error:', error);
    // Don't return error - analytics should fail silently
    return NextResponse.json({ success: true });
  }
}
