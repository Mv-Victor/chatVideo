/**
 * Chat state management slice.
 * Manages chat message history and processing state.
 * Based on specs/001-chat-native-editor/data-model.md
 */

import type { StateCreator } from 'zustand';
import type { ChatMessage } from '../types';

export interface ChatSlice {
  messages: ChatMessage[];
  isProcessing: boolean;
  /** Add a new message to the chat history */
  addMessage: (message: ChatMessage) => void;
  /** Set processing state (shows "Processing..." indicator) */
  setProcessing: (isProcessing: boolean) => void;
  /** Replace entire message history (used for project load) */
  setMessages: (messages: ChatMessage[]) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Internal: WebSocket send function (injected by ChatPanel) */
  _sendChatMessage: ((content: string, mentions?: Array<{ asset_id: string; asset_name: string }>) => void) | null;
  /** Set the WebSocket send function */
  setSendChatMessage: (fn: ((content: string, mentions?: Array<{ asset_id: string; asset_name: string }>) => void) | null) => void;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  messages: [],
  isProcessing: false,
  _sendChatMessage: null,

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  setMessages: (messages: ChatMessage[]) => {
    set({ messages });
  },

  clearMessages: () => {
    set({ messages: [], isProcessing: false });
  },

  setSendChatMessage: (fn: ((content: string, mentions?: Array<{ asset_id: string; asset_name: string }>) => void) | null) => {
    set({ _sendChatMessage: fn });
  },
});
