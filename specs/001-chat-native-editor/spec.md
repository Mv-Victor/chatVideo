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
button (or ask the AI "导出视频"), choose output resolution/format, and receive
a downloadable file. The export process shows progress feedback.

**Why this priority**: Export is the ultimate deliverable but can be delivered as
a later increment once the editing workflow is solid.

**Independent Test**: With a complete timeline, trigger export, wait for completion,
download and play the output file — verify it matches the timeline composition.

**Acceptance Scenarios**:

1. **Given** a finalized timeline, **When** the user clicks the export button or
   instructs the AI to export, **Then** an export progress indicator appears and
   a download link is provided upon completion.
2. **Given** an export in progress, **When** the user views the UI, **Then** they
   see percentage progress and an estimated time remaining.

---

### Edge Cases

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

- Q: What is the video preview rendering approach for the in-browser preview panel — Remotion, canvas-based composition, or server-side frame extraction? → A: The preview panel uses server-side FFmpeg frame extraction for v1. The FastAPI backend exposes a `/preview/frame` endpoint accepting `project_id` and `timecode`, extracts the composited frame via FFmpeg, and returns it as a JPEG. The frontend renders frames in an `<img>` element, advancing them on playhead scrub and polling at up to 30 fps during playback simulation. No Remotion or client-side composition runtime is introduced for v1, consistent with Constitution Principle V. Full real-time native-frame-rate composited playback is deferred to post-v1.
- Q: What is the scope and persistence strategy for undo/redo (FR-008) — does it cover AI changes, is history persisted to disk, and what happens to the undo stack when an AI timeline_update arrives? → A: Undo/redo history is maintained exclusively in client-side in-memory state (not persisted to disk, consistent with Constitution Principle V). Undo/redo covers only manual user-initiated timeline edits (drag, trim, delete). AI-applied timeline changes via `timeline_update` WebSocket events are NOT undoable through the undo stack. On receipt of any `timeline_update` event the frontend MUST clear the entire undo/redo stack, since the AI has authoritatively replaced timeline state and a stale stack would produce contradictory results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web application MUST provide a three-panel layout:
  left panel (media library), center panel (video preview + timeline), right panel (chat).
  All panels MUST be resizable.
- **FR-002**: Users MUST be able to upload video, audio, and image files to the media
  library via drag-and-drop or file picker.
- **FR-003**: The chat panel MUST connect to the existing FireRed-OpenStoryline MCP/Agent
  backend via WebSocket and relay all AI capabilities (script generation, clip assembly,
  BGM selection, voiceover, conversational refinement) through the chat interface.
  All WebSocket messages MUST be JSON-framed with a typed `event` discriminator. The
  protocol defines four canonical event types: `chat_message` (user or AI text turn),
  `tool_progress` (tool call name, status, and optional detail payload), `timeline_update`
  (complete timeline JSON matching the existing backend Timeline schema — every
  `timeline_update` MUST carry the full timeline state; partial/diff updates are
  deferred to post-v1), and `error` (code and human-readable message). Every message
  MUST carry a top-level `type` string field (the event discriminator), a `session_id`
  string field, and an ISO-8601 `timestamp` string field. The frontend MUST silently
  ignore unknown `type` values to allow forward compatibility. On receipt of a
  `timeline_update` event, the frontend MUST atomically replace its entire local
  timeline state with the payload.
- **FR-004**: The AI agent MUST display real-time progress messages in the chat (e.g.,
  tool call status, step completion) as it executes, mirroring the existing backend's
  node progress events. Progress messages arrive via `tool_progress` events (as defined
  in FR-003's WebSocket protocol) and MUST be rendered in the chat panel as they arrive.
- **FR-005**: The timeline MUST support multiple tracks: at minimum one video track (V1),
  one overlay track (V2), one voiceover/narration audio track (A1), and one background
  music track (A2), consistent with the existing backend's timeline model.
- **FR-006**: Timeline clips MUST be draggable (reorder), trimmable (in/out point
  adjustment), and deletable directly on the timeline without chat interaction.
- **FR-007**: The playhead MUST be scrubable and the video preview MUST update to
  the corresponding frame. For v1, the preview panel MUST use server-side FFmpeg
  frame extraction: the backend MUST expose a `GET /preview/frame?project_id=<id>&timecode=<seconds>`
  endpoint that extracts and returns a JPEG of the composited frame at the specified
  timecode. The frontend MUST request and display this JPEG on every playhead position
  change. During playback simulation, the frontend MUST poll this endpoint at up to
  30 fps. No Remotion or client-side video composition runtime is introduced for v1;
  full real-time composited playback is deferred to post-v1.
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
  (full timeline state), `chat_history.json` (ordered message list), and a `media/`
  subdirectory for uploaded asset files. All file writes MUST use atomic replacement
  (write to `.tmp` then rename) to prevent data corruption on crash.
- **FR-011**: Users MUST be able to export the final video; the system MUST provide
  download of the rendered MP4 output.
- **FR-012**: The chat input MUST support multi-line text and submission via Enter
  (with Shift+Enter for newline).
- **FR-013**: The media library MUST display video thumbnails, audio waveform previews,
  and image thumbnails with asset duration/file size metadata.
- **FR-014**: The system MUST allow users to create and switch between multiple projects.
- **FR-015**: The HTTP/WebSocket adapter server MUST bind exclusively to `localhost` (127.0.0.1) by default. All API keys consumed by the web layer MUST be read solely from `config.toml`; they MUST NOT be embedded in frontend source code, transmitted to the browser, or appear in server logs. CORS policy MUST restrict allowed origins to the same origin (`localhost` port). Binding to `0.0.0.0` is only permitted via an explicit opt-in user configuration override.
- **FR-016**: The frontend MUST implement WebSocket reconnection with exponential backoff on connection loss. The reconnection policy is: initial retry interval 1 second, doubling each attempt up to a maximum interval of 30 seconds, with a maximum of 5 consecutive attempts. While reconnecting, the UI MUST display a non-blocking "Reconnecting..." indicator in the chat panel header. After 5 failed attempts the UI MUST display a persistent error banner containing a manual "Reconnect" button. On successful reconnection the frontend MUST re-subscribe to the active session by sending the stored `session_id`. The in-memory timeline state and chat history MUST NOT be cleared during a disconnection; they MUST be preserved and remain visible to the user.
- **FR-017**: The chat-native editor backend MUST be implemented as an in-process extension of the existing `agent_fastapi.py` FastAPI application. New WebSocket chat endpoints (minimum: `/ws/chat/{session_id}`) and REST endpoints for project and media management MUST be added to `agent_fastapi.py`. The React SPA frontend MUST be served as static files from the same FastAPI process. No new separate server process or independent HTTP service is permitted. Each chat session MUST obtain its agent instance by calling `build_agent()` from `src/open_storyline/agent.py` — the same factory already used by the existing chat flow — to ensure consistent agent behaviour and avoid duplicated initialisation logic.
- **FR-018**: Every Media Asset MUST carry a `status` field persisted in `project.json` that reflects its current lifecycle state. Valid states are: `uploading` (server is receiving file bytes), `processing` (FFmpeg is generating thumbnail, waveform, and extracting duration/dimension metadata), `ready` (asset is fully processed and available for timeline use), and `error` (FFmpeg processing failed; a companion `error_message` string field MUST be populated with a human-readable description). The UI MUST reflect each state: `uploading` and `processing` assets MUST render a progress indicator in the media library and MUST NOT be draggable to the timeline; `error` assets MUST display an error badge in the thumbnail area with a \"Retry\" action that re-triggers processing. State transitions are strictly: `uploading` → `processing` (on complete file receipt), `processing` → `ready` (on FFmpeg success), `processing` → `error` (on FFmpeg failure or processing timeout).

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
  tool call progress events and AI reasoning summaries.

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
  Tailwind CSS, with a timeline component capable of multi-track editing.
- The video preview panel uses a **server-side FFmpeg frame-extraction approach**: the
  FastAPI backend exposes a `/preview/frame` endpoint that accepts a `project_id` and
  `timecode` parameter, extracts the corresponding composited frame via FFmpeg, and
  returns it as a JPEG. The frontend renders this frame in an `<img>` element and
  advances it on playhead scrub or during playback (polling at up to 30 fps for
  playback simulation). No Remotion or browser-side composition runtime is introduced
  for v1, consistent with Constitution Principle V (simplicity, no new dependency
  without concrete need). Full real-time composited playback at native frame rate is
  deferred to post-v1.
- The chat panel supports the "@" mention pattern (as seen in chatcut.png's
  input placeholder "@ 引用素材") for asset referencing.
