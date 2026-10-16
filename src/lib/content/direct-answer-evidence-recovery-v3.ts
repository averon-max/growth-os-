/**
 * EXACT_QUESTION_EVIDENCE_RECOVERY_V3
 *
 * A question-heading is a reader information job even when an upstream
 * template labels the section with an optional role or omits plan.questions.
 * This is a retrieval trigger only, NEVER publication evidence authority.
 */
export function eligibleForDirectAnswerEvidenceRecoveryV3({
  heading,
  questions,
  roles,
  requiredRoles,
}: {
  heading: string;
  questions: readonly string[];
  roles: readonly string[];
  requiredRoles: ReadonlySet<string>;
}): boolean {
  // Preserve the prior required-role path, and admit explicit
  // question H2s even when questions[] or template roles are absent.
  return /\?\s*$/.test(heading.trim()) ||
    (questions.length > 0 && roles.some(role => requiredRoles.has(role)));
}

/** Use the precise approved question as the discovery seed, not general article intent. */
export function directAnswerEvidenceSearchProbeV3({
  heading,
  questions,
}: {
  heading: string;
  questions: readonly string[];
}): string {
  const exactHeading = heading.trim();
  // A question-shaped H2 is the approved information job. A nested
  // definition/FAQ question must not silently replace it in search.
  if (/\?\s*$/.test(exactHeading)) {
    return exactHeading;
  }
  const exact = questions.find(question => /\?\s*$/.test(question.trim()));
  return (exact ?? exactHeading).trim();
}


/**
 * Pure source-discovery projection for the question-first recovery pass.
 * Caller passes only unresolved original claims. These question-shaped
 * texts must NEVER be written back to the claim ledger as factual claims.
 */
export function buildEarlyQuestionEvidenceProbesV3({
  unresolvedClaims,
  sections,
}: {
  unresolvedClaims: readonly Readonly<{ id: string; text: string }>[];
  sections: readonly Readonly<{
    heading: string;
    questions: readonly string[];
    requiredClaimIds: readonly string[];
  }>[];
}): readonly Readonly<{ id: string; text: string }>[] {
  return unresolvedClaims.flatMap(claim => {
    const owner = sections.find(section =>
      section.requiredClaimIds.includes(claim.id)
    );
    if (!owner || !/\?\s*$/.test(owner.heading.trim())) {
      return [];
    }
    return [{
      id: claim.id,
      text: directAnswerEvidenceSearchProbeV3({
        heading: owner.heading,
        questions: owner.questions,
      }),
    }];
  });
}
