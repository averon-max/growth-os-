import { NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { PLANS, isPlanId, stripePriceIdFor } from "@/lib/billing/plans";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured yet" }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const planId = body?.plan;
    const workspaceId = body?.workspaceId;

    if (!isPlanId(planId) || planId === "FREE") {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    let targetWorkspaceId: string;

    if (typeof workspaceId === "string" && workspaceId) {
      const { role } = await requireWorkspaceAccess(user.id, workspaceId);
      if (role !== "OWNER") {
        return NextResponse.json({ error: "Only the workspace owner can subscribe" }, { status: 403 });
      }
      targetWorkspaceId = workspaceId;
    } else {
      // Воркспейс не передали — берём тот, которым пользователь владеет.
      const owned = await prisma.workspaceMember.findFirst({
        where: { userId: user.id, role: "OWNER" },
        select: { workspaceId: true },
        orderBy: { id: "asc" },
      });
      if (!owned) {
        return NextResponse.json({ error: "You don't have a workspace yet" }, { status: 400 });
      }
      targetWorkspaceId = owned.workspaceId;
    }

    const priceId = stripePriceIdFor(PLANS[planId]);
    if (!priceId) {
      return NextResponse.json({ error: "No Stripe price is set for this plan" }, { status: 500 });
    }

    const existing = await prisma.subscription.findUnique({ where: { workspaceId: targetWorkspaceId } });
    const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/dashboard?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancelled`,
      client_reference_id: targetWorkspaceId,
      customer: existing?.stripeCustomerId ?? undefined,
      customer_email: existing?.stripeCustomerId ? undefined : user.email,
      allow_promotion_codes: true,
      subscription_data: { metadata: { workspaceId: targetWorkspaceId } },
      metadata: { workspaceId: targetWorkspaceId, planId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[checkout]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
