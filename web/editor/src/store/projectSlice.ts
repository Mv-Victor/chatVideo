/**
 * Project state management slice.
 * Manages current project and project list for the project switcher.
 * Based on specs/001-chat-native-editor/data-model.md
 */

import type { StateCreator } from 'zustand';
import type { Project, ProjectSummary } from '../types';

export interface ProjectSlice {
  currentProject: Project | null;
  projects: ProjectSummary[];
  /** Set the current active project */
  setCurrentProject: (project: Project | null) => void;
  /** Update the projects list (for project switcher) */
  setProjects: (projects: ProjectSummary[]) => void;
  /** Add a new project to the list */
  addProject: (project: ProjectSummary) => void;
  /** Update a project in the list by ID */
  updateProject: (id: string, patch: Partial<ProjectSummary>) => void;
  /** Remove a project from the list by ID */
  removeProject: (id: string) => void;
  /** Get the current project ID, or null if none selected */
  getCurrentProjectId: () => string | null;
  /** Clear project state (logout, reset) */
  clearProjectState: () => void;
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set, get) => ({
  currentProject: null,
  projects: [],

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  setProjects: (projects: ProjectSummary[]) => {
    set({ projects });
  },

  addProject: (project: ProjectSummary) => {
    set((state) => ({
      projects: [...state.projects, project],
    }));
  },

  updateProject: (id: string, patch: Partial<ProjectSummary>) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...patch } : project
      ),
      // Also update currentProject if it matches
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...patch }
          : state.currentProject,
    }));
  },

  removeProject: (id: string) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      // Clear currentProject if it's the one being removed
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  getCurrentProjectId: () => {
    const state = get();
    return state.currentProject?.id ?? null;
  },

  clearProjectState: () => {
    set({
      currentProject: null,
      projects: [],
    });
  },
});
