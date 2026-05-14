// Get Novel File by Project ID API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    // Get the most recent novel file for this project
    const novelFiles = await query(
      `SELECT id, "originalName", title, author, genre, style, format, size, "estimatedWords", status, "createdAt", "updatedAt"
       FROM "NovelFile" WHERE "projectId" = $1 AND "userId" = $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [projectId, userId]
    );

    if (novelFiles.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "该项目暂无上传的小说" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: novelFiles[0] });
  } catch (error) {
    console.error("Get novel by project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}