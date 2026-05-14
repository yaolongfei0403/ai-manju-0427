// Upload API Client

import axios from "axios";
import { useAuthStore } from "@/stores/auth";

export interface NovelFileMeta {
  id: string;
  name: string;
  size: number;
  format: string;
  estimatedWords: number;
  title?: string | null;
  author?: string | null;
  genre?: string | null;
  style?: string | null;
  projectId?: string | null;
}

export interface NovelFileWithMetadata extends NovelFileMeta {
  title: string | null;
  author: string | null;
  genre: string | null;
  style: string | null;
}

export interface DisclaimerAgreement {
  fileId: string;
  agreed: boolean;
  agreedAt: string;
}

export type SplitStrategyType = "balanced" | "plot" | "character" | "custom";

export interface SplitStrategyConfig {
  strategy: SplitStrategyType;
  targetEpisodes: number;
  shotRangeMin: number;
  shotRangeMax: number;
  keepChapterIntegrity: boolean;
  specialFirstLast: boolean;
  preserveNarrative: boolean;
  customPrompt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadNovelFile(file: File, projectId?: string): Promise<NovelFileMeta> {
  const formData = new FormData();
  formData.append("file", file);
  if (projectId) {
    formData.append("projectId", projectId);
  }

  const response = await axios.post<{ data: NovelFileMeta } | { error: ApiError }>(
    `/api/v1/upload/novel`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function updateNovelMetadata(
  fileId: string,
  metadata: { title?: string; author?: string; genre?: string; style?: string }
): Promise<NovelFileWithMetadata> {
  const response = await axios.patch<{ data: NovelFileWithMetadata } | { error: ApiError }>(
    `/api/v1/upload/novel/${fileId}/metadata`,
    metadata,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function getNovelByProjectId(projectId: string): Promise<NovelFileWithMetadata> {
  const response = await axios.get<{ data: NovelFileWithMetadata } | { error: ApiError }>(
    `/api/v1/upload/novel/by-project/${projectId}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function agreeDisclaimer(fileId: string): Promise<DisclaimerAgreement> {
  const response = await axios.post<{ data: DisclaimerAgreement } | { error: ApiError }>(
    `/api/v1/upload/novel/disclaimer`,
    { fileId, agreed: true },
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function configureSplitStrategy(
  fileId: string,
  strategy: SplitStrategyConfig,
  projectId?: string
): Promise<{ taskId: string }> {
  const response = await axios.post<{ data: { taskId: string } } | { error: ApiError }>(
    `/api/v1/upload/novel/split`,
    { fileId, projectId, ...strategy },
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export interface EpisodeResult {
  orderIndex: number;
  title: string;
  summary: string;
  estimatedShots: number;
  chapters: string[];
  sceneDensity: number;
}

export interface SplitResult {
  taskId: string;
  status: "processing" | "completed" | "failed";
  episodes: EpisodeResult[];
  totalEpisodes: number;
  strategy: string;
  generatedAt: string;
  error?: { code: string; message: string };
}

export async function triggerSplitResult(
  fileId: string,
  strategy?: SplitStrategyConfig,
  projectId?: string
): Promise<{ taskId: string }> {
  const response = await axios.post(
    `/api/v1/upload/novel/split-result`,
    {
      fileId,
      projectId,
      strategy: strategy?.strategy || "balanced",
      targetEpisodes: strategy?.targetEpisodes || 0,
      shotRangeMin: strategy?.shotRangeMin || 8,
      shotRangeMax: strategy?.shotRangeMax || 14,
      keepChapterIntegrity: strategy?.keepChapterIntegrity ?? true,
      specialFirstLast: strategy?.specialFirstLast ?? true,
      preserveNarrative: strategy?.preserveNarrative ?? false,
      customPrompt: strategy?.customPrompt || ""
    },
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function getSplitResult(taskId: string, projectId?: string): Promise<SplitResult> {
  let url = `/api/v1/upload/novel/split-result?taskId=${taskId}`;
  if (taskId === "existing" && projectId) {
    url += `&projectId=${projectId}`;
  }
  const response = await axios.get(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function deleteNovelFile(fileId: string): Promise<void> {
  const response = await axios.delete(
    `/api/v1/upload/novel/${fileId}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }
}