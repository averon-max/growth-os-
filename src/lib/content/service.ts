import { recordWriterTraceV1, hashTraceTextV1, withWriterTraceV1, recordWriterForensicArtifactV1 } from "./writer-trace-v1";
import type { RelatedKeywordResult } from "@/lib/keywords/dataforseo-provider";
import { buildResearchDecisionV2 } from "./research-decision-v2";
import {
  assertFinalArticleVersionIntegrityV1,
} from "./final-article-version-integrity-v1";

import { assertCanonicalWriterPreflightV1 } from "./canonical-writer-preflight-v1";
import { assertReleaseArticleCitationScopeV1 } from "./existing-article-citation-authority-v1";
import { resolveApprovedExistingArticleQueryOwnerV1 } from "./existing-article-approved-query-owner-v1";
import { deriveBriefOutlineFromExecutionPlanV1 } from "./article-execution-plan-v1";

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
  evaluateComprehensiveEditorialReleaseV1,
  assertComprehensiveEditorialReleaseV1,
} from "./comprehensive-editorial-release-gate-v1";
import {assertArticleProseHygieneV2, evaluateArticleSearchReadinessV2}
  from "./article-search-readiness-v2";
import {assertArticleInformationGainV1}
  from "./article-editorial-information-gain-v1";

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

import {
  buildMasterArticleCriticRepairPlanV1,
} from "./master-article-critic-repair-plan";

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
  withExternalEvidenceSources,
} from "./external-evidence-sources";



import {
  resolvePublicationEvidenceSectionScopeV1,
} from "./publication-evidence-section-scope";

import {
  buildSearchBlueprint,
} from "./search-blueprint";


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

import {
  detectPersistedArticleEditorialRepetitionV1,
  EditorialRepetitionGateErrorV1,
} from "./editorial-repetition-guard-v1";


import type {
  ExplicitSearchMissionInput,
} from "./search-mission-ingress";


import {
  getWebsiteKeywordContext,
} from "./keyword-context";


import {
  buildFinalContentPlan,
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
  return withWriterTraceV1({
    scope: "content.brief",
    correlationId: input.websiteId,
  }, async () => {
  recordWriterTraceV1("brief.entrypoint", {
    generationMode: input.generationMode ?? "EXACT_KEYWORD",
    model: generator.modelName,
  });
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

  recordWriterForensicArtifactV1("keywords.full_strategy", {
    input, finalPlan, keywordContext: context,
  });

  recordWriterTraceV1("keyword.selected", {
    keyword: strategy.primary.keyword,
    searchVolume: strategy.primary.searchVolume ?? null,
    difficulty: strategy.primary.difficulty ?? null,
    secondaryQueries: strategy.secondary.map(k => k.keyword),
    supportingQueries: strategy.supporting.map(k => k.keyword),
    generationMode: input.generationMode ?? "EXACT_KEYWORD",
  });

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
  const briefRuntime = inspectMasterRuntimeSnapshot({
    masterRuntime: productionMaster.masterRuntime,
  }).runtime;
  if (!briefRuntime) throw new Error("BRIEF_MASTER_RUNTIME_INVALID");
  // The exact same five authority checks now protect brief persistence,
  // the diagnostic CLI, and the paid production generation entrypoint.
  assertCanonicalWriterPreflightV1({
    plan: liveMaster.articleExecutionPlan,
    blueprints: briefRuntime.sectionBlueprints.sections,
  });

  // No second paid model outline: the verified plan is the sole authority.
  const outline = deriveBriefOutlineFromExecutionPlanV1(
    liveMaster.articleExecutionPlan
  );
  recordWriterTraceV1("brief.outline_from_master", {
    sectionCount: outline.length,
    deferredSectionCount:
      liveMaster.articleExecutionPlan.sections.length - outline.length,
    modelCalls: 0,
  });

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
          ...(input.generationPolicy ? {
            researchDecisionV2: buildResearchDecisionV2({
              policy: input.generationPolicy,
              strategy,
            }),
          } : {}),

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

recordWriterTraceV1("brief.correlation", {
    briefIdSha256: hashTraceTextV1(createdBrief.id),
    websiteIdSha256: hashTraceTextV1(input.websiteId),
  });
  recordWriterForensicArtifactV1("brief.final", {
    createdBriefId: createdBrief.id, primaryKeyword: createdBrief.primaryKeyword,
    finalPlan,
  });
  return createdBrief;
  });
}


export async function generateArticleFromBrief(
  generator:
    ContentGenerator,
  briefId:
    string
) {
  return withWriterTraceV1({
    scope: "content.article",
    correlationId: briefId,
  }, async () => {
  recordWriterTraceV1("article.entrypoint", {
    model: generator.modelName,
    briefIdSha256: hashTraceTextV1(briefId),
  });
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


  /*
   * ARTICLE_PREWRITER_REQUIRED_COVERAGE_PRODUCTION_WIRING_V1
   *
   * Evidence contraction may shrink optional scope,
   * but MUST coverage must still have a WRITABLE owner.
   *
   * Fail BEFORE ArticleGenerationContract / Writer creation.
   */


  /*
   * ARTICLE_PREWRITER_ANSWER_SUPPORT_PRODUCTION_WIRING_V2
   *
   * Coverage ownership alone does not authorize Writer.
   *
   * A MUST question whose post-contraction section has lost
   * its required claim/evidence authority is routed as a typed
   * upstream evidence defect before any Writer tokens are spent.
   */


  /*
   * EVIDENCE_BEFORE_EDITORIAL_VOLUME_V1
   *
   * A locked WRITABLE section with no material authority must not
   * receive 200-300 words of generic safety advice merely because
   * a soft word budget exists. Route it back to Research/Scope
   * BEFORE paying the full Writer and SERP pipeline.
   */


  // One canonical ordering for service and operator preflight:
  // exactly the existing five fail-closed evidence/mission checks.
  assertCanonicalWriterPreflightV1({
    plan: persistedArticleExecutionPlan,
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


  // The verified persisted plan is the only section-scope authority.
  // No lexical heading-affinity guess may defer or reinstate Writer jobs.
  const effectiveEvidenceDeferredSections =
    persistedArticleExecutionPlan.sections.flatMap((section, index) => {
      if (section.state !== "DEFERRED_NO_EVIDENCE") return [];
      const runtime = postLockRuntimeSections[index];
      return [{
        heading: section.heading,
        sourceDeferredHeading: section.heading,
        summary: runtime?.mission ?? null,
        reason: "MISSING_PUBLICATION_GRADE_EVIDENCE" as const,
      }];
    });
  recordWriterTraceV1("article.locked_evidence_scope", {
    deferredCount: effectiveEvidenceDeferredSections.length,
    writableCount: persistedArticleExecutionPlan.sections.filter(
      section => section.state === "WRITABLE").length,
    scopeAuthority: "ARTICLE_EXECUTION_PLAN_V1",
  });

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
            // Do not erase a paid-for earlier draft on retry.
            // POST_WRITER overwrites these fields only when the new
            // Writer run actually completes.
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
    recordWriterForensicArtifactV1("writer.draft_and_contract", {
      articleGenerationContract, masterWriterRun,
    });
    recordWriterTraceV1("writer.draft_generated", {
      articleIdHash: hashTraceTextV1(pendingArticle.id),
      h1: masterWriterRun.article.h1,
      markdownChars: masterWriterRun.article.bodyMarkdown.length,
      approxWordCount: masterWriterRun.article.bodyMarkdown.trim()
        ? masterWriterRun.article.bodyMarkdown.trim().split(/\s+/).length : 0,
      h2Count: (masterWriterRun.article.bodyMarkdown.match(/^## /gm) ?? []).length,
      h3Count: (masterWriterRun.article.bodyMarkdown.match(/^### /gm) ?? []).length,
    });

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
    recordWriterForensicArtifactV1("critic.initial_suite", {
      masterCriticExecution, masterCriticContext,
    });
    recordWriterTraceV1("critic.initial.completed", {
      status: masterCriticExecution.suite.status,
      criticCount: masterCriticExecution.provenance.finalCriticCount,
      blockerCount: masterCriticExecution.suite.counts.blockFindings,
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
    /*
     * OPTIONAL_KEYWORD_COVERAGE_RECOVERY_V1
     *
     * Try at most one ordinary section-repair/reverify/critic-replay
     * transaction for two missing planned secondary keywords.
     *
     * If an already acceptable article cannot safely incorporate
     * those optional terms, retain its accepted original text and
     * warnings. Do NOT reject or erase the paid-for article. Genuine
     * initial BLOCKs must still fail closed and cannot use fallback.
     */
    let masterCriticRepairExecution;
    try {
      masterCriticRepairExecution =
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
    } catch (optionalRepairError) {
      const baselinePlan =
        buildMasterArticleCriticRepairPlanV1({
          contract:
            articleGenerationContract,

          suite:
            masterCriticExecution.suite,
        });
      const warningOnly =
        masterCriticExecution.suite.status !== "BLOCK" &&
        baselinePlan.repairTasks.length > 0 &&
        baselinePlan.repairTasks.every(task =>
          task.findings.every(finding =>
            finding.severity === "WARN" &&
            finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
          )
        );
      if (!warningOnly) {
        throw optionalRepairError;
      }
      console.warn("[content optional keyword recovery] kept verified original", {
        briefId: brief.id,
        articleId: pendingArticle.id,
        reason: optionalRepairError instanceof Error
          ? optionalRepairError.message.slice(0, 220)
          : "OPTIONAL_REPAIR_FAILED",
      });
      masterCriticRepairExecution = Object.freeze({
        version: "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,
        initialCritics: masterCriticExecution,
        repairPlan: baselinePlan,
        run: masterWriterRun,
        finalCritics: masterCriticExecution,
        repairs: Object.freeze([]),
        provenance: Object.freeze({
          criticReplayCount: 0 as const,
          repairedSectionCount: 0,
          repairAttemptCount: 0,
          wholeArticleRewriteCount: 0 as const,
        }),
      });
    }


    /*
     * This is now the ONLY master-article version allowed to
     * enter downstream deterministic gates or persistence.
     */
    recordWriterForensicArtifactV1("critic.repair_execution", {
      masterCriticRepairExecution,
    });
    let acceptedMasterWriterRun =
      masterCriticRepairExecution
        .run;


    let finalMasterCriticExecution =
      masterCriticRepairExecution
        .finalCritics;
    recordWriterTraceV1("critic.final.completed", {
      status: finalMasterCriticExecution.suite.status,
      criticCount: finalMasterCriticExecution.provenance.finalCriticCount,
      repairedSectionCount: masterCriticRepairExecution.provenance.repairedSectionCount,
      repairAttemptCount: masterCriticRepairExecution.provenance.repairAttemptCount,
    });

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
        recordWriterTraceV1("serp.replay.skipped", {
          reasonCode: "PRIOR_MASTER_CRITIC_BLOCK",
        });

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
      recordWriterTraceV1("serp.replay.completed", {
        status: masterSerpReplay.status,
        comparedResultCount: masterSerpReplay.provenance.comparedResultCount,
        blockerCount: masterSerpReplay.blockers.length,
        warningCount: masterSerpReplay.warnings.length,
      });
      recordWriterForensicArtifactV1("serp.replay_and_repair", {
        competitiveReplayExecution,
      });


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
      recordWriterTraceV1("serp.replay.failed", {
        reasonCode: "SERP_REPLAY_EXECUTION_FAILED",
      });


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
    recordWriterTraceV1("writer.before_after_content_fingerprints", {
      originalSha256: hashTraceTextV1(masterWriterRun.article.bodyMarkdown),
      finalSha256: hashTraceTextV1(repaired.bodyMarkdown),
      exactTextChanged: masterWriterRun.article.bodyMarkdown !== repaired.bodyMarkdown,
      initialH2Count: (masterWriterRun.article.bodyMarkdown.match(/^## /gm) ?? []).length,
      finalH2Count: (repaired.bodyMarkdown.match(/^## /gm) ?? []).length,
      initialH3Count: (masterWriterRun.article.bodyMarkdown.match(/^### /gm) ?? []).length,
      finalH3Count: (repaired.bodyMarkdown.match(/^### /gm) ?? []).length,
    });
    recordWriterForensicArtifactV1("writer.repaired_article", {
      briefId: brief.id, articleId: pendingArticle.id, repaired,
    });

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

    recordWriterForensicArtifactV1("audit.publication_policy", {
      publicationPolicy, intelligence,
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

    recordWriterForensicArtifactV1("audit.final_readiness", {
      finalArticleReadiness,
      finalMasterCriticExecution,
      masterSerpReplay,
    });
    recordWriterTraceV1("audit.final_readiness.completed", {
      status: finalArticleReadiness.status,
      blockerCount: finalArticleReadiness.blockers.length,
      warningCount: finalArticleReadiness.warnings.length,
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


    recordWriterTraceV1("article.recovery_classification", {
      failureClass: recovery.failureClass,
      owner: recovery.owner,
      autoRetryAllowed: recovery.autoRetryAllowed,
      persistedStatus: rejectedArticle.status,
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
  });
}


/**
 * Shared release checklist. Approval and publication previously duplicated
 * this exact evidence/SEO/editorial/replay sequence; the original order is
 * retained and no live providers are invoked by this validation helper.
 */
async function requireArticleReadyForReleaseV1(
  articleId: string,
  phase: "approve" | "publish"
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


  if (phase === "approve" && article.status !== "IN_REVIEW") {
    throw new Error(`Cannot approve article with status ${article.status}`);
  }
  if (phase === "publish" && article.status !== "APPROVED") {
    throw new Error("Only approved articles can be published");
  }

  /*
   * Editorial acceptance is separate from technical audit and keyword
   * coverage. Old IN_REVIEW drafts must NOT escape the new guard simply
   * because they were generated before its introduction.
   */
  const releaseEditorialFindings =
    detectPersistedArticleEditorialRepetitionV1(article.bodyMarkdown);
  if (releaseEditorialFindings.length > 0) {
    throw new EditorialRepetitionGateErrorV1(releaseEditorialFindings);
  }

  // A saved article may have passed model/SEO gates while still
  // containing visible text corruption. Never approve or publish that.
  assertArticleProseHygieneV2(article.bodyMarkdown);
  assertArticleInformationGainV1(article.bodyMarkdown);

  assertStoredPublicationEvidenceV1(
    article.brief.evidenceSnapshot?.plan
  );

  // Reject new, globally verified-but-wrong-section, or unsigned
  // external references before approval AND CMS publication. A 100/100
  // technical score and a successful replay do not authorize source
  // citations absent from the immutable plan's VERIFIED_EXCERPT ownership.
  const releaseSourcePlan = article.brief.evidenceSnapshot?.plan;
  const releaseSourceRecord = releaseSourcePlan &&
    typeof releaseSourcePlan === "object" &&
    !Array.isArray(releaseSourcePlan)
      ? releaseSourcePlan as Record<string, unknown> : null;
  const releaseSourceRuntime = inspectMasterRuntimeSnapshot(
    releaseSourcePlan
  ).runtime;
  if (!releaseSourceRuntime || !releaseSourceRecord?.articleExecutionPlan) {
    throw new Error("ARTICLE_RELEASE_RESEARCH_RUNTIME_MISSING");
  }
  const releaseExecutionPlan = parsePersistedArticleExecutionPlanV1(
    releaseSourceRecord.articleExecutionPlan
  );
  const releaseCitationScope = assertReleaseArticleCitationScopeV1({
    candidateBodyMarkdown: article.bodyMarkdown,
    plan: releaseExecutionPlan,
    runtime: releaseSourceRuntime,
  });
  console.info("[content release citation provenance]", {
    articleId,
    approvedLinks: releaseCitationScope.totalLinks,
    unapprovedLinks: releaseCitationScope.unapprovedLinks,
    uncitedSections: releaseCitationScope.uncitedEvidenceSections.length,
  });

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

  // Final approval AND publication must honor the same product-level
  // editorial quality floor as the Writer. A technical score of 100
  // cannot release a source-rich but shallow comprehensive guide.
  const editorialPlanRecord=article.brief.evidenceSnapshot?.plan;
  const editablePlan=editorialPlanRecord&&
    typeof editorialPlanRecord==="object"&&
    !Array.isArray(editorialPlanRecord)
      ? editorialPlanRecord as Record<string,unknown> : null;
  if(editablePlan?.articleExecutionPlan){
    const editorialPlan=parsePersistedArticleExecutionPlanV1(
      editablePlan.articleExecutionPlan);
    assertComprehensiveEditorialReleaseV1(
      evaluateComprehensiveEditorialReleaseV1({
        plan:editorialPlan,
        bodyMarkdown:article.bodyMarkdown,
      }));
  }


  const releaseReplayArtifact =
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


  // The source/plan/replay may be unchanged while the article's exact
  // fingerprint has changed. An old human Query Owner approval MUST NOT
  // authorize the next version. Read the latest signed record through
  // the same validator used by dashboard and both read-only CLIs.
  const releaseArticleShape = {
    title: article.title,
    metaDescription: article.metaDescription,
    h1: article.h1,
    bodyMarkdown: article.bodyMarkdown,
  };
  const releaseResearch = {
    article: releaseArticleShape,
    runtime: releaseSourceRuntime,
    plan: releaseExecutionPlan,
    primaryKeyword: article.brief.primaryKeyword,
    secondaryKeywords: article.brief.secondaryKeywords,
    replay: releaseReplayArtifact,
  };
  const releaseOwner = await resolveApprovedExistingArticleQueryOwnerV1({
    articleId,
    evidenceSnapshotId: article.brief.evidenceSnapshot!.id,
    replayArtifactId: releaseReplayArtifact?.id ?? null,
    research: releaseResearch,
    findReview: nodeId => prisma.contentQueryOwnerReview.findFirst({
      where: { contentArticleId: articleId, queryNodeId: nodeId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  });
  const releaseSearchReadiness = evaluateArticleSearchReadinessV2({
    ...releaseResearch,
    runtime: releaseOwner.runtime,
  });
  const unapprovedQueryFindings = releaseSearchReadiness.findings
    .filter(item => item.code === "QUERY_BINDING_REVIEW_REQUIRED" ||
      item.code === "QUERY_TO_SECTION_BRIDGE_MISSING");
  if (unapprovedQueryFindings.length > 0) {
    throw new Error("ARTICLE_RELEASE_QUERY_BINDING_UNAPPROVED:" +
      unapprovedQueryFindings.map(item => item.code).join(","));
  }

  const releasePublishGate =
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
        releaseReplayArtifact,

      existingGates: {
        contentGatePassed:
          gate.pass,

        publicationPolicyPassed:
          publicationPolicy.pass,
      },
    });


  console.info(
    `[explicit publish gate:${phase}]`,
    {
      articleId,

      pass:
        releasePublishGate.pass,

      blockers:
        releasePublishGate.blockers,

      warnings:
        releasePublishGate.warnings,

      replayArtifactId:
        releasePublishGate
          .replayArtifactId,

      replayStatus:
        releasePublishGate
          .replayStatus,
    }
  );


  assertExplicitPublishGatePassedV1(
    releasePublishGate
  );


  return article;
}

export async function approveArticle(articleId: string) {
  await requireArticleReadyForReleaseV1(articleId, "approve");

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


export async function publishArticle(provider: CMSProvider, articleId: string) {
  const article = await requireArticleReadyForReleaseV1(articleId, "publish");

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

