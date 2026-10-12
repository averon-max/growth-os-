/**
 * PREWRITER_MISSION_AUTHORITY_GATE_V1
 *
 * A post-evidence plan may contract optional factual scope, but it may
 * not silently retain a question-section mission after removing one of
 * the section blueprint's required claims.
 *
 * This check is deliberately earlier than Writer and any paid AI call.
 * It does not promote unsupported research or reconstruct evidence.
 */
export interface PreWriterMissionAuthorityIssueV1 {
  readonly index: number;
  readonly heading: string;
  readonly missingClaimIds: readonly string[];
}

export class PreWriterMissionAuthorityErrorV1 extends Error {
  readonly code = "ARTICLE_PREWRITER_MISSION_AUTHORITY_LOST" as const;
  readonly issues: readonly Readonly<PreWriterMissionAuthorityIssueV1>[];

  constructor(issues: readonly Readonly<PreWriterMissionAuthorityIssueV1>[]) {
    super(
      this.code + ":" + issues.map(issue =>
        `SECTION=${issue.index};HEADING=${issue.heading};CLAIMS=${issue.missingClaimIds.join(",")}`
      ).join("|")
    );
    this.name = "PreWriterMissionAuthorityErrorV1";
    this.issues = Object.freeze([...issues]);
  }
}

export function inspectPreWriterMissionAuthorityV1({
  sections,
  blueprints,
}: {
  sections: readonly Readonly<{
    heading: string;
    state: string;
    requiredClaimIds: readonly string[];
  }>[];
  blueprints: readonly Readonly<{
    heading: string;
    requiredClaims: readonly string[];
  }>[];
}): Readonly<{
  ready: boolean;
  issues: readonly Readonly<PreWriterMissionAuthorityIssueV1>[];
}> {
  if (sections.length !== blueprints.length) {
    throw new Error("ARTICLE_PREWRITER_MISSION_SECTION_COUNT_MISMATCH");
  }

  const issues: PreWriterMissionAuthorityIssueV1[] = [];

  sections.forEach((section, index) => {
    const original = blueprints[index];
    if (!original || original.heading.trim() !== section.heading.trim()) {
      throw new Error(`ARTICLE_PREWRITER_MISSION_HEADING_MISMATCH:${index}`);
    }
    if (section.state !== "WRITABLE" || !/\?\s*$/.test(section.heading)) {
      return;
    }
    const finalClaims = new Set(section.requiredClaimIds.map(id => id.trim()));
    const missingClaimIds = [...new Set(original.requiredClaims.map(id => id.trim()).filter(Boolean))]
      .filter(id => !finalClaims.has(id));
    if (missingClaimIds.length) {
      issues.push(Object.freeze({
        index,
        heading: section.heading,
        missingClaimIds: Object.freeze(missingClaimIds),
      }));
    }
  });

  return Object.freeze({
    ready: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

export function assertPreWriterMissionAuthorityV1(
  input: Parameters<typeof inspectPreWriterMissionAuthorityV1>[0]
): void {
  const result = inspectPreWriterMissionAuthorityV1(input);
  if (!result.ready) {
    throw new PreWriterMissionAuthorityErrorV1(result.issues);
  }
}
