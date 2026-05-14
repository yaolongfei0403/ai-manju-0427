// Assets API Client

import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { Asset, ExtractedAssets, ExtractTaskResult } from "@/types/asset";
import { SplitResult } from "@/lib/api/upload";

export interface ApiError {
  code: string;
  message: string;
}

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Trigger asset extraction
export async function triggerAssetExtraction(
  projectId: string,
  fileId: string,
  splitResult: SplitResult
): Promise<{ taskId: string; status: string }> {
  const payload = {
    projectId,
    fileId,
    episodes: splitResult.episodes,
  };
  console.log(`[triggerAssetExtraction] POST /api/v1/assets/extract`, payload);

  let response;
  try {
    response = await axios.post(
      `/api/v1/assets/extract`,
      payload,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(`[triggerAssetExtraction] axios error:`, err);
    throw err;
  }

  console.log(`[triggerAssetExtraction] Response:`, response.status, response.data);

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

// Poll extraction progress
export async function getAssetExtractionResult(
  taskId: string,
  projectId?: string
): Promise<ExtractTaskResult> {
  const url = projectId
    ? `/api/v1/assets/extract/${taskId}?projectId=${encodeURIComponent(projectId)}`
    : `/api/v1/assets/extract/${taskId}`;
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

// Get all assets for a project (flat list)
export async function getAssetsByProject(projectId: string): Promise<Asset[]> {
  const response = await axios.get(
    `/api/v1/assets?projectId=${projectId}`,
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

// Get project assets grouped by type (characters/scenes/props) — used for pre-check before re-extraction
export async function getGroupedAssetsByProject(
  projectId: string
): Promise<{ characters: Asset[]; scenes: Asset[]; props: Asset[] }> {
  const response = await axios.get(`/api/v1/assets?projectId=${projectId}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  // API returns flat array { data: Asset[] } — group by type
  const data = response.data;
  const flatAssets: Asset[] = data.data || [];
  return {
    characters: flatAssets.filter((a) => a.type === "character"),
    scenes: flatAssets.filter((a) => a.type === "scene"),
    props: flatAssets.filter((a) => a.type === "prop"),
  };
}

// Get assets by type
export async function getAssetsByType(projectId: string, type: string): Promise<Asset[]> {
  const response = await axios.get(
    `/api/v1/assets?projectId=${projectId}&type=${type}`,
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

// Update asset prompt
export async function updateAssetPrompt(
  assetId: string,
  prompt: string,
  description?: string
): Promise<Asset> {
  const response = await axios.patch(
    `/api/v1/assets/${assetId}`,
    { prompt, description },
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

// Polish asset prompt using LLM
export async function pollishPrompt(
  projectId: string,
  assetType: "character" | "scene" | "prop",
  currentPrompt: string
): Promise<string> {
  const response = await axios.post(
    `/api/v1/assets/polish`,
    { projectId, assetType, currentPrompt },
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

  return response.data.polishedPrompt;
}

// Delete asset
export async function deleteAsset(assetId: string): Promise<void> {
  const response = await axios.delete(
    `/api/v1/assets/${assetId}`,
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

// ─── Asset Image Generation ─────────────────────────────────────────────────────

export interface GenerateTaskResult {
  taskId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  imageUrl?: string;
  error?: { code: string; message: string };
}

// Trigger single asset image generation
export async function generateAssetImage(
  assetId: string,
  projectId: string
): Promise<{ taskId: string; status: string }> {
  const response = await axios.post(
    `/api/v1/assets/generate`,
    { assetId, projectId },
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

  return response.data;
}

// Poll generation status
export async function getAssetGenerationResult(taskId: string): Promise<GenerateTaskResult> {
  const response = await axios.get(
    `/api/v1/assets/generate/${taskId}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data;
}