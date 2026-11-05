import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { buildLandscape, type Landscape } from "@/lib/competitors/landscape";

export const runtime = "nodejs";
export const maxDuration = 120;
const cache = new Map<string, { at: number; body: Landscape }>();

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    const hit = cache.get(websiteId);
    if (hit && refresh === false && Date.now() - hit.at < 12 * 3600 * 1000) return NextResponse.json(hit.body);
    if (rateLimit("landscape:" + user.id, 10, 3600 * 1000) === false) return NextResponse.json({ error: "Too many SERP scans this hour." }, { status: 429 });
    const body = await buildLandscape({ websiteId, workspaceId: website.business.workspaceId, siteUrl: website.url });
    cache.set(websiteId, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[competitors/landscape]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
