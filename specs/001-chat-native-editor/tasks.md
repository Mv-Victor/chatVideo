---
description: "Task list for Chat-Native Video Editor Web Application"
---

# Tasks: Chat-Native Video Editor Web Application

**Input**: Design documents from `/specs/001-chat-native-editor/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: No test tasks — tests were not explicitly requested in the feature specification.
Unit test tasks are included only for the backend `editor/` module which has dedicated test stubs already
defined in the plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other within the phase)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure, frontend scaffolding, and backend module skeleton.
These tasks create the file/directory framework that all subsequent tasks build upon.

- [x] T001 Create backend editor module skeleton with `src/open_storyline/editor/__init__.py`, `src/open_storyline/editor/project_store.py`, `src/open_storyline/editor/media_processor.py`, `src/open_storyline/editor/export_runner.py`, `src/open_storyline/editor/ws_session.py` (empty module stubs)
- [x] T002 [P] Scaffold React + TypeScript + Vite frontend at `web/editor/` — create `web/editor/package.json` (React 18, TypeScript, Tailwind CSS 3, Vite 5, Zustand, TanStack Query), `web/editor/index.html`, `web/editor/tsconfig.json`, `web/editor/vite.config.ts` (dev proxy `/api/` and `/ws/` to FastAPI), `web/editor/tailwind.config.ts`
- [x] T003 [P] Create frontend TypeScript type definitions in `web/editor/src/types/index.ts` — Timeline, ClipTrack, SubtitleTrack, VoiceoverTrack, BgmTrack, MediaAsset, ChatMessage, ExportJob, Project, ProjectSummary, and all 5 WebSocket event types (chat_message, tool_progress, timeline_update, error, media_update)
- [x] T004 [P] Create frontend Zustand store slices: `web/editor/src/store/timelineSlice.ts` (timeline + undoStack/redoStack max 20 + pushUndo/undo/redo/applyAIUpdate), `web/editor/src/store/chatSlice.ts` (messages + isProcessing), `web/editor/src/store/mediaSlice.ts` (assets array + setAssets/updateAsset), `web/editor/src/store/projectSlice.ts` (currentProject + projects list)
- [x] T005 [P] Create backend test stubs: `tests/unit/editor/test_project_store.py`, `tests/unit/editor/test_media_processor.py`, `tests/unit/editor/test_export_runner.py` (placeholder test files with module imports)

**Checkpoint**: Project skeleton is in place — all directories, stubs, and type definitions exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure and REST skeleton that ALL user stories depend on.
No user story implementation can begin until this phase is complete.

**WARNING: CRITICAL — No user story work can begin until this phase is complete**

- [x] T006 Implement `atomic_write_json()` utility and project directory initialization in `src/open_storyline/editor/project_store.py` — includes: `atomic_write_json(path, data)` using `os.replace()`, `init_project_dir(project_id, name)` creating `project.json` + empty `timeline.json` (canonical empty) + empty `chat_history.json` + `media/` + `exports/` subdirectories
- [x] T007 [P] Implement full project CRUD persistence functions in `src/open_storyline/editor/project_store.py` — `create_project(name)`, `get_project(pid)`, `list_projects()`, `rename_project(pid, name)`, `delete_project(pid)`, `get_chat_history(pid)`, `append_chat_message(pid, message)`, `read_timeline(pid)`, `write_timeline(pid, timeline)`, all using atomic writes; includes `thumbnail_url` derivation logic (first ready video/image asset)
- [x] T008 [P] Register all 14 REST routes and 1 WebSocket route skeleton in `agent_fastapi.py` — `GET /projects`, `POST /projects`, `GET /projects/{pid}`, `PATCH /projects/{pid}`, `DELETE /projects/{pid}`, `GET /projects/{pid}/chat_history`, `POST /projects/{pid}/media`, `GET /projects/{pid}/media/{aid}/thumbnail`, `DELETE /projects/{pid}/media/{aid}`, `PATCH /projects/{pid}/media/{aid}/retry`, `PATCH /projects/{pid}/timeline`, `GET /preview/frame`, `POST /projects/{pid}/export`, `GET /projects/{pid}/export/{jid}`, `WS /ws/chat/{session_id}`; add `StaticFiles` mount at `/editor` pointing to `web/editor/dist/`; configure `CORSMiddleware` for same-origin localhost-only (FR-015)
- [x] T009 Implement `GET /projects`, `POST /projects`, `GET /projects/{pid}`, `PATCH /projects/{pid}`, `DELETE /projects/{pid}`, `GET /projects/{pid}/chat_history` REST handlers in `agent_fastapi.py` using `project_store.py` functions — proper HTTP 404, 204 responses, Pydantic request/response models
- [x] T010 [P] Create frontend REST API client in `web/editor/src/api/client.ts` — typed functions for all 14 REST endpoints using TanStack Query patterns: `useProjects()`, `useProject(pid)`, `createProject()`, `renameProject()`, `deleteProject()`, `uploadMedia()`, `deleteMedia()`, `retryMedia()`, `usePreviewFrame(projectId, timecodeMs)`, `getChatHistory(pid)`, `updateTimeline(pid, timeline)`, `useExportJob()`, `startExport()` hooks
- [ ] T011 [P] Implement WebSocket connection hook in `web/editor/src/hooks/useWebSocket.ts` — manages WS lifecycle for `/ws/chat/{session_id}`, parses all 5 JSON event types dispatching to appropriate Zustand store actions, implements exponential backoff reconnect (initial 1 s, max 30 s, max 5 attempts), shows "Reconnecting..." indicator in chat panel header during attempts, shows persistent error banner + manual "Reconnect" button after 5 failures; preserves in-memory timeline and chat state during disconnection (FR-016, FR-017)
- [ ] T012 Implement `src/open_storyline/editor/ws_session.py` — `WSSession` class holding `websocket`, `agent`, `is_processing` flag, single-slot pending queue; `dispatch_message(msg)` method enforcing serial processing (at most 1 processing + 1 queued; `AGENT_BUSY` error emitted on overflow); `connect(session_id)` loading agent via `build_agent()` and reloading `chat_history.json` for context (FR-017, FR-023)

**Checkpoint**: Foundation complete — project CRUD works, WebSocket skeleton is live, frontend can connect to backend

---

## Phase 3: User Story 1 — Conversational Video Creation from Scratch (Priority: P1) — MVP

**Goal**: User can upload media, send a natural language editing instruction in chat, receive real-time AI
progress messages, and see the timeline populated with clips — all through conversation alone.

**Independent Test**: Upload 2 video clips via POST /projects/{pid}/media, connect WebSocket, send a
`chat_message` event with an editing instruction, verify `tool_progress` events appear in the chat panel,
verify a `timeline_update` event arrives and the timeline renders with clips from the uploaded assets.

### Implementation for User Story 1

- [ ] T013 [US1] Implement WebSocket chat handler in `agent_fastapi.py` — the `WS /ws/chat/{session_id}` endpoint instantiates/retrieves `WSSession`, receives `chat_message` events, dispatches to `ws_session.py` serial queue; handles connection open/close lifecycle (agent lazy create, release on close)
- [ ] T014 [US1] Implement `tool_progress` bridging in `src/open_storyline/editor/ws_session.py` — bridge the existing `on_progress` callback from `chat_middleware.py` (or equivalent agent callback) to emit `tool_progress` WebSocket events (tool_name, status: started/completed/failed, optional detail) over the active connection; also persist each message to `chat_history.json` via `project_store.append_chat_message()`
- [ ] T015 [US1] Implement `timeline_update` emission in `src/open_storyline/editor/ws_session.py` — after agent completes a run that modifies the timeline, read updated `timeline.json` via `project_store.read_timeline()`, emit a complete `timeline_update` WebSocket event (full timeline state, never partial); also emit assistant `chat_message` event with the AI text response
- [ ] T016 [P] [US1] Implement `ChatMessageList` component in `web/editor/src/components/chat/ChatMessageList.tsx` — renders user/assistant/tool_progress message bubbles from `chatSlice`, distinct visual styling per role, auto-scrolls to latest message, shows "Processing..." indicator when `isProcessing` is true
- [ ] T017 [P] [US1] Implement `ChatInput` component in `web/editor/src/components/chat/ChatInput.tsx` — multi-line textarea, Enter to submit (Shift+Enter for newline), disabled while `isProcessing`, sends `chat_message` WS event; integrates with `MentionDropdown` on `@` trigger (FR-009)
- [ ] T018 [P] [US1] Implement `MentionDropdown` component in `web/editor/src/components/chat/MentionDropdown.tsx` — triggered by `@` character in chat input, filters `mediaSlice.assets` by subsequent typed characters (only `ready`-status assets shown), disambiguates duplicate filenames by appending `HH:MM:SS` of `created_at`, inserts asset mention into chat input and adds to `mentions` array on selection (FR-009)
- [ ] T019 [US1] Wire US1 chat flow into `web/editor/src/App.tsx` and `web/editor/src/components/layout/ChatPanel.tsx` — ChatPanel renders ChatMessageList + ChatInput, connects `useWebSocket` hook, dispatches incoming WS events to Zustand slices; timeline_update clears undo/redo stack via `applyAIUpdate`; tool_progress events append to `chatSlice`
- [ ] T020 [US1] Add logging for US1 operations in `agent_fastapi.py` and `src/open_storyline/editor/ws_session.py` — INFO level: WS connection established/closed, message received/dispatched; ERROR level: agent invocation failure, serialization errors; all via Python standard `logging` module to stderr

**Checkpoint**: US1 fully functional — open browser, upload media, type a chat instruction, see AI progress and timeline update

---

## Phase 4: User Story 2 — Timeline-Based Manual Editing (Priority: P2)

**Goal**: User can drag clips to reorder, trim clip in/out points, adjust track volumes, and scrub
the playhead — all directly on the custom multi-track timeline without going through chat.

**Independent Test**: With a timeline containing at least 3 clips (from US1 or manually seeded),
drag one clip to a new position, trim its end point via right trim handle, click the timeline ruler
to move the playhead, press Ctrl+Z to undo — verify each action is reflected immediately and undo
reverses the drag.

### Implementation for User Story 2

- [ ] T021 [P] [US2] Implement `TimelineEditor` container component in `web/editor/src/components/timeline/TimelineEditor.tsx` — renders timeline ruler, four track rows (V1/SUB/A1/A2) scrollable horizontally, computes `pixelsPerSecond` from container width / total duration, manages playhead position state, handles click-on-ruler to move playhead, handles Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (or Ctrl+Y) (redo) keyboard shortcuts dispatching to `timelineSlice` (per FR-008)
- [ ] T022 [P] [US2] Implement `TrackRow` component in `web/editor/src/components/timeline/TrackRow.tsx` — renders a single labeled track row (track header with volume slider, clip area), accepts clips array and renders `ClipBlock` components at absolute CSS positions computed from `timeline_window.start/end * pixelsPerSecond / 1000`; handles HTML5 `dragover`/`drop` events for receiving dragged clips and library drops
- [ ] T023 [P] [US2] Implement `ClipBlock` component in `web/editor/src/components/timeline/ClipBlock.tsx` — renders a single clip at its CSS absolute position/width, is HTML5 draggable (`draggable=true`), shows clip label; renders `TrimHandle` on left and right edges; on drag end computes new `timeline_window.start` snapping to nearest clip boundary (nearest within 10px), updates `timelineSlice` and pushes undo snapshot
- [ ] T024 [P] [US2] Implement `TrimHandle` component in `web/editor/src/components/timeline/TrimHandle.tsx` — left and right trim drag handles using `onPointerDown`/`onPointerMove`/`onPointerUp` (pointer capture); updates clip `timeline_window.start` (left handle) or `timeline_window.end` (right handle) in ms on pointer move constrained to valid range; pushes undo snapshot to `timelineSlice` on pointer up; extends timeline duration if clip dragged past current end
- [ ] T025 [P] [US2] Implement `Playhead` component in `web/editor/src/components/timeline/Playhead.tsx` — vertical line at current playhead position computed from `playheadMs * pixelsPerSecond / 1000`; draggable to scrub; clicking timeline ruler updates playhead position; position state lives in `TimelineEditor`
- [ ] T026 [P] [US2] Implement `VolumeSlider` component in `web/editor/src/components/timeline/VolumeSlider.tsx` — per-track volume slider in track header, range 0.0–2.0, displayed as 0–200%; updates `video_volume`/`voiceover_volume`/`bgm_volume` in `timelineSlice` and pushes undo snapshot; connected to applicable tracks (video, voiceover, bgm)
- [ ] T027 [US2] Implement timeline persistence on manual edit in `agent_fastapi.py` — add the `PATCH /projects/{pid}/timeline` REST endpoint (as defined in plan.md API table and required by FR-006) so that whenever `timelineSlice` is mutated by manual actions, the frontend calls this endpoint to persist updated `timeline.json` via `project_store.write_timeline()`; implement the handler with validation (all time values must be integers in ms, volume in 0.0–2.0); this endpoint is the sole persistence path for manual timeline edits and MUST NOT be replaced by an inline save mechanism
- [ ] T028 [US2] Wire US2 timeline into `web/editor/src/components/layout/PreviewTimelinePanel.tsx` and `web/editor/src/App.tsx` — PreviewTimelinePanel renders `TimelineEditor` + `VideoPreview`; timeline loaded from `GET /projects/{pid}` on project open (populate `timelineSlice`); manual edit persistence calls `PATCH /projects/{pid}/timeline`

**Checkpoint**: US2 fully functional — multi-track timeline is visible and interactive; drag, trim, scrub, undo all work independently of chat

---

## Phase 5: User Story 3 — Media Library Management (Priority: P3)

**Goal**: User can upload media files (video/audio/image), see thumbnails/waveforms with live status
updates, filter by type, and drag assets from the library directly onto the timeline.

**Independent Test**: Upload 3 different media types (video, audio, image) via drag-and-drop or file
picker — verify each transitions through uploading → processing → ready with live thumbnail updates via
WebSocket; apply type filter; drag one ready asset to a timeline track and verify a new clip appears.

### Implementation for User Story 3

- [ ] T029 [P] [US3] Implement `POST /projects/{pid}/media` upload handler in `agent_fastapi.py` — accepts `multipart/form-data`; saves file to `media/<asset_id>.<ext>`; inserts MediaAsset record (status: `uploading`) into `project.json` via `project_store`; launches `media_processor.process_asset()` as `asyncio.create_task()`; returns HTTP 201 with initial asset record; rejects unsupported MIME types with HTTP 415
- [ ] T030 [P] [US3] Implement `src/open_storyline/editor/media_processor.py` — `process_asset(project_id, asset_id, file_path, mime_type)` async function: transitions status `uploading` → `processing`, runs FFmpeg for thumbnail (video: `ffmpeg -ss <t> -i <file> -frames:v 1 -vf scale=320:-1 <out>.jpg`; image: same; audio: `librosa` waveform PNG), runs `ffprobe` JSON for duration/dimensions metadata, transitions `processing` → `ready` on success / `processing` → `error` on failure (captures FFmpeg stderr as `error_message`); emits `media_update` WS event on each state transition; maintains `asset_id → asyncio.Task` dict for in-flight cancellation on delete; includes retry support (re-trigger processing for error assets)
- [ ] T031 [P] [US3] Implement `GET /projects/{pid}/media/{aid}/thumbnail` handler in `agent_fastapi.py` — serve thumbnail JPEG or waveform PNG with `Cache-Control: max-age=31536000, immutable`; HTTP 404 if asset not found; HTTP 409 if asset not ready
- [ ] T032 [P] [US3] Implement `DELETE /projects/{pid}/media/{aid}` handler in `agent_fastapi.py` — check timeline references in `timeline.json`; return HTTP 409 with `{conflict: true, referencing_clip_ids: [...]}` if referenced; cancel in-flight FFmpeg task if asset is `uploading`/`processing`; delete file + update `project.json`; return HTTP 204 on success
- [ ] T033 [P] [US3] Implement `MediaLibrary` component in `web/editor/src/components/media/MediaLibrary.tsx` — grid layout of assets from `mediaSlice`, type filter buttons (全部/视频/音频/图片), renders `AssetThumbnail` per asset, drag source for timeline drop (HTML5 `draggable=true` on each asset carrying `asset_id`/`type`/`duration_ms`)
- [ ] T034 [P] [US3] Implement `AssetThumbnail` component in `web/editor/src/components/media/AssetThumbnail.tsx` — shows thumbnail image (from `thumbnail_url`) or waveform PNG for audio; shows animated progress spinner overlay for `uploading`/`processing` status; shows red error badge + "Retry" action button for `error` status (calls retry endpoint); shows duration label for video/audio; reflects live updates from `media_update` WS events via `mediaSlice.updateAsset()`
- [ ] T035 [P] [US3] Implement `UploadDropZone` component in `web/editor/src/components/media/UploadDropZone.tsx` — drag-and-drop target for local files into media library panel; file picker button fallback; calls `POST /projects/{pid}/media` for each file; unsupported MIME type shows inline error message
- [ ] T036 [US3] Implement drag-from-library-to-timeline in `web/editor/src/components/timeline/TrackRow.tsx` — handle HTML5 `drop` event with `asset_id` payload; compute clip `timeline_window.start` from drop position pixels; create new ClipTrack/VoiceoverTrack/BgmTrack entry with `source_window: {start:0, end: duration_ms}` and appropriate track type based on asset MIME; update `timelineSlice` and push undo snapshot; extend timeline duration if needed (spec edge case)
- [ ] T037 [US3] Implement media_update WS event handling in `agent_fastapi.py` media upload handler — after each `media_processor` state transition, emit `media_update` event (`{type, session_id, timestamp, asset_id, status, error_message?}`) over the active project's WebSocket session if one is connected; add `PATCH /projects/{pid}/media/{aid}/retry` endpoint to re-trigger `process_asset()` for error assets
- [ ] T038 [US3] Wire US3 media panel into `web/editor/src/components/layout/MediaLibraryPanel.tsx` and `web/editor/src/App.tsx` — MediaLibraryPanel renders `UploadDropZone` + `MediaLibrary`; on project open, load assets from `GET /projects/{pid}` populating `mediaSlice`; `media_update` WS events call `mediaSlice.updateAsset()`; confirmation dialog on delete of timeline-referenced asset (HTTP 409 → prompt user → remove clips from `timelineSlice` → retry delete)

**Checkpoint**: US3 fully functional — media library uploads, shows live thumbnails, filter and drag-to-timeline all work independently

---

## Phase 6: User Story 4 — Video Preview with Playback Controls (Priority: P4)

**Goal**: User can preview the assembled video from the center panel — scrub playhead for frame preview,
play/pause with frame polling at up to 30 fps, and see preview update immediately after AI or manual edits.

**Independent Test**: With a timeline containing a video clip, scrub the playhead — verify a JPEG frame
appears in the preview; press play — verify the preview polls at ~30 fps advancing the playhead; make a
chat edit and verify preview pauses and updates to new timeline state.

### Implementation for User Story 4

- [ ] T039 [P] [US4] Implement `GET /preview/frame` endpoint in `agent_fastapi.py` — query params: `project_id` (UUID), `timecode` (int ms); reads `timeline.json` via `project_store`; identifies the video clip at the given timecode; runs `ffmpeg -noaccurate_seek -ss <timecode_s> -i <clip_path> -frames:v 1 -f image2pipe -vcodec mjpeg -` via `asyncio.create_subprocess_exec()`; enforces 500 ms timeout with `asyncio.wait_for()` returning HTTP 408 on timeout; returns JPEG bytes with `Content-Type: image/jpeg`; returns HTTP 404 if project not found or timeline empty (SC-007 p95 ≤ 200 ms target)
- [ ] T040 [P] [US4] Implement `usePreviewFrame` hook in `web/editor/src/hooks/usePreviewFrame.ts` — accepts current `playheadMs` and `isPlaying` flag; when `isPlaying`, uses `setInterval` at ~33 ms (30 fps) to advance playhead and request `/preview/frame`; on scrub (non-playing), requests frame on playhead change; retains last successful JPEG `<img>` src on HTTP 408 or any error (spec edge case: no blank/broken preview); cancels interval on `isPlaying=false` or unmount
- [ ] T041 [P] [US4] Implement `VideoPreview` component in `web/editor/src/components/preview/VideoPreview.tsx` — renders `<img>` element with `src` from `usePreviewFrame`; play/pause button, current time display (mm:ss), volume control; on play: enables `isPlaying` in hook; on timeline_update WS event received: pauses playback, snaps playhead to 0 (or current position) and re-fetches frame (spec US4 acceptance scenario 2)
- [ ] T042 [US4] Wire US4 preview into `web/editor/src/components/layout/PreviewTimelinePanel.tsx` — layout stacks `VideoPreview` above `TimelineEditor`; playhead position shared between TimelineEditor and VideoPreview (lifted state or Zustand); play state and frame polling active only when project is open and timeline is non-empty

**Checkpoint**: US4 fully functional — preview updates on scrub and play; frame polling works; preview pauses on AI timeline update

---

## Phase 7: User Story 5 — Project Export (Priority: P5)

**Goal**: User can export the final video as an MP4 (H.264/AAC) by clicking export or asking the AI,
choose a resolution preset, see percentage progress and estimated time remaining, and download the result.

**Independent Test**: With a complete timeline, call `POST /projects/{pid}/export` with `resolution: "720p"`,
poll `GET /projects/{pid}/export/{jid}` until `status == "done"`, download the `download_url` file and verify
it is a valid MP4 at 1280×720 with H.264 video and AAC audio matching the timeline composition.

### Implementation for User Story 5

- [ ] T043 [P] [US5] Implement `src/open_storyline/editor/export_runner.py` — `ExportRunner` class: `start_export(project_id, resolution)` creates `ExportJob` record in `exports/<job_id>.json`, returns `job_id`, enforces single-active-job constraint (HTTP 409); background `asyncio.Task` reads `timeline.json`, maps to `RenderVideoInput` (maps `video_volume`/`voiceover_volume`/`bgm_volume` to `RenderVideoInput` scalar fields, applies resolution preset scaling), calls existing render pipeline from `render_video.py` node; updates `progress` (0–100) and `estimated_time_remaining` (elapsed-time-based estimate) in job JSON during run; transitions to `done` (with `download_url`) or `error` (with `error_message`) on completion; `get_job_status(pid, jid)` reads job JSON; `recover_interrupted_jobs()` scans all `exports/` on startup and marks `pending`/`running` jobs as `error` with "Export job interrupted by server restart"
- [ ] T044 [P] [US5] Implement `POST /projects/{pid}/export` and `GET /projects/{pid}/export/{jid}` handlers in `agent_fastapi.py` — POST: accepts optional `{resolution}` body (default `source`), calls `export_runner.start_export()`, returns HTTP 202 `{job_id}` or HTTP 409 if active job exists; GET: calls `export_runner.get_job_status()`, returns full ExportJob fields; call `export_runner.recover_interrupted_jobs()` on FastAPI startup event
- [ ] T045 [P] [US5] Implement export UI in a new `web/editor/src/components/project/ExportPanel.tsx` — export button triggering resolution preset selector (source/1080p/720p/480p dropdown, default source); calls `startExport()` API function; polls `useExportJob()` (TanStack Query refetch interval 2 s while `pending`/`running`); shows percentage progress bar and estimated time remaining; shows download link `<a href={download_url}>` when `done`; shows error message when `error`; disables export button while active job exists
- [ ] T046 [US5] Wire export into `web/editor/src/App.tsx` layout — export button/panel accessible from the top bar or PreviewTimelinePanel header; export via chat (AI calling `POST /projects/{pid}/export` tool) also uses the same endpoint, progress visible in both chat (tool_progress events) and ExportPanel (via polling)

**Checkpoint**: US5 fully functional — full export flow works end-to-end; AI-triggered export also shows progress in UI

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning all user stories — project management UI, three-panel layout,
error handling, logging completeness, and final integration wiring.

- [ ] T047 [P] Implement `ProjectSwitcher` component in `web/editor/src/components/project/ProjectSwitcher.tsx` — dropdown listing all projects from `projectSlice` (populated via `useProjects()` TanStack Query); create new project (POST /projects with name prompt), rename (PATCH), delete (DELETE with confirmation dialog → if deleting active project redirect to list or auto-create blank); on project switch load new project's timeline + chat history replacing current in-memory state (FR-014)
- [ ] T048 [P] Implement three-panel layout in `web/editor/src/components/layout/ThreePanelLayout.tsx` — resizable panels (CSS grid or flex with drag handles); MediaLibraryPanel (left), PreviewTimelinePanel (center), ChatPanel (right); dark zinc-950 color scheme (Tailwind); minimum panel widths enforced; responsive to 1280px+ viewport
- [ ] T049 [P] Implement `web/editor/src/main.tsx` and `web/editor/src/App.tsx` root — React entry point; `QueryClientProvider` (TanStack Query); Zustand store wiring; top bar with ProjectSwitcher + ExportPanel; ThreePanelLayout with all three panels; project load on mount (GET /projects → if none auto-create; load first project timeline + chat history)
- [ ] T050 [P] Add error handling, logging, and edge case coverage across backend (FR-019, FR-020) — HTTP 409 response on referenced-asset delete (FR-020); HTTP 415 on unsupported MIME type; agent failure mid-task emits `error` WS event and leaves timeline in last valid state; `AGENT_BUSY` error on WS queue overflow; two-tab conflict warning (last-write-wins for v1 is acceptable); structured logging via Python `logging` module to stderr: INFO for each project created/deleted, each media asset state transition (`uploading`→`processing`→`ready`/`error`), each export job lifecycle event (`pending`→`running`→`done`/`error`); ERROR for unhandled exceptions in WS message handlers, FFmpeg subprocess failures — FFmpeg stderr output MUST be included verbatim in the ERROR log message and stored in the asset's `error_message` field in `project.json`, both truncated to a maximum of 2 000 characters (FR-019)
- [ ] T051 [P] Add frontend error handling and edge case coverage — display `error` WS event messages in chat panel as error bubbles; display asset delete conflict dialog (HTTP 409 → show referencing clips → on confirm remove clips first then retry delete); display unsupported file format error inline in UploadDropZone; handle empty timeline gracefully (no preview frame request, disable export button); auto-extend timeline duration when clip dragged past end (spec edge case)
- [ ] T052 Run `npm run build` in `web/editor/` and verify `web/editor/dist/` is served correctly by FastAPI `StaticFiles` at `/editor`; update `agent_fastapi.py` startup to mount `web/editor/dist/` if directory exists (graceful skip if not built); smoke test all REST endpoints per `specs/001-chat-native-editor/quickstart.md` manual test procedure
- [ ] T053 [P] Update `.claude/skills/openstoryline-use/SKILL.md` and `.claude/skills/openstoryline-install/SKILL.md` skill files — add guidance for accessing capabilities via the new web UI at `http://localhost:<port>/editor`, per Constitution Principle IV (skill archiving and reproducibility must be updated when runtime invocation procedure changes)

**Checkpoint**: All 5 user stories integrated and working end-to-end; full smoke test passes per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Phase 2 completion; can proceed in priority order (P1 → P2 → P3 → P4 → P5) or in parallel if staffed
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) — Chat**: After Phase 2. No dependency on other stories.
- **US2 (P2) — Timeline**: After Phase 2. Timeline data model (from US1 or manually seeded) assumed present; independently testable.
- **US3 (P3) — Media Library**: After Phase 2. Media asset WS emission reuses WS session from US1's phase; independently testable without US1 being fully integrated.
- **US4 (P4) — Preview**: After Phase 2 + timeline data available (US2's TimelineEditor or US1 agent-generated). Core preview endpoint (T039) is independently implementable.
- **US5 (P5) — Export**: After Phase 2. `export_runner.py` depends on `project_store.py` and the existing `render_video.py` node. Independently testable via curl.

### Within Each User Story

- Backend endpoint → before frontend wiring
- Store slices (Phase 1 T003–T004) → before any frontend component work
- Models/persistence → before services → before endpoints → before frontend
- Story complete before final integration into App.tsx

### Parallel Opportunities

- All Phase 1 tasks T002–T005 can run in parallel with T001
- Phase 2: T007, T008, T010, T011 can run in parallel once T006 is done
- US3 backend tasks (T029–T032) can run in parallel with each other and with US3 frontend tasks (T033–T035)
- US4 tasks T039, T040, T041 can run in parallel
- US5 tasks T043, T044, T045 can run in parallel
- Phase 8 tasks T047–T051, T053 can run in parallel

---

## Parallel Example: User Story 3 (Media Library)

```
# Backend tasks — can all start in parallel after Phase 2:
T029: POST /projects/{pid}/media upload handler
T030: media_processor.py (process_asset async function)
T031: GET thumbnail endpoint
T032: DELETE media endpoint

# Frontend tasks — can all start in parallel after T003/T004:
T033: MediaLibrary component
T034: AssetThumbnail component
T035: UploadDropZone component
```

---

## Parallel Example: User Story 1 (Chat)

```
# Can run in parallel once Phase 2 is complete:
T016: ChatMessageList component
T017: ChatInput component
T018: MentionDropdown component

# Must sequence:
T013 → T014 → T015 (WS handler → tool_progress bridge → timeline_update emission)
T019: Wire into ChatPanel (after T016, T017, T018 complete)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T012) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T013–T020)
4. **STOP and VALIDATE**: Upload media → send chat instruction → verify AI progress + timeline update in browser
5. Demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Chat works → Demo/Validate (MVP)
3. Phase 4 (US2) → Timeline manual editing → Demo/Validate
4. Phase 5 (US3) → Full media library → Demo/Validate
5. Phase 6 (US4) → Live preview → Demo/Validate
6. Phase 7 (US5) → Export → Demo/Validate
7. Phase 8 → Polish → Full integration test

### Parallel Team Strategy

With multiple developers (after Phase 1+2 complete):

- Developer A: US1 (chat, WS session, agent bridge) — T013–T020
- Developer B: US2 (timeline components, manual edit persistence) — T021–T028
- Developer C: US3 (media upload, processor, library components) — T029–T038

---

## Notes

- [P] tasks = different files, no dependencies on each other within the phase
- [Story] label maps each task to a specific user story for traceability
- Each user story is independently completable and testable
- Tests are not included as they were not explicitly requested; backend test stubs in `tests/unit/editor/` (T005) are placeholders for future test coverage
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently before continuing
- Avoid: vague tasks, same-file conflicts within a parallel group, cross-story dependencies that break independence
- All time values in ms (integers) per FR-021; all file writes via `atomic_write_json()` per research.md §4
- No new Python dependencies required — all needed libs already in `requirements.txt`
- No new server process — all backend changes extend `agent_fastapi.py` in-process
