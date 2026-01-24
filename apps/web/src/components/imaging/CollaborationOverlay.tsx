"use client";

/**
 * Collaboration Overlay Component
 * Displays user presence, cursors, and annotations for real-time collaboration
 */

import { CollaborationUser, CursorPosition, Annotation } from "@/lib/collaboration/types";
import { Users, Crown, Circle, Eye, EyeOff } from "lucide-react";

interface CollaborationOverlayProps {
  users: CollaborationUser[];
  cursors: CursorPosition[];
  annotations: Annotation[];
  leaderId: string | null;
  currentUserId: string;
  following: string | null;
  onFollowUser: (userId: string | null) => void;
  onBecomeLeader: () => void;
  connected: boolean;
}

export function CollaborationOverlay({
  users,
  cursors,
  annotations,
  leaderId,
  currentUserId,
  following,
  onFollowUser,
  onBecomeLeader,
  connected,
}: CollaborationOverlayProps) {
  const currentUser = users.find((u) => u.id === currentUserId);
  const otherUsers = users.filter((u) => u.id !== currentUserId);
  const leader = users.find((u) => u.id === leaderId);

  return (
    <div className="flex items-center gap-4">
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span className="text-xs text-slate-400">
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>

      {/* Users Online */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-400" />
        <div className="flex -space-x-2">
          {users.map((user) => (
            <UserAvatar
              key={user.id}
              user={user}
              isLeader={user.id === leaderId}
              isCurrent={user.id === currentUserId}
              isFollowed={user.id === following}
              onClick={() => {
                if (user.id !== currentUserId) {
                  onFollowUser(following === user.id ? null : user.id);
                }
              }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">{users.length} online</span>
      </div>

      {/* Leader Info */}
      {leader && (
        <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded text-xs">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300">{leader.name}</span>
          <span className="text-slate-500">presenting</span>
        </div>
      )}

      {/* Become Leader Button (if not already leader) */}
      {currentUserId !== leaderId && (
        <button
          onClick={onBecomeLeader}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
          title="Take control and become the presenter"
        >
          <Crown className="w-3.5 h-3.5" />
          Present
        </button>
      )}

      {/* Follow Status */}
      {following && (
        <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded text-xs">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-300">
            Following {users.find((u) => u.id === following)?.name}
          </span>
          <button
            onClick={() => onFollowUser(null)}
            className="text-slate-500 hover:text-white"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface UserAvatarProps {
  user: CollaborationUser;
  isLeader: boolean;
  isCurrent: boolean;
  isFollowed: boolean;
  onClick: () => void;
}

function UserAvatar({ user, isLeader, isCurrent, isFollowed, onClick }: UserAvatarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-transform hover:scale-110 hover:z-10 ${
        isCurrent ? "border-white" : "border-slate-800"
      } ${isFollowed ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900" : ""}`}
      style={{ backgroundColor: user.color }}
      title={`${user.name} - ${user.specialty}${isLeader ? " (Presenting)" : ""}${isCurrent ? " (You)" : ""}`}
    >
      {initials}
      {isLeader && (
        <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-400" />
      )}
      {isCurrent && (
        <Circle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 text-green-400 fill-green-400" />
      )}
    </button>
  );
}

/**
 * Annotation Layer - renders annotations on the viewport
 */
interface AnnotationLayerProps {
  annotations: Annotation[];
  currentAxis: "axial" | "sagittal" | "coronal";
  currentSlice: number;
  viewWidth: number;
  viewHeight: number;
  onRemoveAnnotation?: (id: string) => void;
  currentUserId: string;
}

export function AnnotationLayer({
  annotations,
  currentAxis,
  currentSlice,
  viewWidth,
  viewHeight,
  onRemoveAnnotation,
  currentUserId,
}: AnnotationLayerProps) {
  // Filter annotations for current view
  const visibleAnnotations = annotations.filter(
    (a) => a.axis === currentAxis && a.slice === currentSlice
  );

  if (visibleAnnotations.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="none"
    >
      {visibleAnnotations.map((annotation) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          canRemove={annotation.userId === currentUserId}
          onRemove={() => onRemoveAnnotation?.(annotation.id)}
        />
      ))}
    </svg>
  );
}

interface AnnotationShapeProps {
  annotation: Annotation;
  canRemove: boolean;
  onRemove: () => void;
}

function AnnotationShape({ annotation, canRemove, onRemove }: AnnotationShapeProps) {
  const { data, color } = annotation;

  switch (data.type) {
    case "point":
      return (
        <g className={canRemove ? "cursor-pointer pointer-events-auto" : ""} onClick={onRemove}>
          <circle cx={data.x} cy={data.y} r={5} fill={color} opacity={0.8} />
          <circle cx={data.x} cy={data.y} r={8} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
        </g>
      );

    case "line":
      return (
        <line
          x1={data.x1}
          y1={data.y1}
          x2={data.x2}
          y2={data.y2}
          stroke={color}
          strokeWidth={2}
          opacity={0.8}
          className={canRemove ? "cursor-pointer pointer-events-auto" : ""}
          onClick={onRemove}
        />
      );

    case "arrow":
      const angle = Math.atan2(data.y2 - data.y1, data.x2 - data.x1);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      return (
        <g className={canRemove ? "cursor-pointer pointer-events-auto" : ""} onClick={onRemove}>
          <line
            x1={data.x1}
            y1={data.y1}
            x2={data.x2}
            y2={data.y2}
            stroke={color}
            strokeWidth={2}
            opacity={0.8}
          />
          <polygon
            points={`
              ${data.x2},${data.y2}
              ${data.x2 - arrowLength * Math.cos(angle - arrowAngle)},${data.y2 - arrowLength * Math.sin(angle - arrowAngle)}
              ${data.x2 - arrowLength * Math.cos(angle + arrowAngle)},${data.y2 - arrowLength * Math.sin(angle + arrowAngle)}
            `}
            fill={color}
            opacity={0.8}
          />
        </g>
      );

    case "circle":
      return (
        <circle
          cx={data.cx}
          cy={data.cy}
          r={data.radius}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.8}
          className={canRemove ? "cursor-pointer pointer-events-auto" : ""}
          onClick={onRemove}
        />
      );

    case "rectangle":
      return (
        <rect
          x={data.x}
          y={data.y}
          width={data.width}
          height={data.height}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.8}
          className={canRemove ? "cursor-pointer pointer-events-auto" : ""}
          onClick={onRemove}
        />
      );

    case "text":
      return (
        <text
          x={data.x}
          y={data.y}
          fill={color}
          fontSize={14}
          fontWeight="bold"
          className={canRemove ? "cursor-pointer pointer-events-auto" : ""}
          onClick={onRemove}
        >
          {data.text}
        </text>
      );

    default:
      return null;
  }
}

/**
 * Cursor Layer - renders other users' cursors
 */
interface CursorLayerProps {
  cursors: CursorPosition[];
  users: CollaborationUser[];
  currentAxis: "axial" | "sagittal" | "coronal";
  currentSlice: number;
  viewWidth: number;
  viewHeight: number;
}

export function CursorLayer({
  cursors,
  users,
  currentAxis,
  currentSlice,
  viewWidth,
  viewHeight,
}: CursorLayerProps) {
  // Filter cursors for current view (show cursors within 5 slices)
  const visibleCursors = cursors.filter(
    (c) => c.axis === currentAxis && Math.abs(c.slice - currentSlice) <= 5
  );

  if (visibleCursors.length === 0) return null;

  return (
    <>
      {visibleCursors.map((cursor) => {
        const user = users.find((u) => u.id === cursor.userId);
        if (!user) return null;

        const opacity = Math.max(0.3, 1 - Math.abs(cursor.slice - currentSlice) * 0.15);

        return (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none transition-all duration-75"
            style={{
              left: `${(cursor.x / viewWidth) * 100}%`,
              top: `${(cursor.y / viewHeight) * 100}%`,
              opacity,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Cursor dot */}
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: user.color, backgroundColor: `${user.color}40` }}
            />
            {/* User label */}
            <div
              className="absolute left-5 top-0 px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
              style={{ backgroundColor: user.color, color: "white" }}
            >
              {user.name.split(" ")[1] || user.name}
            </div>
          </div>
        );
      })}
    </>
  );
}
