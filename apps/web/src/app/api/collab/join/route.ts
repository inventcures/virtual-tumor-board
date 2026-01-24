import { NextRequest, NextResponse } from 'next/server';
import { addUserToRoom, getRoomState } from '@/lib/collaboration/room-manager';
import { CollaborationUser } from '@/lib/collaboration/types';

export async function POST(request: NextRequest) {
  try {
    const { caseId, user } = await request.json() as { caseId: string; user: CollaborationUser };
    
    if (!caseId || !user) {
      return NextResponse.json({ error: 'Missing caseId or user' }, { status: 400 });
    }
    
    addUserToRoom(caseId, user);
    const state = getRoomState(caseId);
    
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
