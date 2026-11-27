import { NAV } from "@/lib/nav";
import { PLAN_RANK, SECTION_MIN_PLAN } from "./access";
import { PLANS, type PlanId } from "./plans";
import { TRIAL_DAYS, TRIAL_PLAN } from "./trial";

/*
 * What each plan opens, built from the dashboard menu (lib/nav.ts) and the plan gates (lib/billing/access.ts),
 * so the pricing cards and the comparison table can't promise something a plan doesn't open.
 * COPY only rewords a section for the pricing page; a section missing here falls back to its menu label.
 */
export const PLAN_ORDER: PlanId[] = ["FREE", "STARTER", "GROWTH", "AUTOPILOT"];
export const PAID_ORDER: PlanId[] = ["STARTER", "GROWTH", "AUTOPILOT"];

const COPY: Record<string, string> = {
  "": "Overview of every site's health",
  websites: "Website setup and site analysis",
  keywords: "Keyword rankings, volume and clicks",
  "keyword-planner": "Keyword Planner: quick wins, gaps and clusters",
  content: "AI writer: briefs and full drafts from live search results",
  backlinks: "Backlinks: referring domains, links and anchors",
  competitors: "Competitor tracking and live Google results",
  traffic: "Traffic report: Cloudflare visits and Google Search side by side",
  audience: "Audience from Google Analytics 4",
  bots: "Search engine and AI crawler traffic",
  seo: "Technical SEO audit with clear fixes",
  cms: "CMS publishing (coming soon)",
};

/** soon: shown on the pricing page as "Soon", not as included (the menu item has the "Soon" badge). */
export type Feature = { key: string; label: string; text: string; plan: PlanId; soon: boolean };

const sectionOf = (href: string) => href.replace(/^\/dashboard\/?/, "").split(/[/?]/)[0];

export const FEATURES: Feature[] = NAV.flatMap((s) => s.items).map((item) => {
  const key = sectionOf(item.href);
  return { key, label: item.label, text: COPY[key] ?? item.label, plan: SECTION_MIN_PLAN[key] ?? "FREE", soon: item.badge === "Soon" };
});

export const hasFeature = (plan: PlanId, key: string) =>
  PLAN_RANK[plan] >= PLAN_RANK[FEATURES.find((f) => f.key === key)?.plan ?? "FREE"];

const n = (v: number) => v.toLocaleString("en-US");
const plural = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;

/** Usage limits that matter for this plan (a limit for a section the plan can't open is not shown). */
export function usage(id: PlanId): string[] {
  const l = PLANS[id].limits;
  const out = [plural(l.websites, "website", "websites")];
  if (hasFeature(id, "keywords")) out.push(`${n(l.trackedKeywords)} tracked keywords`);
  if (hasFeature(id, "content")) out.push(`${n(l.articlesPerMonth)} AI article drafts / month`);
  return out;
}

/**
 * Short list for a pricing card. The first paid plan lists everything it opens (the Free basics are left out:
 * every account has them); higher plans list what they add on top of the plan below.
 */
export function highlights(id: PlanId): string[] {
  const i = PAID_ORDER.indexOf(id);
  const prev = i > 0 ? PAID_ORDER[i - 1] : null;
  const added = FEATURES.filter((f) => !f.soon && (prev ? f.plan === id : f.plan !== "FREE" && PLAN_RANK[f.plan] <= PLAN_RANK[id])).map((f) => f.text);
  return [
    ...(id === TRIAL_PLAN ? [`${TRIAL_DAYS}-day free trial`] : []),
    ...(prev ? [`Everything in ${PLANS[prev].name}`] : []),
    ...usage(id),
    ...added,
  ];
}
