import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLANS, isPlanId, DEFAULT_PLAN_ID, stripePriceIdFor } from "@/lib/billing/plans";
import { syncSubscription } from "@/lib/billing/stripe-sync";
import { audit } from "@/lib/admin/core";

const LIVE = ["active", "trialing", "past_due"];
const DAY = 24 * 60 * 60 * 1000;

type Body = {
  workspaceId?: unknown; action?: unknown; plan?: unknown; months?: unknown; note?: unknown; refund?: unknown; until?: unknown;
};

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Full control over one workspace's plan. Every change goes to the audit log.
 *   grant        give or change a manual (free of charge) plan for N months or with no end date
 *   extend       add N months to a manual plan, or take months away with a negative N
 *   setEnd       set the exact end date of a manual plan (empty = no end date)
 *   remove       take access away now; a Stripe subscription is cancelled too (optionally refunding the last payment)
 *   stripeChange move a paying customer to another plan in Stripe (the difference is charged or credited now)
 *   stripeCancel cancel a Stripe subscription at the end of the paid period (access stays until then)
 *   stripeResume undo stripeCancel
 */
export async function POST(request: Request) {
  try {
    const bad = checkRequest(request);
    if (bad) return fail(bad);
    const admin = await requireAdmin();
    const body = ((await request.json().catch(() => ({}))) ?? {}) as Body;

    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    // Old form posts {plan} without an action: FREE means remove, anything else means grant.
    const action = typeof body.action === "string" ? body.action : body.plan === DEFAULT_PLAN_ID ? "remove" : "grant";
    const rawMonths = Math.trunc(Number(body.months ?? 0)) || 0;
    const months = Math.min(120, Math.max(0, rawMonths));
    const plan = isPlanId(body.plan) ? body.plan : null;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    if (!workspaceId) return fail("Workspace is required");

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true, members: { where: { role: "OWNER" }, include: { user: { select: { email: true } } }, take: 1 } },
    });
    if (!workspace) return fail("Workspace not found", 404);

    const sub = workspace.subscription;
    const before = sub ? { plan: sub.plan, status: sub.status, source: sub.source, until: sub.currentPeriodEnd } : null;
    const label = `${workspace.name} (${workspace.members[0]?.user.email ?? "no owner"})`;
    const target = { type: "workspace" as const, id: workspaceId, label };
    const stripeLive = sub?.source === "stripe" && !!sub.stripeSubscriptionId && LIVE.includes(sub.status);

    switch (action) {
      case "grant": {
        if (!plan || plan === DEFAULT_PLAN_ID) return fail("Choose a paid plan to grant");
        if (stripeLive) return fail("This customer pays through Stripe. Use “Change plan in Stripe”, or cancel the Stripe subscription first.", 409);
        const currentPeriodEnd = months > 0 ? new Date(Date.now() + months * 30 * DAY) : null;
        const data = { plan: plan, status: "active", source: "manual", currentPeriodEnd, cancelAtPeriodEnd: false, grantedByUserId: admin.id, note };
        await prisma.subscription.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
        await audit(admin, "plan.grant", target, { before, plan: plan, months, until: currentPeriodEnd, note });
        return NextResponse.json({ ok: true, message: `${PLANS[plan].name} granted${currentPeriodEnd ? ` until ${currentPeriodEnd.toDateString()}` : " with no end date"}.` });
      }

      case "extend": {
        const delta = Math.min(120, Math.max(-120, rawMonths));
        if (!sub || sub.source !== "manual" || sub.plan === DEFAULT_PLAN_ID || !LIVE.includes(sub.status)) return fail("Only an active manual plan can be changed this way");
        if (delta === 0) return fail("Enter a number of months, e.g. 2 or -1");
        // Adding starts from the current end (or today if it has none / already passed); removing counts back from the current end.
        const base = sub.currentPeriodEnd ? sub.currentPeriodEnd.getTime() : Date.now();
        const from = delta > 0 ? Math.max(base, Date.now()) : base;
        const end = new Date(from + delta * 30 * DAY);
        const expired = end.getTime() <= Date.now();
        await prisma.subscription.update({
          where: { workspaceId },
          data: expired
            ? { plan: DEFAULT_PLAN_ID, status: "canceled", currentPeriodEnd: null, grantedByUserId: admin.id }
            : { currentPeriodEnd: end, status: "active", grantedByUserId: admin.id, ...(note ? { note } : {}) },
        });
        await audit(admin, delta > 0 ? "plan.extend" : "plan.shorten", target, { before, months: delta, until: expired ? null : end, expired, note });
        return NextResponse.json({ ok: true, message: expired ? "No time left — access removed." : `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} month${Math.abs(delta) === 1 ? "" : "s"}. Ends ${end.toDateString()}.` });
      }

      case "setEnd": {
        if (!sub || sub.source !== "manual" || sub.plan === DEFAULT_PLAN_ID || !LIVE.includes(sub.status)) return fail("Only an active manual plan has an end date to set");
        const raw = typeof body.until === "string" ? body.until.trim() : "";
        const end = raw ? new Date(`${raw}T23:59:59`) : null;
        if (end && (Number.isNaN(end.getTime()) || end.getTime() <= Date.now())) return fail("Pick a date in the future");
        await prisma.subscription.update({ where: { workspaceId }, data: { currentPeriodEnd: end, grantedByUserId: admin.id } });
        await audit(admin, "plan.set_end", target, { before, until: end, note });
        return NextResponse.json({ ok: true, message: end ? `Ends ${end.toDateString()}.` : "No end date." });
      }

      case "remove": {
        let refunded: string | null = null;
        if (stripeLive) {
          const subId = sub!.stripeSubscriptionId!;
          await stripe().subscriptions.cancel(subId);
          if (body.refund === true && sub!.stripeCustomerId) {
            const charges = await stripe().charges.list({ customer: sub!.stripeCustomerId, limit: 5 });
            const last = charges.data.find((c) => c.paid && !c.refunded && c.amount > c.amount_refunded);
            if (last) {
              await stripe().refunds.create({ charge: last.id });
              refunded = `${(last.amount - last.amount_refunded) / 100} ${last.currency.toUpperCase()}`;
            }
          }
        }
        const data = { plan: DEFAULT_PLAN_ID, status: "canceled", source: stripeLive ? "stripe" : "manual", currentPeriodEnd: null, cancelAtPeriodEnd: false, grantedByUserId: admin.id, note };
        await prisma.subscription.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
        await audit(admin, "plan.remove", target, { before, stripeCancelled: stripeLive, refunded, note });
        return NextResponse.json({ ok: true, message: `Access removed${stripeLive ? ", Stripe subscription cancelled" : ""}${refunded ? `, refunded ${refunded}` : ""}.` });
      }

      case "stripeChange": {
        if (!stripeLive) return fail("This workspace has no active Stripe subscription");
        if (!plan || plan === DEFAULT_PLAN_ID) return fail("Choose a paid plan");
        const priceId = stripePriceIdFor(PLANS[plan]);
        if (!priceId) return fail("No Stripe price is set for this plan", 500);
        const current = await stripe().subscriptions.retrieve(sub!.stripeSubscriptionId!);
        const item = current.items.data[0];
        if (item?.price?.id === priceId) return fail(`Already on ${PLANS[plan].name}`);
        const updated = await stripe().subscriptions.update(current.id, {
          items: [{ id: item.id, price: priceId, quantity: 1 }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
        });
        await syncSubscription(workspaceId, updated);
        await audit(admin, "plan.stripe_change", target, { before, plan: plan, note });
        return NextResponse.json({ ok: true, message: `Moved to ${PLANS[plan].name} in Stripe. The price difference is charged or credited now.` });
      }

      case "stripeCancel":
      case "stripeResume": {
        if (!stripeLive) return fail("This workspace has no active Stripe subscription");
        const updated = await stripe().subscriptions.update(sub!.stripeSubscriptionId!, { cancel_at_period_end: action === "stripeCancel" });
        await syncSubscription(workspaceId, updated);
        await audit(admin, action === "stripeCancel" ? "plan.stripe_cancel" : "plan.stripe_resume", target, { before, note });
        return NextResponse.json({ ok: true, message: action === "stripeCancel" ? "Cancels at the end of the paid period. Access stays until then." : "Cancellation undone. The subscription renews as usual." });
      }

      default:
        return fail("Unknown action");
    }
  } catch (error) {
    const s = error as { type?: string; message?: string };
    if (typeof s?.type === "string" && s.type.startsWith("Stripe")) {
      console.error("[admin/subscription] stripe", s.type, s.message);
      return fail(`Stripe refused: ${s.message ?? s.type}`, 502);
    }
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[admin/subscription]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
