# REST API Contract — Chat-Native Video Editor

**Feature**: 001-chat-native-editor  
**Base URL**: `http://localhost:<port>` (localhost-only binding per FR-015)  
**Content-Type**: `application/json` for all request/response bodies unless noted  
**Auth**: None (single-user local deployment, FR-015)

All endpoints are added to the existing `agent_fastapi.py` FastAPI application (FR-017).

---

## Project Management

### GET /projects

List all projects.

**Response 200**:
```json
[
  {
    "id": "<uuid>",
    "name": "<string>",
    "created_at": "<ISO-8601>",
    "updated_at": "<ISO-8601>",
    "thumbnail_url": "<string | null>"
  }
]
```

`thumbnail_url` is derived from the first `ready` video/image asset, or `null` if none.

---

### POST /projects

Create a new project.

**Request body**:
```json
{ "name": "<string, 1–200 chars, required>" }
```

**Response 201**:
```json
{
  "id": "<uuid>",
  "name": "<string>",
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>",
  "media": []
}
```

Initializes `project.json`, `timeline.json` (empty), and `chat_history.json` (empty) on disk.

---

### GET /projects/{project_id}

Get full project metadata (does NOT include chat history inline).

**Path params**: `project_id` — UUID string

**Response 200**:
```json
{
  "id": "<uuid>",
  "name": "<string>",
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>",
  "media": [ { "...": "MediaAsset objects" } ]
}
```

**Response 404**: Project not found.

---

### PATCH /projects/{project_id}

Rename a project.

**Request body**:
```json
{ "name": "<string, 1–200 chars>" }
```

**Response 200**: Updated project object (same schema as GET /projects/{project_id}).

**Response 404**: Project not found.

---

### DELETE /projects/{project_id}

Delete a project and all its contents (media files, JSON state, export jobs).

**Response 204**: No content.

**Response 404**: Project not found.

---

### GET /projects/{project_id}/chat_history

Get the full ordered chat history for a project.

**Response 200**:
```json
[
  {
    "id": "<uuid>",
    "role": "<\"user\" | \"assistant\" | \"tool_progress\">",
    "content": "<string>",
    "timestamp": "<ISO-8601>",
    "tool_name": "<string | null>"
  }
]
```

Returns `[]` when no messages exist.

---

## Media Management

### POST /projects/{project_id}/media

Upload a media asset.

**Content-Type**: `multipart/form-data`  
**Form field**: `file` — binary file data

**Response 201** (immediate):
```json
{
  "id": "<uuid>",
  "name": "<original filename>",
  "type": "<MIME type>",
  "size": "<integer bytes>",
  "status": "uploading"
}
```

After response: server asynchronously processes file through FFmpeg (`uploading` → `processing` → `ready` / `error`) and emits `media_update` WebSocket events on each transition.

**Response 415**: MIME type not in `video/*`, `audio/*`, or `image/*`.
```json
{ "detail": "<human-readable error message>" }
```

---

### GET /projects/{project_id}/media/{asset_id}/thumbnail

Serve the FFmpeg-generated thumbnail or waveform image for an asset.

**Response 200** (asset status == `ready`):
- `Content-Type: image/jpeg` for video/image assets
- `Content-Type: image/png` for audio assets (waveform)
- `Cache-Control: max-age=31536000, immutable`

**Response 404**: Asset does not exist.

**Response 409**: Asset status is not `ready`.

---

### DELETE /projects/{project_id}/media/{asset_id}

Delete a media asset from the library.

**Response 204**: Asset deleted successfully.

**Response 409** (asset referenced by timeline clips):
```json
{
  "conflict": true,
  "referencing_clip_ids": ["<clip_id>", "..."]
}
```

**Response 404**: Asset does not exist.

Assets in `uploading` or `processing` state may be deleted (in-flight FFmpeg process is cancelled).

---

## Preview

### GET /preview/frame

Extract and return a composited preview frame at the given timecode.

**Query params**:
- `project_id` (string, required) — UUID of the project
- `timecode` (integer, required) — Time position in **milliseconds**

**Response 200**:
- `Content-Type: image/jpeg`
- Body: JPEG image of the composited frame

**Response 408** (Request Timeout): FFmpeg extraction exceeded 500 ms.

**Response 404**: Project not found or timeline is empty.

**Performance target**: p95 ≤ 200 ms under single-user local load (SC-007).

---

## Export

### POST /projects/{project_id}/export

Initiate an async video export job.

**Request body** (optional fields):
```json
{ "resolution": "<source | 1080p | 720p | 480p>" }
```

Default `resolution` is `source` when omitted.

**Response 202**:
```json
{ "job_id": "<uuid>" }
```

**Response 409** (export already active):
```json
{
  "job_id": "<uuid of active job>",
  "status": "<pending | running>"
}
```

---

### GET /projects/{project_id}/export/{job_id}

Poll export job status.

**Response 200**:
```json
{
  "job_id": "<uuid>",
  "status": "<pending | running | done | error>",
  "progress": "<integer 0–100>",
  "estimated_time_remaining": "<positive integer seconds | null>",
  "download_url": "<relative URL string | null>",
  "error_message": "<string | null>"
}
```

- `download_url` is present only when `status == "done"`.
- `error_message` is present only when `status == "error"`.
- `estimated_time_remaining` is `null` when status is `pending`, `done`, or `error`, or when an estimate is unavailable.

**Response 404**: Job not found.

---

## WebSocket Chat

### WS /ws/chat/{session_id}

Bidirectional WebSocket for AI chat and real-time events.

`session_id` MUST equal the `project_id` UUID (1:1 mapping per FR-017).

#### Client → Server Messages

**chat_message**:
```json
{
  "type": "chat_message",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "role": "user",
  "content": "<string>",
  "mentions": [
    { "asset_id": "<uuid>", "asset_name": "<string>" }
  ]
}
```

`mentions` is optional; omit or send `[]` when no @ mentions.

#### Server → Client Messages

All server messages carry: `type`, `session_id`, `timestamp`.

**chat_message** (AI response):
```json
{
  "type": "chat_message",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "role": "assistant",
  "content": "<string>"
}
```

**tool_progress**:
```json
{
  "type": "tool_progress",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "tool_name": "<string>",
  "status": "<started | completed | failed>",
  "detail": "<string | null>"
}
```

**timeline_update** (complete replacement):
```json
{
  "type": "timeline_update",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "timeline": {
    "video_volume": 1.0,
    "voiceover_volume": 2.0,
    "bgm_volume": 0.25,
    "tracks": {
      "video": [],
      "subtitles": [],
      "voiceover": [],
      "bgm": []
    }
  }
}
```

**error**:
```json
{
  "type": "error",
  "session_id": "<uuid>",
  "timestamp": "<ISO-8601>",
  "code": "<ASSET_NOT_FOUND | AGENT_BUSY | ...>",
  "message": "<string>"
}
```

**media_update**:
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

#### Connection Lifecycle

1. Client opens `WS /ws/chat/{session_id}`.
2. Server lazily creates agent via `build_agent()` for the session.
3. Server reloads `chat_history.json` to restore context.
4. Session active — bidirectional message exchange.
5. Connection closes → server releases agent instance (no state retained).
6. On reconnect → repeat from step 1 (stateless server reconnect per FR-017).

#### Serial Processing Guarantee (FR-023)

- Server maintains `is_processing` (bool) per session.
- One message processed at a time; at most one pending queued.
- If queue full: server emits `error` with `code: "AGENT_BUSY"` and discards excess.
