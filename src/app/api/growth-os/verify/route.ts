import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/cms/mock-provider-store";

export async function POST(req: NextRequest) {
  const ok = checkAuth(req.headers.get("authorization"));
  return NextResponse.json({ ok });
}
