import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

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
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  supportsMasterSectionRepairGenerator,
  verifyAndRepairGeneratedSectionV1,
} from "./master-section-repair";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";

import {
  buildCompetitiveReplayRepairPlanV2,
  type CompetitiveReplayRepairPlanV2,
} from "./competitive-serp-replay-repair-plan-v2";

import {
  executeSerpReplayV1,
  type SerpReplayV1,
} from "./serp-replay";

import {
  ContentGenerationError,
} from "./generator";


type ReplayInputV1 =
  Parameters<
    typeof executeSerpReplayV1
  >[0];


type CriticInputV1 =
  Parameters<
    typeof executeMasterArticleCriticsV1
  >[0];


export interface CompetitiveSerpReplayRepairAuditV2 {
  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  dimensions:
    readonly string[];

  competitorUrls:
    readonly string[];

  attemptCount:
    1;
}


export interface CompetitiveSerpReplayExecutionV2 {
  version:
    "COMPETITIVE_SERP_REPLAY_EXECUTION_V2";

  initialReplay:
    Readonly<SerpReplayV1>;

  finalReplay:
    Readonly<SerpReplayV1>;

  repairPlan:
    Readonly<
      CompetitiveReplayRepairPlanV2
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;

  postRepairCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    > |
    null;

  repairs:
    readonly Readonly<
      CompetitiveSerpReplayRepairAuditV2
    >[];

  provenance:
    Readonly<{
      replayExecutionCount:
        1 | 2;

      postRepairCriticReplayCount:
        0 | 1;

      repairAttemptCount:
        number;

      repairedSectionCount:
        number;

      repairSuppressedByPriorRepair:
        boolean;

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


function existingRepairIndexes(
  run:
    Readonly<
      MasterWriterRunV1
    >
): readonly number[] {
  const candidate =
    run as unknown as {
      repairs?:
        readonly {
          attempted?:
            boolean;

          sectionIndex?:
            number;
        }[];
    };


  if (
    !Array.isArray(
      candidate.repairs
    )
  ) {
    return Object.freeze(
      []
    );
  }


  return Object.freeze(
    candidate.repairs
      .filter(
        (
          repair
        ) =>
          repair.attempted ===
          true &&
          Number.isInteger(
            repair.sectionIndex
          )
      )
      .map(
        (
          repair
        ) =>
          repair.sectionIndex as number
      )
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
    Readonly<
      ArticleGenerationContractV1
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;

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
      "COMPETITIVE_REPLAY_RUN_CARDINALITY_INVALID"
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
            (
              section
            ) =>
              section.provenance
                .modelName
          )
        )
      )
    );


  const reconciliationWarnCount =
    frozenReconciliations
      .filter(
        (
          result
        ) =>
          result.status ===
          "WARN"
      )
      .length;


  const semanticWarnCount =
    frozenSemanticVerifications
      .filter(
        (
          result
        ) =>
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


export async function executeCompetitiveSerpReplayRepairV2({
  contract,
  runtime,
  run,
  generator,
  context,
  siteDomain,
  alreadyRepairedSectionIndexes =
    [],
}: {
  contract:
    Readonly<
      ArticleGenerationContractV1
    >;

  runtime:
    ReplayInputV1[
      "runtime"
    ];

  run:
    Readonly<
      MasterWriterRunV1
    >;

  generator:
    unknown;

  context:
    Readonly<
      MasterArticleSemanticCriticContextV1
    >;

  siteDomain:
    ReplayInputV1[
      "siteDomain"
    ];

  alreadyRepairedSectionIndexes?:
    readonly number[];
}): Promise<
  Readonly<
    CompetitiveSerpReplayExecutionV2
  >
> {
  /*
   * Pass 1:
   * compare the exact post-critic accepted article against
   * the persisted SERP research.
   *
   * This replay is NOT persisted here.
   */
  const initialReplay =
    await executeSerpReplayV1({
      runtime,

      run,

      generator:
        generator as
          ReplayInputV1[
            "generator"
          ],

      siteDomain,
    });


  const repairPlan =
    buildCompetitiveReplayRepairPlanV2({
      contract,

      replay:
        initialReplay,
    });


  if (
    repairPlan.disposition !==
    "REPAIRABLE_SECTIONS"
  ) {
    return Object.freeze({
      version:
        "COMPETITIVE_SERP_REPLAY_EXECUTION_V2",

      initialReplay,

      finalReplay:
        initialReplay,

      repairPlan,

      run,

      postRepairCritics:
        null,

      repairs:
        Object.freeze([]),

      provenance:
        Object.freeze({
          replayExecutionCount:
            1 as const,

          postRepairCriticReplayCount:
            0 as const,

          repairAttemptCount:
            0,

          repairedSectionCount:
            0,

          repairSuppressedByPriorRepair:
            false,

          wholeArticleRewriteCount:
            0 as const,
        }),
    });
  }


  /*
   * No section may receive a second model repair.
   *
   * This includes:
   * - initial writer repair
   * - final article critic repair
   * - competitive SERP repair
   */
  const previouslyRepaired =
    new Set<number>([
      ...existingRepairIndexes(
        run
      ),

      ...alreadyRepairedSectionIndexes,
    ]);


  const conflicts =
    repairPlan.tasks.filter(
      (
        task
      ) =>
        previouslyRepaired.has(
          task.sectionIndex
        )
    );


  if (
    conflicts.length >
    0
  ) {
    /*
     * Do not partially mutate the article when one of the
     * competitive weaknesses would require a forbidden second
     * repair.
     *
     * Keep the original replay as the final diagnostic.
     * Publish Gate can consume READY/WARN/BLOCK normally.
     */
    return Object.freeze({
      version:
        "COMPETITIVE_SERP_REPLAY_EXECUTION_V2",

      initialReplay,

      finalReplay:
        initialReplay,

      repairPlan,

      run,

      postRepairCritics:
        null,

      repairs:
        Object.freeze([]),

      provenance:
        Object.freeze({
          replayExecutionCount:
            1 as const,

          postRepairCriticReplayCount:
            0 as const,

          repairAttemptCount:
            0,

          repairedSectionCount:
            0,

          repairSuppressedByPriorRepair:
            true,

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
      "COMPETITIVE_REPLAY_SECTION_REPAIR_CAPABILITY_REQUIRED"
    );
  }


  if (
    !supportsMasterSectionSemanticVerifier(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "COMPETITIVE_REPLAY_SECTION_SEMANTIC_VERIFIER_REQUIRED"
    );
  }


  const repairGenerator =
    generator;


  const semanticGenerator =
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
      ...run.semanticVerifications,
    ];


  const audits:
    CompetitiveSerpReplayRepairAuditV2[] =
      [];


  /*
   * Verification-only adapter.
   *
   * Competitive repair gets exactly ONE model repair call.
   * If the repaired result still fails deterministic or semantic
   * verification, verifyAndRepairGeneratedSectionV1() may attempt
   * its normal repair hook — which is explicitly forbidden here.
   */
  const verificationOnlyGenerator = {
    modelName:
      repairGenerator.modelName,

    verifySectionClaims:
      (
        input:
          Parameters<
            typeof semanticGenerator
              .verifySectionClaims
          >[0]
      ) =>
        semanticGenerator
          .verifySectionClaims(
            input
          ),

    async repairSection():
    Promise<never> {
      throw new ContentGenerationError(
        "COMPETITIVE_REPLAY_SECOND_REPAIR_FORBIDDEN"
      );
    },
  };


  for (
    const task
    of repairPlan.tasks
  ) {
    const arrayIndex =
      contract
        .sectionContracts
        .findIndex(
          (
            section
          ) =>
            section.sectionIndex ===
            task.sectionIndex
        );


    if (
      arrayIndex <
      0
    ) {
      throw new ContentGenerationError(
        `COMPETITIVE_REPLAY_SECTION_CONTRACT_MISSING:${task.sectionIndex}`
      );
    }


    const sectionContract =
      contract
        .sectionContracts[
          arrayIndex
        ];


    const section =
      sections[
        arrayIndex
      ];


    const reconciliation =
      reconciliations[
        arrayIndex
      ];


    const semanticVerification =
      semanticVerifications[
        arrayIndex
      ] ??
      null;


    if (
      !sectionContract ||
      !section ||
      !reconciliation
    ) {
      throw new ContentGenerationError(
        `COMPETITIVE_REPLAY_SECTION_STATE_MISSING:${task.sectionIndex}`
      );
    }


    let repairedSection;

    try {
      repairedSection =
        await repairGenerator
          .repairSection({
            contract:
              sectionContract,

            section,

            reconciliation,

            semanticVerification,

            attempt:
              1,

            competitiveReplayFindings: [
              {
                dimension:
                  task.dimensions
                    .join(
                      ", "
                    ),

                competitorUrls:
                  task.competitorUrls,

                reasons:
                  task.reasons,

                articleEvidenceIds:
                  task
                    .articleEvidenceIds,
              },
            ],
          });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "COMPETITIVE_REPLAY_SECTION_REPAIR_FAILED",
          String(
            task.sectionIndex
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
      verified =
        await verifyAndRepairGeneratedSectionV1({
          contract:
            sectionContract,

          section:
            repairedSection,

          generator:
            verificationOnlyGenerator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "COMPETITIVE_REPLAY_SECTION_VERIFICATION_FAILED",
          String(
            task.sectionIndex
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
      arrayIndex
    ] =
      verified.section;


    reconciliations[
      arrayIndex
    ] =
      verified.reconciliation;


    semanticVerifications[
      arrayIndex
    ] =
      verified
        .semanticVerification;


    audits.push({
      sectionIndex:
        task.sectionIndex,

      sectionNumber:
        task.sectionNumber,

      heading:
        task.heading,

      dimensions:
        task.dimensions,

      competitorUrls:
        task.competitorUrls,

      attemptCount:
        1 as const,
    });
  }


  const repairedRun =
    rebuildWriterRun({
      contract,

      run,

      sections,

      reconciliations,

      semanticVerifications,
    });


  /*
   * Any competitive repair changes reader-facing prose.
   *
   * Therefore replay ALL article critics again.
   * No second critic repair is allowed at this stage.
   */
  const postRepairCritics =
    await executeMasterArticleCriticsV1({
      contract,

      run:
        repairedRun,

      generator:
        generator as
          CriticInputV1[
            "generator"
          ],

      context,
    });


  assertMasterArticleCriticExecutionPassed(
    postRepairCritics
  );


  /*
   * Pass 2:
   * compare the exact repaired + reverified + re-criticized
   * article against the SAME persisted runtime/SERP snapshot.
   */
  const finalReplay =
    await executeSerpReplayV1({
      runtime,

      run:
        repairedRun,

      generator:
        generator as
          ReplayInputV1[
            "generator"
          ],

      siteDomain,
    });


  return Object.freeze({
    version:
      "COMPETITIVE_SERP_REPLAY_EXECUTION_V2",

    initialReplay,

    finalReplay,

    repairPlan,

    run:
      repairedRun,

    postRepairCritics,

    repairs:
      Object.freeze(
        audits.map(
          (
            audit
          ) =>
            Object.freeze({
              ...audit,

              dimensions:
                Object.freeze([
                  ...audit.dimensions,
                ]),

              competitorUrls:
                Object.freeze([
                  ...audit
                    .competitorUrls,
                ]),
            })
        )
      ),

    provenance:
      Object.freeze({
        replayExecutionCount:
          2 as const,

        postRepairCriticReplayCount:
          1 as const,

        repairAttemptCount:
          audits.length,

        repairedSectionCount:
          audits.length,

        repairSuppressedByPriorRepair:
          false,

        wholeArticleRewriteCount:
          0 as const,
      }),
  });
}
