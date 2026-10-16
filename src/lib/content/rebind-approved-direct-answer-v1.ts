/**
 * Move a required answer from an old factual claim to a live-verified
 * direct-answer claim, without deleting any other claim authority.
 *
 * The section Blueprint and contracted ExecutionPlan legitimately differ.
 * Old claim may be present in only one of them. This function only updates
 * the named section; caller independently verifies source & publication gates.
 */
export function rebindApprovedDirectAnswerV1({
  planClaimIds,
  blueprintClaimIds,
  planEvidenceIds,
  blueprintEvidenceIds,
  oldClaimId,
  newClaimId,
  newEvidenceId,
  oldClaimEvidenceIds,
}: {
  planClaimIds: readonly string[];
  blueprintClaimIds: readonly string[];
  planEvidenceIds: readonly string[];
  blueprintEvidenceIds: readonly string[];
  oldClaimId: string;
  newClaimId: string;
  newEvidenceId: string;
  oldClaimEvidenceIds: readonly string[];
}): Readonly<{
  planClaimIds: string[];
  blueprintClaimIds: string[];
  planEvidenceIds: string[];
  blueprintEvidenceIds: string[];
}> {
  if (!oldClaimId || !newClaimId || oldClaimId === newClaimId ||
      !newEvidenceId || !(
        planClaimIds.includes(oldClaimId) ||
        blueprintClaimIds.includes(oldClaimId)
      )) {
    throw new Error("DIRECT_ANSWER_REBIND_OWNER_INVALID");
  }
  const unique = (items: readonly string[]) => [...new Set(items)];
  const updatedClaims = (ids: readonly string[]) =>
    unique([...ids.filter(id => id !== oldClaimId), newClaimId]);
  const obsoleteEvidence = new Set(oldClaimEvidenceIds);
  const updatedEvidence = (ids: readonly string[]) =>
    unique([...ids.filter(id => !obsoleteEvidence.has(id)), newEvidenceId]);

  const result = {
    planClaimIds: updatedClaims(planClaimIds),
    blueprintClaimIds: updatedClaims(blueprintClaimIds),
    planEvidenceIds: updatedEvidence(planEvidenceIds),
    blueprintEvidenceIds: updatedEvidence(blueprintEvidenceIds),
  };
  for (const [previous, next] of [
    [planClaimIds, result.planClaimIds],
    [blueprintClaimIds, result.blueprintClaimIds],
  ] as const) {
    for (const id of previous) {
      if (id !== oldClaimId && !next.includes(id)) {
        throw new Error("DIRECT_ANSWER_REBIND_UNRELATED_CLAIM_LOSS:" + id);
      }
    }
  }
  return result;
}
