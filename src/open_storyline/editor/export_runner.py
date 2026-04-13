"""
Export Runner Module

Manages the async export job lifecycle for video rendering.

Key functions:
- start_export(): Create and launch export job
- get_job_status(): Query current job state
- recover_interrupted_jobs(): Recover orphaned jobs on startup
- Progress tracking and time estimation
"""
