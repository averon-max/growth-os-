export interface PublicationEvidenceSectionV1 {
  heading:
    string;

  requiredClaims:
    readonly string[];
}


export interface PublicationClaimEvidenceV1 {
  claimId:
    string;

  relation:
    string;

  kind:
    string;

  excerpt?:
    string | null;
}


export interface PublicationEvidenceDeferredSectionV1 {
  heading:
    string;

  sourceDeferredHeading:
    string;

  summary:
    string;

  reason:
    "MISSING_PUBLICATION_GRADE_EVIDENCE";
}


export interface PublicationEvidenceSectionScopeV1 {
  deferredIndexes:
    readonly number[];

  deferredSections:
    readonly PublicationEvidenceDeferredSectionV1[];
}


/*
 * PUBLICATION_EVIDENCE_SECTION_SCOPE_V1
 *
 * Stage Planner owns semantic claim -> section ownership.
 *
 * Evidence Graph owns publication authority.
 *
 * A section whose mission requires a claim that has no
 * SUPPORTS + VERIFIED_EXCERPT authority is not safe to execute.
 *
 * We defer the WHOLE section instead of:
 * - deleting claim ownership,
 * - asking Writer to improvise,
 * - weakening semantic critics,
 * - or publishing unsupported YMYL prose.
 */
export function resolvePublicationEvidenceSectionScopeV1({
  sections,
  claimEvidence,
}: {
  sections:
    readonly PublicationEvidenceSectionV1[];

  claimEvidence:
    readonly PublicationClaimEvidenceV1[];
}): PublicationEvidenceSectionScopeV1 {
  const verifiedClaims =
    new Set(
      claimEvidence
        .filter(
          (
            evidence
          ) =>
            evidence.relation ===
              "SUPPORTS" &&
            evidence.kind ===
              "VERIFIED_EXCERPT" &&
            Boolean(
              evidence.excerpt
                ?.trim()
            )
        )
        .map(
          (
            evidence
          ) =>
            evidence.claimId
        )
    );


  const deferredIndexes:
    number[] =
      [];

  const deferredSections:
    PublicationEvidenceDeferredSectionV1[] =
      [];


  sections.forEach(
    (
      section,
      index
    ) => {
      const requiredClaims =
        [
          ...new Set(
            section
              .requiredClaims
              .map(
                (
                  claimId
                ) =>
                  claimId.trim()
              )
              .filter(
                Boolean
              )
          ),
        ];


      if (
        requiredClaims.length ===
        0
      ) {
        return;
      }


      const missing =
        requiredClaims.filter(
          (
            claimId
          ) =>
            !verifiedClaims.has(
              claimId
            )
        );


      if (
        missing.length ===
        0
      ) {
        return;
      }


      deferredIndexes.push(
        index
      );


      deferredSections.push({
        heading:
          section.heading,

        sourceDeferredHeading:
          section.heading,

        summary:
          `Deferred because required claim${missing.length === 1 ? "" : "s"} lack SUPPORTS + VERIFIED_EXCERPT publication authority: ${missing.join(", ")}.`,

        reason:
          "MISSING_PUBLICATION_GRADE_EVIDENCE",
      });
    }
  );


  return {
    deferredIndexes:
      Object.freeze([
        ...deferredIndexes,
      ]),

    deferredSections:
      Object.freeze([
        ...deferredSections,
      ]),
  };
}
