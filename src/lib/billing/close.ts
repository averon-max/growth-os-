import "server-only";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { DEFAULT_PLAN_ID } from "./plans";

const isMissing = (e: unknown) => (e as { code?: string })?.code === "resource_missing";

/**
 * Stops all billing for these workspaces, before an account is deleted:
 * cancels every Stripe subscription right away (no further charges) and deletes the Stripe customer,
 * which also removes every saved card. Invoices stay in Stripe, as tax law requires.
 * Throws if Stripe can't be reached, so the caller never deletes an account that could still be charged.
 */
export async function closeBilling(workspaceIds: string[]): Promise<{ cancelled: number; customersDeleted: number }> {
  if (workspaceIds.length === 0) return { cancelled: 0, customersDeleted: 0 };
  const subs = await prisma.subscription.findMany({
    where: { workspaceId: { in: workspaceIds }, OR: [{ stripeSubscriptionId: { not: null } }, { stripeCustomerId: { not: null } }] },
    select: { workspaceId: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });
  if (subs.length === 0) return { cancelled: 0, customersDeleted: 0 };
  if (!isStripeConfigured()) throw new Error("Billing is not reachable right now, so the account was not deleted. Try again later.");

  let cancelled = 0;
  for (const s of subs) {
    if (!s.stripeSubscriptionId) continue;
    try {
      const current = await stripe().subscriptions.retrieve(s.stripeSubscriptionId);
      if (current.status !== "canceled" && current.status !== "incomplete_expired") {
        await stripe().subscriptions.cancel(s.stripeSubscriptionId, { prorate: false, invoice_now: false });
        cancelled++;
      }
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }

  let customersDeleted = 0;
  for (const customerId of new Set(subs.map((s) => s.stripeCustomerId).filter((x): x is string => !!x))) {
    try {
      await stripe().customers.del(customerId);
      customersDeleted++;
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }

  await prisma.subscription.updateMany({
    where: { workspaceId: { in: workspaceIds } },
    data: { plan: DEFAULT_PLAN_ID, status: "canceled", cancelAtPeriodEnd: false, stripeCustomerId: null, stripeSubscriptionId: null },
  });
  return { cancelled, customersDeleted };
}
