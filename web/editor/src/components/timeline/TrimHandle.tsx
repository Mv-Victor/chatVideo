/**
 * TrimHandle component - draggable handle for trimming clip in/out points.
 * Renders left or right edge handle using pointer capture for reliable drag events.
 * Updates clip timeline_window.start (left) or timeline_window.end (right) with constraints.
 * Pushes undo snapshot to timelineSlice on pointer up.
 * Extends timeline duration if clip dragged past current end.
 * Based on specs/001-chat-native-editor/spec.md (FR-006, FR-008)
 */

import { useCallback, useRef, useState } from 'react';
import type { ClipTrack } from '../../types';

/** Minimum clip duration in milliseconds */
const MIN_CLIP_DURATION_MS = 100;

/** Props for TrimHandle component */
interface TrimHandleProps {
  /** Which side of the clip this handle is on */
  side: 'left' | 'right';
  /** The clip being trimmed */
  clip: ClipTrack;
  /** Pixels per second scale factor */
  pixelsPerSecond: number;
  /** Callback to update clip time during trim */
  onTrim: (side: 'left' | 'right', newTimeMs: number) => void;
  /** Callback when trim operation completes (pointer up) */
  onTrimEnd: () => void;
  /** All clips in the current track (for boundary constraints) */
  allClipsInTrack?: ClipTrack[];
}

/**
 * Find the maximum valid trim position for a clip.
 * For left trim: cannot go past end - MIN_CLIP_DURATION_MS.
 * For right trim: cannot go before start + MIN_CLIP_DURATION_MS.
 * Also checks against other clips in the track for collision constraints.
 */
function getMaxValidTrimPosition(
  clip: ClipTrack,
  side: 'left' | 'right',
  allClips: ClipTrack[]
): number {
  if (side === 'left') {
    // Left handle: maximum position is end - MIN_CLIP_DURATION_MS
    const maxFromDuration = clip.timeline_window.end - MIN_CLIP_DURATION_MS;
    
    // Check for clips to the left
    const clipsBefore = allClips.filter(
      c => c.clip_id !== clip.clip_id && c.timeline_window.end <= clip.timeline_window.start
    );
    
    // Find the nearest clip end before this clip
    let maxFromCollision = 0;
    for (const c of clipsBefore) {
      if (c.timeline_window.end > maxFromCollision && c.timeline_window.end <= clip.timeline_window.start) {
        maxFromCollision = c.timeline_window.end;
      }
    }
    
    // Return the more restrictive constraint
    return Math.max(maxFromCollision, maxFromDuration);
  } else {
    // Right handle: check for clips to the right
    const clipsAfter = allClips.filter(
      c => c.clip_id !== clip.clip_id && c.timeline_window.start >= clip.timeline_window.end
    );
    
    // Find the nearest clip start after this clip (Infinity if none)
    let minFromCollision = Infinity;
    for (const c of clipsAfter) {
      if (c.timeline_window.start < minFromCollision && c.timeline_window.start >= clip.timeline_window.end) {
        minFromCollision = c.timeline_window.start;
      }
    }
    
    // Return the constraint (allow extending past end)
    return minFromCollision === Infinity ? Infinity : minFromCollision;
  }
}

/**
 * Find the minimum valid trim position for a clip.
 * Left handle: cannot go before 0.
 * Right handle: cannot go before start + MIN_CLIP_DURATION_MS.
 */
function getMinValidTrimPosition(
  clip: ClipTrack,
  side: 'left' | 'right'
): number {
  if (side === 'left') {
    // Left handle: minimum position is 0
    return 0;
  } else {
    // Right handle: minimum position is start + MIN_CLIP_DURATION_MS
    return clip.timeline_window.start + MIN_CLIP_DURATION_MS;
  }
}

/**
 * TrimHandle - draggable handle for trimming clip boundaries.
 * Uses pointer capture for reliable event handling during drag.
 */
export function TrimHandle({
  side,
  clip,
  pixelsPerSecond,
  onTrim,
  onTrimEnd,
  allClipsInTrack = [],
}: TrimHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const [startX, setStartX] = useState(0);
  const [originalTime, setOriginalTime] = useState(0);

  /**
   * Handle pointer down on trim handle - start trim operation.
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer for reliable move/up events
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setIsTrimming(true);
      setStartX(e.clientX);
      setOriginalTime(
        side === 'left'
          ? clip.timeline_window.start
          : clip.timeline_window.end
      );
    },
    [clip.timeline_window, side]
  );

  /**
   * Handle pointer move - update trim position with constraints.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isTrimming) return;

      const deltaX = e.clientX - startX;
      const deltaMs = (deltaX / pixelsPerSecond) * 1000;
      const newTimeMs = Math.round(originalTime + deltaMs);

      // Get valid range constraints
      const minTime = getMinValidTrimPosition(clip, side);
      const maxTime = getMaxValidTrimPosition(clip, side, allClipsInTrack);

      // Apply constraints (allow extending past timeline end for right handle)
      let constrainedTimeMs: number;
      if (side === 'left') {
        // Left handle: clamp between min and max
        constrainedTimeMs = Math.max(minTime, Math.min(maxTime, newTimeMs));
      } else {
        // Right handle: only apply min constraint (allow extending past timeline end)
        constrainedTimeMs = Math.max(minTime, newTimeMs);
      }

      // Ensure we're still respecting MIN_CLIP_DURATION_MS
      if (side === 'left') {
        // Don't let start go past end - MIN_CLIP_DURATION_MS
        const maxStart = clip.timeline_window.end - MIN_CLIP_DURATION_MS;
        constrainedTimeMs = Math.min(constrainedTimeMs, maxStart);
      } else {
        // Don't let end go before start + MIN_CLIP_DURATION_MS
        const minEnd = clip.timeline_window.start + MIN_CLIP_DURATION_MS;
        constrainedTimeMs = Math.max(constrainedTimeMs, minEnd);
      }

      onTrim(side, constrainedTimeMs);
    },
    [
      isTrimming,
      startX,
      originalTime,
      pixelsPerSecond,
      clip,
      side,
      allClipsInTrack,
      onTrim,
    ]
  );

  /**
   * Handle pointer up - end trim operation and push undo snapshot.
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isTrimming) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      setIsTrimming(false);
      onTrimEnd();
    },
    [isTrimming, onTrimEnd]
  );

  /**
   * Handle pointer cancel - same as pointer up.
   */
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!isTrimming) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      setIsTrimming(false);
      onTrimEnd();
    },
    [isTrimming, onTrimEnd]
  );

  return (
    <div
      ref={handleRef}
      className={`
        absolute top-0 bottom-0 w-2 cursor-ew-resize
        transition-colors duration-100
        ${isTrimming 
          ? 'bg-editor-text' 
          : 'bg-editor-border hover:bg-editor-text'
        }
        ${side === 'left' ? 'left-0 rounded-l' : 'right-0 rounded-r'}
        group
      `}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      title={side === 'left' ? 'Trim start' : 'Trim end'}
    >
      {/* Visual indicator on hover */}
      <div className={`
        absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1
        bg-white opacity-0 group-hover:opacity-50 transition-opacity
        ${isTrimming ? 'opacity-50' : ''}
      `} />
    </div>
  );
}

export default TrimHandle;
