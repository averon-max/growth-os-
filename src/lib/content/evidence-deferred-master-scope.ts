export interface EvidenceDeferredOutlineSectionV1 {
  heading:
    string;

  summary?:
    string | null;
}


export interface EvidenceDeferredMasterBlueprintV1 {
  heading:
    string;

  requiredClaims?:
    readonly string[];

  evidenceIds?:
    readonly string[];
}


export interface EvidenceDeferredMasterSectionV1 {
  heading:
    string;

  sourceDeferredHeading:
    string;

  summary:
    string | null;

  reason:
    "MISSING_PUBLICATION_GRADE_EVIDENCE";
}


export interface EvidenceDeferredMasterScopeV1 {
  version:
    "EVIDENCE_DEFERRED_MASTER_SCOPE_V1";

  deferredIndexes:
    readonly number[];

  deferredSections:
    readonly Readonly<
      EvidenceDeferredMasterSectionV1
    >[];
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "which",
    "with",
    "your",
  ]);


function normalizeToken(
  token:
    string
): string {
  if (
    token.length >
      4 &&
    token.endsWith(
      "s"
    ) &&
    !token.endsWith(
      "ss"
    )
  ) {
    return token.slice(
      0,
      -1
    );
  }

  return token;
}


function planningTerms(
  value:
    string
): readonly string[] {
  return Array.from(
    new Set(
      (
        value
          .toLowerCase()
          .replace(
            /\bvs\.?\b/g,
            "versus"
          )
          .match(
            /[a-z0-9]+/g
          ) ??
        []
      )
        .map(
          normalizeToken
        )
        .filter(
          (
            token
          ) =>
            token.length >=
              2 &&
            !STOP_WORDS.has(
              token
            )
        )
    )
  );
}


export function evidenceDeferredHeadingAffinityV1(
  left:
    string,
  right:
    string
): number {
  const leftTerms =
    planningTerms(
      left
    );

  const rightTerms =
    planningTerms(
      right
    );

  if (
    leftTerms.length ===
      0 ||
    rightTerms.length ===
      0
  ) {
    return 0;
  }


  const rightSet =
    new Set(
      rightTerms
    );


  const intersection =
    leftTerms.filter(
      (
        token
      ) =>
        rightSet.has(
          token
        )
    ).length;


  return (
    intersection /
    Math.min(
      leftTerms.length,
      rightTerms.length
    )
  );
}


export function resolveEvidenceDeferredMasterScopeV1({
  blueprints,
  deferredSections,
}: {
  blueprints:
    readonly Readonly<
      EvidenceDeferredMasterBlueprintV1
    >[];

  deferredSections:
    readonly Readonly<
      EvidenceDeferredOutlineSectionV1
    >[];
}): Readonly<
  EvidenceDeferredMasterScopeV1
> {
  const deferredIndexes:
    number[] =
      [];

  const matchedSections:
    EvidenceDeferredMasterSectionV1[] =
      [];


  blueprints.forEach(
    (
      blueprint,
      index
    ) => {
      /*
       * CRITICAL:
       *
       * A Master section that already owns an approved claim or
       * assigned evidence remains in production even if a legacy
       * outline planner deferred a similarly-named topic.
       *
       * The bridge is allowed to remove only a section with ZERO
       * publication authority.
       */
      if (
        (
          blueprint
            .requiredClaims
            ?.length ??
          0
        ) >
          0 ||
        (
          blueprint
            .evidenceIds
            ?.length ??
          0
        ) >
          0
      ) {
        return;
      }


      let best:
        Readonly<
          EvidenceDeferredOutlineSectionV1
        > |
        null =
          null;

      let bestAffinity =
        0;


      for (
        const deferred
        of deferredSections
      ) {
        const affinity =
          evidenceDeferredHeadingAffinityV1(
            blueprint.heading,
            deferred.heading
          );

        if (
          affinity >
          bestAffinity
        ) {
          best =
            deferred;

          bestAffinity =
            affinity;
        }
      }


      /*
       * This is only an identity bridge between two plans.
       * It does NOT independently decide whether evidence is needed.
       *
       * 0.60 requires most terms in the shorter heading to agree
       * while still tolerating:
       *
       *   vs <-> versus
       *   service <-> services
       *   options / wording expansion
       */
      if (
        !best ||
        bestAffinity <
          0.60
      ) {
        return;
      }


      deferredIndexes.push(
        index
      );


      matchedSections.push({
        heading:
          blueprint.heading,

        sourceDeferredHeading:
          best.heading,

        summary:
          typeof best.summary ===
            "string" &&
          best.summary.trim()
            ? best.summary.trim()
            : null,

        reason:
          "MISSING_PUBLICATION_GRADE_EVIDENCE",
      });
    }
  );


  return Object.freeze({
    version:
      "EVIDENCE_DEFERRED_MASTER_SCOPE_V1" as const,

    deferredIndexes:
      Object.freeze([
        ...deferredIndexes,
      ]),

    deferredSections:
      Object.freeze(
        matchedSections.map(
          (
            section
          ) =>
            Object.freeze({
              ...section,
            })
        )
      ),
  });
}
