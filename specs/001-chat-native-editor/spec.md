# Feature Specification: Chat-Native Video Editor Web Application

**Feature Branch**: `001-chat-native-editor`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "参考~/work/Mr.Director和chatcut.png，基于本项目研发一个chat-naive的剪辑网站，可以通过与AI对话实现视频剪辑和当前项目的功能，并拥有素材管理、timeline base的交互页面等等能力。UI参考~/work/Mr.Director、chatcut.png和/Users/huangzhidong/work/youpac-ai"

## Overview

A web-based, chat-native video editing application built on top of FireRed-OpenStoryline's
existing MCP/Agent backend. Users interact with an AI through natural language conversation
to accomplish all video editing tasks — from uploading media and generating scripts, to
assembling timelines and exporting finished videos. The interface follows a three-panel
layout (Media Library | Preview + Timeline | Chat), inspired by Mr.Director and chatcut.png,
with a dark, professional aesthetic consistent with youpac-ai.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversational Video Creation from Scratch (Priority: P1)

A user opens the web app, uploads one or more video/image/audio files through the media
library panel, then types a natural language request in the chat panel (e.g., "把这段素材
剪成一个30秒的产品介绍视频，用兴趣电商风格"). The AI agent (powered by the existing
OpenStoryline backend) processes the request, responds with a plan summary in the chat,
assembles a timeline, and the user immediately sees clips arranged on the timeline and
a preview render in the center panel. The user refines via follow-up chat messages.

**Why this priority**: This is the core value proposition — the entire product is defined
by the ability to create and edit video through conversation. Without this, nothing else
matters.

**Independent Test**: Upload 2 video clips, type a creation instruction, verify the
timeline populates with clips and the chat shows AI progress messages and a final summary.

**Acceptance Scenarios**:

1. **Given** a user has uploaded at least one media file, **When** they type an editing
   instruction in the chat input and submit, **Then** the AI responds with a step-by-step
   progress update and the timeline reflects the resulting clip arrangement within 60 seconds.
2. **Given** an AI-generated timeline exists, **When** the user sends a follow-up message
   such as "把背景音乐音量调低一些", **Then** the AI updates only the relevant timeline
   elements and the chat confirms the change made.
3. **Given** the AI is processing a request, **When** the user views the chat panel,
   **Then** they see real-time progress indicators (e.g., "正在分析素材…", "已写入时间线")
   rather than a blank waiting state.

---

### User Story 2 - Timeline-Based Manual Editing (Priority: P2)

A user who has an AI-generated (or partially assembled) timeline wants to make precise
manual adjustments: drag clips to reorder, trim clip in/out points, adjust track volumes,
and scrub the playhead. These interactions happen directly on the timeline without going
through the chat.

**Why this priority**: Chat-native doesn't mean chat-only. Power users and precise edits
require direct timeline manipulation. This makes the product usable for real production work.

**Independent Test**: With a timeline containing at least 3 clips, drag one clip to a new
position, trim its end point, scrub the playhead, and verify the preview updates to match.

**Acceptance Scenarios**:

1. **Given** a timeline with multiple clips on a video track, **When** the user drags
   a clip to a new position, **Then** the clip moves and other clips shift accordingly
   with snapping to nearby clip boundaries.
2. **Given** a clip on the timeline, **When** the user drags its left or right edge,
   **Then** the clip is trimmed and the preview reflects the new in/out points.
3. **Given** a timeline, **When** the user clicks anywhere on the timeline ruler,
   **Then** the playhead moves to that time position and the preview frame updates
   to match.
4. **Given** any manual edit, **When** the user presses undo (Ctrl/Cmd+Z), **Then**
   the edit is reversed; redo restores it.

---

### User Story 3 - Media Library Management (Priority: P3)

A user manages their project's raw assets through a dedicated media library panel.
They can upload new files (video, audio, images), see thumbnails/waveforms, search/filter
by type, and drag assets from the library directly onto the timeline. Uploaded assets
persist across sessions for the same project.

**Why this priority**: Media management is foundational infrastructure but a complete
media library (with search, filtering, drag-to-timeline) is a significant UX enhancement
over a minimal upload flow.

**Independent Test**: Upload 3 different media types (video, audio, image), filter by
type, and drag one item from the library onto the timeline — verify it appears as a
new clip at the drop position.

**Acceptance Scenarios**:

1. **Given** the media library panel, **When** a user drags a local file into the panel
   or clicks the upload button, **Then** the file appears in the library with a thumbnail
   (or waveform for audio) and its duration.
2. **Given** a media library with multiple items, **When** the user selects filter "视频"
   or "音频", **Then** only assets of that type are shown.
3. **Given** a media asset in the library, **When** the user drags it to the timeline,
   **Then** a new clip is created at the drop position on the appropriate track type.
4. **Given** the user references a media asset in chat using "@" mention (e.g., "@clip1.mp4
   截取前5秒"), **Then** the AI correctly identifies and operates on that specific asset.

---

### User Story 4 - Video Preview with Playback Controls (Priority: P4)

A user can preview the assembled video in real time from the center panel without
exporting. The preview renders the current timeline state — multi-track compositing,
subtitles, audio mix — and supports play/pause, scrub, and volume control. Changes
made via chat or manual timeline edits update the preview immediately.

**Why this priority**: Preview is essential for evaluating edits, but it's listed P4
because a basic preview can be delivered alongside the timeline (P2) and can be
progressively enhanced.

**Independent Test**: With a timeline containing a video clip and an audio clip, press
play — verify both audio and video play in sync; make a chat edit; verify the preview
reflects the change.

**Acceptance Scenarios**:

1. **Given** a timeline with at least one video clip, **When** the user clicks play,
   **Then** the preview area plays back the video starting from the current playhead
   position with correct audio.
2. **Given** a playing preview, **When** the timeline is updated by the AI agent,
   **Then** playback pauses and the preview snaps to the updated timeline state.
3. **Given** subtitle clips on the timeline, **When** previewing, **Then** subtitles
   appear overlaid on the video at the correct time positions.

---

### User Story 5 - Project Export (Priority: P5)

A user completes editing and wants to export the final video. They click an export
button (or ask the AI \"导出视频\"), optionally select an output resolution preset
(source / 1080p / 720p / 480p), and receive a downloadable MP4 file (H.264/AAC).
The export process shows percentage progress feedback and an estimated time remaining.

**Why this priority**: Export is the ultimate deliverable but can be delivered as
a later increment once the editing workflow is solid.

**Independent Test**: With a complete timeline, trigger export at `720p` resolution,
wait for completion, download the MP4, and play the output file — verify it is a valid
MP4 with H.264 video and AAC audio at 1280×720 that matches the timeline composition.

**Acceptance Scenarios**:

1. **Given** a finalized timeline, **When** the user clicks the export button or
   instructs the AI to export, **Then** an export job is created, a percentage progress
   indicator (0–100%) and estimated time remaining appear in the UI, and a download
   link to the rendered MP4 is provided upon the job reaching `done` status.
2. **Given** an export in progress, **When** the user views the UI, **Then** they
   see percentage progress and an estimated time remaining.
3. **Given** the export button UI, **When** the user opens it, **Then** they can
   select from resolution presets: source (default), 1080p, 720p, 480p; the selected
   preset is passed to `POST /projects/{project_id}/export` as the `resolution` field.

---

### Edge Cases

- What happens when a user attempts to delete a media asset that is currently referenced by one or more timeline clips?
  The `DELETE /projects/{project_id}/media/{asset_id}` endpoint MUST return HTTP 409 Conflict with a JSON body listing the referencing clip IDs (see FR-020). The frontend MUST present a confirmation dialog; on confirmation it removes the referencing clips from the timeline first, then retries the deletion.
- What happens when a user uploads a file format not supported by FFmpeg?
  The system MUST show a clear error message identifying the unsupported format.
- What happens when the AI agent fails mid-task (e.g., API timeout)?
  The chat MUST display an error message and the timeline MUST remain in its last valid state.
- What happens when the user sends a chat message referencing a media file that
  has been deleted from the library? The AI MUST acknowledge the missing asset and
  prompt the user to re-upload or choose an alternative.
- What happens when the user tries to drag a clip beyond the timeline's current
  duration boundary? The timeline MUST extend automatically.
- What happens if two browser tabs open the same project simultaneously?
  The system should show a conflict warning; last-write-wins is acceptable for v1.
- What happens when the WebSocket connection drops mid-session?
  The frontend MUST automatically attempt to reconnect using exponential backoff (initial interval: 1 second, maximum interval: 30 seconds, maximum attempts: 5). During reconnection attempts the UI MUST display a non-blocking \"Reconnecting...\" status indicator in the chat panel header. After 5 consecutive failed reconnection attempts the UI MUST display a persistent error banner with a manual \"Reconnect\" button. On successful reconnection the frontend MUST re-subscribe to the active session using the stored `session_id`. The timeline state and chat history MUST be preserved from local in-memory state during the disconnection period so that no user data is lost from a transient dropped connection.
- What happens when FFmpeg processing fails or times out for a media asset after upload?
  The asset's `status` field MUST be set to `error` in `project.json` with a human-readable `error_message`. The media library MUST display an error badge on the asset thumbnail. A \"Retry\" action MUST be available to re-trigger FFmpeg processing for that asset. The timeline MUST NOT contain any clips referencing the failed asset.

## Clarifications

### Session 2026-04-13

- Q: What is the security and API key protection model for the new web layer that proxies to the MCP/Agent backend? → A: The web server MUST read all API keys exclusively from `config.toml` (never from environment variables passed through the browser or embedded in frontend code). The HTTP/WebSocket adapter MUST bind only to `localhost` (127.0.0.1) by default for v1. CORS MUST be restricted to the same origin. No authentication mechanism is required for v1 given single-user local operation, but the server MUST NOT bind to `0.0.0.0` without an explicit user configuration override.
- Q: What is the WebSocket message schema / communication protocol between the frontend and the HTTP/WebSocket adapter for AI progress events, timeline updates, and tool call results? → A: All WebSocket messages MUST be JSON-framed with a typed `event` discriminator field. The protocol defines the following canonical event types: `chat_message` (user or AI text turn), `tool_progress` (tool call name, status, and optional detail payload), `timeline_update` (full or partial timeline JSON matching the existing backend Timeline schema), and `error` (code and human-readable message). Every message MUST carry a top-level `type` string field (the event discriminator), a `session_id` string field, and an ISO-8601 `timestamp` string field. The frontend MUST ignore unknown `type` values to allow forward compatibility.
- Q: What is the merge strategy when the frontend receives a `timeline_update` event — does a partial payload mean replace-only-named-tracks or replace-entire-timeline? → A: For v1, every `timeline_update` event MUST carry the **complete** timeline state (all tracks and all clips). The frontend MUST replace its entire local timeline state atomically on receipt. Partial/diff-style timeline updates are deferred to post-v1. This eliminates any client-side merge ambiguity and prevents stale-clip rendering bugs.
- Q: What is the WebSocket disconnection and reconnection behavior when the connection drops mid-session? → A: The frontend MUST automatically attempt to reconnect using exponential backoff (initial interval: 1 second, maximum interval: 30 seconds, maximum attempts: 5). During reconnection the UI MUST show a non-blocking "Reconnecting..." status indicator in the chat panel header. After 5 failed attempts a persistent error banner with a manual "Reconnect" button MUST be shown. On successful reconnection the frontend MUST re-subscribe to the active session using the stored `session_id`. Timeline state and chat history MUST be preserved from local in-memory state during disconnection (no data loss from transient drops).
- Q: How does the new HTTP/WebSocket adapter integrate with the existing backend — is it a new separate service, or does it extend the existing agent_fastapi.py process? → A: The new chat-native editor is implemented as an **in-process extension of the existing `agent_fastapi.py` FastAPI application**. New WebSocket chat endpoints (e.g., `/ws/chat/{session_id}`) and REST endpoints for project/media management are added directly to `agent_fastapi.py`. The React SPA frontend is served as static files from the same FastAPI process. No new server process or separate HTTP service is introduced. The adapter reuses `build_agent()` from `src/open_storyline/agent.py` directly — the same function already used by `agent_fastapi.py` — to obtain a LangChain agent and `NodeManager` per session. This approach satisfies Constitution Principle V (simplicity, no new abstraction layer without concrete need) and Principle I (conversational-first through the existing agent runtime).
- Q: What is the server-side persistence mechanism for project state (timeline, media library references, chat history)? → A: Project state MUST be persisted as **JSON files on local disk** with zero new database dependencies (consistent with Constitution Principle V — simplicity). Each project is stored as a dedicated directory under a configurable root data directory (default: `~/.open_storyline/projects/<project_id>/`). The directory contains: `project.json` (project metadata: id, name, created_at, updated_at), `timeline.json` (full timeline state matching the existing backend Timeline schema), `chat_history.json` (ordered list of chat messages including tool progress events), and a `media/` subdirectory holding uploaded asset files. Media asset metadata (duration, dimensions, type, thumbnail path) is stored in `project.json` alongside project metadata. Reads and writes MUST use atomic file replacement (write to a `.tmp` file then rename) to prevent corruption on crash. No external database engine (SQLite, PostgreSQL, Redis) is required or permitted for v1.
- Q: What are the lifecycle states of a Media Asset through the upload and processing pipeline? → A: A Media Asset transitions through four states stored in its `status` field in `project.json`: `uploading` (file bytes being received by the server), `processing` (FFmpeg is generating thumbnail, waveform, and extracting duration/dimensions metadata), `ready` (asset is fully processed and available for use), and `error` (processing failed; an additional `error_message` string field MUST be populated with a human-readable description). Assets in `uploading` or `processing` state MUST NOT be draggable to the timeline and MUST render a progress indicator in the media library. Assets in `error` state MUST display an error badge in the media library thumbnail with a \"Retry\" action that re-triggers FFmpeg processing. State transitions are: `uploading` → `processing` (on file receipt complete), `processing` → `ready` (on FFmpeg success), `processing` → `error` (on FFmpeg failure or timeout).

- Q: What is the video preview rendering approach for the in-browser preview panel — Remotion, canvas-based composition, or server-side frame extraction? → A: The preview panel uses server-side FFmpeg frame extraction for v1. The FastAPI backend exposes a `/preview/frame` endpoint accepting `project_id` and `timecode` (an integer in milliseconds, consistent with FR-021's canonical time unit), extracts the composited frame via FFmpeg, and returns it as a JPEG. The frontend renders frames in an `<img>` element, advancing them on playhead scrub and polling at up to 30 fps during playback simulation. No Remotion or client-side composition runtime is introduced for v1, consistent with Constitution Principle V. Full real-time native-frame-rate composited playback is deferred to post-v1.
- Q: What output formats and resolution presets does the export function support (FR-011)? → A: Export MUST produce an **MP4 file encoded with H.264 video codec and AAC audio codec** — the sole supported output container/codec combination for v1 (consistent with Constitution Principle V — simplicity, and with the FFmpeg dependency already present). The backend MUST expose a `POST /projects/{project_id}/export` endpoint accepting an optional `resolution` parameter. Supported resolution presets are: `source` (default — matches the highest-resolution video asset on the timeline), `1080p` (1920×1080), `720p` (1280×720), and `480p` (854×480). If the `resolution` parameter is omitted, `source` MUST be used. The export endpoint MUST respond immediately with a job ID and the export MUST run asynchronously; a `GET /projects/{project_id}/export/{job_id}` polling endpoint MUST return status (`pending`, `running`, `done`, `error`), percentage progress (0–100), and — when `done` — a download URL for the rendered MP4 file. Export via chat (e.g., \"导出视频\") MUST trigger the same endpoint via the agent's tool interface. The export download URL MUST be a relative path served by the same FastAPI process (no external storage required for v1).
- Q: What is the scope and persistence strategy for undo/redo (FR-008) — does it cover AI changes, is history persisted to disk, and what happens to the undo stack when an AI timeline_update arrives? → A: Undo/redo history is maintained exclusively in client-side in-memory state (not persisted to disk, consistent with Constitution Principle V). Undo/redo covers only manual user-initiated timeline edits (drag, trim, delete). AI-applied timeline changes via `timeline_update` WebSocket events are NOT undoable through the undo stack. On receipt of any `timeline_update` event the frontend MUST clear the entire undo/redo stack, since the AI has authoritatively replaced timeline state and a stale stack would produce contradictory results.
- Q: What is the logging and observability strategy for the chat-native editor backend? → A: The backend MUST use Python's standard `logging` module at INFO level for normal operations (WebSocket connections established/closed, project CRUD operations, export job lifecycle transitions) and ERROR level for exceptions and processing failures. Logs MUST be emitted to stderr (standard uvicorn/FastAPI behavior) with no additional log file required for v1. FFmpeg stderr output for failed asset processing MUST be captured and stored in the asset's `error_message` field in `project.json`. No distributed tracing or metrics collection infrastructure is introduced for v1, consistent with Constitution Principle V (simplicity, no new dependency without concrete need).
- Q: What is the `chat_history.json` message schema and how does the frontend load chat history on project open? → A: Each entry in `chat_history.json` MUST be a JSON object with the following fields: `id` (UUID string, unique per message), `role` (one of `"user"`, `"assistant"`, `"tool_progress"`), `content` (string — the display text of the message or progress detail), `timestamp` (ISO-8601 string), and an optional `tool_name` string field (present only when `role` is `"tool_progress"`, identifying the tool being called). The backend MUST expose a `GET /projects/{project_id}/chat_history` endpoint that returns the full ordered array from `chat_history.json`. The frontend MUST load chat history on project open by calling this endpoint, not by embedding it inline in the `GET /projects/{project_id}` response. New messages appended during a session MUST be persisted by the backend to `chat_history.json` via atomic file replacement after each message.
- Q: How does the frontend receive real-time media asset status updates (uploading → processing → ready/error) after the initial upload HTTP 201 response — via WebSocket push or polling? → A: A fifth canonical WebSocket event type `media_update` MUST be added to the protocol defined in FR-003. The backend MUST emit a `media_update` event over the active session's WebSocket whenever a media asset transitions state. The event payload MUST include: `asset_id` (UUID string identifying the asset), `status` (one of `uploading`, `processing`, `ready`, `error`), and an optional `error_message` string field (present only when `status` is `error`). The frontend MUST update the corresponding asset entry in its in-memory media library state on receipt and re-render the library thumbnail to reflect the new state (progress indicator for `uploading`/`processing`, ready thumbnail for `ready`, error badge for `error`). No polling of the asset record is required. This keeps the media library live-update mechanism consistent with the existing event-driven WebSocket architecture used for timeline and tool-progress updates, and avoids introducing a separate polling loop.
- Q: What are the REST API endpoints for project management (list, create, rename, delete) required by FR-014's multi-project support? → A: The backend MUST expose `GET /projects` (list all project summaries with id, name, created_at, updated_at, thumbnail_url), `POST /projects` (create new project with a required name, returns new project object), `GET /projects/{project_id}` (full project metadata), `PATCH /projects/{project_id}` (rename project via name field in JSON body), and `DELETE /projects/{project_id}` (delete project directory and all contents, returns HTTP 204). The frontend MUST provide a project switcher populated from GET /projects; on project switch it MUST load the selected project's timeline.json and chat_history.json replacing current in-memory state; on deletion of the active project it MUST redirect to the project list or auto-create a blank project.
- Q: What is the latency target and timeout/fallback behavior for the `/preview/frame` endpoint used during playback simulation polling? → A: The `GET /preview/frame` endpoint MUST respond within **200 ms at the 95th percentile** under normal single-user local load. If FFmpeg frame extraction exceeds 500 ms, the endpoint MUST return HTTP 408 (Request Timeout). On any error or timeout response, the frontend MUST retain and continue displaying the last successfully received frame rather than showing a blank or broken preview state.
- Q: What is the behavior of `POST /projects/{project_id}/export` when an export job is already `pending` or `running` for the same project? → A: The endpoint MUST reject the duplicate request with **HTTP 409 Conflict** and return a JSON body containing the `job_id` of the already-active job (the one in `pending` or `running` state) along with its current `status`. The frontend MUST surface this as a non-blocking notification (e.g., "An export is already in progress") and display the progress of the existing job rather than starting a new one. At most one export job per project may be in `pending` or `running` state simultaneously; this constraint eliminates undefined queue-ordering behavior and is consistent with Constitution Principle V (simplicity).

- Q: What is the REST endpoint contract for media file upload (URL, method, request format, response schema)? → A: The backend MUST expose `POST /projects/{project_id}/media` accepting `multipart/form-data` with a `file` field. The endpoint responds immediately with HTTP 201 and a JSON asset object (`id`, `name`, `type`, `size`, `status: \"uploading\"`), persists the file to the project's `media/` subdirectory, and asynchronously runs FFmpeg processing transitioning the asset through `uploading` → `processing` → `ready` / `error` as defined in FR-018. Files with MIME types outside video/*, audio/*, image/* MUST be rejected with HTTP 415. No per-file size cap is enforced for v1.
- Q: What is the endpoint contract for deleting a media asset from the library, and what happens when the asset is referenced by timeline clips? → A: The backend MUST expose `DELETE /projects/{project_id}/media/{asset_id}`. If the asset is currently referenced by one or more clips on the timeline, the endpoint MUST return HTTP 409 Conflict with a JSON body containing `{"conflict": true, "referencing_clip_ids": ["<clip_id>", ...]}` — the asset MUST NOT be deleted. If the asset is not referenced by any timeline clip, the endpoint MUST delete the asset file from the `media/` subdirectory and remove the asset record from `project.json`, returning HTTP 204. The frontend MUST check for a 409 response and, if received, display a confirmation dialog listing the number of referencing clips and require explicit user confirmation before the clips are removed from the timeline and the asset deletion is retried. Assets in `uploading` or `processing` state MAY be deleted (the in-flight FFmpeg process MUST be cancelled); this allows users to cancel accidental uploads.

- Q: What fields does the `GET /projects/{project_id}/export/{job_id}` polling endpoint return, specifically regarding estimated time remaining shown in the UI? → A: The polling endpoint MUST return: `job_id` (string), `status` (one of `pending`, `running`, `done`, `error`), `progress` (integer 0–100), `estimated_time_remaining` (positive integer seconds remaining when status is `running` and an estimate is available, otherwise `null`), and `download_url` (relative URL string, present only when status is `done`). This resolves the contradiction between FR-011's UI requirement (\"display percentage progress and estimated time remaining\") and the previously underspecified polling response schema that omitted the `estimated_time_remaining` field.

- Q: What is the implementation approach for the multi-track timeline UI component — a custom-built React component or an external timeline/DAW library? → A: The timeline component MUST be implemented as a custom-built React component using the HTML5 Drag-and-Drop API and CSS absolute positioning, with no external timeline or DAW library dependency. This is consistent with Constitution Principle V (simplicity, no new dependency without concrete need). Clip positions are computed from millisecond time values via a `pixelsPerSecond` scale factor in component state; this scale factor is adjustable (zoom) and defaults to display the full timeline duration within the panel width on initial load.
- Q: What is the canonical structure of the `timeline.json` / Timeline JSON schema that the frontend must render and the backend must read/write? → A: The canonical Timeline JSON schema is derived directly from the backend's `node_schema.py` Pydantic models (`TimelineTracks`, `ClipTrack`, `SubtitleTrack`, `VoiceoverTrack`, `BgmTrack`) as produced by `plan_timeline.py`. The top-level object MUST have a single `tracks` key containing an object with four arrays: `video` (array of ClipTrack objects), `subtitles` (array of SubtitleTrack objects), `voiceover` (array of VoiceoverTrack objects), and `bgm` (array of BgmTrack objects). All time values are integers in **milliseconds**. The full field definitions are specified in FR-021.
- Q: What is the unit of the `timecode` parameter in the `GET /preview/frame` endpoint — seconds or milliseconds? → A: The `timecode` parameter MUST be an **integer value in milliseconds**, consistent with FR-021's canonical rule that all time values in this system are integers in milliseconds. The frontend derives this value directly from the playhead position (already in milliseconds in the timeline model) and passes it as-is to the query parameter with no unit conversion. The backend converts from milliseconds to seconds internally (e.g., `timecode_seconds = timecode_ms / 1000.0`) when invoking FFmpeg. This resolves the contradiction between the original FR-007 specification (`timecode=<seconds>`) and FR-021's mandatory millisecond unit, preventing off-by-1000 frame extraction errors.
- Q: What is the session_id lifecycle — how is it generated, how does it map to a project, and what happens server-side when the WebSocket closes and when the client reconnects? → A: The `session_id` MUST equal the `project_id` (a UUID string). The WebSocket endpoint `/ws/chat/{session_id}` therefore uniquely identifies the active project context for that connection. The server MUST maintain an in-memory dictionary mapping `session_id` to its active agent instance; the agent instance is created lazily on first WebSocket connection for a given `session_id` by calling `build_agent()` and is released (garbage collected) when the WebSocket closes. No server-side agent state is persisted between connections — on reconnection the server re-instantiates the agent via `build_agent()` and restores conversational context by reloading `chat_history.json` from disk. This design is consistent with Constitution Principle V (simplicity, no new persistence layer) and ensures the reconnect flow in FR-016 (re-subscribe using stored `session_id`) is deterministic and stateless on the server side.
- Q: Where is export job state persisted, and what happens to in-flight export jobs when the server restarts? → A: Export job state MUST be persisted to disk as individual JSON files at `~/.open_storyline/projects/<project_id>/exports/<job_id>.json`, each containing `job_id`, `status`, `progress`, `estimated_time_remaining`, `download_url` (when done), and `error_message` (when error). All writes use atomic file replacement. On server startup, the backend MUST scan all `exports/` subdirectories and transition any jobs found in `pending` or `running` state to `error` with `error_message: "Export job interrupted by server restart"` — preventing polling callers from receiving stale non-terminal statuses indefinitely. This is specified in FR-022.
- Q: How does the manual track-volume adjustment feature (referenced in User Story 2 as "adjust track volumes") work in the data model, UI, and export pipeline — and what is the per-track volume field schema? → A: Per-track volume is stored as a `volume` float field (range 0.0–2.0, default 1.0 for video/voiceover and 0.25 for BGM) on each entry in the `video`, `voiceover`, and `bgm` track arrays of `timeline.json` (see FR-021). The timeline panel MUST render a per-track volume slider in each audio-bearing track header (video V1, voiceover A1, BGM A2). Adjusting the slider updates the `volume` field in the in-memory timeline state, persists it to `timeline.json` via atomic write, and counts as a manual edit for undo/redo (FR-008). At export time, the backend reads the `volume` values from `timeline.json` and maps them to `RenderVideoInput`: video `volume` → `video_volume_scale`, voiceover `volume` → `tts_volume_scale`, BGM `volume` → `bgm_volume_scale`. If the `volume` field is absent (AI-generated timelines predating this field), the backend MUST use the `RenderVideoInput` defaults (1.0 / 2.0 / 0.25). This closes the contradiction between User Story 2's acceptance scenario and the absence of any volume data model or FR in the prior spec. See updated FR-006 and FR-021 for normative requirements.
- Q: What is the behavior when the user sends a new chat message while the AI agent is already processing a previous message for the same session — are concurrent messages queued, rejected, or silently dropped? → A: The backend MUST process chat messages strictly serially per session (one at a time, FIFO). The WebSocket message handler MUST maintain a per-session processing flag (`is_processing: bool`). While the agent is processing, the backend MUST NOT start a second concurrent agent invocation; instead, it MUST queue at most one pending message per session. If the queue already holds one pending message and an additional message arrives, the backend MUST send an `error` WebSocket event to the frontend with a human-readable message (e.g., \"Agent is busy — please wait\") and discard the excess message. The frontend MUST disable the chat submit button and render a visual busy indicator (spinner on the send button) for the duration of agent processing, using the `tool_progress` event stream to determine when processing starts and ends. This prevents race conditions in agent state, timeline corruption from overlapping `timeline_update` events, and stale-stack conflicts with FR-008's undo/redo clearing rule. See FR-023 for normative requirements.
- Q: What is the endpoint contract for serving media asset thumbnail and waveform image files generated by FFmpeg during asset processing — is there a dedicated endpoint, and what are the URL format, response format, and caching behavior? → A: The backend MUST expose a `GET /projects/{project_id}/media/{asset_id}/thumbnail` endpoint that serves the FFmpeg-generated thumbnail image for video and image assets, and the waveform image for audio assets. The endpoint MUST return the image as `image/jpeg` for thumbnails (video/image assets) and `image/png` for waveforms (audio assets), with HTTP 200 and appropriate `Content-Type` headers. If the asset `status` is not `ready`, the endpoint MUST return HTTP 409 Conflict. If the asset does not exist, the endpoint MUST return HTTP 404. The generated thumbnail file MUST be stored at `~/.open_storyline/projects/<project_id>/media/<asset_id>_thumbnail.jpg` (video/image) or `~/.open_storyline/projects/<project_id>/media/<asset_id>_waveform.png` (audio) by the FFmpeg processing step in FR-002/FR-018. The `thumbnail_url` field returned by `GET /projects` (FR-014) and in asset objects MUST be set to the relative URL `/projects/<project_id>/media/<asset_id>/thumbnail` for all `ready` assets, or `null` for assets not yet in `ready` state. The frontend MUST use this URL as the `src` of the thumbnail `<img>` element in the media library panel. No authentication is required (consistent with FR-015's single-user local operation model). The response MUST include a `Cache-Control: max-age=31536000, immutable` header since thumbnail content is stable once generated.
- Q: What is the exact set of timeline tracks that the frontend must render — does the backend support a separate clip-based overlay (V2) track in addition to the video (V1), voiceover (A1), and BGM (A2) tracks? → A: The backend `TimelineTracks` schema in `node_schema.py` defines exactly four track arrays: `video`, `subtitles`, `voiceover`, and `bgm`. There is no separate clip-based overlay track (V2) in the backend model for v1. FR-005 previously referenced "one overlay track (V2)" which was inconsistent with the actual backend schema and FR-021's canonical JSON schema. FR-005 has been corrected to specify exactly four tracks: V1 (`video`), SUB (`subtitles`), A1 (`voiceover`), and A2 (`bgm`). A separate clip-based overlay track is deferred to post-v1 pending backend schema support. The subtitle track (SUB) provides text-overlay capability on the video track for v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web application MUST provide a three-panel layout:
  left panel (media library), center panel (video preview + timeline), right panel (chat).
  All panels MUST be resizable.
- **FR-002**: Users MUST be able to upload video, audio, and image files to the media
  library via drag-and-drop or file picker. The backend MUST expose a
  `POST /projects/{project_id}/media` endpoint that accepts a `multipart/form-data`
  request with a single `file` field containing the binary asset data. On receipt the
  endpoint MUST: (1) persist the file to `~/.open_storyline/projects/<project_id>/media/<uuid>.<ext>`,
  (2) create a media asset record in `project.json` with a generated UUID as `id`, the
  original filename as `name`, the detected MIME type as `type`, file size in bytes as
  `size`, and `status` set to `uploading`, (3) respond immediately with HTTP 201 and a
  JSON body containing the new asset object (fields: `id`, `name`, `type`, `size`,
  `status`), then (4) asynchronously transition the asset to `processing` and invoke
  FFmpeg to extract thumbnail, waveform, duration, and dimensions — updating `status`
  to `ready` on success or `error` (with `error_message`) on failure, as defined in
  FR-018. The endpoint MUST reject files whose MIME type is not in the allowed set
  (video/*, audio/*, image/*) with HTTP 415 and a human-readable error message. No
  maximum individual file size limit is enforced for v1 (single-user local deployment);
  disk-space exhaustion is handled at the OS level.
- **FR-003**: The chat panel MUST connect to the existing FireRed-OpenStoryline MCP/Agent
  backend via WebSocket and relay all AI capabilities (script generation, clip assembly,
  BGM selection, voiceover, conversational refinement) through the chat interface.
  All WebSocket messages MUST be JSON-framed with a typed `event` discriminator. The
  protocol defines five canonical event types: `chat_message` (user or AI text turn),
  `tool_progress` (tool call name, status, and optional detail payload), `timeline_update`
  (complete timeline JSON matching the existing backend Timeline schema — every
  `timeline_update` MUST carry the full timeline state; partial/diff updates are
  deferred to post-v1), `error` (code and human-readable message), and `media_update`
  (asset_id, status — one of `uploading`, `processing`, `ready`, `error` — and an
  optional `error_message` string field present only when status is `error`; the backend
  MUST emit this event whenever a media asset transitions state so the frontend can
  update the media library display without polling). Every message MUST carry a
  top-level `type` string field (the event discriminator), a `session_id` string field,
  and an ISO-8601 `timestamp` string field. The frontend MUST silently ignore unknown
  `type` values to allow forward compatibility. On receipt of a `timeline_update` event,
  the frontend MUST atomically replace its entire local timeline state with the payload.
  On receipt of a `media_update` event, the frontend MUST update the corresponding
  asset entry in its in-memory media library state and re-render the library thumbnail
  to reflect the new state (progress indicator for `uploading`/`processing`, ready
  thumbnail for `ready`, error badge for `error`).
- **FR-004**: The AI agent MUST display real-time progress messages in the chat (e.g.,
  tool call status, step completion) as it executes, mirroring the existing backend's
  node progress events. Progress messages arrive via `tool_progress` events (as defined
  in FR-003's WebSocket protocol) and MUST be rendered in the chat panel as they arrive.
- **FR-005**: The timeline MUST support exactly four tracks corresponding to the backend's
  `TimelineTracks` schema (`node_schema.py`): one video track (V1 — `video` array), one
  subtitle/text-overlay track (SUB — `subtitles` array), one voiceover/narration audio
  track (A1 — `voiceover` array), and one background music track (A2 — `bgm` array).
  There is no separate clip-based overlay track (V2) in the backend model for v1; a
  separate overlay track is deferred to post-v1 pending backend schema support. The
  frontend timeline panel MUST render exactly these four track rows, labeled V1
  (Video), SUB (Subtitles), A1 (Voiceover), and A2 (BGM), consistent with the
  canonical Timeline JSON schema defined in FR-021.
- **FR-006**: Timeline clips MUST be draggable (reorder), trimmable (in/out point
  adjustment), and deletable directly on the timeline without chat interaction.
  In addition, users MUST be able to adjust the playback volume of each audio-bearing
  track directly on the timeline UI without going through chat. Specifically:
  the video track (V1), voiceover track (A1), and BGM track (A2) MUST each expose a
  per-track volume slider (range 0.0–2.0, default 1.0, step 0.05) rendered in the
  track header area of the timeline panel. The adjusted volume value MUST be persisted
  in the `volume` field of the corresponding track entries in `timeline.json` (see
  FR-021 for field definitions). When `POST /projects/{project_id}/export` is called,
  the backend MUST read the per-track `volume` values from `timeline.json` and map
  them to `RenderVideoInput` parameters: the video track `volume` maps to
  `video_volume_scale`, the voiceover track `volume` maps to `tts_volume_scale`, and
  the BGM track `volume` maps to `bgm_volume_scale`. Volume adjustment on the timeline
  MUST be treated as a manual edit for undo/redo purposes (FR-008).
- **FR-007**: The playhead MUST be scrubable and the video preview MUST update to
  the corresponding frame. For v1, the preview panel MUST use server-side FFmpeg
  frame extraction: the backend MUST expose a `GET /preview/frame?project_id=<id>&timecode=<ms>`
  endpoint that extracts and returns a JPEG of the composited frame at the specified
  timecode. The `timecode` parameter MUST be an **integer value in milliseconds**,
  consistent with the canonical time unit used across all timeline fields as defined
  in FR-021. The frontend MUST convert the playhead position (stored in milliseconds)
  directly to this integer query parameter without any unit transformation. The frontend
  MUST request and display this JPEG on every playhead position
  change. During playback simulation, the frontend MUST poll this endpoint at up to
  30 fps. The backend MUST respond to each `/preview/frame` request within **200 ms
  at the 95th percentile** under normal single-user local load; if FFmpeg extraction
  exceeds 500 ms the endpoint MUST return HTTP 408 (Request Timeout) so the frontend
  can fall back gracefully. On any error or timeout response from `/preview/frame`,
  the frontend MUST retain and continue displaying the last successfully received
  frame rather than showing a blank or broken state. No Remotion or client-side
  video composition runtime is introduced for v1; full real-time composited playback
  is deferred to post-v1.
- **FR-008**: The system MUST support undo/redo for manual timeline edits (minimum
  20 steps). The undo/redo history MUST be maintained exclusively in client-side
  in-memory state and MUST NOT be persisted to disk (consistent with Constitution
  Principle V — simplicity). Undo/redo MUST cover only manual timeline edits
  performed directly by the user (drag, trim, delete); AI-applied timeline changes
  delivered via `timeline_update` WebSocket events are NOT reversible through the
  undo stack. On receipt of any `timeline_update` event from the AI agent, the
  frontend MUST clear the entire undo/redo stack, because the AI has replaced
  timeline state authoritatively and a stale undo stack would produce contradictory
  results. Keyboard shortcut: Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y)
  for redo.
- **FR-009**: Users MUST be able to reference specific media assets in chat using
  "@" mention syntax; the AI agent MUST resolve mentions to the correct uploaded file.
- **FR-010**: The application MUST persist project state (timeline, media library
  references, chat history) across browser sessions for the same project. Persistence
  MUST use JSON files on local disk with no external database dependency. Each project
  occupies a dedicated directory under `~/.open_storyline/projects/<project_id>/`
  containing `project.json` (metadata and media asset metadata), `timeline.json`
  (full timeline state), `chat_history.json` (ordered array of chat message objects),
  and a `media/` subdirectory for uploaded asset files. Each entry in `chat_history.json`
  MUST be a JSON object with the following fields: `id` (UUID string, unique per message),
  `role` (one of `"user"`, `"assistant"`, `"tool_progress"`), `content` (string — the
  display text of the message or progress detail), `timestamp` (ISO-8601 string), and
  an optional `tool_name` string field (present only when `role` is `"tool_progress"`,
  identifying the tool being called). The backend MUST expose a
  `GET /projects/{project_id}/chat_history` endpoint that returns the full ordered
  message array from `chat_history.json`. The frontend MUST load chat history on project
  open by calling this endpoint (not by embedding it inline in the `GET /projects/{project_id}`
  response). New messages appended during a session MUST be persisted to `chat_history.json`
  via atomic file replacement after each message. All file writes MUST use atomic replacement
  (write to `.tmp` then rename) to prevent data corruption on crash.
- **FR-011**: Users MUST be able to export the final video as an MP4 file (H.264 video
  codec, AAC audio codec — sole supported format for v1). The backend MUST expose a
  `POST /projects/{project_id}/export` endpoint accepting an optional `resolution`
  parameter with supported presets: `source` (default, matches highest-resolution
  timeline asset), `1080p` (1920×1080), `720p` (1280×720), and `480p` (854×480).
  Export MUST run asynchronously; the endpoint MUST respond immediately with a job ID.
  A `GET /projects/{project_id}/export/{job_id}` polling endpoint MUST return status
  (`pending`, `running`, `done`, `error`), percentage progress (0–100), an
  `estimated_time_remaining` integer field (seconds remaining as a positive integer,
  or `null` when status is `pending` or `error` and an estimate is unavailable), and
  — when `done` — a relative download URL served by the same FastAPI process. Export initiated
  via chat instruction (e.g., \\\"导出视频\\\") MUST invoke the same endpoint through the
  agent's tool interface. The UI MUST display percentage progress and estimated time
  remaining during export, and provide a download link upon completion. At most one
  export job per project may be in `pending` or `running` state at a time. If
  `POST /projects/{project_id}/export` is called while a job is already active, the
  endpoint MUST return HTTP 409 Conflict with a JSON body containing the `job_id`
  and `status` of the active job; the frontend MUST display a non-blocking notification
  ("An export is already in progress") and show progress of the existing job.
- **FR-012**: The chat input MUST support multi-line text and submission via Enter
  (with Shift+Enter for newline).
- **FR-013**: The media library MUST display video thumbnails, audio waveform previews,
  and image thumbnails with asset duration/file size metadata. The backend MUST expose a
  `GET /projects/{project_id}/media/{asset_id}/thumbnail` endpoint that serves the
  FFmpeg-generated thumbnail for the asset. For video and image assets the endpoint MUST
  return `image/jpeg`; for audio assets it MUST return the waveform image as `image/png`.
  The endpoint MUST return HTTP 409 Conflict if the asset `status` is not `ready`, and
  HTTP 404 if the asset does not exist. FFmpeg processing (FR-002 / FR-018) MUST persist
  the generated files at:
  `~/.open_storyline/projects/<project_id>/media/<asset_id>_thumbnail.jpg` (video/image) or
  `~/.open_storyline/projects/<project_id>/media/<asset_id>_waveform.png` (audio).
  The `thumbnail_url` field in asset objects and in the `GET /projects` summary list (FR-014)
  MUST be the relative URL `/projects/<project_id>/media/<asset_id>/thumbnail` for `ready`
  assets, or `null` for assets not yet in `ready` state. The frontend MUST use this URL as
  the `src` of the thumbnail `<img>` element rendered in the media library panel.
  The response MUST include a `Cache-Control: max-age=31536000, immutable` header since
  thumbnail content is stable once generated and the asset ID is unique.
- **FR-014**: The system MUST allow users to create, list, rename, and switch between multiple projects. The backend MUST expose the following project management REST endpoints on `agent_fastapi.py`: `GET /projects` (returns a JSON array of all project summaries, each containing `id`, `name`, `created_at`, `updated_at`, and `thumbnail_url` — the thumbnail is derived from the first ready video/image asset in the project's media library, or `null` if none exists); `POST /projects` (accepts a JSON body with a required `name` string field, creates a new project directory under `~/.open_storyline/projects/<uuid>/`, initializes `project.json`, `timeline.json`, and `chat_history.json` with empty defaults, and returns the new project object); `GET /projects/{project_id}` (returns full project metadata — does NOT include chat history inline); `PATCH /projects/{project_id}` (accepts a JSON body with an optional `name` field to rename the project, returns the updated project object); `DELETE /projects/{project_id}` (deletes the project directory and all its contents — media files, JSON state — and returns HTTP 204); `GET /projects/{project_id}/chat_history` (returns the full ordered message array from `chat_history.json` as defined in FR-010; returns an empty array `[]` when no messages exist). The frontend MUST display a project switcher/selector (a dropdown or sidebar list) populated from `GET /projects` and allow the user to create a new project by providing a name. On project switch, the frontend MUST call `GET /projects/{project_id}/chat_history` to load chat history and replace the current in-memory chat state, in addition to loading `timeline.json` state. When the active project is deleted, the frontend MUST redirect the user to the project list or auto-create a new blank project.
- **FR-015**: The HTTP/WebSocket adapter server MUST bind exclusively to `localhost` (127.0.0.1) by default. All API keys consumed by the web layer MUST be read solely from `config.toml`; they MUST NOT be embedded in frontend source code, transmitted to the browser, or appear in server logs. CORS policy MUST restrict allowed origins to the same origin (`localhost` port). Binding to `0.0.0.0` is only permitted via an explicit opt-in user configuration override.
- **FR-016**: The frontend MUST implement WebSocket reconnection with exponential backoff on connection loss. The reconnection policy is: initial retry interval 1 second, doubling each attempt up to a maximum interval of 30 seconds, with a maximum of 5 consecutive attempts. While reconnecting, the UI MUST display a non-blocking "Reconnecting..." indicator in the chat panel header. After 5 failed attempts the UI MUST display a persistent error banner containing a manual "Reconnect" button. On successful reconnection the frontend MUST re-subscribe to the active session by sending the stored `session_id`. The in-memory timeline state and chat history MUST NOT be cleared during a disconnection; they MUST be preserved and remain visible to the user.
- **FR-017**: The chat-native editor backend MUST be implemented as an in-process extension of the existing `agent_fastapi.py` FastAPI application. New WebSocket chat endpoints (minimum: `/ws/chat/{session_id}`) and REST endpoints for project and media management MUST be added to `agent_fastapi.py`. The React SPA frontend MUST be served as static files from the same FastAPI process. No new separate server process or independent HTTP service is permitted. Each chat session MUST obtain its agent instance by calling `build_agent()` from `src/open_storyline/agent.py` — the same factory already used by the existing chat flow — to ensure consistent agent behaviour and avoid duplicated initialisation logic. The `session_id` path parameter in `/ws/chat/{session_id}` MUST equal the `project_id` UUID of the project being edited; there is a strict 1:1 mapping between session and project. The server MUST maintain an in-memory dictionary mapping `session_id` → active agent instance; the instance is created lazily on first WebSocket connection for a given `session_id` (via `build_agent()`) and MUST be released when the WebSocket closes (no server-side agent state is retained between connections). On reconnection, the server MUST re-instantiate the agent via `build_agent()` and restore conversational context by reloading `chat_history.json` from disk for that `project_id`. This stateless-between-connections design eliminates ambiguity in the reconnection flow defined in FR-016 and requires no additional persistence layer beyond `chat_history.json` (consistent with Constitution Principle V). The WebSocket message handler MUST enforce serial per-session agent invocation as specified in FR-023; concurrent or overlapping agent executions for the same session are not permitted.
- **FR-018**: Every Media Asset MUST carry a `status` field persisted in `project.json` that reflects its current lifecycle state. Valid states are: `uploading` (server is receiving file bytes), `processing` (FFmpeg is generating thumbnail, waveform, and extracting duration/dimension metadata), `ready` (asset is fully processed and available for timeline use), and `error` (FFmpeg processing failed; a companion `error_message` string field MUST be populated with a human-readable description). The UI MUST reflect each state: `uploading` and `processing` assets MUST render a progress indicator in the media library and MUST NOT be draggable to the timeline; `error` assets MUST display an error badge in the thumbnail area with a \"Retry\" action that re-triggers processing. State transitions are strictly: `uploading` → `processing` (on complete file receipt), `processing` → `ready` (on FFmpeg success), `processing` → `error` (on FFmpeg failure or processing timeout).

- **FR-019**: The backend MUST emit structured log messages using Python's standard `logging` module. INFO-level messages MUST be emitted for: each WebSocket connection established and closed (including `session_id`), each project created or deleted, each media asset state transition (`uploading` → `processing` → `ready` / `error`), and each export job lifecycle event (`pending` → `running` → `done` / `error`). ERROR-level messages MUST be emitted for: unhandled exceptions in WebSocket message handlers, FFmpeg subprocess failures (including the captured FFmpeg stderr output), and export job failures. Logs MUST be written to stderr (standard uvicorn behavior) with no additional log file required for v1. No distributed tracing or external metrics collection is introduced for v1, consistent with Constitution Principle V. FFmpeg stderr output for failed asset processing MUST be included verbatim (truncated to 2 000 characters maximum) in the ERROR log message and stored in the asset's `error_message` field in `project.json`.

- **FR-020**: The backend MUST expose a `DELETE /projects/{project_id}/media/{asset_id}` endpoint for removing a media asset from the library. If the asset is referenced by one or more clips currently present on the timeline, the endpoint MUST return HTTP 409 Conflict with a JSON body `{"conflict": true, "referencing_clip_ids": ["<clip_id>", ...]}` and MUST NOT delete the asset. If the asset is not referenced by any timeline clip, the endpoint MUST delete the asset file from the project's `media/` subdirectory, remove the asset record from `project.json`, and return HTTP 204. Assets in `uploading` or `processing` state MAY be deleted; the backend MUST cancel any in-flight FFmpeg process for that asset before deletion. The frontend MUST handle a 409 response by displaying a confirmation dialog that identifies the number of referencing clips and requires explicit user confirmation; on confirmation, the frontend MUST first remove all referencing clips from the timeline (triggering a timeline save), then retry the `DELETE` request. This endpoint applies only to individual asset deletion; project-level deletion (which removes all assets) is handled by `DELETE /projects/{project_id}` as defined in FR-014.

- **FR-021**: The canonical Timeline JSON schema used by `timeline.json`, `timeline_update` WebSocket events, and the `/preview/frame` and export endpoints is derived from the backend's `src/open_storyline/nodes/node_schema.py` Pydantic models. All time values are integers representing **milliseconds**. The schema is:

  ```json
  {
    "tracks": {
      "video": [
        {
          "clip_id": "<string>",
          "group_id": "<string>",
          \"kind\": \"<\\\"video\\\" | \\\"image\\\">\",
          \"path\": \"<string — absolute path to processed clip file>\",
          \"fps\": \"<float | null>\",
          \"source_path\": \"<string | null — absolute path to original source media>\",
          \"source_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\", \"duration\": \"<int ms>\" },
          \"timeline_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\", \"duration\": \"<int ms>\" },
          \"playback_rate\": \"<float — 1.0 = normal speed>\",
          \"volume\": \"<float — per-track video volume multiplier; range 0.0–2.0, default 1.0; maps to RenderVideoInput.video_volume_scale at export>\"
        }
      ],
      \"subtitles\": [
        {
          \"group_id\": \"<string>\",
          \"unit_id\": \"<string>\",
          \"index_in_group\": \"<int — 0-based index within group>\",
          \"text\": \"<string>\",
          \"timeline_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\" }
        }
      ],
      \"voiceover\": [
        {
          \"group_id\": \"<string>\",
          \"voiceover_id\": \"<string>\",
          \"path\": \"<string — absolute path to voiceover audio file>\",
          \"source_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\", \"duration\": \"<int ms>\" },
          \"timeline_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\", \"duration\": \"<int ms>\" },
          \"volume\": \"<float — per-track voiceover volume multiplier; range 0.0–2.0, default 1.0; maps to RenderVideoInput.tts_volume_scale at export>\"
        }
      ],
      \"bgm\": [
        {
          \"bgm_id\": \"<string>\",
          \"path\": \"<string — absolute path to BGM audio file>\",
          \"source_window\": { \"start\": \"<int ms>\", \"end\": \"<int ms>\" },
          \"loop_idx\": \"<int — 0-based loop iteration index>\",
          \"volume\": \"<float — per-track BGM volume multiplier; range 0.0–2.0, default 0.25 (matching RenderVideoInput.bgm_volume_scale default); maps to RenderVideoInput.bgm_volume_scale at export>\"
        }
      ]
    }
  }
  ```

  The `timeline.json` file stored on disk MUST conform to this schema. Every `timeline_update` WebSocket event payload MUST contain a complete object matching this schema (no partial/diff updates for v1, as defined in FR-003). The frontend MUST treat this schema as authoritative for rendering the timeline and preview panel. An empty timeline is represented as `{\\\"tracks\\\": {\\\"video\\\": [], \\\"subtitles\\\": [], \\\"voiceover\\\": [], \\\"bgm\\\": []}}`. The `POST /projects/{project_id}/export` and `GET /preview/frame` backend endpoints MUST read `timeline.json` and parse it according to this schema. When constructing `RenderVideoInput` for export, the backend MUST use the `volume` field values from the last entries of each respective track array as the volume scale parameters (or the default values of 1.0 / 1.0 / 0.25 if the field is absent, preserving backward compatibility with AI-generated timelines that predate this field).

- **FR-022**: Export job state MUST be persisted to disk so that polling callers always receive a valid response and no job is permanently stuck in a non-terminal state after a server restart. Each export job record MUST be stored as a dedicated JSON file at `~/.open_storyline/projects/<project_id>/exports/<job_id>.json`. The file MUST contain the following fields: `job_id` (UUID string), `status` (one of `pending`, `running`, `done`, `error`), `progress` (integer 0–100), `estimated_time_remaining` (positive integer in seconds, or `null` when not applicable), `download_url` (relative URL string, present only when `status` is `done`), and `error_message` (string, present only when `status` is `error`). All writes to the job record MUST use atomic file replacement (write to a `.tmp` file then rename) consistent with the persistence strategy defined in FR-010. On server startup, the backend MUST scan all project `exports/` subdirectories and transition any jobs found in `pending` or `running` state to `error` state with `error_message` set to `"Export job interrupted by server restart"` — this prevents polling callers from receiving stale non-terminal statuses indefinitely. The `GET /projects/{project_id}/export/{job_id}` endpoint MUST read from the corresponding job file; if the file does not exist the endpoint MUST return HTTP 404. The `GET /projects/{project_id}` endpoint MUST NOT include export job records inline; export state is only accessible through the dedicated polling endpoint.

- **FR-023**: The backend MUST enforce serial (non-concurrent) processing of chat messages per session to prevent agent state corruption and timeline race conditions. The WebSocket message handler MUST maintain a per-session boolean flag `is_processing` (default: `false`). When a `chat_message` event arrives: (1) if `is_processing` is `false`, set it to `true`, invoke the agent, and reset it to `false` when the agent completes (success or error); (2) if `is_processing` is `true`, place the new message in a per-session single-slot queue — if the queue slot is already occupied, immediately emit an `error` WebSocket event with `{"type": "error", "session_id": "<id>", "timestamp": "<ISO-8601>", "code": "AGENT_BUSY", "message": "Agent is busy processing a previous message — please wait"}` and discard the excess message. At most one pending message may be queued per session at any time. The frontend MUST track agent busy state using `tool_progress` event arrivals (first `tool_progress` event marks start; absence of subsequent `tool_progress` events and receipt of the final `chat_message` AI turn marks end): while busy, the frontend MUST disable the chat submit button and display a spinner on the send button. On receipt of an `AGENT_BUSY` error event, the frontend MUST display a non-blocking inline notification in the chat panel (e.g., "Please wait — still processing your previous request"). This serial execution model is consistent with Constitution Principle V (simplicity) and prevents the class of timeline corruption bugs that would arise from two concurrent `timeline_update` events overwriting each other or producing an inconsistent undo stack state per FR-008.

### Key Entities

- **Project**: A named editing session containing a media library, timeline state,
  and chat history. Persisted server-side as a directory of JSON files under
  `~/.open_storyline/projects/<project_id>/` (no external database required).
  Identified by a unique UUID.
- **Media Asset**: An uploaded file (video/audio/image) associated with a project,
  with metadata (duration, dimensions, type) and a thumbnail/waveform preview.
  Each asset carries a `status` field tracking its lifecycle: `uploading` (file
  transfer in progress) → `processing` (FFmpeg generating thumbnail/waveform/metadata)
  → `ready` (asset available for timeline use) or `error` (processing failed; an
  `error_message` field provides a human-readable description). Assets MUST NOT be
  added to the timeline while in `uploading` or `processing` state.
- **Timeline**: The ordered arrangement of clips across multiple tracks with a
  defined total duration. Corresponds 1:1 with the existing backend's Timeline JSON schema.
- **Clip**: A segment of a media asset placed on a track at a specific time position
  with defined in/out points, volume, and display properties.
- **Chat Message**: A user or AI message in the conversation history, including
  tool call progress events and AI reasoning summaries. Each message is persisted
  in `chat_history.json` as a JSON object with fields: `id` (UUID string), `role`
  (one of `"user"`, `"assistant"`, `"tool_progress"`), `content` (string),
  `timestamp` (ISO-8601 string), and an optional `tool_name` string (present only
  when `role` is `"tool_progress"`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with no prior training can upload media, type a natural language
  editing instruction, and receive a playable timeline result within 90 seconds of
  submitting the instruction.
- **SC-002**: Manual timeline edits (drag, trim, delete) respond to user input within
  100 milliseconds of the interaction gesture completing.
- **SC-003**: AI progress messages appear in the chat within 2 seconds of each
  backend node completing, with no silent "loading" gaps longer than 5 seconds.
- **SC-004**: Export of a 1-minute timeline completes and provides a download link
  within 3 minutes on a standard desktop machine.
- **SC-005**: All existing FireRed-OpenStoryline capabilities (script generation,
  BGM selection, voiceover, clip segmentation, subtitle generation, conversational
  refinement, Skill archiving) are accessible through the web chat interface without
  requiring CLI or MCP client usage.
- **SC-006**: The application loads and is ready for first interaction within 3 seconds
  on a standard broadband connection.
- **SC-007**: The `GET /preview/frame` endpoint MUST respond within 200 ms at the
  95th percentile under single-user local load. Requests exceeding 500 ms MUST return
  HTTP 408 so the frontend falls back to the last successfully received frame without
  displaying a blank or broken preview state.

## Assumptions

- The existing FireRed-OpenStoryline MCP server (`src/open_storyline/mcp/server.py`)
  is reused as the backend. The new chat-native editor is implemented as an in-process
  extension of the existing `agent_fastapi.py` FastAPI application: new WebSocket chat
  endpoints and REST endpoints for project/media management are added to `agent_fastapi.py`;
  the React SPA frontend is served as static files from the same FastAPI process. No
  new separate server process is introduced. The adapter reuses `build_agent()` from
  `src/open_storyline/agent.py` directly to obtain a LangChain agent and `NodeManager`
  per session.
- The timeline data model follows the existing backend's internal schema (nodes,
  tracks, clips) and the frontend renders from that schema directly.
- The web application is a single-user, locally-hosted tool for v1 — multi-user
  collaboration and cloud hosting are out of scope.
- Mobile browser support is out of scope for v1; the UI targets desktop browsers
  (Chrome, Firefox, Safari) at 1280px+ viewport width.
- Authentication and user accounts are out of scope for v1; the application operates
  without login.
- The web application server MUST bind to `localhost` (127.0.0.1) only by default,
  consistent with its single-user local-tool nature. API keys remain in `config.toml`
  on the server and are never forwarded to the browser. CORS is restricted to the
  same origin.
- Project state (timeline, chat history, media asset metadata) is persisted as JSON
  files on local disk under `~/.open_storyline/projects/`. No external database
  (SQLite, PostgreSQL, Redis) is introduced for v1, consistent with Constitution
  Principle V (simplicity, no new dependency without concrete need).
- The UI visual language is dark-themed, professional, and compact, consistent with
  Mr.Director's zinc-950 palette and chatcut.png's layout density.
- Media files are stored locally on the server running the application; no cloud
  storage integration is required for v1.
- The frontend tech stack follows Mr.Director's approach: React + TypeScript +
  Tailwind CSS. The multi-track timeline component MUST be implemented as a
  **custom-built React component** using the HTML5 Drag-and-Drop API and CSS
  absolute positioning (no external timeline or DAW library dependency), consistent
  with Constitution Principle V (simplicity, no new dependency without concrete need).
  Clip positions MUST be computed from millisecond time values via a
  `pixelsPerSecond` scale factor held in component state; this scale factor MUST be
  adjustable (zoom in/out) and MUST default to a value that displays the full
  timeline duration within the available panel width on initial load.
- The video preview panel uses a **server-side FFmpeg frame-extraction approach**: the
  FastAPI backend exposes a `/preview/frame` endpoint that accepts a `project_id` and
  `timecode` parameter (integer, in milliseconds, consistent with FR-021's canonical
  time unit), extracts the corresponding composited frame via FFmpeg, and
  returns it as a JPEG. The frontend renders this frame in an `<img>` element and
  advances it on playhead scrub or during playback (polling at up to 30 fps for
  playback simulation). No Remotion or browser-side composition runtime is introduced
  for v1, consistent with Constitution Principle V (simplicity, no new dependency
  without concrete need). Full real-time composited playback at native frame rate is
  deferred to post-v1.
- The chat panel supports the "@" mention pattern (as seen in chatcut.png's
  input placeholder "@ 引用素材") for asset referencing.
