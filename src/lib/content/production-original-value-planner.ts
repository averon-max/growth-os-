import type {
  ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";

import type {
  SerpCompetitiveCoverageMap,
} from "./production-ranking-inputs";


interface OpportunityLike {
  topic?:
    unknown;

  originalValueOpportunity?:
    unknown;

  competitorCoverage?:
    unknown;

  competitorClarity?:
    unknown;

  competitorEvidence?:
    unknown;

  competitorAction?:
    unknown;
}


function clean(
  value:
    unknown
): string {
  return (
    typeof value ===
      "string"
      ? value.trim()
      : ""
  );
}


function slug(
  value:
    string
): string {
  const normalized =
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    normalized ||
    "article"
  ).slice(
    0,
    60
  );
}


export interface ProductionOriginalValuePlanningResult {
  input:
    ProductionMasterArtifactPipelineInput[
      "originalValue"
    ];

  focusTopic:
    string | null;

  assetId:
    string | null;
}


/*
 * PRODUCTION_ORIGINAL_VALUE_PLANNER_V1
 *
 * This creates a PLANNED content asset, not a factual claim.
 *
 * The asset may be derived from:
 * - live Top-10 SERP coverage
 * - observed competitor gaps
 * - observed SERP questions
 *
 * It is deliberately `verified:false`.
 *
 * Verification remains a separate evidence/publication concern.
 */
export function planProductionOriginalValue({
  topic,
  serpCoverage,
  opportunities,
}: {
  topic:
    string;

  serpCoverage:
    Readonly<
      SerpCompetitiveCoverageMap
    >;

  opportunities:
    readonly OpportunityLike[];
}): Readonly<
  ProductionOriginalValuePlanningResult
> {
  const cleanTopic =
    topic.trim();


  const explicitOpportunities =
    opportunities
      .filter(
        (
          item
        ) =>
          item
            .originalValueOpportunity ===
            true
      )
      .map(
        (
          item
        ) =>
          clean(
            item.topic
          )
      )
      .filter(
        Boolean
      );


  const focusTopic =
    explicitOpportunities[0] ??
    (
      serpCoverage
        .observedQuestions[0]
        ?.trim() ||
      null
    );


  const hasLiveCompetitiveEvidence =
    serpCoverage
      .analyzedResults >
      0;


  const hasGapOpportunity =
    explicitOpportunities
      .length >
      0;


  if (
    !hasLiveCompetitiveEvidence &&
    !hasGapOpportunity
  ) {
    return Object.freeze({
      input:
        Object.freeze({
          assets:
            [],

          commoditySignals:
            {},
        }),

      focusTopic:
        null,

      assetId:
        null,
    });
  }


  const assetId =
    `serp-synthesis-${slug(
      cleanTopic
    )}`;


  const matrixFocus =
    focusTopic ??
    cleanTopic;


  const descriptionParts = [
    `Create an original comparison/decision matrix for ${matrixFocus}.`,
    `The structure is derived from ${serpCoverage.analyzedResults} live organic SERP results`,
    `across ${serpCoverage.uniqueDomains} observed domains.`,
  ];


  if (
    serpCoverage
      .governmentResults >
    0
  ) {
    descriptionParts.push(
      `The live SERP contains ${serpCoverage.governmentResults} government result(s), so authoritative-source distinctions should be explicit.`
    );
  }


  if (
    serpCoverage
      .observedQuestions
      .length >
    0
  ) {
    descriptionParts.push(
      `Use observed SERP questions to organize decision criteria, not to create factual evidence.`
    );
  }


  descriptionParts.push(
    "Any factual cell or recommendation must be backed by verified claim evidence before publication."
  );


  const asset:
    ProductionMasterArtifactPipelineInput[
      "originalValue"
    ]["assets"][number] =
      {
        id:
          assetId,

        type:
          "COMPARISON_MATRIX",

        title:
          `${cleanTopic}: decision and limitation matrix`,

        description:
          descriptionParts.join(
            " "
          ),

        firstParty:
          false,

        verified:
          false,
      };


  return Object.freeze({
    input:
      Object.freeze({
        assets: [
          asset,
        ],

        commoditySignals: {
          newSynthesis:
            1,

          originalTables:
            1,
        },
      }),

    focusTopic,

    assetId,
  });
}
