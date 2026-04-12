# Quickstart: Chat-Native Video Editor (001-chat-native-editor)

**Feature**: 001-chat-native-editor  
**Branch**: `001-chat-native-editor`  
**Date**: 2026-04-13

---

## Prerequisites

- Python ≥ 3.11
- Node.js ≥ 18 (for frontend build)
- FFmpeg installed and on PATH
- Existing FireRed-OpenStoryline `config.toml` configured with valid LLM/VLM API keys

---

## Development Setup

### 1. Backend (existing FastAPI server)

The chat-native editor extends `agent_fastapi.py` in-process. No new process to start.

```bash
# From the repo root
python agent_fastapi.py
# or via run.sh
./run.sh
```

The backend will serve:
- REST API at `http://localhost:<port>/`
- WebSocket at `ws://localhost:<port>/ws/chat/{session_id}`
- Frontend SPA at `http://localhost:<port>/editor` (static files)

### 2. Frontend (React SPA — development)

```bash
cd web/editor   # New frontend directory created by this feature
npm install
npm run dev     # Vite dev server with HMR at http://localhost:5173
```

In development, configure Vite proxy to forward `/api/` and `/ws/` to the FastAPI backend port.

### 3. Frontend (Production build)

```bash
cd web/editor
npm run build   # Outputs to web/editor/dist/
```

FastAPI serves `web/editor/dist/` as static files mounted at `/editor`.

---

## Project Structure (New Files This Feature)

```text
agent_fastapi.py                 # Extended with new routes (existing file)

web/editor/                      # New React SPA frontend
├── index.html
├── package.json                 # React 18, TypeScript, Tailwind CSS, Vite, Zustand
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Three-panel layout root
│   ├── store/                   # Zustand slices
│   │   ├── timelineSlice.ts
│   │   ├── chatSlice.ts
│   │   ├── mediaSlice.ts
│   │   └── projectSlice.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ThreePanelLayout.tsx
│   │   │   ├── MediaLibraryPanel.tsx
│   │   │   ├── PreviewTimelinePanel.tsx
│   │   │   └── ChatPanel.tsx
│   │   ├── timeline/
│   │   │   ├── TimelineEditor.tsx   # Custom multi-track timeline
│   │   │   ├── TrackRow.tsx
│   │   │   ├── ClipBlock.tsx
│   │   │   ├── TrimHandle.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── VolumeSlider.tsx
│   │   ├── preview/
│   │   │   └── VideoPreview.tsx
│   │   ├── chat/
│   │   │   ├── ChatMessageList.tsx
│   │   │   ├── ChatInput.tsx        # Multi-line, Enter submit, @ mentions
│   │   │   └── MentionDropdown.tsx
│   │   ├── media/
│   │   │   ├── MediaLibrary.tsx
│   │   │   ├── AssetThumbnail.tsx
│   │   │   └── UploadDropZone.tsx
│   │   └── project/
│   │       └── ProjectSwitcher.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts      # WS connection + reconnect with backoff
│   │   └── usePreviewFrame.ts   # /preview/frame polling
│   ├── api/
│   │   └── client.ts            # REST API calls (TanStack Query)
│   └── types/
│       └── index.ts             # Timeline, MediaAsset, ChatMessage types

src/open_storyline/
└── editor/                      # New backend module for editor endpoints
    ├── __init__.py
    ├── project_store.py         # JSON persistence (atomic writes)
    ├── media_processor.py       # FFmpeg thumbnail/waveform/metadata extraction
    ├── export_runner.py         # Async export job lifecycle
    └── ws_session.py            # WebSocket session + serial agent dispatch

specs/001-chat-native-editor/    # This feature's spec artifacts
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md                     # Generated separately by /speckit.tasks
```

---

## Key Configuration

### config.toml (existing, no changes required)

```toml
[project]
media_dir = "~/work/media"
outputs_dir = "~/work/outputs"
bgm_dir = "~/work/bgm"

[llm]
model = "gpt-4o"
base_url = "https://api.openai.com/v1"
api_key = "sk-..."

# New optional setting for editor data root (defaults to ~/.open_storyline/projects/)
# [editor]
# projects_dir = "~/.open_storyline/projects"
```

### Environment Variables (no changes required)

API keys MUST remain in `config.toml` only. No new environment variables are introduced.

---

## First Run Walkthrough

1. Start the backend: `python agent_fastapi.py`
2. Open browser to `http://localhost:<port>/editor`
3. Click "New Project", enter a project name.
4. Drag video/audio/image files into the Media Library panel (left).
5. Wait for thumbnails to appear (asset transitions to `ready` via WebSocket).
6. Type a natural language instruction in the Chat panel (right), e.g.:
   "把这些素材剪成一个30秒的产品介绍视频"
7. Watch real-time progress messages appear in chat.
8. The timeline (center) populates with clips automatically.
9. Scrub the playhead to preview frames.
10. Make manual adjustments (drag clips, trim, adjust volume sliders).
11. Click Export → select resolution → wait for progress → download MP4.

---

## Testing the Feature

### Manual smoke test

```bash
# 1. Start backend
python agent_fastapi.py &

# 2. Check project CRUD
curl -X POST http://localhost:<port>/projects \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Project"}'

# 3. Upload a test file
curl -X POST http://localhost:<port>/projects/<pid>/media \
  -F 'file=@/path/to/test.mp4'

# 4. Check asset status
curl http://localhost:<port>/projects/<pid>

# 5. Preview frame
curl "http://localhost:<port>/preview/frame?project_id=<pid>&timecode=1000" \
  --output frame.jpg

# 6. Export
curl -X POST http://localhost:<port>/projects/<pid>/export \
  -H 'Content-Type: application/json' \
  -d '{"resolution": "720p"}'
```

### Running existing tests

```bash
pytest tests/ -v
```

New unit tests added by this feature are in `tests/unit/editor/`.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `/editor` returns 404 | Frontend not built | Run `npm run build` in `web/editor/` |
| WebSocket connection refused | Backend not running | Start `python agent_fastapi.py` |
| Asset stuck in `processing` | FFmpeg not found | Ensure `ffmpeg` is on PATH |
| Preview frame returns 408 | Heavy system load | Expected behavior; frontend shows last frame |
| Export job stuck in `running` after restart | Server restarted mid-export | Expected: job transitions to `error` on next startup |
