import { NextRequest, NextResponse } from "next/server";
import { parsePositiveInt } from "@/lib/audience/pagination";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getSegmentById, getAudienceSnapshots } from "@/lib/audience/repository";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const segment = await getSegmentById(id);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, segment.websiteId);

    const page = parsePositiveInt(req.nextUrl.searchParams.get("page")) ?? 1;
    const limit = parsePositiveInt(req.nextUrl.searchParams.get("limit")) ?? 25;

    const result = await getAudienceSnapshots(id, { page, limit });
    return NextResponse.json({ segment, ...result });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
