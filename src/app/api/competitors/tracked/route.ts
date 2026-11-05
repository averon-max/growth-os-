import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { competitorStats, normalizeDomain, ourKeywordList, ourPositions, type CompStats } from "@/lib/competitors/tracker";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_TRACKED = 25;

async function ctx(websiteId: string) {
  const user = await requireUser();
  const website = await requireWebsiteAccess(user.id, websiteId);
  return { user, website, ours: new URL(website.url).hostname.replace(/^www\./, "") };
}

export async function GET(req: NextRequest) {
  try {
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const { website, ours } = await ctx(websiteId);
    const rows = await prisma.competitor.findMany({ where: { websiteId }, orderBy: { addedAt: "asc" }, take: MAX_TRACKED });
    const mine = (await ourKeywordList(websiteId, website.business.workspaceId, website.url)).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 500);
    if (rows.length === 0) return NextResponse.json({ domain: ours, tracked: [], mine });
    const pos = await ourPositions(websiteId, website.business.workspaceId, website.url);
    const stats: CompStats[] = [];
    for (let i = 0; i < rows.length; i += 3) stats.push(...(await Promise.all(rows.slice(i, i + 3).map((r) => competitorStats(r.domain, pos)))));
    return NextResponse.json({ domain: ours, tracked: rows.map((r, i) => ({ id: r.id, name: r.name, addedAt: r.addedAt, ...stats[i] })), mine });
  } catch (err) {
    console.error("[competitors/tracked GET]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { websiteId?: unknown; domain?: unknown };
    const websiteId = typeof body.websiteId === "string" ? body.websiteId : "";
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
    if (websiteId === "" || domain === null) return NextResponse.json({ error: "Enter a valid domain, e.g. example.com." }, { status: 400 });
    const { user, ours } = await ctx(websiteId);
    if (domain === ours) return NextResponse.json({ error: "That is your own domain." }, { status: 400 });
    if (rateLimit("comp-add:" + user.id, 60, 3600 * 1000) === false) return NextResponse.json({ error: "Too many changes this hour." }, { status: 429 });
    const count = await prisma.competitor.count({ where: { websiteId } });
    if (count >= MAX_TRACKED) return NextResponse.json({ error: `You can track up to ${MAX_TRACKED} competitors.` }, { status: 400 });
    await prisma.competitor.upsert({ where: { websiteId_domain: { websiteId, domain } }, create: { websiteId, domain }, update: {} });
    return NextResponse.json({ ok: true, domain });
  } catch (err) {
    console.error("[competitors/tracked POST]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { websiteId?: unknown; domain?: unknown };
    const websiteId = typeof body.websiteId === "string" ? body.websiteId : "";
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
    if (websiteId === "" || domain === null) return NextResponse.json({ error: "websiteId and domain are required." }, { status: 400 });
    await ctx(websiteId);
    await prisma.competitor.deleteMany({ where: { websiteId, domain } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[competitors/tracked DELETE]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
