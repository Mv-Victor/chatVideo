"""
Project Store Module

Provides atomic JSON persistence for projects, timelines, and chat history.
All project data is stored under ~/.open_storyline/projects/<project_id>/

Key functions:
- atomic_write_json(): Safe JSON writes using os.replace()
- init_project_dir(): Create project directory structure
- CRUD operations for projects, media assets, timelines, and chat history
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Base directory for all projects
PROJECTS_BASE_DIR = Path.home() / ".open_storyline" / "projects"

# Canonical empty timeline per data-model.md
CANONICAL_EMPTY_TIMELINE = {
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


def atomic_write_json(path: Path, data: Dict[str, Any] | List[Any]) -> None:
    """
    Write JSON data to a file atomically using os.replace().
    
    This prevents corruption on crash by writing to a temporary file first,
    then atomically replacing the target file.
    
    Args:
        path: Target file path (will be created/overwritten)
        data: JSON-serializable dict or list
        
    Raises:
        OSError: If file operations fail
    """
    # Ensure parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to temporary file in same directory (for atomic rename)
    tmp_path = path.with_suffix(path.suffix + '.tmp')
    
    try:
        tmp_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        # Atomic replace on POSIX systems
        os.replace(tmp_path, path)
    except Exception:
        # Clean up temp file on failure
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass
        raise


def init_project_dir(project_id: str, name: str) -> Path:
    """
    Initialize a new project directory structure.
    
    Creates:
    - project.json with initial metadata
    - timeline.json with canonical empty timeline
    - chat_history.json as empty array
    - media/ subdirectory
    - exports/ subdirectory
    
    Args:
        project_id: UUID string for the project
        name: Human-readable project name
        
    Returns:
        Path to the created project directory
        
    Raises:
        ValueError: If project_id is invalid UUID format
        OSError: If directory creation fails
    """
    # Validate UUID format
    try:
        uuid.UUID(project_id)
    except ValueError as e:
        raise ValueError(f"Invalid project_id UUID format: {project_id}") from e
    
    # Create project directory
    project_dir = PROJECTS_BASE_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create project.json
    project_data = {
        "id": project_id,
        "name": name,
        "created_at": now,
        "updated_at": now,
        "media": []
    }
    atomic_write_json(project_dir / "project.json", project_data)
    
    # Create timeline.json with canonical empty state
    atomic_write_json(project_dir / "timeline.json", CANONICAL_EMPTY_TIMELINE)
    
    # Create empty chat_history.json
    atomic_write_json(project_dir / "chat_history.json", [])
    
    # Create media and exports subdirectories
    (project_dir / "media").mkdir(exist_ok=True)
    (project_dir / "exports").mkdir(exist_ok=True)
    
    logger.info(f"Initialized project directory: {project_dir}")
    
    return project_dir


def _get_project_dir(project_id: str) -> Path:
    """Get the project directory path for a given project ID."""
    return PROJECTS_BASE_DIR / project_id


def _read_json_file(path: Path) -> Dict[str, Any] | List[Any]:
    """Read and parse a JSON file, returning an empty structure if not found."""
    if not path.exists():
        if path.name == "chat_history.json":
            return []
        if path.name == "timeline.json":
            return CANONICAL_EMPTY_TIMELINE.copy()
        raise FileNotFoundError(f"File not found: {path}")
    
    return json.loads(path.read_text(encoding='utf-8'))


def _derive_thumbnail_url(project: Dict[str, Any], project_id: str) -> str | None:
    """
    Derive thumbnail URL for a project.
    
    Returns the thumbnail URL of the first 'ready' video or image asset,
    or None if no suitable asset exists.
    """
    media = project.get("media", [])
    
    for asset in media:
        if asset.get("status") != "ready":
            continue
        
        asset_type = asset.get("type", "")
        if asset_type.startswith("video/") or asset_type.startswith("image/"):
            asset_id = asset.get("id")
            if asset_id:
                return f"/projects/{project_id}/media/{asset_id}/thumbnail"
    
    return None


def create_project(name: str) -> Dict[str, Any]:
    """
    Create a new project with the given name.
    
    Args:
        name: Human-readable project name (1-200 chars)
        
    Returns:
        The created project metadata dict
        
    Raises:
        ValueError: If name is invalid
        OSError: If project creation fails
    """
    # Validate and trim name
    name = name.strip()
    if not name:
        raise ValueError("Project name cannot be empty")
    if len(name) > 200:
        raise ValueError("Project name cannot exceed 200 characters")
    
    # Generate UUID and initialize directory
    project_id = str(uuid.uuid4())
    init_project_dir(project_id, name)
    
    logger.info(f"Created project: {project_id} - {name}")
    
    return get_project(project_id)


def get_project(project_id: str) -> Dict[str, Any]:
    """
    Get project metadata by ID.
    
    Args:
        project_id: UUID string of the project
        
    Returns:
        Project metadata dict with derived thumbnail_url
        
    Raises:
        FileNotFoundError: If project not found
        ValueError: If project_id is invalid UUID
    """
    # Validate UUID format
    try:
        uuid.UUID(project_id)
    except ValueError as e:
        raise ValueError(f"Invalid project_id UUID format: {project_id}") from e
    
    project_dir = _get_project_dir(project_id)
    project_file = project_dir / "project.json"
    
    if not project_file.exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    project = _read_json_file(project_file)
    
    # Add derived thumbnail_url
    project["thumbnail_url"] = _derive_thumbnail_url(project, project_id)
    
    return project


def list_projects() -> List[Dict[str, Any]]:
    """
    List all projects with their metadata.
    
    Returns:
        List of project summary dicts (id, name, created_at, updated_at, thumbnail_url)
    """
    if not PROJECTS_BASE_DIR.exists():
        return []
    
    projects = []
    
    for project_dir in PROJECTS_BASE_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        
        project_file = project_dir / "project.json"
        if not project_file.exists():
            continue
        
        try:
            project_data = _read_json_file(project_file)
            project_id = project_data.get("id", project_dir.name)
            
            projects.append({
                "id": project_id,
                "name": project_data.get("name", "Untitled"),
                "created_at": project_data.get("created_at"),
                "updated_at": project_data.get("updated_at"),
                "thumbnail_url": _derive_thumbnail_url(project_data, project_id)
            })
        except Exception as e:
            logger.warning(f"Failed to read project {project_dir.name}: {e}")
            continue
    
    # Sort by updated_at descending (most recent first)
    projects.sort(key=lambda p: p.get("updated_at") or "", reverse=True)
    
    return projects


def rename_project(project_id: str, name: str) -> Dict[str, Any]:
    """
    Rename a project.
    
    Args:
        project_id: UUID string of the project
        name: New project name (1-200 chars)
        
    Returns:
        Updated project metadata
        
    Raises:
        FileNotFoundError: If project not found
        ValueError: If name is invalid
    """
    # Validate name
    name = name.strip()
    if not name:
        raise ValueError("Project name cannot be empty")
    if len(name) > 200:
        raise ValueError("Project name cannot exceed 200 characters")
    
    project_dir = _get_project_dir(project_id)
    project_file = project_dir / "project.json"
    
    if not project_file.exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    project = _read_json_file(project_file)
    project["name"] = name
    project["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    atomic_write_json(project_file, project)
    
    logger.info(f"Renamed project {project_id} to: {name}")
    
    return get_project(project_id)


def delete_project(project_id: str) -> None:
    """
    Delete a project and all its data.
    
    Args:
        project_id: UUID string of the project
        
    Raises:
        FileNotFoundError: If project not found
        OSError: If deletion fails
    """
    import shutil
    
    project_dir = _get_project_dir(project_id)
    
    if not project_dir.exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    shutil.rmtree(project_dir)
    
    logger.info(f"Deleted project: {project_id}")


def get_chat_history(project_id: str) -> List[Dict[str, Any]]:
    """
    Get chat history for a project.
    
    Args:
        project_id: UUID string of the project
        
    Returns:
        List of chat messages
        
    Raises:
        FileNotFoundError: If project not found
    """
    project_dir = _get_project_dir(project_id)
    chat_file = project_dir / "chat_history.json"
    
    # Check project exists
    if not (project_dir / "project.json").exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    if not chat_file.exists():
        return []
    
    return _read_json_file(chat_file)


def append_chat_message(project_id: str, message: Dict[str, Any]) -> None:
    """
    Append a message to chat history.
    
    Args:
        project_id: UUID string of the project
        message: ChatMessage dict (id, role, content, timestamp, tool_name?)
        
    Raises:
        FileNotFoundError: If project not found
    """
    project_dir = _get_project_dir(project_id)
    chat_file = project_dir / "chat_history.json"
    
    # Check project exists
    if not (project_dir / "project.json").exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    # Load existing history or create empty
    if chat_file.exists():
        history = _read_json_file(chat_file)
    else:
        history = []
    
    # Append message
    history.append(message)
    
    # Write atomically
    atomic_write_json(chat_file, history)


def read_timeline(project_id: str) -> Dict[str, Any]:
    """
    Read timeline for a project.
    
    Args:
        project_id: UUID string of the project
        
    Returns:
        Timeline dict (canonical empty if not found)
        
    Raises:
        FileNotFoundError: If project not found
    """
    project_dir = _get_project_dir(project_id)
    timeline_file = project_dir / "timeline.json"
    
    # Check project exists
    if not (project_dir / "project.json").exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    if not timeline_file.exists():
        return CANONICAL_EMPTY_TIMELINE.copy()
    
    return _read_json_file(timeline_file)


def write_timeline(project_id: str, timeline: Dict[str, Any]) -> None:
    """
    Write timeline for a project.
    
    Args:
        project_id: UUID string of the project
        timeline: Timeline dict to persist
        
    Raises:
        FileNotFoundError: If project not found
        ValueError: If timeline validation fails
    """
    project_dir = _get_project_dir(project_id)
    timeline_file = project_dir / "timeline.json"
    
    # Check project exists
    if not (project_dir / "project.json").exists():
        raise FileNotFoundError(f"Project not found: {project_id}")
    
    # Validate volume fields
    for vol_field in ("video_volume", "voiceover_volume", "bgm_volume"):
        value = timeline.get(vol_field)
        if value is not None:
            if not isinstance(value, (int, float)) or value < 0.0 or value > 2.0:
                raise ValueError(f"{vol_field} must be in range [0.0, 2.0]")
    
    # Validate time values are integers (ms) in tracks
    tracks = timeline.get("tracks", {})
    for track_type in ("video", "subtitles", "voiceover", "bgm"):
        for item in tracks.get(track_type, []):
            tw = item.get("timeline_window", {})
            for key in ("start", "end", "duration"):
                val = tw.get(key)
                if val is not None and not isinstance(val, int):
                    raise ValueError(f"timeline_window.{key} must be an integer (ms)")
    
    atomic_write_json(timeline_file, timeline)
