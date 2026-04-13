"""
Project Store Module

Provides atomic JSON persistence for projects, timelines, and chat history.
All project data is stored under ~/.open_storyline/projects/<project_id>/

Key functions:
- atomic_write_json(): Safe JSON writes using os.replace()
- init_project_dir(): Create project directory structure
- CRUD operations for projects, media assets, timelines, and chat history
"""
