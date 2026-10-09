import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  ContentGenerationError,
} from "./generator";


export type SectionSemanticClassificationV1 =
  | "NOT_A_FACT"
  | "SUPPORTED"
  | "NARROWER"
  | "UNSUPPORTED"
  | "CONTRADICTED";


export type SectionSemanticVerificationStatusV1 =
  | "PASS"
  | "WARN"
  | "BLOCK";


export interface SectionSemanticProseUnitV1 {
  id:
    string;

  ordinal:
    number;

  text:
    string;
}


export interface SectionSemanticUnitCandidateV1 {
  unitId:
    string;

  classification:
    SectionSemanticClassificationV1;

  matchedClaimId:
    string | null;

  evidenceIds:
    string[];

  rationale:
    string;
}


export interface SectionSemanticVerificationCandidateV1 {
  units:
    SectionSemanticUnitCandidateV1[];
}


export interface SectionSemanticUnitResultV1 {
  unitId:
    string;

  ordinal:
    number;

  text:
    string;

  classification:
    SectionSemanticClassificationV1;

  matchedClaimId:
    string | null;

  evidenceIds:
    readonly string[];

  rationale:
    string;
}


export interface SectionSemanticVerificationV1 {
  version:
    "SECTION_SEMANTIC_VERIFICATION_V1";

  status:
    SectionSemanticVerificationStatusV1;

  sectionIndex:
    number;

  sectionNumber:
    number;

  unitCount:
    number;

  units:
    readonly Readonly<
      SectionSemanticUnitResultV1
    >[];

  counts:
    Readonly<{
      notAFact:
        number;

      supported:
        number;

      narrower:
        number;

      unsupported:
        number;

      contradicted:
        number;
  }>;

  provenance:
    Readonly<{
      sourceContractVersion:
        "SECTION_GENERATION_CONTRACT_V1";

      generatedSectionVersion:
        "GENERATED_SECTION_V1";

      modelName:
        string;
    }>;
}


export interface MasterSectionSemanticVerifier {
  readonly modelName:
    string;

  verifySectionClaims(
    input: {
      contract:
        Readonly<SectionGenerationContractV1>;

      section:
        Readonly<GeneratedSectionV1>;
    }
  ):
    Promise<
      Readonly<SectionSemanticVerificationV1>
    >;
}


function cleanMarkdownLine(
  value:
    string
): string {
  return value
    .replace(
      /^\s{0,3}#{1,6}\s+/,
      ""
    )
    .replace(
      /^\s*(?:[-*+]|\d+[.)])\s+/,
      ""
    )
    .replace(
      /!\[([^\]]*)\]\([^)]+\)/g,
      "$1"
    )
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    )
    .replace(
      /[*_~`]+/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function sentenceUnits(
  text:
    string
): string[] {
  const matches =
    text.match(
      /[^.!?]+(?:[.!?]+|$)/g
    );

  if (!matches) {
    return [];
  }

  return matches
    .map(
      (item) =>
        item.trim()
    )
    .filter(
      Boolean
    );
}


export function extractSectionSemanticProseUnitsV1({
  sectionIndex,
  bodyMarkdown,
}: {
  sectionIndex:
    number;

  bodyMarkdown:
    string;
}): readonly Readonly<
  SectionSemanticProseUnitV1
>[] {
  const units:
    SectionSemanticProseUnitV1[] =
      [];

  let inFence =
    false;

  const lines =
    bodyMarkdown.split(
      /\r?\n/
    );

  for (
    const rawLine
    of lines
  ) {
    const trimmed =
      rawLine.trim();

    if (
      trimmed.startsWith(
        "```"
      ) ||
      trimmed.startsWith(
        "~~~"
      )
    ) {
      inFence =
        !inFence;

      continue;
    }

    if (
      inFence ||
      !trimmed
    ) {
      continue;
    }

    const cleaned =
      cleanMarkdownLine(
        trimmed
      );

    if (!cleaned) {
      continue;
    }

    for (
      const sentence
      of sentenceUnits(
        cleaned
      )
    ) {
      const ordinal =
        units.length;

      units.push({
        id:
          `section-${sectionIndex}-unit-${ordinal}`,

        ordinal,

        text:
          sentence,
      });
    }
  }


  if (
    units.length ===
    0
  ) {
    throw new ContentGenerationError(
      "SECTION_SEMANTIC_NO_PROSE_UNITS"
    );
  }


  return Object.freeze(
    units.map(
      (unit) =>
        Object.freeze({
          ...unit,
        })
    )
  );
}


function record(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<
      string,
      unknown
    >;
}


function nonEmpty(
  value:
    unknown,
  code:
    string
): string {
  if (
    typeof value !==
    "string" ||
    !value.trim()
  ) {
    throw new ContentGenerationError(
      code
    );
  }

  return value.trim();
}


function stringArray(
  value:
    unknown,
  code:
    string
): string[] {
  if (
    !Array.isArray(
      value
    ) ||
    value.some(
      (item) =>
        typeof item !==
        "string"
    )
  ) {
    throw new ContentGenerationError(
      code
    );
  }

  return Array.from(
    new Set(
      value.map(
        (item) =>
          (
            item as string
          ).trim()
      )
      .filter(
        Boolean
      )
    )
  );
}


function semanticClassification(
  value:
    unknown
): SectionSemanticClassificationV1 {
  if (
    value ===
      "NOT_A_FACT" ||
    value ===
      "SUPPORTED" ||
    value ===
      "NARROWER" ||
    value ===
      "UNSUPPORTED" ||
    value ===
      "CONTRADICTED"
  ) {
    return value;
  }

  throw new ContentGenerationError(
    "SECTION_SEMANTIC_INVALID_CLASSIFICATION"
  );
}


function allowedClaimIds(
  contract:
    Readonly<SectionGenerationContractV1>
): Set<string> {
  return new Set([
    ...(
      contract.blueprint
        .requiredClaims ??
      []
    ),

    ...(
      contract.blueprint
        .forbiddenClaims ??
      []
    ),
  ]);
}


function validPublicationEvidence({
  contract,
  claimId,
  evidenceIds,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  claimId:
    string;

  evidenceIds:
    readonly string[];
}): boolean {
  if (
    evidenceIds.length ===
    0
  ) {
    return false;
  }

  const assigned =
    new Set(
      contract.blueprint
        .evidenceIds ??
      []
    );

  const graph =
    new Map(
      contract.evidenceGraph
        .claimEvidence
        .map(
          (item) =>
            [
              item.id,
              item,
            ] as const
        )
    );

  return evidenceIds.some(
    (evidenceId) => {
      if (
        !assigned.has(
          evidenceId
        )
      ) {
        return false;
      }

      const evidence =
        graph.get(
          evidenceId
        );

      return Boolean(
        evidence &&
        evidence.claimId ===
          claimId &&
        evidence.relation ===
          "SUPPORTS" &&
        evidence.kind ===
          "VERIFIED_EXCERPT" &&
        typeof evidence.excerpt ===
          "string" &&
        evidence.excerpt
          .trim()
          .length >
          0
      );
    }
  );
}


function assertEvidenceIdentity({
  contract,
  classification,
  matchedClaimId,
  evidenceIds,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  classification:
    SectionSemanticClassificationV1;

  matchedClaimId:
    string | null;

  evidenceIds:
    readonly string[];
}): void {
  const assigned =
    new Set(
      contract.blueprint
        .evidenceIds ??
      []
    );

  const evidenceMap =
    new Map(
      contract.evidenceGraph
        .claimEvidence
        .map(
          (item) =>
            [
              item.id,
              item,
            ] as const
        )
    );

  /*
   * MULTI_CLAIM_PROSE_EVIDENCE_V1
   *
   * A semantic prose unit may contain more than one material
   * assertion when all assertions belong to approved required
   * claims of THIS section.
   *
   * matchedClaimId remains the primary claim selected by the
   * verifier.
   *
   * Additional evidence is allowed only when its claim:
   * - is another required claim of this same section
   * - is VERIFIED
   * - is backed by SUPPORTS + VERIFIED_EXCERPT
   *
   * This does NOT permit evidence from unrelated, forbidden,
   * unsupported, stale, or outside-section claims.
   *
   * The primary matched claim must still independently satisfy
   * validPublicationEvidence() later in the finalizer.
   */
  const requiredClaimIds =
    new Set(
      contract.blueprint
        .requiredClaims ??
      []
    );

  const claimMap =
    new Map(
      contract.claimLedger
        .claims
        .map(
          (claim) =>
            [
              claim.id,
              claim,
            ] as const
        )
    );

  for (
    const evidenceId
    of evidenceIds
  ) {
    if (
      !assigned.has(
        evidenceId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_EVIDENCE_OUTSIDE_SECTION:${evidenceId}`
      );
    }

    const evidence =
      evidenceMap.get(
        evidenceId
      );

    if (!evidence) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_EVIDENCE_NOT_FOUND:${evidenceId}`
      );
    }

    if (
      matchedClaimId &&
      evidence.claimId !==
        matchedClaimId
    ) {
      const additionalClaim =
        claimMap.get(
          evidence.claimId
        );

      const validAdditionalRequiredClaimEvidence =
        (
          classification ===
            "SUPPORTED" ||
          classification ===
            "NARROWER"
        ) &&
        requiredClaimIds.has(
          evidence.claimId
        ) &&
        Boolean(
          additionalClaim &&
          additionalClaim.status ===
            "VERIFIED"
        ) &&
        evidence.relation ===
          "SUPPORTS" &&
        evidence.kind ===
          "VERIFIED_EXCERPT" &&
        typeof evidence.excerpt ===
          "string" &&
        evidence.excerpt
          .trim()
          .length >
          0;

      if (
        !validAdditionalRequiredClaimEvidence
      ) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_EVIDENCE_CLAIM_MISMATCH:${evidenceId}`
        );
      }
    }
  }
}


export function finalizeSectionSemanticVerificationV1({
  contract,
  section,
  modelName,
  candidate,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  modelName:
    string;

  candidate:
    unknown;
}): Readonly<
  SectionSemanticVerificationV1
> {
  const cleanModelName =
    modelName.trim();

  if (!cleanModelName) {
    throw new ContentGenerationError(
      "SECTION_SEMANTIC_MODEL_REQUIRED"
    );
  }


  if (
    section.provenance
      .sectionIndex !==
    contract.sectionIndex
  ) {
    throw new ContentGenerationError(
      "SECTION_SEMANTIC_SECTION_CONTRACT_MISMATCH"
    );
  }


  const proseUnits =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        contract.sectionIndex,

      bodyMarkdown:
        section.bodyMarkdown,
    });


  const raw =
    record(
      candidate
    );

  if (
    !raw ||
    !Array.isArray(
      raw.units
    )
  ) {
    throw new ContentGenerationError(
      "SECTION_SEMANTIC_INVALID_RESPONSE"
    );
  }


  if (
    raw.units.length !==
    proseUnits.length
  ) {
    throw new ContentGenerationError(
      "SECTION_SEMANTIC_UNIT_COUNT_MISMATCH"
    );
  }


  const expectedUnits =
    new Map(
      proseUnits.map(
        (unit) =>
          [
            unit.id,
            unit,
          ] as const
      )
    );

  const seen =
    new Set<string>();

  const claimIds =
    allowedClaimIds(
      contract
    );

  const ledger =
    new Map(
      contract.claimLedger
        .claims
        .map(
          (claim) =>
            [
              claim.id,
              claim,
            ] as const
        )
    );

  const results:
    SectionSemanticUnitResultV1[] =
      [];


  for (
    const rawItem
    of raw.units
  ) {
    const item =
      record(
        rawItem
      );

    if (!item) {
      throw new ContentGenerationError(
        "SECTION_SEMANTIC_INVALID_UNIT"
      );
    }


    const unitId =
      nonEmpty(
        item.unitId,
        "SECTION_SEMANTIC_UNIT_ID_REQUIRED"
      );

    if (
      seen.has(
        unitId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_DUPLICATE_UNIT:${unitId}`
      );
    }

    seen.add(
      unitId
    );


    const sourceUnit =
      expectedUnits.get(
        unitId
      );

    if (!sourceUnit) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_UNKNOWN_UNIT:${unitId}`
      );
    }


    const classification =
      semanticClassification(
        item.classification
      );


    const matchedClaimId =
      item.matchedClaimId ===
        null
        ? null
        : nonEmpty(
            item.matchedClaimId,
            "SECTION_SEMANTIC_MATCHED_CLAIM_INVALID"
          );


    const evidenceIds =
      stringArray(
        item.evidenceIds,
        "SECTION_SEMANTIC_EVIDENCE_IDS_INVALID"
      );


    const rationale =
      nonEmpty(
        item.rationale,
        "SECTION_SEMANTIC_RATIONALE_REQUIRED"
      );


    if (
      matchedClaimId &&
      !claimIds.has(
        matchedClaimId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_CLAIM_OUTSIDE_SECTION:${matchedClaimId}`
      );
    }


    if (
      matchedClaimId &&
      !ledger.has(
        matchedClaimId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_CLAIM_NOT_FOUND:${matchedClaimId}`
      );
    }


    assertEvidenceIdentity({
      contract,
      classification,
      matchedClaimId,
      evidenceIds,
    });


    if (
      classification ===
      "NOT_A_FACT"
    ) {
      if (
        matchedClaimId !==
          null ||
        evidenceIds.length >
          0
      ) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_NOT_A_FACT_HAS_PROVENANCE:${unitId}`
        );
      }
    }


    if (
      classification ===
        "SUPPORTED" ||
      classification ===
        "NARROWER"
    ) {
      if (!matchedClaimId) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_SUPPORTED_CLAIM_REQUIRED:${unitId}`
        );
      }

      if (
        (
          contract.blueprint
            .forbiddenClaims ??
          []
        ).includes(
          matchedClaimId
        )
      ) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_FORBIDDEN_CLAIM_CANNOT_SUPPORT:${matchedClaimId}`
        );
      }


      const claim =
        ledger.get(
          matchedClaimId
        );

      if (!claim) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_CLAIM_NOT_FOUND:${matchedClaimId}`
        );
      }


      if (
        claim.status ===
          "CONTRADICTED" ||
        (
          claim.status ===
            "UNSUPPORTED" &&
          claim.risk ===
            "HIGH"
        ) ||
        (
          claim.status ===
            "STALE" &&
          (
            claim.category ===
              "FINANCIAL" ||
            claim.category ===
              "LEGAL"
          )
        ) ||
        claim.status ===
          "JURISDICTION_MISMATCH"
      ) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_BLOCKED_CLAIM_STATUS:${matchedClaimId}:${claim.status}`
        );
      }


      if (
        !validPublicationEvidence({
          contract,
          claimId:
            matchedClaimId,
          evidenceIds,
        })
      ) {
        throw new ContentGenerationError(
          `SECTION_SEMANTIC_PUBLICATION_EVIDENCE_REQUIRED:${unitId}`
        );
      }
    }


    if (
      classification ===
        "CONTRADICTED" &&
      matchedClaimId ===
        null
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_CONTRADICTED_CLAIM_REQUIRED:${unitId}`
      );
    }


    results.push({
      unitId,

      ordinal:
        sourceUnit.ordinal,

      text:
        sourceUnit.text,

      classification,

      matchedClaimId,

      evidenceIds:
        Object.freeze([
          ...evidenceIds,
        ]),

      rationale,
    });
  }


  for (
    const unit
    of proseUnits
  ) {
    if (
      !seen.has(
        unit.id
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_SEMANTIC_MISSING_UNIT:${unit.id}`
      );
    }
  }


  results.sort(
    (
      left,
      right
    ) =>
      left.ordinal -
      right.ordinal
  );


  const counts = {
    notAFact:
      results.filter(
        (item) =>
          item.classification ===
          "NOT_A_FACT"
      ).length,

    supported:
      results.filter(
        (item) =>
          item.classification ===
          "SUPPORTED"
      ).length,

    narrower:
      results.filter(
        (item) =>
          item.classification ===
          "NARROWER"
      ).length,

    unsupported:
      results.filter(
        (item) =>
          item.classification ===
          "UNSUPPORTED"
      ).length,

    contradicted:
      results.filter(
        (item) =>
          item.classification ===
          "CONTRADICTED"
      ).length,
  };


  const status:
    SectionSemanticVerificationStatusV1 =
      counts.unsupported >
        0 ||
      counts.contradicted >
        0
        ? "BLOCK"
        : counts.narrower >
            0
          ? "WARN"
          : "PASS";


  const frozenUnits =
    Object.freeze(
      results.map(
        (item) =>
          Object.freeze({
            ...item,

            evidenceIds:
              Object.freeze([
                ...item
                  .evidenceIds,
              ]),
          })
      )
    );


  return Object.freeze({
    version:
      "SECTION_SEMANTIC_VERIFICATION_V1" as const,

    status,

    sectionIndex:
      contract.sectionIndex,

    sectionNumber:
      contract.sectionNumber,

    unitCount:
      frozenUnits.length,

    units:
      frozenUnits,

    counts:
      Object.freeze(
        counts
      ),

    provenance:
      Object.freeze({
        sourceContractVersion:
          "SECTION_GENERATION_CONTRACT_V1" as const,

        generatedSectionVersion:
          "GENERATED_SECTION_V1" as const,

        modelName:
          cleanModelName,
      }),
  });
}


export function assertSectionSemanticVerificationPassed(
  result:
    Readonly<SectionSemanticVerificationV1>
): void {
  if (
    result.status !==
    "BLOCK"
  ) {
    return;
  }

  const blocked =
    result.units
      .filter(
        (item) =>
          item.classification ===
            "UNSUPPORTED" ||
          item.classification ===
            "CONTRADICTED"
      )
      .map(
        (item) =>
          `${item.unitId}:${item.classification}`
      );

  throw new ContentGenerationError(
    [
      "SECTION_SEMANTIC_VERIFICATION_BLOCKED",
      ...blocked,
    ].join(
      ":"
    )
  );
}


export function supportsMasterSectionSemanticVerifier(
  value:
    unknown
): value is MasterSectionSemanticVerifier {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return false;
  }

  const candidate =
    value as
      Partial<
        MasterSectionSemanticVerifier
      >;

  return (
    typeof candidate.modelName ===
      "string" &&
    candidate.modelName.trim()
      .length >
      0 &&
    typeof candidate
      .verifySectionClaims ===
      "function"
  );
}
