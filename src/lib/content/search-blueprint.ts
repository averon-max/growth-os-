import type {
  BusinessFactRegistry,
} from "./business-facts";

import type {
  FinalContentPlan,
} from "./final-content-plan";

export type SearchBlueprintReadiness =
  | "READY"
  | "REVIEW"
  | "BLOCKED";

export interface SearchBlueprint {
  version:
    "SEARCH_BLUEPRINT_V1";

  mode:
    "SHADOW";

  topic:
    string;

  readiness:
    SearchBlueprintReadiness;

  decision: {
    productionPrimaryKeyword:
      string;

    recommendedPrimaryKeyword:
      string | null;

    primaryChanged:
      boolean;

    searchIntent:
      string;

    action:
      string;

    existingBriefId:
      string | null;

    existingTopic:
      string | null;

    keywordDecisionStatus:
      string;

    keywordDecisionConfidence:
      string;

    serpFeasibility:
      string;

    serpConfidence:
      string;
  };

  searchEvidence: {
    searchVolume:
      number | null;

    difficulty:
      number | null;

    existingPosition:
      number | null;

    impressions:
      number;

    clicks:
      number;

    observedCtr:
      number | null;

    topicalAuthorityStrength:
      number | null;

    organicResults:
      number;

    eligibleCompetitorPages:
      number;

    competitionShape:
      string;

    targetFormat:
      string;

    aiOverview:
      boolean;

    peopleAlsoAsk:
      boolean;
  };

  coverage: {
    secondaryKeywords:
      string[];

    supportingConcepts:
      string[];

    requiredTopics:
      string[];

    questionsToAnswer:
      string[];

    contentGaps:
      string[];
  };

  pageMission: {
    targetFormat:
      string;

    directAnswerRequired:
      boolean;

    toolFirstWhenAvailable:
      boolean;

    doNotCreateCompetingUrl:
      boolean;

    exactOneH1:
      true;

    headingCountsAreNotTargets:
      true;
  };

  informationGain: {
    required:
      true;

    status:
      "UNPROVEN";

    evidenceCandidates:
      string[];
  };

  evidencePolicy: {
    verifiedBusinessClaimCount:
      number;

    verifiedBusinessClaims:
      string[];

    useOnlyVerifiedProductClaims:
      true;

    sourceEvidenceWhenNeeded:
      true;

    forbidInventedStatistics:
      true;

    forbidInventedCapabilities:
      true;
  };

  governance: {
    blockers:
      string[];

    reviews:
      string[];

    reasons:
      string[];
  };

  measurement: {
    searchConsole:
      boolean;

    rankTracking:
      boolean;

    ga4:
      boolean;

    cloudflareVerifiedBots:
      boolean;

    aiCrawlerReadiness:
      boolean;
  };
}

function unique(
  values:
    string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

function observedCtr(
  clicks: number,
  impressions: number
): number | null {
  if (
    impressions <=
    0
  ) {
    return null;
  }

  return (
    Math.round(
      (
        clicks /
        impressions
      ) *
        10000
    ) /
    10000
  );
}


export function shouldPreserveProductionPrimaryMission({
  productionPrimary,
  searchIntent,
  keywordDecision,
}: {
  productionPrimary: string;

  searchIntent: string;

  keywordDecision:
    | {
        status: string;
        confidence: string;

        ranked: Array<{
          keyword: string;
          eligible: boolean;
          intent: string;
        }>;
      }
    | null
    | undefined;
}): boolean {
  if (
    !keywordDecision ||
    keywordDecision.confidence !==
      "LOW"
  ) {
    return false;
  }

  const normalizedPrimary =
    productionPrimary
      .trim()
      .toLowerCase();

  const productionCandidate =
    keywordDecision.ranked.find(
      (candidate) =>
        candidate.keyword
          .trim()
          .toLowerCase() ===
        normalizedPrimary
    );

  if (
    !productionCandidate ||
    !productionCandidate.eligible
  ) {
    return false;
  }

  return (
    productionCandidate.intent ===
    searchIntent
  );
}


export function buildSearchBlueprint({
  plan,
  businessFacts,
}: {
  plan:
    FinalContentPlan;

  businessFacts:
    BusinessFactRegistry;
}): SearchBlueprint {
  const blockers:
    string[] =
      [];

  const reviews:
    string[] =
      [];

  const reasons:
    string[] =
      [];

  const strategy =
    plan.strategy;

  const keywordDecision =
    strategy
      .decisionIntelligence ??
    null;

  const serp =
    plan.serpFeasibility ??
    null;

  let recommendedPrimary =
    keywordDecision
      ?.primary
      ?.keyword ??
    null;

  const productionPrimary =
    strategy.primary.keyword;

  const preserveProductionPrimaryMission =
    shouldPreserveProductionPrimaryMission({
      productionPrimary,
      searchIntent:
        strategy.searchIntent,
      keywordDecision,
    });

  if (
    preserveProductionPrimaryMission
  ) {
    recommendedPrimary =
      productionPrimary;
  }

  const primaryChanged =
    Boolean(
      recommendedPrimary &&
      recommendedPrimary !==
        productionPrimary
    );

  if (
    !keywordDecision
  ) {
    reviews.push(
      "KEYWORD_DECISION_INTELLIGENCE_UNAVAILABLE"
    );
  } else {
    if (
      keywordDecision.status ===
      "NO_GO"
    ) {
      if (
        preserveProductionPrimaryMission
      ) {
        reviews.push(
          "LOW_CONFIDENCE_PRIMARY_MISSION_PRESERVED"
        );

        reasons.push(
          "PRODUCTION_PRIMARY_PRESERVED_OVER_LOW_CONFIDENCE_OVERRIDE"
        );
      } else {
        blockers.push(
          "KEYWORD_DECISION_NO_GO"
        );
      }
    }

    if (
      keywordDecision.confidence ===
      "LOW"
    ) {
      reviews.push(
        "LOW_KEYWORD_DECISION_CONFIDENCE"
      );
    }

    if (
      primaryChanged
    ) {
      reviews.push(
        "SHADOW_PRIMARY_DIFFERS_FROM_PRODUCTION"
      );
    }
  }

  if (
    !serp
  ) {
    reviews.push(
      "SERP_FEASIBILITY_INTELLIGENCE_UNAVAILABLE"
    );
  } else {
    if (
      serp.feasibility ===
      "UNKNOWN" &&
      strategy.action.type ===
        "CREATE_NEW"
    ) {
      blockers.push(
        "INSUFFICIENT_SERP_EVIDENCE_FOR_NEW_PAGE"
      );
    }

    if (
      serp.feasibility ===
      "CHALLENGING"
    ) {
      reviews.push(
        "SERP_STRUCTURALLY_CHALLENGING"
      );
    }

    if (
      serp.confidence ===
      "LOW"
    ) {
      reviews.push(
        "LOW_SERP_EVIDENCE_CONFIDENCE"
      );
    }
  }

  const targetFormat =
    String(
      plan.targetFormat
    );

  if (
    targetFormat.includes(
      "TOOL"
    )
  ) {
    reviews.push(
      "VERIFY_REAL_INTERACTIVE_CAPABILITY"
    );
  }

  if (
    strategy.action.type ===
      "UPDATE_EXISTING" ||
    strategy.action.type ===
      "MERGE_OR_UPDATE"
  ) {
    if (
      !strategy.action
        .existingBriefId
    ) {
      blockers.push(
        "EXISTING_CONTENT_REFERENCE_MISSING"
      );
    }

    reasons.push(
      "EXISTING_CONTENT_MUST_BE_PRESERVED_OR_MERGED"
    );
  }

  if (
    strategy.action.type ===
    "CREATE_NEW"
  ) {
    reviews.push(
      "INFORMATION_GAIN_MUST_BE_PROVEN_BEFORE_GENERATION"
    );
  }

  if (
    (
      strategy.searchIntent ===
        "COMMERCIAL" ||
      strategy.searchIntent ===
        "TRANSACTIONAL"
    ) &&
    businessFacts
      .verifiedClaims
      .length ===
      0
  ) {
    reviews.push(
      "NO_VERIFIED_PRODUCT_CLAIMS_FOR_COMMERCIAL_CONTENT"
    );
  }

  if (
    plan.searchFeatures
      .aiOverview
  ) {
    reasons.push(
      "AI_OVERVIEW_REQUIRES_RETRIEVAL_READY_FACTUAL_PASSAGES"
    );
  }

  if (
    plan.searchFeatures
      .peopleAlsoAsk
  ) {
    reasons.push(
      "PAA_REQUIRES_SAME_INTENT_QUESTION_COVERAGE"
    );
  }

  /*
   * PRODUCTION_PRIMARY_METRIC_AUTHORITY_V2
   *
   * Search evidence belongs to the actual production primary.
   * KeywordDecision.primary may differ from production primary
   * in EXACT or preserved low-confidence mission flows.
   */
  const normalizedProductionPrimaryForMetrics =
    productionPrimary
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );


  const productionMetricCandidate =
    keywordDecision
      ?.ranked
      .find(
        (
          candidate
        ) =>
          candidate.keyword
            .trim()
            .toLowerCase()
            .replace(
              /\s+/g,
              " "
            ) ===
          normalizedProductionPrimaryForMetrics
      ) ??
    null;

  const metricSource =
    productionMetricCandidate
      ? {
          searchVolume:
            productionMetricCandidate
              .metrics
              .searchVolume,

          difficulty:
            productionMetricCandidate
              .metrics
              .difficulty,

          existingPosition:
            productionMetricCandidate
              .metrics
              .existingPosition,

          impressions:
            productionMetricCandidate
              .metrics
              .impressions,

          clicks:
            productionMetricCandidate
              .metrics
              .clicks,

          ctr:
            productionMetricCandidate
              .metrics
              .observedCtr,

          authority:
            productionMetricCandidate
              .metrics
              .authorityStrength,
        }
      : {
          searchVolume:
            strategy.primary
              .searchVolume,

          difficulty:
            strategy.primary
              .difficulty,

          existingPosition:
            strategy.primary
              .existingPosition,

          impressions:
            strategy.primary
              .impressions,

          clicks:
            strategy.primary
              .clicks,

          ctr:
            observedCtr(
              strategy.primary
                .clicks,
              strategy.primary
                .impressions
            ),

          authority:
            null,
        };

  const secondaryKeywords =
    keywordDecision
      ?.status ===
        "SELECTED" &&
    keywordDecision
      .secondary
      .length >
      0
      ? keywordDecision
          .secondary
          .map(
            (item) =>
              item.keyword
          )
      : strategy.secondary
          .map(
            (item) =>
              item.keyword
          );

  const informationGainCandidates =
    unique([
      ...plan.architecture
        .contentGaps
        .map(
          (gap) =>
            `SERP_GAP:${gap}`
        ),

      ...businessFacts
        .verifiedClaims
        .map(
          (claim) =>
            `FIRST_PARTY_FACT:${claim}`
        ),

      targetFormat.includes(
        "TOOL"
      )
        ? "INTERACTIVE_EXPERIENCE"
        : "",
    ]);

  const readiness:
    SearchBlueprintReadiness =
      blockers.length >
      0
        ? "BLOCKED"
        : reviews.length >
            0
          ? "REVIEW"
          : "READY";

  return {
    version:
      "SEARCH_BLUEPRINT_V1",

    mode:
      "SHADOW",

    topic:
      strategy.topic,

    readiness,

    decision: {
      productionPrimaryKeyword:
        productionPrimary,

      recommendedPrimaryKeyword:
        recommendedPrimary,

      primaryChanged,

      searchIntent:
        strategy.searchIntent,

      action:
        strategy.action.type,

      existingBriefId:
        strategy.action
          .existingBriefId,

      existingTopic:
        strategy.action
          .existingTopic,

      keywordDecisionStatus:
        keywordDecision
          ?.status ??
        "UNAVAILABLE",

      keywordDecisionConfidence:
        keywordDecision
          ?.confidence ??
        "UNAVAILABLE",

      serpFeasibility:
        serp
          ?.feasibility ??
        "UNAVAILABLE",

      serpConfidence:
        serp
          ?.confidence ??
        "UNAVAILABLE",
    },

    searchEvidence: {
      searchVolume:
        metricSource
          .searchVolume,

      difficulty:
        metricSource
          .difficulty,

      existingPosition:
        metricSource
          .existingPosition,

      impressions:
        metricSource
          .impressions,

      clicks:
        metricSource
          .clicks,

      observedCtr:
        metricSource
          .ctr,

      topicalAuthorityStrength:
        metricSource
          .authority,

      organicResults:
        plan.benchmark
          .organicResults,

      eligibleCompetitorPages:
        plan.benchmark
          .eligiblePages,

      competitionShape:
        serp
          ?.competitionShape ??
        "UNAVAILABLE",

      targetFormat,

      aiOverview:
        plan.searchFeatures
          .aiOverview,

      peopleAlsoAsk:
        plan.searchFeatures
          .peopleAlsoAsk,
    },

    coverage: {
      secondaryKeywords:
        unique(
          secondaryKeywords
        ),

      supportingConcepts:
        unique(
          strategy.supporting
            .map(
              (item) =>
                item.keyword
            )
        ),

      requiredTopics:
        unique(
          plan.architecture
            .requiredTopics
        ),

      questionsToAnswer:
        unique(
          plan.architecture
            .questionsToAnswer
        ),

      contentGaps:
        unique(
          plan.architecture
            .contentGaps
        ),
    },

    pageMission: {
      targetFormat,

      directAnswerRequired:
        plan.architecture
          .directAnswerBeforeFirstH2,

      toolFirstWhenAvailable:
        plan.architecture
          .toolFirstWhenAvailable,

      doNotCreateCompetingUrl:
        strategy.action.type !==
        "CREATE_NEW",

      exactOneH1:
        true,

      headingCountsAreNotTargets:
        true,
    },

    informationGain: {
      required:
        true,

      status:
        "UNPROVEN",

      evidenceCandidates:
        informationGainCandidates,
    },

    evidencePolicy: {
      verifiedBusinessClaimCount:
        businessFacts
          .verifiedClaims
          .length,

      verifiedBusinessClaims:
        [
          ...businessFacts
            .verifiedClaims,
        ],

      useOnlyVerifiedProductClaims:
        true,

      sourceEvidenceWhenNeeded:
        true,

      forbidInventedStatistics:
        true,

      forbidInventedCapabilities:
        true,
    },

    governance: {
      blockers:
        unique(
          blockers
        ),

      reviews:
        unique(
          reviews
        ),

      reasons:
        unique(
          reasons
        ),
    },

    measurement: {
      searchConsole:
        strategy
          .measurementPlan
          .searchConsole,

      rankTracking:
        strategy
          .measurementPlan
          .rankTracking,

      ga4:
        strategy
          .measurementPlan
          .ga4,

      cloudflareVerifiedBots:
        strategy
          .measurementPlan
          .cloudflareVerifiedBots,

      aiCrawlerReadiness:
        strategy
          .measurementPlan
          .aiCrawlerReadiness,
    },
  };
}

export function searchBlueprintPrompt(
  blueprint:
    SearchBlueprint
): string {
  return [
    "SEARCH BLUEPRINT V1:",

    `Readiness: ${blueprint.readiness}`,

    `Production primary: ${blueprint.decision.productionPrimaryKeyword}`,

    blueprint
      .decision
      .recommendedPrimaryKeyword
      ? `Evidence-recommended primary: ${blueprint.decision.recommendedPrimaryKeyword}`
      : "",

    `Intent: ${blueprint.decision.searchIntent}`,

    `Page action: ${blueprint.decision.action}`,

    `Target format: ${blueprint.pageMission.targetFormat}`,

    `Keyword decision: ${blueprint.decision.keywordDecisionStatus} / ${blueprint.decision.keywordDecisionConfidence}`,

    `SERP feasibility: ${blueprint.decision.serpFeasibility} / ${blueprint.decision.serpConfidence}`,

    blueprint.coverage
      .requiredTopics
      .length
      ? `Required topics:\n${blueprint.coverage.requiredTopics.map((item) => `- ${item}`).join("\n")}`
      : "",

    blueprint.coverage
      .questionsToAnswer
      .length
      ? `Questions to answer:\n${blueprint.coverage.questionsToAnswer.map((item) => `- ${item}`).join("\n")}`
      : "",

    blueprint.coverage
      .contentGaps
      .length
      ? `Observed content gaps:\n${blueprint.coverage.contentGaps.map((item) => `- ${item}`).join("\n")}`
      : "",

    "Information gain must be proven before production generation.",

    "Never invent statistics, product capabilities, citations, studies, customers, guarantees, awards, or first-party data.",

    "Competitor word count and heading counts are observations only, never generation targets.",

    blueprint.governance
      .blockers
      .length
      ? `BLOCKERS:\n${blueprint.governance.blockers.map((item) => `- ${item}`).join("\n")}`
      : "",

    blueprint.governance
      .reviews
      .length
      ? `REVIEW REQUIREMENTS:\n${blueprint.governance.reviews.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join(
      "\n\n"
    );
}
