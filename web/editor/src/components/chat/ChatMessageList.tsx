/**
 * ChatMessageList component - renders chat messages with distinct visual styling per role.
 * Displays user, assistant, and tool_progress messages from chatSlice.
 * Auto-scrolls to latest message and shows "Processing..." indicator when isProcessing is true.
 * Based on specs/001-chat-native-editor/spec.md (FR-004, FR-003)
 */

import { useEffect, useRef } from 'react';
import { useEditorStore } from '../../store';
import type { ChatMessage } from '../../types';

/**
 * Individual message bubble component with role-based styling
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isToolProgress = message.role === 'tool_progress';

  // Base styles shared across all message types
  const baseStyles = 'rounded-lg px-4 py-2 max-w-[85%] break-words';
  
  // Role-specific styles
  const roleStyles = isUser
    ? 'bg-blue-600 text-white ml-auto mr-4'
    : isAssistant
    ? 'bg-editor-surface text-editor-text-bright border border-editor-border ml-4'
    : isToolProgress
    ? 'bg-zinc-800 text-editor-text border border-editor-muted ml-4 text-sm italic'
    : 'bg-editor-surface text-editor-text ml-4';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`${baseStyles} ${roleStyles}`}>
        {/* Tool progress shows tool name as prefix */}
        {isToolProgress && message.tool_name && (
          <span className="text-blue-400 font-medium mr-2">
            [{message.tool_name}]
          </span>
        )}
        <span>{message.content}</span>
      </div>
    </div>
  );
}

/**
 * Processing indicator shown when AI is generating a response
 */
function ProcessingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-editor-surface text-editor-text border border-editor-border rounded-lg px-4 py-2 ml-4 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-sm">Processing...</span>
      </div>
    </div>
  );
}

/**
 * Empty state when no messages exist
 */
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-editor-muted">
      <div className="text-center">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">Type a message below to start editing</p>
      </div>
    </div>
  );
}

/**
 * ChatMessageList - renders the list of chat messages with auto-scroll
 * and processing indicator.
 */
export function ChatMessageList() {
  const messages = useEditorStore((state) => state.messages);
  const isProcessing = useEditorStore((state) => state.isProcessing);
  
  // Ref for auto-scroll container
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or processing state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  // Show empty state if no messages
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-2 py-4"
    >
      {/* Render all messages */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Show processing indicator when AI is working */}
      {isProcessing && <ProcessingIndicator />}
    </div>
  );
}

export default ChatMessageList;
