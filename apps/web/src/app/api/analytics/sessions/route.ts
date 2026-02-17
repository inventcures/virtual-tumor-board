/**
 * Session Logs API
 *
 * GET /api/analytics/sessions
 * Returns detailed session logs for admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { persistentStore } from '@/lib/analytics/db';
import { analyticsStore } from '@/lib/analytics/store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get('hours');
    const limitParam = searchParams.get('limit');

    const hours = hoursParam ? parseInt(hoursParam) : 24;
    const limit = limitParam ? parseInt(limitParam) : 100;

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Try persistent store first, fall back to in-memory
    const isDbAvailable = await persistentStore.isAvailable();
    const sessions = isDbAvailable
      ? await persistentStore.getSessions(since, limit)
      : await analyticsStore.getSessions(since, limit);

    return NextResponse.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('[Analytics API] Failed to get sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
