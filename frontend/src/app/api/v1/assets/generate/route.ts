// Asset Image Generation API Route
// POST /api/v1/assets/generate - Trigger generation
// GET  /api/v1/assets/generate/{taskId} - Poll status

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// POST /api/v1/assets/generate
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
    }

    const body = await request.json();
    const { assetId, projectId } = body;

    if (!assetId || !projectId) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "缺少资产ID或项目ID" } }, { status: 400 });
    }

    // Verify project ownership
    const fastApiResponse = await axios.post(
      `${FASTAPI_URL}/api/v1/assets/generate`,
      { assetId, projectId },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return NextResponse.json(fastApiResponse.data, { status: 202 });
  } catch (error) {
    console.error("[generate] error:", error);
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json({ error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动" } }, { status: 503 });
      }
      if (error.response?.status === 404) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "资产不存在" } }, { status: 404 });
      }
      if (error.response?.status === 403) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "无权操作此资产" } }, { status: 403 });
      }
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } }, { status: 500 });
  }
}