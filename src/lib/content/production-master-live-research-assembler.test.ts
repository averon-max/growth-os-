import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildProductionMasterLiveSourceBundle,
  ProductionMasterLiveResearchAssemblyError,
  type ProductionMasterLiveStageContract,
} from "./production-master-live-research-assembler";

import type {
  ProductionMasterLiveSourceResearch,
} from "./production-master-live-source-adapter";


function research():
ProductionMasterLiveSourceResearch {
  return {
    version:
      "PRODUCTION_MASTER_LIVE_SOURCE_V1",

    websiteId:
      "website-1",

    keyword:
      "what is credit monitoring",

    market: {
      locationName:
        "United States",

      countryCode:
        "US",

      languageName:
        "English",

      languageCode:
        "en",
    },

    capturedAt:
      new Date(
        "2026-09-22T05:00:00.000Z"
      ),

    keywordContext: {
      hostname:
        "example.com",

      topKeywords: [
        {
          keyword:
            "what is credit monitoring",

          volume:
            null,

          difficulty:
            null,

          position:
            12.4,

          clicks:
            3,

          impressions:
            120,
        },
      ],
    },

    dataForSeo: {
      relatedKeywords: {
        items: [
          {
            keyword:
              "credit monitoring limitations",

            searchVolume:
              90,

            cpc:
              1.25,
          },
        ],
      },

      searchVolume: {
        items: [
          {
            keyword:
              "what is credit monitoring",

            searchVolume:
              1000,

            cpc:
              2.5,
          },
        ],
      },

      keywordDifficulty: {
        items: [
          {
            keyword:
              "what is credit monitoring",

            keywordDifficulty:
              31,
          },
        ],
      },
    },

    serpIntelligence: {
      questions: [
        "What does credit monitoring do?",
      ],
    },

    serpSnapshot: {
      version:
        "SERP_SNAPSHOT_V1",

      keyword:
        "what is credit monitoring",

      country:
        "US",

      language:
        "en",

      device:
        "desktop",

      capturedAt:
        new Date(
          "2026-09-22T05:00:00.000Z"
        ),

      results: [
        {
          rank:
            1,

          url:
            "https://example.org/credit-monitoring",

          domain:
            "example.org",
        },
      ],

      features:
        [],

      aiOverview: {
        present:
          false,
      },

      fingerprint:
        "serp-fingerprint-1",
    },

    businessFacts: {
      version:
        "PERSISTED_V1",

      businessName:
        "Example",

      websiteUrl:
        "https://example.com",

      industry:
        "credit monitoring",

      verifiedClaims:
        [],

      factIds:
        [],

      prohibitedClaimCategories:
        [],
    },

    provenance:
      [],
  } as unknown as
    ProductionMasterLiveSourceResearch;
}


function stages():
ProductionMasterLiveStageContract {
  return {
    mission: {
      id:
        "mission-1",

      websiteId:
        "website-1",

      topic:
        "what is credit monitoring",

      audience:
        "US consumers",

      readerGoal:
        "Understand what credit monitoring does.",

      businessRelationship:
        "DIRECT",

      jurisdiction:
        "US",

      language:
        "en",

      location:
        "United States",

      riskClass:
        "YMYL_FINANCE",

      createdAt:
        new Date(
          "2026-09-22T05:00:00.000Z"
        ),

      version:
        1,
    },

    queryGraph: {
      missionIntent:
        "INFORMATIONAL",

      signals: [
        {
          query:
            "what is credit monitoring",

          intent:
            "INFORMATIONAL",

          subIntent:
            "DEFINITION",

          cluster:
            "CREDIT_MONITORING",

          siteCoverage:
            "WEAK",

          source:
            "GSC",

          sourceConfidence:
            1,

          gscImpressions:
            120,

          gscClicks:
            3,

          gscPosition:
            12.4,

          sameMissionEvidence:
            true,
        },
      ],
    },

    expectedCoverage: {
      topics: [
        {
          topic:
            "What credit monitoring does",

          missionRelevance:
            1,

          evidenceRequirement:
            "VERIFIED_SOURCE",

          articleFit:
            "SAME_PAGE",
        },
      ],
    },

    gaps: {
      observations: [
        {
          topic:
            "What credit monitoring does",

          competitorCoverage:
            "STRONG",

          competitorClarity:
            "STRONG",

          competitorEvidence:
            "WEAK",

          competitorAction:
            "NOT_APPLICABLE",

          originalValueOpportunity:
            true,
        },
      ],
    },

    originalValue: {
      assets:
        [],

      commoditySignals: {},
    },

    evidenceGraph: {
      sources: [
        {
          id:
            "source-1",

          url:
            "https://example.org/credit-monitoring",

          publisher:
            "Example Publisher",

          sourceType:
            "PRIMARY_OFFICIAL",

          authorityTier:
            "B",

          jurisdiction:
            "US",

          retrievedAt:
            new Date(
              "2026-09-22T05:00:00.000Z"
            ),
        },
      ],

      claimEvidence:
        [],
    },

    claimLedger: {
      claims:
        [],

      asOf:
        new Date(
          "2026-09-22T05:00:00.000Z"
        ),
    },

    masterBlueprint: {
      action:
        "CREATE",

      primaryQuery:
        "what is credit monitoring",

      queryNodeIds:
        [],

      intent:
        "INFORMATIONAL",

      pageType:
        "ARTICLE",

      requiredEntities:
        [],

      questions:
        [],

      evidenceIds:
        [],

      requiredClaims:
        [],

      forbiddenClaims:
        [],

      competitorStrengths:
        [],

      competitorWeaknesses:
        [],

      internalLinkTargets:
        [],

      technicalRequirements:
        [],
    },

    sectionBlueprints: {
      sections: [
        {
          heading:
            "What Credit Monitoring Does",

          mission:
            "Explain what credit monitoring does.",

          expectedOutcome:
            "Reader understands the core function.",
        },
      ],
    },

    internalLinkPlan:
      [],

    styleRules: [
      "Answer directly.",
    ],
  } as unknown as
    ProductionMasterLiveStageContract;
}


describe(
  "Production Master Live Research Assembler",
  () => {
    it(
      "creates a source bundle anchored to the current live SERP snapshot",
      () => {
        const live =
          research();

        const result =
          buildProductionMasterLiveSourceBundle({
            research:
              live,

            stages:
              stages(),
          });


        expect(
          result.input
            .serpResearch
        ).toBe(
          live.serpSnapshot
        );


        expect(
          result.provenance.some(
            (item) =>
              item.stage ===
                "SERP_RESEARCH" &&
              item.source ===
                "LIVE_SERP" &&
              item.ref ===
                "serp-fingerprint-1"
          )
        ).toBe(
          true
        );


        expect(
          result.provenance.some(
            (item) =>
              item.stage ===
              "QUERY_GRAPH"
          )
        ).toBe(
          true
        );


        expect(
          result.provenance.some(
            (item) =>
              item.stage ===
              "EVIDENCE_GRAPH"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not create missing query metrics",
      () => {
        const input =
          stages();

        delete (
          input.queryGraph
            .signals[0] as {
              searchVolume?: number;
            }
        ).searchVolume;


        const result =
          buildProductionMasterLiveSourceBundle({
            research:
              research(),

            stages:
              input,
          });


        expect(
          result.input
            .queryGraph
            .signals[0]
            ?.searchVolume
        ).toBeUndefined();
      }
    );


    it(
      "accepts a query metric only when the same metric was actually observed",
      () => {
        const input =
          stages();


        input.queryGraph
          .signals.push({
            query:
              "credit monitoring limitations",

            intent:
              "INFORMATIONAL",

            subIntent:
              "LIMITATIONS",

            cluster:
              "CREDIT_MONITORING",

            siteCoverage:
              "NONE",

            source:
              "DATAFORSEO",

            sourceConfidence:
              1,

            searchVolume:
              90,

            cpc:
              1.25,

            sameMissionEvidence:
              true,
          });


        const result =
          buildProductionMasterLiveSourceBundle({
            research:
              research(),

            stages:
              input,
          });


        expect(
          result.input
            .queryGraph
            .signals[1]
            ?.searchVolume
        ).toBe(
          90
        );
      }
    );


    it(
      "blocks invented query metrics",
      () => {
        const input =
          stages();


        input.queryGraph
          .signals[0] = {
            ...input.queryGraph
              .signals[0]!,

            gscImpressions:
              999999,
          };


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrow(
          "LIVE_ASSEMBLY_QUERY_METRIC_MISMATCH:gscImpressions:what is credit monitoring"
        );
      }
    );


    it(
      "blocks a query that was not present in live acquisition",
      () => {
        const input =
          stages();


        input.queryGraph
          .signals.push({
            query:
              "totally invented query",

            intent:
              "INFORMATIONAL",

            subIntent:
              "INVENTED",

            cluster:
              "INVENTED",

            siteCoverage:
              "NONE",

            source:
              "DATAFORSEO",

            sourceConfidence:
              1,

            sameMissionEvidence:
              true,
          });


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrow(
          "LIVE_ASSEMBLY_QUERY_NOT_OBSERVED:totally invented query"
        );
      }
    );


    it(
      "requires the acquired primary query to exist in QueryGraph",
      () => {
        const input =
          stages();


        input.queryGraph
          .signals = [
            {
              query:
                "credit monitoring limitations",

              intent:
                "INFORMATIONAL",

              subIntent:
                "LIMITATIONS",

              cluster:
                "CREDIT_MONITORING",

              siteCoverage:
                "NONE",

              source:
                "DATAFORSEO",

              sourceConfidence:
                1,

              searchVolume:
                90,

              cpc:
                1.25,

              sameMissionEvidence:
                true,
            },
          ];


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrow(
          "LIVE_ASSEMBLY_PRIMARY_QUERY_SIGNAL_MISSING"
        );
      }
    );


    it(
      "blocks website identity mismatch",
      () => {
        const input =
          stages();


        input.mission
          .websiteId =
          "different-website";


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrow(
          "LIVE_ASSEMBLY_WEBSITE_MISMATCH"
        );
      }
    );


    it(
      "blocks gap observations that are outside Expected Coverage",
      () => {
        const input =
          stages();


        input.gaps
          .observations.push({
            topic:
              "Invented gap topic",

            competitorCoverage:
              "WEAK",

            competitorClarity:
              "WEAK",

            competitorEvidence:
              "WEAK",

            competitorAction:
              "UNKNOWN",

            originalValueOpportunity:
              null,
          });


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrow(
          "LIVE_ASSEMBLY_GAP_TOPIC_NOT_IN_EXPECTED_COVERAGE:Invented gap topic"
        );
      }
    );


    it(
      "uses the canonical source-bundle readiness boundary",
      () => {
        const input =
          stages();


        input.evidenceGraph
          .sources = [];


        expect(
          () =>
            buildProductionMasterLiveSourceBundle({
              research:
                research(),

              stages:
                input,
            })
        ).toThrowError(
          ProductionMasterLiveResearchAssemblyError
        );
      }
    );
  }
);
