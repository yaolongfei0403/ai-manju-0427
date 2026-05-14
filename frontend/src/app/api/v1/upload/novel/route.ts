// Novel Upload API Route

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync, unlink } from "fs";
import { randomUUID } from "crypto";
import { query, execute } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

// Validation constants
const ALLOWED_EXTENSIONS = [".txt", ".md", ".markdown"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_UPLOADS_PER_USER = 100; // Rate limit placeholder
const uploadCount = new Map<string, number>();

// 文件扩展名到格式的映射
function getFormatFromExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".txt":
      return "txt";
    case ".md":
    case ".markdown":
      return "md";
    default:
      return "txt";
  }
}

// 估算字数（TXT/MD都是纯文本）
function estimateWords(content: string): number {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = content.replace(/[\u4e00-\u9fff]/g, "");
  return chineseChars + Math.ceil(otherChars.length / 2);
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

    // Basic rate limiting
    const currentCount = uploadCount.get(userId) || 0;
    if (currentCount >= MAX_UPLOADS_PER_USER) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "上传操作过于频繁，请稍后再试" } },
        { status: 429 }
      );
    }

    // Validate Content-Type is multipart
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请求格式错误" } },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "请选择要上传的文件" } },
        { status: 400 }
      );
    }

    // Validate projectId if provided
    if (projectId) {
      const projects = await query<{ id: string; userId: string }>(
        `SELECT id, "userId" FROM "Project" WHERE id = $1`,
        [projectId]
      );
      if (projects.length === 0) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "项目不存在" } },
          { status: 404 }
        );
      }
      if (projects[0].userId !== userId) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "无权访问此项目" } },
          { status: 403 }
        );
      }
    }

    // 检查文件扩展名
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "仅支持TXT/Markdown格式" } },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "文件大小不能超过50MB" } },
        { status: 400 }
      );
    }

    // If uploading to a project that already has a novel, delete the old one first
    if (projectId) {
      const existingNovels = await query<{ id: string; path: string }>(
        `SELECT id, path FROM "NovelFile" WHERE "projectId" = $1 AND "userId" = $2`,
        [projectId, userId]
      );
      for (const existing of existingNovels) {
        // Delete physical file
        if (existsSync(existing.path)) {
          try {
            await unlink(existing.path);
          } catch {
            // Ignore file deletion errors
          }
        }
        // Delete related records
        await execute(`DELETE FROM "DisclaimerAgreement" WHERE "fileId" = $1`, [existing.id]);
        await execute(`DELETE FROM "SplitStrategyConfig" WHERE "fileId" = $1`, [existing.id]);
        await execute(`DELETE FROM "NovelFile" WHERE id = $1`, [existing.id]);
      }
    }

    // 读取文件内容用于字数统计
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");
    const estimatedWords = estimateWords(content);

    // Update upload count
    uploadCount.set(userId, currentCount + 1);

    // Generate file ID using crypto UUID
    const fileId = randomUUID();
    const fileName = `${fileId}${ext}`;

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), "uploads", "novels");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Persist to database - create NovelFile record
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO "NovelFile" (id, "userId", "projectId", name, "originalName", path, size, format, "estimatedWords", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [fileId, userId, projectId || null, file.name, file.name, filePath, file.size, getFormatFromExtension(file.name), estimatedWords, "uploaded", now, now]
    );

    // 返回文件元数据
    const fileMeta = {
      id: fileId,
      name: file.name,
      size: file.size,
      format: getFormatFromExtension(file.name),
      estimatedWords,
    };

    return NextResponse.json({ data: fileMeta }, { status: 200 });
  } catch (error) {
    console.error("Upload novel error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}