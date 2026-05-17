// Proxy to FastAPI backend: /api/v1/admin/models/:id
// Also handles sub-routes like /config, /capabilities (matched as id)

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function proxy(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.replace("/api/v1/admin/models/", "");

    // Build target URL
    let targetUrl: string;
    if (method === "DELETE") {
      // DELETE goes to /api/v1/admin/models?model_type=...
      targetUrl = `${BACKEND_URL}/api/v1/admin/models${url.search}`;
    } else if (pathSegments) {
      // Other methods go to /api/v1/admin/models/{pathSegments}
      targetUrl = `${BACKEND_URL}/api/v1/admin/models/${pathSegments}${url.search}`;
    } else {
      targetUrl = `${BACKEND_URL}/api/v1/admin/models${url.search}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      host: new URL(BACKEND_URL).host,
    };
    // Forward auth header
    const auth = request.headers.get("Authorization");
    if (auth) headers["Authorization"] = auth;

    const fetchOptions: RequestInit = { method, headers };
    if (method !== "GET" && method !== "DELETE") {
      fetchOptions.body = await request.text();
    }

    const resp = await fetch(targetUrl, fetchOptions);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error(`Proxy ${method} /admin/models/:id error:`, error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "后端连接失败" } },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params to satisfy Next.js, then proxy
  await params;
  return proxy(request, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return proxy(request, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return proxy(request, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return proxy(request, "DELETE");
}