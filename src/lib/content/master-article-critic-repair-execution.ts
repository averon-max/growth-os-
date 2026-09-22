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
  supportsMasterSectionRepairGenerator,
  verifyAndRepairGeneratedSectionV1,
} from "./master-section-repair";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";

import {
  ContentGenerationError,
} from "./generator";


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
        0 | 1;

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
   * IMPORTANT:
   *
   * This runs BEFORE any repair capability check or model call.
   *
   * Missing context, evidence authority, cannibalization,
   * ARTICLE/SHELL scope, etc. therefore fail without wasting an
   * LLM call.
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
      ...run
        .semanticVerifications,
    ];


  const audits:
    MasterArticleCriticSectionRepairAuditV1[] =
      [];


  /*
   * Explicitly forbid a hidden second LLM repair.
   *
   * verifyAndRepairGeneratedSectionV1() is reused because it
   * already owns:
   *
   * structural identity
   * -> deterministic reconciliation
   * -> semantic verification
   *
   * If the critic-repaired section still BLOCKS, its internal
   * repair hook throws immediately instead of calling the model
   * a second time.
   */
  const verificationOnlyGenerator = {
    modelName:
      repairGenerator.modelName,

    verifySectionClaims:
      (
        input:
          Parameters<
            typeof semanticGenerator.verifySectionClaims
          >[0]
      ) =>
        semanticGenerator
          .verifySectionClaims(
            input
          ),

    async repairSection():
    Promise<never> {
      throw new ContentGenerationError(
        "MASTER_CRITIC_REPAIR_SECOND_PASS_FORBIDDEN"
      );
    },
  };


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


    let repairedSection;


    try {
      /*
       * Exactly ONE critic-driven model repair for this section.
       */
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

            attempt:
              1,

            criticFindings:
              task.findings,
          });
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
       * Reuse the proven 9I-F validation transaction.
       *
       * Any structural / claim / semantic regression blocks.
       * No second model repair is permitted.
       */
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
                  (finding) =>
                    finding
                      .criticId
                )
              )
            )
          ),

        findingCodes:
          Object.freeze(
            task.findings.map(
              (finding) =>
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


  /*
   * Full replay.
   *
   * Do NOT replay only the critic that requested repair.
   * A localized edit can create a new coverage, evidence,
   * semantic-drift, intent, originality or technical defect.
   *
   * Therefore ALL 9 final critics execute again.
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
   * There is no recursive critic-repair loop.
   *
   * A second BLOCK after the one repair pass fails closed here.
   */
  assertMasterArticleCriticExecutionPassed(
    finalCritics
  );


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

        repairedSectionCount:
          audits.length,

        repairAttemptCount:
          audits.length,

        wholeArticleRewriteCount:
          0 as const,
      }),
  });
}
