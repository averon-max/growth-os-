import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing/stripe-sync";
import { PLANS, PAID_PLAN_IDS, planFor, stripePriceIdFor } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";
const LIVE = ["active", "trialing", "past_due"];

/** The workspace this user owns (billing belongs to the owner). */
async function ownedSubscription(userId: string) {
  const m = await prisma.workspaceMember.findFirst({ where: { userId, role: "OWNER" }, orderBy: { id: "asc" }, select: { workspaceId: true } });
  if (!m) return null;
  const sub = await prisma.subscription.findUnique({ where: { workspaceId: m.workspaceId } });
  return { workspaceId: m.workspaceId, sub };
}

/**
 * What switching to each other plan costs right now, from Stripe's own proration:
 * the difference for the rest of the current month is charged (or credited) at once.
 * During a free trial, switching ends the trial, so the full price of the new plan is due.
 */
async function switchPrices(sub: { stripeCustomerId: string | null; stripeSubscriptionId: string | null; plan: string; status: string }) {
  const out: { plan: string; name: string; dueNow: number | null; currency: string }[] = [];
  if (!sub.stripeCustomerId || !sub.stripeSubscriptionId || !LIVE.includes(sub.status)) return out;
  const current = await stripe().subscriptions.retrieve(sub.stripeSubscriptionId).catch(() => null);
  const item = current?.items.data[0];
  if (!current || !item) return out;
  for (const id of PAID_PLAN_IDS) {
    if (id === sub.plan) continue;
    const priceId = stripePriceIdFor(PLANS[id]);
    if (!priceId) continue;
    try {
      const preview = await stripe().invoices.createPreview({
        customer: sub.stripeCustomerId!,
        subscription: sub.stripeSubscriptionId,
        subscription_details: {
          items: [{ id: item.id, price: priceId, quantity: 1 }],
          proration_behavior: current.status === "trialing" ? "none" : "always_invoice",
          ...(current.status === "trialing" ? { trial_end: "now" as const } : {}),
        },
      });
      out.push({ plan: id, name: PLANS[id].name, dueNow: preview.amount_due / 100, currency: preview.currency.toUpperCase() });
    } catch (e) {
      console.warn("[billing/manage] preview", id, (e as Error).message);
      out.push({ plan: id, name: PLANS[id].name, dueNow: null, currency: "USD" });
    }
  }
  return out;
}

/** GET: plan, dates, saved card, recent invoices and the price of switching plans, for the settings page. */
export async function GET() {
  try {
    const user = await requireUser();
    const own = await ownedSubscription(user.id);
    if (!own) return NextResponse.json({ owner: false });
    const sub = own.sub;
    const base = {
      owner: true,
      plan: planFor(sub?.plan).name,
      planId: planFor(sub?.plan).id,
      status: sub?.status ?? "none",
      source: sub?.source ?? "none",
      periodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      card: null as null | { brand: string; last4: string; exp: string },
      invoices: [] as { id: string; date: string; amount: string; status: string; url: string | null }[],
      switches: [] as { plan: string; name: string; dueNow: number | null; currency: string }[],
    };
    if (!sub?.stripeCustomerId || !isStripeConfigured()) return NextResponse.json(base);

    const [cards, invoices, switches] = await Promise.all([
      stripe().paymentMethods.list({ customer: sub.stripeCustomerId!, type: "card", limit: 3 }).catch(() => null),
      stripe().invoices.list({ customer: sub.stripeCustomerId!, limit: 6 }).catch(() => null),
      switchPrices(sub).catch(() => []),
    ]);
    base.switches = switches;
    const c = cards?.data[0]?.card;
    if (c) base.card = { brand: c.brand, last4: c.last4, exp: `${String(c.exp_month).padStart(2, "0")}/${String(c.exp_year).slice(-2)}` };
    base.invoices = (invoices?.data ?? []).map((i) => ({
      id: i.id ?? "",
      date: new Date(i.created * 1000).toISOString(),
      amount: `${(i.amount_paid || i.amount_due) / 100} ${i.currency.toUpperCase()}`,
      status: i.status ?? "",
      url: i.hosted_invoice_url ?? null,
    }));
    return NextResponse.json(base);
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST { action }:
 *   cancel     stop renewing; access stays until the end of the paid period (or the trial, with no charge)
 *   resume     undo cancel
 *   removeCard delete every saved card; renewal is cancelled too, because there is nothing left to charge
 */
export async function POST(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const user = await requireUser();
    const own = await ownedSubscription(user.id);
    if (!own?.sub?.stripeCustomerId) return NextResponse.json({ error: "There is no card or subscription on this workspace." }, { status: 400 });
    if (!isStripeConfigured()) return NextResponse.json({ error: "Billing is not available right now." }, { status: 503 });
    const { sub, workspaceId } = own;
    const action = ((await req.json().catch(() => ({}))) as { action?: string }).action;
    const live = sub.stripeSubscriptionId && LIVE.includes(sub.status);

    if (action === "cancel" || action === "resume") {
      if (!live) return NextResponse.json({ error: "There is no active subscription to change." }, { status: 400 });
      if (action === "resume") {
        const cards = await stripe().paymentMethods.list({ customer: sub.stripeCustomerId!, type: "card", limit: 1 });
        if (cards.data.length === 0) return NextResponse.json({ error: "Add a card first (Update card), then resume." }, { status: 400 });
      }
      const updated = await stripe().subscriptions.update(sub.stripeSubscriptionId!, { cancel_at_period_end: action === "cancel" });
      await syncSubscription(workspaceId, updated);
      const end = sub.currentPeriodEnd ? sub.currentPeriodEnd.toDateString() : "the end of the period";
      return NextResponse.json({
        ok: true,
        message: action === "cancel"
          ? sub.status === "trialing" ? `Cancelled. Your trial runs until ${end} and you won't be charged.` : `Cancelled. You keep access until ${end} and won't be charged again.`
          : "Your subscription will renew as usual.",
      });
    }

    if (action === "removeCard") {
      if (live && !sub.cancelAtPeriodEnd) {
        const updated = await stripe().subscriptions.update(sub.stripeSubscriptionId!, { cancel_at_period_end: true });
        await syncSubscription(workspaceId, updated);
      }
      const cards = await stripe().paymentMethods.list({ customer: sub.stripeCustomerId!, limit: 20 });
      for (const pm of cards.data) await stripe().paymentMethods.detach(pm.id);
      return NextResponse.json({ ok: true, message: cards.data.length ? "Card removed. Your subscription won't renew, and nothing more will be charged." : "There was no saved card." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const s = err as { type?: string; message?: string };
    if (typeof s?.type === "string" && s.type.startsWith("Stripe")) {
      console.error("[billing/manage]", s.type, s.message);
      return NextResponse.json({ error: "Our payment processor didn't accept the change. Try again in a minute." }, { status: 502 });
    }
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
