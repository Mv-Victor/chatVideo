/**
 * TypeScript type definitions for the Chat-Native Video Editor.
 * Based on specs/001-chat-native-editor/data-model.md
 */

// =============================================================================
// Common Types
// =============================================================================

/** UUID v4 string format */
export type UUID = string;

/** ISO-8601 datetime string */
export type ISO8601 = string;

/** Time window with start/end in milliseconds */
export interface TimeWindow {
  start: number;
  end: number;
  duration?: number;
}

// =============================================================================
// MediaAsset Entity
// =============================================================================

export type MediaAssetStatus = 'uploading' | 'processing' | 'ready' | 'error';

export type MediaAssetType = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: UUID;
  name: string;
  type: string; // MIME type: video/*, audio/*, image/*
  size: number;
  status: MediaAssetStatus;
  error_message: string | null;
  created_at: ISO8601;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  path: string;
}

// =============================================================================
// Timeline Entity
// =============================================================================

export type ClipKind = 'video' | 'image';

/** ClipTrack - video array element */
export interface ClipTrack {
  clip_id: string;
  group_id: string;
  kind: ClipKind;
  path: string;
  fps: number | null;
  source_path: string | null;
  source_window: TimeWindow;
  timeline_window: TimeWindow;
  playback_rate: number;
}

/** SubtitleTrack - subtitles array element */
export interface SubtitleTrack {
  group_id: string;
  unit_id: string;
  index_in_group: number;
  text: string;
  timeline_window: TimeWindow;
}

/** VoiceoverTrack - voiceover array element */
export interface VoiceoverTrack {
  group_id: string;
  voiceover_id: string;
  path: string;
  source_window: TimeWindow;
  timeline_window: TimeWindow;
}

/** BgmTrack - bgm array element */
export interface BgmTrack {
  bgm_id: string;
  path: string;
  source_window: {
    start: number;
    end: number;
  };
  loop_idx: number;
}

/** Timeline tracks container */
export interface TimelineTracks {
  video: ClipTrack[];
  subtitles: SubtitleTrack[];
  voiceover: VoiceoverTrack[];
  bgm: BgmTrack[];
}

/** Full Timeline entity */
export interface Timeline {
  video_volume: number;
  voiceover_volume: number;
  bgm_volume: number;
  tracks: TimelineTracks;
}

/** Canonical empty timeline */
export const EMPTY_TIMELINE: Timeline = {
  video_volume: 1.0,
  voiceover_volume: 2.0,
  bgm_volume: 0.25,
  tracks: {
    video: [],
    subtitles: [],
    voiceover: [],
    bgm: [],
  },
};

// =============================================================================
// Project Entity
// =============================================================================

export interface Project {
  id: UUID;
  name: string;
  created_at: ISO8601;
  updated_at: ISO8601;
  media: MediaAsset[];
}

/** Lightweight project summary for listing */
export interface ProjectSummary {
  id: UUID;
  name: string;
  created_at: ISO8601;
  updated_at: ISO8601;
  thumbnail_url: string | null;
}

// =============================================================================
// ChatMessage Entity
// =============================================================================

export type ChatMessageRole = 'user' | 'assistant' | 'tool_progress';

export interface ChatMessage {
  id: UUID;
  role: ChatMessageRole;
  content: string;
  timestamp: ISO8601;
  tool_name: string | null;
}

// =============================================================================
// ExportJob Entity
// =============================================================================

export type ExportJobStatus = 'pending' | 'running' | 'done' | 'error';

export type ExportResolution = 'source' | '1080p' | '720p' | '480p';

export interface ExportJob {
  job_id: UUID;
  project_id: UUID;
  status: ExportJobStatus;
  progress: number;
  estimated_time_remaining: number | null;
  download_url: string | null;
  error_message: string | null;
  created_at: ISO8601;
  resolution: ExportResolution;
  output_path: string | null;
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export type WSEventType = 'chat_message' | 'tool_progress' | 'timeline_update' | 'error' | 'media_update';

/** Base WebSocket event envelope */
export interface WSEventBase {
  type: WSEventType;
  session_id: UUID;
  timestamp: ISO8601;
}

/** Asset mention in chat message */
export interface AssetMention {
  asset_id: UUID;
  asset_name: string;
}

/** chat_message event (bidirectional) */
export interface WSChatMessageEvent extends WSEventBase {
  type: 'chat_message';
  role: 'user' | 'assistant';
  content: string;
  mentions?: AssetMention[];
}

/** tool_progress event (server -> client) */
export type ToolProgressStatus = 'started' | 'completed' | 'failed';

export interface WSToolProgressEvent extends WSEventBase {
  type: 'tool_progress';
  tool_name: string;
  status: ToolProgressStatus;
  detail: string | null;
}

/** timeline_update event (server -> client) */
export interface WSTimelineUpdateEvent extends WSEventBase {
  type: 'timeline_update';
  timeline: Timeline;
}

/** error event (server -> client) */
export interface WSErrorEvent extends WSEventBase {
  type: 'error';
  code: string;
  message: string;
}

/** media_update event (server -> client) */
export interface WSMediaUpdateEvent extends WSEventBase {
  type: 'media_update';
  asset_id: UUID;
  status: MediaAssetStatus;
  error_message: string | null;
}

/** Union type for all WebSocket events */
export type WSEvent =
  | WSChatMessageEvent
  | WSToolProgressEvent
  | WSTimelineUpdateEvent
  | WSErrorEvent
  | WSMediaUpdateEvent;

// =============================================================================
// API Request/Response Types
// =============================================================================

/** Create project request */
export interface CreateProjectRequest {
  name: string;
}

/** Rename project request */
export interface RenameProjectRequest {
  name: string;
}

/** Update timeline request */
export interface UpdateTimelineRequest {
  timeline: Timeline;
}

/** Start export request */
export interface StartExportRequest {
  resolution?: ExportResolution;
}

/** Preview frame query params */
export interface PreviewFrameParams {
  project_id: UUID;
  timecode: number; // milliseconds
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Type guard for WSChatMessageEvent */
export function isChatMessageEvent(event: WSEvent): event is WSChatMessageEvent {
  return event.type === 'chat_message';
}

/** Type guard for WSToolProgressEvent */
export function isToolProgressEvent(event: WSEvent): event is WSToolProgressEvent {
  return event.type === 'tool_progress';
}

/** Type guard for WSTimelineUpdateEvent */
export function isTimelineUpdateEvent(event: WSEvent): event is WSTimelineUpdateEvent {
  return event.type === 'timeline_update';
}

/** Type guard for WSErrorEvent */
export function isErrorEvent(event: WSEvent): event is WSErrorEvent {
  return event.type === 'error';
}

/** Type guard for WSMediaUpdateEvent */
export function isMediaUpdateEvent(event: WSEvent): event is WSMediaUpdateEvent {
  return event.type === 'media_update';
}

/** Get media type category from MIME type */
export function getMediaAssetType(mimeType: string): MediaAssetType | null {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
}

/** Calculate total timeline duration from tracks */
export function getTimelineDuration(timeline: Timeline): number {
  const tracks = timeline.tracks;
  let maxEnd = 0;

  // Check video clips
  for (const clip of tracks.video) {
    const end = clip.timeline_window.end;
    if (end > maxEnd) maxEnd = end;
  }

  // Check subtitles
  for (const sub of tracks.subtitles) {
    const end = sub.timeline_window.end;
    if (end > maxEnd) maxEnd = end;
  }

  // Check voiceover
  for (const vo of tracks.voiceover) {
    const end = vo.timeline_window.end;
    if (end > maxEnd) maxEnd = end;
  }

  // Check bgm (may loop)
  for (const bgm of tracks.bgm) {
    const end = bgm.source_window.end;
    if (end > maxEnd) maxEnd = end;
  }

  return maxEnd;
}

/** Format time in milliseconds to mm:ss */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Format time in milliseconds to HH:MM:SS */
export function formatTimeExtended(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
