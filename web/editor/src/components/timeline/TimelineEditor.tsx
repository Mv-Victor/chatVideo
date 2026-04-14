/**
 * TimelineEditor container component - custom multi-track timeline.
 * Renders timeline ruler, four track rows (V1/SUB/A1/A2) scrollable horizontally,
 * manages playhead position state, handles keyboard shortcuts for undo/redo.
 * Based on specs/001-chat-native-editor/spec.md (FR-006, FR-008)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store';
import type { TimelineTracks } from '../../types';
import { getTimelineDuration, formatTime } from '../../types';
import { TrackRow } from './TrackRow';

/** Track row definitions - fixed order */
const TRACKS = [
  { id: 'V1', label: 'V1', trackType: 'video' as const },
  { id: 'SUB', label: 'SUB', trackType: 'subtitles' as const },
  { id: 'A1', label: 'A1', trackType: 'voiceover' as const },
  { id: 'A2', label: 'A2', trackType: 'bgm' as const },
];

/** Minimum pixels per second for zoom */
const MIN_PPS = 10;
/** Maximum pixels per second for zoom */
const MAX_PPS = 200;
/** Default pixels per second */
const DEFAULT_PPS = 50;

/** Ruler tick interval in seconds (auto-adjusted based on zoom) */
function getTickInterval(pixelsPerSecond: number): number {
  if (pixelsPerSecond >= 100) return 1; // 1 second ticks
  if (pixelsPerSecond >= 50) return 2; // 2 second ticks
  if (pixelsPerSecond >= 25) return 5; // 5 second ticks
  if (pixelsPerSecond >= 10) return 10; // 10 second ticks
  return 30; // 30 second ticks
}

/**
 * TimelineEditor - main timeline container component.
 * Manages playhead state and pixelsPerSecond scale.
 */
export function TimelineEditor() {
  const timeline = useEditorStore((state) => state.timeline);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  // Playhead position in milliseconds
  const [playheadMs, setPlayheadMs] = useState(0);
  // Pixels per second scale (zoom level)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(DEFAULT_PPS);

  // Container ref for width measurement
  const containerRef = useRef<HTMLDivElement>(null);
  // Ruler ref for click handling
  const rulerRef = useRef<HTMLDivElement>(null);

  // Calculate total duration in milliseconds
  const durationMs = timeline ? getTimelineDuration(timeline) : 0;
  const durationSec = durationMs / 1000;

  // Minimum timeline duration (at least 10 seconds for empty timelines)
  const displayDurationSec = Math.max(durationSec, 10);

  // Timeline total width in pixels
  const timelineWidthPx = displayDurationSec * pixelsPerSecond;

  /**
   * Handle keyboard shortcuts for undo/redo
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  /**
   * Handle click on ruler to set playhead position
   */
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + rulerRef.current.scrollLeft;
    const clickMs = Math.round((clickX / pixelsPerSecond) * 1000);

    // Clamp to timeline duration
    const clampedMs = Math.max(0, Math.min(clickMs, durationMs));
    setPlayheadMs(clampedMs);
  }, [pixelsPerSecond, durationMs]);

  /**
   * Handle mouse wheel for horizontal scroll and zoom
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Zoom with Ctrl/Cmd + wheel
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setPixelsPerSecond(prev => 
        Math.max(MIN_PPS, Math.min(MAX_PPS, prev + delta))
      );
    }
  }, []);

  /**
   * Handle clip drop events from TrackRow components
   * Placeholder for drag-and-drop implementation (T036)
   */
  const handleClipDrop = useCallback((
    _e: React.DragEvent,
    trackType: keyof TimelineTracks,
    dropMs: number
  ) => {
    // TODO: Implement in T036 (drag-from-library-to-timeline)
    // This will handle creating new clips when assets are dropped from media library
    console.log('Clip drop on track:', trackType, 'at', dropMs, 'ms');
  }, []);

  /**
   * Render timeline ruler with time ticks
   */
  function renderRuler() {
    const tickInterval = getTickInterval(pixelsPerSecond);
    const ticks: JSX.Element[] = [];

    for (let sec = 0; sec <= displayDurationSec; sec += tickInterval) {
      const xPx = sec * pixelsPerSecond;
      const isMajor = sec % (tickInterval * 5) === 0;

      ticks.push(
        <div
          key={sec}
          className={`absolute top-0 h-full ${isMajor ? 'border-l-2 border-editor-text' : 'border-l border-editor-border'}`}
          style={{ left: `${xPx}px` }}
        >
          {isMajor && (
            <span className="absolute top-1 left-1 text-xs text-editor-text">
              {formatTime(sec * 1000)}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        ref={rulerRef}
        className="relative h-8 bg-editor-surface border-b border-editor-border overflow-x-auto cursor-pointer"
        style={{ width: '100%' }}
        onClick={handleRulerClick}
      >
        <div
          className="relative h-full"
          style={{ width: `${timelineWidthPx}px`, minWidth: '100%' }}
        >
          {ticks}
        </div>
      </div>
    );
  }

  /**
   * Render a single track row using TrackRow component
   */
  function renderTrackRow(trackId: string, trackType: keyof TimelineTracks) {
    const clips = timeline?.tracks[trackType] || [];

    return (
      <TrackRow
        key={trackId}
        trackId={trackId}
        trackType={trackType}
        clips={clips}
        pixelsPerSecond={pixelsPerSecond}
        timelineWidth={timelineWidthPx}
        onClipDrop={handleClipDrop}
      />
    );
  }

  /**
   * Render playhead indicator
   */
  function renderPlayhead() {
    const playheadPx = (playheadMs / 1000) * pixelsPerSecond;

    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
        style={{ left: `${playheadPx}px` }}
      >
        {/* Playhead handle */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
      </div>
    );
  }

  /**
   * Empty state when no timeline
   */
  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-64 bg-editor-bg text-editor-muted">
        <div className="text-center">
          <p className="text-sm">No timeline loaded</p>
          <p className="text-xs mt-1">Upload media and send a chat message to create a timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-editor-bg overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Timeline ruler */}
      {renderRuler()}

      {/* Track rows container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        <div
          className="relative"
          style={{ width: `${timelineWidthPx}px`, minWidth: '100%' }}
        >
          {/* Playhead overlay */}
          {renderPlayhead()}

          {/* Track rows */}
          {TRACKS.map((track) => renderTrackRow(track.id, track.trackType))}
        </div>
      </div>

      {/* Timeline info footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-editor-surface border-t border-editor-border text-xs text-editor-muted">
        <span>
          Duration: {formatTime(durationMs)}
        </span>
        <span>
          Playhead: {formatTime(playheadMs)}
        </span>
        <span>
          Zoom: {Math.round(pixelsPerSecond)}px/s
        </span>
      </div>
    </div>
  );
}

export default TimelineEditor;
