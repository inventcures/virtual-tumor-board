/**
 * Collaboration Room Manager
 * Server-side state management for collaboration rooms
 */

import {
  CollaborationRoom,
  CollaborationUser,
  CursorPosition,
  Annotation,
  CollaborationMessage,
} from './types';

// In-memory room storage (in production, use Redis or similar)
const rooms = new Map<string, CollaborationRoom>();

// SSE subscribers per room
type MessageCallback = (message: CollaborationMessage) => void;
const roomSubscribers = new Map<string, Set<{ userId: string; callback: MessageCallback }>>();

// Cleanup stale cursors after 5 seconds
const CURSOR_TIMEOUT = 5000;

// Cleanup empty rooms after 30 minutes of inactivity
const ROOM_TTL_MS = 30 * 60 * 1000;
const roomLastActivity = new Map<string, number>();

function cleanupStaleRooms(): void {
  const now = Date.now();
  for (const [caseId, lastActivity] of roomLastActivity) {
    if (now - lastActivity > ROOM_TTL_MS) {
      const subscribers = roomSubscribers.get(caseId);
      if (!subscribers || subscribers.size === 0) {
        rooms.delete(caseId);
        roomSubscribers.delete(caseId);
        roomLastActivity.delete(caseId);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupStaleRooms, 5 * 60 * 1000);

export function getOrCreateRoom(caseId: string): CollaborationRoom {
  let room = rooms.get(caseId);
  if (!room) {
    room = {
      id: caseId,
      caseId,
      users: new Map(),
      cursors: new Map(),
      annotations: new Map(),
      leaderId: null,
      createdAt: Date.now(),
    };
    rooms.set(caseId, room);
  }
  return room;
}

export function addUserToRoom(caseId: string, user: CollaborationUser): CollaborationRoom {
  const room = getOrCreateRoom(caseId);
  roomLastActivity.set(caseId, Date.now());
  room.users.set(user.id, user);
  
  // First user becomes leader
  if (room.users.size === 1 || user.isLeader) {
    room.leaderId = user.id;
  }
  
  return room;
}

export function removeUserFromRoom(caseId: string, userId: string): CollaborationRoom | null {
  const room = rooms.get(caseId);
  if (!room) return null;
  
  room.users.delete(userId);
  room.cursors.delete(userId);
  
  // If leader left, assign new leader
  if (room.leaderId === userId) {
    const firstUser = room.users.values().next().value;
    room.leaderId = firstUser?.id || null;
  }
  
  // Clean up empty rooms
  if (room.users.size === 0) {
    rooms.delete(caseId);
    return null;
  }
  
  return room;
}

export function updateCursor(caseId: string, cursor: CursorPosition): void {
  const room = rooms.get(caseId);
  if (!room) return;

  roomLastActivity.set(caseId, Date.now());
  cursor.timestamp = Date.now();
  room.cursors.set(cursor.userId, cursor);
}

export function getCursors(caseId: string): CursorPosition[] {
  const room = rooms.get(caseId);
  if (!room) return [];
  
  const now = Date.now();
  const activeCursors: CursorPosition[] = [];
  
  room.cursors.forEach((cursor, id) => {
    if (now - cursor.timestamp < CURSOR_TIMEOUT) {
      activeCursors.push(cursor);
    } else {
      room.cursors.delete(id);
    }
  });
  
  return activeCursors;
}

export function addAnnotation(caseId: string, annotation: Annotation): void {
  const room = rooms.get(caseId);
  if (!room) return;
  room.annotations.set(annotation.id, annotation);
}

export function removeAnnotation(caseId: string, annotationId: string): void {
  const room = rooms.get(caseId);
  if (!room) return;
  room.annotations.delete(annotationId);
}

export function getAnnotations(caseId: string): Annotation[] {
  const room = rooms.get(caseId);
  if (!room) return [];
  return Array.from(room.annotations.values());
}

export function getUsers(caseId: string): CollaborationUser[] {
  const room = rooms.get(caseId);
  if (!room) return [];
  return Array.from(room.users.values());
}

export function setLeader(caseId: string, leaderId: string): void {
  const room = rooms.get(caseId);
  if (!room) return;
  room.leaderId = leaderId;
}

export function getLeader(caseId: string): string | null {
  const room = rooms.get(caseId);
  return room?.leaderId || null;
}

export function getRoomState(caseId: string): {
  users: CollaborationUser[];
  cursors: CursorPosition[];
  annotations: Annotation[];
  leaderId: string | null;
} | null {
  const room = rooms.get(caseId);
  if (!room) return null;
  
  return {
    users: Array.from(room.users.values()),
    cursors: getCursors(caseId),
    annotations: Array.from(room.annotations.values()),
    leaderId: room.leaderId,
  };
}

// SSE Subscription Management
export function subscribeToRoom(caseId: string, callback: MessageCallback, userId?: string): void {
  if (!roomSubscribers.has(caseId)) {
    roomSubscribers.set(caseId, new Set());
  }
  roomSubscribers.get(caseId)!.add({ userId: userId || '', callback });
}

export function unsubscribeFromRoom(caseId: string, callback: MessageCallback): void {
  const subscribers = roomSubscribers.get(caseId);
  if (subscribers) {
    subscribers.forEach(sub => {
      if (sub.callback === callback) {
        subscribers.delete(sub);
      }
    });
    if (subscribers.size === 0) {
      roomSubscribers.delete(caseId);
    }
  }
}

export function broadcastToRoom(caseId: string, message: CollaborationMessage, excludeUserId?: string): void {
  const subscribers = roomSubscribers.get(caseId);
  if (!subscribers) return;

  subscribers.forEach(sub => {
    if (excludeUserId && sub.userId === excludeUserId) return;
    try {
      sub.callback(message);
    } catch (error) {
      console.error('Failed to broadcast to subscriber:', error);
    }
  });
}
