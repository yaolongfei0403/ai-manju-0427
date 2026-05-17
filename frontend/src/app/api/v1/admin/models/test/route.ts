// Proxy to FastAPI backend: /api/v1/admin/models/test
// Handles both /test and /test/save

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // The route matches /test and /test/save via the same handler
    const pathMatch = url.pathname.match(/\/api\/v1\/admin\/models(\/test.*)?$/);
    const targetPath = pathMatch && pathMatch[1] ? pathMatch[1] : "/test";
    const targetUrl = `${BACKEND_URL}/api/v1/admin/models${targetPath}`;

    // Get auth headers but explicitly set Content-Type
    const auth = request.headers.get("Authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth) headers["Authorization"] = auth;

    const body = await request.text();

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error("Proxy POST /admin/models/test error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}