/**
 * Analytics Summary API
 * 
 * GET /api/analytics/summary?hours=24
 * Returns aggregated analytics for the specified time period
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore } from '@/lib/analytics/store';
import { persistentStore } from '@/lib/analytics/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Get in-memory summary (fast, current data)
    const summary = await analyticsStore.getSummary(hours);
    
    // Try to get historical stats from DB
    let historicalStats = null;
    let totalStats = null;
    
    if (await persistentStore.isAvailable()) {
      try {
        // Get last 30 days of daily stats
        historicalStats = await persistentStore.getDailyStats(30);
        totalStats = await persistentStore.getTotalStats();
      } catch (e) {
        console.warn('[Analytics API] Failed to get historical stats:', e);
      }
    }
    
    return NextResponse.json({
      ...summary,
      // Add historical data if available
      historical: historicalStats,
      totals: totalStats,
      dbAvailable: await persistentStore.isAvailable(),
    });
    
  } catch (error) {
    console.error('[Analytics API] Summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics summary' },
      { status: 500 }
    );
  }
}
