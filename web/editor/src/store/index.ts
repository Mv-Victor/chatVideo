/**
 * Combined Zustand store for the Chat-Native Video Editor.
 * Combines all slice stores into a single global state.
 * Based on specs/001-chat-native-editor/data-model.md
 */

import { create } from 'zustand';
import {
  createTimelineSlice,
  type TimelineSlice,
} from './timelineSlice';
import {
  createChatSlice,
  type ChatSlice,
} from './chatSlice';
import {
  createMediaSlice,
  type MediaSlice,
} from './mediaSlice';
import {
  createProjectSlice,
  type ProjectSlice,
} from './projectSlice';

// Combined store type
export type EditorStore = TimelineSlice & ChatSlice & MediaSlice & ProjectSlice;

// Create the combined store using Zustand
export const useEditorStore = create<EditorStore>((...a) => ({
  ...createTimelineSlice(...a),
  ...createChatSlice(...a),
  ...createMediaSlice(...a),
  ...createProjectSlice(...a),
}));

// Re-export slice types for convenience
export type { TimelineSlice } from './timelineSlice';
export type { ChatSlice } from './chatSlice';
export type { MediaSlice } from './mediaSlice';
export type { ProjectSlice } from './projectSlice';

// Re-export slice creators for testing/mocking
export { createTimelineSlice } from './timelineSlice';
export { createChatSlice } from './chatSlice';
export { createMediaSlice } from './mediaSlice';
export { createProjectSlice } from './projectSlice';
