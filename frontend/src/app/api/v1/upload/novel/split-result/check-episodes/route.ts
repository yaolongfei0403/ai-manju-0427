// Check if episodes exist for a project - for skipping re-split

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";

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

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少项目ID" } },
        { status: 400 }
      );
    }

    // Check if any episodes exist for this project
    const episodes = await query<{ id: string }>(
      `SELECT id FROM "Episode" WHERE "projectId" = $1 LIMIT 1`,
      [projectId]
    );

    return NextResponse.json(
      { data: { hasEpisodes: episodes.length > 0 } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check episodes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
