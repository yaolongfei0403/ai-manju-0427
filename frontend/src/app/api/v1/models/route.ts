// Public Models API - List enabled models for project creation

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get all models grouped by type (show all, let frontend filter by status if needed)
    const models = await query<{
      type: string;
      code: string;
      name: string;
      provider: string;
      description: string | null;
    }>(
      `SELECT type, code, name, provider, description
       FROM "AIModel"
       ORDER BY type, name`
    );

    // Group by type
    const grouped: Record<string, Array<{
      code: string;
      name: string;
      provider: string;
      description: string | null;
    }>> = {
      llm: [],
      t2i: [],
      i2v: [],
    };

    for (const model of models) {
      if (grouped[model.type]) {
        grouped[model.type].push({
          code: model.code,
          name: model.name,
          provider: model.provider,
          description: model.description,
        });
      }
    }

    return NextResponse.json({ data: grouped });
  } catch (error) {
    console.error("Get public models error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
