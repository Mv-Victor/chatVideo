"""
WebSocket Session Module

Manages per-session WebSocket connections for the chat-native editor.

Key classes:
- WSSession: Holds websocket, agent instance, processing state, and pending queue
- Serial message dispatch: At most 1 processing + 1 queued message
- Agent lifecycle: Lazy creation, release on close
"""
