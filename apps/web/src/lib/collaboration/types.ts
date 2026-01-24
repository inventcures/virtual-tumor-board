/**
 * Collaboration Types for Real-Time Imaging Review
 */

export interface CollaborationUser {
  id: string;
  name: string;
  specialty: string;
  color: string;
  isLeader: boolean;
  joinedAt: number;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  axis: 'axial' | 'sagittal' | 'coronal';
  slice: number;
  timestamp: number;
}

export interface Annotation {
  id: string;
  userId: string;
  type: 'point' | 'line' | 'circle' | 'rectangle' | 'text' | 'arrow';
  axis: 'axial' | 'sagittal' | 'coronal';
  slice: number;
  data: AnnotationData;
  color: string;
  createdAt: number;
}

export type AnnotationData =
  | { type: 'point'; x: number; y: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; radius: number }
  | { type: 'rectangle'; x: number; y: number; width: number; height: number }
  | { type: 'text'; x: number; y: number; text: string }
  | { type: 'arrow'; x1: number; y1: number; x2: number; y2: number };

export interface ViewState {
  axis: 'axial' | 'sagittal' | 'coronal';
  slice: number;
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  panX: number;
  panY: number;
}

// WebSocket Message Types
export type CollaborationMessage =
  | { type: 'join'; user: CollaborationUser }
  | { type: 'leave'; userId: string }
  | { type: 'users'; users: CollaborationUser[] }
  | { type: 'cursor'; cursor: CursorPosition }
  | { type: 'cursors'; cursors: CursorPosition[] }
  | { type: 'view_change'; userId: string; view: ViewState }
  | { type: 'annotation_add'; annotation: Annotation }
  | { type: 'annotation_remove'; annotationId: string }
  | { type: 'annotations'; annotations: Annotation[] }
  | { type: 'follow'; leaderId: string | null }
  | { type: 'leader_change'; leaderId: string }
  | { type: 'ping' }
  | { type: 'pong' };

// Collaboration Room State
export interface CollaborationRoom {
  id: string;
  caseId: string;
  users: Map<string, CollaborationUser>;
  cursors: Map<string, CursorPosition>;
  annotations: Map<string, Annotation>;
  leaderId: string | null;
  createdAt: number;
}

// User Colors for collaboration
export const USER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}
