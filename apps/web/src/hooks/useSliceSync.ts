/**
 * useSliceSync Hook
 * 
 * Provides synchronized slice navigation across multiple imaging timepoints.
 * All panels stay anatomically aligned when user scrolls in any panel.
 * 
 * Adapted from MiraViewer architecture.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ImagingTimepoint, AlignmentResult } from '@/types/longitudinal-imaging';

interface UseSliceSyncOptions {
  timepoints: ImagingTimepoint[];
  referenceTimepointId?: string;
  alignmentResults?: Map<string, AlignmentResult>;
}

interface UseSliceSyncReturn {
  // Current slice state
  sliceProgress: number;           // 0.0 - 1.0 normalized position
  absoluteSlice: number;           // Absolute slice number for reference timepoint
  
  // Actions
  setSliceProgress: (progress: number) => void;
  incrementSlice: (delta: number) => void;
  goToSlice: (sliceNumber: number, timepointId?: string) => void;
  
  // Per-timepoint slice calculation
  getSliceForTimepoint: (timepointId: string) => number;
  getTotalSlicesForTimepoint: (timepointId: string) => number;
  
  // Keyboard navigation
  handleKeyDown: (event: KeyboardEvent) => void;
}

export function useSliceSync({
  timepoints,
  referenceTimepointId,
  alignmentResults = new Map(),
}: UseSliceSyncOptions): UseSliceSyncReturn {
  
  // Use normalized progress (0.0 - 1.0) for cross-timepoint synchronization
  const [sliceProgress, setSliceProgressState] = useState(0.5);
  
  // Determine reference timepoint (default to baseline/first)
  const referenceTimepoint = useMemo(() => {
    if (referenceTimepointId) {
      return timepoints.find(t => t.id === referenceTimepointId);
    }
    return timepoints.find(t => t.isBaseline) || timepoints[0];
  }, [timepoints, referenceTimepointId]);

  // Get total slices for reference
  const referenceTotalSlices = useMemo(() => 
    referenceTimepoint?.totalSlices || 100,
    [referenceTimepoint]
  );

  // Calculate absolute slice number for reference timepoint
  const absoluteSlice = useMemo(() => 
    Math.round(sliceProgress * (referenceTotalSlices - 1)),
    [sliceProgress, referenceTotalSlices]
  );

  // Set slice progress (clamped to 0-1)
  const setSliceProgress = useCallback((progress: number) => {
    setSliceProgressState(Math.max(0, Math.min(1, progress)));
  }, []);

  // Increment/decrement slice
  const incrementSlice = useCallback((delta: number) => {
    setSliceProgressState(prev => {
      const newSlice = Math.round(prev * (referenceTotalSlices - 1)) + delta;
      const clamped = Math.max(0, Math.min(referenceTotalSlices - 1, newSlice));
      return clamped / (referenceTotalSlices - 1);
    });
  }, [referenceTotalSlices]);

  // Go to specific slice number
  const goToSlice = useCallback((sliceNumber: number, timepointId?: string) => {
    const targetTimepoint = timepointId 
      ? timepoints.find(t => t.id === timepointId)
      : referenceTimepoint;
    
    if (!targetTimepoint) return;
    
    const totalSlices = targetTimepoint.totalSlices || 100;
    const clamped = Math.max(0, Math.min(totalSlices - 1, sliceNumber));
    
    // Convert to normalized progress
    // If different timepoint, need to account for alignment offset
    if (timepointId && timepointId !== referenceTimepoint?.id) {
      const alignment = alignmentResults.get(timepointId);
      const offset = alignment?.sliceOffset || 0;
      const adjustedSlice = clamped - offset;
      
      // Convert to reference timepoint scale
      const referenceSlice = (adjustedSlice / totalSlices) * referenceTotalSlices;
      setSliceProgressState(referenceSlice / (referenceTotalSlices - 1));
    } else {
      setSliceProgressState(clamped / (totalSlices - 1));
    }
  }, [timepoints, referenceTimepoint, alignmentResults, referenceTotalSlices]);

  // Get slice number for a specific timepoint (accounts for alignment)
  const getSliceForTimepoint = useCallback((timepointId: string): number => {
    const timepoint = timepoints.find(t => t.id === timepointId);
    if (!timepoint) return 0;
    
    const totalSlices = timepoint.totalSlices || 100;
    const alignment = alignmentResults.get(timepointId);
    const sliceOffset = alignment?.sliceOffset || 0;
    
    // Calculate slice based on normalized progress + alignment offset
    const baseSlice = Math.round(sliceProgress * (totalSlices - 1));
    const adjustedSlice = baseSlice + sliceOffset;
    
    // Clamp to valid range
    return Math.max(0, Math.min(totalSlices - 1, adjustedSlice));
  }, [timepoints, sliceProgress, alignmentResults]);

  // Get total slices for a timepoint
  const getTotalSlicesForTimepoint = useCallback((timepointId: string): number => {
    const timepoint = timepoints.find(t => t.id === timepointId);
    return timepoint?.totalSlices || 100;
  }, [timepoints]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        event.preventDefault();
        incrementSlice(-1);
        break;
      case 'ArrowDown':
      case 's':
        event.preventDefault();
        incrementSlice(1);
        break;
      case 'PageUp':
        event.preventDefault();
        incrementSlice(-10);
        break;
      case 'PageDown':
        event.preventDefault();
        incrementSlice(10);
        break;
      case 'Home':
        event.preventDefault();
        setSliceProgress(0);
        break;
      case 'End':
        event.preventDefault();
        setSliceProgress(1);
        break;
    }
  }, [incrementSlice, setSliceProgress]);

  return {
    sliceProgress,
    absoluteSlice,
    setSliceProgress,
    incrementSlice,
    goToSlice,
    getSliceForTimepoint,
    getTotalSlicesForTimepoint,
    handleKeyDown,
  };
}

// ============================================================================
// Scroll Wheel Handler Hook
// ============================================================================

interface UseSliceScrollOptions {
  onSliceChange: (delta: number) => void;
  sensitivity?: number;
  enabled?: boolean;
}

export function useSliceScroll({
  onSliceChange,
  sensitivity = 1,
  enabled = true,
}: UseSliceScrollOptions) {
  
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!enabled) return;
    
    event.preventDefault();
    
    // Normalize scroll delta across browsers
    const delta = Math.sign(event.deltaY) * sensitivity;
    onSliceChange(delta);
  }, [enabled, sensitivity, onSliceChange]);

  // Return handler for attaching to elements
  return { handleWheel };
}

// ============================================================================
// Playback Hook for Animation
// ============================================================================

interface UseSlicePlaybackOptions {
  totalSlices: number;
  speed?: number;           // ms between frames
  loop?: boolean;
  onSliceChange: (slice: number) => void;
}

interface UseSlicePlaybackReturn {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: number) => void;
}

export function useSlicePlayback({
  totalSlices,
  speed = 100,
  loop = true,
  onSliceChange,
}: UseSlicePlaybackOptions): UseSlicePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);
  const [currentSlice, setCurrentSlice] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlice(prev => {
        const next = prev + 1;
        if (next >= totalSlices) {
          if (loop) {
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return next;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalSlices, loop]);

  // Notify parent of slice changes
  useEffect(() => {
    if (isPlaying) {
      onSliceChange(currentSlice);
    }
  }, [currentSlice, isPlaying, onSliceChange]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);
  const setSpeed = useCallback((newSpeed: number) => setPlaybackSpeed(newSpeed), []);

  return {
    isPlaying,
    play,
    pause,
    toggle,
    setSpeed,
  };
}
