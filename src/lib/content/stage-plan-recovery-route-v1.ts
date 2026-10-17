/**
 * One deterministic recovery routing policy for the Stage Plan boundary.
 *
 * Routing does not mutate a plan, invoke a model, count actual provider
 * requests, or change terminal error messages. The planner retains all
 * original bounded attempts, repairs and fail-closed checks.
 */
export type StagePlanRecoveryRouteV1 =
  | "ACCEPT"
  | "LOCAL_CLAIM_OWNER_REPAIR"
  | "FULL_REGENERATION"
  | "STOP";

export const DUPLICATE_STAGE_PLAN_CLAIM_OWNER_PREFIX_V1 =
  "sections[].requiredClaimIds duplicate-owner:";

export function selectStagePlanRecoveryRouteV1({
  issues,
  localClaimOwnerRepairAttempted = false,
  fullRegenerationAttempted = false,
}: {
  issues: readonly string[];
  localClaimOwnerRepairAttempted?: boolean;
  fullRegenerationAttempted?: boolean;
}): StagePlanRecoveryRouteV1 {
  // Presence of any issue requires repair or a fail-closed STOP.
  if (issues.length === 0) return "ACCEPT";

  // A consumed recovery slot must never cascade into a second AI request.
  if (localClaimOwnerRepairAttempted || fullRegenerationAttempted) return "STOP";

  // Only this exact, complete subset may use the bounded owner-choice model.
  // Mixed failures, unknown claim IDs, structural and evidence issues must
  // take the existing single whole-plan regeneration instead.
  if (issues.every(issue =>
    issue.startsWith(DUPLICATE_STAGE_PLAN_CLAIM_OWNER_PREFIX_V1)
  )) return "LOCAL_CLAIM_OWNER_REPAIR";

  return "FULL_REGENERATION";
}
