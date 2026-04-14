/**
 * Playhead component - vertical line at current playhead position.
 * Draggable to scrub timeline; uses pointer capture for reliable drag events.
 * Position state lives in TimelineEditor parent component.
 * Based on specs/001-chat-native-editor/spec.md (FR-007)
 */

import { useCallback, useRef, useState } from 'react';

/** Props for Playhead component */
interface PlayheadProps {
  /** Current playhead position in milliseconds */
  playheadMs: number;
  /** Pixels per second scale factor */
  pixelsPerSecond: number;
  /** Timeline duration in milliseconds (for boundary constraints) */
  durationMs: number;
  /** Callback when playhead position changes during drag */
  onPlayheadChange: (newPlayheadMs: number) => void;
}

/**
 * Playhead - draggable vertical line for scrubbing timeline position.
 * Uses pointer capture for reliable event handling during drag.
 */
export function Playhead({
  playheadMs,
  pixelsPerSecond,
  durationMs,
  onPlayheadChange,
}: PlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [originalMs, setOriginalMs] = useState(0);

  /**
   * Handle pointer down on playhead - start scrub operation.
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer for reliable move/up events
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setIsDragging(true);
      setStartX(e.clientX);
      setOriginalMs(playheadMs);
    },
    [playheadMs]
  );

  /**
   * Handle pointer move - update playhead position with constraints.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaMs = (deltaX / pixelsPerSecond) * 1000;
      const newPlayheadMs = Math.round(originalMs + deltaMs);

      // Constrain to timeline bounds [0, durationMs]
      const constrainedMs = Math.max(0, Math.min(newPlayheadMs, durationMs));

      onPlayheadChange(constrainedMs);
    },
    [isDragging, startX, originalMs, pixelsPerSecond, durationMs, onPlayheadChange]
  );

  /**
   * Handle pointer up - end scrub operation.
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      setIsDragging(false);
    },
    [isDragging]
  );

  /**
   * Handle pointer cancel - same as pointer up.
   */
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      setIsDragging(false);
    },
    [isDragging]
  );

  // Calculate playhead position in pixels
  const playheadPx = (playheadMs / 1000) * pixelsPerSecond;

  return (
    <div
      ref={playheadRef}
      className={`
        absolute top-0 bottom-0 w-0.5 cursor-ew-resize z-20
        ${isDragging ? 'bg-red-400' : 'bg-red-500'}
      `}
      style={{ left: `${playheadPx}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      title="Drag to scrub"
    >
      {/* Playhead handle (top diamond) */}
      <div
        className={`
          absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45
          ${isDragging ? 'bg-red-400' : 'bg-red-500'}
          transition-colors duration-100
        `}
      />

      {/* Drag indicator line extension (visible during drag) */}
      {isDragging && (
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-red-300 opacity-50" />
      )}
    </div>
  );
}

export default Playhead;
