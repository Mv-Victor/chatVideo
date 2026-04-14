/**
 * Root App component for the Chat-Native Video Editor.
 * Implements the three-panel layout and manages project loading.
 * Based on specs/001-chat-native-editor/spec.md (US1, FR-014)
 */

import { useEffect } from 'react';
import { useEditorStore } from './store';
import {
  useProjects,
  useProject,
  useChatHistory,
} from './api/client';
import { ChatPanel } from './components/layout/ChatPanel';

/**
 * Placeholder for the Media Library panel (left)
 * Will be replaced by MediaLibraryPanel in US3 (T038)
 */
function MediaLibraryPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full bg-editor-surface border-r border-editor-border">
      <div className="text-center text-editor-muted">
        <svg
          className="w-12 h-12 mx-auto mb-2 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-sm">Media Library</p>
        <p className="text-xs mt-1">Coming in US3</p>
      </div>
    </div>
  );
}

/**
 * Placeholder for the Preview + Timeline panel (center)
 * Will be replaced by PreviewTimelinePanel in US2 (T028)
 */
function PreviewTimelinePlaceholder() {
  const timeline = useEditorStore((state) => state.timeline);

  return (
    <div className="flex flex-col h-full bg-editor-bg">
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center border-b border-editor-border">
        <div className="text-center text-editor-muted">
          <svg
            className="w-16 h-16 mx-auto mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Video Preview</p>
          <p className="text-xs mt-1">Coming in US4</p>
        </div>
      </div>

      {/* Timeline area */}
      <div className="h-48 flex items-center justify-center bg-editor-surface border-t border-editor-border">
        <div className="text-center text-editor-muted">
          <p className="text-sm">
            {timeline ? 'Timeline loaded' : 'No timeline yet'}
          </p>
          <p className="text-xs mt-1">
            {timeline
              ? `${timeline.tracks.video.length} clips`
              : 'Send a chat message to begin'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Top bar with project switcher and export button.
 * Will be replaced by full implementation in Phase 8 (T047, T046)
 */
function TopBar() {
  const currentProject = useEditorStore((state) => state.currentProject);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-editor-surface border-b border-editor-border">
      <h1 className="text-lg font-semibold text-editor-text-bright">
        OpenStoryline Editor
      </h1>
      {currentProject && (
        <span className="text-sm text-editor-muted">
          {currentProject.name}
        </span>
      )}
    </div>
  );
}

/**
 * Main App component.
 * Handles project loading and renders the three-panel layout.
 */
function App() {
  // Get Zustand actions for state updates
  const setProjects = useEditorStore((state) => state.setProjects);
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setTimeline = useEditorStore((state) => state.setTimeline);
  const setMessages = useEditorStore((state) => state.setMessages);
  const setAssets = useEditorStore((state) => state.setAssets);
  const currentProject = useEditorStore((state) => state.currentProject);

  // Fetch projects list
  const { data: projects, isSuccess: projectsLoaded } = useProjects();

  // Fetch current project details (timeline, assets)
  const { data: project, isSuccess: projectLoaded } = useProject(
    currentProject?.id ?? null
  );

  // Fetch chat history for current project
  const { data: chatHistory, isSuccess: chatHistoryLoaded } = useChatHistory(
    currentProject?.id ?? null
  );

  // Update projects list in Zustand when fetched
  useEffect(() => {
    if (projectsLoaded && projects) {
      setProjects(projects);
    }
  }, [projects, projectsLoaded, setProjects]);

  // Auto-select first project on initial load if none selected
  useEffect(() => {
    if (projectsLoaded && projects && projects.length > 0 && !currentProject) {
      // Create a minimal project object from the summary
      const firstProjectSummary = projects[0];
      setCurrentProject({
        id: firstProjectSummary.id,
        name: firstProjectSummary.name,
        created_at: firstProjectSummary.created_at,
        updated_at: firstProjectSummary.updated_at,
        media: [], // Will be populated by useProject
      });
    }
  }, [projects, projectsLoaded, currentProject, setCurrentProject]);

  // Update assets when project data is loaded
  useEffect(() => {
    if (projectLoaded && project) {
      setAssets(project.media);
      // Timeline updates come via WebSocket timeline_update events
      // which call applyAIUpdate in useWebSocket hook
      // Initial timeline state is set when timeline_update is received
      void setTimeline; // Reserved for future use when timeline is included in project response
    }
  }, [project, projectLoaded, setAssets, setTimeline]);

  // Update chat history when loaded
  useEffect(() => {
    if (chatHistoryLoaded && chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory, chatHistoryLoaded, setMessages]);

  return (
    <div className="flex flex-col h-screen bg-editor-bg text-editor-text">
      {/* Top bar */}
      <TopBar />

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Media Library */}
        <div className="w-64 flex-shrink-0">
          <MediaLibraryPlaceholder />
        </div>

        {/* Center panel: Preview + Timeline */}
        <div className="flex-1 flex flex-col">
          <PreviewTimelinePlaceholder />
        </div>

        {/* Right panel: Chat */}
        <div className="w-96 flex-shrink-0">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
