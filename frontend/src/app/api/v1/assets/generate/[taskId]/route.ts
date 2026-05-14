// Asset Generation Status Route
// GET /api/v1/assets/generate/{taskId} - Poll generation status

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

// GET /api/v1/assets/generate/{taskId}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "缺少任务ID" } }, { status: 400 });
    }

    const fastApiResponse = await axios.get(
      `${FASTAPI_URL}/api/v1/assets/generate/${taskId}`,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    return NextResponse.json(fastApiResponse.data, { status: 200 });
  } catch (error) {
    console.error("[generate/status] error:", error);
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return NextResponse.json({ error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动" } }, { status: 503 });
      }
      if (error.response?.status === 404) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "任务不存在或已过期" } }, { status: 404 });
      }
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } }, { status: 500 });
  }
}