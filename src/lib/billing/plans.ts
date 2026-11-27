export type PlanId = "FREE" | "STARTER" | "GROWTH" | "AUTOPILOT";

export interface PlanLimits {
  websites: number;
  articlesPerMonth: number;
  keywordRefreshesPerMonth: number;
  /** Keywords the workspace can track in the Keyword Planner (all its websites together). */
  trackedKeywords: number;
  /**
   * Paid data (DataForSEO) a workspace may use, in USD. When reached, saved data is still shown and new
   * data resumes the next day / month. AI article drafts are not counted here: they have their own monthly allowance.
   */
  dataPerDayUsd: number;
  dataPerMonthUsd: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  /** Имя переменной окружения с price id из Stripe. У бесплатного плана его нет. */
  priceEnvVar: string | null;
  limits: PlanLimits;
}

/*
 * Limits are set against Semrush (Pro $139.95: 500 tracked keywords) and Ahrefs (Lite $129: 750):
 * more tracked keywords per dollar on every plan. Tracking itself is almost free (positions come from Search
 * Console and saved data); the data allowance is what keeps the cost of each plan below its price.
 */
export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonthlyUsd: 0,
    priceEnvVar: null,
    limits: { websites: 1, articlesPerMonth: 3, keywordRefreshesPerMonth: 10, trackedKeywords: 10, dataPerDayUsd: 0.1, dataPerMonthUsd: 1 },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthlyUsd: 49,
    priceEnvVar: "STRIPE_PRICE_STARTER",
    limits: { websites: 1, articlesPerMonth: 15, keywordRefreshesPerMonth: 100, trackedKeywords: 500, dataPerDayUsd: 1, dataPerMonthUsd: 15 },
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    priceMonthlyUsd: 75,
    priceEnvVar: "STRIPE_PRICE_GROWTH",
    limits: { websites: 5, articlesPerMonth: 50, keywordRefreshesPerMonth: 400, trackedKeywords: 1500, dataPerDayUsd: 2, dataPerMonthUsd: 30 },
  },
  AUTOPILOT: {
    id: "AUTOPILOT",
    name: "Autopilot",
    priceMonthlyUsd: 150,
    priceEnvVar: "STRIPE_PRICE_AUTOPILOT",
    limits: { websites: 25, articlesPerMonth: 200, keywordRefreshesPerMonth: 1500, trackedKeywords: 5000, dataPerDayUsd: 3.5, dataPerMonthUsd: 70 },
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
