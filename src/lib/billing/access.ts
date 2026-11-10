import { type PlanId } from "./plans";

export const PLAN_RANK: Record<PlanId, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  AUTOPILOT: 3,
};

/**
 * Минимальный тариф для раздела дашборда. Ключ — имя папки в src/app/dashboard.
 * Разделы, которых тут нет, доступны всем.
 */
export const SECTION_MIN_PLAN: Record<string, PlanId> = {
  websites: "STARTER",
  keywords: "STARTER",
  "keyword-planner": "STARTER",
  "seo-audit": "STARTER",
  cms: "STARTER",
  analysis: "STARTER",
  seo: "STARTER",

  content: "GROWTH",
  audience: "GROWTH",
  competitors: "GROWTH",
  backlinks: "GROWTH",
  bots: "GROWTH",
  "bots-crawlers": "GROWTH",

  automations: "AUTOPILOT",
  workflows: "AUTOPILOT",
};

export function meetsPlan(current: PlanId, required: PlanId): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}
