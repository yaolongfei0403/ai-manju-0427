// Proxy to FastAPI backend: /api/v1/admin/models/:id/test

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${BACKEND_URL}/api/v1/admin/models/${id}/test`;
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
    console.error("Proxy POST /admin/models/:id/test error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}
