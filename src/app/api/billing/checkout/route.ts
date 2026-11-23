import { NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { PLANS, isPlanId, stripePriceIdFor } from "@/lib/billing/plans";
import { syncSubscription } from "@/lib/billing/stripe-sync";

const LIVE = ["active", "trialing", "past_due"];

type StripeErr = { type?: string; code?: string; param?: string; message?: string };
const asStripe = (e: unknown): StripeErr | null => {
  const s = e as StripeErr;
  return s && typeof s.type === "string" && s.type.startsWith("Stripe") ? s : null;
};

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

    // Already paying through Stripe: change the plan on that subscription instead of starting a second one
    // (a second checkout would bill the customer twice). The price difference is charged or credited right away.
    if (existing?.source === "stripe" && existing.stripeSubscriptionId && LIVE.includes(existing.status)) {
      const current = await stripe().subscriptions.retrieve(existing.stripeSubscriptionId).catch(() => null);
      if (current && LIVE.includes(current.status)) {
        const item = current.items.data[0];
        if (item?.price?.id === priceId) {
          return NextResponse.json({ error: `You're already on ${PLANS[planId].name}.` }, { status: 400 });
        }
        const updated = await stripe().subscriptions.update(current.id, {
          items: [{ id: item.id, price: priceId, quantity: 1 }],
          proration_behavior: "always_invoice",
          payment_behavior: "pending_if_incomplete",
          cancel_at_period_end: false,
          metadata: { ...current.metadata, workspaceId: targetWorkspaceId },
        });
        await syncSubscription(targetWorkspaceId, updated);
        return NextResponse.json({ url: `${base}/dashboard?checkout=success` });
      }
    }

    const create = (customer: string | undefined) =>
      stripe().checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/dashboard?checkout=success`,
        cancel_url: `${base}/pricing?checkout=cancelled`,
        client_reference_id: targetWorkspaceId,
        customer,
        customer_email: customer ? undefined : user.email,
        allow_promotion_codes: true,
        subscription_data: { metadata: { workspaceId: targetWorkspaceId } },
        metadata: { workspaceId: targetWorkspaceId, planId },
      });

    let session;
    try {
      session = await create(existing?.stripeCustomerId ?? undefined);
    } catch (error) {
      // A customer saved from test mode or an old Stripe account does not exist in the live account: start fresh.
      const s = asStripe(error);
      if (existing?.stripeCustomerId && s?.code === "resource_missing" && s.param === "customer") {
        console.warn("[checkout] stale Stripe customer, creating a new one:", existing.stripeCustomerId);
        await prisma.subscription.update({ where: { workspaceId: targetWorkspaceId }, data: { stripeCustomerId: null } });
        session = await create(undefined);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const s = asStripe(error);
    if (s) {
      console.error("[checkout] stripe", s.type, s.code, s.message);
      const reason = s.type === "StripeAuthenticationError" ? "the Stripe key is invalid" : s.message ?? s.type;
      return NextResponse.json({ error: `Payment couldn't start: ${reason}` }, { status: 502 });
    }
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[checkout]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
