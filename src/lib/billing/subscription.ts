import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLAN_ID, planFor, type Plan, type PlanLimits } from "./plans";

/** Статусы, при которых платный план продолжает действовать. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export interface WorkspaceBilling {
  plan: Plan;
  status: string;
  source: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export async function getWorkspaceBilling(workspaceId: string): Promise<WorkspaceBilling> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId } });

  if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
    return {
      plan: planFor(DEFAULT_PLAN_ID),
      status: sub?.status ?? "none",
      source: sub?.source ?? "none",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      stripeCustomerId: sub?.stripeCustomerId ?? null,
    };
  }

  return {
    plan: planFor(sub.plan),
    status: sub.status,
    source: sub.source,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    stripeCustomerId: sub.stripeCustomerId,
  };
}

export class PlanLimitError extends Error {
  constructor(
    readonly limitKey: keyof PlanLimits,
    readonly limit: number,
    readonly used: number,
    readonly planId: string
  ) {
    super(`Plan ${planId} allows ${limit} ${limitKey}, already used ${used}`);
    this.name = "PlanLimitError";
  }
}

/**
 * Бросает PlanLimitError, если текущее количество уже достигло лимита плана.
 * Количество считает вызывающая сторона — так помощник не знает о ваших запросах.
 */
export async function assertWithinLimit(
  workspaceId: string,
  limitKey: keyof PlanLimits,
  currentCount: number
): Promise<void> {
  const { plan } = await getWorkspaceBilling(workspaceId);
  const limit = plan.limits[limitKey];
  if (currentCount >= limit) {
    throw new PlanLimitError(limitKey, limit, currentCount, plan.id);
  }
}

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  return rows.map((r) => r.workspaceId);
}
