// Asset ID Route - PATCH update, DELETE delete for specific asset

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

// PATCH - Update asset prompt/description
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const { id: assetId } = await params;
    if (!assetId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少资产ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { prompt, description } = body;

    // Verify asset belongs to user's project
    const assets = await query<{ id: string; projectId: string }>(
      `SELECT id, "projectId" FROM "Asset" WHERE id = $1`,
      [assetId]
    );
    if (!assets.length) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "资产不存在" } },
        { status: 404 }
      );
    }

    // Verify project ownership
    const projects = await query<{ id: string }>(
      `SELECT id FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [assets[0].projectId, userId]
    );
    if (!projects.length) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权修改此资产" } },
        { status: 403 }
      );
    }

    // Update asset
    const updates: string[] = [];
    const params_list: any[] = [];
    let paramIdx = 1;

    if (prompt !== undefined) {
      updates.push(`prompt = $${paramIdx++}`);
      params_list.push(prompt);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params_list.push(description);
    }
    updates.push(`"updatedAt" = NOW()`);
    params_list.push(assetId);

    const sql = `UPDATE "Asset" SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
    const result = await query(sql, params_list);

    return NextResponse.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error("Asset update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}

// DELETE - Delete asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const { id: assetId } = await params;
    if (!assetId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少资产ID" } },
        { status: 400 }
      );
    }

    // Verify asset belongs to user's project
    const assets = await query<{ id: string; projectId: string }>(
      `SELECT id, "projectId" FROM "Asset" WHERE id = $1`,
      [assetId]
    );
    if (!assets.length) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "资产不存在" } },
        { status: 404 }
      );
    }

    // Verify project ownership
    const projects = await query<{ id: string }>(
      `SELECT id FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [assets[0].projectId, userId]
    );
    if (!projects.length) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权删除此资产" } },
        { status: 403 }
      );
    }

    await query(`DELETE FROM "Asset" WHERE id = $1`, [assetId]);

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    console.error("Asset delete error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}