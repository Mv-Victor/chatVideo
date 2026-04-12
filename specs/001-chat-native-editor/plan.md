# Implementation Plan: Chat-Native Video Editor Web Application

**Branch**: `001-chat-native-editor` | **Date**: 2026-04-13 | **Spec**: [specs/001-chat-native-editor/spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-chat-native-editor/spec.md`

---

## Summary

Build a web-based, chat-native video editing application as an **in-process extension
of the existing `agent_fastapi.py`** FastAPI application. Users interact with an AI
through natural language conversation to accomplish all video editing tasks. The UI is
a React + TypeScript + Tailwind CSS SPA with a three-panel layout (Media Library |
Preview + Timeline | Chat), served as static files by the same FastAPI process.

**Technical approach**:
- Backend: Add new WebSocket (`/ws/chat/{session_id}`) and REST endpoints directly
  to `agent_fastapi.py`. Reuse `build_agent()` factory from `src/open_storyline/agent.py`.
  Introduce `src/open_storyline/editor/` module for project persistence, media
  processing, and export orchestration.
- Frontend: React 18 + TypeScript + Tailwind CSS (Vite), custom multi-track timeline
  component, Zustand state management, TanStack Query for REST calls.
- Persistence: JSON files on disk under `~/.open_storyline/projects/`; atomic writes;
  no new database dependency.
- Preview: Server-side FFmpeg frame extraction via `/preview/frame` endpoint.
- Export: Async background task writing MP4 via existing `render_video.py` node.

---

## Technical Context

**Language/Version**: Python ≥ 3.11 (backend); TypeScript / Node.js ≥ 18 (frontend build)  
**Primary Dependencies**:
- Backend (existing): FastAPI 0.128, uvicorn, LangChain, ffmpeg-python, moviepy, librosa, aiofiles
- Frontend (new): React 18, TypeScript, Tailwind CSS, Vite, Zustand, TanStack Query
- No new Python dependencies required for v1 (all needed libs already in requirements.txt)

**Storage**: JSON files on local disk under `~/.open_storyline/projects/`; no external database  
**Testing**: pytest (backend); Vite/Vitest (frontend unit); manual integration testing  
**Target Platform**: Desktop browsers (Chrome, Firefox, Safari) at 1280px+ viewport; localhost-only  
**Project Type**: Web application (frontend + backend, single-process deployment)  
**Performance Goals**: `/preview/frame` p95 ≤ 200 ms; manual timeline edit response ≤ 100 ms; AI progress latency ≤ 2 s per node  
**Constraints**: Localhost-only binding; no external DB; no new auth; no Remotion; custom timeline component only  
**Scale/Scope**: Single-user local tool; ~5 concurrent WS sessions max; single project per session

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I — Conversational-First Interface

**Status**: PASS  
Every editing capability is accessible through the chat panel by relaying user
instructions to the existing MCP/Agent backend via `/ws/chat/{session_id}`. The
three-panel layout places chat as the primary interaction surface. FR-003 mandates
all AI capabilities be accessible through conversation. Manual timeline editing
(FR-006) is a secondary surface, explicitly permitted as an enhancement for power
users.

### Principle II — Modular Node Architecture

**Status**: PASS  
The feature does not add or modify any nodes under `src/open_storyline/nodes/`. The
new `src/open_storyline/editor/` module encapsulates project persistence, media
processing, and export concerns; it has no dependencies on sibling nodes. Agent
invocation is exclusively through the existing `build_agent()` factory, which
routes through `NodeManager` as before. No node interdependencies are introduced.

### Principle III — Prompt-as-Configuration

**Status**: PASS  
No new LLM prompt logic is hard-coded in Python source. The existing `prompts/`
directory prompts are reused through the existing agent runtime. The `build_agent()`
factory reads prompts from the same externalized files. No bilingual prompt changes
are required for the backend layer of this feature.

### Principle IV — Skill Archiving & Reproducibility

**Status**: PASS  
The feature does not change the Skill archiving mechanism. Skills stored under
`.storyline/skills/` remain fully functional through the chat interface. The
`openstoryline-use` and `openstoryline-install` skills must be reviewed post-implementation
to add guidance for accessing capabilities via the new web UI. No breaking changes
to skill file format are introduced.

### Principle V — Simplicity & Incremental Complexity

**Status**: PASS with justified complexity**

| Complexity Item | Justification |
|----------------|--------------|
| New `web/editor/` React frontend | Concrete current need: the spec requires a web SPA. Alternative (plain HTML/JS) rejected because React is needed for complex stateful timeline and chat components. |
| New `src/open_storyline/editor/` backend module | Necessary to encapsulate project/media/export logic without polluting `agent_fastapi.py` monolith further. No extra abstraction layer — it's a module, not a new service. |
| Zustand + TanStack Query (frontend) | Zustand is minimal and purpose-specific (2KB); TanStack Query eliminates manual cache/loading state management. Both are justified by the complexity of the timeline state and REST interaction pattern. |
| Vite build system | Industry-standard build tool; produces compact static bundle served directly by FastAPI's `StaticFiles`. No new runtime process. |

No abstraction layer added for "anticipated future need." All decisions resolve a
concrete current requirement.

**Post-design re-check**: No additional violations found after Phase 1 design.
The data model (JSON on disk, atomic writes) and API contract (direct FastAPI
endpoints) are the simplest possible implementations satisfying all spec requirements.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-chat-native-editor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.md           # REST + WebSocket API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
agent_fastapi.py                 # Extended in-place with new routes (existing file)

src/open_storyline/
└── editor/                      # NEW: backend module for chat-native editor
    ├── __init__.py
    ├── project_store.py         # Project/media/timeline JSON persistence (atomic writes)
    ├── media_processor.py       # FFmpeg thumbnail/waveform/metadata extraction (async)
    ├── export_runner.py         # Async export job lifecycle manager
    └── ws_session.py            # WebSocket session: agent lifecycle + serial dispatch

web/editor/                      # NEW: React SPA frontend
├── index.html
├── package.json                 # React 18, TypeScript, Tailwind CSS 3, Vite 5
├── tsconfig.json
├── vite.config.ts               # Proxy /api/ and /ws/ to FastAPI in dev mode
├── tailwind.config.ts
└── src/
    ├── main.tsx                 # React entry point
    ├── App.tsx                  # Root: project switcher + three-panel layout
    ├── types/
    │   └── index.ts             # Timeline, MediaAsset, ChatMessage, Project types
    ├── store/                   # Zustand global state slices
    │   ├── timelineSlice.ts     # Timeline state + undo/redo stack (max 20)
    │   ├── chatSlice.ts         # Chat history + isProcessing flag
    │   ├── mediaSlice.ts        # Media asset array + upload state
    │   └── projectSlice.ts      # Current project + project list
    ├── api/
    │   └── client.ts            # Typed REST API functions (TanStack Query)
    ├── hooks/
    │   ├── useWebSocket.ts      # WS connection management + exponential backoff reconnect
    │   └── usePreviewFrame.ts   # /preview/frame request + polling during playback
    └── components/
        ├── layout/
        │   ├── ThreePanelLayout.tsx  # Resizable three-panel container
        │   ├── MediaLibraryPanel.tsx # Left panel wrapper
        │   ├── PreviewTimelinePanel.tsx  # Center panel wrapper
        │   └── ChatPanel.tsx        # Right panel wrapper
        ├── timeline/
        │   ├── TimelineEditor.tsx   # Custom multi-track timeline (no DAW library)
        │   ├── TrackRow.tsx         # Single track row (V1/SUB/A1/A2)
        │   ├── ClipBlock.tsx        # Draggable, trimmable clip block
        │   ├── TrimHandle.tsx       # Left/right trim drag handles
        │   ├── Playhead.tsx         # Scrubable playhead
        │   └── VolumeSlider.tsx     # Per-track volume slider (track header)
        ├── preview/
        │   └── VideoPreview.tsx     # <img> element + playback controls
        ├── chat/
        │   ├── ChatMessageList.tsx  # Message bubbles (user/assistant/tool_progress)
        │   ├── ChatInput.tsx        # Multi-line textarea, Enter submit, @ mention trigger
        │   └── MentionDropdown.tsx  # @ autocomplete dropdown
        ├── media/
        │   ├── MediaLibrary.tsx     # Asset grid with type filter
        │   ├── AssetThumbnail.tsx   # Thumbnail/waveform with status badge
        │   └── UploadDropZone.tsx   # Drag-and-drop upload target
        └── project/
            └── ProjectSwitcher.tsx  # Project create/select/rename/delete dropdown

tests/
└── unit/
    └── editor/                  # NEW: unit tests for editor backend module
        ├── test_project_store.py
        ├── test_media_processor.py
        └── test_export_runner.py
```

**Structure Decision**: Web application layout (Option 2 variant) with backend extended
in-place rather than creating a separate `backend/` directory — the existing
`agent_fastapi.py` at the repo root is the backend entry point, and the new
`src/open_storyline/editor/` module is the logical home for feature-specific backend
logic within the existing `src/` tree. The `web/editor/` directory houses the new
React SPA alongside the existing `web/` static assets.

---

## Phase 0 — Research Output

**Status**: COMPLETE. See [research.md](./research.md) for full findings.

All NEEDS CLARIFICATION items were resolved through spec clarification sessions.
Key decisions:
- Frontend: React + TypeScript + Tailwind CSS (Vite)
- Timeline: Custom React component, HTML5 DnD, CSS absolute positioning
- Preview: Server-side FFmpeg frame extraction (JPEG response)
- State: Zustand slices + TanStack Query
- Persistence: JSON files on disk, atomic `os.replace()` writes
- No new Python dependencies required
- No new server process

---

## Phase 1 — Design Output

**Status**: COMPLETE.

Artifacts generated:
- [data-model.md](./data-model.md) — All entities, fields, validation rules, state machines
- [contracts/api.md](./contracts/api.md) — REST + WebSocket API contract
- [quickstart.md](./quickstart.md) — Dev setup, project structure, first-run guide

### Backend API Surface (added to `agent_fastapi.py`)

| Method | Path | Purpose | FR |
|--------|------|---------|-----|
| GET | `/projects` | List all projects | FR-014 |
| POST | `/projects` | Create project | FR-014 |
| GET | `/projects/{pid}` | Get project metadata | FR-014 |
| PATCH | `/projects/{pid}` | Rename project | FR-014 |
| DELETE | `/projects/{pid}` | Delete project | FR-014 |
| GET | `/projects/{pid}/chat_history` | Get chat history | FR-010, FR-014 |
| POST | `/projects/{pid}/media` | Upload media asset | FR-002 |
| GET | `/projects/{pid}/media/{aid}/thumbnail` | Serve thumbnail/waveform | FR-013 |
| DELETE | `/projects/{pid}/media/{aid}` | Delete media asset | FR-020 |
| PATCH | `/projects/{pid}/media/{aid}/retry` | Retry failed asset processing | FR-018 |
| PATCH | `/projects/{pid}/timeline` | Persist manual timeline edits | FR-006, FR-008 |
| GET | `/preview/frame` | Extract preview frame | FR-007 |
| POST | `/projects/{pid}/export` | Start export job | FR-011 |
| GET | `/projects/{pid}/export/{jid}` | Poll export status | FR-011, FR-022 |
| WS | `/ws/chat/{session_id}` | Bidirectional AI chat | FR-003, FR-017 |

### Key Design Decisions

1. **`session_id == project_id`**: Eliminates session-to-project resolution step
   (FR-017). Agent is created lazily and released on WS close.

2. **`src/open_storyline/editor/project_store.py`**: Central persistence layer
   with `atomic_write_json()` utility. All reads/writes to `project.json`,
   `timeline.json`, `chat_history.json`, and `exports/*.json` go through this module.

3. **`src/open_storyline/editor/media_processor.py`**: Async background task using
   `asyncio.create_task()`. FFmpeg subprocess wrapped with `asyncio.create_subprocess_exec()`.
   `librosa` used for audio waveform generation (already in requirements.txt).
   `asset_id` → `asyncio.Task` dictionary enables in-flight cancellation on delete.

4. **`src/open_storyline/editor/export_runner.py`**: Manages the export job lifecycle.
   Reads `timeline.json`, constructs `RenderVideoInput`, calls the render pipeline.
   Scans `exports/` on startup and marks orphaned jobs as `error`.

5. **`src/open_storyline/editor/ws_session.py`**: Per-session `is_processing` flag and
   single-slot pending queue. Emits `tool_progress` events by bridging the existing
   `on_progress` callback in `chat_middleware.py` to the WebSocket connection.

6. **Custom Timeline Component**: `pixelsPerSecond` scale factor in component state.
   Clips rendered with CSS `position: absolute; left: <ms * pps / 1000>px; width: <dur * pps / 1000>px`.
   Undo/redo stack: `timelineSlice.undoStack` (Timeline snapshots, max 20).
   Stack cleared on `timeline_update` event receipt.

7. **Preview polling**: `usePreviewFrame` hook requests `/preview/frame` on every
   playhead position change. During playback simulation, `setInterval` at 30 fps.
   Last successful JPEG retained on 408/error (FR-007).

8. **Export progress estimation**: `export_runner.py` tracks elapsed time and estimated
   total duration. Reports integer seconds remaining in `estimated_time_remaining` field.

---

## Complexity Tracking

No unjustified Constitution violations. Complexities documented in the Constitution
Check section above are all concretely necessary.

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|-----------|--------------------------------------|
| React SPA frontend (`web/editor/`) | Web UI requirement; complex stateful interaction (timeline drag, undo, WS events) | Plain HTML/JS cannot manage the complexity of multi-track timeline state, WS event stream, and real-time updates without becoming unmaintainable |
| Zustand state management | Timeline undo/redo (max 20 snapshots), cross-component WS event dispatch, media asset live updates | React Context/useReducer would require extensive prop drilling for deeply nested components (timeline tracks → clip blocks → trim handles) |
| `src/open_storyline/editor/` module | ~1000-line feature; isolates project/media/export concerns | Embedding all logic directly in `agent_fastapi.py` would make the 2800-line file unmanageable |
| TanStack Query | REST API caching, loading/error state, automatic refetch for project list | `useEffect + fetch` requires manual cache invalidation; error-prone at scale of 12+ REST endpoints |
