import { NextRequest, NextResponse } from 'next/server';
import { removeUserFromRoom, getRoomState, broadcastToRoom } from '@/lib/collaboration/room-manager';
import { verifyApiAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const authError = verifyApiAuth(request);
  if (authError) return authError;

  try {
    const { caseId, userId } = await request.json() as { caseId: string; userId: string };
    
    if (!caseId || !userId) {
      return NextResponse.json({ error: 'Missing caseId or userId' }, { status: 400 });
    }
    
    const room = removeUserFromRoom(caseId, userId);
    
    // Broadcast leave event to remaining users
    if (room) {
      broadcastToRoom(caseId, { type: 'leave', userId });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave error:', error);
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 });
  }
}
