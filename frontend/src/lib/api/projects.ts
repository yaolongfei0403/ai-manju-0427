// Projects API Client

import axios from "axios";
import { useAuthStore } from "@/stores/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface CreateProjectData {
  name: string;
  description?: string;
  genre: string;
  targetAudience: string;
  style: string;
  styleTags?: string[];
  aspectRatio: string;
  width: number;
  height: number;
  llmModel: string;
  t2iModel: string;
  i2vModel: string;
  samplingSteps: number;
  cfgScale: number;
  shareAssets: boolean;
  coverUrl?: string;
  coverWidth?: number;
  coverHeight?: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  genre: string;
  targetAudience: string;
  style: string;
  styleTags: string[];
  aspectRatio: string;
  width: number;
  height: number;
  llmModel: string;
  t2iModel: string;
  i2vModel: string;
  samplingSteps: number;
  cfgScale: number;
  shareAssets: boolean;
  status: string;
  isStarred: boolean;
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  createdAt: string;
  updatedAt: string;
  // Related data (populated when fetching single project)
  novelFiles?: Array<{
    id: string;
    originalName: string;
    format: string;
    size: number;
    estimatedWords: number;
    status: string;
    createdAt: string;
  }>;
  disclaimerAgreements?: Array<{
    id: string;
    fileId: string;
    agreed: boolean;
    agreedAt: string;
  }>;
  splitStrategies?: Array<{
    id: string;
    fileId: string;
    strategy: string;
    targetEpisodes: number;
    shotRangeMin: number;
    shotRangeMax: number;
    keepChapterIntegrity: boolean;
    specialFirstLast: boolean;
    preserveNarrative: boolean;
    createdAt: string;
  }>;
}

export interface ApiError {
  code: string;
  message: string;
}

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  console.log("[API] getAuthHeaders token:", token ? `${token.substring(0, 20)}...` : "MISSING");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await axios.post<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects`,
    data,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function getProjects(): Promise<Project[]> {
  const response = await axios.get<{ data: Project[] } | { error: ApiError }>(
    `/api/v1/projects`,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function getProject(id: string): Promise<Project> {
  const response = await axios.get<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}`,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export interface UpdateProjectData {
  description?: string;
  genre?: string;
  targetAudience?: string;
  style?: string;
  styleTags?: string[];
  aspectRatio?: string;
  width?: number;
  height?: number;
  llmModel?: string;
  t2iModel?: string;
  i2vModel?: string;
  samplingSteps?: number;
  cfgScale?: number;
  shareAssets?: boolean;
  status?: string;
  coverUrl?: string;
  coverWidth?: number;
  coverHeight?: number;
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  const response = await axios.put<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}`,
    data,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function duplicateProject(id: string): Promise<Project> {
  const response = await axios.post<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}/duplicate`,
    {},
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function restoreProject(id: string): Promise<Project> {
  const response = await axios.post<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}/restore`,
    {},
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function deleteProject(id: string): Promise<Project> {
  const response = await axios.put<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}`,
    { status: "trashed" },
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function toggleFavorite(id: string): Promise<Project> {
  const response = await axios.post<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects/${id}/favorite`,
    {},
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}
