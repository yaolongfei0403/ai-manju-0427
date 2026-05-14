// Project Store - Zustand

import { create } from "zustand";
import { CreateProjectData, Project, createProject as apiCreateProject } from "@/lib/api/projects";

interface ProjectState {
  project: Project | null;
  projects: Project[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<Project>;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  projects: [],
  isLoading: false,
  isCreating: false,
  error: null,

  createProject: async (data: CreateProjectData) => {
    set({ isCreating: true, error: null });
    try {
      const project = await apiCreateProject(data);
      set((state) => ({
        project,
        projects: [...state.projects, project],
        isCreating: false,
      }));
      return project;
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建项目失败";
      set({ error: message, isCreating: false });
      throw error;
    }
  },

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const { getProjects } = await import("@/lib/api/projects");
      const projects = await getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取项目列表失败";
      set({ error: message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { getProject } = await import("@/lib/api/projects");
      const project = await getProject(id);
      set({ project, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取项目详情失败";
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
