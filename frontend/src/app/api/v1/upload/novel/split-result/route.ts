// Split Result API Route - GET and POST for split result operations

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import axios from "axios";
import { query, execute } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

interface AIModel {
  id: string;
  type: string;
  code: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string | null;
  modelName: string | null;
}

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// Map frontend strategy to backend strategy
function mapStrategy(strategy: string): string {
  const mapping: Record<string, string> = {
    balanced: "balanced",
    plot: "plot",
    character: "character",
    custom: "custom"
  };
  return mapping[strategy] || "balanced";
}

// Get LLM config by project ID (fallback: look up by fileId if projectId not provided)
async function getLLMConfigByProject(projectId: string | null, fileId: string): Promise<{
  provider: string;
  apiKey: string;
  endpoint: string;
  modelName: string;
} | null> {
  try {
    let llmModelCode: string | null = null;

    // Try to get llmModel from project first
    if (projectId) {
      const projects = await query<{ llmModel: string }>(
        `SELECT "llmModel" FROM "Project" WHERE id = $1`,
        [projectId]
      );
      if (projects.length > 0 && projects[0].llmModel) {
        llmModelCode = projects[0].llmModel;
      }
    }

    // Fallback: look up project from fileId
    if (!llmModelCode) {
      const files = await query<{ projectId: string | null }>(
        `SELECT "projectId" FROM "NovelFile" WHERE id = $1`,
        [fileId]
      );
      if (files.length > 0 && files[0].projectId) {
        const projects = await query<{ llmModel: string }>(
          `SELECT "llmModel" FROM "Project" WHERE id = $1`,
          [files[0].projectId]
        );
        if (projects.length > 0 && projects[0].llmModel) {
          llmModelCode = projects[0].llmModel;
        }
      }
    }

    if (!llmModelCode) {
      return null;
    }

    // Get AIModel configuration
    const models = await query<AIModel>(
      `SELECT id, type, code, name, provider, endpoint, "apiKey", "modelName", "modelId"
       FROM "AIModel" WHERE code = $1 AND type = 'llm'`,
      [llmModelCode]
    );

    if (!models.length) {
      return null;
    }

    const model = models[0];

    // Map provider to endpoint
    const providerEndpoints: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      deepseek: "https://api.deepseek.com/v1",
      anthropic: "https://api.anthropic.com/v1",
    };

    // Priority: modelId > modelName > code (consistent with test API)
    const apiModel = model.modelId || model.modelName || llmModelCode;
    // Use model's endpoint if configured, otherwise fall back to provider default
    const endpoint = model.endpoint
      ? model.endpoint
      : (providerEndpoints[model.provider] || "https://api.deepseek.com/v1");
    const provider = model.provider || "deepseek";

    return {
      provider,
      apiKey: model.apiKey || "",
      endpoint,
      modelName: apiModel,
    };
  } catch (error) {
    console.error("Failed to get LLM config:", error);
    return null;
  }
}

// POST - Trigger split result generation by calling FastAPI backend
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileId, projectId, strategy, targetEpisodes, shotRangeMin, shotRangeMax, keepChapterIntegrity, specialFirstLast, preserveNarrative, customPrompt } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少文件ID" } },
        { status: 400 }
      );
    }

    // Get LLM config from project settings (using projectId or fallback to fileId)
    const llmConfig = await getLLMConfigByProject(projectId, fileId);

    // Build request to FastAPI
    const fastApiPayload: Record<string, unknown> = {
      fileId,
      strategy: mapStrategy(strategy) || "balanced",
      targetEpisodes: targetEpisodes || 0,
      shotRangeMin: shotRangeMin || 8,
      shotRangeMax: shotRangeMax || 14,
      keepChapterIntegrity: keepChapterIntegrity ?? true,
      specialFirstLast: specialFirstLast ?? true,
      preserveNarrative: preserveNarrative ?? false,
      customPrompt: customPrompt || ""
    };

    // Add LLM config if available
    if (llmConfig) {
      fastApiPayload.llmProvider = llmConfig.provider;
      fastApiPayload.llmApiKey = llmConfig.apiKey;
      fastApiPayload.llmEndpoint = llmConfig.endpoint;
      fastApiPayload.llmModelName = llmConfig.modelName;
    }

    // Call FastAPI backend to trigger split
    const fastApiResponse = await axios.post(
      `${FASTAPI_URL}/api/v1/novel/split`,
      fastApiPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 180000, // 3 minutes timeout for LLM call
      }
    );

    const result = fastApiResponse.data;

    return NextResponse.json(
      {
        data: {
          taskId: result.taskId,
          status: result.status,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Split result trigger error:", error);

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动，请先启动 FastAPI 服务" } },
          { status: 503 }
        );
      }
      if (error.response) {
        return NextResponse.json(
          { error: { code: "LLM_ERROR", message: error.response.data?.detail || "LLM 调用失败" } },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

// Persist episodes into Episode table after fetching from FastAPI
async function persistEpisodes(
  fileId: string,
  projectId: string,
  episodes: Array<{
    orderIndex: number;
    title: string;
    summary: string;
    estimatedShots: number;
    chapters: string[];
    sceneDensity: number;
  }>
): Promise<void> {
  if (!episodes || episodes.length === 0) return;

  const now = new Date().toISOString();

  // DELETE old episodes first (handles re-generation case)
  await execute(
    `DELETE FROM "Episode" WHERE "projectId" = $1`,
    [projectId]
  );

  for (const ep of episodes) {
    await execute(
      `INSERT INTO "Episode" (id, "projectId", title, summary, "orderIndex", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        ep.title,
        ep.summary || "",
        ep.orderIndex,
        "pending",
        now,
        now,
      ]
    );
  }
  console.log(`Persisted ${episodes.length} episodes for project ${projectId}`);
}

// GET - Retrieve split result by taskId from FastAPI backend
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const taskId = request.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少任务ID" } },
        { status: 400 }
      );
    }

    // Handle taskId=existing: load from Episode table directly
    if (taskId === "existing") {
      const projectId = request.nextUrl.searchParams.get("projectId");
      if (!projectId) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "缺少项目ID" } },
          { status: 400 }
        );
      }

      const episodes = await query<{
        id: string;
        title: string;
        summary: string | null;
        orderIndex: number;
        createdAt: Date;
      }>(
        `SELECT id, title, summary, "orderIndex", "createdAt"
         FROM "Episode" WHERE "projectId" = $1 ORDER BY "orderIndex" ASC`,
        [projectId]
      );

      const result = {
        taskId: "existing",
        status: "completed" as const,
        episodes: episodes.map((ep) => ({
          orderIndex: ep.orderIndex,
          title: ep.title,
          summary: ep.summary || "",
          estimatedShots: 0,
          chapters: [] as string[],
          sceneDensity: 0.5,
        })),
        totalEpisodes: episodes.length,
        strategy: "existing",
        generatedAt: episodes[0]?.createdAt?.toISOString() || new Date().toISOString(),
      };

      return NextResponse.json({ data: result }, { status: 200 });
    }

    // Call FastAPI backend to get result
    const fastApiResponse = await axios.get(
      `${FASTAPI_URL}/api/v1/novel/split/${taskId}`,
      {
        timeout: 30000,
      }
    );

    const result = fastApiResponse.data;

    // Persist episodes into Episode table if split completed successfully
    if (result.status === "completed" && result.episodes && result.episodes.length > 0) {
      // Look up projectId from fileId
      const files = await query<{ projectId: string | null }>(
        `SELECT "projectId" FROM "NovelFile" WHERE id = $1`,
        [result.fileId]
      );
      if (files.length > 0 && files[0].projectId) {
        await persistEpisodes(result.fileId, files[0].projectId, result.episodes);
      }
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Split result query error:", error);

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动" } },
          { status: 503 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "任务不存在或已过期" } },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}