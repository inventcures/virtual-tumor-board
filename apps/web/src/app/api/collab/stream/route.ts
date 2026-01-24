import { NextRequest } from 'next/server';
import { getRoomState, subscribeToRoom, unsubscribeFromRoom } from '@/lib/collaboration/room-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');
  const userId = searchParams.get('userId');

  if (!caseId || !userId) {
    return new Response('Missing caseId or userId', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const state = getRoomState(caseId);
      if (state) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'users', users: state.users })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'cursors', cursors: state.cursors })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'annotations', annotations: state.annotations })}\n\n`));
        if (state.leaderId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'leader_change', leaderId: state.leaderId })}\n\n`));
        }
      }

      // Subscribe to room updates
      const callback = (message: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch (error) {
          // Stream closed
          unsubscribeFromRoom(caseId, callback);
        }
      };

      subscribeToRoom(caseId, callback);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribeFromRoom(caseId, callback);
        }
      }, 30000);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribeFromRoom(caseId, callback);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
