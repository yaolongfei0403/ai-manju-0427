// Projects API Route - Real PostgreSQL database

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query, execute } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";

// Validation constants
const GENRES = ["scifi", "fantasy", "urban", "ancient", "mystery", "romance", "xianxia", "horror"];
const TARGET_AUDIENCES = ["all_age", "teen", "adult"];
const STYLES = ["scifi-real", "anime", "ink", "comic", "pixel", "3d", "sketch", "custom"];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3"];

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  console.log("[API Route] Authorization header:", authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch (e) {
    console.log("[API Route] Token verification failed:", e);
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

    const projects = await query<Record<string, unknown>>(
      `SELECT id, "userId", name, description, genre, "targetAudience", style,
              "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
              "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status,
              "isStarred", "coverUrl", "coverWidth", "coverHeight", "createdAt", "updatedAt"
       FROM "Project" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    );

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

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
    const {
      name,
      description,
      genre,
      targetAudience,
      style,
      styleTags = [],
      aspectRatio = "16:9",
      width = 1024,
      height = 576,
      llmModel = "gpt4o",
      t2iModel = "sdxl",
      i2vModel = "runway",
      samplingSteps = 30,
      cfgScale = 7.0,
      shareAssets = true,
      coverUrl,
      coverWidth,
      coverHeight,
    } = body;

    // Validation
    if (!name || name.trim().length < 2 || name.trim().length > 50) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "项目名称需2-50字符" } },
        { status: 400 }
      );
    }

    if (!genre || !GENRES.includes(genre)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的题材类型" } },
        { status: 400 }
      );
    }

    if (!targetAudience || !TARGET_AUDIENCES.includes(targetAudience)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的目标受众" } },
        { status: 400 }
      );
    }

    if (!style || !STYLES.includes(style)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的视觉风格" } },
        { status: 400 }
      );
    }

    if (!aspectRatio || !ASPECT_RATIOS.includes(aspectRatio)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的画幅比例" } },
        { status: 400 }
      );
    }

    // Create project in database
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO "Project" (id, "userId", name, description, genre, "targetAudience",
        style, "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
        "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status, "coverUrl",
        "coverWidth", "coverHeight", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        projectId,
        userId,
        name.trim(),
        description?.trim() || null,
        genre,
        targetAudience,
        style,
        styleTags,
        aspectRatio,
        width,
        height,
        llmModel,
        t2iModel,
        i2vModel,
        samplingSteps,
        cfgScale,
        shareAssets,
        "draft",
        coverUrl || null,
        coverWidth || null,
        coverHeight || null,
        now,
        now,
      ]
    );

    // Fetch the created project
    const projects = await query<Record<string, unknown>>(
      `SELECT id, "userId", name, description, genre, "targetAudience", style,
              "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
              "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status,
              "isStarred", "coverUrl", "coverWidth", "coverHeight", "createdAt", "updatedAt"
       FROM "Project" WHERE id = $1`,
      [projectId]
    );

    return NextResponse.json({ data: projects[0] }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
