import { NAV } from "@/lib/nav";
import { PLAN_RANK, SECTION_MIN_PLAN } from "./access";
import { PLANS, type PlanId } from "./plans";

/*
 * What each plan opens, built from the dashboard menu (lib/nav.ts) and the plan gates (lib/billing/access.ts).
 * The pricing cards and the comparison table read from here, so they can't promise something the plan doesn't open.
 */
export const PLAN_ORDER: PlanId[] = ["FREE", "STARTER", "GROWTH", "AUTOPILOT"];

export type Feature = { key: string; label: string; description: string; plan: PlanId };

const sectionOf = (href: string) => href.replace(/^\/dashboard\/?/, "").split(/[/?]/)[0];

export const FEATURES: Feature[] = NAV.flatMap((s) => s.items).map((item) => {
  const key = sectionOf(item.href);
  return { key, label: item.label, description: item.description ?? "", plan: SECTION_MIN_PLAN[key] ?? "FREE" };
});

export const hasFeature = (plan: PlanId, key: string) =>
  PLAN_RANK[plan] >= PLAN_RANK[FEATURES.find((f) => f.key === key)?.plan ?? "FREE"];

const n = (v: number) => v.toLocaleString("en-US");
const plural = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;

/** Usage limits that matter for this plan (a limit for a section the plan can't open is not shown). */
export function usage(id: PlanId): string[] {
  const l = PLANS[id].limits;
  const out = [plural(l.websites, "website", "websites")];
  if (hasFeature(id, "keywords")) out.push(`${n(l.keywordRefreshesPerMonth)} keyword data refreshes / month`);
  if (hasFeature(id, "content")) out.push(`${n(l.articlesPerMonth)} AI article drafts / month`);
  return out;
}

/** Short list for a pricing card: what is new in this plan compared with the one below it. */
export function highlights(id: PlanId): string[] {
  const i = PLAN_ORDER.indexOf(id);
  const prev = i > 0 ? PLAN_ORDER[i - 1] : null;
  const added = FEATURES.filter((f) => f.plan === id).map((f) => (f.description ? `${f.label} — ${f.description.toLowerCase()}` : f.label));
  return [...(prev ? [`Everything in ${PLANS[prev].name}`] : []), ...usage(id), ...added];
}
