import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  tryRecoverMissingKeywordV1,
} from "./rank-ready-keyword-recovery-v1";

import {
  composeMasterArticleV1,
} from "./master-article-composer";

import type {
  MasterArticleCriticExecutionV1,
} from "./master-article-critic-fusion";

import {
  assertMasterArticleCriticExecutionPassed,
  executeMasterArticleCriticsV1,
} from "./master-article-critic-fusion";

import type {
  MasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critics";

import type {
  MasterArticleCriticRepairPlanV1,
} from "./master-article-critic-repair-plan";

import {
  assertMasterArticleCriticRepairPlanExecutableV1,
  buildMasterArticleCriticRepairPlanV1,
} from "./master-article-critic-repair-plan";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  countSectionWordsV1,
  supportsMasterSectionRepairGenerator,
  verifyGeneratedSectionOnlyV1,
} from "./master-section-repair";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";

import {
  ContentGenerationError,
} from "./generator";

import {detectHighConfidenceEditorialRepetitionV1}
  from "./editorial-repetition-guard-v1";


export interface MasterArticleCriticSectionRepairAuditV1 {
  version:
    "MASTER_ARTICLE_CRITIC_SECTION_REPAIR_AUDIT_V1";

  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  attempted:
    true;

  attemptCount:
    1;

  modelName:
    string;

  criticIds:
    readonly string[];

  findingCodes:
    readonly string[];

  findingCount:
    number;
}


export interface MasterArticleCriticRepairExecutionV1 {
  version:
    "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1";

  initialCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  repairPlan:
    Readonly<
      MasterArticleCriticRepairPlanV1
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;

  finalCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  repairs:
    readonly Readonly<
      MasterArticleCriticSectionRepairAuditV1
    >[];

  provenance:
    Readonly<{
      criticReplayCount:
        number;

      repairedSectionCount:
        number;

      repairAttemptCount:
        number;

      wholeArticleRewriteCount:
        0;
    }>;
}


function failureMessage(
  error:
    unknown
): string {
  return error instanceof
    Error
    ? error.message
    : String(
        error
      );
}


function rebuildWriterRun({
  contract,
  run,
  sections,
  reconciliations,
  semanticVerifications,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  sections:
    MasterWriterRunV1[
      "sections"
    ];

  reconciliations:
    MasterWriterRunV1[
      "reconciliations"
    ];

  semanticVerifications:
    MasterWriterRunV1[
      "semanticVerifications"
    ];
}): Readonly<
  MasterWriterRunV1
> {
  const frozenSections =
    Object.freeze([
      ...sections,
    ]);


  const frozenReconciliations =
    Object.freeze([
      ...reconciliations,
    ]);


  const frozenSemanticVerifications =
    Object.freeze([
      ...semanticVerifications,
    ]);


  if (
    frozenSections.length !==
      contract.sectionContracts.length ||
    frozenReconciliations.length !==
      frozenSections.length ||
    frozenSemanticVerifications.length !==
      frozenSections.length
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_REPAIR_RUN_CARDINALITY_INVALID"
    );
  }


  const article =
    composeMasterArticleV1({
      contract,

      shell:
        run.shell,

      sections:
        frozenSections,
    });


  const sectionModelNames =
    Object.freeze(
      Array.from(
        new Set(
          frozenSections.map(
            (section) =>
              section.provenance
                .modelName
          )
        )
      )
    );


  const reconciliationWarnCount =
    frozenReconciliations
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;


  const semanticWarnCount =
    frozenSemanticVerifications
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;


  return Object.freeze({
    ...run,

    sections:
      frozenSections,

    reconciliations:
      frozenReconciliations,

    semanticVerifications:
      frozenSemanticVerifications,

    article,

    provenance:
      Object.freeze({
        ...run.provenance,

        sectionModelNames,

        sectionCount:
          frozenSections.length,

        reconciliationCount:
          frozenReconciliations.length,

        reconciliationWarnCount,

        reconciliationBlockCount:
          0 as const,

        semanticVerificationCount:
          frozenSemanticVerifications.length,

        semanticWarnCount,

        semanticBlockCount:
          0 as const,
      }),
  });
}


/*
 * MASTER_CRITIC_SINGLE_REPAIR_CYCLE_V1
 *
 * Final critics are a bounded quality-control transaction.
 *
 * Ownership:
 *
 * initial full critic suite
 * -> classify repairability
 * -> ONE scoped model repair per initial section task
 * -> canonical reconciliation + semantic verification
 * -> deterministic semantic cleanup when needed
 * -> ONE full critic replay
 * -> STOP
 *
 * The replay is diagnostic. It does NOT recursively become a new
 * writer/repair planner.
 *
 * Hard safety is still fail-closed:
 * - upstream evidence/context/cannibalization blockers
 * - section reconciliation failures
 * - section semantic/evidence failures
 * - required claim loss
 *
 * Residual repairable SECTION critic findings are preserved in
 * finalCritics for review/final-readiness diagnostics, but they
 * cannot start another authoring loop.
 *
 * No whole-article rewrite.
 */


export async function executeMasterArticleCriticRepairReplayV1({
  contract,
  run,
  initialCritics,
  generator,
  context,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  initialCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  generator:
    unknown;

  context:
    Readonly<
      MasterArticleSemanticCriticContextV1
    >;
}): Promise<
  Readonly<
    MasterArticleCriticRepairExecutionV1
  >
> {
  const repairPlan =
    buildMasterArticleCriticRepairPlanV1({
      contract,

      suite:
        initialCritics.suite,
    });


  /*
   * Upstream/unrepairable BLOCKs fail before any model repair.
   *
   * Repairable SECTION findings are allowed through into the one
   * bounded repair transaction below.
   */
  assertMasterArticleCriticRepairPlanExecutableV1(
    repairPlan
  );


  if (
    repairPlan.disposition ===
    "NO_REPAIR_NEEDED"
  ) {
    assertMasterArticleCriticExecutionPassed(
      initialCritics
    );


    return Object.freeze({
      version:
        "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,

      initialCritics,

      repairPlan,

      run,

      finalCritics:
        initialCritics,

      repairs:
        Object.freeze([]),

      provenance:
        Object.freeze({
          criticReplayCount:
            0 as const,

          repairedSectionCount:
            0,

          repairAttemptCount:
            0,

          wholeArticleRewriteCount:
            0 as const,
        }),
    });
  }


  if (
    !supportsMasterSectionRepairGenerator(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_REPAIR_CAPABILITY_REQUIRED"
    );
  }


  if (
    !supportsMasterSectionSemanticVerifier(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_SEMANTIC_VERIFIER_REQUIRED"
    );
  }


  const repairGenerator =
    generator;


  const sections =
    [
      ...run.sections,
    ];


  const reconciliations =
    [
      ...run.reconciliations,
    ];


  const semanticVerifications =
    [
      ...run
        .semanticVerifications,
    ];


  const initialRepeat=detectHighConfidenceEditorialRepetitionV1(
    run.sections.map(section=>({
      heading:section.heading,bodyMarkdown:section.bodyMarkdown,
    })));
  console.info("[content master critic pre-repair repetition]",{
    initialFindingCodes:initialRepeat.map(x=>x.code),
    initialAffectedSections:initialRepeat.flatMap(x=>x.affectedSections),
    initialCriticStatus:initialCritics.suite.status,
  });

  const audits:
    MasterArticleCriticSectionRepairAuditV1[] =
      [];


  /*
   * MASTER_CRITIC_SINGLE_MODEL_OWNER_V1
   *
   * Exactly ONE model mutation is allowed for each INITIAL critic
   * repair task.
   *
   * verifyGeneratedSectionOnlyV1 owns ZERO model mutations.
   * It may only:
   *
   * identity
   * -> reconciliation
   * -> semantic verification
   * -> deterministic semantic deletion
   * -> one semantic re-verification.
   */
  for (
    const task
    of repairPlan.repairTasks
  ) {
    const index =
      task.sectionIndex;


    const sectionContract =
      contract.sectionContracts[
        index
      ];


    const currentSection =
      sections[
        index
      ];


    const currentReconciliation =
      reconciliations[
        index
      ];


    const currentSemanticVerification =
      semanticVerifications[
        index
      ];


    if (
      !sectionContract ||
      !currentSection ||
      !currentReconciliation ||
      !currentSemanticVerification
    ) {
      throw new ContentGenerationError(
        `MASTER_CRITIC_SECTION_REPAIR_INPUT_MISSING:${index}`
      );
    }


    /*
     * MASTER_CRITIC_DEPTH_PRESERVATION_V1
     *
     * Critic owns exactly ONE model mutation.
     *
     * Therefore that mutation must know the execution-plan depth
     * contract BEFORE it rewrites the section.
     *
     * We intentionally provide the full section budget even when
     * the incoming section is already above min: the goal is not
     * another depth-repair loop, but preventing critic shrinkage.
     */
    const criticTargetWords =
      (
        sectionContract as
          typeof sectionContract & {
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


    /*
     * MASTER_CRITIC_EXISTING_DEPTH_FLOOR_V1
     *
     * A section reaching Master Critic has already passed the
     * Writer depth contract.
     *
     * Critic owns exactly one model mutation. That mutation may
     * fix critic findings, but it must not unnecessarily destroy
     * already-valid useful depth.
     *
     * Preserve existing depth up to the execution-plan preferred
     * target:
     *
     *   preservation floor =
     *     max(
     *       target.min,
     *       min(currentWords, target.preferred)
     *     )
     *
     * No extra repair/model loop is introduced here.
     */
    const criticCurrentWords =
      countSectionWordsV1(
        currentSection.bodyMarkdown
      );


    const criticDepthPreservation =
      criticTargetWords
        ? Object.freeze({
            currentWords:
              criticCurrentWords,

            minWords:
              Math.max(
                criticTargetWords.min,

                Math.min(
                  criticCurrentWords,
                  criticTargetWords.preferred
                )
              ),

            preferredWords:
              criticTargetWords.preferred,

            maxWords:
              criticTargetWords.max,
          })
        : undefined;


    let repairedSection;


    try {
      const deterministicMarkdown =
        tryRecoverMissingKeywordV1({
          markdown: currentSection.bodyMarkdown,
          findings: task.findings,
          maxWords: criticTargetWords?.max,
        });

      if (deterministicMarkdown !== null) {
        repairedSection = Object.freeze({
          ...currentSection,
          bodyMarkdown: deterministicMarkdown,
        });
      } else {
      repairedSection =
        await repairGenerator
          .repairSection({
            contract:
              sectionContract,

            section:
              currentSection,

            reconciliation:
              currentReconciliation,

            semanticVerification:
              currentSemanticVerification,

            depthRepair:
              criticDepthPreservation,

            attempt:
              1,

            criticFindings:
              task.findings,

            // Editorial-only "already explained" context. No
            // additional fact, source or claim is authorized.
            crossSectionEditorialContext:sections.flatMap((other,j)=>{
              if(j===index)return [];
              const text=other.bodyMarkdown;
              return [{
                sectionIndex:j,heading:other.heading,
                prosePreview:text.length<=2200?text:
                  text.slice(0,1100)+"\n[...existing prose omitted...]\n"+
                  text.slice(-1050),
              }];
            }),
          });
      }
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_CRITIC_SECTION_REPAIR_FAILED",

          String(
            index
          ),

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    let verified;


    try {
      /*
       * MASTER_CRITIC_VALIDATION_CONVERGENCE_V2
       *
       * Critic already spent the only model mutation.
       *
       * Canonical verify-only may deterministically self-heal
       * unsupported incidental prose but may never call
       * repairSection() itself.
       */
      verified =
        await verifyGeneratedSectionOnlyV1({
          contract:
            sectionContract,

          section:
            repairedSection,

          generator:
            repairGenerator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_CRITIC_SECTION_REPAIR_VERIFICATION_FAILED",

          String(
            index
          ),

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    sections[
      index
    ] =
      verified.section;


    reconciliations[
      index
    ] =
      verified.reconciliation;


    semanticVerifications[
      index
    ] =
      verified
        .semanticVerification;


    audits.push(
      Object.freeze({
        version:
          "MASTER_ARTICLE_CRITIC_SECTION_REPAIR_AUDIT_V1" as const,

        sectionIndex:
          task.sectionIndex,

        sectionNumber:
          task.sectionNumber,

        heading:
          task.heading,

        attempted:
          true as const,

        attemptCount:
          1 as const,

        modelName:
          repairGenerator
            .modelName,

        criticIds:
          Object.freeze(
            Array.from(
              new Set(
                task.findings.map(
                  (
                    finding
                  ) =>
                    finding
                      .criticId
                )
              )
            )
          ),

        findingCodes:
          Object.freeze(
            task.findings.map(
              (
                finding
              ) =>
                finding.code
            )
          ),

        findingCount:
          task.findings
            .length,
      })
    );
  }


  const repairedRun =
    rebuildWriterRun({
      contract,

      run,

      sections:
        Object.freeze(
          sections
        ),

      reconciliations:
        Object.freeze(
          reconciliations
        ),

      semanticVerifications:
        Object.freeze(
          semanticVerifications
        ),
    });


  const finalDeterministicRepeat=detectHighConfidenceEditorialRepetitionV1(
    sections.map(section=>({
      heading:section.heading,bodyMarkdown:section.bodyMarkdown,
    })));
  console.info("[content master critic post-repair repetition]",{
    before:initialRepeat.map(x=>({
      code:x.code,affectedSections:x.affectedSections,
      repeatedPhrases:x.repeatedPhrases,
    })),
    after:finalDeterministicRepeat.map(x=>({
      code:x.code,affectedSections:x.affectedSections,
      repeatedPhrases:x.repeatedPhrases,
    })),
    repairTaskCount:audits.length,
  });
  // No second whole-article model call when a local revision just
  // INTRODUCED deterministic high-confidence cross-section boilerplate.
  if(initialRepeat.length===0&&finalDeterministicRepeat.length>0)
    throw new ContentGenerationError(
      "MASTER_CRITIC_REPAIR_INTRODUCED_EDITORIAL_REPETITION:"+
      finalDeterministicRepeat[0].code);

  /*
   * ONE complete replay.
   *
   * We still re-run the complete critic suite because a localized
   * edit can expose a new intent/editorial/originality problem.
   *
   * But this replay is validation/diagnostic only.
   * It does NOT create a recursive critic-author loop.
   */
  const finalCritics =
    await executeMasterArticleCriticsV1({
      contract,

      run:
        repairedRun,

      generator,

      context,
    });


  /*
   * Classify residual findings once.
   *
   * This assertion continues to fail closed for genuinely
   * UNREPAIRABLE upstream/context/evidence/cannibalization
   * blockers.
   *
   * REPAIRABLE_SECTION findings are retained as final review
   * diagnostics and are NOT executed again here.
   */
  // Optional keyword coverage work must never make an already
  // acceptable article worse. A model can introduce unsupported
  // material: if its nine-critic replay now BLOCKS, keep the original.
  // Similarly, do not accept an edit that fails to improve coverage.
  const optionalKeywordRepair =
    initialCritics.suite.status !== "BLOCK" &&
    repairPlan.repairTasks.length > 0 &&
    repairPlan.repairTasks.every(task =>
      task.findings.every(finding =>
        finding.severity === "WARN" &&
        finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
      )
    );
  if (optionalKeywordRepair) {
    const missingCount = (execution: Readonly<MasterArticleCriticExecutionV1>) =>
      execution.suite.results.flatMap(result => result.findings)
        .filter(finding =>
          finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
        ).length;
    if (
      finalCritics.suite.status === "BLOCK" ||
      missingCount(finalCritics) >= missingCount(initialCritics)
    ) {
      // The original passed every mandatory critic. An optional
      // keyword-only WARN repair must not turn it into a failed article.
      // The attempted edit is discarded, not persisted or re-used by
      // SERP Replay or final publication readiness.
      console.warn(
        "[content optional keyword repair rollback]",
        {
          code: "OPTIONAL_KEYWORD_REPAIR_DID_NOT_IMPROVE_SAFELY",
          originalMissingKeywords: missingCount(initialCritics),
          attemptedMissingKeywords: missingCount(finalCritics),
          attemptedCriticStatus: finalCritics.suite.status,
        }
      );
      assertMasterArticleCriticExecutionPassed(initialCritics);
      return Object.freeze({
        version: "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,
        initialCritics,
        repairPlan,
        run,
        finalCritics: initialCritics,
        repairs: Object.freeze([]),
        provenance: Object.freeze({
          criticReplayCount: 1 as const,
          repairedSectionCount: 0,
          repairAttemptCount: audits.length,
          wholeArticleRewriteCount: 0 as const,
        }),
      });
    }
  }

  const residualPlan =
    buildMasterArticleCriticRepairPlanV1({
      contract,

      suite:
        finalCritics.suite,
    });


  assertMasterArticleCriticRepairPlanExecutableV1(
    residualPlan
  );


  if (
    residualPlan.disposition ===
    "NO_REPAIR_NEEDED"
  ) {
    assertMasterArticleCriticExecutionPassed(
      finalCritics
    );
  } else if (
    residualPlan.repairTasks.length >
    0
  ) {
    console.warn(
      "[content master critic residual review findings]",
      {
        repairTaskCount:
          residualPlan
            .repairTasks
            .length,

        sectionIndexes:
          Array.from(
            new Set(
              residualPlan
                .repairTasks
                .map(
                  (
                    task
                  ) =>
                    task.sectionIndex
                )
            )
          ),

        findingCodes:
          residualPlan
            .repairTasks
            .flatMap(
              (
                task
              ) =>
                task.findings
                  .map(
                    (
                      finding
                    ) =>
                      finding.code
                  )
            ),
      }
    );
  }


  const repairedSectionCount =
    new Set(
      audits.map(
        (
          audit
        ) =>
          audit.sectionIndex
      )
    ).size;


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,

    initialCritics,

    repairPlan,

    run:
      repairedRun,

    finalCritics,

    repairs:
      Object.freeze([
        ...audits,
      ]),

    provenance:
      Object.freeze({
        criticReplayCount:
          1 as const,

        repairedSectionCount,

        repairAttemptCount:
          audits.length,

        wholeArticleRewriteCount:
          0 as const,
      }),
  });
}
