/**
 * User Role Tracking API
 *
 * POST /api/analytics/role
 * Updates the user role for a visitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore } from '@/lib/analytics/store';
import { persistentStore } from '@/lib/analytics/db';

export const runtime = 'nodejs';

interface RoleData {
  role: string;
  visitorId: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: RoleData = await request.json();

    if (!data.role || !data.visitorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[Analytics] Role change:', {
      visitorId: data.visitorId,
      role: data.role,
    });

    // Update visitor role in both stores
    const visitor = await analyticsStore.getVisitor(data.visitorId);
    if (visitor) {
      visitor.userRole = data.role;
      await analyticsStore.upsertVisitor(visitor);
      persistentStore.upsertVisitor(visitor).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Analytics API] Failed to update role:', error);
    // Fail silently for analytics
    return NextResponse.json({ success: true });
  }
}
