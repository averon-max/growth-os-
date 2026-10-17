import {
  describe,
  expect,
  it,
  vi,
} from "vitest";


/*
 * Next.js server-only intentionally throws when loaded outside
 * the server runtime. This test exercises the adapter through
 * injected dependencies, so no real server module capability
 * is needed.
 *
 * Vitest hoists this mock before module evaluation.
 */
vi.mock(
  "server-only",
  () => ({})
);

import {
  collectProductionMasterLiveSources,
  ProductionMasterLiveSourceError,
  type ProductionMasterLiveSourceDependencies,
} from "./production-master-live-source-adapter";

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
  fetchRelatedKeywords,
  fetchKeywordDifficulty,
  fetchSearchVolume,
} from "@/lib/keywords/dataforseo-provider";


function dependencies({
  emptySerp =
    false,
}: {
  emptySerp?:
    boolean;
} = {}): {
  deps:
    ProductionMasterLiveSourceDependencies;

  mocks:
    {
      keywordContext:
        ReturnType<
          typeof vi.fn
        >;

      related:
        ReturnType<
          typeof vi.fn
        >;

      volume:
        ReturnType<
          typeof vi.fn
        >;

      difficulty:
        ReturnType<
          typeof vi.fn
        >;

      serp:
        ReturnType<
          typeof vi.fn
        >;

      facts:
        ReturnType<
          typeof vi.fn
        >;
    };
} {
  const keywordContext =
    vi.fn(
      async () =>
        [
          {
            keyword:
              "what is credit monitoring",

            volume:
              null,

            difficulty:
              null,

            position:
              18,

            clicks:
              3,

            impressions:
              140,
          },
        ] as unknown as
          Awaited<
            ReturnType<
              typeof getWebsiteKeywordContext
            >
          >
    );


  const related =
    vi.fn(
      async () =>
        [
          {
            keyword:
              "credit monitoring service",

            searchVolume:
              null,

            competitionLevel:
              null,

            cpc:
              null,

            keywordDifficulty:
              null,

            monthlySearches:
              [],

            trend:
              null,
          },
        ] as Awaited<
          ReturnType<
            typeof fetchRelatedKeywords
          >
        >
    );


  const volume =
    vi.fn(
      async () =>
        [
          {
            keyword:
              "what is credit monitoring",

            searchVolume:
              null,

            competitionIndex:
              null,

            cpc:
              null,
          },
        ] as Awaited<
          ReturnType<
            typeof fetchSearchVolume
          >
        >
    );


  const difficulty =
    vi.fn(
      async () =>
        [
          {
            keyword:
              "what is credit monitoring",

            keywordDifficulty:
              null,
          },
        ] as Awaited<
          ReturnType<
            typeof fetchKeywordDifficulty
          >
        >
    );


  const serp =
    vi.fn(
      async () =>
        ({
          organic:
            emptySerp
              ? []
              : [
                  {
                    rank:
                      1,

                    absoluteRank:
                      2,

                    domain:
                      "www.consumerfinance.gov",

                    url:
                      "https://www.consumerfinance.gov/example",

                    title:
                      "What is credit monitoring?",

                    description:
                      "Observed SERP description.",

                    featuredSnippet:
                      false,
                  },
                ],

          questions: [
            "Is credit monitoring worth it?",
          ],

          aiOverview: {
            present:
              true,

            asynchronous:
              null,

            references: [
              {
                domain:
                  "www.consumerfinance.gov",

                url:
                  "https://www.consumerfinance.gov/example",

                title:
                  "What is credit monitoring?",
              },
            ],
          },
        }) as unknown as
          Awaited<
            ReturnType<
              typeof buildSerpIntelligence
            >
          >
    );


  const facts =
    vi.fn(
      async () =>
        ({
          version:
            "PERSISTED_V1",

          businessName:
            "ScanMyCreds",

          websiteUrl:
            "https://scanmycreds.com",

          industry:
            "credit monitoring and identity protection",

          verifiedClaims: [
            "The free scan does not require an account.",
          ],

          factIds: [
            "fact-1",
          ],

          prohibitedClaimCategories:
            [],
        }) as Awaited<
          ReturnType<
            typeof getBusinessFactRegistryForWebsite
          >
        >
    );


  return {
    deps: {
      getWebsiteKeywordContext:
        keywordContext,

      getBusinessFactRegistryForWebsite:
        facts,

      buildSerpIntelligence:
        serp,

      fetchRelatedKeywords:
        related,

      fetchSearchVolume:
        volume,

      fetchKeywordDifficulty:
        difficulty,
    } as unknown as
      ProductionMasterLiveSourceDependencies,

    mocks: {
      keywordContext,
      related,
      volume,
      difficulty,
      serp,
      facts,
    },
  };
}


describe(
  "Production Master Live Source Adapter",
  () => {
    it(
      "collects real-source shapes through injected provider boundaries",
      async () => {
        const {
          deps,
          mocks,
        } =
          dependencies();


        const result =
          await collectProductionMasterLiveSources(
            {
              websiteId:
                "website-1",

              keyword:
                "what is credit monitoring",

              locationName:
                "United States",

              countryCode:
                "US",

              languageName:
                "English",

              languageCode:
                "en",

              capturedAt:
                new Date(
                  "2026-09-22T05:00:00.000Z"
                ),
            },
            deps
          );


        expect(
          result.version
        ).toBe(
          "PRODUCTION_MASTER_LIVE_SOURCE_V1"
        );


        expect(
          result.serpSnapshot
            .version
        ).toBe(
          "SERP_SNAPSHOT_V1"
        );


        expect(
          result.serpSnapshot
            .results
        ).toHaveLength(
          1
        );


        expect(
          result.serpSnapshot
            .features
        ).toContain(
          "PEOPLE_ALSO_ASK"
        );


        expect(
          result.serpSnapshot
            .features
        ).toContain(
          "AI_OVERVIEW"
        );


        expect(
          result.serpSnapshot
            .aiOverview
            .present
        ).toBe(
          true
        );


        expect(
          mocks.keywordContext
        ).toHaveBeenCalledTimes(
          1
        );

        expect(mocks.keywordContext).toHaveBeenCalledWith(
          "website-1",
          50,
          "US"
        );


        expect(
          mocks.related
        ).toHaveBeenCalledWith(
          "what is credit monitoring",
          "United States",
          "English",
          1,
          50
        );


        expect(
          mocks.volume
        ).toHaveBeenCalledWith(
          [
            "what is credit monitoring",
          ],
          "United States",
          "English"
        );


        expect(
          mocks.difficulty
        ).toHaveBeenCalledWith(
          [
            "what is credit monitoring",
          ],
          "United States",
          "English"
        );


        expect(
          mocks.serp
        ).toHaveBeenCalledWith({
          keyword:
            "what is credit monitoring",

          locationName:
            "United States",

          languageName:
            "English",
        });


        expect(
          mocks.facts
        ).toHaveBeenCalledWith(
          "website-1"
        );
      }
    );


    it(
      "preserves unknown provider metrics as null rather than zero",
      async () => {
        const {
          deps,
        } =
          dependencies();


        const result =
          await collectProductionMasterLiveSources(
            {
              websiteId:
                "website-1",

              keyword:
                "what is credit monitoring",

              capturedAt:
                new Date(
                  "2026-09-22T05:00:00.000Z"
                ),
            },
            deps
          );


        expect(
          result.dataForSeo
            .relatedKeywords[0]
            ?.searchVolume
        ).toBeNull();


        expect(
          result.dataForSeo
            .relatedKeywords[0]
            ?.keywordDifficulty
        ).toBeNull();


        expect(
          result.dataForSeo
            .searchVolume[0]
            ?.searchVolume
        ).toBeNull();


        expect(
          result.dataForSeo
            .keywordDifficulty[0]
            ?.keywordDifficulty
        ).toBeNull();
      }
    );


    it(
      "creates source provenance from actual acquisition boundaries",
      async () => {
        const {
          deps,
        } =
          dependencies();


        const result =
          await collectProductionMasterLiveSources(
            {
              websiteId:
                "website-1",

              keyword:
                "what is credit monitoring",

              capturedAt:
                new Date(
                  "2026-09-22T05:00:00.000Z"
                ),
            },
            deps
          );


        expect(
          result.provenance.some(
            (
              item
            ) =>
              item.stage ===
                "QUERY_GRAPH" &&
              item.source ===
                "DATAFORSEO"
          )
        ).toBe(
          true
        );


        expect(
          result.provenance.some(
            (
              item
            ) =>
              item.stage ===
                "SERP_RESEARCH" &&
              item.source ===
                "LIVE_SERP" &&
              item.ref ===
                result.serpSnapshot
                  .fingerprint
          )
        ).toBe(
          true
        );


        expect(
          result.provenance.some(
            (
              item
            ) =>
              item.stage ===
                "EVIDENCE_GRAPH" &&
              item.source ===
                "VERIFIED_BUSINESS_FACT"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "fails closed when live SERP has no organic results",
      async () => {
        const {
          deps,
        } =
          dependencies({
            emptySerp:
              true,
          });


        await expect(
          collectProductionMasterLiveSources(
            {
              websiteId:
                "website-1",

              keyword:
                "what is credit monitoring",
            },
            deps
          )
        ).rejects.toMatchObject({
          code:
            "LIVE_SOURCE_SERP_EMPTY",
        });
      }
    );


    it(
      "rejects invalid provider acquisition input before dependencies run",
      async () => {
        const {
          deps,
          mocks,
        } =
          dependencies();


        await expect(
          collectProductionMasterLiveSources(
            {
              websiteId:
                "",

              keyword:
                "",
            },
            deps
          )
        ).rejects.toBeInstanceOf(
          ProductionMasterLiveSourceError
        );


        expect(
          mocks.serp
        ).not.toHaveBeenCalled();


        expect(
          mocks.related
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "validates related keyword request size",
      async () => {
        const {
          deps,
        } =
          dependencies();


        await expect(
          collectProductionMasterLiveSources(
            {
              websiteId:
                "website-1",

              keyword:
                "what is credit monitoring",

              relatedKeywordLimit:
                51,
            },
            deps
          )
        ).rejects.toMatchObject({
          code:
            "LIVE_SOURCE_RELATED_LIMIT_INVALID",
        });
      }
    );
  }
);
