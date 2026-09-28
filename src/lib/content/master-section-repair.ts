import type {
  MasterArticleCriticFindingV1,
} from "./master-article-critic";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import type {
  SectionClaimReconciliationV1,
} from "./section-claim-reconciliation";

import {
  assertSectionClaimReconciliationPassed,
  reconcileGeneratedSectionClaimsV1,
} from "./section-claim-reconciliation";

import type {
  MasterSectionSemanticVerifier,
  SectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import {
  assertSectionSemanticVerificationPassed,
} from "./master-section-semantic-verifier";

import {
  ContentGenerationError,
} from "./generator";

import {
  deterministicSemanticDeleteRepairV1,
} from "./deterministic-semantic-repair";



export type SectionRepairTriggerV1 =
  | "NONE"
  | "RECONCILIATION"
  | "SEMANTIC";


export interface CompetitiveReplaySectionRepairFindingV2 {
  dimension:
    string;

  competitorUrls:
    readonly string[];

  reasons:
    readonly string[];

  articleEvidenceIds:
    readonly string[];
}


export interface SectionRepairInputV1 {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  reconciliation:
    Readonly<SectionClaimReconciliationV1>;

  semanticVerification:
    Readonly<SectionSemanticVerificationV1> |
    null;

  attempt:
    1;

  /*
   * Optional final-article critic findings.
   *
   * 9I-F leaves this empty because its trigger is local
   * reconciliation / semantic verification.
   *
   * 9J-E supplies only deterministic, validated,
   * section-scoped critic findings.
   */
  criticFindings?:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];

  /*
   * Competitive SERP Replay V2.
   *
   * These are localized repair instructions only.
   * They are NOT factual authority and cannot expand the
   * section's claim/evidence allowlist.
   */
  competitiveReplayFindings?:
    readonly Readonly<
      CompetitiveReplaySectionRepairFindingV2
    >[];
}


export interface MasterSectionRepairGenerator {
  readonly modelName:
    string;

  repairSection(
    input:
      Readonly<SectionRepairInputV1>
  ):
    Promise<
      Readonly<GeneratedSectionV1>
    >;
}


export interface SectionRepairAuditV1 {
  version:
    "SECTION_REPAIR_AUDIT_V1";

  attempted:
    boolean;

  /*
   * REPAIR_AUDIT_ATTEMPT_COUNT_V2
   *
   * Maximum possible work:
   * 1 structured reconciliation repair
   * + 4 deterministic semantic cleanup passes.
   */
  attemptCount:
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5;

  trigger:
    SectionRepairTriggerV1;

  sectionIndex:
    number;

  sectionNumber:
    number;

  modelName:
    string | null;

  initialReconciliationStatus:
    SectionClaimReconciliationV1["status"];

  initialSemanticStatus:
    SectionSemanticVerificationV1["status"] |
    null;

  finalReconciliationStatus:
    SectionClaimReconciliationV1["status"];

  finalSemanticStatus:
    SectionSemanticVerificationV1["status"];
}


export interface VerifiedMasterSectionV1 {
  section:
    Readonly<GeneratedSectionV1>;

  reconciliation:
    Readonly<SectionClaimReconciliationV1>;

  semanticVerification:
    Readonly<SectionSemanticVerificationV1>;

  repair:
    Readonly<SectionRepairAuditV1>;
}


export type MasterSectionVerificationGenerator =
  MasterSectionSemanticVerifier &
  MasterSectionRepairGenerator;


function failureMessage(
  error:
    unknown
): string {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return String(
    error
  );
}


function assertSectionIdentity({
  contract,
  section,
  modelName,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  modelName:
    string;
}): void {
  if (
    section.version !==
    "GENERATED_SECTION_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_INVALID_GENERATED_SECTION_VERSION"
    );
  }

  if (
    section.heading !==
    contract.blueprint.heading
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_HEADING_CHANGED"
    );
  }

  if (
    section.provenance
      .sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_CONTRACT_PROVENANCE_INVALID"
    );
  }

  if (
    section.provenance
      .sectionIndex !==
    contract.sectionIndex
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_INDEX_PROVENANCE_INVALID"
    );
  }

  if (
    section.provenance
      .sectionNumber !==
    contract.sectionNumber
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_NUMBER_PROVENANCE_INVALID"
    );
  }

  if (
    section.provenance
      .totalSections !==
    contract.totalSections
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_TOTAL_PROVENANCE_INVALID"
    );
  }

  if (
    section.provenance
      .modelName !==
    modelName
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_MODEL_PROVENANCE_INVALID"
    );
  }
}


function assertSemanticIdentity({
  contract,
  verification,
  modelName,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  verification:
    Readonly<SectionSemanticVerificationV1>;

  modelName:
    string;
}): void {
  if (
    verification.version !==
    "SECTION_SEMANTIC_VERIFICATION_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_VERSION_INVALID"
    );
  }

  if (
    verification.sectionIndex !==
    contract.sectionIndex
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_INDEX_INVALID"
    );
  }

  if (
    verification.sectionNumber !==
    contract.sectionNumber
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_NUMBER_INVALID"
    );
  }

  if (
    verification.provenance
      .sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_CONTRACT_PROVENANCE_INVALID"
    );
  }

  if (
    verification.provenance
      .generatedSectionVersion !==
    "GENERATED_SECTION_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_SECTION_PROVENANCE_INVALID"
    );
  }

  if (
    verification.provenance
      .modelName !==
    modelName
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_MODEL_PROVENANCE_INVALID"
    );
  }
}


async function semanticVerify({
  contract,
  section,
  generator,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  generator:
    Readonly<MasterSectionVerificationGenerator>;
}): Promise<
  Readonly<SectionSemanticVerificationV1>
> {
  const verification =
    await generator
      .verifySectionClaims({
        contract,
        section,
      });

  assertSemanticIdentity({
    contract,
    verification,
    modelName:
      generator.modelName,
  });

  return verification;
}


function reconciliationFor({
  contract,
  section,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;
}): Readonly<
  SectionClaimReconciliationV1
> {
  return reconcileGeneratedSectionClaimsV1({
    contract,
    section,
  });
}


function freezeAudit(
  audit:
    SectionRepairAuditV1
): Readonly<
  SectionRepairAuditV1
> {
  return Object.freeze({
    ...audit,
  });
}


export async function verifyAndRepairGeneratedSectionV1({
  contract,
  section,
  generator,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  generator:
    Readonly<MasterSectionVerificationGenerator>;
}): Promise<
  Readonly<VerifiedMasterSectionV1>
> {
  assertSectionIdentity({
    contract,
    section,
    modelName:
      generator.modelName,
  });


  // ========================================================
  // INITIAL DETERMINISTIC RECONCILIATION
  // ========================================================

  const initialReconciliation =
    reconciliationFor({
      contract,
      section,
    });


  let initialSemantic:
    Readonly<
      SectionSemanticVerificationV1
    > |
    null =
      null;


  if (
    initialReconciliation
      .status !==
    "BLOCK"
  ) {
    try {
      initialSemantic =
        await semanticVerify({
          contract,
          section,
          generator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_SEMANTIC_VERIFICATION_FAILED",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }
  }


  const trigger:
    SectionRepairTriggerV1 =
      initialReconciliation
        .status ===
      "BLOCK"
        ? "RECONCILIATION"
        : initialSemantic
            ?.status ===
          "BLOCK"
          ? "SEMANTIC"
          : "NONE";


  // ========================================================
  // CLEAN SECTION — NO REPAIR
  // ========================================================

  if (
    trigger ===
    "NONE"
  ) {
    if (!initialSemantic) {
      throw new ContentGenerationError(
        "SECTION_REPAIR_INTERNAL_SEMANTIC_RESULT_MISSING"
      );
    }

    return Object.freeze({
      section,

      reconciliation:
        initialReconciliation,

      semanticVerification:
        initialSemantic,

      repair:
        freezeAudit({
          version:
            "SECTION_REPAIR_AUDIT_V1",

          attempted:
            false,

          attemptCount:
            0,

          trigger:
            "NONE",

          sectionIndex:
            contract.sectionIndex,

          sectionNumber:
            contract.sectionNumber,

          modelName:
            null,

          initialReconciliationStatus:
            initialReconciliation
              .status,

          initialSemanticStatus:
            initialSemantic
              .status,

          finalReconciliationStatus:
            initialReconciliation
              .status,

          finalSemanticStatus:
            initialSemantic
              .status,
        }),
    });
  }


  // ========================================================
  // BOUNDED REPAIR + DETERMINISTIC SEMANTIC CONVERGENCE V2
  // ========================================================
  //
  // Reconciliation:
  //   max ONE structured/model repair.
  //
  // Semantic BLOCK:
  //   exact deterministic deletion only.
  //   Reverify and repeat up to four bounded passes.
  //
  // No LLM is allowed to rewrite verifier-identified
  // unsupported factual prose.
  //
  // Every pass still runs:
  //   identity
  //   reconciliation
  //   semantic verification
  //
  // Fail closed on:
  //   no progress
  //   required-claim loss
  //   reconciliation regression
  //   verifier failure
  //   remaining BLOCK after the bounded passes.
  // ========================================================

  let repaired:
    Readonly<GeneratedSectionV1> =
      section;


  let deterministicSemanticRepairUsed =
    false;


  let modelRepairUsed =
    false;


  let repairAttemptCount =
    0;


  let finalReconciliation =
    initialReconciliation;


  let finalSemantic =
    initialSemantic;


  /*
   * Reconciliation failures retain the existing ONE bounded
   * structured repair.
   */
  if (
    trigger ===
      "RECONCILIATION"
  ) {
    try {
      repaired =
        await generator
          .repairSection({
            contract,

            section,

            reconciliation:
              initialReconciliation,

            semanticVerification:
              initialSemantic,

            attempt:
              1,
          });

      modelRepairUsed =
        true;

      repairAttemptCount +=
        1;
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_FAILED",
          trigger,
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    assertSectionIdentity({
      contract,

      section:
        repaired,

      modelName:
        generator.modelName,
    });


    finalReconciliation =
      reconciliationFor({
        contract,

        section:
          repaired,
      });


    try {
      assertSectionClaimReconciliationPassed(
        finalReconciliation
      );
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "RECONCILIATION",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    try {
      finalSemantic =
        await semanticVerify({
          contract,

          section:
            repaired,

          generator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "SEMANTIC",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }
  }


  /*
   * SEMANTIC_REPAIR_DETERMINISTIC_CONVERGENCE_V2
   *
   * Compatibility invariant: SEMANTIC_REPAIR_DETERMINISTIC_V1
   * remains deterministic; V2 only adds bounded convergence.
   *
   * One deterministic pass may expose another unsupported
   * semantic unit after Markdown/sentence normalization and
   * re-numbering.
   *
   * Iterate without writer regeneration until PASS or until
   * the strict bounded limit is reached.
   */
  if (
    finalSemantic?.status ===
      "BLOCK"
  ) {
    const MAX_DETERMINISTIC_SEMANTIC_PASSES =
      4;


    for (
      let semanticPass =
        1;
      semanticPass <=
        MAX_DETERMINISTIC_SEMANTIC_PASSES;
      semanticPass +=
        1
    ) {
      const beforeBody =
        repaired.bodyMarkdown;


      try {
        const nextSection =
          deterministicSemanticDeleteRepairV1({
            contract,

            section:
              repaired,

            verification:
              finalSemantic,
          });


        if (
          nextSection
            .bodyMarkdown ===
          beforeBody
        ) {
          throw new ContentGenerationError(
            "SECTION_DETERMINISTIC_SEMANTIC_NO_PROGRESS"
          );
        }


        repaired =
          nextSection;

        deterministicSemanticRepairUsed =
          true;

        repairAttemptCount +=
          1;
      } catch (
        error
      ) {
        const semanticRepairFailure =
          failureMessage(
            error
          );


        /*
         * SEMANTIC_REPAIR_FAILURE_CLASSIFICATION_V2
         *
         * An emptied section means the deterministic operation itself
         * could not produce a usable section => FAILED.
         *
         * Other fail-closed semantic conditions mean the bounded repair
         * path cannot safely satisfy the contract => EXHAUSTED.
         */
        const semanticRepairFailureCode =
          semanticRepairFailure.includes(
            "SECTION_DETERMINISTIC_SEMANTIC_REPAIR_EMPTIED_SECTION"
          )
            ? "SECTION_TARGETED_REPAIR_FAILED"
            : "SECTION_TARGETED_REPAIR_EXHAUSTED";


        throw new ContentGenerationError(
          [
            semanticRepairFailureCode,
            "SEMANTIC",
            semanticRepairFailure,
          ].join(
            ":"
          )
        );
      }


      assertSectionIdentity({
        contract,

        section:
          repaired,

        modelName:
          generator.modelName,
      });


      finalReconciliation =
        reconciliationFor({
          contract,

          section:
            repaired,
        });


      try {
        assertSectionClaimReconciliationPassed(
          finalReconciliation
        );
      } catch (
        error
      ) {
        throw new ContentGenerationError(
          [
            "SECTION_TARGETED_REPAIR_EXHAUSTED",
            "RECONCILIATION",
            failureMessage(
              error
            ),
          ].join(
            ":"
          )
        );
      }


      try {
        finalSemantic =
          await semanticVerify({
            contract,

            section:
              repaired,

            generator,
          });
      } catch (
        error
      ) {
        throw new ContentGenerationError(
          [
            "SECTION_TARGETED_REPAIR_EXHAUSTED",
            "SEMANTIC",
            failureMessage(
              error
            ),
          ].join(
            ":"
          )
        );
      }


      if (
        finalSemantic.status ===
          "PASS"
      ) {
        break;
      }
    }
  }


  if (!finalSemantic) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_INTERNAL_SEMANTIC_RESULT_MISSING"
    );
  }


  try {
    assertSectionSemanticVerificationPassed(
      finalSemantic
    );
  } catch (
    error
  ) {
    throw new ContentGenerationError(
      [
        "SECTION_TARGETED_REPAIR_EXHAUSTED",
        "SEMANTIC",
        failureMessage(
          error
        ),
      ].join(
        ":"
      )
    );
  }


  /*
   * REPAIR_AUDIT_ATTEMPT_COUNT_RUNTIME_BOUND_V2
   *
   * Keep telemetry honest even if the repair algorithm changes later.
   */
  if (
    !Number.isInteger(
      repairAttemptCount
    ) ||
    repairAttemptCount <
      0 ||
    repairAttemptCount >
      5
  ) {
    throw new ContentGenerationError(
      `SECTION_REPAIR_AUDIT_ATTEMPT_COUNT_INVALID:${repairAttemptCount}`
    );
  }


  const boundedRepairAttemptCount =
    repairAttemptCount as
      SectionRepairAuditV1["attemptCount"];


  return Object.freeze({
    section:
      repaired,

    reconciliation:
      finalReconciliation,

    semanticVerification:
      finalSemantic,

    repair:
      freezeAudit({
        version:
          "SECTION_REPAIR_AUDIT_V1",

        attempted:
          true,

        attemptCount:
          boundedRepairAttemptCount,

        trigger,

        sectionIndex:
          contract.sectionIndex,

        sectionNumber:
          contract.sectionNumber,

        modelName:
          modelRepairUsed
            ? generator.modelName
            : null,

        initialReconciliationStatus:
          initialReconciliation
            .status,

        initialSemanticStatus:
          initialSemantic
            ?.status ??
          null,

        finalReconciliationStatus:
          finalReconciliation
            .status,

        finalSemanticStatus:
          finalSemantic
            .status,
      }),
  });
}


export function supportsMasterSectionRepairGenerator(
  value:
    unknown
): value is MasterSectionRepairGenerator {
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
        MasterSectionRepairGenerator
      >;

  return (
    typeof candidate.modelName ===
      "string" &&
    candidate.modelName
      .trim()
      .length >
      0 &&
    typeof candidate
      .repairSection ===
      "function"
  );
}
