/**
 * Real-time Analytics API
 * 
 * GET /api/analytics/realtime
 * Returns current active visitors and live activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore } from '@/lib/analytics/store';

export async function GET(request: NextRequest) {
  try {
    const realtime = await analyticsStore.getRealTimeStats();
    
    return NextResponse.json(realtime);
    
  } catch (error) {
    console.error('[Analytics API] Realtime error:', error);
    return NextResponse.json(
      { 
        activeVisitors: 0,
        last5MinPageViews: 0,
        currentPages: [],
        recentVisitors: []
      },
      { status: 200 } // Return empty data, don't fail
    );
  }
}
