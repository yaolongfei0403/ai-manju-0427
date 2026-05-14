// Models Admin API - CRUD operations

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

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    // Only admin can access
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "需要管理员权限" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // llm, t2i, i2v

    let sql = `SELECT id, type, code, name, provider, description, endpoint, "apiKey",
                      "modelName", "modelId", status, env, "maxTokens", temperature, "systemPrompt",
                      resolution, quality, duration, fps, timeout, retry, proxy,
                      "customHeaders", "createdAt", "updatedAt"
               FROM "AIModel"`;

    const params: unknown[] = [];
    if (type) {
      sql += ` WHERE type = $1`;
      params.push(type);
    }
    sql += ` ORDER BY type, name`;

    const models = await query<Record<string, unknown>>(sql, params);
    return NextResponse.json({ data: models });
  } catch (error) {
    console.error("Get models error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "需要管理员权限" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type,
      code,
      name,
      provider,
      description,
      endpoint,
      apiKey,
      modelName,
      modelId,
      maxTokens,
      temperature,
      systemPrompt,
      resolution,
      quality,
      duration,
      fps,
      timeout = 30,
      retry = 3,
      proxy,
      customHeaders,
    } = body;

    // Validation
    if (!type || !["llm", "t2i", "i2v"].includes(type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择有效的模型类型" } },
        { status: 400 }
      );
    }

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "模型代码不能为空" } },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "模型名称不能为空" } },
        { status: 400 }
      );
    }

    if (!endpoint || endpoint.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "API端点不能为空" } },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM "AIModel" WHERE code = $1`,
      [code.trim()]
    );

    if (existing) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "模型代码已存在" } },
        { status: 400 }
      );
    }

    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO "AIModel" (id, type, code, name, provider, description, endpoint,
        "apiKey", "modelName", "modelId", status, env, "maxTokens", temperature, "systemPrompt",
        resolution, quality, duration, fps, timeout, retry, proxy, "customHeaders",
        "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
      [
        id,
        type,
        code.trim(),
        name.trim(),
        provider || "custom",
        description?.trim() || null,
        endpoint.trim(),
        apiKey?.trim() || null,
        modelName?.trim() || null,
        modelId?.trim() || null,
        "offline",
        "prod",
        maxTokens || null,
        temperature || null,
        systemPrompt?.trim() || null,
        resolution || null,
        quality || null,
        duration || null,
        fps || null,
        timeout,
        retry,
        proxy?.trim() || null,
        customHeaders ? JSON.stringify(customHeaders) : null,
        now,
        now,
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

    return NextResponse.json({ data: models[0] }, { status: 201 });
  } catch (error) {
    console.error("Create model error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
