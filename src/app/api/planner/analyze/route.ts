import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { analyzeSite } from "@/lib/planner/analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { websiteId?: unknown; refresh?: unknown };
    const websiteId = typeof body.websiteId === "string" ? body.websiteId : "";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    if (rateLimit("planner:" + user.id, 30, 60 * 60 * 1000) === false) {
      return NextResponse.json({ error: "Too many analyses this hour. Try again later." }, { status: 429 });
    }
    const report = await analyzeSite({ websiteId, workspaceId: website.business.workspaceId, siteUrl: website.url, refresh: body.refresh === true });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[planner/analyze error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
