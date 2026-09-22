import { NextRequest, NextResponse } from "next/server";
import { assertMockProviderEnabled, MockProviderDisabledError, checkAuth, listPages } from "@/lib/cms/mock-provider-store";

export async function GET(req: NextRequest) {
  try {
    assertMockProviderEnabled();
  } catch (err) {
    if (err instanceof MockProviderDisabledError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  return NextResponse.json({ pages: listPages() });
}
