"""
Chat-Native Video Editor Backend Module

This module provides the backend infrastructure for the chat-native video editor web application:
- Project persistence (project_store.py): JSON-based storage with atomic writes
- Media processing (media_processor.py): FFmpeg thumbnail/waveform/metadata extraction
- Export orchestration (export_runner.py): Async export job lifecycle management
- WebSocket session (ws_session.py): Agent lifecycle and serial message dispatch
"""
