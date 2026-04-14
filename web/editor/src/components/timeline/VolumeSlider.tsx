/**
 * VolumeSlider component - per-track volume slider in track header.
 * Range 0.0–2.0, displayed as 0–200%.
 * Updates video_volume/voiceover_volume/bgm_volume in timelineSlice.
 * Pushes undo snapshot on change.
 * Based on specs/001-chat-native-editor/spec.md (FR-006, FR-008)
 */

import { useCallback } from 'react';
import { useEditorStore } from '../../store';
import type { Timeline } from '../../types';

/** Volume field keys in Timeline entity */
type VolumeField = 'video_volume' | 'voiceover_volume' | 'bgm_volume';

/** Props for VolumeSlider component */
interface VolumeSliderProps {
  /** Track identifier (V1, SUB, A1, A2) */
  trackId: string;
  /** Which volume field in Timeline to update */
  volumeField: VolumeField;
  /** Default volume value if timeline not loaded */
  defaultValue?: number;
}

/**
 * VolumeSlider - per-track volume control slider.
 * Displays range 0.0–2.0 as percentage 0–200%.
 */
export function VolumeSlider({
  trackId,
  volumeField,
  defaultValue = 1.0,
}: VolumeSliderProps) {
  const timeline = useEditorStore((state) => state.timeline);
  const pushUndo = useEditorStore((state) => state.pushUndo);
  const setTimeline = useEditorStore((state) => state.setTimeline);

  // Get current volume from timeline or use default
  const volume = timeline ? timeline[volumeField] : defaultValue;

  /**
   * Handle volume slider change.
   * Updates timelineSlice and pushes undo snapshot.
   */
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!timeline) return;

      const newVolume = parseFloat(e.target.value);

      // Push current state to undo stack before mutation
      pushUndo(timeline);

      // Update timeline with new volume
      const updatedTimeline: Timeline = {
        ...timeline,
        [volumeField]: newVolume,
      };

      setTimeline(updatedTimeline);
    },
    [timeline, volumeField, pushUndo, setTimeline]
  );

  // Format volume as percentage for display
  const volumePercent = Math.round(volume * 100);

  return (
    <div className="flex flex-col items-center mt-1">
      <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        className="
          w-16 h-1 bg-editor-border rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-2
          [&::-webkit-slider-thumb]:h-2
          [&::-webkit-slider-thumb]:bg-editor-text-bright
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-2
          [&::-moz-range-thumb]:h-2
          [&::-moz-range-thumb]:bg-editor-text-bright
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:cursor-pointer
        "
        title={`Volume: ${volumePercent}%`}
        aria-label={`${trackId} volume: ${volumePercent}%`}
      />
      <span className="text-xs text-editor-muted select-none">
        {volumePercent}%
      </span>
    </div>
  );
}

export default VolumeSlider;
