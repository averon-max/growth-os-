import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/cms/mock-provider-store";

export async function POST(req: NextRequest) {
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const id = `mock-article-${Date.now()}`;
  return NextResponse.json({ id, url: `https://scanmycreds.com/blog/${id}` });
}
