import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { invalidatePlannerReport } from "@/lib/planner/analyze";

const MAX_PER_SITE = 1000;
const clean = (s: unknown) => (typeof s === "string" ? s.toLowerCase().replace(/\s+/g, " ").trim() : "");

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { websiteId?: unknown; keywords?: unknown };
    const websiteId = typeof body.websiteId === "string" ? body.websiteId : "";
    const list = Array.isArray(body.keywords) ? body.keywords : [body.keywords];
    const keywords = [...new Set(list.map(clean).filter((k) => k.length >= 2 && k.length <= 120))].slice(0, 200);
    if (websiteId === "" || keywords.length === 0) return NextResponse.json({ error: "Enter at least one keyword." }, { status: 400 });
    await requireWebsiteAccess(user.id, websiteId);
    if (rateLimit("kw-add:" + user.id, 60, 3600 * 1000) === false) return NextResponse.json({ error: "Too many changes this hour." }, { status: 429 });
    const count = await prisma.trackedKeyword.count({ where: { websiteId } });
    if (count + keywords.length > MAX_PER_SITE) return NextResponse.json({ error: `You can track up to ${MAX_PER_SITE} keywords per site.` }, { status: 400 });
    const res = await prisma.trackedKeyword.createMany({ data: keywords.map((keyword) => ({ websiteId, keyword })), skipDuplicates: true });
    invalidatePlannerReport(websiteId);
    return NextResponse.json({ ok: true, added: res.count });
  } catch (err) {
    console.error("[planner/keywords POST]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { websiteId?: unknown; keyword?: unknown };
    const websiteId = typeof body.websiteId === "string" ? body.websiteId : "";
    const keyword = clean(body.keyword);
    if (websiteId === "" || keyword === "") return NextResponse.json({ error: "websiteId and keyword are required." }, { status: 400 });
    await requireWebsiteAccess(user.id, websiteId);
    await prisma.trackedKeyword.deleteMany({ where: { websiteId, keyword } });
    invalidatePlannerReport(websiteId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[planner/keywords DELETE]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
