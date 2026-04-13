"""
Media Processor Module

Provides async FFmpeg-based media processing for thumbnail generation,
waveform visualization, and metadata extraction.

Key functions:
- process_asset(): Main async processing pipeline
- Status transitions: uploading -> processing -> ready/error
- WebSocket event emission on state transitions
"""
