/**
 * TrackRow component - renders a single labeled track row.
 * Displays track header (label + volume slider) and clip area.
 * Handles dragover/drop events for receiving dragged clips.
 * Based on specs/001-chat-native-editor/spec.md (FR-006, FR-008)
 */

import { useCallback, useRef } from 'react';
import { useEditorStore } from '../../store';
import type { 
  TimelineTracks, 
  ClipTrack, 
  SubtitleTrack, 
  VoiceoverTrack, 
  BgmTrack 
} from '../../types';
import { ClipBlock } from './ClipBlock';

/** Track type to clip array mapping */
type TrackClip<T extends keyof TimelineTracks> = TimelineTracks[T][number];

/** Props for TrackRow component */
interface TrackRowProps {
  /** Track identifier (V1, SUB, A1, A2) */
  trackId: string;
  /** Track type from TimelineTracks */
  trackType: keyof TimelineTracks;
  /** Clips array for this track */
  clips: TimelineTracks[keyof TimelineTracks];
  /** Pixels per second scale factor */
  pixelsPerSecond: number;
  /** Timeline width in pixels */
  timelineWidth: number;
  /** Handler for clip drop events */
  onClipDrop?: (e: React.DragEvent, trackType: keyof TimelineTracks, dropMs: number) => void;
}

/** Tracks that have volume controls */
const VOLUME_TRACKS: Record<string, 'video_volume' | 'voiceover_volume' | 'bgm_volume' | null> = {
  'V1': 'video_volume',
  'SUB': null,
  'A1': 'voiceover_volume',
  'A2': 'bgm_volume',
};

/** Default volumes per track */
const DEFAULT_VOLUMES: Record<string, number> = {
  'V1': 1.0,
  'SUB': 1.0,
  'A1': 2.0,
  'A2': 0.25,
};

/**
 * TrackRow component - renders a single track row with header and clips.
 */
export function TrackRow({
  trackId,
  trackType,
  clips,
  pixelsPerSecond,
  timelineWidth,
  onClipDrop,
}: TrackRowProps) {
  const timeline = useEditorStore((state) => state.timeline);
  const pushUndo = useEditorStore((state) => state.pushUndo);
  const setTimeline = useEditorStore((state) => state.setTimeline);

  const clipAreaRef = useRef<HTMLDivElement>(null);

  // Get volume field key for this track (if applicable)
  const volumeKey = VOLUME_TRACKS[trackId];
  
  // Get current volume value from timeline
  const volume = timeline && volumeKey ? timeline[volumeKey] : DEFAULT_VOLUMES[trackId] || 1.0;

  /**
   * Handle volume slider change
   */
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!timeline || !volumeKey) return;
    
    const newVolume = parseFloat(e.target.value);
    
    // Push current state to undo stack before mutation
    pushUndo(timeline);
    
    // Update timeline with new volume
    setTimeline({
      ...timeline,
      [volumeKey]: newVolume,
    });
  }, [timeline, volumeKey, pushUndo, setTimeline]);

  /**
   * Handle dragover event - must preventDefault to allow drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Add visual feedback that drop is allowed
    if (e.dataTransfer.effectAllowed === 'move' || e.dataTransfer.effectAllowed === 'copy') {
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  /**
   * Handle drop event for receiving dragged clips or library assets
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!onClipDrop || !clipAreaRef.current) return;

    // Calculate drop position in milliseconds
    const rect = clipAreaRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropMs = Math.round((dropX / pixelsPerSecond) * 1000);

    // Call the drop handler
    onClipDrop(e, trackType, dropMs);
  }, [onClipDrop, trackType, pixelsPerSecond]);

  /**
   * Calculate clip position and width in pixels
   */
  function getClipStyle(clip: { timeline_window: { start: number; end: number } }): React.CSSProperties {
    const startPx = (clip.timeline_window.start / 1000) * pixelsPerSecond;
    const endPx = (clip.timeline_window.end / 1000) * pixelsPerSecond;
    const widthPx = endPx - startPx;
    
    return {
      position: 'absolute',
      left: `${startPx}px`,
      width: `${widthPx}px`,
    };
  }

  /**
   * Render a clip block using ClipBlock component for video, placeholder for others
   */
  function renderClipBlock(clip: TrackClip<keyof TimelineTracks>, index: number) {
    // Use ClipBlock component for video track
    if (trackType === 'video') {
      return (
        <ClipBlock
          key={`${trackId}-clip-${index}`}
          trackType={trackType}
          clip={clip as ClipTrack}
          pixelsPerSecond={pixelsPerSecond}
          allClipsInTrack={clips as ClipTrack[]}
        />
      );
    }
    
    // Placeholder rendering for non-video tracks (subtitle, voiceover, bgm)
    const style = getClipStyle(clip as any);
    
    // Get clip label based on track type
    let label = '';
    if (trackType === 'subtitles') {
      label = (clip as SubtitleTrack).text?.substring(0, 20) || `Subtitle ${index + 1}`;
    } else if (trackType === 'voiceover') {
      label = (clip as VoiceoverTrack).path?.split('/').pop() || `VO ${index + 1}`;
    } else if (trackType === 'bgm') {
      label = (clip as BgmTrack).path?.split('/').pop() || `BGM ${index + 1}`;
    }

    return (
      <div
        key={`${trackId}-clip-${index}`}
        className="absolute top-1 bottom-1 bg-editor-accent border border-editor-border rounded cursor-move flex items-center justify-center overflow-hidden"
        style={style}
        draggable={true}
      >
        <span className="text-xs text-editor-text truncate px-1">
          {label}
        </span>
      </div>
    );
  }

  /**
   * Render volume slider for tracks with volume control
   */
  function renderVolumeSlider() {
    if (!volumeKey) return null;

    return (
      <div className="flex flex-col items-center mt-1">
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 bg-editor-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-editor-text-bright [&::-webkit-slider-thumb]:rounded-full"
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
        <span className="text-xs text-editor-muted">
          {Math.round(volume * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-16 border-b border-editor-border">
      {/* Track header */}
      <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center bg-editor-surface border-r border-editor-border">
        <span className="text-sm font-medium text-editor-text-bright">
          {trackId}
        </span>
        {renderVolumeSlider()}
      </div>

      {/* Track clip area */}
      <div
        ref={clipAreaRef}
        className="relative flex-1 bg-editor-bg overflow-hidden"
        style={{
          minWidth: `${timelineWidth}px`,
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Empty state */}
        {clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-editor-muted text-sm pointer-events-none">
            Empty
          </div>
        )}

        {/* Clip blocks */}
        {clips.map((clip, index) => renderClipBlock(clip, index))}

        {/* Drop zone indicator (shown during dragover) */}
        <div 
          className="absolute inset-0 pointer-events-none border-2 border-dashed border-editor-accent opacity-0 transition-opacity"
          style={{
            // This would be shown via drag state, implemented in future iterations
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}

export default TrackRow;
