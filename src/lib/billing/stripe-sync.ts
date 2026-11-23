import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { PLANS, DEFAULT_PLAN_ID, type PlanId } from "./plans";
import { trialNotifyEmail } from "./trial";

/** Сопоставляет price id из Stripe с нашим планом по переменным окружения. */
export function planIdForPrice(priceId: string | null | undefined): PlanId {
  if (!priceId) return DEFAULT_PLAN_ID;
  for (const plan of Object.values(PLANS)) {
    if (plan.priceEnvVar && process.env[plan.priceEnvVar] === priceId) {
      return plan.id;
    }
  }
  return DEFAULT_PLAN_ID;
}

function periodEnd(subscription: Stripe.Subscription): Date | null {
  if (subscription.status === "trialing" && typeof subscription.trial_end === "number") return new Date(subscription.trial_end * 1000);
  const item = subscription.items.data[0];
  const seconds =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/** Tells the owner that someone started a free trial. Never throws: a failed email must not break billing. */
async function notifyTrialStarted(workspaceId: string, planId: PlanId, ends: Date | null) {
  try {
    const owner = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "OWNER" },
      select: { user: { select: { id: true, email: true, name: true } } },
    });
    const who = owner?.user.email ?? "unknown";
    const base = (process.env.NEXTAUTH_URL ?? "https://hyprlyx.com").replace(/\/$/, "");
    const link = owner ? `${base}/dashboard/admin/users/${owner.user.id}` : `${base}/dashboard/admin/subscriptions?f=trial`;
    const endText = ends ? ends.toUTCString().slice(0, 16) : "in 7 days";
    await sendMail({
      to: trialNotifyEmail(),
      subject: `New free trial: ${who}`,
      text: `${who}${owner?.user.name ? ` (${owner.user.name})` : ""} started a ${PLANS[planId].name} free trial. It ends ${endText}; if they don't cancel, Stripe charges them then.\n\n${link}`,
      html: `<p><b>${who}</b>${owner?.user.name ? ` (${owner.user.name})` : ""} started a <b>${PLANS[planId].name}</b> free trial.</p><p>Ends ${endText}. If they don't cancel, Stripe charges them then.</p><p><a href="${link}">Open in admin</a></p>`,
    });
  } catch (e) {
    console.error("[trial] notify failed:", (e as Error).message);
  }
}

/**
 * Записывает состояние подписки Stripe в нашу базу.
 * Ручные подписки, выданные из админки, не трогает.
 */
export async function syncSubscription(
  workspaceId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planId = planIdForPrice(priceId);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const data = {
    plan: subscription.status === "canceled" ? DEFAULT_PLAN_ID : planId,
    status: subscription.status,
    source: "stripe",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  // A live manual grant is not replaced by a Stripe subscription that is not paying (canceled, unpaid, incomplete…).
  const existing = await prisma.subscription.findUnique({ where: { workspaceId }, select: { source: true, status: true, currentPeriodEnd: true, stripeSubscriptionId: true } });
  const manualLive = existing?.source === "manual" && existing.status === "active" && (!existing.currentPeriodEnd || existing.currentPeriodEnd.getTime() > Date.now());
  if (manualLive && subscription.status !== "active" && subscription.status !== "trialing") return;

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });

  // Webhooks can arrive more than once: only the first time this subscription is seen trialing sends the email.
  const newTrial = subscription.status === "trialing" && !(existing?.status === "trialing" && existing.stripeSubscriptionId === subscription.id);
  if (newTrial) await notifyTrialStarted(workspaceId, planId, data.currentPeriodEnd);
}
