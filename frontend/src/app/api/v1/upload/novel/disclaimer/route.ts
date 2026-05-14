// Disclaimer Agreement API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query, execute } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

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
    const { fileId, agreed } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少文件ID" } },
        { status: 400 }
      );
    }

    if (agreed !== true) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请先阅读并同意免责条款" } },
        { status: 400 }
      );
    }

    // Verify file exists and belongs to user
    const files = await query<{ id: string; "userId": string }>(
      `SELECT id, "userId" FROM "NovelFile" WHERE id = $1`,
      [fileId]
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "文件不存在" } },
        { status: 404 }
      );
    }

    if (files[0].userId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权操作此文件" } },
        { status: 403 }
      );
    }

    // Check for existing agreement (idempotency)
    const existingAgreements = await query<{ id: string }>(
      `SELECT id FROM "DisclaimerAgreement" WHERE "fileId" = $1`,
      [fileId]
    );

    if (existingAgreements.length > 0) {
      // Already agreed - return existing record
      const agreements = await query<{ "fileId": string; "agreed": boolean; "agreedAt": string }>(
        `SELECT "fileId", "agreed", "agreedAt" FROM "DisclaimerAgreement" WHERE "fileId" = $1`,
        [fileId]
      );
      return NextResponse.json({ data: agreements[0] }, { status: 200 });
    }

    // Record disclaimer agreement
    const agreedAt = new Date().toISOString();
    await execute(
      `INSERT INTO "DisclaimerAgreement" (id, "fileId", "userId", "agreed", "agreedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`disclaimer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileId, userId, true, agreedAt, agreedAt, agreedAt]
    );

    // Return disclaimer confirmation result
    const agreement = {
      fileId,
      agreed: true,
      agreedAt,
    };

    return NextResponse.json({ data: agreement }, { status: 200 });
  } catch (error) {
    console.error("Disclaimer agreement error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
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

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少文件ID" } },
        { status: 400 }
      );
    }

    // Check for existing agreement
    const agreements = await query<{ "fileId": string; "agreed": boolean; "agreedAt": string }>(
      `SELECT "fileId", "agreed", "agreedAt" FROM "DisclaimerAgreement" WHERE "fileId" = $1 AND "userId" = $2`,
      [fileId, userId]
    );

    if (agreements.length > 0) {
      return NextResponse.json({ data: agreements[0] }, { status: 200 });
    }

    return NextResponse.json({ data: { fileId, agreed: false, agreedAt: null } }, { status: 200 });
  } catch (error) {
    console.error("Get disclaimer status error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}