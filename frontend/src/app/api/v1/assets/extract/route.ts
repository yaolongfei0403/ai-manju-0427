// Asset Extract API Route - POST trigger extraction

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import axios from "axios";
import { query } from "@/lib/db";

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

// Get LLM config by project ID
async function getLLMConfigByProject(projectId: string): Promise<{
  provider: string;
  apiKey: string;
  endpoint: string;
  modelName: string;
} | null> {
  try {
    const projects = await query<{ llmModel: string }>(
      `SELECT "llmModel" FROM "Project" WHERE id = $1`,
      [projectId]
    );
    if (!projects.length || !projects[0].llmModel) {
      return null;
    }

    const models = await query<AIModel>(
      `SELECT id, type, code, name, provider, endpoint, "apiKey", "modelName", "modelId"
       FROM "AIModel" WHERE code = $1 AND type = 'llm'`,
      [projects[0].llmModel]
    );

    if (!models.length) {
      return null;
    }

    const model = models[0];
    const providerEndpoints: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      deepseek: "https://api.deepseek.com/v1",
      anthropic: "https://api.anthropic.com/v1",
    };

    const apiModel = model.modelId || model.modelName || projects[0].llmModel;
    const endpoint = model.endpoint
      ? model.endpoint
      : (providerEndpoints[model.provider] || "https://api.deepseek.com/v1");

    return {
      provider: model.provider || "deepseek",
      apiKey: model.apiKey || "",
      endpoint,
      modelName: apiModel,
    };
  } catch (error) {
    console.error("Failed to get LLM config:", error);
    return null;
  }
}

// POST - Trigger asset extraction
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
    const { projectId, fileId, episodes } = body;

    if (!projectId || !fileId || !episodes) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少必要参数" } },
        { status: 400 }
      );
    }

    // Get LLM config from project
    const llmConfig = await getLLMConfigByProject(projectId);

    // Build request to FastAPI
    const fastApiPayload: Record<string, unknown> = {
      projectId,
      fileId,
      episodes,
    };

    // Add LLM config if available
    if (llmConfig) {
      fastApiPayload.llmProvider = llmConfig.provider;
      fastApiPayload.llmApiKey = llmConfig.apiKey;
      fastApiPayload.llmEndpoint = llmConfig.endpoint;
      fastApiPayload.llmModelName = llmConfig.modelName;
    }

    // Call FastAPI backend to trigger extraction
    const fastApiResponse = await axios.post(
      `${FASTAPI_URL}/api/v1/assets/extract`,
      fastApiPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 180000, // 3 minutes timeout
      }
    );

    const result = fastApiResponse.data;

    return NextResponse.json(
      {
        data: {
          taskId: result.taskId,
          status: result.status || "processing",
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Asset extraction trigger error:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动" } },
          { status: 503 }
        );
      }
      if (error.response) {
        return NextResponse.json(
          { error: { code: "LLM_ERROR", message: error.response.data?.detail || "提取失败" } },
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