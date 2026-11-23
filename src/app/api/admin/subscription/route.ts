import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { isPlanId, DEFAULT_PLAN_ID } from "@/lib/billing/plans";
import { audit } from "@/lib/admin/core";

/** Grant, change or remove a manual plan for a workspace. Every change goes to the audit log. */
export async function POST(request: Request) {
  try {
    const bad = checkRequest(request);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const workspaceId = body?.workspaceId;
    const plan = body?.plan;
    const months = Math.min(120, Math.max(0, Math.floor(Number(body?.months ?? 0)) || 0));
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;

    if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Workspace is required" }, { status: 400 });
    if (!isPlanId(plan)) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true, members: { where: { role: "OWNER" }, include: { user: { select: { email: true } } }, take: 1 } },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const before = workspace.subscription ? { plan: workspace.subscription.plan, status: workspace.subscription.status, source: workspace.subscription.source, until: workspace.subscription.currentPeriodEnd } : null;
    const label = `${workspace.name} (${workspace.members[0]?.user.email ?? "no owner"})`;

    // A paying Stripe customer is changed in Stripe, not here — otherwise the next webhook would undo it.
    if (workspace.subscription?.source === "stripe" && ["active", "trialing", "past_due"].includes(workspace.subscription.status) && body?.force !== true) {
      return NextResponse.json({ error: "This workspace pays through Stripe. Change or cancel it in Stripe, or confirm to override it with a manual plan." , needsForce: true }, { status: 409 });
    }

    if (plan === DEFAULT_PLAN_ID) {
      const data = { plan: DEFAULT_PLAN_ID, status: "canceled", source: "manual", currentPeriodEnd: null, cancelAtPeriodEnd: false, grantedByUserId: admin.id, note };
      await prisma.subscription.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
      await audit(admin, "plan.remove", { type: "workspace", id: workspaceId, label }, { before, note });
      return NextResponse.json({ ok: true, plan: DEFAULT_PLAN_ID });
    }

    const currentPeriodEnd = months > 0 ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) : null;
    const data = { plan, status: "active", source: "manual", currentPeriodEnd, cancelAtPeriodEnd: false, grantedByUserId: admin.id, note };
    await prisma.subscription.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
    await audit(admin, "plan.grant", { type: "workspace", id: workspaceId, label }, { before, plan, months, until: currentPeriodEnd, note });
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[admin/subscription]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
