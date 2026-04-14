/**
 * ChatInput component - multi-line textarea for sending chat messages.
 * Enter to submit (Shift+Enter for newline), disabled while isProcessing.
 * Sends chat_message WebSocket event. Integrates with MentionDropdown on @ trigger.
 * Based on specs/001-chat-native-editor/spec.md (FR-009)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../store';
import type { AssetMention } from '../../types';
import { MentionDropdown } from './MentionDropdown';

/**
 * ChatInput - textarea component for composing and sending chat messages.
 * Implements keyboard shortcuts: Enter to submit, Shift+Enter for newline.
 * Disabled during processing. Triggers mention dropdown on @ character.
 */
export function ChatInput() {
  const [inputValue, setInputValue] = useState('');
  const [mentions, setMentions] = useState<AssetMention[]>([]);
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get state from Zustand store
  const isProcessing = useEditorStore((state) => state.isProcessing);
  
  // Get sendChatMessage from WebSocket hook (will be injected via props or context)
  // For now, we'll get it from a custom hook integration point
  // This will be wired up in ChatPanel component (T019)
  const sendChatMessage = useEditorStore((state) => state._sendChatMessage);

  /**
   * Auto-resize textarea to fit content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  /**
   * Handle input change and detect @ mentions
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Check for @ trigger to open mention dropdown
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if @ is followed by word characters (no spaces)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      if (!hasSpaceAfterAt) {
        setMentionFilter(textAfterAt);
        setMentionDropdownOpen(true);
        return;
      }
    }
    
    setMentionDropdownOpen(false);
  };

  /**
   * Handle keyboard events for submit and newline
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    
    // Escape to close mention dropdown
    if (e.key === 'Escape' && mentionDropdownOpen) {
      setMentionDropdownOpen(false);
      e.preventDefault();
      return;
    }
    
    // Arrow keys and Tab are handled by MentionDropdown via global keydown listener
  };

  /**
   * Submit the message
   */
  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    
    // Don't submit if empty or processing
    if (!trimmedValue || isProcessing || !sendChatMessage) {
      return;
    }
    
    // Send message via WebSocket
    sendChatMessage(trimmedValue, mentions);
    
    // Reset input state
    setInputValue('');
    setMentions([]);
    setMentionDropdownOpen(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Focus textarea for next message
    textareaRef.current?.focus();
  };

  /**
   * Insert mention from dropdown (will be called by MentionDropdown component)
   */
  const insertMention = (assetId: string, assetName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = inputValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    // Replace @query with @assetName
    const textBefore = inputValue.substring(0, lastAtIndex);
    const textAfter = inputValue.substring(cursorPos);
    const newValue = `${textBefore}@${assetName} ${textAfter}`;
    
    setInputValue(newValue);
    setMentions([...mentions, { asset_id: assetId, asset_name: assetName }]);
    setMentionDropdownOpen(false);
    
    // Move cursor after the inserted mention
    setTimeout(() => {
      const newCursorPos = lastAtIndex + assetName.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  return (
    <div className="relative border-t border-editor-border bg-editor-surface">
      {/* MentionDropdown for @ mentions */}
      <MentionDropdown
        isOpen={mentionDropdownOpen}
        filter={mentionFilter}
        onSelect={insertMention}
        onClose={() => setMentionDropdownOpen(false)}
        currentMentions={mentions}
      />
      
      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder={isProcessing ? "Processing..." : "Type a message... (@ to mention assets)"}
          className="flex-1 bg-zinc-800 text-editor-text-bright rounded-lg px-4 py-2 resize-none border border-editor-border focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder-editor-muted min-h-[40px] max-h-[200px]"
          rows={1}
        />
        
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          aria-label="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="px-4 pb-2 text-xs text-editor-muted">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

export default ChatInput;
