// Duplicate Project API Route

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

    // Get original project
    const projects = await query<Record<string, unknown>>(
      `SELECT * FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (projects.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "项目不存在" } },
        { status: 404 }
      );
    }

    const original = projects[0];

    // Create duplicate
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newName = `${original.name} 副本`;

    await execute(
      `INSERT INTO "Project" (
        id, "userId", name, description, genre, "targetAudience", style,
        "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
        "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status,
        "coverUrl", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        newId,
        userId,
        newName,
        original.description,
        original.genre,
        original.targetAudience,
        original.style,
        original.styleTags,
        original.aspectRatio,
        original.width,
        original.height,
        original.llmModel,
        original.t2iModel,
        original.i2vModel,
        original.samplingSteps,
        original.cfgScale,
        original.shareAssets,
        "draft", // Reset status to draft
        null, // No cover
        now,
        now,
      ]
    );

    // Fetch the new project
    const newProjects = await query<Record<string, unknown>>(
      `SELECT * FROM "Project" WHERE id = $1`,
      [newId]
    );

    return NextResponse.json({ data: newProjects[0] }, { status: 201 });
  } catch (error) {
    console.error("Duplicate project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
