// Load existing episodes from Episode table (bypass FastAPI task flow)

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

    // Load episodes from Episode table
    const episodes = await query<{
      id: string;
      title: string;
      summary: string | null;
      orderIndex: number;
      status: string;
      createdAt: Date;
    }>(
      `SELECT id, title, summary, "orderIndex", status, "createdAt"
       FROM "Episode"
       WHERE "projectId" = $1
       ORDER BY "orderIndex" ASC`,
      [projectId]
    );

    // Get the fileId for this project's novel
    const novelFiles = await query<{ id: string }>(
      `SELECT id FROM "NovelFile" WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
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
      fileId: novelFiles[0]?.id || null,
    };

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Load existing episodes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
