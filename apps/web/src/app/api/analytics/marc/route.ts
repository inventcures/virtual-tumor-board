/**
 * MARC-v1 Analytics API
 * 
 * GET /api/analytics/marc - Get MARC performance summary
 * GET /api/analytics/marc?hours=24 - Custom time range
 * GET /api/analytics/marc?events=true&limit=50 - Get raw events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMARCSummary, getMARCEvents } from '@/lib/analytics/marc-analytics';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const includeEvents = searchParams.get('events') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get summary
    const summary = getMARCSummary(hours);

    // Optionally include raw events
    let events = undefined;
    if (includeEvents) {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      events = getMARCEvents(since, limit);
    }

    return NextResponse.json({
      success: true,
      summary,
      events,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[MARC Analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get MARC analytics' },
      { status: 500 }
    );
  }
}
