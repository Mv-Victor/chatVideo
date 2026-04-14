"""
WebSocket Session Module

Manages per-session WebSocket connections for the chat-native editor.

Key classes:
- WSSession: Holds websocket, agent instance, processing state, and pending queue
- Serial message dispatch: At most 1 processing + 1 queued message
- Agent lifecycle: Lazy creation, release on close
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from open_storyline.agent import build_agent
from open_storyline.config import Settings
from open_storyline.editor.project_store import (
    get_chat_history,
    append_chat_message,
    read_timeline,
)
from open_storyline.mcp.hooks.chat_middleware import (
    set_mcp_log_sink,
    reset_mcp_log_sink,
)

logger = logging.getLogger(__name__)


class WSSession:
    """
    Per-session WebSocket state for the chat-native editor.
    
    Attributes:
        websocket: The active WebSocket connection
        agent: The LangChain agent instance (lazy created)
        node_manager: The node manager for tool routing
        is_processing: Flag indicating if a message is being processed
        pending_message: Single-slot queue for one pending message (or None)
        cfg: Application settings
        project_id: The project ID (same as session_id per FR-017)
        agent_lock: Async lock for agent creation
        event_callback: Optional callback for emitting WebSocket events
    """
    
    def __init__(
        self,
        websocket: WebSocket,
        cfg: Settings,
        project_id: str,
        event_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        """
        Initialize a WebSocket session.
        
        Args:
            websocket: The WebSocket connection
            cfg: Application settings
            project_id: The project ID (same as session_id per FR-017)
            event_callback: Optional callback for emitting events (e.g., tool_progress)
        """
        self.websocket = websocket
        self.cfg = cfg
        self.project_id = project_id
        self.event_callback = event_callback
        
        self.agent: Any = None
        self.node_manager: Any = None
        self.is_processing: bool = False
        self.pending_message: Optional[Dict[str, Any]] = None
        
        self._agent_lock = asyncio.Lock()
        self._context_token: Optional[Any] = None
    
    async def connect(self) -> None:
        """
        Initialize the session by creating the agent and loading chat history.
        
        Per FR-017: Agent is created lazily, and chat_history.json is reloaded
        for context restoration.
        """
        async with self._agent_lock:
            if self.agent is None:
                logger.info(f"WS session {self.project_id}: Creating agent")
                # Build agent with project_id as session_id
                # The agent will be configured with project-specific paths
                self.agent, self.node_manager = await build_agent(
                    cfg=self.cfg,
                    session_id=self.project_id,
                    store=None,  # Will be created by build_agent
                )
                logger.info(f"WS session {self.project_id}: Agent created successfully")
    
    def release(self) -> None:
        """
        Release the agent and clear session state.
        
        Called when the WebSocket connection closes.
        Per FR-017: No state is retained on the server after close.
        """
        logger.info(f"WS session {self.project_id}: Releasing agent")
        self.agent = None
        self.node_manager = None
        self.is_processing = False
        self.pending_message = None
        
        # Reset MCP log sink if we set one
        if self._context_token is not None:
            try:
                reset_mcp_log_sink(self._context_token)
            except Exception:
                pass
            self._context_token = None
    
    async def dispatch_message(self, msg: Dict[str, Any]) -> None:
        """
        Dispatch a message for processing with serial queue guarantee.
        
        Per FR-023: At most 1 message being processed + 1 message in queue.
        If queue is full, emit AGENT_BUSY error.
        
        Args:
            msg: The message dict containing type, session_id, timestamp, etc.
        """
        # Check if already processing
        if self.is_processing:
            # Check if queue slot is available
            if self.pending_message is not None:
                # Queue is full - emit AGENT_BUSY error
                logger.warning(f"WS session {self.project_id}: AGENT_BUSY - queue overflow")
                await self._emit_error("AGENT_BUSY", "Agent is busy processing another message. Please wait.")
                return
            
            # Queue this message
            logger.info(f"WS session {self.project_id}: Queueing message")
            self.pending_message = msg
            return
        
        # Process immediately
        await self._process_message(msg)
        
        # Process queued message if any
        while self.pending_message is not None:
            next_msg = self.pending_message
            self.pending_message = None
            await self._process_message(next_msg)
    
    async def _process_message(self, msg: Dict[str, Any]) -> None:
        """
        Process a single message through the agent.
        
        This method:
        1. Sets up the progress callback to emit tool_progress events
        2. Sends the message to the agent
        3. Emits timeline_update after agent completes
        4. Persists chat messages to chat_history.json
        
        Args:
            msg: The message dict (chat_message type)
        """
        msg_type = msg.get("type")
        
        if msg_type != "chat_message":
            logger.warning(f"WS session {self.project_id}: Unknown message type: {msg_type}")
            return
        
        self.is_processing = True
        
        try:
            # Ensure agent exists
            await self.connect()
            
            # Extract message content
            role = msg.get("role", "user")
            content = msg.get("content", "")
            mentions = msg.get("mentions", [])
            
            if role != "user":
                logger.warning(f"WS session {self.project_id}: Expected user role, got {role}")
                return
            
            # Generate message ID and timestamp
            msg_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Persist user message
            user_msg = {
                "id": msg_id,
                "role": "user",
                "content": content,
                "timestamp": timestamp,
            }
            append_chat_message(self.project_id, user_msg)
            
            # Emit user message back to confirm
            await self._emit_event({
                "type": "chat_message",
                "session_id": self.project_id,
                "timestamp": timestamp,
                "role": "user",
                "content": content,
                "mentions": mentions,
            })
            
            # Set up progress callback for tool_progress events
            def progress_sink(event: Dict[str, Any]) -> None:
                """Bridge MCP tool events to WebSocket tool_progress events."""
                if not event:
                    return
                try:
                    event_type = event.get("type")
                    
                    if event_type == "tool_start":
                        # Emit tool_progress with status "started"
                        self._emit_event_sync({
                            "type": "tool_progress",
                            "session_id": self.project_id,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "tool_name": event.get("name", ""),
                            "status": "started",
                            "detail": None,
                        })
                        # Persist tool_progress message
                        append_chat_message(self.project_id, {
                            "id": str(uuid.uuid4()),
                            "role": "tool_progress",
                            "content": "",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "tool_name": event.get("name", ""),
                        })
                    
                    elif event_type == "tool_progress":
                        # Emit tool_progress with progress info
                        progress_msg = event.get("message", "") or ""
                        self._emit_event_sync({
                            "type": "tool_progress",
                            "session_id": self.project_id,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "tool_name": event.get("name", ""),
                            "status": "started",  # Still running
                            "detail": progress_msg,
                        })
                    
                    elif event_type == "tool_end":
                        # Emit tool_progress with status "completed" or "failed"
                        is_error = event.get("is_error", False)
                        summary = event.get("summary", "") or ""
                        status = "failed" if is_error else "completed"
                        self._emit_event_sync({
                            "type": "tool_progress",
                            "session_id": self.project_id,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "tool_name": event.get("name", ""),
                            "status": status,
                            "detail": summary,
                        })
                        # Persist tool_progress message (completion/failure)
                        append_chat_message(self.project_id, {
                            "id": str(uuid.uuid4()),
                            "role": "tool_progress",
                            "content": "",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "tool_name": event.get("name", ""),
                        })
                
                except Exception as e:
                    logger.error(f"WS session {self.project_id}: progress_sink error: {e}")
            
            # Set the MCP log sink
            self._context_token = set_mcp_log_sink(progress_sink)
            
            # Invoke agent with the user message
            # The agent will process through LangChain runtime
            try:
                from langchain_core.messages import HumanMessage
                
                agent_input = {
                    "messages": [HumanMessage(content=content)],
                }
                
                # Run the agent
                result = await self.agent.ainvoke(agent_input)
                
                # Extract assistant response
                assistant_content = ""
                if result:
                    # The result structure depends on agent configuration
                    # Typically it's {"messages": [...]}
                    messages = result.get("messages", []) if isinstance(result, dict) else []
                    if messages:
                        # Get the last AI message
                        for m in reversed(messages):
                            if hasattr(m, "content") and m.__class__.__name__ in ("AIMessage", "HumanMessage"):
                                assistant_content = str(m.content)
                                break
                            elif isinstance(m, dict) and m.get("role") == "assistant":
                                assistant_content = str(m.get("content", ""))
                                break
                
                # Persist and emit assistant message
                assistant_msg_id = str(uuid.uuid4())
                assistant_timestamp = datetime.now(timezone.utc).isoformat()
                assistant_msg = {
                    "id": assistant_msg_id,
                    "role": "assistant",
                    "content": assistant_content,
                    "timestamp": assistant_timestamp,
                }
                append_chat_message(self.project_id, assistant_msg)
                
                await self._emit_event({
                    "type": "chat_message",
                    "session_id": self.project_id,
                    "timestamp": assistant_timestamp,
                    "role": "assistant",
                    "content": assistant_content,
                })
                
                # Emit timeline_update with the current timeline state
                # Per spec: always carry complete timeline state, never partial diffs
                current_timeline = read_timeline(self.project_id)
                await self._emit_event({
                    "type": "timeline_update",
                    "session_id": self.project_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "timeline": current_timeline,
                })
                
                logger.info(f"WS session {self.project_id}: Message processed successfully")
                
            except Exception as agent_error:
                logger.error(f"WS session {self.project_id}: Agent invocation error: {agent_error}")
                
                # Emit error event
                await self._emit_error("AGENT_ERROR", f"Agent failed to process message: {agent_error}")
                
                # Agent failure mid-task: timeline remains in last valid state (per FR-019)
                # The timeline is persisted by nodes during execution, so we don't need to do anything here
            
            finally:
                # Reset MCP log sink
                if self._context_token is not None:
                    reset_mcp_log_sink(self._context_token)
                    self._context_token = None
        
        except Exception as e:
            logger.error(f"WS session {self.project_id}: Message processing error: {e}")
            await self._emit_error("PROCESSING_ERROR", f"Failed to process message: {e}")
        
        finally:
            self.is_processing = False
    
    async def _emit_event(self, event: Dict[str, Any]) -> None:
        """Emit an event via WebSocket and call event callback if set."""
        try:
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(event)
        except (TypeError, ValueError) as e:
            # Serialization error - event contains non-JSON-serializable data
            logger.error(f"WS session {self.project_id}: Serialization error - Failed to emit event: {e}")
        except Exception as e:
            logger.error(f"WS session {self.project_id}: Failed to emit event: {e}")
        
        if self.event_callback:
            try:
                self.event_callback(event)
            except Exception as e:
                logger.error(f"WS session {self.project_id}: Event callback error: {e}")
    
    def _emit_event_sync(self, event: Dict[str, Any]) -> None:
        """
        Synchronously emit an event (used in progress callback).
        
        Note: This creates a task to send the event. The actual sending
        happens asynchronously.
        """
        try:
            if self.websocket.client_state == WebSocketState.CONNECTED:
                # Schedule the send on the event loop
                asyncio.create_task(self.websocket.send_json(event))
        except (TypeError, ValueError) as e:
            # Serialization error - event contains non-JSON-serializable data
            logger.error(f"WS session {self.project_id}: Serialization error - Failed to emit event (sync): {e}")
        except Exception as e:
            logger.error(f"WS session {self.project_id}: Failed to emit event (sync): {e}")
        
        if self.event_callback:
            try:
                self.event_callback(event)
            except Exception as e:
                logger.error(f"WS session {self.project_id}: Event callback error (sync): {e}")
    
    async def _emit_error(self, code: str, message: str) -> None:
        """Emit an error event."""
        await self._emit_event({
            "type": "error",
            "session_id": self.project_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "code": code,
            "message": message,
        })


# Global session registry for active WebSocket connections
# Key: project_id, Value: WSSession
_active_sessions: Dict[str, WSSession] = {}
_sessions_lock = asyncio.Lock()


async def get_or_create_session(
    project_id: str,
    websocket: WebSocket,
    cfg: Settings,
    event_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
) -> WSSession:
    """
    Get an existing session or create a new one for the project.
    
    Args:
        project_id: The project ID (also used as session_id per FR-017)
        websocket: The WebSocket connection
        cfg: Application settings
        event_callback: Optional callback for events
    
    Returns:
        The WSSession instance
    """
    async with _sessions_lock:
        if project_id in _active_sessions:
            # Update websocket reference (for reconnects)
            _active_sessions[project_id].websocket = websocket
            return _active_sessions[project_id]
        
        session = WSSession(
            websocket=websocket,
            cfg=cfg,
            project_id=project_id,
            event_callback=event_callback,
        )
        _active_sessions[project_id] = session
        return session


async def release_session(project_id: str) -> None:
    """
    Release a session and remove it from the registry.
    
    Args:
        project_id: The project ID to release
    """
    async with _sessions_lock:
        session = _active_sessions.pop(project_id, None)
        if session:
            session.release()
