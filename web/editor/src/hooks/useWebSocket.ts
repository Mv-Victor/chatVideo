/**
 * WebSocket connection hook for chat-native video editor.
 * Manages connection lifecycle, exponential backoff reconnection, and event dispatching.
 * Based on FR-016, FR-017 and contracts/api.md
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '../store';

/** Connection states */
export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'failed';

/** WebSocket configuration */
const WS_BASE_URL = import.meta.env.PROD 
  ? '' // In production, use relative URL (same origin)
  : 'ws://localhost:8000'; // In dev, use Vite proxy target

const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

interface UseWebSocketOptions {
  /** Session ID (must equal project_id per FR-017) */
  sessionId: string | null;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState) => void;
}

interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Send a chat message to the server */
  sendChatMessage: (content: string, mentions?: Array<{ asset_id: string; asset_name: string }>) => void;
  /** Manually trigger reconnection after failure */
  reconnect: () => void;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;
}

/**
 * WebSocket hook for managing real-time communication with the backend.
 * Implements exponential backoff reconnection per FR-016.
 */
export function useWebSocket({ sessionId, onStateChange }: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Get dispatch functions from Zustand store
  const addMessage = useEditorStore((state) => state.addMessage);
  const setProcessing = useEditorStore((state) => state.setProcessing);
  const applyAIUpdate = useEditorStore((state) => state.applyAIUpdate);
  const updateAsset = useEditorStore((state) => state.updateAsset);

  /**
   * Update connection state and notify callback
   */
  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onStateChange?.(state);
  }, [onStateChange]);

  /**
   * Calculate next reconnect delay with exponential backoff
   */
  const getNextReconnectDelay = useCallback((attempt: number): number => {
    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
    // Add jitter (±10%) to prevent thundering herd
    return delay * (0.9 + Math.random() * 0.2);
  }, []);

  /**
   * Parse and dispatch incoming WebSocket events to Zustand stores
   */
  const dispatchEvent = useCallback((data: string) => {
    try {
      const event = JSON.parse(data);
      
      switch (event.type) {
        case 'chat_message': {
          // Add assistant message to chat history
          addMessage({
            id: event.session_id + '-' + Date.now(), // Generate unique ID
            role: event.role,
            content: event.content,
            timestamp: event.timestamp,
            tool_name: null,
          });
          break;
        }
        
        case 'tool_progress': {
          // Add tool progress message to chat
          addMessage({
            id: event.session_id + '-' + Date.now(),
            role: 'tool_progress',
            content: event.detail || `${event.tool_name} ${event.status}`,
            timestamp: event.timestamp,
            tool_name: event.tool_name,
          });
          
          // Update processing state based on tool status
          if (event.status === 'started') {
            setProcessing(true);
          } else if (event.status === 'completed' || event.status === 'failed') {
            // Keep processing true until we get timeline_update or error
            // This shows "Processing..." during the entire agent run
          }
          break;
        }
        
        case 'timeline_update': {
          // Apply AI update: clear undo/redo stack per FR-008
          applyAIUpdate(event.timeline);
          setProcessing(false);
          break;
        }
        
        case 'error': {
          // Add error message to chat as tool_progress
          addMessage({
            id: event.session_id + '-' + Date.now(),
            role: 'tool_progress',
            content: `Error: ${event.message}`,
            timestamp: event.timestamp,
            tool_name: null,
          });
          setProcessing(false);
          break;
        }
        
        case 'media_update': {
          // Update media asset status
          updateAsset(event.asset_id, {
            status: event.status,
            error_message: event.error_message,
          });
          break;
        }
        
        default: {
          console.warn('Unknown WebSocket event type:', event.type);
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [addMessage, setProcessing, applyAIUpdate, updateAsset]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!sessionId) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
    }

    const wsUrl = `${WS_BASE_URL}/ws/chat/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    updateConnectionState(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    ws.onopen = () => {
      updateConnectionState('connected');
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      dispatchEvent(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = (event) => {
      // Don't reconnect if this was a clean close or session is invalid
      if (event.code === 1000 || event.code === 1001) {
        updateConnectionState('disconnected');
        return;
      }

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = getNextReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        setReconnectAttempts(reconnectAttemptsRef.current);
        
        updateConnectionState('reconnecting');
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        // Max attempts reached, show error state
        updateConnectionState('failed');
      }
    };
  }, [sessionId, updateConnectionState, dispatchEvent, getNextReconnectDelay]);

  /**
   * Send a chat message through WebSocket
   */
  const sendChatMessage = useCallback((content: string, mentions?: Array<{ asset_id: string; asset_name: string }>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const message = {
      type: 'chat_message',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      role: 'user',
      content,
      mentions: mentions || [],
    };

    wsRef.current.send(JSON.stringify(message));
    
    // Add user message to local chat history immediately
    addMessage({
      id: sessionId + '-' + Date.now(),
      role: 'user',
      content,
      timestamp: message.timestamp,
      tool_name: null,
    });
    
    // Set processing state
    setProcessing(true);
  }, [sessionId, addMessage, setProcessing]);

  /**
   * Manually trigger reconnection after failure
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    connect();
  }, [connect]);

  // Connect when sessionId changes
  useEffect(() => {
    if (sessionId) {
      connect();
    } else {
      // Disconnect if sessionId is null
      if (wsRef.current) {
        wsRef.current.close(1000, 'Session ended');
        wsRef.current = null;
      }
      updateConnectionState('disconnected');
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [sessionId, connect, updateConnectionState]);

  return {
    connectionState,
    sendChatMessage,
    reconnect,
    reconnectAttempts,
  };
}
