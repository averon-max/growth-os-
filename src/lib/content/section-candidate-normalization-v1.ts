import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionCandidateV1,
} from "./master-article-generator";


/*
 * SECTION_PROVIDER_CANONICAL_H2_NORMALIZATION_V1
 *
 * Provider formatting noise only.
 *
 * The deterministic composer owns H2.
 *
 * We may remove exactly ONE leading H2 only when its text is
 * exactly equal to the canonical blueprint heading.
 *
 * Any other H2 remains untouched and will still fail closed in
 * finalizeGeneratedSectionV1().
 */
export function normalizeGeneratedSectionCandidateV1({
  contract,
  candidate,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  candidate:
    Readonly<GeneratedSectionCandidateV1>;
}): GeneratedSectionCandidateV1 {
  const rawBody =
    candidate.bodyMarkdown;

  if (
    typeof rawBody !==
      "string"
  ) {
    return {
      ...candidate,
    };
  }


  const body =
    rawBody.trim();

  const lines =
    body.split(
      /\r?\n/
    );

  const firstLine =
    lines[0]?.trim() ??
    "";

  const canonicalH2 =
    `## ${contract.blueprint.heading.trim()}`;


  /*
   * SECTION_PROVIDER_H2_OWNERSHIP_NORMALIZATION_V2
   *
   * H2 is system-owned.
   *
   * 1. Remove an exact leading duplicate of the canonical H2.
   * 2. Any remaining model-authored H2 is deterministically
   *    demoted to H3.
   *
   * H3+ is explicitly permitted inside the section body.
   * This changes hierarchy only — never prose or factual meaning.
   *
   * H1 remains forbidden and is still rejected by the strict
   * finalizer.
   */
  const bodyWithoutCanonicalH2 =
    firstLine ===
      canonicalH2
      ? lines
          .slice(
            1
          )
          .join(
            "\n"
          )
          .trim()
      : body;


  const normalizedBody =
    bodyWithoutCanonicalH2
      .replace(
        /^(\s{0,3})##(\s+)/gm,
        "$1###$2"
      )
      .trim();


  return {
    ...candidate,

    bodyMarkdown:
      normalizedBody,
  };
}
