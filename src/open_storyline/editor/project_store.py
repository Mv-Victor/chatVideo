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
