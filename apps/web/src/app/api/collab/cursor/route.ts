import { NextRequest, NextResponse } from 'next/server';
import { updateCursor, broadcastToRoom } from '@/lib/collaboration/room-manager';
import { CursorPosition } from '@/lib/collaboration/types';

export async function POST(request: NextRequest) {
  try {
    const { caseId, cursor } = await request.json() as { caseId: string; cursor: CursorPosition };
    
    if (!caseId || !cursor) {
      return NextResponse.json({ error: 'Missing caseId or cursor' }, { status: 400 });
    }
    
    updateCursor(caseId, cursor);
    
    // Broadcast cursor to other users
    broadcastToRoom(caseId, { type: 'cursor', cursor }, cursor.userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cursor update error:', error);
    return NextResponse.json({ error: 'Failed to update cursor' }, { status: 500 });
  }
}
