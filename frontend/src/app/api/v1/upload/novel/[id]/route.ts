// Delete Novel File API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { existsSync, unlink } from "fs";
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

export async function DELETE(
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

    // Get the novel file
    const novelFiles = await query<{ id: string; userId: string; path: string }>(
      `SELECT id, "userId", path FROM "NovelFile" WHERE id = $1`,
      [id]
    );

    if (novelFiles.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "文件不存在" } },
        { status: 404 }
      );
    }

    if (novelFiles[0].userId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权删除此文件" } },
        { status: 403 }
      );
    }

    // Delete physical file
    if (existsSync(novelFiles[0].path)) {
      try {
        await unlink(novelFiles[0].path);
      } catch {
        // Ignore file deletion errors
      }
    }

    // Delete related records (cascade should handle this, but be explicit)
    await execute(`DELETE FROM "DisclaimerAgreement" WHERE "fileId" = $1`, [id]);
    await execute(`DELETE FROM "SplitStrategyConfig" WHERE "fileId" = $1`, [id]);
    await execute(`DELETE FROM "NovelFile" WHERE id = $1`, [id]);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete novel error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}