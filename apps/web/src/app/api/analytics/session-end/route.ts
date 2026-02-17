/**
 * Session End API
 *
 * POST /api/analytics/session-end
 * Marks a session as ended when user leaves or closes tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore } from '@/lib/analytics/store';
import { persistentStore } from '@/lib/analytics/db';

export const runtime = 'nodejs';

interface EndSessionData {
  sessionId: string;
  exitPage: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: EndSessionData = await request.json();

    if (!data.sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const exitPage = data.exitPage || '/';

    // End session in both stores
    await analyticsStore.endSession(data.sessionId, now, exitPage);
    persistentStore.endSession(data.sessionId, now, exitPage).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Analytics API] Failed to end session:', error);
    // Fail silently for analytics
    return NextResponse.json({ success: true });
  }
}
