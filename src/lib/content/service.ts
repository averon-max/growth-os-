import type { RelatedKeywordResult } from "@/lib/keywords/dataforseo-provider";
import {
  assertFinalArticleVersionIntegrityV1,
} from "./final-article-version-integrity-v1";

import {
  assertArticlePreWriterAnswerSupportV2,
  assertArticlePreWriterRequiredCoverageV1,
} from "./article-prewriter-evidence-gate-v1";
import {
  assertArticlePreWriterEvidenceReadyV1,
} from "./article-prewriter-evidence-gate-v1";
import {
  assertPreWriterMissionAuthorityV1,
} from "./article-prewriter-mission-authority-gate-v1";

import {
  classifyRejectedRecoveryV1,
  formatRejectedRecoveryForPersistenceV1,
} from "./rejected-recovery-v1";

import type {
  ArticleTemplateIdV1,
} from "./article-template-policy-v1";

import {
  buildProductionFinalArticleReadinessV1,
  formatProductionFinalArticleReadinessFailureV1,
} from "./production-final-article-readiness-adapter-v1";

import {
  assertBestOpportunityWinnerAppliedV1,
  assertExactKeywordDidNotDriftV1,
  type ContentGenerationModeV1,
  type ContentGenerationPolicyV1,
} from "./content-generation-mode-v1";

import {
  inspectProductionMasterRuntimePlan,
} from "./production-master-runtime-readiness";

import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";

import {
  buildArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  bindArticleExecutionPlanToGenerationContractV1,
  parsePersistedArticleExecutionPlanV1,
} from "./article-execution-plan-binding-v1";

import {
  executeMasterWriterV1,
} from "./master-writer-orchestrator";

import {
  writeArticleRecoveryCheckpointV1,
} from "./article-recovery-checkpoint-v1";
import {
  fingerprintMasterWriterContractV1,
  readMasterWriterSectionProgressV1,
  writeMasterWriterSectionProgressV1,
} from "./master-writer-section-progress-v1";



import {
  buildMasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critic-context";

import {
  buildCrawlCannibalizationCandidatesV1,
} from "./crawl-cannibalization-context";

import {
  executeMasterArticleCriticsV1,
} from "./master-article-critic-fusion";

import {
  executeMasterArticleCriticRepairReplayV1,
} from "./master-article-critic-repair-execution";

import type {
  SerpReplayV1,
} from "./serp-replay";

import {
  executeCompetitiveSerpReplayRepairV2,
} from "./competitive-serp-replay-execution-v2";

import {
  createSerpReplayArtifactV1,
  createSerpReplayFailureArtifactV1,
} from "./serp-replay-artifact";

import {
  planProductionMasterArtifactsFromLiveSources,
  ProductionMasterLiveStagePlanError,
} from "./production-master-live-stage-planner";

import {
  parseOptionalExplicitSearchMissionInput,
} from "./search-mission-ingress";

import {
  prepareProductionMasterBriefRuntime,
  type ProductionMasterBriefArtifactInput,
} from "./production-master-brief-ingress";

import {
  assertProductionMasterBriefReady,
} from "./production-master-brief-required";

import {
  buildResearchPack,
  researchPackPrompt,
} from "./research-pack";

import {
  externalEvidenceSourcesPrompt,
  extractExternalEvidenceSources,
  withExternalEvidenceSources,
} from "./external-evidence-sources";

import {
  buildEvidenceAwareOutline,
} from "./evidence-aware-planning";

import {
  resolveEvidenceDeferredMasterScopeV1,
} from "./evidence-deferred-master-scope";

import {
  resolvePublicationEvidenceSectionScopeV1,
} from "./publication-evidence-section-scope";

import {
  buildSearchBlueprint,
} from "./search-blueprint";

import {
  businessFactPrompt,
} from "./business-facts";

import {
  getBusinessFactRegistryForWebsite,
} from "./business-fact-repository";

import {
  createContentEvidenceSnapshot,
  getBusinessFactRegistryForBrief,
} from "./evidence-snapshot";

import {
  assertContentGatePassed,
  evaluateContentGate,
  formatContentGateFailure,
} from "./content-gate";

import {
  prisma,
} from "@/lib/prisma";

import type {
  Prisma,
} from "@prisma/client";

import type {
  ContentGenerator,
} from "./generator";

import type {
  CMSProvider,
} from "@/lib/cms/provider";

import {
  ContentGenerationError,
} from "./generator";

import type {
  ContentBriefInput,
  ContentStrategy,
} from "./types";

import type {
  ExplicitSearchMissionInput,
} from "./search-mission-ingress";


import {
  getWebsiteKeywordContext,
} from "./keyword-context";

import {
  normalizeOutline,
} from "./seo-strategy";

import {
  buildFinalContentPlan,
  finalPlanPrompt,
} from "./final-content-plan";

import {
  auditArticle,
} from "./content-quality";

import {
  analyzeArticleAgainstPlan,
} from "./content-plan-analysis";

import {
  assertEditorialFindingsResolved,
  shouldRewriteEditorialFindings,
} from "./editorial-policy";

import {
  assertArticlePublicationPolicyPassed,
  evaluateArticlePublicationPolicy,
  formatArticlePublicationPolicyFailure,
} from "./article-publication-policy";

import {
  assertExplicitPublishGatePassedV1,
  evaluateExplicitPublishGateV1,
} from "./publish-gate";

import {
  assertStoredPublicationEvidenceV1,
} from "./stored-publication-evidence-gate-v1";


function isTransientContentProviderFailure(
  error:
    unknown
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : "";

  return (
    /(?:Gemini|Groq) API error (413|429|500|502|503|504)\b/.test(
      message
    ) ||
    /AbortError|aborted|timeout/i.test(
      message
    )
  );
}


async function analyzeStoredContentPlan({
  briefId,
  title,
  metaDescription,
  h1,
  bodyMarkdown,
  primaryKeyword,
  secondaryKeywords,
}: {
  briefId: string;
  title: string;
  metaDescription?: string | null;
  h1: string;
  bodyMarkdown: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
}) {
  const evidence =
    await prisma.contentEvidenceSnapshot.findUnique({
      where: {
        briefId,
      },

      select: {
        plan:
          true,
      },
    });

  return analyzeArticleAgainstPlan({
    title,
    metaDescription,
    h1,
    bodyMarkdown,
    primaryKeyword,
    secondaryKeywords,

    plan:
      evidence?.plan ??
      null,
  });
}


function logContentIntelligence(
  briefId: string,
  intelligence: Awaited<
    ReturnType<
      typeof analyzeStoredContentPlan
    >
  >
): void {
  console.info(
    "[content intelligence]",
    {
      briefId,

      planAvailable:
        intelligence
          .planAvailable,

      confidence:
        intelligence
          .confidence,

      structure: {
        h1:
          intelligence
            .article
            .structure
            .totalH1,

        h2:
          intelligence
            .article
            .structure
            .h2,

        h3:
          intelligence
            .article
            .structure
            .h3,

        words:
          intelligence
            .article
            .wordCount,
      },

      plannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .planned,

      usedPlannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .used,

      missingPlannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .missing,

      topicCoverage: {
        covered:
          intelligence
            .topics
            .covered,

        total:
          intelligence
            .topics
            .total,
      },

      questionCoverage: {
        covered:
          intelligence
            .questions
            .covered,

        total:
          intelligence
            .questions
            .total,
      },

      structurallyValid:
        intelligence
          .article
          .structurallyValid,

      warnings:
        intelligence
          .warnings,
    }
  );
}



export interface CreateBriefInput {
  outcomeActionId?: string;
  requiredPrimaryKeyword?: string;
  /** Server-validated V2 research observations (never client JSON). */
  relatedKeywordEvidence?: readonly RelatedKeywordResult[];
  websiteId: string;
  opportunityId?: string;
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;

  /**
   * Explicit SearchMission semantics.
   *
   * Never infer these fields from keyword, URL,
   * business name, industry, SERP, or competitors.
   */
  searchMission?:
    ExplicitSearchMissionInput;
}


function strategyPrompt(
  strategy:
    ContentStrategy
): string {
  const secondary =
    strategy.secondary
      .map(
        (item) =>
          item.keyword
      )
      .join(", ");

  /*
   * SECONDARY_CLUSTER_PRODUCTION_PROJECTION_V2
   *
   * Supporting discovery candidates remain research-only.
   * They are not promoted into article keywords.
   *
   * Production keyword authority:
   * primary + Keyword Decision secondary.
   *
   * QueryGraph remains downstream SAME_PAGE authority.
   */
  return [
    "CONTENT STRATEGY:",
    `Intent: ${strategy.searchIntent}`,
    `Primary keyword: ${strategy.primary.keyword}`,
    secondary
      ? `Secondary keywords: ${secondary}`
      : "",
    `Page decision: ${strategy.action.type}`,
    "Use exactly one page-level H1.",
    "There is NO target number of H2 or H3 headings.",
    "Create an H2 only for a genuinely distinct major sub-intent, question, process stage, comparison, or concept required to satisfy the query.",
    "Create an H3 only when one specific H2 genuinely needs subdivision. Never add H3 headings merely to increase structure.",
    "Do not create headings solely to repeat keywords.",
    "Answer the main query directly near the beginning.",
    "Avoid keyword stuffing.",
    "Keep synonymous queries with the same intent on one page.",
    "Do not invent facts, statistics, sources, security claims, or studies.",
    "Prefer concise definitions, direct answers, lists, steps, comparisons, and extractable factual statements where appropriate.",
  ]
    .filter(Boolean)
    .join("\n");
}


export async function createContentBrief(
  generator:
    ContentGenerator,
  input:
    CreateBriefInput & {
      /**
       * Explicit real Stage 1-8 production inputs.
       *
       * Never derive this bundle from finalPlan,
       * searchBlueprintShadow, generated outline,
       * keyword strings, or SERP snippets.
       */
      masterArtifacts?:
        ProductionMasterBriefArtifactInput;

      /*
       * CONTENT_GENERATION_POLICY_V1
       */
      templateOverride?:
    ArticleTemplateIdV1 | null;

  generationMode?:
        ContentGenerationModeV1;

      exactKeyword?:
        string;

      generationPolicy?:
        Readonly<ContentGenerationPolicyV1>;
    }
) {
  const [
    finalPlan,
    context,
  ] =
    await Promise.all([
      buildFinalContentPlan({
        websiteId:
          input.websiteId,

        topic:
          input.topic,

        businessName:
          input.businessName,

        /*
         * EXACT_KEYWORD:
         * lock before Content Strategy becomes FinalContentPlan.
         *
         * BEST_OPPORTUNITY:
         * undefined => existing scorer remains authoritative.
         */
        requiredPrimaryKeyword:
          input.requiredPrimaryKeyword,
        relatedKeywordEvidence:
          input.relatedKeywordEvidence,
      }),

      getWebsiteKeywordContext(
        input.websiteId
      ).catch(
        () => null
      ),
    ]);

  const strategy =
    finalPlan.strategy;

  if (
    input.requiredPrimaryKeyword
  ) {
    const requiredPrimaryKeyword =
      input.requiredPrimaryKeyword
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        );

    const plannedPrimaryKeyword =
      strategy.primary.keyword
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        );

    if (
      requiredPrimaryKeyword !==
      plannedPrimaryKeyword
    ) {
      throw new Error(
        `Content plan primary keyword "${strategy.primary.keyword}" does not match required Outcome Action keyword "${input.requiredPrimaryKeyword}".`
      );
    }
  }

  const factRegistry =
    await getBusinessFactRegistryForWebsite(
      input.websiteId
    );

  const relatedKeywords:
    ContentBriefInput["relatedKeywords"] =
      /*
       * SECONDARY_CLUSTER_PRODUCTION_PROJECTION_V2
       *
       * Research context: canonical primary and eligible secondary
       * queries, plus same-page supporting observations. Supporting
       * queries are NOT promoted into persisted secondaryKeywords or
       * required exact-match usage; they inform subtopic decisions only.
       */
      [
        strategy.primary,
        ...strategy.secondary,
        ...strategy.supporting,
      ]
        .slice(0, 20)
        .map(
          (keyword) => ({
            keyword:
              keyword.keyword,

            searchVolume:
              keyword.searchVolume,

            cpc:
              keyword.cpc,

            keywordDifficulty:
              keyword.difficulty,
          })
        );

  const searchBlueprintShadow =
    buildSearchBlueprint({
      plan:
        finalPlan,

      businessFacts:
        factRegistry,
    });

  console.info(
    "[content shadow] search blueprint",
    {
      version:
        searchBlueprintShadow.version,

      readiness:
        searchBlueprintShadow.readiness,

      productionPrimary:
        searchBlueprintShadow
          .decision
          .productionPrimaryKeyword,

      recommendedPrimary:
        searchBlueprintShadow
          .decision
          .recommendedPrimaryKeyword,

      primaryChanged:
        searchBlueprintShadow
          .decision
          .primaryChanged,

      action:
        searchBlueprintShadow
          .decision
          .action,

      keywordDecision:
        searchBlueprintShadow
          .decision
          .keywordDecisionStatus,

      keywordDecisionConfidence:
        searchBlueprintShadow
          .decision
          .keywordDecisionConfidence,

      serpFeasibility:
        searchBlueprintShadow
          .decision
          .serpFeasibility,

      serpConfidence:
        searchBlueprintShadow
          .decision
          .serpConfidence,

      blockers:
        searchBlueprintShadow
          .governance
          .blockers,

      reviews:
        searchBlueprintShadow
          .governance
          .reviews,
    }
  );

  /*
   * BEST_OPPORTUNITY_NO_GO_EARLY_STOP_V2
   *
   * A NO_GO research decision must never enter the expensive
   * Evidence -> Writer -> Critic article pipeline.
   *
   * BEST_OPPORTUNITY may continue only with a SELECTED
   * Keyword Decision winner.
   */
  if (
    input.generationPolicy?.mode ===
      "BEST_OPPORTUNITY" &&
    searchBlueprintShadow
      .decision
      .keywordDecisionStatus !==
      "SELECTED"
  ) {
    /*
       * BEST_OPPORTUNITY_COLD_START_BLUEPRINT_REVIEW_V2
       *
       * KeywordDecision intentionally remains fail-closed when a new
       * site has no GSC/rank/authority evidence.
       *
       * A later SearchBlueprint may continue ONLY when live SERP
       * evidence independently confirms the exact production mission:
       *
       * - LOW-confidence NO_GO only
       * - exact production mission preserved
       * - CREATE_NEW only
       * - FAVORABLE / HIGH live SERP
       * - zero governance blockers
       *
       * This is NOT a global NO_GO bypass.
       */
      const bestOpportunityColdStartReviewV2 =
        searchBlueprintShadow.readiness ===
          "REVIEW" &&
        searchBlueprintShadow.decision
          .keywordDecisionStatus ===
          "NO_GO" &&
        searchBlueprintShadow.decision
          .keywordDecisionConfidence ===
          "LOW" &&
        /*
         * BEST_OPPORTUNITY_COLD_START_MERGE_UPDATE_V3
         *
         * CREATE_NEW and MERGE_OR_UPDATE are both legal continuation
         * actions for the already-proven cold-start mission path.
         *
         * MERGE_OR_UPDATE is especially important when SearchBlueprint
         * detected existing-content overlap and explicitly prevents a
         * competing URL.
         *
         * All other cold-start safety conditions remain mandatory.
         */
        (
          searchBlueprintShadow
            .decision
            .action ===
            "CREATE_NEW" ||
          searchBlueprintShadow
            .decision
            .action ===
            "MERGE_OR_UPDATE"
        ) &&
        searchBlueprintShadow.decision
          .primaryChanged ===
          false &&
        searchBlueprintShadow.decision
          .productionPrimaryKeyword ===
          strategy.primary.keyword &&
        searchBlueprintShadow.decision
          .recommendedPrimaryKeyword ===
          strategy.primary.keyword &&
        searchBlueprintShadow.decision
          .serpFeasibility ===
          "FAVORABLE" &&
        searchBlueprintShadow.decision
          .serpConfidence ===
          "HIGH" &&
        searchBlueprintShadow.governance
          .blockers.length ===
          0 &&
        searchBlueprintShadow.governance
          .reviews.includes(
            "LOW_CONFIDENCE_PRIMARY_MISSION_PRESERVED"
          );


      if (
        !bestOpportunityColdStartReviewV2
      ) {
        throw new Error(
          "CONTENT_BEST_OPPORTUNITY_NO_ELIGIBLE_WINNER"
        );
      }


      console.info(
        "[content best opportunity cold start review]",
        {
          marker:
            "BEST_OPPORTUNITY_COLD_START_BLUEPRINT_REVIEW_V2",

          productionPrimary:
            strategy.primary.keyword,

          serpFeasibility:
            searchBlueprintShadow
              .decision
              .serpFeasibility,

          serpConfidence:
            searchBlueprintShadow
              .decision
              .serpConfidence,

          blockers:
            searchBlueprintShadow
              .governance
              .blockers,
        }
      );
  }


  /*
   * STAGE 9N-B4
   * -----------
   *
   * Production brief creation must construct Stage 1-8 from
   * current live research when a caller has not supplied an
   * already-validated artifact bundle.
   *
   * IMPORTANT:
   * - no finalPlan -> masterRuntime reconstruction
   * - no searchBlueprintShadow -> masterRuntime reconstruction
   * - no fake numeric metrics
   * - no implicit SearchMission synthesis
   * - no legacy article fallback
   */
  const missionIngress =
    parseOptionalExplicitSearchMissionInput(
      input.searchMission ??
      null
    );

  if (
    !missionIngress.ok
  ) {
    throw new ProductionMasterLiveStagePlanError(
      missionIngress.code,
      missionIngress.error
    );
  }

  const explicitSearchMission =
    missionIngress.value;

  if (
    !input.masterArtifacts &&
    !explicitSearchMission
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_SEARCH_MISSION_REQUIRED",
      "A validated SearchMission is required before live Stage 1-8 research can run."
    );
  }

  const liveMaster =
    input.masterArtifacts
      ? null
      : await planProductionMasterArtifactsFromLiveSources({
          liveSourceInput: {
            websiteId:
              input.websiteId,

            /*
             * PRODUCTION_PRIMARY_LIVE_RESEARCH_AUTHORITY_V1
             *
             * input.topic remains the broad semantic mission seed.
             *
             * Live keyword/SERP research MUST run against the
             * already-selected Content Strategy production primary.
             *
             * This prevents:
             *   brief.primaryKeyword != research.keyword
             *   research.keyword != ArticleExecutionPlan.primaryQuery
             *
             * EXACT_KEYWORD is already locked into strategy.primary.
             * BEST_OPPORTUNITY is already selected into strategy.primary.
             *
             * Therefore this does not create a second keyword authority.
             */
            keyword:
              strategy.primary.keyword,

            ...(
              explicitSearchMission
                ? {
                    locationName:
                      explicitSearchMission.location,

                    ...(
                      explicitSearchMission.jurisdiction
                        ? {
                            countryCode:
                              explicitSearchMission.jurisdiction,
                          }
                        : {}
                    ),

                    languageCode:
                      explicitSearchMission.language,
                  }
                : {}
            ),
          },

          mission: {
          templateOverride:
            input.templateOverride ??
            null,

            websiteId:
              input.websiteId,

            topic:
              input.topic,

            audience:
              explicitSearchMission!.audience,

            readerGoal:
              explicitSearchMission!.readerGoal,

            businessRelationship:
              explicitSearchMission!
                .businessRelationship,

            jurisdiction:
              explicitSearchMission!
                .jurisdiction,

            language:
              explicitSearchMission!.language,

            location:
              explicitSearchMission!.location,

            riskClass:
              explicitSearchMission!.riskClass,

            /*
             * Query intent is already a constrained production
             * enum in ContentStrategy. The cast is expressed
             * through the planner contract so contract drift
             * becomes a TypeScript failure.
             */
            missionIntent:
              strategy.searchIntent as
                Parameters<
                  typeof planProductionMasterArtifactsFromLiveSources
                >[0]["mission"]["missionIntent"],
          },
        });

  const effectiveSearchMission =
    liveMaster
      ?.searchMissionInput ??
    explicitSearchMission;

  const effectiveMasterArtifacts =
    liveMaster
      ?.masterArtifacts ??
    input.masterArtifacts;

  const productionMaster =
    prepareProductionMasterBriefRuntime({
      websiteId:
        input.websiteId,

      topic:
        input.topic,

      searchMissionInput:
        effectiveSearchMission ??
        null,

      masterArtifacts:
        effectiveMasterArtifacts,
    });

  console.info(
    "[content master runtime]",
    {
      readiness:
        productionMaster
          .readiness
          .readiness,

      blockers:
        productionMaster
          .readiness
          .blockers,

      adapterBlockers:
        productionMaster
          .readiness
          .adapterBlockers,

      persisted:
        productionMaster
          .masterRuntime !==
        null,
    }
  );


  /*
   * Production invariant:
   *
   * Never create another ContentBrief from legacy planning
   * artifacts alone.
   *
   * SearchBlueprintShadow/finalPlan may remain persisted as
   * historical evidence, but article production requires the
   * explicit Stage 1-8 MasterRuntime.
   *
   * This assertion intentionally runs BEFORE generateBrief()
   * and BEFORE prisma.contentBrief.create().
   */
  assertProductionMasterBriefReady(
    productionMaster
  );


  /* BRIEF_PRE_PERSIST_ANSWER_SUPPORT_GATE_V1 */
  if (!liveMaster?.articleExecutionPlan) {
    throw new Error("BRIEF_ARTICLE_EXECUTION_PLAN_MISSING");
  }
  assertArticlePreWriterEvidenceReadyV1(
    liveMaster.articleExecutionPlan
  );
  assertArticlePreWriterRequiredCoverageV1(
    liveMaster.articleExecutionPlan
  );
  assertArticlePreWriterAnswerSupportV2(
    liveMaster.articleExecutionPlan
  );
  assertPreWriterMissionAuthorityV1({
    sections: liveMaster.articleExecutionPlan.sections,
    blueprints: productionMaster.masterRuntime!.sectionBlueprints.sections,
  });

  const briefInput:
    ContentBriefInput = {
      topic:
        input.topic,

      reason:
        input.reason,

      recommendation:
        [
          input.recommendation,
          strategyPrompt(
            strategy
          ),

          finalPlanPrompt(
            finalPlan
          ),

          businessFactPrompt(
            factRegistry
          ),
        ].join(
          "\n\n"
        ),

      businessName:
        input.businessName,

      websiteUrl:
        input.websiteUrl,

      topKeywords:
        context?.topKeywords,

      relatedKeywords,

      strategy,
    };

  const generated =
    await generator.generateBrief(
      briefInput
    );

  const outline =
    normalizeOutline(
      generated.outline,
      strategy
    );

  const createdBrief =
    await prisma.contentBrief.create({
      data: {
        websiteId:
          input.websiteId,

        opportunityId:
          input.opportunityId,

        outcomeActionId:
          input.outcomeActionId,

        topic:
          input.topic,

        searchIntent:
          strategy.searchIntent,

        primaryKeyword:
          strategy.primary
            .keyword,

        secondaryKeywords:
          strategy.secondary.map(
            (item) =>
              item.keyword
          ),

        outline:
          outline as unknown as
            Prisma.InputJsonValue,

        status:
          "READY",

        generatedBy:
          generator.modelName,
      },
    });

  try {
    await createContentEvidenceSnapshot({
      briefId:
        createdBrief.id,

      websiteId:
        input.websiteId,

      topic:
        input.topic,

      primaryKeyword:
        strategy.primary.keyword,

      searchIntent:
        strategy.searchIntent,

      plan:
        withExternalEvidenceSources({
          ...finalPlan,

          searchBlueprintShadow,

          searchMissionInput:
            productionMaster
              .searchMissionInput,

          /*
           * PERSIST_ARTICLE_EXECUTION_PLAN_V1
           *
           * Persist the exact Research -> Writer execution decision
           * beside Master Runtime so generation/replay never needs
           * to reconstruct coverage from legacy outlines.
           */
          ...(
            liveMaster
              ?.articleExecutionPlan
              ? {
                  articleExecutionPlan:
                    liveMaster
                      .articleExecutionPlan,
                }
              : {}
          ),

          ...(
            productionMaster
              .masterRuntime !==
            null
              ? {
                  masterRuntime:
                    productionMaster
                      .masterRuntime,
                }
              : {}
          ),

          masterRuntimeReadiness:
            productionMaster
              .readiness,
        }),

      businessFacts:
        factRegistry,

      keywordContext:
        context,

      generatorModel:
        generator.modelName,
    });
  } catch (error) {
    await prisma.contentBrief.delete({
      where: {
        id:
          createdBrief.id,
      },
    }).catch(
      () => undefined
    );

    throw error;
  }

    /*
   * CONTENT_BEST_OPPORTUNITY_PRODUCTION_WINNER_V1
   *
   * BEST_OPPORTUNITY uses the EXISTING strategy winner:
   * finalPlan.strategy.primary.
   *
   * No second keyword selector exists here.
   */
  if (
    input.generationPolicy
  ) {
    assertBestOpportunityWinnerAppliedV1({
      policy:
        input.generationPolicy,

      strategyPrimary:
        strategy.primary.keyword,

      productionPrimary:
        createdBrief.primaryKeyword,
    });
  }

  /*
   * CONTENT_EXACT_KEYWORD_PRODUCTION_LOCK_V1
   *
   * EXACT_KEYWORD:
   * Research may expand supporting coverage,
   * but production primary must remain the user-selected query.
   */
  if (
    input.generationPolicy
  ) {
    assertExactKeywordDidNotDriftV1({
      policy:
        input.generationPolicy,

      productionPrimary:
        createdBrief.primaryKeyword,
    });
  }

return createdBrief;
}


export async function generateArticleFromBrief(
  generator:
    ContentGenerator,
  briefId:
    string
) {
  const brief =
    await prisma.contentBrief.findUnique({
      where: {
        id:
          briefId,
      },

      include: {
        website: {
          include: {
            business:
              true,
          },
        },
      },
    });

  if (!brief) {
    throw new Error(
      "Content brief not found"
    );
  }

  const factRegistry =
    await getBusinessFactRegistryForBrief({
      briefId:
        brief.id,

      websiteId:
        brief.websiteId,
    });

  const generationSnapshot =
    await prisma
      .contentEvidenceSnapshot
      .findUnique({
        where: {
          briefId:
            brief.id,
        },

        select: {
          plan:
            true,
        },
      });

  const productionMasterReadiness =
    inspectProductionMasterRuntimePlan(
      generationSnapshot
        ?.plan ??
      null
    );

  if (
    productionMasterReadiness
      .readiness !==
    "READY"
  ) {
    throw new ContentGenerationError(
      [
        "PRODUCTION_MASTER_RUNTIME_BLOCKED",
        ...productionMasterReadiness
          .blockers,
        ...productionMasterReadiness
          .adapterBlockers,
      ].join(
        ":"
      )
    );
  }

  const masterRuntimeInspection =
    inspectMasterRuntimeSnapshot(
      generationSnapshot
        ?.plan ??
      null
    );

  if (
    !masterRuntimeInspection
      .runtime
  ) {
    throw new ContentGenerationError(
      [
        "PRODUCTION_MASTER_RUNTIME_INVALID",
        ...masterRuntimeInspection
          .blockers,
      ].join(
        ":"
      )
    );
  }

  /*
   * LOAD_PERSISTED_ARTICLE_EXECUTION_PLAN_V1
   *
   * Never reconstruct coverage from brief.outline or another
   * parallel planner during generation.
   */
  const generationPlanRecord =
    generationSnapshot
      ?.plan &&
    typeof generationSnapshot
      .plan ===
      "object" &&
    !Array.isArray(
      generationSnapshot
        .plan
    )
      ? generationSnapshot
          .plan as unknown as
            Record<
              string,
              unknown
            >
      : null;


  const persistedArticleExecutionPlan =
    parsePersistedArticleExecutionPlanV1(
      generationPlanRecord
        ?.articleExecutionPlan
    );




  /*
   * ARTICLE_PREWRITER_EVIDENCE_GATE_V1
   *
   * MUST coverage that was deferred for missing verified
   * evidence is an upstream planning/evidence blocker.
   * Never spend a Writer call trying to compensate for it.
   */
  assertArticlePreWriterEvidenceReadyV1(
    persistedArticleExecutionPlan
  );

  /*
   * ARTICLE_PREWRITER_REQUIRED_COVERAGE_PRODUCTION_WIRING_V1
   *
   * Evidence contraction may shrink optional scope,
   * but MUST coverage must still have a WRITABLE owner.
   *
   * Fail BEFORE ArticleGenerationContract / Writer creation.
   */
  assertArticlePreWriterRequiredCoverageV1(
    persistedArticleExecutionPlan
  );

  /*
   * ARTICLE_PREWRITER_ANSWER_SUPPORT_PRODUCTION_WIRING_V2
   *
   * Coverage ownership alone does not authorize Writer.
   *
   * A MUST question whose post-contraction section has lost
   * its required claim/evidence authority is routed as a typed
   * upstream evidence defect before any Writer tokens are spent.
   */
  assertArticlePreWriterAnswerSupportV2(
    persistedArticleExecutionPlan
  );
  assertPreWriterMissionAuthorityV1({
    sections: persistedArticleExecutionPlan.sections,
    blueprints: masterRuntimeInspection.runtime.sectionBlueprints.sections,
  });
/*
   * EVIDENCE_DEFERRED_EFFECTIVE_RUNTIME_V1
   *
   * ArticleGenerationContract creation is deliberately delayed
   * until evidence-aware planning has finalized publishable scope.
   */


  const researchPack =
    buildResearchPack({
      brief: {
        topic:
          brief.topic,

        primaryKeyword:
          brief.primaryKeyword,

        searchIntent:
          brief.searchIntent,

        secondaryKeywords:
          brief.secondaryKeywords,
      },

      planSnapshot:
        generationSnapshot
          ?.plan ??
        null,

      businessFacts:
        factRegistry,
    });

  const externalEvidenceSources =
    extractExternalEvidenceSources(
      generationSnapshot
        ?.plan ??
      null
    );

  const externalEvidenceContext =
    externalEvidenceSourcesPrompt(
      externalEvidenceSources
    );

  const articleOutlinePlan =
    buildEvidenceAwareOutline({
      outline:
        brief.outline as {
          heading: string;
          level: 2 | 3;
          summary: string;
        }[],

      externalEvidenceSources,
    });

  /*
   * Evidence-aware planner owns the DEFER decision.
   *
   * The resolver only maps an already-deferred outline topic to
   * the corresponding Master section identity.
   *
   * A section with assigned requiredClaims or evidenceIds cannot
   * be removed by the resolver.
   */
  /*
   * LEGACY_EVIDENCE_OUTLINE_DIAGNOSTIC_ONLY_V1
   *
   * This result MUST NOT determine Writer structure after
   * ArticleExecutionPlan has been persisted.
   */
  /*
   * LEGACY_EVIDENCE_OUTLINE_DIAGNOSTIC_RESULT_V1
   *
   * Kept only for compatibility / diagnostics.
   *
   * This value MUST NOT participate in:
   * - deferredMasterIndexes
   * - effectiveMasterSections
   * - ArticleGenerationContract section selection
   * - Writer job count
   */
  const evidenceDeferredMasterScope =
    resolveEvidenceDeferredMasterScopeV1({
      blueprints:
        masterRuntimeInspection
          .runtime
          .sectionBlueprints
          .sections,

      deferredSections:
        articleOutlinePlan
          .deferredSections,
    });


  /*
   * PUBLICATION_EVIDENCE_DEFERRED_SCOPE_V1
   *
   * Evidence-aware outline defer and publication-evidence defer
   * are separate authorities.
   *
   * 1. Outline planner can defer unsupported optional scope.
   * 2. Evidence Graph MUST defer any section whose required claim
   *    lacks SUPPORTS + VERIFIED_EXCERPT authority.
   */

  /*
   * ARTICLE_EXECUTION_PLAN_POST_LOCK_SCOPE_PROJECTION_V1
   *
   * Stage planning occurs before final evidence closure.
   *
   * ArticleExecutionPlan is persisted AFTER evidence closure and
   * EVIDENCE_AWARE_EXECUTION_SCOPE_CONTRACTION_V1.
   *
   * Therefore runtime section blueprints may still contain the
   * PRE-contraction requiredClaims/evidenceIds.
   *
   * After the execution-plan lock:
   *
   * - runtime research/evidence graph remains authoritative data
   * - ArticleExecutionPlan is the sole SECTION-SCOPE authority
   * - requiredClaims/evidenceIds are projected from the locked plan
   * - DEFERRED/WRITABLE state comes only from the locked plan
   *
   * This does NOT promote missing evidence.
   * Every retained required claim is revalidated below against
   * SUPPORTS + VERIFIED_EXCERPT evidence in the persisted graph.
   */
  const postLockRuntimeSections =
    masterRuntimeInspection
      .runtime
      .sectionBlueprints
      .sections
      .map(
        (
          runtimeSection,
          index
        ) => {
          const executionSection =
            persistedArticleExecutionPlan
              .sections[
                index
              ];

          if (!executionSection) {
            throw new ContentGenerationError(
              `ARTICLE_EXECUTION_PLAN_RUNTIME_SECTION_COUNT_DRIFT:${index}`
            );
          }

          if (
            runtimeSection
              .heading
              .trim()
              .toLowerCase() !==
            executionSection
              .heading
              .trim()
              .toLowerCase()
          ) {
            throw new ContentGenerationError(
              `ARTICLE_EXECUTION_PLAN_RUNTIME_HEADING_DRIFT:${index}:${executionSection.heading}`
            );
          }

          const evidenceById =
            new Map(
              masterRuntimeInspection
                .runtime!
                .evidenceGraph
                .claimEvidence
                .map(
                  (evidence) =>
                    [
                      evidence.id,
                      evidence,
                    ] as const
                )
            );

          const claimById =
            new Map(
              masterRuntimeInspection
                .runtime!
                .claimLedger
                .claims
                .map(
                  (claim) =>
                    [
                      claim.id,
                      claim,
                    ] as const
                )
            );

          /*
           * REAL post-lock evidence conflict check.
           *
           * A WRITABLE section is legal only when every retained
           * required claim still has publication-grade evidence
           * selected by the locked ArticleExecutionPlan.
           */
          if (
            executionSection.state ===
            "WRITABLE"
          ) {
            for (
              const claimId
              of executionSection
                .requiredClaimIds
            ) {
              const claim =
                claimById.get(
                  claimId
                );

              if (
                !claim ||
                claim.status !==
                  "VERIFIED"
              ) {
                throw new ContentGenerationError(
                  `ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT:${index}:${executionSection.heading}:CLAIM_NOT_VERIFIED:${claimId}`
                );
              }

              const hasPublicationEvidence =
                executionSection
                  .evidenceIds
                  .some(
                    (
                      evidenceId
                    ) => {
                      const evidence =
                        evidenceById.get(
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

              if (
                !hasPublicationEvidence
              ) {
                throw new ContentGenerationError(
                  `ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT:${index}:${executionSection.heading}:MISSING_VERIFIED_EVIDENCE:${claimId}`
                );
              }
            }

            for (
              const evidenceId
              of executionSection
                .evidenceIds
            ) {
              const evidence =
                evidenceById.get(
                  evidenceId
                );

              if (
                !evidence ||
                evidence.relation !==
                  "SUPPORTS" ||
                evidence.kind !==
                  "VERIFIED_EXCERPT" ||
                !executionSection
                  .requiredClaimIds
                  .includes(
                    evidence.claimId
                  )
              ) {
                throw new ContentGenerationError(
                  `ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT:${index}:${executionSection.heading}:INVALID_EVIDENCE_BINDING:${evidenceId}`
                );
              }
            }
          }

          return Object.freeze({
            ...runtimeSection,

            /*
             * POST-EVIDENCE SECTION AUTHORITY.
             */
            requiredClaims:
              Object.freeze([
                ...executionSection
                  .requiredClaimIds,
              ]),

            evidenceIds:
              Object.freeze([
                ...executionSection
                  .evidenceIds,
              ]),
          });
        }
      );


  if (
    postLockRuntimeSections.length !==
    persistedArticleExecutionPlan
      .sections
      .length
  ) {
    throw new ContentGenerationError(
      "ARTICLE_EXECUTION_PLAN_RUNTIME_SECTION_COUNT_DRIFT"
    );
  }


  const publicationEvidenceDeferredScope =
    resolvePublicationEvidenceSectionScopeV1({
      sections:
        postLockRuntimeSections,

      claimEvidence:
        masterRuntimeInspection
          .runtime
          .evidenceGraph
          .claimEvidence,
    });


  /*
   * ARTICLE_EXECUTION_PLAN_POST_LOCK_STRUCTURE_V1
   *
   * Research has already finished.
   * Structure is now immutable.
   */
  const runtimeSectionsBeforeExecutionLock =
    masterRuntimeInspection
      .runtime
      .sectionBlueprints
      .sections;

  if (
    persistedArticleExecutionPlan
      .sections
      .length !==
    runtimeSectionsBeforeExecutionLock
      .length
  ) {
    throw new ContentGenerationError(
      [
        "ARTICLE_EXECUTION_PLAN_RUNTIME_SECTION_COUNT_DRIFT",
        `plan=${persistedArticleExecutionPlan.sections.length}`,
        `runtime=${runtimeSectionsBeforeExecutionLock.length}`,
      ].join(":")
    );
  }

  for (
    let index = 0;
    index <
    runtimeSectionsBeforeExecutionLock.length;
    index++
  ) {
    const runtimeSection =
      runtimeSectionsBeforeExecutionLock[
        index
      ];

    const executionSection =
      persistedArticleExecutionPlan
        .sections[
          index
        ];

    const runtimeHeading =
      runtimeSection
        .heading
        .trim();

    const executionHeading =
      executionSection
        .heading
        .trim();

    if (
      runtimeHeading !==
      executionHeading
    ) {
      throw new ContentGenerationError(
        [
          "ARTICLE_EXECUTION_PLAN_RUNTIME_HEADING_DRIFT",
          String(index),
          executionHeading,
          runtimeHeading,
        ].join(":")
      );
    }
  }

  /*
   * Publication evidence checks may still detect a safety problem,
   * but after structure lock they may not SILENTLY remove a section.
   *
   * If publication evidence wants to defer a section that the
   * ArticleExecutionPlan marked WRITABLE, fail closed instead.
   */
  for (
    const index of
    publicationEvidenceDeferredScope
      .deferredIndexes
  ) {
    const executionSection =
      persistedArticleExecutionPlan
        .sections[
          index
        ];

    if (
      executionSection &&
      executionSection.state ===
        "WRITABLE"
    ) {
      throw new ContentGenerationError(
        [
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT",
          String(index),
          executionSection.heading,
        ].join(":")
      );
    }
  }

  /*
   * ARTICLE_EXECUTION_PLAN_POST_LOCK_DEFER_AUTHORITY_V1
   *
   * Legacy outline/evidence resolvers remain diagnostics only.
   *
   * The only structural DEFER authority after persistence is the
   * ArticleExecutionPlan generated from final evidence closure.
   */
  const deferredMasterIndexes =
    new Set(
      persistedArticleExecutionPlan
        .sections
        .flatMap(
          (
            section,
            index
          ) =>
            section.state ===
              "DEFERRED_NO_EVIDENCE"
              ? [
                  index,
                ]
              : []
        )
    );


  /*
   * Diagnostics can explain WHY a locked-plan section was
   * deferred, but they may not defer an additional section.
   */
  const effectiveEvidenceDeferredSections =
    [
      ...evidenceDeferredMasterScope
        .deferredSections,

      ...publicationEvidenceDeferredScope
        .deferredSections,
    ]
      .filter(
        (
          section
        ) => {
          const index =
            postLockRuntimeSections
              .findIndex(
                (
                  runtimeSection
                ) =>
                  runtimeSection
                    .heading
                    .trim()
                    .toLowerCase() ===
                  section
                    .heading
                    .trim()
                    .toLowerCase()
              );

          return (
            index >=
              0 &&
            deferredMasterIndexes
              .has(
                index
              )
          );
        }
      )
      .filter(
        (
          section,
          index,
          all
        ) =>
          all.findIndex(
            (
              candidate
            ) =>
              candidate
                .heading
                .trim()
                .toLowerCase() ===
              section
                .heading
                .trim()
                .toLowerCase()
          ) ===
          index
      );


  const effectiveMasterSections =
    postLockRuntimeSections
      .filter(
        (
          _section,
          index
        ) =>
          !deferredMasterIndexes.has(
            index
          )
      );


  if (
    effectiveMasterSections.length ===
    0
  ) {
    throw new ContentGenerationError(
      "EVIDENCE_DEFERRED_MASTER_SCOPE_BLOCKED:NO_WRITABLE_SECTIONS"
    );
  }


  /*
   * Persisted Master Runtime remains immutable.
   *
   * This ephemeral runtime changes only Stage-8 section execution
   * scope. All research, evidence, claims, SERP, ownership and
   * strategy artifacts keep their original authority.
   */
  /*
   * MERGED_DEFER_INDEXES_EFFECTIVE_RUNTIME_V1
   *
   * IMPORTANT:
   *
   * effectiveMasterSections is filtered by the MERGED defer set:
   *
   * - evidence-aware outline defer
   * - publication-evidence defer
   *
   * Therefore the runtime branch MUST also use that merged set.
   * Checking only evidenceDeferredMasterScope would compute the
   * correct publication defer but then accidentally execute the
   * original unfiltered runtime.
   */
  /*
   * POST_LOCK_PROJECTED_RUNTIME_V1
   *
   * Never fall back to the untouched pre-contraction runtime,
   * even when zero whole sections are deferred.
   *
   * Mixed-section claim contraction still needs the projected
   * requiredClaims/evidenceIds.
   */
  const effectiveMasterRuntime =
    Object.freeze({
      ...masterRuntimeInspection
        .runtime,

      sectionBlueprints:
        Object.freeze({
          ...masterRuntimeInspection
            .runtime
            .sectionBlueprints,

          sections:
            Object.freeze([
              ...effectiveMasterSections,
            ]),
        }),
    });


  /*
   * IMPORTANT:
   *
   * Rebuild the contract from runtime instead of filtering existing
   * SectionGenerationContracts.
   *
   * buildArticleGenerationContractV1() re-establishes:
   * - sectionIndex
   * - sectionNumber
   * - totalSections
   * - canonical section order
   */
  /*
   * ARTICLE_EXECUTION_PLAN_WRITER_BINDING_V1
   *
   * Existing ArticleGenerationContract remains the Writer
   * contract. The persisted execution plan validates and
   * enriches it; it does not replace it.
   */
  /*
   * ARTICLE_EXECUTION_PLAN_WRITER_BINDING_V1
   *
   * Build the EXISTING Writer generation contract first.
   * Then bind the persisted ArticleExecutionPlan authority to it.
   *
   * Runtime order:
   *
   * persisted plan
   * -> existing generation contract
   * -> execution-plan binding
   * -> existing Master Writer
   */
  const baseArticleGenerationContract =
    buildArticleGenerationContractV1(
      effectiveMasterRuntime
    );

  const articleGenerationContract =
    bindArticleExecutionPlanToGenerationContractV1({
      plan:
        persistedArticleExecutionPlan,

      contract:
        baseArticleGenerationContract,
    });


  console.info(
    "[content master writer contract]",
    {
      briefId:
        brief.id,

      version:
        articleGenerationContract
          .version,

      runtimeVersion:
        articleGenerationContract
          .sourceRuntimeVersion,

      originalSections:
        masterRuntimeInspection
          .runtime
          .sectionBlueprints
          .sections
          .length,

      sections:
        articleGenerationContract
          .sectionContracts
          .length,

      executionPlanWritableSections:
        persistedArticleExecutionPlan
          .sections
          .filter(
            (
              section
            ) =>
              section.state ===
              "WRITABLE"
          )
          .length,

      executionPlanPreferredMin:
        persistedArticleExecutionPlan
          .lengthPlan
          .preferredMin,

      executionPlanPreferredMax:
        persistedArticleExecutionPlan
          .lengthPlan
          .preferredMax,

      evidenceDeferredSections:
        effectiveEvidenceDeferredSections
          .map(
            (
              section
            ) =>
              section.heading
          ),

      h1Mission:
        articleGenerationContract
          .h1Mission,
    }
  );


  console.info(
    "[content legacy evidence-aware outline diagnostic]",
    {
      briefId:
        brief.id,

      verifiedExcerptCount:
        articleOutlinePlan
          .verifiedExcerptCount,

      keptSections:
        articleOutlinePlan
          .outline
          .map(
            (section) =>
              section.heading
          ),

      deferredSections:
        articleOutlinePlan
          .deferredSections
          .map(
            (section) =>
              section.heading
          ),
    }
  );


  console.info(
    "[content research pack]",
    {
      briefId:
        brief.id,

      version:
        researchPack.version,

      source:
        researchPack.source,

      readiness:
        researchPack.readiness,

      primaryKeyword:
        researchPack.primaryKeyword,

      pageAction:
        researchPack.pageAction,

      targetFormat:
        researchPack.targetFormat,

      searchVolume:
        researchPack
          .searchEvidence
          .searchVolume,

      difficulty:
        researchPack
          .searchEvidence
          .difficulty,

      impressions:
        researchPack
          .searchEvidence
          .impressions,

      clicks:
        researchPack
          .searchEvidence
          .clicks,

      position:
        researchPack
          .searchEvidence
          .existingPosition,

      topicalAuthority:
        researchPack
          .searchEvidence
          .topicalAuthorityStrength,

      serpFeasibility:
        researchPack
          .searchEvidence
          .serpFeasibility,

      informationGain:
        researchPack
          .informationGain
          .status,

      blockers:
        researchPack.blockers,

      reviews:
        researchPack.reviews,
    }
  );

  if (
    researchPack.readiness ===
    "BLOCKED"
  ) {
    throw new ContentGenerationError(
      `RESEARCH_PACK_BLOCKED: ${researchPack.blockers.join(", ")}`
    );
  }


  /*
   * REJECTED_RETRY_REUSES_LOGICAL_ARTICLE_V1
   *
   * A retry of a REJECTED generation reuses the same logical
   * Article row instead of spawning another top-level row.
   *
   * REJECTED and BLOCKED_EXTERNAL rows are reusable. GENERATING (in flight),
   * IN_REVIEW, APPROVED, PUBLISHED and PUBLISH_FAILED are never
   * overwritten.
   */
  const reusableRejectedArticle =
    await prisma.contentArticle.findFirst({
      where: {
        briefId:
          brief.id,

        status: {
          in: [
            "REJECTED",
            "BLOCKED_EXTERNAL",
          ],
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },

      select: {
        id:
          true,
      },
    });


  const pendingArticle =
    reusableRejectedArticle
      ? await prisma.contentArticle.update({
          where: {
            id:
              reusableRejectedArticle.id,
          },

          data: {
            title:
              "",

            metaDescription:
              "",

            h1:
              "",

            bodyMarkdown:
              "",

            status:
              "GENERATING",

            generatedBy:
              generator.modelName,

            publishError:
              null,
          },
        })
      : await prisma.contentArticle.create({
      data: {
        briefId:
          brief.id,

        title:
          "",

        metaDescription:
          "",

        h1:
          "",

        bodyMarkdown:
          "",

        status:
          "GENERATING",

        generatedBy:
          generator.modelName,
      },
    });

  try {
    // Opt-in for local CLI only. Never treat ephemeral disk as SaaS durability.
    const checkpointDirectory = process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim();
    const contractHash = checkpointDirectory
      ? fingerprintMasterWriterContractV1(articleGenerationContract, generator.modelName)
      : "";
    const savedProgress = checkpointDirectory
      ? await readMasterWriterSectionProgressV1({
          directory: checkpointDirectory,
          articleId: pendingArticle.id,
          briefId: brief.id,
          contractHash,
          modelName: generator.modelName,
        })
      : null;
    const masterWriterRun =
      await executeMasterWriterV1({
        contract: articleGenerationContract,
        generator,
        resumeProgress: savedProgress,
        onProgress: checkpointDirectory
          ? async ({ shell, accepted }) => {
              await writeMasterWriterSectionProgressV1({
                directory: checkpointDirectory,
                articleId: pendingArticle.id,
                briefId: brief.id,
                contractHash,
                modelName: generator.modelName,
                shell,
                accepted,
              });
            }
          : undefined,
      });


    /*
     * POST_WRITER_ARTICLE_CHECKPOINT_V1
     *
     * REAL boundary:
     *
     * Master Writer completed
     * -> persist paid-for article immediately
     * -> critics / critic repair / SERP replay / final gates
     *
     * No later engineering, provider or budget failure may erase
     * the already generated article body.
     *
     * Status stays GENERATING until final readiness authorizes
     * IN_REVIEW.
     */
    await prisma.contentArticle.update({
      where: {
        id:
          pendingArticle.id,
      },

      data: {
        title:
          masterWriterRun
            .article
            .title,

        metaDescription:
          masterWriterRun
            .article
            .metaDescription,

        h1:
          masterWriterRun
            .article
            .h1,

        bodyMarkdown:
          masterWriterRun
            .article
            .bodyMarkdown,
      },
    });



    /*
     * REAL_RECOVERY_POST_WRITER_CHECKPOINT_V1
     * Best-effort local checkpoint, explicitly opt-in.
     * Never lose a generated article because local disk fails.
     */
    try {
      await writeArticleRecoveryCheckpointV1({
        articleId: pendingArticle.id,
        briefId: brief.id,
        stage: "POST_WRITER",
        writerRun: masterWriterRun,
      });
    } catch {
      console.warn(
        "[content recovery checkpoint] POST_WRITER unavailable"
      );
    }

    /*
     * Stage 9J production critic boundary.
     *
     * Critic context is derived only from the same validated,
     * persisted MasterRuntime used by the Master Writer.
     *
     * No late SERP lookup.
     * No late URL ownership derivation.
     * No synthetic comparison arrays.
     */
    const persistedMasterCriticContext =
      buildMasterArticleSemanticCriticContextV1(
        effectiveMasterRuntime,
        {
          /*
           * EVIDENCE_DEFERRED_CRITIC_SCOPE_V1
           *
           * This explains an intentional omission.
           * It does not waive evidence requirements.
           */
          evidenceDeferredSections:
            effectiveEvidenceDeferredSections,
        }
      );


    /*
     * REAL_CRAWL_CANNIBALIZATION_FALLBACK_V1
     *
     * Stage-3 persisted URL ownership remains authoritative when present.
     *
     * Historical / incomplete runtimes may not yet contain urlOwnership.
     * In that case the critic receives REAL existing-page crawl context.
     *
     * Missing GSC ownership metrics remain null.
     */
    const crawlCannibalizationCandidates =
      persistedMasterCriticContext
        .cannibalizationCandidates
        .length >
      0
        ? Object.freeze([])
        : await buildCrawlCannibalizationCandidatesV1({
            websiteId:
              brief.websiteId,
          });


    const masterCriticContext =
      Object.freeze({
        ...persistedMasterCriticContext,

        /*
         * RANK_READY_KEYWORD_CONTEXT_BINDING_V1
         *
         * Brief already owns final production keyword authority.
         * Do not reselect keywords here.
         */
        rankReadyKeywords:
          Object.freeze(
            Array.from(
              new Set(
                [
                  brief.primaryKeyword,
                  ...(
                    brief.secondaryKeywords ??
                    []
                  ),
                ]
                  .map(
                    (keyword) =>
                      keyword.trim()
                  )
                  .filter(
                    (keyword) =>
                      keyword.length >
                      0
                  )
              )
            )
          ),

        cannibalizationCandidates:
          persistedMasterCriticContext
            .cannibalizationCandidates
            .length >
          0
            ? persistedMasterCriticContext
                .cannibalizationCandidates
            : crawlCannibalizationCandidates,
      });


    console.info(
      "[content critic real context]",
      {
        briefId:
          brief.id,

        originalityReferences:
          masterCriticContext
            .originalityReferences
            .length,

        persistedCannibalizationCandidates:
          persistedMasterCriticContext
            .cannibalizationCandidates
            .length,

        crawlCannibalizationCandidates:
          crawlCannibalizationCandidates
            .length,

        effectiveCannibalizationCandidates:
          masterCriticContext
            .cannibalizationCandidates
            .length,
      }
    );


    const masterCriticExecution =
      await executeMasterArticleCriticsV1({
        contract:
          articleGenerationContract,

        run:
          masterWriterRun,

        generator,

        context:
          masterCriticContext,
      });


    /*
     * BLOCK => generated master article is not accepted.
     *
     * This assertion is inside the existing generation try/catch.
     * A ContentGenerationError therefore becomes REJECTED and can
     * never reach the final DRAFT transition.
     */
    /*
     * Stage 9J-E production repair/replay boundary.
     *
     * The first critic execution is diagnostic.
     *
     * - clean suite -> accepted unchanged
     * - repairable SECTION finding -> one localized repair
     * - upstream/unrepairable BLOCK -> fail before repair call
     * - repaired section -> structural/reconciliation/semantic
     *   verification again
     * - ALL 9 critics replay
     * - second BLOCK -> fail closed
     */
    const masterCriticRepairExecution =
      await executeMasterArticleCriticRepairReplayV1({
        contract:
          articleGenerationContract,

        run:
          masterWriterRun,

        initialCritics:
          masterCriticExecution,

        generator,

        context:
          masterCriticContext,
      });


    /*
     * This is now the ONLY master-article version allowed to
     * enter downstream deterministic gates or persistence.
     */
    let acceptedMasterWriterRun =
      masterCriticRepairExecution
        .run;


    let finalMasterCriticExecution =
      masterCriticRepairExecution
        .finalCritics;

    /*
     * REAL_RECOVERY_POST_MASTER_CRITIC_CHECKPOINT_V1
     * Preserve the canonical repaired writer run and critic result.
     * No status transition is authorized by this checkpoint.
     */
    try {
      await writeArticleRecoveryCheckpointV1({
        articleId: pendingArticle.id,
        briefId: brief.id,
        stage: "POST_MASTER_CRITIC",
        writerRun: acceptedMasterWriterRun,
        finalCritics: finalMasterCriticExecution,
      });
    } catch {
      console.warn(
        "[content recovery checkpoint] POST_MASTER_CRITIC unavailable"
      );
    }



    console.info(
      "[content master critic repair gate]",
      {
        briefId:
          brief.id,

        articleId:
          pendingArticle.id,

        version:
          finalMasterCriticExecution
            .version,

        initialStatus:
          masterCriticExecution
            .suite
            .status,

        finalStatus:
          finalMasterCriticExecution
            .suite
            .status,

        criticReplayCount:
          masterCriticRepairExecution
            .provenance
            .criticReplayCount,

        repairedSectionCount:
          masterCriticRepairExecution
            .provenance
            .repairedSectionCount,

        repairAttemptCount:
          masterCriticRepairExecution
            .provenance
            .repairAttemptCount,

        status:
          finalMasterCriticExecution
            .suite
            .status,

        finalCriticCount:
          finalMasterCriticExecution
            .provenance
            .finalCriticCount,

        deterministicCriticCount:
          finalMasterCriticExecution
            .provenance
            .deterministicCriticCount,

        semanticReviewCount:
          finalMasterCriticExecution
            .provenance
            .semanticReviewCount,

        semanticModelName:
          finalMasterCriticExecution
            .provenance
            .semanticModelName,

        findings:
          finalMasterCriticExecution
            .suite
            .counts
            .findings,

        warnFindings:
          finalMasterCriticExecution
            .suite
            .counts
            .warnFindings,

        blockFindings:
          finalMasterCriticExecution
            .suite
            .counts
            .blockFindings,

        originalityReferences:
          masterCriticContext
            .originalityReferences
            .length,

        cannibalizationCandidates:
          masterCriticContext
            .cannibalizationCandidates
            .length,
      }
    );


    /*
     * Deliberately project the composed master article onto the
     * existing GeneratedArticle-compatible shape.
     *
     * Downstream deterministic audit / critic / publication
     * gates remain unchanged during this migration.
     */
    /*
     * Stage 9K-C — production SERP Replay.
     *
     * IMPORTANT:
     *
     * This is a diagnostic artifact, not a ranking prediction.
     *
     * READY / WARN / BLOCK / INSUFFICIENT_CONTEXT describe the
     * pairwise evidence available against the observed SERP.
     *
     * They do NOT directly change ContentArticleStatus here.
     * A later explicit Publish Gate may consume this artifact.
     *
     * The replay receives the post-critic accepted MasterWriterRun,
     * so the compared article is exactly the immutable text version
     * that proceeds into downstream gates.
     */
    let masterSerpReplay:
      Readonly<SerpReplayV1> |
      null =
        null;


    let masterSerpReplayWarning:
      string |
      null =
        null;


    let serpReplaySiteDomain:
      string |
      null =
        null;


    try {
      serpReplaySiteDomain =
        new URL(
          brief.website.url
        ).hostname;
    } catch {
      /*
       * Domain exclusion is helpful provenance hygiene but must
       * never fabricate or guess a hostname.
       */
      serpReplaySiteDomain =
        null;
    }


    try {
      /*
       * SERP_REPLAY_PRIOR_CRITIC_BLOCK_SHORT_CIRCUIT_V2
       *
       * Competitive replay is useful only for an article that
       * already survived the final master critic boundary.
       *
       * BLOCK means the article is semantically unfit for
       * competitive comparison/publish readiness.
       *
       * Do not spend another pairwise model call on a version that
       * is already known to be blocked.
       */
      if (
        finalMasterCriticExecution
          .suite
          .status ===
        "BLOCK"
      ) {
        masterSerpReplayWarning =
          "SERP_REPLAY_SKIPPED_PRIOR_MASTER_CRITIC_BLOCK";

        console.info(
          "[content serp replay skipped]",
          {
            briefId:
              brief.id,

            articleId:
              pendingArticle.id,

            reason:
              masterSerpReplayWarning,

            finalCriticStatus:
              finalMasterCriticExecution
                .suite
                .status,

            compareSerpReplayPairCalls:
              0,
          }
        );
      } else {
      const competitiveReplayExecution =
        await executeCompetitiveSerpReplayRepairV2({
          contract:
            articleGenerationContract,

          runtime:
              effectiveMasterRuntime,

          run:
            acceptedMasterWriterRun,

          generator,

          context:
            masterCriticContext,

          siteDomain:
            serpReplaySiteDomain,

          alreadyRepairedSectionIndexes:
            masterCriticRepairExecution
              .repairs
              .map(
                (
                  repair
                ) =>
                  repair.sectionIndex
              ),
        });


      /*
       * From this point onward acceptedMasterWriterRun means the
       * FINAL production article version:
       *
       * original post-critic run when no competitive repair ran,
       * OR repaired + section-verified + critic-replayed run.
       */
      acceptedMasterWriterRun =
        competitiveReplayExecution
          .run;


      if (
        competitiveReplayExecution
          .postRepairCritics
      ) {
        finalMasterCriticExecution =
          competitiveReplayExecution
            .postRepairCritics;
      }


      masterSerpReplay =
        competitiveReplayExecution
          .finalReplay;


      console.info(
        "[content competitive replay repair]",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          disposition:
            competitiveReplayExecution
              .repairPlan
              .disposition,

          initialReplayStatus:
            competitiveReplayExecution
              .initialReplay
              .status,

          finalReplayStatus:
            competitiveReplayExecution
              .finalReplay
              .status,

          repairedSectionCount:
            competitiveReplayExecution
              .provenance
              .repairedSectionCount,

          repairAttemptCount:
            competitiveReplayExecution
              .provenance
              .repairAttemptCount,

          replayExecutionCount:
            competitiveReplayExecution
              .provenance
              .replayExecutionCount,

          postRepairCriticReplayCount:
            competitiveReplayExecution
              .provenance
              .postRepairCriticReplayCount,

          repairSuppressedByPriorRepair:
            competitiveReplayExecution
              .provenance
              .repairSuppressedByPriorRepair,

          wholeArticleRewriteCount:
            competitiveReplayExecution
              .provenance
              .wholeArticleRewriteCount,
        }
      );


      /*
       * Append-only persistence binds this replay to the exact
       * post-critic article version that was compared.
       */
      await createSerpReplayArtifactV1({
        contentArticleId:
          pendingArticle.id,

        article:
          acceptedMasterWriterRun
            .article,

        replay:
          masterSerpReplay,
      });


      console.info(
        "[content serp replay]",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          version:
            masterSerpReplay
              .version,

          status:
            masterSerpReplay
              .status,

          keyword:
            masterSerpReplay
              .keyword,

          serpSnapshotFingerprint:
            masterSerpReplay
              .serpSnapshotFingerprint,

          serpCapturedAt:
            masterSerpReplay
              .serpCapturedAt,

          comparedResultCount:
            masterSerpReplay
              .provenance
              .comparedResultCount,

          pairwiseModelName:
            masterSerpReplay
              .provenance
              .pairwiseModelName,

          blockers:
            masterSerpReplay
              .blockers,

          warnings:
            masterSerpReplay
              .warnings,

          comparisons:
            masterSerpReplay
              .comparisons
              .map(
                (
                  comparison
                ) => ({
                  rank:
                    comparison
                      .competitor
                      .rank,

                  url:
                    comparison
                      .competitor
                      .url,

                  verdict:
                    comparison
                      .verdict,

                  blockingDimensions:
                    comparison
                      .blockingDimensions,

                  missingData:
                    comparison
                      .missingData,
                })
              ),
        }
      );
      }

    } catch (
      replayError
    ) {
      /*
       * Stage 9K remains diagnostic.
       *
       * A provider/parser failure cannot silently turn into
       * READY, and it also cannot destroy an article that already
       * passed the Master Writer + final 9-critic acceptance.
       */
      masterSerpReplayWarning =
        replayError instanceof
        Error
          ? replayError.message
          : "SERP_REPLAY_EXECUTION_FAILED";


      /*
       * Do not fabricate a replay result when execution fails.
       * Persist the failed attempt as a distinct append-only
       * artifact with replayStatus=null.
       */
      await createSerpReplayFailureArtifactV1({
        contentArticleId:
          pendingArticle.id,

        article:
          acceptedMasterWriterRun
            .article,

        keyword:
          masterRuntimeInspection
            .runtime
            .serpResearch
            ?.keyword ??
          null,

        serpSnapshotFingerprint:
          masterRuntimeInspection
            .runtime
            .serpResearch
            ?.fingerprint ??
          null,

        serpCapturedAt:
          masterRuntimeInspection
            .runtime
            .serpResearch
            ?.capturedAt ??
          null,

        errorMessage:
          masterSerpReplayWarning,

        provenance: {
          stage:
            "9K",

          source:
            "PRODUCTION_GENERATION",

          pairwiseModelName:
            generator.modelName,
        },
      });


      console.warn(
        "[content serp replay] diagnostic unavailable",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          message:
            masterSerpReplayWarning
              .slice(
                0,
                300
              ),
        }
      );
    }


    /*
     * POST_FINAL_REPLAY_CHECKPOINT_V1
     *
     * Save the final MasterWriterRun after all competitive
     * repair operations. This is the version entering
     * Content Gate and Final Readiness.
     *
     * Checkpoint writing remains explicit opt-in.
     */
    try {
      await writeArticleRecoveryCheckpointV1({
        articleId: pendingArticle.id,
        briefId: brief.id,
        stage: "POST_FINAL_REPLAY",
        writerRun: acceptedMasterWriterRun,
        finalCritics: finalMasterCriticExecution,
      });
    } catch {
      console.warn(
        "[content recovery checkpoint] POST_FINAL_REPLAY unavailable"
      );
    }

    const generated = {
      title:
        acceptedMasterWriterRun
          .article
          .title,

      metaDescription:
        acceptedMasterWriterRun
          .article
          .metaDescription,

      h1:
        acceptedMasterWriterRun
          .article
          .h1,

      bodyMarkdown:
        acceptedMasterWriterRun
          .article
          .bodyMarkdown,
    };

    console.info(
      "[content master writer run]",
      {
        briefId:
          brief.id,

        version:
          acceptedMasterWriterRun.version,

        sectionCount:
          acceptedMasterWriterRun
            .provenance
            .sectionCount,

        generatorModel:
          acceptedMasterWriterRun
            .provenance
            .generatorModelName,

        shellModel:
          acceptedMasterWriterRun
            .provenance
            .shellModelName,

        sectionModels:
          acceptedMasterWriterRun
            .provenance
            .sectionModelNames,

        executionMode:
          acceptedMasterWriterRun
            .provenance
            .executionMode,
      }
    );

    let reviewedArticle =
      generated;

    let reviewProviderWarning:
      string | null =
        null;

    let reviewGateWarning:
      string | null =
        null;

    /*
     * MASTER_WRITER_LEGACY_REVIEW_BYPASS_V1
     *
     * Production article review authority is:
     *
     * Master Writer
     * -> Master deterministic/semantic critics
     * -> bounded targeted repair + critic replay
     * -> Competitive SERP Replay
     * -> deterministic downstream gates
     * -> Final Readiness
     *
     * Legacy critiqueArticle()/rewriteArticle() must not execute
     * again after the Master path.
     */

    /*
     * Master Writer + targeted section repair already own all
     * article mutation.
     *
     * From this boundary forward, legacy layers are audit/gates
     * only. They may BLOCK or WARN, but may not mutate the
     * critic-verified article.
     */
    const repaired =
      reviewedArticle;

    const intelligence =
      await analyzeStoredContentPlan({
        briefId:
          brief.id,

        title:
          repaired.title,

        metaDescription:
          repaired.metaDescription,

        h1:
          repaired.h1,

        bodyMarkdown:
          repaired.bodyMarkdown,

        primaryKeyword:
          brief.primaryKeyword,

        secondaryKeywords:
          brief.secondaryKeywords,
      });

    logContentIntelligence(
      brief.id,
      intelligence
    );

    const audit =
      auditArticle({
        article:
          repaired,

        primaryKeyword:
          brief.primaryKeyword,
      });

    console.info(
      "[content quality]",
      {
        briefId:
          brief.id,

        score:
          audit.score,

        words:
          audit.wordCount,

        h2:
          audit.h2Count,

        h3:
          audit.h3Count,

        primaryKeywordDensityPct:
          audit.primaryKeywordDensityPct,

        issues:
          audit.issues,
      }
    );

    const gate =
      evaluateContentGate({
        article:
          repaired,

        primaryKeyword:
          brief.primaryKeyword,

        audit,

        registry:
          factRegistry,
      });

    console.info(
      "[content gate]",
      {
        briefId:
          brief.id,

        pass:
          gate.pass,

        blockingIssues:
          gate.blockingIssues,

        warnings:
          gate.warnings,

        topicAlignment:
          gate.topicAlignment,

        claims:
          gate.claimFindings.map(
            (finding) => ({
              code:
                finding.code,

              sentence:
                finding.sentence,
            })
          ),
      }
    );

    if (
      !gate.pass
    ) {
      return prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          title:
            repaired.title,

          metaDescription:
            repaired.metaDescription,

          h1:
            repaired.h1,

          bodyMarkdown:
            repaired.bodyMarkdown,

          status:
            "REJECTED",

          publishError:
            formatContentGateFailure(
              gate
            ),
        },
      });
    }


    const publicationPolicy =
      evaluateArticlePublicationPolicy({
        article:
          repaired,

        intelligence,
      });

    console.info(
      "[content publication policy]",
      {
        briefId:
          brief.id,

        pass:
          publicationPolicy.pass,

        blockingIssues:
          publicationPolicy.blockingIssues,

        planWarnings:
          publicationPolicy.planWarnings,

        evidenceFindings:
          publicationPolicy
            .evidenceFindings
            .map(
              (finding) => ({
                code:
                  finding.code,

                sentence:
                  finding.sentence,
              })
            ),
      }
    );

    /*
     * FINAL_REVIEW_AUTHORITY_PRECONDITION_V1
     *
     * A failed publication policy is a blocker.
     * It may NEVER enter IN_REVIEW.
     */
    if (
      !publicationPolicy.pass
    ) {
      return prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          title:
            repaired.title,

          metaDescription:
            repaired.metaDescription,

          h1:
            repaired.h1,

          bodyMarkdown:
            repaired.bodyMarkdown,

          status:
            "REJECTED",

          publishError:
            formatArticlePublicationPolicyFailure(
              publicationPolicy
            ),
        },
      });
    }


    /*
     * FINAL_REVIEW_WARNING_FAIL_CLOSED_V1
     *
     * A warning from a required review/provider path cannot
     * independently authorize IN_REVIEW.
     */
    if (
      reviewProviderWarning ||
      reviewGateWarning
    ) {
      return prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          title:
            repaired.title,

          metaDescription:
            repaired.metaDescription,

          h1:
            repaired.h1,

          bodyMarkdown:
            repaired.bodyMarkdown,

          status:
            "REJECTED",

          publishError:
            reviewProviderWarning ??
            reviewGateWarning,
        },
      });
    }


    /*
     * FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1
     *
     * This is the ONLY decision allowed to authorize IN_REVIEW.
     *
     * PASS -> IN_REVIEW
     * WARN -> IN_REVIEW with non-blocking diagnostics
     * FAIL -> fail closed
     */
    /*
     * FINAL_ARTICLE_VERSION_INTEGRITY_V1
     * Fail closed: final text must match the latest verified
     * MasterWriterRun. Never promote a different version.
     */
    assertFinalArticleVersionIntegrityV1({
      writerMarkdown:
        acceptedMasterWriterRun.article.bodyMarkdown,
      finalMarkdown:
        repaired.bodyMarkdown,
    });

    const finalArticleReadiness =
      buildProductionFinalArticleReadinessV1({
        plan:
          persistedArticleExecutionPlan,

        writerRun:
          acceptedMasterWriterRun,

        finalCritics:
          finalMasterCriticExecution,

        articleBodyMarkdown:
          repaired.bodyMarkdown,

        contentGatePass:
          gate.pass,

        publicationPolicyPass:
          publicationPolicy.pass,

        serpReplay:
          masterSerpReplay,

        serpReplayWarning:
          masterSerpReplayWarning,
      });

    console.info(
      "[content final article readiness]",
      {
        briefId:
          brief.id,

        articleId:
          pendingArticle.id,

        version:
          finalArticleReadiness.version,

        status:
          finalArticleReadiness.status,

        blockers:
          finalArticleReadiness.blockers,

        warnings:
          finalArticleReadiness.warnings,

        diagnostics:
          finalArticleReadiness.diagnostics,
      }
    );

    if (
      finalArticleReadiness
        .status ===
      "FAIL"
    ) {
      return prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          title:
            repaired.title,

          metaDescription:
            repaired.metaDescription,

          h1:
            repaired.h1,

          bodyMarkdown:
            repaired.bodyMarkdown,

          status:
            "REJECTED",

          publishError:
            formatProductionFinalArticleReadinessFailureV1(
              finalArticleReadiness
            ),
        },
      });
    }


    /*
     * SUCCESSFUL_CONTENT_GENERATION_ENTERS_REVIEW_V1
     *
     * A completed production generation may enter review ONLY
     * after FINAL_ARTICLE_READINESS_V1 returns PASS.
     *
     * Earlier gates remain evidence inputs; none of them can
     * independently authorize IN_REVIEW.
     *
     * Human approval remains a separate explicit transition:
     *
     * IN_REVIEW -> APPROVED -> PUBLISHED
     */
    return prisma.contentArticle.update({
      where: {
        id:
          pendingArticle.id,
      },

      data: {
        title:
          repaired.title,

        metaDescription:
          repaired.metaDescription,

        h1:
          repaired.h1,

        bodyMarkdown:
          repaired.bodyMarkdown,

        status:
          "IN_REVIEW",

        publishError:
          null,
      },
    });
  } catch (error) {
    /*
     * REJECTED_RECOVERY_PERSISTENCE_V1
     *
     * Every generation attempt remains append-only visible.
     * A transport failure is not allowed to delete its attempt.
     */
    const recovery =
      classifyRejectedRecoveryV1(
        error
      );


    const rejectedArticle =
      await prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          status:
            recovery.owner ===
            "TRANSPORT"
              ? "BLOCKED_EXTERNAL"
              : "REJECTED",

          publishError:
            formatRejectedRecoveryForPersistenceV1(
              recovery
            ),
        },
      });


    /*
     * Only genuine temporary infrastructure failures bubble to the
     * HTTP layer for retry behavior.
     *
     * The failed attempt has already been persisted; transport failures use BLOCKED_EXTERNAL.
     */
    if (
      recovery.autoRetryAllowed
    ) {
      console.warn(
        "[content generation] retryable infrastructure failure",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          failureClass:
            recovery.failureClass,

          message:
            recovery.message.slice(
              0,
              240
            ),
        }
      );


      throw error;
    }


    return rejectedArticle;
  }
}


export async function approveArticle(
  articleId:
    string
) {
  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id:
          articleId,
      },

      include: {
        brief: {
          include: {
            website: {
              include: {
                business:
                  true,
              },
            },
            evidenceSnapshot:
              true,
          },
        },
      },
    });

  if (!article) {
    throw new Error(
      "Article not found"
    );
  }

  if (
    article.status !==
      "IN_REVIEW"
  ) {
    throw new Error(
      `Cannot approve article with status ${article.status}`
    );
  }

  assertStoredPublicationEvidenceV1(
    article.brief.evidenceSnapshot?.plan
  );

  const intelligence =
    await analyzeStoredContentPlan({
      briefId:
        article.briefId,

      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,

      primaryKeyword:
        article.brief
          .primaryKeyword,

      secondaryKeywords:
        article.brief
          .secondaryKeywords,
    });

  logContentIntelligence(
    article.briefId,
    intelligence
  );

  const audit =
    auditArticle({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,
    });

  const registry =
    await getBusinessFactRegistryForWebsite(
      article.brief.websiteId
    );

  const gate =
    evaluateContentGate({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,

      audit,

      registry,
    });

  assertContentGatePassed(
    gate
  );

  const publicationPolicy =
    evaluateArticlePublicationPolicy({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      intelligence,
    });

  assertArticlePublicationPolicyPassed(
    publicationPolicy
  );


  const approvalReplayArtifact =
    await prisma.serpReplayArtifact.findFirst({
      where: {
        contentArticleId:
          articleId,
      },

      orderBy: [
        {
          createdAt:
            "desc",
        },

        {
          id:
            "desc",
        },
      ],
    });


  const approvalPublishGate =
    evaluateExplicitPublishGateV1({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      replayArtifact:
        approvalReplayArtifact,

      existingGates: {
        contentGatePassed:
          gate.pass,

        publicationPolicyPassed:
          publicationPolicy.pass,
      },
    });


  console.info(
    "[explicit publish gate:approve]",
    {
      articleId,

      pass:
        approvalPublishGate.pass,

      blockers:
        approvalPublishGate.blockers,

      warnings:
        approvalPublishGate.warnings,

      replayArtifactId:
        approvalPublishGate
          .replayArtifactId,

      replayStatus:
        approvalPublishGate
          .replayStatus,
    }
  );


  assertExplicitPublishGatePassedV1(
    approvalPublishGate
  );

  return prisma.contentArticle.update({
    where: {
      id:
        articleId,
    },

    data: {
      status:
        "APPROVED",

      publishError:
        null,
    },
  });
}


export async function publishArticle(
  provider:
    CMSProvider,
  articleId:
    string
) {
  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id:
          articleId,
      },

      include: {
        brief: {
          include: {
            website: {
              include: {
                business:
                  true,
              },
            },
            evidenceSnapshot:
              true,
          },
        },
      },
    });

  if (!article) {
    throw new Error(
      "Article not found"
    );
  }

  if (
    article.status !==
    "APPROVED"
  ) {
    throw new Error(
      "Only approved articles can be published"
    );
  }

  assertStoredPublicationEvidenceV1(
    article.brief.evidenceSnapshot?.plan
  );

  const intelligence =
    await analyzeStoredContentPlan({
      briefId:
        article.briefId,

      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,

      primaryKeyword:
        article.brief
          .primaryKeyword,

      secondaryKeywords:
        article.brief
          .secondaryKeywords,
    });

  logContentIntelligence(
    article.briefId,
    intelligence
  );

  const audit =
    auditArticle({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,
    });

  const registry =
    await getBusinessFactRegistryForWebsite(
      article.brief.websiteId
    );

  const gate =
    evaluateContentGate({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,

      audit,

      registry,
    });

  assertContentGatePassed(
    gate
  );

  const publicationPolicy =
    evaluateArticlePublicationPolicy({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      intelligence,
    });

  assertArticlePublicationPolicyPassed(
    publicationPolicy
  );


  const publishReplayArtifact =
    await prisma.serpReplayArtifact.findFirst({
      where: {
        contentArticleId:
          articleId,
      },

      orderBy: [
        {
          createdAt:
            "desc",
        },

        {
          id:
            "desc",
        },
      ],
    });


  const explicitPublishGate =
    evaluateExplicitPublishGateV1({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      replayArtifact:
        publishReplayArtifact,

      existingGates: {
        contentGatePassed:
          gate.pass,

        publicationPolicyPassed:
          publicationPolicy.pass,
      },
    });


  console.info(
    "[explicit publish gate:publish]",
    {
      articleId,

      pass:
        explicitPublishGate.pass,

      blockers:
        explicitPublishGate.blockers,

      warnings:
        explicitPublishGate.warnings,

      replayArtifactId:
        explicitPublishGate
          .replayArtifactId,

      replayStatus:
        explicitPublishGate
          .replayStatus,
    }
  );


  assertExplicitPublishGatePassedV1(
    explicitPublishGate
  );


  const result =
    await provider.publishContent(
      article.brief
        .websiteId,
      {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      }
    );

  return prisma.contentArticle.update({
    where: {
      id:
        articleId,
    },

    data: {
      status:
        result.status ===
        "SUCCESS"
          ? "PUBLISHED"
          : "PUBLISH_FAILED",

      publishedUrl:
        result.publishedUrl,

      publishedAt:
        result.status ===
        "SUCCESS"
          ? new Date()
          : null,

      publishError:
        result.errorMessage,
    },
  });
}
