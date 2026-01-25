/**
 * Analytics Status API
 * 
 * GET /api/analytics/status
 * Returns storage status and total counts
 */

import { NextResponse } from 'next/server';
import { getStoreStats } from '@/lib/analytics/store';
import { persistentStore } from '@/lib/analytics/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const memoryStats = getStoreStats();
    const dbAvailable = await persistentStore.isAvailable();
    
    let dbStats = null;
    if (dbAvailable) {
      dbStats = await persistentStore.getTotalStats();
    }
    
    return NextResponse.json({
      storage: {
        memory: {
          visitors: memoryStats.visitors,
          pageViews: memoryStats.pageViews,
          featureEvents: memoryStats.featureEvents,
        },
        database: dbAvailable ? {
          available: true,
          totalPageViews: dbStats?.totalPageViews || 0,
          totalVisitors: dbStats?.totalVisitors || 0,
          totalSessions: dbStats?.totalSessions || 0,
          dataFrom: dbStats?.oldestDate || null,
        } : {
          available: false,
          message: 'Set DATABASE_URL for persistent storage',
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Analytics] Status error:', error);
    return NextResponse.json({
      storage: {
        memory: { visitors: 0, pageViews: 0, featureEvents: 0 },
        database: { available: false, error: 'Failed to check status' },
      },
      timestamp: new Date().toISOString(),
    });
  }
}
