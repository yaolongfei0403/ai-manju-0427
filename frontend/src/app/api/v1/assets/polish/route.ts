// Asset Polish API Route - POST /api/v1/assets/polish

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

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

// POST - Polish asset prompt via LLM
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
    const { projectId, assetType, currentPrompt } = body;

    if (!projectId || !assetType || !currentPrompt) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少必要参数" } },
        { status: 400 }
      );
    }

    const fastApiResponse = await axios.post(
      `${FASTAPI_URL}/api/v1/assets/polish`,
      { projectId, assetType, currentPrompt },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      }
    );

    return NextResponse.json(fastApiResponse.data, { status: 200 });
  } catch (error) {
    console.error("Asset polish error:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动" } },
          { status: 503 }
        );
      }
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return NextResponse.json(
          { error: { code: "TIMEOUT", message: "润色请求超时，请稍后重试" } },
          { status: 504 }
        );
      }
      if (error.response) {
        return NextResponse.json(
          { error: { code: "LLM_ERROR", message: error.response.data?.detail || "润色失败" } },
          { status: error.response.status }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}