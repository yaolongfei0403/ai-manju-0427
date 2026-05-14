// Split Strategy Configuration API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
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
  const authHeader = request.headers.get("Authorization");
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

const VALID_STRATEGIES = ["balanced", "plot", "character", "custom"] as const;
type StrategyType = typeof VALID_STRATEGIES[number];

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
    const {
      fileId,
      projectId,
      strategy,
      targetEpisodes,
      shotRangeMin,
      shotRangeMax,
      keepChapterIntegrity,
      specialFirstLast,
      preserveNarrative,
      customPrompt,
    } = body;

    // Validation
    if (!fileId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少文件ID" } },
        { status: 400 }
      );
    }

    // Verify file exists and belongs to user
    const files = await query<{ id: string; userId: string; projectId: string | null }>(
      `SELECT id, "userId", "projectId" FROM "NovelFile" WHERE id = $1`,
      [fileId]
    );
    if (files.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "文件不存在" } },
        { status: 404 }
      );
    }
    if (files[0].userId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权操作此文件" } },
        { status: 403 }
      );
    }

    if (!strategy || !VALID_STRATEGIES.includes(strategy as StrategyType)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的分集策略" } },
        { status: 400 }
      );
    }

    if (strategy === "custom" && (!customPrompt || customPrompt.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请输入自定义分集提示词" } },
        { status: 400 }
      );
    }

    // Validate shot range
    const min = parseInt(shotRangeMin) || 8;
    const max = parseInt(shotRangeMax) || 14;
    if (min < 3 || max > 30 || min > max) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "分镜数范围无效" } },
        { status: 400 }
      );
    }

    // Persist strategy config to database
    const configId = randomUUID();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO "SplitStrategyConfig" (id, "fileId", strategy, "targetEpisodes", "shotRangeMin", "shotRangeMax", "keepChapterIntegrity", "specialFirstLast", "preserveNarrative", "customPrompt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT ("fileId") DO UPDATE SET
         strategy = EXCLUDED.strategy,
         "targetEpisodes" = EXCLUDED."targetEpisodes",
         "shotRangeMin" = EXCLUDED."shotRangeMin",
         "shotRangeMax" = EXCLUDED."shotRangeMax",
         "keepChapterIntegrity" = EXCLUDED."keepChapterIntegrity",
         "specialFirstLast" = EXCLUDED."specialFirstLast",
         "preserveNarrative" = EXCLUDED."preserveNarrative",
         "customPrompt" = EXCLUDED."customPrompt",
         "updatedAt" = EXCLUDED."updatedAt"`,
      [
        configId,
        fileId,
        strategy,
        parseInt(targetEpisodes) || 0,
        min,
        max,
        Boolean(keepChapterIntegrity),
        Boolean(specialFirstLast),
        Boolean(preserveNarrative),
        customPrompt || "",
        now,
        now,
      ]
    );

    // Get LLM config from project settings
    const llmConfig = await getLLMConfigByProject(projectId, fileId);

    // Build request to FastAPI
    const fastApiPayload: Record<string, unknown> = {
      fileId,
      strategy,
      targetEpisodes: parseInt(targetEpisodes) || 0,
      shotRangeMin: min,
      shotRangeMax: max,
      keepChapterIntegrity: Boolean(keepChapterIntegrity),
      specialFirstLast: Boolean(specialFirstLast),
      preserveNarrative: Boolean(preserveNarrative),
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
    let taskId: string;
    let status: string;

    try {
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
      taskId = result.taskId;
      status = result.status;
    } catch (error) {
      console.error("FastAPI split error:", error);
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
        { error: { code: "INTERNAL_ERROR", message: "分集服务调用失败" } },
        { status: 500 }
      );
    }

    // Return task info from FastAPI
    const result = {
      taskId,
      status,
      config: {
        strategy,
        targetEpisodes: parseInt(targetEpisodes) || 0,
        shotRangeMin: min,
        shotRangeMax: max,
        keepChapterIntegrity: Boolean(keepChapterIntegrity),
        specialFirstLast: Boolean(specialFirstLast),
        preserveNarrative: Boolean(preserveNarrative),
        customPrompt: customPrompt || "",
      },
    };

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Split strategy error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
