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
  const asksQuestion = /\?\s*$/.test(heading.trim()) ||
    questions.some(question => /\?\s*$/.test(question.trim()));
  if (!asksQuestion) return false;
  return /\?\s*$/.test(heading.trim()) ||
    roles.some(role => requiredRoles.has(role));
}

/** Use the precise approved question as the discovery seed, not general article intent. */
export function directAnswerEvidenceSearchProbeV3({
  heading,
  questions,
}: {
  heading: string;
  questions: readonly string[];
}): string {
  const exact = questions.find(question => /\?\s*$/.test(question.trim()));
  return (exact ?? heading).trim();
}
