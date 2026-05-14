// Novel Metadata Update API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query, execute } from "@/lib/db";

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

export async function PATCH(
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

    // Check novel file exists and belongs to user
    const novelFiles = await query<{ id: string; userId: string }>(
      `SELECT id, "userId" FROM "NovelFile" WHERE id = $1`,
      [id]
    );

    if (novelFiles.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "小说文件不存在" } },
        { status: 404 }
      );
    }

    if (novelFiles[0].userId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权修改此文件" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, author, genre, style } = body;

    const now = new Date().toISOString();
    await execute(
      `UPDATE "NovelFile" SET
        title = COALESCE($1, title),
        author = COALESCE($2, author),
        genre = COALESCE($3, genre),
        style = COALESCE($4, style),
        "updatedAt" = $5
       WHERE id = $6`,
      [title || null, author || null, genre || null, style || null, now, id]
    );

    // Fetch updated record
    const updatedFiles = await query(
      `SELECT id, "originalName", title, author, genre, style, format, size, "estimatedWords", status, "createdAt", "updatedAt"
       FROM "NovelFile" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ data: updatedFiles[0] });
  } catch (error) {
    console.error("Update novel metadata error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const novelFiles = await query(
      `SELECT id, "originalName", title, author, genre, style, format, size, "estimatedWords", status, "createdAt", "updatedAt"
       FROM "NovelFile" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (novelFiles.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "小说文件不存在" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: novelFiles[0] });
  } catch (error) {
    console.error("Get novel metadata error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}