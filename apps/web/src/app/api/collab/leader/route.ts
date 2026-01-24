import { NextRequest, NextResponse } from 'next/server';
import { setLeader, broadcastToRoom } from '@/lib/collaboration/room-manager';

export async function POST(request: NextRequest) {
  try {
    const { caseId, leaderId } = await request.json() as { caseId: string; leaderId: string };
    
    if (!caseId || !leaderId) {
      return NextResponse.json({ error: 'Missing caseId or leaderId' }, { status: 400 });
    }
    
    setLeader(caseId, leaderId);
    
    // Broadcast leader change to all users
    broadcastToRoom(caseId, { type: 'leader_change', leaderId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leader change error:', error);
    return NextResponse.json({ error: 'Failed to change leader' }, { status: 500 });
  }
}
