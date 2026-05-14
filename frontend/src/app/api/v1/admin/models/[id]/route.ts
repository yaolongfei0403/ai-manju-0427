// Model Single Item API - GET/PUT/DELETE

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query, execute, queryOne } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";

function getUserFromRequest(request: NextRequest): { id: string; role: string } | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role?: string };
    return { id: payload.sub, role: payload.role || "user" };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "需要管理员权限" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const model = await queryOne<Record<string, unknown>>(
      `SELECT id, type, code, name, provider, description, endpoint, "apiKey",
              "modelName", "modelId", status, env, "maxTokens", temperature, "systemPrompt",
              resolution, quality, duration, fps, timeout, retry, proxy,
              "customHeaders", "createdAt", "updatedAt"
       FROM "AIModel" WHERE id = $1`,
      [id]
    );

    if (!model) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "模型不存在" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: model });
  } catch (error) {
    console.error("Get model error:", error);
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
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "需要管理员权限" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if model exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM "AIModel" WHERE id = $1`,
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "模型不存在" } },
        { status: 404 }
      );
    }

    const {
      name,
      provider,
      description,
      endpoint,
      apiKey,
      modelName,
      modelId,
      status,
      env,
      maxTokens,
      temperature,
      systemPrompt,
      resolution,
      quality,
      duration,
      fps,
      timeout,
      retry,
      proxy,
      customHeaders,
    } = body;

    const now = new Date().toISOString();

    await execute(
      `UPDATE "AIModel" SET
        name = COALESCE($1, name),
        provider = COALESCE($2, provider),
        description = COALESCE($3, description),
        endpoint = COALESCE($4, endpoint),
        "apiKey" = COALESCE($5, "apiKey"),
        "modelName" = COALESCE($6, "modelName"),
        "modelId" = COALESCE($7, "modelId"),
        status = COALESCE($8, status),
        env = COALESCE($9, env),
        "maxTokens" = COALESCE($10, "maxTokens"),
        temperature = COALESCE($11, temperature),
        "systemPrompt" = COALESCE($12, "systemPrompt"),
        resolution = COALESCE($13, resolution),
        quality = COALESCE($14, quality),
        duration = COALESCE($15, duration),
        fps = COALESCE($16, fps),
        timeout = COALESCE($17, timeout),
        retry = COALESCE($18, retry),
        proxy = COALESCE($19, proxy),
        "customHeaders" = COALESCE($20, "customHeaders"),
        "updatedAt" = $21
       WHERE id = $22`,
      [
        name?.trim() || null,
        provider || null,
        description?.trim() || null,
        endpoint?.trim() || null,
        apiKey?.trim() || null,
        modelName?.trim() || null,
        modelId?.trim() || null,
        status || null,
        env || null,
        maxTokens || null,
        temperature || null,
        systemPrompt?.trim() || null,
        resolution || null,
        quality || null,
        duration || null,
        fps || null,
        timeout || null,
        retry || null,
        proxy?.trim() || null,
        customHeaders ? JSON.stringify(customHeaders) : null,
        now,
        id,
      ]
    );

    const models = await query<Record<string, unknown>>(
      `SELECT id, type, code, name, provider, description, endpoint, "apiKey",
              "modelName", "modelId", status, env, "maxTokens", temperature, "systemPrompt",
              resolution, quality, duration, fps, timeout, retry, proxy,
              "customHeaders", "createdAt", "updatedAt"
       FROM "AIModel" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ data: models[0] });
  } catch (error) {
    console.error("Update model error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "需要管理员权限" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM "AIModel" WHERE id = $1`,
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "模型不存在" } },
        { status: 404 }
      );
    }

    await execute(`DELETE FROM "AIModel" WHERE id = $1`, [id]);

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("Delete model error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
