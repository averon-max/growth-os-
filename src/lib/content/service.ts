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
  executeMasterWriterV1,
} from "./master-writer-orchestrator";

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
  assertArticleCriticsPassed,
  shouldRewriteArticle,
  summarizeArticleCritiques,
} from "./article-review";

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
  supportsArticleReviewGenerator,
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

  const supporting =
    strategy.supporting
      .map(
        (item) =>
          item.keyword
      )
      .join(", ");

  return [
    "CONTENT STRATEGY:",
    `Intent: ${strategy.searchIntent}`,
    `Primary keyword: ${strategy.primary.keyword}`,
    secondary
      ? `Secondary keywords: ${secondary}`
      : "",
    supporting
      ? `Supporting concepts: ${supporting}`
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
      [
        strategy.primary,
        ...strategy.secondary,
        ...strategy.supporting,
      ]
        .slice(0, 15)
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
             * Topic is the acquisition seed only.
             * The Stage planner decides the semantic query graph
             * from live research; this does not reconstruct the
             * Master Runtime from finalPlan.
             */
            keyword:
              input.topic,

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

  const articleGenerationContract =
    buildArticleGenerationContractV1(
      masterRuntimeInspection
        .runtime
    );

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

      sections:
        articleGenerationContract
          .sectionContracts
          .length,

      h1Mission:
        articleGenerationContract
          .h1Mission,
    }
  );

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

  console.info(
    "[content evidence-aware outline]",
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


  const pendingArticle =
    await prisma.contentArticle.create({
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
    const masterWriterRun =
      await executeMasterWriterV1({
        contract:
          articleGenerationContract,

        generator,
      });

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
        masterRuntimeInspection
          .runtime
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
      const competitiveReplayExecution =
        await executeCompetitiveSerpReplayRepairV2({
          contract:
            articleGenerationContract,

          runtime:
            masterRuntimeInspection
              .runtime,

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
     * Master writer output is contract-bound section-by-section.
     *
     * Legacy rewriteArticle() rewrites the entire article and can
     * mutate canonical H2 ownership, section order, evidence
     * assignments and generation provenance.
     *
     * Until targeted section repair is connected, critics may
     * PASS or BLOCK, but may not invoke whole-article repair.
     */
    const allowLegacyWholeArticleRewrite =
      false as const;

    if (
      supportsArticleReviewGenerator(
        generator
      )
    ) {
      const reviewGenerator =
        generator;

      try {
      const criticRoles = [
        "SEARCH_INTENT",
        "FACT_CLAIM",
        "EDITORIAL",
      ] as const;

      const researchContext =
        [
          researchPackPrompt(
            researchPack
          ),

          externalEvidenceContext,
        ]
          .filter(
            Boolean
          )
          .join(
            "\n\n"
          );

      const reviewOutline =
        articleOutlinePlan.outline;

      const runCritics =
        async (
          article:
            typeof generated
        ) => {
          const results:
            Awaited<
              ReturnType<
                typeof reviewGenerator.critiqueArticle
              >
            >[] = [];

          /*
           * Intentionally sequential.
           *
           * Running SEARCH_INTENT, FACT_CLAIM and EDITORIAL
           * simultaneously multiplies pressure on the same Gemini
           * model and turns one transient 429/503 into a failed
           * article generation.
           */
          for (
            const role
            of criticRoles
          ) {
            results.push(
              await reviewGenerator
                .critiqueArticle({
                  role,

                  article,

                  researchContext,

                  primaryKeyword:
                    brief.primaryKeyword,

                  searchIntent:
                    brief.searchIntent,

                  secondaryKeywords:
                    brief.secondaryKeywords,

                  outline:
                    reviewOutline,
                })
            );
          }

          return results;
        };

      const initialCritiques =
        await runCritics(
          reviewedArticle
        );

      const initialSummary =
        summarizeArticleCritiques(
          initialCritiques
        );

      console.info(
        "[content critics] initial",
        {
          briefId:
            brief.id,

          pass:
            initialSummary.pass,

          counts:
            initialSummary.counts,

          findings:
            initialSummary
              .findings
              .map(
                (finding) => ({
                  code:
                    finding.code,

                  severity:
                    finding.severity,

                  message:
                    finding.message,
                })
              ),
        }
      );

      if (
        allowLegacyWholeArticleRewrite &&
        (
          shouldRewriteArticle(
            initialSummary
          ) ||
          shouldRewriteEditorialFindings(
            initialSummary.findings
          )
        )
      ) {
        reviewedArticle =
          await reviewGenerator
            .rewriteArticle({
              article:
                reviewedArticle,

              findings:
                initialSummary.findings,

              researchContext,

              primaryKeyword:
                brief.primaryKeyword,

              searchIntent:
                brief.searchIntent,

              secondaryKeywords:
                brief.secondaryKeywords,

              outline:
                reviewOutline,
            });

        const finalCritiques =
          await runCritics(
            reviewedArticle
          );

        const finalSummary =
          summarizeArticleCritiques(
            finalCritiques
          );

        console.info(
          "[content critics] final",
          {
            briefId:
              brief.id,

            pass:
              finalSummary.pass,

            counts:
              finalSummary.counts,

            findings:
              finalSummary
                .findings
                .map(
                  (finding) => ({
                    code:
                      finding.code,

                    severity:
                      finding.severity,

                    message:
                      finding.message,
                  })
                ),
          }
        );

        try {
          assertArticleCriticsPassed(
            finalSummary
          );

          assertEditorialFindingsResolved(
            finalSummary.findings
          );
        } catch (
          reviewGateError
        ) {
          reviewGateWarning =
            reviewGateError instanceof Error
              ? reviewGateError.message
              : "ARTICLE_REVIEW_GATE_FAILED";

          console.warn(
            "[content critics] final gate requires review; article retained",
            {
              briefId:
                brief.id,

              articleId:
                pendingArticle.id,

              message:
                reviewGateWarning,
            }
          );
        }
      }
      } catch (
        reviewError
      ) {
        if (
          !isTransientContentProviderFailure(
            reviewError
          )
        ) {
          throw reviewError;
        }

        const reviewMessage =
          reviewError instanceof Error
            ? reviewError.message
            : "Temporary Gemini review failure";

        reviewProviderWarning =
          [
            "ARTICLE_REVIEW_PROVIDER_TEMPORARY",
            reviewMessage.slice(
              0,
              240
            ),
          ].join(
            ": "
          );

        /*
         * The writer already produced an article.
         *
         * A temporary critic/rewrite provider outage must not
         * destroy that work. Deterministic quality/evidence gates
         * still run below, and the article remains non-publishable
         * until review is complete.
         */
        console.warn(
          "[content critics] temporary provider failure; article retained",
          {
            briefId:
              brief.id,

            articleId:
              pendingArticle.id,

            message:
              reviewMessage,
          }
        );
      }

    } else {
      console.warn(
        "[content critics] provider does not support multi-pass article review",
        {
          briefId:
            brief.id,

          generator:
            generator.modelName,
        }
      );
    }

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
            "IN_REVIEW",

          publishError:
            formatArticlePublicationPolicyFailure(
              publicationPolicy
            ),
        },
      });
    }


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
            "IN_REVIEW",

          publishError:
            reviewProviderWarning ??
            reviewGateWarning,
        },
      });
    }


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
          "DRAFT",

        publishError:
          null,
      },
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "";

    const transientProviderFailure =
      /(?:Gemini|Groq) API error (413|429|500|502|503|504)\b/.test(
        rawMessage
      ) ||
      /AbortError|aborted|timeout/i.test(
        rawMessage
      );

    if (transientProviderFailure) {
      console.warn(
        "[content generation] temporary provider failure",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          message:
            rawMessage.slice(
              0,
              240
            ),
        }
      );

      await prisma.contentArticle.delete({
        where: {
          id:
            pendingArticle.id,
        },
      }).catch(
        () => undefined
      );

      throw error;
    }

    const message =
      error instanceof
      ContentGenerationError
        ? error.message
        : "Article generation failed";

    return prisma.contentArticle.update({
      where: {
        id:
          pendingArticle.id,
      },

      data: {
        status:
          "REJECTED",

        publishError:
          message,
      },
    });
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
      "DRAFT" &&
    article.status !==
      "IN_REVIEW"
  ) {
    throw new Error(
      `Cannot approve article with status ${article.status}`
    );
  }

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
