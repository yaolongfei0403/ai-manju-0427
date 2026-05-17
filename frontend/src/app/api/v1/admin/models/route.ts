// Proxy to FastAPI backend: /api/v1/admin/models

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const url = `${BACKEND_URL}/api/v1/admin/models${type ? `?type=${type}` : ""}`;

    const resp = await fetch(url, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        host: new URL(BACKEND_URL).host,
      },
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error("Proxy GET /admin/models error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = `${BACKEND_URL}/api/v1/admin/models`;
    const body = await request.json();

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(request.headers.entries()),
        host: new URL(BACKEND_URL).host,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error("Proxy POST /admin/models error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const modelType = url.searchParams.get("model_type");
    const model = url.searchParams.get("model");
    const params = new URLSearchParams();
    if (modelType) params.set("model_type", modelType);
    if (model) params.set("model", model);
    const targetUrl = `${BACKEND_URL}/api/v1/admin/models${params.toString() ? `?${params.toString()}` : ""}`;

    const resp = await fetch(targetUrl, {
      method: "DELETE",
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        host: new URL(BACKEND_URL).host,
      },
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error("Proxy DELETE /admin/models error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}
