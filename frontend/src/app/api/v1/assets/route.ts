// Assets CRUD API Route - GET list, PATCH update, DELETE delete

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

// GET - List assets by project and/or type
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
    const type = request.nextUrl.searchParams.get("type");

    if (!projectId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少项目ID" } },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const projects = await query<{ id: string }>(
      `SELECT id FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [projectId, userId]
    );
    if (!projects.length) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权访问此项目" } },
        { status: 403 }
      );
    }

    // Build query
    let sql = `SELECT * FROM "Asset" WHERE "projectId" = $1`;
    const params: any[] = [projectId];

    if (type) {
      sql += ` AND type = $2`;
      params.push(type.toUpperCase());
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const assets = await query(sql, params);

    return NextResponse.json({ data: assets }, { status: 200 });
  } catch (error) {
    console.error("Assets list error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}