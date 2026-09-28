import {
  getWebsiteKeywordContext,
} from "./keyword-context";

import {
  getBusinessFactRegistryForWebsite,
} from "./business-fact-repository";

import {
  buildSerpIntelligence,
} from "./serp-intelligence";

import {
  createSerpSnapshot,
} from "./serp-observatory";

import {
  fetchRelatedKeywords,
  fetchKeywordDifficulty,
  fetchSearchVolume,
} from "@/lib/keywords/dataforseo-provider";

import type {
  ProductionMasterSourceRecord,
} from "./production-master-source-assembler";


type WebsiteKeywordContext =
  Awaited<
    ReturnType<
      typeof getWebsiteKeywordContext
    >
  >;


type RelatedKeywordEvidence =
  Awaited<
    ReturnType<
      typeof fetchRelatedKeywords
    >
  >;


type SearchVolumeEvidence =
  Awaited<
    ReturnType<
      typeof fetchSearchVolume
    >
  >;


type KeywordDifficultyEvidence =
  Awaited<
    ReturnType<
      typeof fetchKeywordDifficulty
    >
  >;


type LiveSerpIntelligence =
  Awaited<
    ReturnType<
      typeof buildSerpIntelligence
    >
  >;


type VerifiedBusinessFacts =
  Awaited<
    ReturnType<
      typeof getBusinessFactRegistryForWebsite
    >
  >;


type LiveSerpSnapshot =
  ReturnType<
    typeof createSerpSnapshot
  >;


export interface ProductionMasterLiveSourceInput {
  websiteId:
    string;

  keyword:
    string;

  locationName?:
    string;

  countryCode?:
    string;

  languageName?:
    string;

  languageCode?:
    string;

  relatedKeywordLimit?:
    number;

  capturedAt?:
    Date;
}


export interface ProductionMasterLiveSourceResearch {
  version:
    "PRODUCTION_MASTER_LIVE_SOURCE_V1";

  websiteId:
    string;

  keyword:
    string;

  market:
    Readonly<{
      locationName:
        string;

      countryCode:
        string;

      languageName:
        string;

      languageCode:
        string;
    }>;

  capturedAt:
    Date;

  keywordContext:
    WebsiteKeywordContext;

  dataForSeo:
    Readonly<{
      relatedKeywords:
        RelatedKeywordEvidence;

      searchVolume:
        SearchVolumeEvidence;

      keywordDifficulty:
        KeywordDifficultyEvidence;
    }>;

  serpIntelligence:
    LiveSerpIntelligence;

  serpSnapshot:
    LiveSerpSnapshot;

  businessFacts:
    VerifiedBusinessFacts;

  provenance:
    readonly Readonly<
      ProductionMasterSourceRecord
    >[];
}


export interface ProductionMasterLiveSourceDependencies {
  getWebsiteKeywordContext:
    typeof getWebsiteKeywordContext;

  getBusinessFactRegistryForWebsite:
    typeof getBusinessFactRegistryForWebsite;

  buildSerpIntelligence:
    typeof buildSerpIntelligence;

  fetchRelatedKeywords:
    typeof fetchRelatedKeywords;

  fetchSearchVolume:
    typeof fetchSearchVolume;

  fetchKeywordDifficulty:
    typeof fetchKeywordDifficulty;
}


export const
DEFAULT_PRODUCTION_MASTER_LIVE_SOURCE_DEPENDENCIES:
  ProductionMasterLiveSourceDependencies =
    Object.freeze({
      getWebsiteKeywordContext,

      getBusinessFactRegistryForWebsite,

      buildSerpIntelligence,

      fetchRelatedKeywords,

      fetchSearchVolume,

      fetchKeywordDifficulty,
    });


export class ProductionMasterLiveSourceError
  extends Error {
  readonly code:
    string;


  constructor(
    code:
      string,
    message:
      string
  ) {
    super(
      message
    );

    this.name =
      "ProductionMasterLiveSourceError";

    this.code =
      code;
  }
}


function requiredText(
  value:
    string |
    undefined,
  code:
    string
): string {
  const clean =
    value
      ?.trim();


  if (!clean) {
    throw new ProductionMasterLiveSourceError(
      code,
      code
    );
  }


  return clean;
}


function normalizeLimit(
  value:
    number |
    undefined
): number {
  if (
    value ===
    undefined
  ) {
    return 50;
  }


  if (
    !Number.isInteger(
      value
    ) ||
    value < 1 ||
    value > 50
  ) {
    throw new ProductionMasterLiveSourceError(
      "LIVE_SOURCE_RELATED_LIMIT_INVALID",
      "relatedKeywordLimit must be an integer between 1 and 50."
    );
  }


  return value;
}


function snapshotResults(
  serp:
    LiveSerpIntelligence
): Parameters<
  typeof createSerpSnapshot
>[0]["results"] {
  /*
   * Only observed fields are copied.
   *
   * We intentionally do not infer page type, query intent,
   * authority, quality, or any missing SEO metric here.
   */
  return serp.organic.map(
    (
      item
    ) => ({
      rank:
        item.rank,

      url:
        item.url,

      domain:
        item.domain,

      /*
       * REAL_SERP_ORIGINALITY_CONTEXT_V1
       *
       * These values come directly from the observed live SERP.
       * They are comparison context only — never publication evidence.
       */
      title:
        item.title,

      snippet:
        item.description ??
        undefined,
    })
  ) as Parameters<
    typeof createSerpSnapshot
  >[0]["results"];
}


function snapshotFeatures(
  serp:
    LiveSerpIntelligence
): string[] {
  const features:
    string[] =
      [];


  if (
    serp.questions.length >
    0
  ) {
    features.push(
      "PEOPLE_ALSO_ASK"
    );
  }


  if (
    serp.aiOverview.present
  ) {
    features.push(
      "AI_OVERVIEW"
    );
  }


  return features;
}


function snapshotAiOverview(
  serp:
    LiveSerpIntelligence
): NonNullable<
  Parameters<
    typeof createSerpSnapshot
  >[0]["aiOverview"]
> {
  const references =
    serp.aiOverview
      .references
      .flatMap(
        (
          reference
        ) => {
          const url =
            reference.url
              ?.trim();


          if (!url) {
            return [];
          }


          const domain =
            reference.domain
              ?.trim();


          return [
            {
              url,

              ...(domain
                ? {
                    domain,
                  }
                : {}),
            },
          ];
        }
      );


  return {
    present:
      serp.aiOverview.present,

    references,
  };
}


function buildProvenance({
  websiteId,
  keyword,
  serpSnapshot,
  businessFacts,
}: {
  websiteId:
    string;

  keyword:
    string;

  serpSnapshot:
    LiveSerpSnapshot;

  businessFacts:
    VerifiedBusinessFacts;
}): readonly Readonly<
  ProductionMasterSourceRecord
>[] {
  const records:
    ProductionMasterSourceRecord[] =
      [
        {
          stage:
            "QUERY_GRAPH",

          source:
            "PERSISTED_KEYWORD_METRICS",

          ref:
            `keyword-context:${websiteId}`,
        },

        {
          stage:
            "QUERY_GRAPH",

          source:
            "DATAFORSEO",

          ref:
            `dataforseo:keyword-research:${keyword}`,
        },

        {
          stage:
            "SERP_RESEARCH",

          source:
            "LIVE_SERP",

          ref:
            serpSnapshot.fingerprint,
        },
      ];


  if (
    businessFacts
      .verifiedClaims.length >
    0
  ) {
    records.push({
      stage:
        "EVIDENCE_GRAPH",

      source:
        "VERIFIED_BUSINESS_FACT",

      ref:
        businessFacts.factIds.length >
        0
          ? `business-facts:${businessFacts.factIds.join(",")}`
          : `business-facts:${websiteId}`,
    });
  }


  return Object.freeze(
    records.map(
      (
        record
      ) =>
        Object.freeze({
          ...record,
        })
    )
  );
}


/*
 * Real production source acquisition boundary.
 *
 * This function MAY perform provider/database reads when called
 * with the default dependencies.
 *
 * Tests MUST inject dependencies and therefore spend zero
 * provider requests.
 *
 * This layer only acquires and normalizes observed evidence.
 * It does not invent Stage 2-8 conclusions.
 */
export async function collectProductionMasterLiveSources(
  input:
    ProductionMasterLiveSourceInput,
  dependencies:
    ProductionMasterLiveSourceDependencies =
      DEFAULT_PRODUCTION_MASTER_LIVE_SOURCE_DEPENDENCIES
): Promise<
  Readonly<
    ProductionMasterLiveSourceResearch
  >
> {
  const websiteId =
    requiredText(
      input.websiteId,
      "LIVE_SOURCE_WEBSITE_ID_REQUIRED"
    );


  const keyword =
    requiredText(
      input.keyword,
      "LIVE_SOURCE_KEYWORD_REQUIRED"
    );


  const locationName =
    input.locationName
      ?.trim() ||
    "United States";


  const countryCode =
    input.countryCode
      ?.trim() ||
    "US";


  const languageName =
    input.languageName
      ?.trim() ||
    "English";


  const languageCode =
    input.languageCode
      ?.trim() ||
    "en";


  const relatedKeywordLimit =
    normalizeLimit(
      input.relatedKeywordLimit
    );


  const capturedAt =
    input.capturedAt
      ? new Date(
          input.capturedAt
        )
      : new Date();


  if (
    Number.isNaN(
      capturedAt.getTime()
    )
  ) {
    throw new ProductionMasterLiveSourceError(
      "LIVE_SOURCE_CAPTURED_AT_INVALID",
      "capturedAt must be a valid date."
    );
  }


  /*
   * All six operations are independent source reads.
   *
   * No missing value is replaced with zero or an invented
   * SEO score.
   */
  const [
    keywordContext,
    relatedKeywords,
    searchVolume,
    keywordDifficulty,
    serpIntelligence,
    businessFacts,
  ] =
    await Promise.all([
      dependencies
        .getWebsiteKeywordContext(
          websiteId
        ),

      dependencies
        .fetchRelatedKeywords(
          keyword,
          locationName,
          languageName,
          1,
          relatedKeywordLimit
        ),

      dependencies
        .fetchSearchVolume(
          [
            keyword,
          ],
          locationName,
          languageName
        ),

      dependencies
        .fetchKeywordDifficulty(
          [
            keyword,
          ],
          locationName,
          languageName
        ),

      dependencies
        .buildSerpIntelligence({
          keyword,

          locationName,

          languageName,
        }),

      dependencies
        .getBusinessFactRegistryForWebsite(
          websiteId
        ),
    ]);


  if (
    serpIntelligence
      .organic.length ===
    0
  ) {
    throw new ProductionMasterLiveSourceError(
      "LIVE_SOURCE_SERP_EMPTY",
      "The live SERP returned no organic results."
    );
  }


  const serpSnapshot =
    createSerpSnapshot({
      keyword,

      country:
        countryCode,

      language:
        languageCode,

      device:
        "DESKTOP",

      capturedAt,

      results:
        snapshotResults(
          serpIntelligence
        ),

      features:
        snapshotFeatures(
          serpIntelligence
        ),

      aiOverview:
        snapshotAiOverview(
          serpIntelligence
        ),
    });


  const provenance =
    buildProvenance({
      websiteId,

      keyword,

      serpSnapshot,

      businessFacts,
    });


  return Object.freeze({
    version:
      "PRODUCTION_MASTER_LIVE_SOURCE_V1" as const,

    websiteId,

    keyword,

    market:
      Object.freeze({
        locationName,

        countryCode,

        languageName,

        languageCode,
      }),

    capturedAt:
      new Date(
        capturedAt
      ),

    keywordContext,

    dataForSeo:
      Object.freeze({
        relatedKeywords,

        searchVolume,

        keywordDifficulty,
      }),

    serpIntelligence,

    serpSnapshot,

    businessFacts,

    provenance,
  });
}
