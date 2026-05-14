// Restore Project API Route

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    // Check project exists and belongs to user
    const projects = await query<{ id: string; status: string }>(
      `SELECT id, status FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (projects.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "项目不存在" } },
        { status: 404 }
      );
    }

    const originalStatus = projects[0].status;

    // Restore project - set status back to draft
    const now = new Date().toISOString();
    await query(
      `UPDATE "Project" SET status = $1, "updatedAt" = $2 WHERE id = $3`,
      ["draft", now, id]
    );

    // Fetch restored project
    const restoredProjects = await query<Record<string, unknown>>(
      `SELECT * FROM "Project" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ data: restoredProjects[0] });
  } catch (error) {
    console.error("Restore project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
