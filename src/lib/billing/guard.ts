import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceBilling } from "./subscription";
import { SECTION_MIN_PLAN, meetsPlan } from "./access";
import { planFor, PLANS, DEFAULT_PLAN_ID, type PlanId } from "./plans";

export interface SectionGate {
  unauthenticated: boolean;
  allowed: boolean;
  currentPlan: string;
  requiredPlan: string;
  requiredPlanId: PlanId;
}

export async function sectionGate(section: string): Promise<SectionGate> {
  const required: PlanId = SECTION_MIN_PLAN[section] ?? DEFAULT_PLAN_ID;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return {
      unauthenticated: true,
      allowed: false,
      currentPlan: PLANS[DEFAULT_PLAN_ID].name,
      requiredPlan: PLANS[required].name,
      requiredPlanId: required,
    };
  }

  // Plans apply to everyone, admins included: an admin who wants access grants it to their own workspace
  // in /dashboard/admin. Otherwise removing a plan looks broken when testing on an admin account.
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
    orderBy: { id: "asc" },
  });

  const billing = membership
    ? await getWorkspaceBilling(membership.workspaceId)
    : { plan: planFor(DEFAULT_PLAN_ID) };

  return {
    unauthenticated: false,
    allowed: meetsPlan(billing.plan.id, required),
    currentPlan: billing.plan.name,
    requiredPlan: PLANS[required].name,
    requiredPlanId: required,
  };
}
