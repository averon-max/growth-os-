import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isPlanId, DEFAULT_PLAN_ID } from "@/lib/billing/plans";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const workspaceId = body?.workspaceId;
    const plan = body?.plan;
    const months = Number(body?.months ?? 0);
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;

    if (typeof workspaceId !== "string" || !workspaceId) {
      return NextResponse.json({ error: "Workspace is required" }, { status: 400 });
    }
    if (!isPlanId(plan)) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // FREE означает снятие доступа.
    if (plan === DEFAULT_PLAN_ID) {
      await prisma.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: DEFAULT_PLAN_ID,
          status: "canceled",
          source: "manual",
          grantedByUserId: admin.id,
          note,
        },
        update: {
          plan: DEFAULT_PLAN_ID,
          status: "canceled",
          source: "manual",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          grantedByUserId: admin.id,
          note,
        },
      });
      return NextResponse.json({ ok: true, plan: DEFAULT_PLAN_ID });
    }

    const currentPeriodEnd =
      months > 0
        ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
        : null;

    await prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        plan,
        status: "active",
        source: "manual",
        currentPeriodEnd,
        grantedByUserId: admin.id,
        note,
      },
      update: {
        plan,
        status: "active",
        source: "manual",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        grantedByUserId: admin.id,
        note,
      },
    });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[admin/subscription]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
