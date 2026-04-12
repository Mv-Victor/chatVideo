# Research: Chat-Native Video Editor (001-chat-native-editor)

**Phase**: 0 — Outline & Research  
**Branch**: `001-chat-native-editor`  
**Date**: 2026-04-13

---

## Summary of Unknowns Investigated

The spec was already highly detailed through clarification rounds. All architectural
decisions were pre-resolved during spec clarification. This document consolidates
those decisions and any residual design questions with concrete answers.

---

## 1. Frontend Technology Stack

**Decision**: React + TypeScript + Tailwind CSS (Vite build system)

**Rationale**:
- Matches the Mr.Director reference implementation (same stack).
- React's component model maps cleanly onto the three-panel layout (MediaLibrary,
  PreviewTimeline, ChatPanel) — each panel is an isolated subtree.
- TypeScript provides type-safety for the complex WebSocket event discriminated
  union and the timeline schema (ClipTrack, SubtitleTrack, VoiceoverTrack, BgmTrack).
- Tailwind CSS delivers a dark, compact design system with minimal custom CSS;
  zinc-950 palette is natively available.
- Vite provides fast HMR for development and produces a compact static bundle
  served directly by FastAPI's `StaticFiles` mount.

**Alternatives considered**:
- Vue 3: Rejected — team reference is React; no concrete benefit to switching.
- Next.js/SSR: Rejected — this is a locally-hosted single-page tool; server-side
  rendering adds no value.
- Vanilla JS: Rejected — timeline interaction state complexity (drag, trim, undo,
  multi-track rendering) warrants a component framework.
- External timeline library (e.g., Remotion, react-dnd-timeline): Rejected per
  Constitution Principle V — no external dependency without concrete need. The
  spec explicitly mandates a custom-built component (FR-006, Assumptions section).

---

## 2. Multi-Track Timeline Component

**Decision**: Custom React component with HTML5 Drag-and-Drop API + CSS absolute positioning

**Rationale**:
- Spec and Constitution explicitly prohibit external DAW/timeline library dependencies
  (FR-006 Assumptions, Constitution Principle V).
- Millisecond → pixel mapping via a `pixelsPerSecond` scale factor is straightforward
  to implement and directly mirrors the existing backend time model (all values
  are integers in ms per FR-021).
- Four tracks only (V1, SUB, A1, A2) — no complex multi-layer overlay required for v1.
- HTML5 DnD API handles clip drag-and-drop natively; pointer events cover trim handle
  interactions.

**Implementation notes**:
- `pixelsPerSecond` defaults to `timelineWidth / totalDurationSeconds` on initial load
  so the full timeline fits on-screen.
- Zoom: user adjusts `pixelsPerSecond` (e.g., slider or Ctrl+scroll).
- Clip left position = `clip.timeline_window.start * pixelsPerSecond / 1000`.
- Clip width = `(clip.timeline_window.end - clip.timeline_window.start) * pixelsPerSecond / 1000`.
- Undo/redo stack: plain array of timeline state snapshots (max 20 entries), stored
  in React state / Zustand slice. Stack is cleared on any `timeline_update` WS event.

---

## 3. WebSocket Protocol & Backend Integration

**Decision**: In-process extension of `agent_fastapi.py`; `/ws/chat/{session_id}`; 5 canonical event types

**Rationale**:
- Adding endpoints directly to `agent_fastapi.py` satisfies Constitution Principle V
  (no new process, no new dependency) and is explicitly mandated by the spec (FR-017).
- `session_id` == `project_id` (UUID) gives deterministic session-to-project mapping.
- The existing `build_agent()` factory is reused as-is — no agent logic is duplicated.
- Serial per-session agent invocation (FR-023) prevents timeline race conditions:
  `is_processing` flag + single-slot queue per session.

**5 canonical WebSocket event types** (FR-003):
1. `chat_message` — user/AI text turn (+ optional `mentions` array for FR-009)
2. `tool_progress` — tool call name, status, optional detail
3. `timeline_update` — full timeline JSON (complete replacement, never partial)
4. `error` — code + human-readable message
5. `media_update` — asset_id, status, optional error_message

**Every message carries**: `type` (string), `session_id` (string), `timestamp` (ISO-8601).

---

## 4. Persistence Model

**Decision**: JSON files on local disk under `~/.open_storyline/projects/<project_id>/`

**Rationale**:
- Mandated by spec (FR-010) and Constitution Principle V (no new database).
- Atomic write strategy (write to `.tmp`, then `os.rename()`) prevents corruption
  on crash — Python's `os.replace()` is atomic on POSIX systems.
- Files per project: `project.json`, `timeline.json`, `chat_history.json`, `media/`.
- Export jobs: `exports/<job_id>.json` (per FR-022).

**Atomic write implementation**:
```python
import os, json, pathlib, tempfile

def atomic_write_json(path: pathlib.Path, data: dict) -> None:
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(tmp, path)
```

---

## 5. Video Preview — Server-Side FFmpeg Frame Extraction

**Decision**: `GET /preview/frame?project_id=<id>&timecode=<ms>` returning JPEG via FFmpeg

**Rationale**:
- No Remotion / client-side composition — mandated by spec (FR-007) and Constitution
  Principle V.
- FFmpeg is already a core project dependency; the existing `ffmpeg_utils.py` provides
  the subprocess wrapper patterns.
- Frame extraction: `ffmpeg -ss <timecode_s> -i <input_path> -frames:v 1 -f image2 -`.
- For composited timelines (multiple tracks), a more complex FFmpeg filter_complex
  pipeline must be assembled from `timeline.json`.

**Latency target**: 200 ms p95 (SC-007 / FR-007).

**Approach for hitting latency target**:
- Use `-noaccurate_seek` (approximate seek) rather than accurate seek for speed.
- Target the video track's clip at the given timecode as the primary input.
- For v1, render only the video track clip at the given timecode; full compositing
  (subtitles, audio sync) in preview is deferred as optional enhancement.
- Return HTTP 408 if FFmpeg subprocess exceeds 500 ms (asyncio `wait_for` timeout).

---

## 6. Export Pipeline

**Decision**: Reuse existing `render_video.py` node via `RenderVideoInput`; async job with polling

**Rationale**:
- The `render_video.py` core node (`src/open_storyline/nodes/core_nodes/render_video.py`)
  already contains FFmpeg-based compositing logic.
- `RenderVideoInput` accepts `video_volume_scale`, `tts_volume_scale`, `bgm_volume_scale`
  scalar fields — maps directly to `timeline.json`'s top-level volume fields (FR-006,
  FR-021).
- Export runs in a background `asyncio.Task`; job state persisted to
  `exports/<job_id>.json` (FR-022).
- On server restart: scan all `exports/` dirs, set `pending`/`running` jobs to `error`
  (FR-022).

**Resolution presets** (FR-011):
| Preset | Resolution |
|--------|-----------|
| `source` | Highest-resolution asset |
| `1080p` | 1920×1080 |
| `720p` | 1280×720 |
| `480p` | 854×480 |

---

## 7. Media Asset Processing Pipeline

**Decision**: asyncio background task; FFmpeg for thumbnail/waveform/metadata extraction

**Lifecycle states** (FR-018): `uploading` → `processing` → `ready` / `error`

**FFmpeg commands**:
- Video thumbnail: `ffmpeg -ss <t> -i <file> -frames:v 1 -vf scale=320:-1 <out>.jpg`
- Audio waveform: use `librosa` (already in `requirements.txt`) to generate waveform PNG
- Image thumbnail: `ffmpeg -i <file> -vf scale=320:-1 <out>.jpg`
- Metadata extraction: `ffprobe -v quiet -print_format json -show_streams -show_format <file>`

**Libraries already available**: `ffmpeg-python`, `librosa`, `av` — no new dependencies.

---

## 8. @ Mention Feature

**Decision**: Frontend autocomplete dropdown from in-memory asset list; `mentions` array in WS payload

**Implementation details** (FR-009):
- Dropdown triggered by `@` character; filtered by subsequent characters.
- Only `ready`-status assets shown.
- Duplicate filenames disambiguated by appending `created_at` as `HH:MM:SS`.
- Message payload: `{type: "chat_message", ..., content: "@clip.mp4 截取前5秒", mentions: [{asset_id: "<uuid>", asset_name: "clip.mp4"}]}`
- Backend resolution: look up `asset_id` in `project.json`; inject path/type/duration
  into agent system prompt. If not found → emit `error` with `ASSET_NOT_FOUND`.

---

## 9. Undo/Redo

**Decision**: Client-side in-memory stack (max 20 snapshots) in Zustand store; cleared on `timeline_update`

**Rationale**: Mandated by spec (FR-008). Disk persistence of undo stack is
explicitly prohibited (FR-008, Constitution Principle V).

**Covered actions**: drag clip, trim clip, delete clip, volume slider change.  
**NOT covered**: AI-applied `timeline_update` events.

---

## 10. Project Management (Multi-Project)

**Decision**: 6 REST endpoints on `agent_fastapi.py` (FR-014); project switcher dropdown in UI

**Endpoints**:
- `GET /projects` — list summaries (id, name, created_at, updated_at, thumbnail_url)
- `POST /projects` — create new project (name required)
- `GET /projects/{project_id}` — full metadata (no inline chat history)
- `PATCH /projects/{project_id}` — rename
- `DELETE /projects/{project_id}` — delete directory + contents → HTTP 204
- `GET /projects/{project_id}/chat_history` — ordered message array

---

## 11. State Management (Frontend)

**Decision**: Zustand for global state; React Query (TanStack Query) for REST API calls

**Rationale**:
- Zustand is minimal, TypeScript-friendly, and integrates cleanly with React without
  boilerplate. Ideal for timeline state, chat history, and media library.
- TanStack Query handles caching and refetching for REST calls (`GET /projects`,
  `GET /preview/frame` polling).
- No Redux — Constitution Principle V (YAGNI).

**Key Zustand slices**:
- `timelineSlice`: timeline state + undo/redo stack
- `chatSlice`: chat history + `isProcessing` flag
- `mediaSlice`: assets array + upload queue
- `projectSlice`: current project + project list

---

## 12. Security

**Decision**: Localhost-only binding; API keys never leave server; same-origin CORS (FR-015)

**Implementation**:
- FastAPI `CORSMiddleware` with `allow_origins=["http://localhost:<port>"]`.
- All config read from `config.toml` on server side; zero API key forwarding to browser.
- No authentication for v1 (single-user local deployment).

---

## All NEEDS CLARIFICATION Items — RESOLVED

| Item | Status | Resolution |
|------|--------|-----------|
| Frontend framework | Resolved | React + TypeScript + Tailwind CSS (Vite) |
| Timeline component | Resolved | Custom React, HTML5 DnD, CSS absolute positioning |
| Preview rendering | Resolved | Server-side FFmpeg frame extraction, JPEG response |
| State persistence | Resolved | JSON files on disk, atomic write |
| WebSocket protocol | Resolved | 5 event types, JSON-framed, always full timeline state |
| Export format | Resolved | MP4 H.264/AAC, async job, polling endpoint |
| Media processing | Resolved | FFmpeg async task, 4 lifecycle states |
| Volume model | Resolved | Top-level scalars in `timeline.json` |
| Session/project mapping | Resolved | `session_id == project_id` |
| Multi-project | Resolved | 6 REST CRUD endpoints |
| Undo/redo | Resolved | Client-side in-memory, max 20, cleared on AI update |
| @ mentions | Resolved | Dropdown + `mentions` array in WS payload |
| Security | Resolved | Localhost-only, no auth, same-origin CORS |
| State management lib | Resolved | Zustand + TanStack Query |
| Export job persistence | Resolved | `exports/<job_id>.json`, scan on startup |
| Serial agent execution | Resolved | `is_processing` flag + single-slot queue |
