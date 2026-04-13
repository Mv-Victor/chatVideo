/**
 * REST API client for the Chat-Native Video Editor.
 * Provides typed functions for all 14 REST endpoints using TanStack Query patterns.
 * Based on specs/001-chat-native-editor/contracts/api.md
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type {
  Project,
  ProjectSummary,
  ChatMessage,
  MediaAsset,
  Timeline,
  ExportJob,
  ExportResolution,
  UUID,
  CreateProjectRequest,
  RenameProjectRequest,
  UpdateTimelineRequest,
  StartExportRequest,
} from '../types';

// =============================================================================
// Base API Configuration
// =============================================================================

const API_BASE = '/api';

/**
 * Custom error class for API errors with status code and detail
 */
export class APIError extends Error {
  status: number;
  detail?: string;
  data?: unknown;

  constructor(status: number, message: string, detail?: string, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.detail = detail;
    this.data = data;
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let detail: string | undefined;
    let data: unknown;
    try {
      const json = await response.json();
      detail = json.detail;
      data = json;
    } catch {
      // Response wasn't JSON
    }
    throw new APIError(
      response.status,
      response.statusText || `HTTP ${response.status}`,
      detail,
      data
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// Query Keys
// =============================================================================

export const queryKeys = {
  projects: () => ['projects'] as const,
  project: (pid: UUID) => ['project', pid] as const,
  chatHistory: (pid: UUID) => ['chatHistory', pid] as const,
  exportJob: (pid: UUID, jid: UUID) => ['exportJob', pid, jid] as const,
  previewFrame: (pid: UUID, timecodeMs: number) =>
    ['previewFrame', pid, timecodeMs] as const,
};

// =============================================================================
// Project Endpoints (6 endpoints)
// =============================================================================

/**
 * GET /projects - List all projects
 */
export function useProjects(options?: UseQueryOptions<ProjectSummary[], Error>) {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => apiFetch<ProjectSummary[]>('/projects'),
    ...options,
  });
}

/**
 * POST /projects - Create a new project
 */
export function useCreateProject(
  options?: UseMutationOptions<Project, Error, CreateProjectRequest>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      // Add the new project to the cache
      queryClient.setQueryData(queryKeys.project(newProject.id), newProject);
    },
    ...options,
  });
}

/**
 * GET /projects/{project_id} - Get full project metadata
 */
export function useProject(
  pid: UUID | null,
  options?: Omit<UseQueryOptions<Project, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.project(pid!),
    queryFn: () => apiFetch<Project>(`/projects/${pid}`),
    enabled: !!pid,
    ...options,
  });
}

/**
 * PATCH /projects/{project_id} - Rename a project
 */
export function useRenameProject(
  options?: UseMutationOptions<Project, Error, { pid: UUID; data: RenameProjectRequest }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, data }: { pid: UUID; data: RenameProjectRequest }) =>
      apiFetch<Project>(`/projects/${pid}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedProject, { pid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.setQueryData(queryKeys.project(pid), updatedProject);
    },
    ...options,
  });
}

/**
 * DELETE /projects/{project_id} - Delete a project
 */
export function useDeleteProject(
  options?: UseMutationOptions<void, Error, UUID>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pid: UUID) =>
      apiFetch<void>(`/projects/${pid}`, { method: 'DELETE' }),
    onSuccess: (_data, pid) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.removeQueries({ queryKey: queryKeys.project(pid) });
      queryClient.removeQueries({ queryKey: queryKeys.chatHistory(pid) });
    },
    ...options,
  });
}

/**
 * GET /projects/{project_id}/chat_history - Get chat history
 */
export function useChatHistory(
  pid: UUID | null,
  options?: Omit<UseQueryOptions<ChatMessage[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chatHistory(pid!),
    queryFn: () => apiFetch<ChatMessage[]>(`/projects/${pid}/chat_history`),
    enabled: !!pid,
    ...options,
  });
}

// =============================================================================
// Media Endpoints (4 endpoints)
// =============================================================================

/**
 * POST /projects/{project_id}/media - Upload a media asset
 */
export function useUploadMedia(
  options?: UseMutationOptions<
    MediaAsset,
    Error,
    { pid: UUID; file: File }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pid, file }: { pid: UUID; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/projects/${pid}/media`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser set it with boundary
      });

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const json = await response.json();
          detail = json.detail;
        } catch {
          // Response wasn't JSON
        }
        throw new APIError(
          response.status,
          response.statusText || `HTTP ${response.status}`,
          detail
        );
      }

      return response.json();
    },
    onSuccess: (_data, { pid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(pid) });
    },
    ...options,
  });
}

/**
 * GET /projects/{project_id}/media/{asset_id}/thumbnail - Get thumbnail URL
 * Returns the URL string for the thumbnail endpoint
 */
export function getThumbnailUrl(pid: UUID, aid: UUID): string {
  return `${API_BASE}/projects/${pid}/media/${aid}/thumbnail`;
}

/**
 * DELETE /projects/{project_id}/media/{asset_id} - Delete a media asset
 */
export function useDeleteMedia(
  options?: UseMutationOptions<
    void,
    Error,
    { pid: UUID; aid: UUID }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, aid }: { pid: UUID; aid: UUID }) =>
      apiFetch<void>(`/projects/${pid}/media/${aid}`, { method: 'DELETE' }),
    onSuccess: (_data, { pid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(pid) });
    },
    ...options,
  });
}

/**
 * PATCH /projects/{project_id}/media/{asset_id}/retry - Retry failed asset processing
 */
export function useRetryMedia(
  options?: UseMutationOptions<
    MediaAsset,
    Error,
    { pid: UUID; aid: UUID }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, aid }: { pid: UUID; aid: UUID }) =>
      apiFetch<MediaAsset>(`/projects/${pid}/media/${aid}/retry`, {
        method: 'PATCH',
      }),
    onSuccess: (_data, { pid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(pid) });
    },
    ...options,
  });
}

// =============================================================================
// Timeline Endpoint (1 endpoint)
// =============================================================================

/**
 * PATCH /projects/{project_id}/timeline - Persist manual timeline edits
 */
export function useUpdateTimeline(
  options?: UseMutationOptions<
    Timeline,
    Error,
    { pid: UUID; data: UpdateTimelineRequest }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, data }: { pid: UUID; data: UpdateTimelineRequest }) =>
      apiFetch<Timeline>(`/projects/${pid}/timeline`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_updatedTimeline, { pid }) => {
      // Update project cache to reflect new timeline state
      queryClient.invalidateQueries({ queryKey: queryKeys.project(pid) });
    },
    ...options,
  });
}

// =============================================================================
// Preview Endpoint (1 endpoint)
// =============================================================================

/**
 * GET /preview/frame - Extract preview frame
 * Returns the URL string for the preview frame endpoint
 */
export function getPreviewFrameUrl(pid: UUID, timecodeMs: number): string {
  return `${API_BASE}/preview/frame?project_id=${pid}&timecode=${timecodeMs}`;
}

/**
 * Hook for fetching preview frame as blob URL
 * Returns the object URL for the JPEG frame
 */
export function usePreviewFrame(
  pid: UUID | null,
  timecodeMs: number,
  enabled: boolean = true,
  options?: Omit<
    UseQueryOptions<string | null, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useQuery({
    queryKey: queryKeys.previewFrame(pid!, timecodeMs),
    queryFn: async (): Promise<string | null> => {
      if (!pid) return null;
      
      const response = await fetch(
        `${API_BASE}/preview/frame?project_id=${pid}&timecode=${timecodeMs}`
      );

      if (!response.ok) {
        if (response.status === 408) {
          // Timeout - return null to keep previous frame
          return null;
        }
        throw new APIError(response.status, response.statusText);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    enabled: !!pid && enabled,
    staleTime: 1000, // 1 second - frames can be re-fetched frequently
    gcTime: 5000, // 5 seconds - cleanup old blob URLs quickly
    ...options,
  });
}

// =============================================================================
// Export Endpoints (2 endpoints)
// =============================================================================

/**
 * POST /projects/{project_id}/export - Start export job
 */
export function useStartExport(
  options?: UseMutationOptions<
    { job_id: UUID },
    Error,
    { pid: UUID; data?: StartExportRequest }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pid,
      data = { resolution: 'source' },
    }: {
      pid: UUID;
      data?: StartExportRequest;
    }) =>
      apiFetch<{ job_id: UUID }>(`/projects/${pid}/export`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { pid }) => {
      // Invalidate project to reflect export state
      queryClient.invalidateQueries({ queryKey: queryKeys.project(pid) });
    },
    ...options,
  });
}

/**
 * GET /projects/{project_id}/export/{job_id} - Poll export status
 */
export function useExportJob(
  pid: UUID | null,
  jid: UUID | null,
  options?: Omit<
    UseQueryOptions<ExportJob, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useQuery({
    queryKey: queryKeys.exportJob(pid!, jid!),
    queryFn: () => apiFetch<ExportJob>(`/projects/${pid}/export/${jid}`),
    enabled: !!pid && !!jid,
    refetchInterval: (query) => {
      // Poll every 2 seconds while pending or running
      const job = query.state.data;
      if (job && (job.status === 'pending' || job.status === 'running')) {
        return 2000;
      }
      return false;
    },
    ...options,
  });
}

// =============================================================================
// Convenience Exports
// =============================================================================

/**
 * Create a new project with a given name
 * Convenience wrapper around useCreateProject
 */
export function createProject(): (name: string) => Promise<Project> {
  const mutation = useCreateProject();
  return async (name: string) => {
    return mutation.mutateAsync({ name });
  };
}

/**
 * Upload media file to a project
 * Convenience function for imperative uploads
 */
export async function uploadMedia(pid: UUID, file: File): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/projects/${pid}/media`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const json = await response.json();
      detail = json.detail;
    } catch {
      // Response wasn't JSON
    }
    throw new APIError(
      response.status,
      response.statusText || `HTTP ${response.status}`,
      detail
    );
  }

  return response.json();
}

/**
 * Delete a media asset
 * Convenience function for imperative deletes
 */
export async function deleteMedia(pid: UUID, aid: UUID): Promise<void> {
  await apiFetch<void>(`/projects/${pid}/media/${aid}`, { method: 'DELETE' });
}

/**
 * Retry a failed media asset
 * Convenience function for imperative retries
 */
export async function retryMedia(pid: UUID, aid: UUID): Promise<MediaAsset> {
  return apiFetch<MediaAsset>(`/projects/${pid}/media/${aid}/retry`, {
    method: 'PATCH',
  });
}

/**
 * Update timeline
 * Convenience function for imperative updates
 */
export async function updateTimeline(
  pid: UUID,
  timeline: Timeline
): Promise<Timeline> {
  return apiFetch<Timeline>(`/projects/${pid}/timeline`, {
    method: 'PATCH',
    body: JSON.stringify({ timeline }),
  });
}

/**
 * Start export job
 * Convenience function for imperative exports
 */
export async function startExport(
  pid: UUID,
  resolution: ExportResolution = 'source'
): Promise<{ job_id: UUID }> {
  return apiFetch<{ job_id: UUID }>(`/projects/${pid}/export`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
}

/**
 * Get export job status
 * Convenience function for imperative polling
 */
export async function getExportJob(pid: UUID, jid: UUID): Promise<ExportJob> {
  return apiFetch<ExportJob>(`/projects/${pid}/export/${jid}`);
}
