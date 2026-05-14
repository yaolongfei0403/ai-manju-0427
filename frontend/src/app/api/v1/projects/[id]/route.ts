// Single Project API Route

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

    const projects = await query<Record<string, unknown>>(
      `SELECT id, "userId", name, description, genre, "targetAudience", style,
              "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
              "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status,
              "isStarred", "coverUrl", "coverWidth", "coverHeight", "createdAt", "updatedAt"
       FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (projects.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "项目不存在" } },
        { status: 404 }
      );
    }

    const project = projects[0];

    // Fetch related data: novel files, disclaimer agreements, split strategy configs
    const novelFiles = await query(
      `SELECT id, "originalName", format, size, "estimatedWords", status, "createdAt"
       FROM "NovelFile" WHERE "projectId" = $1 ORDER BY "createdAt" DESC`,
      [id]
    );

    const disclaimerAgreements = await query(
      `SELECT da.id, da."fileId", da.agreed, da."agreedAt"
       FROM "DisclaimerAgreement" da
       JOIN "NovelFile" nf ON nf.id = da."fileId"
       WHERE nf."projectId" = $1`,
      [id]
    );

    const splitStrategies = await query(
      `SELECT ss.id, ss."fileId", ss.strategy, ss."targetEpisodes", ss."shotRangeMin", ss."shotRangeMax",
              ss."keepChapterIntegrity", ss."specialFirstLast", ss."preserveNarrative", ss."createdAt"
       FROM "SplitStrategyConfig" ss
       JOIN "NovelFile" nf ON nf.id = ss."fileId"
       WHERE nf."projectId" = $1`,
      [id]
    );

    return NextResponse.json({
      data: {
        ...project,
        novelFiles,
        disclaimerAgreements,
        splitStrategies,
      }
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const existingProjects = await query<{ id: string; name: string }>(
      `SELECT id, name FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (existingProjects.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "项目不存在" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      description,
      genre,
      targetAudience,
      style,
      styleTags,
      aspectRatio = "16:9",
      width = 1024,
      height = 576,
      llmModel = "gpt4o",
      t2iModel = "sdxl",
      i2vModel = "runway",
      samplingSteps = 30,
      cfgScale = 7.0,
      shareAssets = true,
      status,
      coverUrl,
      coverWidth,
      coverHeight,
    } = body;

    // Validation
    const VALID_GENRES = ["scifi", "fantasy", "urban", "ancient", "mystery", "romance", "xianxia", "horror"];
    const VALID_AUDIENCES = ["all_age", "teen", "adult"];
    const VALID_STYLES = ["scifi-real", "anime", "ink", "comic", "pixel", "3d", "sketch", "custom"];
    const VALID_RATIOS = ["16:9", "9:16", "1:1", "4:3"];
    const VALID_STATUSES = ["draft", "active", "completed", "trashed"];

    if (genre && !VALID_GENRES.includes(genre)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的题材类型" } },
        { status: 400 }
      );
    }

    if (targetAudience && !VALID_AUDIENCES.includes(targetAudience)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的目标受众" } },
        { status: 400 }
      );
    }

    if (style && !VALID_STYLES.includes(style)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的视觉风格" } },
        { status: 400 }
      );
    }

    if (aspectRatio && !VALID_RATIOS.includes(aspectRatio)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的画幅比例" } },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的状态" } },
        { status: 400 }
      );
    }

    // Update project - only use COALESCE for nullable fields where undefined means "no change"
    // For description, we want empty string to be a valid update (clear the field)
    const now = new Date().toISOString();
    await query(
      `UPDATE "Project" SET
        description = $1,
        genre = COALESCE($2, genre),
        "targetAudience" = COALESCE($3, "targetAudience"),
        style = COALESCE($4, style),
        "styleTags" = COALESCE($5, "styleTags"),
        "aspectRatio" = COALESCE($6, "aspectRatio"),
        width = COALESCE($7, width),
        height = COALESCE($8, height),
        "llmModel" = COALESCE($9, "llmModel"),
        "t2iModel" = COALESCE($10, "t2iModel"),
        "i2vModel" = COALESCE($11, "i2vModel"),
        "samplingSteps" = COALESCE($12, "samplingSteps"),
        "cfgScale" = COALESCE($13, "cfgScale"),
        "shareAssets" = COALESCE($14, "shareAssets"),
        status = COALESCE($15, status),
        "coverUrl" = $16,
        "coverWidth" = $17,
        "coverHeight" = $18,
        "updatedAt" = $19
       WHERE id = $20 AND "userId" = $21`,
      [
        description,
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
        status,
        coverUrl || null,
        coverWidth || null,
        coverHeight || null,
        now,
        id,
        userId,
      ]
    );

    // Fetch updated project
    const projects = await query<Record<string, unknown>>(
      `SELECT id, "userId", name, description, genre, "targetAudience", style,
              "styleTags", "aspectRatio", width, height, "llmModel", "t2iModel",
              "i2vModel", "samplingSteps", "cfgScale", "shareAssets", status,
              "isStarred", "coverUrl", "coverWidth", "coverHeight", "createdAt", "updatedAt"
       FROM "Project" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ data: projects[0] });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
