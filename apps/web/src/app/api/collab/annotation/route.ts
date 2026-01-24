import { NextRequest, NextResponse } from 'next/server';
import { addAnnotation, removeAnnotation, broadcastToRoom } from '@/lib/collaboration/room-manager';
import { Annotation } from '@/lib/collaboration/types';

export async function POST(request: NextRequest) {
  try {
    const { caseId, annotation } = await request.json() as { caseId: string; annotation: Annotation };
    
    if (!caseId || !annotation) {
      return NextResponse.json({ error: 'Missing caseId or annotation' }, { status: 400 });
    }
    
    addAnnotation(caseId, annotation);
    
    // Broadcast to all users including sender (for confirmation)
    broadcastToRoom(caseId, { type: 'annotation_add', annotation });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add annotation error:', error);
    return NextResponse.json({ error: 'Failed to add annotation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { caseId, annotationId } = await request.json() as { caseId: string; annotationId: string };
    
    if (!caseId || !annotationId) {
      return NextResponse.json({ error: 'Missing caseId or annotationId' }, { status: 400 });
    }
    
    removeAnnotation(caseId, annotationId);
    
    // Broadcast to all users
    broadcastToRoom(caseId, { type: 'annotation_remove', annotationId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove annotation error:', error);
    return NextResponse.json({ error: 'Failed to remove annotation' }, { status: 500 });
  }
}
