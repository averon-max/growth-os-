import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { invalidatePlannerReport } from "@/lib/planner/analyze";
import { getWorkspaceBilling } from "@/lib/billing/subscription";
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
    // The plan's tracked-keyword limit covers all websites of the workspace together.
    const site = await prisma.website.findUnique({ where: { id: websiteId }, select: { business: { select: { workspaceId: true } } } });
    const workspaceId = site?.business.workspaceId ?? "";
    const { plan } = await getWorkspaceBilling(workspaceId);
    const max = plan.limits.trackedKeywords;
    const existing = await prisma.trackedKeyword.findMany({ where: { websiteId }, select: { keyword: true } });
    const have = new Set(existing.map((e) => e.keyword));
    const fresh = keywords.filter((k) => !have.has(k));
    const count = await prisma.trackedKeyword.count({ where: { website: { business: { workspaceId } } } });
    if (count + fresh.length > max) {
      const left = Math.max(0, max - count);
      return NextResponse.json(
        { error: left === 0 ? `The ${plan.name} plan tracks up to ${max.toLocaleString("en-US")} keywords. Remove some or upgrade.` : `The ${plan.name} plan tracks up to ${max.toLocaleString("en-US")} keywords; ${left} left.`, upgrade: "/dashboard/settings/billing" },
        { status: 402 },
      );
    }
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
