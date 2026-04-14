/**
 * ClipBlock component - renders a single draggable, trimmable clip block.
 * HTML5 draggable for reordering clips between tracks or positions.
 * Renders TrimHandle on left and right edges for trimming.
 * Based on specs/001-chat-native-editor/spec.md (FR-006, FR-008)
 */

import { useCallback, useState, useRef } from 'react';
import { useEditorStore } from '../../store';
import type { ClipTrack, Timeline, TimelineTracks } from '../../types';
import { TrimHandle } from './TrimHandle';

/** Snap threshold in pixels for clip boundary snapping */
const SNAP_THRESHOLD_PX = 10;

/** Props for ClipBlock component */
interface ClipBlockProps {
  /** Track type this clip belongs to */
  trackType: keyof TimelineTracks;
  /** The clip data */
  clip: ClipTrack;
  /** Pixels per second scale factor */
  pixelsPerSecond: number;
  /** All clips in the current track (for boundary snapping) */
  allClipsInTrack: ClipTrack[];
}

/**
 * Calculate clip position and width in pixels from timeline_window.
 */
function getClipStyle(
  clip: ClipTrack,
  pixelsPerSecond: number
): React.CSSProperties {
  const startMs = clip.timeline_window.start;
  const endMs = clip.timeline_window.end;
  const startPx = (startMs / 1000) * pixelsPerSecond;
  const widthPx = ((endMs - startMs) / 1000) * pixelsPerSecond;

  return {
    position: 'absolute',
    left: `${startPx}px`,
    width: `${widthPx}px`,
    top: '4px',
    bottom: '4px',
  };
}

/**
 * Get clip label for display.
 */
function getClipLabel(clip: ClipTrack): string {
  if (clip.path) {
    return clip.path.split('/').pop() || clip.clip_id;
  }
  return clip.clip_id;
}

/**
 * Find nearest clip boundary for snap-to-edge behavior.
 * Returns the snap position in ms, or null if no nearby boundary.
 */
function findNearestSnapPosition(
  _dragStartMs: number,
  currentStartMs: number,
  allClips: ClipTrack[],
  currentClipId: string,
  pixelsPerSecond: number
): number | null {
  // Convert pixel threshold to ms threshold
  const snapThresholdMs = (SNAP_THRESHOLD_PX / pixelsPerSecond) * 1000;
  
  // Collect all boundaries from other clips (excluding current clip)
  const boundaries: number[] = [];
  for (const clip of allClips) {
    if (clip.clip_id === currentClipId) continue;
    boundaries.push(clip.timeline_window.start);
    boundaries.push(clip.timeline_window.end);
  }

  // Calculate the dragged position (currentStartMs is where we're dragging to)
  // Find nearest boundary
  let nearestBoundary: number | null = null;
  let minDistance = Infinity;

  for (const boundary of boundaries) {
    const distance = Math.abs(currentStartMs - boundary);
    if (distance < minDistance && distance < snapThresholdMs) {
      minDistance = distance;
      nearestBoundary = boundary;
    }
  }

  return nearestBoundary;
}

/**
 * Update a clip's position in the timeline.
 * Moves clip to new start position while preserving duration.
 */
function updateClipPosition(
  timeline: Timeline,
  trackType: 'video',
  clipId: string,
  newStartMs: number
): Timeline {
  const clips = [...timeline.tracks[trackType]] as ClipTrack[];
  const clipIndex = clips.findIndex((c) => c.clip_id === clipId);
  
  if (clipIndex === -1) return timeline;

  const clip = clips[clipIndex];
  const duration = clip.timeline_window.end - clip.timeline_window.start;

  // Create updated clip with new position
  const updatedClip: ClipTrack = {
    ...clip,
    timeline_window: {
      ...clip.timeline_window,
      start: newStartMs,
      end: newStartMs + duration,
    },
  };

  // Replace clip in array
  clips[clipIndex] = updatedClip;

  // Sort clips by start position
  clips.sort((a, b) => a.timeline_window.start - b.timeline_window.start);

  // Return updated timeline
  return {
    ...timeline,
    tracks: {
      ...timeline.tracks,
      [trackType]: clips,
    },
  };
}

/**
 * ClipBlock - renders a single clip with drag and trim capabilities.
 */
export function ClipBlock({
  trackType,
  clip,
  pixelsPerSecond,
  allClipsInTrack,
}: ClipBlockProps) {
  const timeline = useEditorStore((state) => state.timeline);
  const pushUndo = useEditorStore((state) => state.pushUndo);
  const setTimeline = useEditorStore((state) => state.setTimeline);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStartMs, setOriginalStartMs] = useState(0);

  const clipRef = useRef<HTMLDivElement>(null);

  /**
   * Handle drag start - record initial position.
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!timeline) return;

      // Store drag data for drop handler
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'clip-move',
        clipId: clip.clip_id,
        trackType,
        originalStartMs: clip.timeline_window.start,
      }));
      e.dataTransfer.effectAllowed = 'move';

      // Track drag state for visual feedback
      setIsDragging(true);
      setDragStartX(e.clientX);
      setOriginalStartMs(clip.timeline_window.start);
    },
    [clip.clip_id, clip.timeline_window.start, trackType, timeline]
  );

  /**
   * Handle drag end - compute new position with snapping.
   */
  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(false);

      if (!timeline || trackType !== 'video') return;

      // Calculate drag distance in pixels
      const dragDeltaPx = e.clientX - dragStartX;
      const dragDeltaMs = (dragDeltaPx / pixelsPerSecond) * 1000;

      // Calculate new position
      let newStartMs = originalStartMs + dragDeltaMs;
      newStartMs = Math.max(0, Math.round(newStartMs));

      // Check for snap-to-clip-boundary
      const snapPosition = findNearestSnapPosition(
        originalStartMs,
        newStartMs,
        allClipsInTrack,
        clip.clip_id,
        pixelsPerSecond
      );

      if (snapPosition !== null) {
        newStartMs = snapPosition;
      }

      // Only update if position changed
      if (newStartMs !== originalStartMs) {
        // Push current state to undo stack before mutation
        pushUndo(timeline);

        // Update timeline with new clip position
        const updatedTimeline = updateClipPosition(
          timeline,
          trackType,
          clip.clip_id,
          newStartMs
        );

        setTimeline(updatedTimeline);
      }
    },
    [
      clip.clip_id,
      dragStartX,
      originalStartMs,
      pixelsPerSecond,
      allClipsInTrack,
      timeline,
      trackType,
      pushUndo,
      setTimeline,
    ]
  );

  /**
   * Handle trim from TrimHandle component.
   * Called when left or right trim handle is dragged.
   */
  const handleTrim = useCallback(
    (side: 'left' | 'right', newTimeMs: number) => {
      if (!timeline || trackType !== 'video') return;

      const clips = [...timeline.tracks[trackType]] as ClipTrack[];
      const clipIndex = clips.findIndex((c) => c.clip_id === clip.clip_id);

      if (clipIndex === -1) return;

      const currentClip = clips[clipIndex];
      const updatedClip = { ...currentClip };

      if (side === 'left') {
        // Left trim: adjust start time
        updatedClip.timeline_window = {
          ...updatedClip.timeline_window,
          start: Math.min(newTimeMs, updatedClip.timeline_window.end - 100), // Minimum 100ms duration
        };
      } else {
        // Right trim: adjust end time
        updatedClip.timeline_window = {
          ...updatedClip.timeline_window,
          end: Math.max(newTimeMs, updatedClip.timeline_window.start + 100), // Minimum 100ms duration
        };
      }

      clips[clipIndex] = updatedClip;

      const updatedTimeline: Timeline = {
        ...timeline,
        tracks: {
          ...timeline.tracks,
          [trackType]: clips,
        },
      };

      setTimeline(updatedTimeline);
    },
    [clip.clip_id, timeline, trackType, setTimeline]
  );

  /**
   * Push undo snapshot when trim operation completes.
   */
  const handleTrimEnd = useCallback(() => {
    if (!timeline) return;
    pushUndo(timeline);
  }, [timeline, pushUndo]);

  const style = getClipStyle(clip, pixelsPerSecond);
  const label = getClipLabel(clip);

  // Determine clip background color based on kind
  const bgColor =
    clip.kind === 'video'
      ? 'bg-editor-accent'
      : 'bg-editor-accent-alt';

  return (
    <div
      ref={clipRef}
      className={`
        absolute top-1 bottom-1 ${bgColor} border border-editor-border rounded
        cursor-move flex items-center justify-between overflow-hidden
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        transition-opacity duration-150
      `}
      style={{
        left: style.left,
        width: style.width,
        top: style.top,
        bottom: style.bottom,
      }}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={label}
    >
      {/* Left trim handle */}
      {trackType === 'video' && (
        <TrimHandle
          side="left"
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          onTrim={handleTrim}
          onTrimEnd={handleTrimEnd}
          allClipsInTrack={allClipsInTrack}
        />
      )}

      {/* Clip label */}
      <span className="flex-1 text-xs text-editor-text truncate px-2 text-center">
        {label}
      </span>

      {/* Right trim handle */}
      {trackType === 'video' && (
        <TrimHandle
          side="right"
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          onTrim={handleTrim}
          onTrimEnd={handleTrimEnd}
          allClipsInTrack={allClipsInTrack}
        />
      )}
    </div>
  );
}

export default ClipBlock;
