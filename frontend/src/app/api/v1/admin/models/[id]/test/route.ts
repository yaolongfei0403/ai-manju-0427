// Model Connection Test API

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryOne } from "@/lib/db";

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

export async function POST(
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
      `SELECT type, code, name, provider, endpoint, "apiKey", "modelName", "modelId", timeout
       FROM "AIModel" WHERE id = $1`,
      [id]
    );

    if (!model) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "模型不存在" } },
        { status: 404 }
      );
    }

    const startTime = Date.now();
    const timeout = (model.timeout as number) || 30;

    try {
      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add API key to headers based on provider
      const apiKey = model.apiKey as string;
      if (apiKey) {
        if (model.provider === "anthropic") {
          headers["Authorization"] = `Bearer ${apiKey}`;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }

      // Build request body based on model type
      // Priority: modelId > modelName > code
      const apiModel = (model.modelId as string) || (model.modelName as string) || (model.code as string);

      let body: Record<string, unknown> = {};
      if (model.type === "llm") {
        body = {
          model: apiModel,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        };
      } else if (model.type === "t2i") {
        body = {
          model: apiModel,
          input: {
            messages: [
              {
                role: "user",
                content: [{ text: "test" }],
              },
            ],
          },
          parameters: {
            prompt_extend: true,
            watermark: false,
            n: 1,
            negative_prompt: "",
            size: "1024*1024",
          },
        };
      } else if (model.type === "i2v") {
        // 阿里云万相2.7图生视频 API
        // 必须添加 X-DashScope-Async 头
        headers["X-DashScope-Async"] = "enable";
        body = {
          model: apiModel,
          input: {
            prompt: "测试视频生成",
            media: [
              {
                type: "first_frame",
                url: "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png",
              },
            ],
          },
          parameters: {
            resolution: "720P",
            duration: 5,
            prompt_extend: true,
            watermark: false,
          },
        };
      }

      console.log(`[Model Test] Endpoint: ${model.endpoint}`);
      console.log(`[Model Test] Headers:`, JSON.stringify(headers));
      console.log(`[Model Test] Body:`, JSON.stringify(body));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      const response = await fetch(model.endpoint as string, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        // Update status to online
        await queryOne(
          `UPDATE "AIModel" SET status = 'online', "updatedAt" = $1 WHERE id = $2`,
          [new Date().toISOString(), id]
        );

        // For i2v, check if task was created successfully (returns task_id)
        const responseData = await response.json().catch(() => ({}));
        const taskId = responseData?.output?.task_id;
        const taskStatus = responseData?.output?.task_status;

        if (model.type === "i2v" && taskId) {
          // i2v is async, just confirm task was created
          return NextResponse.json({
            success: true,
            latency,
            message: `任务创建成功 (task_id: ${taskId}, status: ${taskStatus})`,
            status: "online",
            taskId,
          });
        }

        return NextResponse.json({
          success: true,
          latency,
          message: "连接成功",
          status: "online",
        });
      } else {
        const errorText = await response.text().catch(() => "Unknown error");

        // Update status to offline
        await queryOne(
          `UPDATE "AIModel" SET status = 'offline', "updatedAt" = $1 WHERE id = $2`,
          [new Date().toISOString(), id]
        );

        return NextResponse.json({
          success: false,
          latency,
          message: `连接失败: ${response.status} ${response.statusText}`,
          error: errorText.substring(0, 200),
          status: "offline",
        });
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Model Test] Fetch error: ${errorMessage}`, error);

      // Update status to offline
      await queryOne(
        `UPDATE "AIModel" SET status = 'offline', "updatedAt" = $1 WHERE id = $2`,
        [new Date().toISOString(), id]
      );

      return NextResponse.json({
        success: false,
        latency,
        message: `连接失败: ${errorMessage}`,
        status: "offline",
      });
    }
  } catch (error) {
    console.error("Test model error:", error);
    console.error("Test model error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
