"use client";

/**
 * React Hook for Collaboration
 * Client-side collaboration state management with SSE
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CollaborationUser,
  CursorPosition,
  Annotation,
  CollaborationMessage,
  getRandomColor,
} from './types';

interface UseCollaborationOptions {
  caseId: string;
  userId: string;
  userName: string;
  specialty: string;
  isLeader?: boolean;
}

interface CollaborationState {
  connected: boolean;
  users: CollaborationUser[];
  cursors: CursorPosition[];
  annotations: Annotation[];
  leaderId: string | null;
  following: string | null;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { caseId, userId, userName, specialty, isLeader = false } = options;
  
  const [state, setState] = useState<CollaborationState>({
    connected: false,
    users: [],
    cursors: [],
    annotations: [],
    leaderId: null,
    following: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const userColorRef = useRef(getRandomColor());
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to collaboration stream
  useEffect(() => {
    const user: CollaborationUser = {
      id: userId,
      name: userName,
      specialty,
      color: userColorRef.current,
      isLeader,
      joinedAt: Date.now(),
    };

    // Join the room
    fetch(`/api/collab/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, user }),
    }).then(() => {
      // Connect to SSE stream
      const eventSource = new EventSource(`/api/collab/stream?caseId=${caseId}&userId=${userId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState(prev => ({ ...prev, connected: true }));
      };

      eventSource.onmessage = (event) => {
        try {
          const message: CollaborationMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse collaboration message:', e);
        }
      };

      eventSource.onerror = () => {
        setState(prev => ({ ...prev, connected: false }));
      };
    });

    return () => {
      // Leave the room
      fetch(`/api/collab/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, userId }),
      });

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [caseId, userId, userName, specialty, isLeader]);

  const handleMessage = useCallback((message: CollaborationMessage) => {
    switch (message.type) {
      case 'users':
        setState(prev => ({ ...prev, users: message.users }));
        break;
      case 'cursors':
        setState(prev => ({ ...prev, cursors: message.cursors.filter(c => c.userId !== userId) }));
        break;
      case 'cursor':
        if (message.cursor.userId !== userId) {
          setState(prev => ({
            ...prev,
            cursors: [
              ...prev.cursors.filter(c => c.userId !== message.cursor.userId),
              message.cursor,
            ],
          }));
        }
        break;
      case 'annotations':
        setState(prev => ({ ...prev, annotations: message.annotations }));
        break;
      case 'annotation_add':
        setState(prev => ({
          ...prev,
          annotations: [...prev.annotations, message.annotation],
        }));
        break;
      case 'annotation_remove':
        setState(prev => ({
          ...prev,
          annotations: prev.annotations.filter(a => a.id !== message.annotationId),
        }));
        break;
      case 'leader_change':
        setState(prev => ({ ...prev, leaderId: message.leaderId }));
        break;
      case 'join':
        setState(prev => ({
          ...prev,
          users: [...prev.users.filter(u => u.id !== message.user.id), message.user],
        }));
        break;
      case 'leave':
        setState(prev => ({
          ...prev,
          users: prev.users.filter(u => u.id !== message.userId),
          cursors: prev.cursors.filter(c => c.userId !== message.userId),
        }));
        break;
    }
  }, [userId]);

  // Send cursor position (throttled)
  const sendCursor = useCallback((cursor: Omit<CursorPosition, 'userId' | 'timestamp'>) => {
    if (cursorThrottleRef.current) return;

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
    }, 50); // 20 FPS max

    fetch(`/api/collab/cursor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        cursor: { ...cursor, userId, timestamp: Date.now() },
      }),
    });
  }, [caseId, userId]);

  // Add annotation
  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'userId' | 'createdAt' | 'color'>) => {
    const fullAnnotation: Annotation = {
      ...annotation,
      id: `${userId}-${Date.now()}`,
      userId,
      color: userColorRef.current,
      createdAt: Date.now(),
    };

    fetch(`/api/collab/annotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, annotation: fullAnnotation }),
    });
  }, [caseId, userId]);

  // Remove annotation
  const removeAnnotation = useCallback((annotationId: string) => {
    fetch(`/api/collab/annotation`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, annotationId }),
    });
  }, [caseId]);

  // Set following user
  const setFollowing = useCallback((targetUserId: string | null) => {
    setState(prev => ({ ...prev, following: targetUserId }));
  }, []);

  // Become leader
  const becomeLeader = useCallback(() => {
    fetch(`/api/collab/leader`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, leaderId: userId }),
    });
  }, [caseId, userId]);

  return {
    ...state,
    userColor: userColorRef.current,
    sendCursor,
    addAnnotation,
    removeAnnotation,
    setFollowing,
    becomeLeader,
  };
}
