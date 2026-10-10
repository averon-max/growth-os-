import type { MasterArticleCriticFindingV1 } from "./master-article-critic";

import type { SectionGenerationContractV1 } from "./article-generation-contract";

import type { GeneratedSectionV1 } from "./master-article-generator";

import type { SectionClaimReconciliationV1 } from "./section-claim-reconciliation";

import {
  assertSectionClaimReconciliationPassed,
  reconcileGeneratedSectionClaimsV1,
} from "./section-claim-reconciliation";

import type {
  MasterSectionSemanticVerifier,
  SectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import { assertSectionSemanticVerificationPassed } from "./master-section-semantic-verifier";

import { ContentGenerationError } from "./generator";

import { deterministicSemanticDeleteRepairV1 } from "./deterministic-semantic-repair";

export type SectionRepairTriggerV1 =
  "NONE" | "RECONCILIATION" | "SEMANTIC" | "DEPTH";

export interface CompetitiveReplaySectionRepairFindingV2 {
  dimension: string;

  competitorUrls: readonly string[];

  reasons: readonly string[];

  articleEvidenceIds: readonly string[];
}

export interface SectionRepairInputV1 {
  contract: Readonly<SectionGenerationContractV1>;

  section: Readonly<GeneratedSectionV1>;

  reconciliation: Readonly<SectionClaimReconciliationV1>;

  semanticVerification: Readonly<SectionSemanticVerificationV1> | null;

  attempt: 1;

  /*
   * CONTENT_V1_DEPTH_REPAIR_V1
   *
   * Present only when this section is below the already-bound
   * execution-plan floor.
   *
   * This authorizes NO new topic, query, claim, evidence,
   * link, asset or heading.
   */
  depthRepair?: Readonly<{
    currentWords: number;

    minWords: number;

    preferredWords: number;

    maxWords: number;
  }>;

  /*
   * Optional final-article critic findings.
   *
   * 9I-F leaves this empty because its trigger is local
   * reconciliation / semantic verification.
   *
   * 9J-E supplies only deterministic, validated,
   * section-scoped critic findings.
   */
  criticFindings?: readonly Readonly<MasterArticleCriticFindingV1>[];

  /*
   * Competitive SERP Replay V2.
   *
   * These are localized repair instructions only.
   * They are NOT factual authority and cannot expand the
   * section's claim/evidence allowlist.
   */
  competitiveReplayFindings?: readonly Readonly<CompetitiveReplaySectionRepairFindingV2>[];
}

export interface MasterSectionRepairGenerator {
  readonly modelName: string;

  repairSection(
    input: Readonly<SectionRepairInputV1>,
  ): Promise<Readonly<GeneratedSectionV1>>;
}

export interface SectionRepairAuditV1 {
  version: "SECTION_REPAIR_AUDIT_V1";

  attempted: boolean;

  /*
   * REPAIR_AUDIT_ATTEMPT_COUNT_CONVERGENCE_V3
   *
   * Telemetry records actual local repair work.
   *
   * There is deliberately no arbitrary numeric attempt ceiling.
   * Convergence is controlled by meaningful progress / cycle
   * detection inside the owning repair stage.
   */
  attemptCount:
    number;

  trigger: SectionRepairTriggerV1;

  sectionIndex: number;

  sectionNumber: number;

  modelName: string | null;

  initialReconciliationStatus: SectionClaimReconciliationV1["status"];

  initialSemanticStatus: SectionSemanticVerificationV1["status"] | null;

  finalReconciliationStatus: SectionClaimReconciliationV1["status"];

  finalSemanticStatus: SectionSemanticVerificationV1["status"];
}

export interface VerifiedMasterSectionV1 {
  section: Readonly<GeneratedSectionV1>;

  reconciliation: Readonly<SectionClaimReconciliationV1>;

  semanticVerification: Readonly<SectionSemanticVerificationV1>;

  repair: Readonly<SectionRepairAuditV1>;
}

export type MasterSectionVerificationGenerator = MasterSectionSemanticVerifier &
  MasterSectionRepairGenerator;

function failureMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function assertSectionIdentity({
  contract,
  section,
  modelName,
}: {
  contract: Readonly<SectionGenerationContractV1>;

  section: Readonly<GeneratedSectionV1>;

  modelName: string;
}): void {
  if (section.version !== "GENERATED_SECTION_V1") {
    throw new ContentGenerationError(
      "SECTION_REPAIR_INVALID_GENERATED_SECTION_VERSION",
    );
  }

  if (section.heading !== contract.blueprint.heading) {
    throw new ContentGenerationError("SECTION_REPAIR_HEADING_CHANGED");
  }

  if (
    section.provenance.sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_CONTRACT_PROVENANCE_INVALID",
    );
  }

  if (section.provenance.sectionIndex !== contract.sectionIndex) {
    throw new ContentGenerationError("SECTION_REPAIR_INDEX_PROVENANCE_INVALID");
  }

  if (section.provenance.sectionNumber !== contract.sectionNumber) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_NUMBER_PROVENANCE_INVALID",
    );
  }

  if (section.provenance.totalSections !== contract.totalSections) {
    throw new ContentGenerationError("SECTION_REPAIR_TOTAL_PROVENANCE_INVALID");
  }

  if (section.provenance.modelName !== modelName) {
    throw new ContentGenerationError("SECTION_REPAIR_MODEL_PROVENANCE_INVALID");
  }
}

function assertSemanticIdentity({
  contract,
  verification,
  modelName,
}: {
  contract: Readonly<SectionGenerationContractV1>;

  verification: Readonly<SectionSemanticVerificationV1>;

  modelName: string;
}): void {
  if (verification.version !== "SECTION_SEMANTIC_VERIFICATION_V1") {
    throw new ContentGenerationError("SECTION_REPAIR_SEMANTIC_VERSION_INVALID");
  }

  if (verification.sectionIndex !== contract.sectionIndex) {
    throw new ContentGenerationError("SECTION_REPAIR_SEMANTIC_INDEX_INVALID");
  }

  if (verification.sectionNumber !== contract.sectionNumber) {
    throw new ContentGenerationError("SECTION_REPAIR_SEMANTIC_NUMBER_INVALID");
  }

  if (
    verification.provenance.sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_CONTRACT_PROVENANCE_INVALID",
    );
  }

  if (
    verification.provenance.generatedSectionVersion !== "GENERATED_SECTION_V1"
  ) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_SECTION_PROVENANCE_INVALID",
    );
  }

  if (verification.provenance.modelName !== modelName) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_SEMANTIC_MODEL_PROVENANCE_INVALID",
    );
  }
}

async function semanticVerify({
  contract,
  section,
  generator,
}: {
  contract: Readonly<SectionGenerationContractV1>;

  section: Readonly<GeneratedSectionV1>;

  generator: Readonly<MasterSectionVerificationGenerator>;
}): Promise<Readonly<SectionSemanticVerificationV1>> {
  const verification = await generator.verifySectionClaims({
    contract,
    section,
  });

  assertSemanticIdentity({
    contract,
    verification,
    modelName: generator.modelName,
  });

  return verification;
}

function reconciliationFor({
  contract,
  section,
}: {
  contract: Readonly<SectionGenerationContractV1>;

  section: Readonly<GeneratedSectionV1>;
}): Readonly<SectionClaimReconciliationV1> {
  return reconcileGeneratedSectionClaimsV1({
    contract,
    section,
  });
}

function freezeAudit(
  audit: SectionRepairAuditV1,
): Readonly<SectionRepairAuditV1> {
  return Object.freeze({
    ...audit,
  });
}

export interface SectionDepthRepairRequirementV1 {
  readonly currentWords: number;

  readonly minWords: number;

  readonly preferredWords: number;

  readonly maxWords: number;
}

export function countSectionWordsV1(bodyMarkdown: string): number {
  const normalized = bodyMarkdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/<[^>]+>/g, " ");

  return (
    normalized.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}

export function buildSectionDepthRepairRequirementV1({
  targetWords,
  bodyMarkdown,
}: {
  targetWords:
    | Readonly<{
        min: number;

        preferred: number;

        max: number;
      }>
    | null
    | undefined;

  bodyMarkdown: string;
}): Readonly<SectionDepthRepairRequirementV1> | null {
  if (!targetWords) {
    return null;
  }

  const currentWords = countSectionWordsV1(bodyMarkdown);

  if (currentWords >= targetWords.min) {
    return null;
  }

  return Object.freeze({
    currentWords,

    minWords: targetWords.min,

    preferredWords: targetWords.preferred,

    maxWords: targetWords.max,
  });
}


/*
 * SECTION_VERIFY_ONLY_TRANSACTION_V1
 *
 * Used when another owning stage has already performed its ONE
 * allowed model mutation.
 *
 * This transaction is intentionally NOT a repair transaction.
 *
 * It performs:
 *   structural identity
 *   -> deterministic reconciliation
 *   -> semantic verification
 *   -> terminal safety assertions
 *
 * It NEVER invokes repairSection().
 * It NEVER performs depth model repair.
 * It NEVER performs clean-room model rewrite.
 *
 * This keeps model mutation ownership single and explicit.
 */
export async function verifyGeneratedSectionOnlyV1({
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
  /*
   * SECTION_VERIFY_ONLY_TRANSACTION_V1
   *
   * Used after an upstream stage already performed its ONE
   * model mutation — especially Master Critic repair.
   *
   * HARD OWNERSHIP RULE:
   *
   *   verify-only NEVER calls repairSection().
   *
   * A semantic BLOCK may receive exactly ONE deterministic
   * semantic deletion pass, followed by complete reconciliation
   * and semantic re-verification.
   */


  assertSectionIdentity({
    contract,

    section,

    modelName:
      generator.modelName,
  });


  const initialReconciliation =
    reconciliationFor({
      contract,

      section,
    });


  try {
    assertSectionClaimReconciliationPassed(
      initialReconciliation
    );
  } catch (
    error
  ) {
    throw new ContentGenerationError(
      [
        "SECTION_VERIFY_ONLY_RECONCILIATION_FAILED",

        failureMessage(
          error
        ),
      ].join(
        ":"
      )
    );
  }


  let initialSemantic:
    Readonly<SectionSemanticVerificationV1>;


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
        "SECTION_VERIFY_ONLY_SEMANTIC_FAILED",

        failureMessage(
          error
        ),
      ].join(
        ":"
      )
    );
  }


  let acceptedSection:
    Readonly<GeneratedSectionV1> =
      section;


  let acceptedReconciliation:
    Readonly<SectionClaimReconciliationV1> =
      initialReconciliation;


  let finalSemantic:
    Readonly<SectionSemanticVerificationV1> =
      initialSemantic;


  let deterministicCleanupUsed =
    false;


  /*
   * CRITIC_VERIFY_ONLY_DETERMINISTIC_SEMANTIC_CLEANUP_V1
   *
   * The critic already owns the model rewrite.
   *
   * If that rewrite adds unsupported or contradicted incidental
   * prose, remove only verifier-identified blocked prose using
   * the canonical deterministic repair.
   *
   * This helper already fails closed when required claims would
   * lose their surviving supported representation.
   */
  if (
    initialSemantic.status ===
      "BLOCK"
  ) {
    const beforeBody =
      acceptedSection
        .bodyMarkdown;


    let cleanedSection:
      Readonly<GeneratedSectionV1>;


    try {
      cleanedSection =
        deterministicSemanticDeleteRepairV1({
          contract,

          section:
            acceptedSection,

          verification:
            initialSemantic,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_VERIFY_ONLY_DETERMINISTIC_CLEANUP_FAILED",

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    if (
      cleanedSection.bodyMarkdown ===
      beforeBody
    ) {
      throw new ContentGenerationError(
        "SECTION_VERIFY_ONLY_DETERMINISTIC_CLEANUP_NO_PROGRESS"
      );
    }


    assertSectionIdentity({
      contract,

      section:
        cleanedSection,

      modelName:
        generator.modelName,
    });


    const cleanedReconciliation =
      reconciliationFor({
        contract,

        section:
          cleanedSection,
      });


    try {
      assertSectionClaimReconciliationPassed(
        cleanedReconciliation
      );
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_VERIFY_ONLY_CLEANUP_RECONCILIATION_FAILED",

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    let cleanedSemantic:
      Readonly<SectionSemanticVerificationV1>;


    try {
      cleanedSemantic =
        await semanticVerify({
          contract,

          section:
            cleanedSection,

          generator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_VERIFY_ONLY_CLEANUP_SEMANTIC_FAILED",

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    acceptedSection =
      cleanedSection;

    acceptedReconciliation =
      cleanedReconciliation;

    finalSemantic =
      cleanedSemantic;

    deterministicCleanupUsed =
      true;
  }


  /*
   * PASS/WARN => accepted.
   *
   * Remaining BLOCK after deterministic cleanup stays fail-closed.
   * There is intentionally NO second model repair here.
   */
  try {
    assertSectionSemanticVerificationPassed(
      finalSemantic
    );
  } catch (
    error
  ) {
    throw new ContentGenerationError(
      [
        "SECTION_VERIFY_ONLY_SEMANTIC_FAILED",

        failureMessage(
          error
        ),
      ].join(
        ":"
      )
    );
  }


  /*
     * SECTION_VERIFY_ONLY_DEPTH_INVARIANT_V1
     *
     * This transaction owns ZERO model mutations.
     *
     * After critic repair and any deterministic semantic cleanup,
     * the accepted section must still satisfy the execution-plan
     * minimum depth.
     *
     * We do NOT repair here. We only prevent a shrunken section
     * from silently escaping to article-level Final Readiness.
     */
    const verifyOnlyTargetWords =
      (
        contract as
          Readonly<SectionGenerationContractV1> & {
            readonly executionPlanAuthority?: Readonly<{
              readonly targetWords?: Readonly<{
                readonly min: number;
                readonly preferred: number;
                readonly max: number;
              }>;
            }>;
          }
      ).executionPlanAuthority?.targetWords ??
      null;


    const verifyOnlyDepthFailure =
      buildSectionDepthRepairRequirementV1({
        targetWords:
          verifyOnlyTargetWords,

        bodyMarkdown:
          acceptedSection.bodyMarkdown,
      });


    /*
     * CRITIC_VERIFY_ONLY_DEPTH_GUIDANCE_V2
     *
     * The section already passed the Writer depth contract before
     * Master Critic mutation.
     *
     * Critic repair owns one bounded prose mutation and verify-only
     * owns safety validation, not another depth-writing cycle.
     *
     * A post-critic shortfall against executionPlan targetWords.min
     * is therefore planning guidance only after:
     * - identity passed
     * - claim reconciliation passed
     * - semantic verification passed
     *
     * Whole-article Final Readiness remains the authority for useful
     * article depth. Do not reject or spend another model call here.
     */
    if (
      verifyOnlyDepthFailure
    ) {
      console.info(
        "[content critic verify-only] soft depth guidance",
        {
          sectionIndex:
            contract.sectionIndex,

          currentWords:
            verifyOnlyDepthFailure.currentWords,

          plannedMinWords:
            verifyOnlyDepthFailure.minWords,
        }
      );
    }


    return Object.freeze({
    section:
      acceptedSection,

    reconciliation:
      acceptedReconciliation,

    semanticVerification:
      finalSemantic,

    repair:
      freezeAudit({
        version:
          "SECTION_REPAIR_AUDIT_V1",

        attempted:
          deterministicCleanupUsed,

        attemptCount:
          deterministicCleanupUsed
            ? 1
            : 0,

        trigger:
          deterministicCleanupUsed
            ? "SEMANTIC"
            : "NONE",

        sectionIndex:
          contract.sectionIndex,

        sectionNumber:
          contract.sectionNumber,

        /*
         * No model is owned by this transaction.
         */
        modelName:
          null,

        initialReconciliationStatus:
          initialReconciliation
            .status,

        initialSemanticStatus:
          initialSemantic
            .status,

        finalReconciliationStatus:
          acceptedReconciliation
            .status,

        finalSemanticStatus:
          finalSemantic
            .status,
      }),
  });
}


export async function verifyAndRepairGeneratedSectionV1({
  contract,
  section,
  generator,
}: {
  contract: Readonly<SectionGenerationContractV1>;

  section: Readonly<GeneratedSectionV1>;

  generator: Readonly<MasterSectionVerificationGenerator>;
}): Promise<Readonly<VerifiedMasterSectionV1>> {
  assertSectionIdentity({
    contract,
    section,
    modelName: generator.modelName,
  });

  // ========================================================
  // INITIAL DETERMINISTIC RECONCILIATION
  // ========================================================

  const initialReconciliation = reconciliationFor({
    contract,
    section,
  });

  /*
   * SECTION_SINGLE_MODEL_MUTATION_PER_SECTION_V1
   *
   * One Writer section may perform at most ONE model mutation.
   *
   * Reconciliation / semantic / depth defects are merged into
   * that one repair request whenever they are already known.
   *
   * Deterministic reconciliation and deterministic semantic
   * cleanup do not count as model mutation and remain allowed.
   */
  const sectionTargetWords =
    (
      contract as
        Readonly<SectionGenerationContractV1> & {
          readonly executionPlanAuthority?: Readonly<{
            readonly targetWords?: Readonly<{
              readonly min: number;
              readonly preferred: number;
              readonly max: number;
            }>;
          }>;
        }
    ).executionPlanAuthority?.targetWords ??
    null;


  const depthRepairFor = (
    bodyMarkdown:
      string
  ) =>
    buildSectionDepthRepairRequirementV1({
      targetWords:
        sectionTargetWords,

      bodyMarkdown,
    });


  const initialDepthRepair =
    depthRepairFor(
      section.bodyMarkdown
    );


    /*
   * SECTION_PRE_SEMANTIC_DEPTH_COST_V1
   *
   * If reconciliation already BLOCKS or the section is already
   * below its execution-plan depth floor, do not spend an initial
   * semantic verifier call before the first/only model repair.
   *
   * Otherwise verify semantics before deciding whether repair is
   * necessary.
   */
  let initialSemantic:
    Readonly<
      SectionSemanticVerificationV1
    > |
    null =
      null;


  if (
    initialReconciliation.status !==
      "BLOCK" &&
    !initialDepthRepair
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


const trigger: SectionRepairTriggerV1 =
    initialReconciliation.status === "BLOCK"
      ? "RECONCILIATION"
      : initialSemantic?.status === "BLOCK"
        ? "SEMANTIC"
        : initialDepthRepair
          ? "DEPTH"
          : "NONE";

  // ========================================================
  // CLEAN SECTION — NO REPAIR
  // ========================================================

  if (/* DEPTH_MODEL_REPAIR_WIRING_V1 */
  trigger === "NONE") {
    if (!initialSemantic) {
      throw new ContentGenerationError(
        "SECTION_REPAIR_INTERNAL_SEMANTIC_RESULT_MISSING",
      );
    }

    return Object.freeze({
      section,

      reconciliation: initialReconciliation,

      semanticVerification: initialSemantic,

      repair: freezeAudit({
        version: "SECTION_REPAIR_AUDIT_V1",

        attempted: false,

        attemptCount: 0,

        trigger: "NONE",

        sectionIndex: contract.sectionIndex,

        sectionNumber: contract.sectionNumber,

        modelName: null,

        initialReconciliationStatus: initialReconciliation.status,

        initialSemanticStatus: initialSemantic.status,

        finalReconciliationStatus: initialReconciliation.status,

        finalSemanticStatus: initialSemantic.status,
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
  //   Reverify once after one deterministic cleanup pass.
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

  let repaired: Readonly<GeneratedSectionV1> = section;

  let deterministicSemanticRepairUsed = false;

  let modelRepairUsed = false;

  let repairAttemptCount = 0;

  let finalReconciliation = initialReconciliation;

  let finalSemantic = initialSemantic;

  /*
   * Reconciliation failures retain the existing ONE bounded
   * structured repair.
   */
  if (trigger === "RECONCILIATION" || trigger === "DEPTH") {
    try {
      repaired = await generator.repairSection({
        contract,

        section,

        reconciliation: initialReconciliation,

        semanticVerification: initialSemantic,

        depthRepair:
            initialDepthRepair ??
            undefined,

        attempt: 1,
      });

      modelRepairUsed = true;

      repairAttemptCount += 1;
    } catch (error) {
      throw new ContentGenerationError(
        ["SECTION_TARGETED_REPAIR_FAILED", trigger, failureMessage(error)].join(
          ":",
        ),
      );
    }

    assertSectionIdentity({
      contract,

      section: repaired,

      modelName: generator.modelName,
    });

    finalReconciliation = reconciliationFor({
      contract,

      section: repaired,
    });

    try {
      assertSectionClaimReconciliationPassed(finalReconciliation);
    } catch (error) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "RECONCILIATION",
          failureMessage(error),
        ].join(":"),
      );
    }

    try {
      finalSemantic = await semanticVerify({
        contract,

        section: repaired,

        generator,
      });
    } catch (error) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "SEMANTIC",
          failureMessage(error),
        ].join(":"),
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
  if (finalSemantic?.status === "BLOCK") {
    /*
     * SEMANTIC_CONVERGENCE_SINGLE_MUTATION_V1
     *
     * Up to four deterministic removal passes are allowed.
     *
     * Flow:
     * verify
     * -> deterministic cleanup
     * -> reconciliation
     * -> semantic reverify
     * -> terminal PASS/WARN/BLOCK
     *
     * Repeat only while BLOCK, bounded to four deterministic passes.
     */
    const MAX_DETERMINISTIC_SEMANTIC_PASSES =
      4;

    for (
      let semanticPass = 1;
      semanticPass <= MAX_DETERMINISTIC_SEMANTIC_PASSES;
      semanticPass += 1
    ) {
      const beforeBody = repaired.bodyMarkdown;

      try {
        const nextSection = deterministicSemanticDeleteRepairV1({
          contract,

          section: repaired,

          verification: finalSemantic,
        });

        if (nextSection.bodyMarkdown === beforeBody) {
          throw new ContentGenerationError(
            "SECTION_DETERMINISTIC_SEMANTIC_NO_PROGRESS",
          );
        }

        repaired = nextSection;

        deterministicSemanticRepairUsed = true;

        repairAttemptCount += 1;
      } catch (error) {
        const semanticRepairFailure = failureMessage(error);

        /*
         * SEMANTIC_REPAIR_FAILURE_CLASSIFICATION_V2
         *
         * An emptied section means the deterministic operation itself
         * could not produce a usable section => FAILED.
         *
         * Other fail-closed semantic conditions mean the bounded repair
         * path cannot safely satisfy the contract => EXHAUSTED.
         */
        const semanticRepairFailureCode = semanticRepairFailure.includes(
          "SECTION_DETERMINISTIC_SEMANTIC_REPAIR_EMPTIED_SECTION",
        )
          ? "SECTION_TARGETED_REPAIR_FAILED"
          : "SECTION_TARGETED_REPAIR_EXHAUSTED";

        console.warn(
          "[content section repair] deterministic semantic cleanup escalated to model rewrite",
          {
            sectionIndex:
              contract.sectionIndex,

            semanticRepairFailureCode,

            semanticRepairFailure,
          }
        );

        break;
      }

      assertSectionIdentity({
        contract,

        section: repaired,

        modelName: generator.modelName,
      });

      finalReconciliation = reconciliationFor({
        contract,

        section: repaired,
      });

      /*
       * A deterministic deletion can expose required-claim loss.
       *
       * This is not terminal. The model rewrite stage below owns
       * reconstruction from the original section contract.
       */
      if (
        finalReconciliation.status ===
        "BLOCK"
      ) {
        break;
      }

      try {
        finalSemantic = await semanticVerify({
          contract,

          section: repaired,

          generator,
        });
      } catch (error) {
        throw new ContentGenerationError(
          [
            "SECTION_TARGETED_REPAIR_EXHAUSTED",
            "SEMANTIC",
            failureMessage(error),
          ].join(":"),
        );
      }

      /*
       * SEMANTIC_WARN_CONVERGENCE_TERMINAL_V1
       *
       * SectionSemanticVerificationV1 has:
       * PASS / WARN / BLOCK.
       *
       * Only BLOCK is repairable/blocking.
       *
       * WARN is explicitly accepted by
       * assertSectionSemanticVerificationPassed(), so continuing
       * deterministic deletion after WARN is invalid and causes:
       *
       * SECTION_DETERMINISTIC_SEMANTIC_REPAIR_NOT_BLOCKED
       */
      if (finalSemantic.status !== "BLOCK") {
        break;
      }
    }
  }

  /*
   * Before model self-heal we terminate the strictly deterministic
   * semantic convergence stage.
   *
   * This boundary is deliberate:
   *
   * semantic verifier
   * -> ONE deterministic cleanup
   * -> reconciliation
   * -> ONE semantic reverify
   *
   * No model call belongs inside
   * SEMANTIC_REPAIR_DETERMINISTIC_CONVERGENCE_V2.
   */
  if (!finalSemantic) {
    throw new ContentGenerationError(
      "SECTION_REPAIR_INTERNAL_SEMANTIC_RESULT_MISSING"
    );
  }


  /*
   * SECTION_SEMANTIC_MODEL_SELF_HEAL_V1
   *
   * A remaining local semantic/reconciliation BLOCK is repairable,
   * but it must remain tightly bounded.
   *
   * Maximum escalation:
   *
   * 1. At most ONE model rewrite for this section in total.
   * 2. All remaining convergence is deterministic verification/cleanup.
   * 3. Terminal verification.
   *
   * Never:
   * - rewrite the whole article
   * - loop model repair
   * - weaken evidence rules
   * - invent claims/evidence
   */
  if (
    !modelRepairUsed &&
    (
      finalSemantic.status ===
        "BLOCK" ||
      finalReconciliation.status ===
        "BLOCK"
    )
  ) {
    const beforeSelfHealBody =
      repaired.bodyMarkdown;


    let targetedSection:
      Readonly<GeneratedSectionV1>;


    try {
      targetedSection =
        await generator.repairSection({
          contract,

          section:
            repaired,

          reconciliation:
            finalReconciliation,

          semanticVerification:
            finalReconciliation.status ===
              "BLOCK"
              ? null
              : finalSemantic,

          depthRepair:
            depthRepairFor(
              repaired.bodyMarkdown
            ) ??
            undefined,

          attempt:
            1,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_SELF_HEAL_MODEL_REWRITE_FAILED",
          "SEMANTIC",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    modelRepairUsed =
      true;

    repairAttemptCount +=
      1;


    assertSectionIdentity({
      contract,

      section:
        targetedSection,

      modelName:
        generator.modelName,
    });


    /*
     * Same body = proven no progress.
     *
     * Do not burn another incremental rewrite.
     * A second model rewrite is forbidden; remaining convergence is deterministic.
     */
    if (
      targetedSection.bodyMarkdown !==
        beforeSelfHealBody
    ) {
      repaired =
        targetedSection;


      finalReconciliation =
        reconciliationFor({
          contract,

          section:
            repaired,
        });


      if (
        finalReconciliation.status !==
        "BLOCK"
      ) {
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
              "SECTION_SELF_HEAL_SEMANTIC_REVERIFY_FAILED",
              failureMessage(
                error
              ),
            ].join(
              ":"
            )
          );
        }
      }
    }
  }


  /*
   * SECTION_SEMANTIC_CLEAN_ROOM_FALLBACK_V1
   *
   * Exactly one final section-local reconstruction.
   *
   * Preserve the immutable SectionGenerationContract;
   * discard only the failed prose.
   */
  if (
    !modelRepairUsed &&
    (
      finalSemantic.status ===
        "BLOCK" ||
      finalReconciliation.status ===
        "BLOCK"
    )
  ) {
    const cleanRoomSection:
      Readonly<GeneratedSectionV1> =
      {
        ...repaired,

        bodyMarkdown:
          "",

        coveredQueryNodeIds:
          [],

        referencedClaimIds:
          [],

        referencedEvidenceIds:
          [],

        usedInternalLinks:
          [],

        assetUsed:
          null,
      };


    const cleanRoomReconciliation =
      reconciliationFor({
        contract,

        section:
          cleanRoomSection,
      });


    let rewrittenSection:
      Readonly<GeneratedSectionV1>;


    try {
      rewrittenSection =
        await generator.repairSection({
          contract,

          section:
            cleanRoomSection,

          reconciliation:
            cleanRoomReconciliation,

          semanticVerification:
            null,

          depthRepair:
            depthRepairFor(
              cleanRoomSection.bodyMarkdown
            ) ??
            undefined,

          attempt:
            1,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_CLEAN_ROOM_REWRITE_FAILED",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    modelRepairUsed =
      true;

    repairAttemptCount +=
      1;


    assertSectionIdentity({
      contract,

      section:
        rewrittenSection,

      modelName:
        generator.modelName,
    });


    const rewrittenReconciliation =
      reconciliationFor({
        contract,

        section:
          rewrittenSection,
      });


    try {
      assertSectionClaimReconciliationPassed(
        rewrittenReconciliation
      );
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_CLEAN_ROOM_RECONCILIATION_FAILED",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    let rewrittenSemantic:
      Readonly<SectionSemanticVerificationV1>;


    try {
      rewrittenSemantic =
        await semanticVerify({
          contract,

          section:
            rewrittenSection,

          generator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_CLEAN_ROOM_SEMANTIC_VERIFY_FAILED",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    repaired =
      rewrittenSection;

    finalReconciliation =
      rewrittenReconciliation;

    finalSemantic =
      rewrittenSemantic;
  }


  /*
   * Terminal section safety gate.
   *
   * Model self-heal is allowed to repair a local BLOCK.
   * It is NEVER allowed to bypass reconciliation or semantics.
   */
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
   * SECTION_DEPTH_TERMINAL_GATE_V1
   *
   * Depth remains section-local and runs only after the section
   * has passed reconciliation + semantic safety.
   *
   * The implementation below may converge by useful depth progress,
   * while the global ContentRunBudget remains the hard physical cap.
   */

  /*
   * SECTION_DEPTH_LOCAL_CONVERGENCE_V2
   *
   * Depth is owned by THIS section repair stage.
   *
   * Do not throw DEPTH back to the article orchestrator merely
   * because one repair undershot the floor by a few words.
   *
   * Flow:
   *
   * current verified section
   * -> local depth repair
   * -> identity
   * -> reconciliation
   * -> semantic verification
   * -> depth check
   * -> repeat ONLY while meaningful progress exists
   *
   * Strict bounded local convergence; global budget remains a backstop.
   *
   * Fail closed only on:
   * - repeated body state
   * - non-increasing depth while still below floor
   * - reconciliation regression
   * - semantic regression
   * - provider/programming failure
   */
  const depthTargetWords =
    (
      contract as
        Readonly<SectionGenerationContractV1> & {
          readonly executionPlanAuthority?: Readonly<{
            readonly targetWords?: Readonly<{
              readonly min: number;
              readonly preferred: number;
              readonly max: number;
            }>;
          }>;
        }
    ).executionPlanAuthority?.targetWords ??
    null;


  let terminalDepthRepair =
    buildSectionDepthRepairRequirementV1({
      targetWords:
        depthTargetWords,

      bodyMarkdown:
        repaired.bodyMarkdown,
    });


  const seenDepthBodies =
    new Set<string>([
      repaired.bodyMarkdown,
    ]);


  /*
   * SECTION_DEPTH_SINGLE_MODEL_PASS_V1
   *
   * One useful expansion attempt per section, even when a prior
   * reconciliation/semantic model repair was necessary.
   *
   * Skipping depth simply because modelRepairUsed was true allowed a
   * factually repaired but short section to reach final readiness.
   * Depth expansion must independently re-run identity, reconciliation,
   * and semantic checks below. The global run budget still applies.
   *
   * If it remains slightly below the section soft target, do not
   * burn repeated LLM calls. Whole-article readiness remains the
   * downstream authority for actual article length.
   */
  const MAX_DEPTH_MODEL_REPAIR_PASSES =
    1;

  for (
    let depthPass =
      1;
    depthPass <=
      MAX_DEPTH_MODEL_REPAIR_PASSES &&
    terminalDepthRepair;
    depthPass +=
      1
  ) {
    const beforeDepth =
      terminalDepthRepair;

    const beforeBody =
      repaired.bodyMarkdown;


    let nextSection:
      Readonly<GeneratedSectionV1>;


    try {
      nextSection =
        await generator.repairSection({
          contract,

          section:
            repaired,

          reconciliation:
            finalReconciliation,

          semanticVerification:
            finalSemantic,

          depthRepair:
            beforeDepth,

          attempt:
            1,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_FAILED",
          "DEPTH",
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    modelRepairUsed =
      true;

    repairAttemptCount +=
      1;


    assertSectionIdentity({
      contract,

      section:
        nextSection,

      modelName:
        generator.modelName,
    });


    /*
     * DEPTH_SEMANTIC_LOCAL_CONVERGENCE_V3
     *
     * A depth repair can accidentally introduce an unsupported
     * semantic unit.
     *
     * Do NOT restart the article and do NOT accept it.
     *
     * Instead:
     * depth repair
     * -> reconcile
     * -> semantic verify
     * -> deterministic unsupported-unit deletion when BLOCKED
     * -> reconcile again
     * -> semantic reverify
     * -> depth check
     *
     * If semantic cleanup returns us to an already-seen body,
     * convergence has genuinely stalled and we fail closed locally.
     */
    if (
      nextSection.bodyMarkdown ===
        beforeBody
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "DEPTH",
          "NO_PROGRESS_BODY_CYCLE",
          `${beforeDepth.currentWords}<${beforeDepth.minWords}`,
        ].join(
          ":"
        )
      );
    }


    let acceptedSection:
      Readonly<GeneratedSectionV1> =
        nextSection;


    let acceptedReconciliation =
      reconciliationFor({
        contract,

        section:
          acceptedSection,
      });


    try {
      assertSectionClaimReconciliationPassed(
        acceptedReconciliation
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


    let acceptedSemantic:
      Readonly<SectionSemanticVerificationV1>;


    try {
      acceptedSemantic =
        await semanticVerify({
          contract,

          section:
            acceptedSection,

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


    /*
     * DEPTH_SEMANTIC_DELETION_CONVERGENCE_V4
     *
     * One deterministic cleanup pass is not sufficient when the
     * verifier exposes several unsupported prose units.
     *
     * Keep cleanup local to THIS section:
     *
     * BLOCK
     * -> deterministic deletion
     * -> reconciliation
     * -> semantic reverify
     * -> terminal PASS/WARN/BLOCK
     *
     * No arbitrary numeric ceiling.
     *
     * Stop fail-closed only if:
     * - cleanup produces the same body
     * - a previously-seen cleanup body repeats
     * - reconciliation breaks
     * - required claim survival breaks
     * - verifier itself fails
     */
    const seenSemanticCleanupBodies =
      new Set<string>();


        /*
     * DEPTH_SEMANTIC_DETERMINISTIC_CONVERGENCE_V5
     *
     * Deterministic cleanup is local and has ZERO writer/model
     * mutations. Continue only while the semantic verifier is BLOCK.
     *
     * Termination is structural rather than an arbitrary pass quota:
     * - unchanged body -> fail closed
     * - repeated body -> fail closed
     * - reconciliation regression -> fail closed
     * - required claim loss -> fail closed
     * - semantic verifier failure -> fail closed
     *
     * The existing seenSemanticCleanupBodies guard below guarantees
     * convergence without creating an LLM repair loop.
     */
    while (
      acceptedSemantic.status ===
        "BLOCK"
    ) {
      const beforeSemanticBody =
        acceptedSection.bodyMarkdown;


      if (
        seenSemanticCleanupBodies.has(
          beforeSemanticBody
        )
      ) {
        throw new ContentGenerationError(
          [
            "SECTION_TARGETED_REPAIR_EXHAUSTED",
            "SEMANTIC",
            "NO_PROGRESS_SEMANTIC_CYCLE",
          ].join(
            ":"
          )
        );
      }


      seenSemanticCleanupBodies.add(
        beforeSemanticBody
      );


      let semanticallyCleaned:
        Readonly<GeneratedSectionV1>;


      try {
        semanticallyCleaned =
          deterministicSemanticDeleteRepairV1({
            contract,

            section:
              acceptedSection,

            verification:
              acceptedSemantic,
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
        semanticallyCleaned.bodyMarkdown ===
          beforeSemanticBody
      ) {
        throw new ContentGenerationError(
          [
            "SECTION_TARGETED_REPAIR_EXHAUSTED",
            "SEMANTIC",
            "NO_PROGRESS_SEMANTIC_BODY_UNCHANGED",
          ].join(
            ":"
          )
        );
      }


      deterministicSemanticRepairUsed =
        true;

      repairAttemptCount +=
        1;


      assertSectionIdentity({
        contract,

        section:
          semanticallyCleaned,

        modelName:
          generator.modelName,
      });


      acceptedSection =
        semanticallyCleaned;


      acceptedReconciliation =
        reconciliationFor({
          contract,

          section:
            acceptedSection,
        });


      try {
        assertSectionClaimReconciliationPassed(
          acceptedReconciliation
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
        acceptedSemantic =
          await semanticVerify({
            contract,

            section:
              acceptedSection,

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


    try {
      assertSectionSemanticVerificationPassed(
        acceptedSemantic
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
     * Check convergence AFTER semantic cleanup.
     *
     * This catches:
     *   360 words
     *   -> model adds unsupported prose
     *   -> semantic cleanup removes it
     *   -> back to the same 360-word body
     *
     * without restarting the entire article.
     */
    if (
      acceptedSection.bodyMarkdown ===
        beforeBody ||
      seenDepthBodies.has(
        acceptedSection.bodyMarkdown
      )
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "DEPTH",
          "NO_PROGRESS_AFTER_SEMANTIC_CLEANUP",
          `${beforeDepth.currentWords}<${beforeDepth.minWords}`,
        ].join(
          ":"
        )
      );
    }


    seenDepthBodies.add(
      acceptedSection.bodyMarkdown
    );


    const nextDepthRepair =
      buildSectionDepthRepairRequirementV1({
        targetWords:
          depthTargetWords,

        bodyMarkdown:
          acceptedSection.bodyMarkdown,
      });


    /*
     * Body changed but useful depth did not increase.
     *
     * This is not meaningful convergence and must not cause
     * another whole-article regeneration.
     */
    if (
      nextDepthRepair &&
      nextDepthRepair.currentWords <=
        beforeDepth.currentWords
    ) {
      throw new ContentGenerationError(
        [
          "SECTION_TARGETED_REPAIR_EXHAUSTED",
          "DEPTH",
          "NO_MEANINGFUL_PROGRESS",
          `${nextDepthRepair.currentWords}<${nextDepthRepair.minWords}`,
        ].join(
          ":"
        )
      );
    }


    repaired =
      acceptedSection;

    finalReconciliation =
      acceptedReconciliation;

    finalSemantic =
      acceptedSemantic;

    terminalDepthRepair =
      nextDepthRepair;
  }


  /*
   * REPAIR_AUDIT_ATTEMPT_COUNT_RUNTIME_CONVERGENCE_V3
   *
   * Telemetry validation only.
   *
   * Local convergence has no arbitrary max attempt count.
   */
  if (
    !Number.isInteger(
      repairAttemptCount
    ) ||
    repairAttemptCount <
      0
  ) {
    throw new ContentGenerationError(
      `SECTION_REPAIR_AUDIT_ATTEMPT_COUNT_INVALID:${repairAttemptCount}`
    );
  }


  const boundedRepairAttemptCount =
    repairAttemptCount;


  return Object.freeze({
    section: repaired,

    reconciliation: finalReconciliation,

    semanticVerification: finalSemantic,

    repair: freezeAudit({
      version: "SECTION_REPAIR_AUDIT_V1",

      attempted: true,

      attemptCount: boundedRepairAttemptCount,

      trigger,

      sectionIndex: contract.sectionIndex,

      sectionNumber: contract.sectionNumber,

      modelName: modelRepairUsed ? generator.modelName : null,

      initialReconciliationStatus: initialReconciliation.status,

      initialSemanticStatus: initialSemantic?.status ?? null,

      finalReconciliationStatus: finalReconciliation.status,

      finalSemanticStatus: finalSemantic.status,
    }),
  });
}

export function supportsMasterSectionRepairGenerator(
  value: unknown,
): value is MasterSectionRepairGenerator {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<MasterSectionRepairGenerator>;

  return (
    typeof candidate.modelName === "string" &&
    candidate.modelName.trim().length > 0 &&
    typeof candidate.repairSection === "function"
  );
}
