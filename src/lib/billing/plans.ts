export type PlanId = "FREE" | "STARTER" | "GROWTH" | "AUTOPILOT";

export interface PlanLimits {
  websites: number;
  articlesPerMonth: number;
  keywordRefreshesPerMonth: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  /** Имя переменной окружения с price id из Stripe. У бесплатного плана его нет. */
  priceEnvVar: string | null;
  limits: PlanLimits;
}

// ВНИМАНИЕ: цифры лимитов — заглушки, поставьте свои.
export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonthlyUsd: 0,
    priceEnvVar: null,
    limits: { websites: 1, articlesPerMonth: 3, keywordRefreshesPerMonth: 10 },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthlyUsd: 49,
    priceEnvVar: "STRIPE_PRICE_STARTER",
    limits: { websites: 1, articlesPerMonth: 15, keywordRefreshesPerMonth: 100 },
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    priceMonthlyUsd: 99,
    priceEnvVar: "STRIPE_PRICE_GROWTH",
    limits: { websites: 5, articlesPerMonth: 50, keywordRefreshesPerMonth: 400 },
  },
  AUTOPILOT: {
    id: "AUTOPILOT",
    name: "Autopilot",
    priceMonthlyUsd: 199,
    priceEnvVar: "STRIPE_PRICE_AUTOPILOT",
    limits: { websites: 25, articlesPerMonth: 200, keywordRefreshesPerMonth: 1500 },
  },
};

export const DEFAULT_PLAN_ID: PlanId = "FREE";
export const PAID_PLAN_IDS: PlanId[] = ["STARTER", "GROWTH", "AUTOPILOT"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function planFor(value: unknown): Plan {
  return isPlanId(value) ? PLANS[value] : PLANS[DEFAULT_PLAN_ID];
}

export function stripePriceIdFor(plan: Plan): string | null {
  if (!plan.priceEnvVar) return null;
  return process.env[plan.priceEnvVar] ?? null;
}
