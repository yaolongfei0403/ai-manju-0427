// Asset Extract Progress API Route - GET /api/v1/assets/extract/[taskId]

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import axios from "axios";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

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

// Normalize FastAPI response to frontend format
function normalizeFastAPIResult(raw: Record<string, unknown>) {
  return {
    taskId: raw.taskId,
    status: raw.status,
    progress: raw.progress,
    assets: (raw.result as Record<string, unknown> | null)?.assets || null,
    stats: (raw.result as Record<string, unknown> | null)?.stats || null,
    dbAssetIds: (raw.result as Record<string, unknown> | null)?.dbAssetIds || null,
    error: raw.error,
  };
}

// Fetch assets directly from Asset table as fallback
async function getAssetsFromDB(projectId: string): Promise<{
  characters: unknown[];
  scenes: unknown[];
  props: unknown[];
  totalCharacters: number;
  totalScenes: number;
  totalProps: number;
} | null> {
  // Get assets with episode counts via LEFT JOIN with AssetEpisode
  const assets = await query<{
    id: string;
    name: string;
    type: string;
    prompt: string;
    description: string | null;
    "imageUrl": string | null;
    status: string;
    "createdAt": Date;
    episodeIds: string[];
    episodeCount: string;
  }>(
    `SELECT a.id, a.name, a.type, a.prompt, a.description, a."imageUrl", a.status, a."createdAt",
            COALESCE(json_agg(ae."episodeId") FILTER (WHERE ae."episodeId" IS NOT NULL), '[]') as "episodeIds",
            COUNT(ae."episodeId") as "episodeCount"
     FROM "Asset" a
     LEFT JOIN "AssetEpisode" ae ON ae."assetId" = a.id
     WHERE a."projectId" = $1
     GROUP BY a.id, a.name, a.type, a.prompt, a.description, a."imageUrl", a.status, a."createdAt"
     ORDER BY a."createdAt" DESC`,
    [projectId]
  );

  if (!assets.length) return null;

  const result = {
    characters: [] as unknown[],
    scenes: [] as unknown[],
    props: [] as unknown[],
    totalCharacters: 0,
    totalScenes: 0,
    totalProps: 0,
  };

  for (const a of assets) {
    // Parse episodeIds from JSON array
    let episodeIds: string[] = [];
    try {
      episodeIds = typeof a.episodeIds === 'string' ? JSON.parse(a.episodeIds) : (a.episodeIds || []);
    } catch {
      episodeIds = [];
    }
    const normalized = {
      id: a.id,
      name: a.name,
      type: a.type,
      prompt: a.prompt,
      description: a.description || "",
      episodeIds,
    };
    if (a.type === "character") {
      result.characters.push(normalized);
      result.totalCharacters++;
    } else if (a.type === "scene") {
      result.scenes.push(normalized);
      result.totalScenes++;
    } else if (a.type === "prop") {
      result.props.push(normalized);
      result.totalProps++;
    }
  }

  return result;
}

// GET - Poll extraction progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "缺少任务ID" } },
        { status: 400 }
      );
    }

    const projectId = request.nextUrl.searchParams.get("projectId");

    // Call FastAPI backend to get result
    let fastApiData: Record<string, unknown> | null = null;
    let fastApiStatus = 200;
    try {
      const fastApiResponse = await axios.get(
        `${FASTAPI_URL}/api/v1/assets/extract/${taskId}`,
        { timeout: 30000 }
      );
      fastApiData = fastApiResponse.data as Record<string, unknown>;
      fastApiStatus = fastApiResponse.status;
    } catch (error) {
      const isEconnReset = axios.isAxiosError(error) && error.code === "ECONNRESET";
      const isEconnRefused = axios.isAxiosError(error) && error.code === "ECONNREFUSED";
      const is404 = axios.isAxiosError(error) && error.response?.status === 404;

      if (is404) {
        fastApiStatus = 404;
      } else if (isEconnReset || isEconnRefused) {
        // FastAPI connection failed (rejected or reset) — fall back to DB directly
        if (!projectId) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "缺少 projectId 参数（FastAPI 未启动，需从数据库读取）" } },
            { status: 400 }
          );
        }
        const dbAssets = await getAssetsFromDB(projectId);
        if (!dbAssets) {
          return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "数据库中未找到资产记录" } },
            { status: 404 }
          );
        }
        return NextResponse.json({
          data: {
            taskId,
            status: "completed",
            progress: 100,
            assets: {
              characters: dbAssets.characters,
              scenes: dbAssets.scenes,
              props: dbAssets.props,
            },
            stats: {
              totalCharacters: dbAssets.totalCharacters,
              totalScenes: dbAssets.totalScenes,
              totalProps: dbAssets.totalProps,
            },
            source: "database",
          },
        }, { status: 200 });
      }
      // Other errors (timeout, network, etc.) — rethrow to outer handler
      throw error;
    }

    // FastAPI responded with 404 — task lost (e.g. FastAPI restarted)
    // Fall back to database if projectId provided
    if (fastApiStatus === 404) {
      if (!projectId) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "任务不存在或已过期" } },
          { status: 404 }
        );
      }
      const dbAssets = await getAssetsFromDB(projectId);
      if (!dbAssets) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "数据库中未找到资产记录" } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        data: {
          taskId,
          status: "completed",
          progress: 100,
          assets: {
            characters: dbAssets.characters,
            scenes: dbAssets.scenes,
            props: dbAssets.props,
          },
          stats: {
            totalCharacters: dbAssets.totalCharacters,
            totalScenes: dbAssets.totalScenes,
            totalProps: dbAssets.totalProps,
          },
          source: "database",
        },
      }, { status: 200 });
    }

    // Normal case: return FastAPI result
    const normalized = normalizeFastAPIResult(fastApiData!);
    return NextResponse.json({ data: normalized }, { status: 200 });

  } catch (error) {
    console.error("Asset extraction poll error:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
        return NextResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "后端服务未启动或连接被重置" } },
          { status: 503 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "任务不存在或已过期" } },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
