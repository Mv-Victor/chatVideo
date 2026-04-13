/**
 * Timeline state management slice.
 * Manages timeline state with undo/redo functionality (max 20 states).
 * Based on specs/001-chat-native-editor/data-model.md
 */

import type { StateCreator } from 'zustand';
import type { Timeline } from '../types';

const MAX_UNDO_STACK = 20;

export interface TimelineSlice {
  timeline: Timeline | null;
  undoStack: Timeline[];
  redoStack: Timeline[];
  /** Push current timeline state to undo stack before mutation */
  pushUndo: (prev: Timeline) => void;
  /** Undo last action: restore from undo stack */
  undo: () => void;
  /** Redo last undone action: restore from redo stack */
  redo: () => void;
  /** Apply AI update: set timeline and clear undo/redo stacks */
  applyAIUpdate: (timeline: Timeline) => void;
  /** Set timeline directly (used for project load) */
  setTimeline: (timeline: Timeline | null) => void;
  /** Reset timeline to empty state */
  resetTimeline: () => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice, [], [], TimelineSlice> = (set, get) => ({
  timeline: null,
  undoStack: [],
  redoStack: [],

  pushUndo: (prev: Timeline) => {
    set((state) => {
      const newStack = [...state.undoStack, prev];
      // Trim to max stack size
      if (newStack.length > MAX_UNDO_STACK) {
        newStack.shift();
      }
      return {
        undoStack: newStack,
        // Clear redo stack on new action
        redoStack: [],
      };
    });
  },

  undo: () => {
    const { timeline, undoStack } = get();
    if (undoStack.length === 0 || !timeline) return;

    const prev = undoStack[undoStack.length - 1];
    set((state) => ({
      timeline: prev,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, timeline],
    }));
  },

  redo: () => {
    const { timeline, redoStack } = get();
    if (redoStack.length === 0 || !timeline) return;

    const next = redoStack[redoStack.length - 1];
    set((state) => ({
      timeline: next,
      undoStack: [...state.undoStack, timeline],
      redoStack: state.redoStack.slice(0, -1),
    }));
  },

  applyAIUpdate: (timeline: Timeline) => {
    set({
      timeline,
      // Clear undo/redo stacks on AI update per FR-008
      undoStack: [],
      redoStack: [],
    });
  },

  setTimeline: (timeline: Timeline | null) => {
    set({
      timeline,
      undoStack: [],
      redoStack: [],
    });
  },

  resetTimeline: () => {
    set({
      timeline: null,
      undoStack: [],
      redoStack: [],
    });
  },
});
