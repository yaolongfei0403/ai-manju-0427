// Models API Client

import axios from "axios";
import { useAuthStore } from "@/stores/auth";

export interface AIModel {
  id: string;
  type: "llm" | "t2i" | "i2v";
  code: string;
  name: string;
  provider: string;
  description: string | null;
  endpoint: string;
  apiKey: string | null;
  modelName: string | null;
  modelId: string | null;  // API调用时实际使用的模型ID
  status: "online" | "offline" | "testing";
  env: "prod" | "test" | "dev";
  maxTokens: number | null;
  temperature: number | null;
  systemPrompt: string | null;
  resolution: string | null;
  quality: string | null;
  duration: number | null;
  fps: number | null;
  timeout: number;
  retry: number;
  proxy: string | null;
  customHeaders: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicModel {
  code: string;
  name: string;
  provider: string;
  description: string | null;
}

export interface PublicModels {
  llm: PublicModel[];
  t2i: PublicModel[];
  i2v: PublicModel[];
}

export interface ApiError {
  code: string;
  message: string;
}

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Admin API - requires admin role
export async function getModels(type?: string): Promise<AIModel[]> {
  const url = type ? `/api/v1/admin/models?type=${type}` : "/api/v1/admin/models";
  const response = await axios.get<{ data: AIModel[] } | { error: ApiError }>(
    url,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function getModel(id: string): Promise<AIModel> {
  const response = await axios.get<{ data: AIModel } | { error: ApiError }>(
    `/api/v1/admin/models/${id}`,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export interface CreateModelData {
  type: "llm" | "t2i" | "i2v";
  code: string;
  name: string;
  provider: string;
  description?: string;
  endpoint: string;
  apiKey?: string;
  modelName?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  resolution?: string;
  quality?: string;
  duration?: number;
  fps?: number;
  timeout?: number;
  retry?: number;
  proxy?: string;
  customHeaders?: Record<string, string>;
}

export async function createModel(data: CreateModelData): Promise<AIModel> {
  const response = await axios.post<{ data: AIModel } | { error: ApiError }>(
    "/api/v1/admin/models",
    data,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export interface UpdateModelData {
  name?: string;
  provider?: string;
  description?: string;
  endpoint?: string;
  apiKey?: string;
  modelName?: string;
  modelId?: string;
  status?: "online" | "offline" | "testing";
  env?: "prod" | "test" | "dev";
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  resolution?: string;
  quality?: string;
  duration?: number;
  fps?: number;
  timeout?: number;
  retry?: number;
  proxy?: string;
  customHeaders?: Record<string, string>;
}

export async function updateModel(
  id: string,
  data: UpdateModelData
): Promise<AIModel> {
  const response = await axios.put<{ data: AIModel } | { error: ApiError }>(
    `/api/v1/admin/models/${id}`,
    data,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function deleteModel(id: string): Promise<void> {
  const response = await axios.delete<{ data: { id: string; deleted: boolean } } | { error: ApiError }>(
    `/api/v1/admin/models/${id}`,
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }
}

export interface TestResult {
  success: boolean;
  latency: number;
  message: string;
  status?: "online" | "offline";
  error?: string;
}

export async function testModelConnection(id: string): Promise<TestResult> {
  const response = await axios.post<{ data: TestResult } | { error: ApiError }>(
    `/api/v1/admin/models/${id}/test`,
    {},
    { headers: getAuthHeaders() }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

// Public API - for project creation page
export async function getPublicModels(): Promise<PublicModels> {
  const response = await axios.get<{ data: PublicModels } | { error: ApiError }>(
    "/api/v1/models"
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

// ─── New Model Config System (YAML-based) ─────────────────────────────────────

export interface ConfigEntry {
  provider: string;
  model: string;
  endpoint: string | null;
  api_key: string | null;
  timeout: number;
  extra: Record<string, unknown>;
}

export interface ResolvedConfig {
  llm: ConfigEntry | null;
  t2i: ConfigEntry | null;
  i2v: ConfigEntry | null;
  tts: ConfigEntry | null;
}

export interface CapabilityParam {
  type: string;
  options: string[] | null;
  range: [number, number] | null;
  default: unknown;
}

export interface ModelCapability {
  model: string;
  provider: string;
  model_type: string;
  params: Record<string, CapabilityParam>;
}

export async function getResolvedConfig(): Promise<ResolvedConfig> {
  const response = await axios.get<{ data: ResolvedConfig } | { error: ApiError }>(
    "/api/v1/admin/models/config",
    { headers: getAuthHeaders() }
  );
  if ("error" in response.data) throw new Error(response.data.error.message);
  return response.data.data;
}

export async function updateResolvedConfig(
  data: Partial<Record<string, ConfigEntry>>,
  projectPath?: string
): Promise<ResolvedConfig> {
  const params = projectPath ? { project_path: projectPath } : {};
  const response = await axios.post<{ data: ResolvedConfig } | { error: ApiError }>(
    "/api/v1/admin/models/config",
    data,
    { headers: getAuthHeaders(), params }
  );
  if ("error" in response.data) throw new Error(response.data.error.message);
  return response.data.data;
}

export async function getModelCapabilities(
  provider?: string
): Promise<ModelCapability[]> {
  const params = provider ? { provider } : {};
  const response = await axios.get<{ data: ModelCapability[] } | { error: ApiError }>(
    "/api/v1/admin/models/capabilities",
    { headers: getAuthHeaders(), params }
  );
  if ("error" in response.data) throw new Error(response.data.error.message);
  return response.data.data;
}

export async function validateModelParams(
  provider: string,
  model: string,
  params: Record<string, unknown>
): Promise<{ valid: boolean; validated: Record<string, unknown>; warnings: string[] }> {
  const response = await axios.post<{ data: { valid: boolean; validated: Record<string, unknown>; warnings: string[] } } | { error: ApiError }>(
    `/api/v1/admin/models/validate-params?provider=${provider}&model=${model}`,
    params,
    { headers: getAuthHeaders() }
  );
  if ("error" in response.data) throw new Error(response.data.error.message);
  return response.data.data;
}
