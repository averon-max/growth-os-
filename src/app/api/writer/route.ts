import { NextRequest, NextResponse } from "next/server";
import { runWriter } from "@/lib/writer/orchestrator";
import type { ArticleCategory } from "@/lib/writer/templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      seedKeyword: string;
      category: ArticleCategory;
    };

    if (!body.seedKeyword || !body.category) {
      return NextResponse.json(
        { error: "seedKeyword and category are required" },
        { status: 400 }
      );
    }

    const dataForSeoLogin = process.env.DATAFORSEO_LOGIN;
    const dataForSeoPassword = process.env.DATAFORSEO_PASSWORD;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!dataForSeoLogin || !dataForSeoPassword || !openAiKey) {
      return NextResponse.json(
        { error: "Missing env vars: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const result = await runWriter({
      seedKeyword: body.seedKeyword,
      category: body.category,
      dataForSeoLogin,
      dataForSeoPassword,
      openAiKey,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
