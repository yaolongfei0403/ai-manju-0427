// File Upload API Route - handles image uploads with automatic resizing

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "没有上传文件" } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "不支持的图片格式，请上传 JPG、PNG、WebP 或 GIF" } },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "图片大小不能超过 5MB" } },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename - always .jpg since sharp converts to JPEG
    const filename = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp - resize and optimize
    const processedImage = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Get actual processed dimensions
    const metadata = await sharp(processedImage).metadata();
    const actualWidth = metadata.width || MAX_WIDTH;
    const actualHeight = metadata.height || MAX_HEIGHT;

    // Save processed image
    await writeFile(filepath, processedImage);

    // Return the public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      data: {
        url,
        filename,
        size: processedImage.length,
        width: actualWidth,
        height: actualHeight,
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "上传失败" } },
      { status: 500 }
    );
  }
}
