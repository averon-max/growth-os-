import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  aggregateMasterArticleCriticSuiteV1,
  assertMasterArticleCriticSuitePassed,
  createMasterArticleCriticFindingV1,
  finalizeMasterArticleCriticResultV1,
  type MasterArticleCriticFindingV1,
  type MasterArticleCriticId,
  type MasterArticleCriticResultV1,
  type MasterArticleCriticSuiteV1,
} from "./master-article-critic";

import {
  runDeterministicMasterArticleCriticsV1,
} from "./master-article-deterministic-critics";

import {
  supportsMasterArticleSemanticCriticGenerator,
  type MasterArticleSemanticCriticContextV1,
  type MasterArticleSemanticCriticGenerator,
  type MasterArticleSemanticCriticRunV1,
  type MasterArticleSemanticFindingV1,
  type MasterArticleSemanticReviewId,
  type MasterArticleSemanticReviewV1,
} from "./master-article-semantic-critics";

import {
  ContentGenerationError,
} from "./generator";


export interface MasterArticleCriticExecutionV1 {
  version:
    "MASTER_ARTICLE_CRITIC_EXECUTION_V1";

  deterministicResults:
    readonly Readonly<
      MasterArticleCriticResultV1
    >[];

  semanticRun:
    Readonly<
      MasterArticleSemanticCriticRunV1
    >;

  suite:
    Readonly<
      MasterArticleCriticSuiteV1
    >;

  provenance:
    Readonly<{
      deterministicCriticCount:
        5;

      semanticReviewCount:
        5;

      finalCriticCount:
        9;

      semanticModelName:
        string;
    }>;
}


const SEMANTIC_TO_FINAL_CRITIC:
Readonly<
  Record<
    Exclude<
      MasterArticleSemanticReviewId,
      "DEEP_INTENT"
    >,
    MasterArticleCriticId
  >
> =
  Object.freeze({
    ORIGINALITY:
      "ORIGINALITY",

    EDITORIAL:
      "EDITORIAL",

    SEMANTIC_DRIFT:
      "SEMANTIC_DRIFT",

    CANNIBALIZATION:
      "CANNIBALIZATION",
  });


function deterministicResult({
  results,
  criticId,
}: {
  results:
    readonly Readonly<
      MasterArticleCriticResultV1
    >[];

  criticId:
    MasterArticleCriticId;
}): Readonly<
  MasterArticleCriticResultV1
> {
  const result =
    results.find(
      (candidate) =>
        candidate.criticId ===
        criticId
    );

  if (!result) {
    throw new ContentGenerationError(
      `MASTER_CRITIC_FUSION_DETERMINISTIC_RESULT_MISSING:${criticId}`
    );
  }

  return result;
}


function semanticReview({
  run,
  reviewId,
}: {
  run:
    Readonly<
      MasterArticleSemanticCriticRunV1
    >;

  reviewId:
    MasterArticleSemanticReviewId;
}): Readonly<
  MasterArticleSemanticReviewV1
> {
  const review =
    run.reviews.find(
      (candidate) =>
        candidate.reviewId ===
        reviewId
    );

  if (!review) {
    throw new ContentGenerationError(
      `MASTER_CRITIC_FUSION_SEMANTIC_REVIEW_MISSING:${reviewId}`
    );
  }

  return review;
}


function semanticFindingToFinalFinding({
  criticId,
  finding,
}: {
  criticId:
    MasterArticleCriticId;

  finding:
    Readonly<
      MasterArticleSemanticFindingV1
    >;
}): Readonly<
  MasterArticleCriticFindingV1
> {
  return createMasterArticleCriticFindingV1({
    criticId,

    code:
      finding.code,

    severity:
      finding.severity,

    location:
      finding.location,

    message:
      finding.message,

    recommendation:
      finding.recommendation,

    repairScope:
      finding.repairScope,

    evidence: {
      claimIds:
        finding.claimIds,

      evidenceIds:
        finding.evidenceIds,

      queryNodeIds:
        finding.queryNodeIds,

      sourceIds:
        finding.sourceIds,
    },
  });
}


function insufficientContextFinding({
  criticId,
  reviewId,
}: {
  criticId:
    MasterArticleCriticId;

  reviewId:
    MasterArticleSemanticReviewId;
}): Readonly<
  MasterArticleCriticFindingV1
> {
  return createMasterArticleCriticFindingV1({
    criticId,

    code:
      `${reviewId}_INSUFFICIENT_CONTEXT`,

    severity:
      "BLOCK",

    location: {
      scope:
        "ARTICLE",
    },

    message:
      `${reviewId} cannot be evaluated because authoritative comparison context is missing.`,

    recommendation:
      reviewId ===
      "ORIGINALITY"
        ? "Provide real comparison references before publication."
        : reviewId ===
          "CANNIBALIZATION"
          ? "Provide real existing-site cannibalization candidates before publication."
          : "Provide the authoritative context required for this review.",

    repairScope:
      "NONE",
  });
}


function semanticReviewToFinalResult({
  criticId,
  review,
  modelName,
}: {
  criticId:
    MasterArticleCriticId;

  review:
    Readonly<
      MasterArticleSemanticReviewV1
    >;

  modelName:
    string;
}): Readonly<
  MasterArticleCriticResultV1
> {
  if (
    review.status ===
    "INSUFFICIENT_CONTEXT"
  ) {
    return finalizeMasterArticleCriticResultV1({
      criticId,

      findings: [
        insufficientContextFinding({
          criticId,

          reviewId:
            review.reviewId,
        }),
      ],

      modelName,
    });
  }


  return finalizeMasterArticleCriticResultV1({
    criticId,

    findings:
      review.findings.map(
        (finding) =>
          semanticFindingToFinalFinding({
            criticId,
            finding,
          })
      ),

    modelName,
  });
}


function fuseIntentCritic({
  deterministic,
  semantic,
  modelName,
}: {
  deterministic:
    Readonly<
      MasterArticleCriticResultV1
    >;

  semantic:
    Readonly<
      MasterArticleSemanticReviewV1
    >;

  modelName:
    string;
}): Readonly<
  MasterArticleCriticResultV1
> {
  if (
    deterministic.criticId !==
    "INTENT"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_INTENT_DETERMINISTIC_ID_INVALID"
    );
  }


  if (
    semantic.reviewId !==
    "DEEP_INTENT"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_DEEP_INTENT_REVIEW_INVALID"
    );
  }


  if (
    semantic.status ===
    "INSUFFICIENT_CONTEXT"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_DEEP_INTENT_CONTEXT_INVALID"
    );
  }


  return finalizeMasterArticleCriticResultV1({
    criticId:
      "INTENT",

    findings: [
      ...deterministic
        .findings,

      ...semantic.findings
        .map(
          (finding) =>
            semanticFindingToFinalFinding({
              criticId:
                "INTENT",

              finding,
            })
        ),
    ],

    /*
     * The final INTENT critic is hybrid:
     * deterministic contract integrity + semantic intent review.
     * Execution-level provenance retains the semantic model name.
     */
    modelName,
  });
}


export async function executeMasterArticleCriticsV1({
  contract,
  run,
  generator,
  context,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  generator:
    unknown;

  context:
    Readonly<
      MasterArticleSemanticCriticContextV1
    >;
}): Promise<
  Readonly<
    MasterArticleCriticExecutionV1
  >
> {
  if (
    !supportsMasterArticleSemanticCriticGenerator(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_ARTICLE_SEMANTIC_CRITIC_CAPABILITY_REQUIRED"
    );
  }


  const semanticGenerator:
    MasterArticleSemanticCriticGenerator =
      generator;


  const deterministicResults =
    runDeterministicMasterArticleCriticsV1({
      contract,
      run,

      /*
       * RANK_READY_KEYWORD_AGGREGATOR_BINDING_V1
       */
      rankReadyKeywords:
        context.rankReadyKeywords,
    });


  if (
    deterministicResults.length !==
    5
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_DETERMINISTIC_COUNT_INVALID"
    );
  }


  let semanticRun:
    Readonly<
      MasterArticleSemanticCriticRunV1
    >;

  try {
    semanticRun =
      await semanticGenerator
        .reviewMasterArticleSemantics({
          contract,
          run,
          context,
        });
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error
          );

    throw new ContentGenerationError(
      `MASTER_ARTICLE_SEMANTIC_CRITIC_EXECUTION_FAILED:${message}`
    );
  }


  if (
    semanticRun.version !==
    "MASTER_ARTICLE_SEMANTIC_CRITIC_RUN_V1"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_SEMANTIC_RUN_VERSION_INVALID"
    );
  }


  if (
    semanticRun.modelName !==
    semanticGenerator.modelName
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_SEMANTIC_MODEL_PROVENANCE_MISMATCH"
    );
  }


  if (
    semanticRun.reviews.length !==
    5
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_FUSION_SEMANTIC_COUNT_INVALID"
    );
  }


  const intent =
    fuseIntentCritic({
      deterministic:
        deterministicResult({
          results:
            deterministicResults,

          criticId:
            "INTENT",
        }),

      semantic:
        semanticReview({
          run:
            semanticRun,

          reviewId:
            "DEEP_INTENT",
        }),

      modelName:
        semanticRun.modelName,
    });


  const originality =
    semanticReviewToFinalResult({
      criticId:
        "ORIGINALITY",

      review:
        semanticReview({
          run:
            semanticRun,

          reviewId:
            "ORIGINALITY",
        }),

      modelName:
        semanticRun.modelName,
    });


  const editorial =
    semanticReviewToFinalResult({
      criticId:
        "EDITORIAL",

      review:
        semanticReview({
          run:
            semanticRun,

          reviewId:
            "EDITORIAL",
        }),

      modelName:
        semanticRun.modelName,
    });


  const semanticDrift =
    semanticReviewToFinalResult({
      criticId:
        "SEMANTIC_DRIFT",

      review:
        semanticReview({
          run:
            semanticRun,

          reviewId:
            "SEMANTIC_DRIFT",
        }),

      modelName:
        semanticRun.modelName,
    });


  const cannibalization =
    semanticReviewToFinalResult({
      criticId:
        "CANNIBALIZATION",

      review:
        semanticReview({
          run:
            semanticRun,

          reviewId:
            "CANNIBALIZATION",
        }),

      modelName:
        semanticRun.modelName,
    });


  const finalResults =
    Object.freeze([
      intent,

      deterministicResult({
        results:
          deterministicResults,

        criticId:
          "COVERAGE",
      }),

      deterministicResult({
        results:
          deterministicResults,

        criticId:
          "EVIDENCE_YMYL",
      }),

      originality,

      editorial,

      semanticDrift,

      cannibalization,

      deterministicResult({
        results:
          deterministicResults,

        criticId:
          "INTERNAL_LINKS",
      }),

      deterministicResult({
        results:
          deterministicResults,

        criticId:
          "TECHNICAL_SEO",
      }),
    ]);


  const suite =
    aggregateMasterArticleCriticSuiteV1({
      results:
        finalResults,
    });


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_EXECUTION_V1" as const,

    deterministicResults:
      Object.freeze([
        ...deterministicResults,
      ]),

    semanticRun,

    suite,

    provenance:
      Object.freeze({
        deterministicCriticCount:
          5 as const,

        semanticReviewCount:
          5 as const,

        finalCriticCount:
          9 as const,

        semanticModelName:
          semanticRun
            .modelName,
      }),
  });
}


export function assertMasterArticleCriticExecutionPassed(
  execution:
    Readonly<
      MasterArticleCriticExecutionV1
    >
): void {
  assertMasterArticleCriticSuitePassed(
    execution.suite
  );
}
