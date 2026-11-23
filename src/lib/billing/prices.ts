import "server-only";
import { unstable_cache } from "next/cache";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { PLANS, PAID_PLAN_IDS, stripePriceIdFor, type PlanId } from "./plans";

export type PlanPrices = Record<PlanId, number>;

/**
 * Monthly price of every plan, read from Stripe (what the customer is really charged) and cached for an hour.
 * If Stripe can't be reached, the fallback in plans.ts is shown.
 */
export const planPrices = unstable_cache(
  async (): Promise<PlanPrices> => {
    const out = Object.fromEntries(Object.values(PLANS).map((p) => [p.id, p.priceMonthlyUsd])) as PlanPrices;
    if (!isStripeConfigured()) return out;
    await Promise.all(
      PAID_PLAN_IDS.map(async (id) => {
        const priceId = stripePriceIdFor(PLANS[id]);
        if (!priceId) return;
        try {
          const price = await stripe().prices.retrieve(priceId);
          if (typeof price.unit_amount === "number") out[id] = price.unit_amount / 100;
        } catch (e) {
          console.warn("[prices] could not read", id, (e as Error).message);
        }
      }),
    );
    return out;
  },
  ["stripe-plan-prices-v1"],
  { revalidate: 3600 },
);

/** $49 or $49.99 */
export const formatPrice = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
