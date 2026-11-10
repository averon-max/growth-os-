import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { PLANS, DEFAULT_PLAN_ID, type PlanId } from "./plans";

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
  const item = subscription.items.data[0];
  const seconds =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
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

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });
}
