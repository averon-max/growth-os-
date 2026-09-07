import { NextRequest, NextResponse } from "next/server";
import { checkAuth, listPages } from "@/lib/cms/mock-provider-store";

export async function GET(req: NextRequest) {
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  return NextResponse.json({ pages: listPages() });
}
