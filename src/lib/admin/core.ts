import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { planFor, PLANS, type PlanId } from "@/lib/billing/plans";
import { PLAN_RANK } from "@/lib/billing/access";

export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/** Admin pages: anyone else gets a plain 404, so the admin area does not reveal that it exists. */
export async function adminOrNotFound(): Promise<{ id: string; email: string }> {
  try {
    return await requireAdmin();
  } catch {
    notFound();
  }
}

type SubLike = { plan: string; status: string; source: string; currentPeriodEnd: Date | null } | null | undefined;

/** The plan a subscription really gives right now (manual grants end on their end date). */
export function effectivePlan(sub: SubLike): PlanId {
  if (!sub) return "FREE";
  const expired = sub.source === "manual" && sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() < Date.now();
  return ACTIVE_STATUSES.includes(sub.status) && !expired ? planFor(sub.plan).id : "FREE";
}

export function bestPlan(subs: SubLike[]): PlanId {
  return subs.map(effectivePlan).reduce<PlanId>((best, p) => (PLAN_RANK[p] > PLAN_RANK[best] ? p : best), "FREE");
}

export const planLabel = (id: PlanId) => PLANS[id].name;

export type AuditTarget = { type: "user" | "workspace" | "ticket" | "subscription"; id?: string | null; label?: string | null };

/** One line in the admin audit log. Never throws: a failed log must not undo the action, but it is reported. */
export async function audit(admin: { id: string; email: string }, action: string, target: AuditTarget, details?: Record<string, unknown>): Promise<void> {
  await prisma.adminAuditLog
    .create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action,
        targetType: target.type,
        targetId: target.id ?? null,
        targetLabel: target.label ?? null,
        details: (details ?? undefined) as never,
      },
    })
    .catch((e: Error) => console.error("[admin-audit]", action, e.message));
}

export function ago(d: Date | null | undefined): string {
  if (!d) return "—";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return day(d);
}

export function day(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
