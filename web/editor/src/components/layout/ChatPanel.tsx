/**
 * ChatPanel component - the right panel for conversational video editing.
 * Renders ChatMessageList + ChatInput, connects useWebSocket hook,
 * and dispatches incoming WebSocket events to Zustand slices.
 * Based on specs/001-chat-native-editor/spec.md (US1, FR-003, FR-004, FR-009)
 */

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store';
import { useWebSocket, type ConnectionState } from '../../hooks/useWebSocket';
import { ChatMessageList } from '../chat/ChatMessageList';
import { ChatInput } from '../chat/ChatInput';

/**
 * Connection status indicator shown in the chat panel header
 */
function ConnectionIndicator({ state, reconnect }: { state: ConnectionState; reconnect: () => void }) {
  const statusConfig = {
    connected: { color: 'bg-green-500', text: 'Connected' },
    connecting: { color: 'bg-yellow-500 animate-pulse', text: 'Connecting...' },
    disconnected: { color: 'bg-gray-500', text: 'Disconnected' },
    reconnecting: { color: 'bg-yellow-500 animate-pulse', text: 'Reconnecting...' },
    failed: { color: 'bg-red-500', text: 'Connection Failed' },
  };

  const config = statusConfig[state];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-xs text-editor-muted">{config.text}</span>
      {state === 'failed' && (
        <button
          onClick={reconnect}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

/**
 * ChatPanel - Container for the chat interface.
 * Manages WebSocket connection and event dispatching.
 * 
 * Note: WebSocket event handling (chat_message, tool_progress, timeline_update, etc.)
 * is done internally in useWebSocket hook which dispatches to Zustand slices.
 */
export function ChatPanel() {
  // Get current project ID for session management
  const currentProject = useEditorStore((state) => state.currentProject);
  const sessionId = currentProject?.id ?? null;

  // Get Zustand action to inject sendChatMessage into chatSlice
  const setSendChatMessage = useEditorStore((state) => state.setSendChatMessage);

  // Handle WebSocket connection state changes
  const handleStateChange = useCallback((state: ConnectionState) => {
    // Could be used to show global connection status or trigger UI updates
    console.log('[ChatPanel] WebSocket state:', state);
  }, []);

  // Connect to WebSocket with current session ID
  // Note: Event dispatching to Zustand stores happens inside useWebSocket
  const { connectionState, sendChatMessage, reconnect } = useWebSocket({
    sessionId,
    onStateChange: handleStateChange,
  });

  // Inject sendChatMessage into chatSlice when available
  useEffect(() => {
    setSendChatMessage(sendChatMessage);
    return () => setSendChatMessage(null);
  }, [sendChatMessage, setSendChatMessage]);

  // Load chat history when project changes
  // Note: Chat history is loaded by the project loading logic in App.tsx
  // This component just needs to react to the current project

  return (
    <div className="flex flex-col h-full bg-editor-surface border-l border-editor-border">
      {/* Header with connection status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-editor-border">
        <h2 className="text-sm font-semibold text-editor-text-bright">Chat</h2>
        <ConnectionIndicator state={connectionState} reconnect={reconnect} />
      </div>

      {/* Chat messages list - scrollable */}
      <ChatMessageList />

      {/* Chat input - fixed at bottom */}
      <ChatInput />
    </div>
  );
}

export default ChatPanel;
