import "server-only";
import { prisma } from "@/lib/prisma";
import { getWorkspaceBilling } from "./subscription";
import { PLAN_RANK, SECTION_MIN_PLAN } from "./access";
import { DEFAULT_PLAN_ID, PLANS, type PlanId } from "./plans";

/*
 * Paid API routes need the same plan as their dashboard page (SECTION_MIN_PLAN).
 * Pages were already gated; without this, anyone signed in could call the API directly
 * and spend DataForSEO / OpenAI money on a free account.
 */
const API_SECTION: [RegExp, string][] = [
  [/^\/api\/(writer|content)(\/|$)/, "content"],
  [/^\/api\/backlinks(\/|$)/, "backlinks"],
  [/^\/api\/competitors(\/|$)/, "competitors"],
  [/^\/api\/audience(\/|$)/, "audience"],
  [/^\/api\/bots(\/|$)/, "bots"],
  [/^\/api\/(keywords|planner)(\/|$)/, "keywords"],
  [/^\/api\/(analyses|seo)(\/|$)/, "seo-audit"],
  [/^\/api\/cms(\/|$)/, "cms"],
];

/** The dashboard section an API path belongs to (for sections an admin closed for a user). */
export function sectionFor(path: string): string | null {
  const hit = API_SECTION.find(([re]) => re.test(path));
  return hit ? hit[1] : null;
}

export function requiredPlanFor(path: string): PlanId | null {
  const hit = API_SECTION.find(([re]) => re.test(path));
  return hit ? SECTION_MIN_PLAN[hit[1]] ?? null : null;
}

/** The best plan among the user's workspaces (a member of a paid workspace gets its features). */
export async function bestPlanForUser(userId: string): Promise<PlanId> {
  const rows = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
  let best: PlanId = DEFAULT_PLAN_ID;
  for (const r of rows) {
    const { plan } = await getWorkspaceBilling(r.workspaceId);
    if (PLAN_RANK[plan.id] > PLAN_RANK[best]) best = plan.id;
  }
  return best;
}

export function planName(id: PlanId): string {
  return PLANS[id].name;
}

/** True while any workspace of this user is in a Stripe free trial. */
export async function isTrialing(userId: string): Promise<boolean> {
  const row = await prisma.subscription.findFirst({
    where: { status: "trialing", workspace: { members: { some: { userId } } } },
    select: { id: true },
  });
  return row !== null;
}
