import { NextRequest, NextResponse } from "next/server";
import { parsePositiveInt } from "@/lib/audience/pagination";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getAudienceSegments } from "@/lib/audience/repository";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId");
    if (!websiteId) {
      return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    const page = parsePositiveInt(req.nextUrl.searchParams.get("page")) ?? 1;
    const limit = parsePositiveInt(req.nextUrl.searchParams.get("limit")) ?? 25;

    const result = await getAudienceSegments(websiteId, { page, limit });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
