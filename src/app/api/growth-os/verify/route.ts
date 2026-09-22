import { NextRequest, NextResponse } from "next/server";
import { assertMockProviderEnabled, MockProviderDisabledError, checkAuth } from "@/lib/cms/mock-provider-store";

export async function POST(req: NextRequest) {
  try {
    assertMockProviderEnabled();
  } catch (err) {
    if (err instanceof MockProviderDisabledError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  const ok = checkAuth(req.headers.get("authorization"));
  return NextResponse.json({ ok });
}
