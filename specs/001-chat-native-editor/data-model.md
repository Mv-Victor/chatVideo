# Data Model: Chat-Native Video Editor (001-chat-native-editor)

**Phase**: 1 — Design & Contracts  
**Branch**: `001-chat-native-editor`  
**Date**: 2026-04-13

---

## Overview

This document defines all persistent data entities, their fields, validation rules,
state machines, and relationships. All data is stored as JSON files on local disk
under `~/.open_storyline/projects/` (no external database per Constitution Principle V).

---

## 1. Project Entity

**File**: `~/.open_storyline/projects/<project_id>/project.json`

```json
{
  "id": "<uuid-v4>",
  "name": "<string, 1–200 chars>",
  "created_at": "<ISO-8601 datetime>",
  "updated_at": "<ISO-8601 datetime>",
  "media": [
    { "...": "see MediaAsset below" }
  ]
}
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `id` | UUID string | Yes | UUID v4 format; immutable after creation |
| `name` | string | Yes | 1–200 characters; trimmed |
| `created_at` | ISO-8601 string | Yes | Set at creation; immutable |
| `updated_at` | ISO-8601 string | Yes | Updated on every write |
| `media` | MediaAsset[] | Yes | Array, may be empty |

### Relationships

- 1 Project → N MediaAssets (embedded in `project.json`)
- 1 Project → 1 Timeline (separate `timeline.json`)
- 1 Project → N ChatMessages (separate `chat_history.json`)
- 1 Project → N ExportJobs (separate files in `exports/` subdirectory)

---

## 2. MediaAsset Entity

**Embedded in**: `project.json` → `media` array

```json
{
  "id": "<uuid-v4>",
  "name": "<original filename>",
  "type": "<MIME type — video/*, audio/*, image/*>",
  "size": "<integer bytes>",
  "status": "<uploading | processing | ready | error>",
  "error_message": "<string | null>",
  "created_at": "<ISO-8601 datetime>",
  "duration_ms": "<integer milliseconds | null>",
  "width": "<integer pixels | null>",
  "height": "<integer pixels | null>",
  "thumbnail_url": "<relative URL string | null>",
  "path": "<absolute filesystem path to asset file>"
}
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `id` | UUID string | Yes | UUID v4; generated on upload; immutable |
| `name` | string | Yes | Original filename; 1–500 chars |
| `type` | string | Yes | MIME type; must match `video/*`, `audio/*`, or `image/*` |
| `size` | integer | Yes | File size in bytes; ≥ 0 |
| `status` | enum | Yes | One of: `uploading`, `processing`, `ready`, `error` |
| `error_message` | string or null | No | Present only when `status == "error"` |
| `created_at` | ISO-8601 string | Yes | Timestamp of upload initiation |
| `duration_ms` | integer or null | No | Duration in milliseconds; present after processing for video/audio |
| `width` | integer or null | No | Pixel width; present after processing for video/image |
| `height` | integer or null | No | Pixel height; present after processing for video/image |
| `thumbnail_url` | string or null | No | Relative URL `/projects/<pid>/media/<id>/thumbnail`; null until `ready` |
| `path` | string | Yes | Absolute filesystem path to asset file |

### State Machine

```
[initial] ──upload_start──► uploading
uploading ──file_received──► processing
processing ──ffmpeg_ok──► ready
processing ──ffmpeg_fail──► error
error ──retry_requested──► processing
uploading ──delete_requested──► [deleted] (cancel in-flight FFmpeg)
processing ──delete_requested──► [deleted] (cancel in-flight FFmpeg)
ready ──delete_requested──► [deleted] (only if no timeline references)
```

### Validation Rules

- Assets in `uploading` or `processing` state MUST NOT be draggable to the timeline.
- `DELETE` on an asset referenced by timeline clips MUST return HTTP 409 (FR-020).
- Only MIME types matching `video/*`, `audio/*`, or `image/*` are accepted (HTTP 415 otherwise).

---

## 3. Timeline Entity

**File**: `~/.open_storyline/projects/<project_id>/timeline.json`

```json
{
  "video_volume": 1.0,
  "voiceover_volume": 2.0,
  "bgm_volume": 0.25,
  "tracks": {
    "video": [ /* ClipTrack[] */ ],
    "subtitles": [ /* SubtitleTrack[] */ ],
    "voiceover": [ /* VoiceoverTrack[] */ ],
    "bgm": [ /* BgmTrack[] */ ]
  }
}
```

### Top-Level Volume Fields

| Field | Type | Default | Range | Maps to RenderVideoInput |
|-------|------|---------|-------|--------------------------|
| `video_volume` | float | 1.0 | 0.0–2.0 | `video_volume_scale` |
| `voiceover_volume` | float | 2.0 | 0.0–2.0 | `tts_volume_scale` |
| `bgm_volume` | float | 0.25 | 0.0–2.0 | `bgm_volume_scale` |

### ClipTrack (video array element)

```json
{
  "clip_id": "<string>",
  "group_id": "<string>",
  "kind": "<\"video\" | \"image\">",
  "path": "<string — absolute path to processed clip file>",
  "fps": "<float | null>",
  "source_path": "<string | null>",
  "source_window": { "start": "<int ms>", "end": "<int ms>", "duration": "<int ms>" },
  "timeline_window": { "start": "<int ms>", "end": "<int ms>", "duration": "<int ms>" },
  "playback_rate": "<float>"
}
```

### SubtitleTrack (subtitles array element)

```json
{
  "group_id": "<string>",
  "unit_id": "<string>",
  "index_in_group": "<int — 0-based>",
  "text": "<string>",
  "timeline_window": { "start": "<int ms>", "end": "<int ms>" }
}
```

### VoiceoverTrack (voiceover array element)

```json
{
  "group_id": "<string>",
  "voiceover_id": "<string>",
  "path": "<string — absolute path to audio file>",
  "source_window": { "start": "<int ms>", "end": "<int ms>", "duration": "<int ms>" },
  "timeline_window": { "start": "<int ms>", "end": "<int ms>", "duration": "<int ms>" }
}
```

### BgmTrack (bgm array element)

```json
{
  "bgm_id": "<string>",
  "path": "<string — absolute path to BGM audio file>",
  "source_window": { "start": "<int ms>", "end": "<int ms>" },
  "loop_idx": "<int — 0-based>"
}
```

### Validation Rules

- All time values MUST be integers in milliseconds (FR-021).
- `timeline_window.end > timeline_window.start` for all tracks.
- `source_window.end > source_window.start` for clip/voiceover tracks.
- Volume fields MUST be in range [0.0, 2.0].
- Canonical empty timeline:
  ```json
  {"video_volume": 1.0, "voiceover_volume": 2.0, "bgm_volume": 0.25,
   "tracks": {"video": [], "subtitles": [], "voiceover": [], "bgm": []}}
  ```

---

## 4. ChatMessage Entity

**File**: `~/.open_storyline/projects/<project_id>/chat_history.json`

```json
[
  {
    "id": "<uuid-v4>",
    "role": "<\"user\" | \"assistant\" | \"tool_progress\">",
    "content": "<string>",
    "timestamp": "<ISO-8601 string>",
    "tool_name": "<string | null — present only when role == \"tool_progress\">"
  }
]
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `id` | UUID string | Yes | Unique per message; UUID v4 |
| `role` | enum | Yes | One of: `"user"`, `"assistant"`, `"tool_progress"` |
| `content` | string | Yes | Display text; may be empty for tool_progress payloads |
| `timestamp` | ISO-8601 string | Yes | UTC time of message creation |
| `tool_name` | string or null | No | Present only when `role == "tool_progress"` |

---

## 5. ExportJob Entity

**File**: `~/.open_storyline/projects/<project_id>/exports/<job_id>.json`

```json
{
  "job_id": "<uuid-v4>",
  "project_id": "<uuid-v4>",
  "status": "<pending | running | done | error>",
  "progress": "<integer 0–100>",
  "estimated_time_remaining": "<positive integer seconds | null>",
  "download_url": "<relative URL string | null>",
  "error_message": "<string | null>",
  "created_at": "<ISO-8601 string>",
  "resolution": "<source | 1080p | 720p | 480p>",
  "output_path": "<absolute filesystem path | null>"
}
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `job_id` | UUID string | Yes | UUID v4; immutable |
| `project_id` | UUID string | Yes | References parent project |
| `status` | enum | Yes | One of: `pending`, `running`, `done`, `error` |
| `progress` | integer | Yes | 0–100 |
| `estimated_time_remaining` | integer or null | No | Positive seconds; null when not applicable |
| `download_url` | string or null | No | Present only when `status == "done"` |
| `error_message` | string or null | No | Present only when `status == "error"` |
| `created_at` | ISO-8601 string | Yes | Job creation timestamp |
| `resolution` | enum | Yes | One of: `source`, `1080p`, `720p`, `480p` |
| `output_path` | string or null | No | Absolute path to rendered MP4; present when done |

### State Machine

```
[created] ──enqueue──► pending
pending ──processing_starts──► running
running ──ffmpeg_done──► done
running ──ffmpeg_error──► error
pending/running ──server_restart──► error (with error_message: "Export job interrupted by server restart")
```

### Constraint

At most ONE export job per project may be in `pending` or `running` state at any time.
Attempting to create a second while one is active returns HTTP 409 (FR-011).

---

## 6. WebSocket Event Schemas

All events share a common envelope:

```json
{
  "type": "<event_type>",
  "session_id": "<project_id uuid>",
  "timestamp": "<ISO-8601 string>"
}
```

### chat_message (bidirectional)

```json
{
  "type": "chat_message",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "role": "<\"user\" | \"assistant\">",
  "content": "<string>",
  "mentions": [
    { "asset_id": "<uuid>", "asset_name": "<string>" }
  ]
}
```

- `mentions` is optional; omitted or empty array when no @ mentions.
- `role: "user"` messages originate from the frontend.
- `role: "assistant"` messages originate from the backend AI.

### tool_progress (server → client)

```json
{
  "type": "tool_progress",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "tool_name": "<string>",
  "status": "<\"started\" | \"completed\" | \"failed\">",
  "detail": "<string | null>"
}
```

### timeline_update (server → client)

```json
{
  "type": "timeline_update",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "timeline": { "...": "full Timeline JSON per FR-021 / data-model.md §3" }
}
```

- MUST always carry the complete timeline state (no partial diffs in v1).
- Frontend MUST clear undo/redo stack on receipt.

### error (server → client)

```json
{
  "type": "error",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "code": "<string — e.g., ASSET_NOT_FOUND, AGENT_BUSY>",
  "message": "<string — human-readable>"
}
```

### media_update (server → client)

```json
{
  "type": "media_update",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "asset_id": "<uuid>",
  "status": "<uploading | processing | ready | error>",
  "error_message": "<string | null>"
}
```

---

## 7. Filesystem Layout

```text
~/.open_storyline/projects/
└── <project_id>/                          # One directory per project
    ├── project.json                       # Project metadata + media asset array
    ├── timeline.json                      # Full timeline state (FR-021 schema)
    ├── chat_history.json                  # Ordered chat message array
    ├── media/                             # Uploaded asset files
    │   ├── <asset_id>.<ext>               # Original uploaded file
    │   ├── <asset_id>_thumbnail.jpg       # FFmpeg-generated thumbnail (video/image)
    │   └── <asset_id>_waveform.png        # librosa-generated waveform (audio)
    └── exports/                           # Export job records
        └── <job_id>.json                  # One file per export job
```

---

## 8. Entity Relationship Summary

```
Project (1)
  ├── (N) MediaAsset   [embedded in project.json → media[]]
  ├── (1) Timeline     [timeline.json]
  │     ├── (N) ClipTrack     [references MediaAsset by path]
  │     ├── (N) SubtitleTrack
  │     ├── (N) VoiceoverTrack
  │     └── (N) BgmTrack
  ├── (N) ChatMessage  [chat_history.json]
  └── (N) ExportJob    [exports/<job_id>.json]
```

---

## 9. Frontend State Model (Zustand Slices)

### timelineSlice

```typescript
interface TimelineSlice {
  timeline: Timeline | null;
  undoStack: Timeline[];   // max 20
  redoStack: Timeline[];   // max 20
  pushUndo: (prev: Timeline) => void;
  undo: () => void;
  redo: () => void;
  applyAIUpdate: (t: Timeline) => void;  // clears undo/redo stack
}
```

### chatSlice

```typescript
interface ChatSlice {
  messages: ChatMessage[];
  isProcessing: boolean;
  addMessage: (m: ChatMessage) => void;
  setProcessing: (v: boolean) => void;
}
```

### mediaSlice

```typescript
interface MediaSlice {
  assets: MediaAsset[];
  setAssets: (a: MediaAsset[]) => void;
  updateAsset: (id: string, patch: Partial<MediaAsset>) => void;
}
```

### projectSlice

```typescript
interface ProjectSlice {
  currentProject: Project | null;
  projects: ProjectSummary[];
  setCurrentProject: (p: Project) => void;
  setProjects: (ps: ProjectSummary[]) => void;
}
```
