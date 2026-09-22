import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  MasterRuntimeSnapshotV1,
} from "./master-runtime-adapter";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  executeSerpReplayV1,
  finalizeSerpReplayPairwiseJudgmentV1,
  SERP_REPLAY_DIMENSIONS,
  type SerpReplayPairwiseInputV1,
} from "./serp-replay";


function runtime({
  withSerp = true,
  results,
}: {
  withSerp?:
    boolean;

  results?:
    any[];
} = {}):
MasterRuntimeSnapshotV1 {
  return {
    queryGraph: {
      nodes: [
        {
          id:
            "query-1",

          query:
            "what is credit monitoring",
        },
      ],
    },

    claimLedger: {
      claims: [
        {
          id:
            "claim-1",

          text:
            "Credit monitoring watches for specified changes in credit-report data.",

          status:
            "VERIFIED",

          category:
            "FACT",

          risk:
            "LOW",
        },
      ],
    },

    evidenceGraph: {
      sources: [
        {
          id:
            "source-1",

          url:
            "https://official.example/source",

          publisher:
            "Official Source",

          sourceType:
            "PRIMARY_OFFICIAL",
        },
      ],

      claimEvidence: [
        {
          id:
            "evidence-1",

          claimId:
            "claim-1",

          sourceId:
            "source-1",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Verified source excerpt.",
        },
      ],
    },

    originalValue: {
      assets: [
        {
          id:
            "asset-1",

          type:
            "ORIGINAL_DIAGRAM",

          title:
            "Monitoring flow",

          description:
            "A verified original diagram explaining the process.",

          firstParty:
            true,

          verified:
            true,

          evidenceIds: [
            "evidence-1",
          ],
        },

        {
          id:
            "asset-unverified",

          type:
            "ORIGINAL_RESEARCH",

          title:
            "Unverified asset",

          description:
            "Must never become replay evidence.",

          firstParty:
            true,

          verified:
            false,
        },
      ],
    },

    serpResearch:
      withSerp
        ? {
            version:
              "SERP_SNAPSHOT_V1",

            keyword:
              "what is credit monitoring",

            country:
              "US",

            language:
              "en",

            device:
              "DESKTOP",

            capturedAt:
              new Date(
                "2026-09-21T20:00:00.000Z"
              ),

            results:
              results ??
              [
                {
                  rank:
                    1,

                  url:
                    "https://competitor.example/guide",

                  domain:
                    "competitor.example",

                  title:
                    "Credit Monitoring Guide",

                  snippet:
                    "Learn how credit monitoring works.",

                  pageType:
                    "GUIDE",

                  intent:
                    "INFORMATIONAL",

                  h1:
                    "Credit Monitoring",

                  h2: [
                    "How it works",
                    "Limitations",
                  ],

                  questions: [
                    "What does credit monitoring detect?",
                  ],

                  claims: [
                    "Credit monitoring can alert users to monitored changes.",
                  ],

                  sources: [
                    {
                      label:
                        "Official reference",

                      url:
                        "https://source.example/",
                    },
                  ],

                  wordCount:
                    9000,

                  referringDomains:
                    5000,

                  backlinks:
                    50000,
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
          }
        : null,
  } as unknown as
    MasterRuntimeSnapshotV1;
}


function run():
MasterWriterRunV1 {
  return {
    article: {
      title:
        "What Is Credit Monitoring?",

      metaDescription:
        "Understand credit monitoring.",

      h1:
        "What Is Credit Monitoring?",

      bodyMarkdown:
        "Credit monitoring watches for changes. Here is how it works and what it cannot do.",
    },

    sections: [
      {
        version:
          "GENERATED_SECTION_V1",

        heading:
          "How Credit Monitoring Works",

        bodyMarkdown:
          "Credit monitoring watches for changes in monitored credit-report information.",

        coveredQueryNodeIds: [
          "query-1",
        ],

        referencedClaimIds: [
          "claim-1",
        ],

        referencedEvidenceIds: [
          "evidence-1",
        ],

        usedInternalLinks:
          [],

        assetUsed:
          "asset-1",

        provenance: {
          sectionIndex:
            0,

          modelName:
            "test-model",
        },
      },
    ],
  } as unknown as
    MasterWriterRunV1;
}


function judgment(
  verdict:
    | "ARTICLE_STRONGER"
    | "COMPETITOR_STRONGER"
    | "MIXED"
    | "INSUFFICIENT_EVIDENCE" =
      "ARTICLE_STRONGER",
  overrides:
    Partial<
      Record<
        (
          typeof SERP_REPLAY_DIMENSIONS
        )[number],
        typeof verdict
      >
    > = {}
) {
  return {
    dimensions:
      SERP_REPLAY_DIMENSIONS.map(
        (dimension) => {
          const resolved =
            overrides[
              dimension
            ] ??
            verdict;

          return {
            dimension,

            verdict:
              resolved,

            reason:
              "Evidence-backed comparison.",

            articleEvidenceIds:
              resolved ===
              "INSUFFICIENT_EVIDENCE"
                ? []
                : [
                    "ARTICLE_H1",
                  ],

            competitorEvidenceIds:
              resolved ===
              "INSUFFICIENT_EVIDENCE"
                ? []
                : [
                    "COMPETITOR_H1",
                  ],

            missingData:
              resolved ===
              "INSUFFICIENT_EVIDENCE"
                ? [
                    "competitor full body unavailable",
                  ]
                : [],
          };
        }
      ),
  };
}


describe(
  "SERP Replay V1",
  () => {
    it(
      "returns insufficient context without SERP and does not call the model",
      async () => {
        const compare =
          vi.fn();


        const result =
          await executeSerpReplayV1({
            runtime:
              runtime({
                withSerp:
                  false,
              }),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              compareSerpReplayPair:
                compare,
            },
          });


        expect(
          result.status
        ).toBe(
          "INSUFFICIENT_CONTEXT"
        );

        expect(
          compare
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "compares only meaningful Top 10 results and excludes the current site domain",
      async () => {
        const compare =
          vi.fn(
            async () =>
              judgment()
          );


        const result =
          await executeSerpReplayV1({
            runtime:
              runtime({
                results: [
                  {
                    rank:
                      1,

                    url:
                      "https://oursite.example/current",

                    domain:
                      "oursite.example",

                    h1:
                      "Own page",
                  },

                  {
                    rank:
                      2,

                    url:
                      "https://competitor.example/a",

                    domain:
                      "competitor.example",

                    h1:
                      "Competitor",
                  },

                  {
                    rank:
                      11,

                    url:
                      "https://outside.example/a",

                    domain:
                      "outside.example",

                    h1:
                      "Outside top ten",
                  },
                ],
              }),

            run:
              run(),

            siteDomain:
              "www.oursite.example",

            generator: {
              modelName:
                "pairwise-model",

              compareSerpReplayPair:
                compare,
            },
          });


        expect(
          compare
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.comparisons[
            0
          ]?.competitor.url
        ).toBe(
          "https://competitor.example/a"
        );
      }
    );


    it(
      "passes real article query claim evidence and verified original-value provenance",
      async () => {
        let captured:
          SerpReplayPairwiseInputV1 |
          null =
            null;


        await executeSerpReplayV1({
          runtime:
            runtime(),

          run:
            run(),

          generator: {
            modelName:
              "pairwise-model",

            async compareSerpReplayPair(
              input:
                Readonly<
                  SerpReplayPairwiseInputV1
                >
            ) {
              captured =
                input;

              return judgment();
            },
          },
        });


        expect(
          captured
        ).not.toBeNull();


        const ids =
          captured!
            .article
            .evidenceCatalog
            .map(
              (item) =>
                item.id
            );


        expect(
          ids
        ).toContain(
          "ARTICLE_QUERY:query-1"
        );

        expect(
          ids
        ).toContain(
          "ARTICLE_CLAIM:claim-1"
        );

        expect(
          ids
        ).toContain(
          "ARTICLE_EVIDENCE:evidence-1"
        );

        expect(
          ids
        ).toContain(
          "ARTICLE_ASSET:asset-1"
        );

        expect(
          ids
        ).not.toContain(
          "ARTICLE_ASSET:asset-unverified"
        );
      }
    );


    it(
      "does not expose word count backlinks or referring domains as competitor content-quality evidence",
      async () => {
        let captured:
          SerpReplayPairwiseInputV1 |
          null =
            null;


        await executeSerpReplayV1({
          runtime:
            runtime(),

          run:
            run(),

          generator: {
            modelName:
              "pairwise-model",

            async compareSerpReplayPair(
              input:
                Readonly<
                  SerpReplayPairwiseInputV1
                >
            ) {
              captured =
                input;

              return judgment();
            },
          },
        });


        const catalog =
          captured!
            .competitor
            .evidenceCatalog
            .map(
              (item) =>
                `${item.id}:${item.text}`
            )
            .join(
              "\n"
            )
            .toLowerCase();


        expect(
          catalog
        ).not.toContain(
          "wordcount"
        );

        expect(
          catalog
        ).not.toContain(
          "backlink"
        );

        expect(
          catalog
        ).not.toContain(
          "referring"
        );
      }
    );


    it(
      "rejects invented evidence IDs from the pairwise judge",
      () => {
        const input = {
          version:
            "SERP_REPLAY_PAIRWISE_INPUT_V1",

          keyword:
            "query",

          snapshotFingerprint:
            "fp",

          article: {
            title:
              "Title",

            h1:
              "H1",

            bodyMarkdown:
              "Body",

            sections:
              [],

            evidenceCatalog: [
              {
                id:
                  "ARTICLE_H1",

                text:
                  "H1",
              },
            ],
          },

          competitor: {
            rank:
              1,

            url:
              "https://example.com",

            domain:
              "example.com",

            title:
              "Title",

            snippet:
              null,

            pageType:
              "ARTICLE",

            intent:
              "INFORMATIONAL",

            evidenceCatalog: [
              {
                id:
                  "COMPETITOR_H1",

                text:
                  "H1",
              },
            ],
          },
        } as const;


        const raw =
          judgment();

        raw.dimensions[
          0
        ]!.articleEvidenceIds = [
          "INVENTED_EVIDENCE",
        ];


        expect(
          () =>
            finalizeSerpReplayPairwiseJudgmentV1({
              raw,

              input,
            })
        ).toThrow(
          "SERP_REPLAY_ARTICLE_EVIDENCE_UNKNOWN"
        );
      }
    );


    it(
      "requires explicit missing-data provenance for insufficient evidence",
      () => {
        const input = {
          version:
            "SERP_REPLAY_PAIRWISE_INPUT_V1",

          keyword:
            "query",

          snapshotFingerprint:
            "fp",

          article: {
            title:
              "Title",

            h1:
              "H1",

            bodyMarkdown:
              "Body",

            sections:
              [],

            evidenceCatalog: [
              {
                id:
                  "ARTICLE_H1",

                text:
                  "H1",
              },
            ],
          },

          competitor: {
            rank:
              1,

            url:
              "https://example.com",

            domain:
              "example.com",

            title:
              "Title",

            snippet:
              null,

            pageType:
              "ARTICLE",

            intent:
              "INFORMATIONAL",

            evidenceCatalog: [
              {
                id:
                  "COMPETITOR_H1",

                text:
                  "H1",
              },
            ],
          },
        } as const;


        const raw =
          judgment(
            "INSUFFICIENT_EVIDENCE"
          );

        raw.dimensions[
          0
        ]!.missingData =
          [];


        expect(
          () =>
            finalizeSerpReplayPairwiseJudgmentV1({
              raw,

              input,
            })
        ).toThrow(
          "SERP_REPLAY_MISSING_DATA_REQUIRED"
        );
      }
    );


    it(
      "does not permit a directional verdict without evidence on both sides",
      () => {
        const input = {
          version:
            "SERP_REPLAY_PAIRWISE_INPUT_V1",

          keyword:
            "query",

          snapshotFingerprint:
            "fp",

          article: {
            title:
              "Title",

            h1:
              "H1",

            bodyMarkdown:
              "Body",

            sections:
              [],

            evidenceCatalog: [
              {
                id:
                  "ARTICLE_H1",

                text:
                  "H1",
              },
            ],
          },

          competitor: {
            rank:
              1,

            url:
              "https://example.com",

            domain:
              "example.com",

            title:
              "Title",

            snippet:
              null,

            pageType:
              "ARTICLE",

            intent:
              "INFORMATIONAL",

            evidenceCatalog: [
              {
                id:
                  "COMPETITOR_H1",

                text:
                  "H1",
              },
            ],
          },
        } as const;


        const raw =
          judgment();

        raw.dimensions[
          0
        ]!.competitorEvidenceIds =
          [];


        expect(
          () =>
            finalizeSerpReplayPairwiseJudgmentV1({
              raw,

              input,
            })
        ).toThrow(
          "SERP_REPLAY_DIRECTIONAL_EVIDENCE_REQUIRED"
        );
      }
    );


    it(
      "returns READY without converting pairwise judgments into a numeric score",
      async () => {
        const result =
          await executeSerpReplayV1({
            runtime:
              runtime(),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              async compareSerpReplayPair() {
                return judgment(
                  "ARTICLE_STRONGER"
                );
              },
            },
          });


        expect(
          result.status
        ).toBe(
          "READY"
        );

        expect(
          result.comparisons[
            0
          ]?.verdict
        ).toBe(
          "STRONGER"
        );

        expect(
          result.provenance
            .rankingScoreUsed
        ).toBe(
          false
        );

        expect(
          result.provenance
            .rankingProbabilityUsed
        ).toBe(
          false
        );
      }
    );


    it(
      "blocks on a concrete competitor advantage in intent fulfillment",
      async () => {
        const result =
          await executeSerpReplayV1({
            runtime:
              runtime(),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              async compareSerpReplayPair() {
                return judgment(
                  "ARTICLE_STRONGER",
                  {
                    INTENT_FULFILLMENT:
                      "COMPETITOR_STRONGER",
                  }
                );
              },
            },
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.comparisons[
            0
          ]?.blockingDimensions
        ).toContain(
          "INTENT_FULFILLMENT"
        );
      }
    );


    it(
      "blocks on a concrete competitor advantage in evidence strength",
      async () => {
        const result =
          await executeSerpReplayV1({
            runtime:
              runtime(),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              async compareSerpReplayPair() {
                return judgment(
                  "ARTICLE_STRONGER",
                  {
                    EVIDENCE_STRENGTH:
                      "COMPETITOR_STRONGER",
                  }
                );
              },
            },
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );
      }
    );


    it(
      "warns rather than blocks for a non-critical pairwise disadvantage",
      async () => {
        const result =
          await executeSerpReplayV1({
            runtime:
              runtime(),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              async compareSerpReplayPair() {
                return judgment(
                  "ARTICLE_STRONGER",
                  {
                    STRUCTURAL_USEFULNESS:
                      "COMPETITOR_STRONGER",
                  }
                );
              },
            },
          });


        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.blockers
        ).toEqual(
          []
        );
      }
    );


    it(
      "returns insufficient context when every dimension is unsupported by available evidence",
      async () => {
        const result =
          await executeSerpReplayV1({
            runtime:
              runtime(),

            run:
              run(),

            generator: {
              modelName:
                "pairwise-model",

              async compareSerpReplayPair() {
                return judgment(
                  "INSUFFICIENT_EVIDENCE"
                );
              },
            },
          });


        expect(
          result.status
        ).toBe(
          "INSUFFICIENT_CONTEXT"
        );

        expect(
          result.comparisons[
            0
          ]?.verdict
        ).toBe(
          "INSUFFICIENT_EVIDENCE"
        );
      }
    );


    it(
      "uses SERP rank only as provenance and not to derive the pair verdict",
      async () => {
        const generator = {
          modelName:
            "pairwise-model",

          async compareSerpReplayPair() {
            return judgment(
              "ARTICLE_STRONGER"
            );
          },
        };


        const high =
          await executeSerpReplayV1({
            runtime:
              runtime({
                results: [
                  {
                    rank:
                      1,

                    url:
                      "https://competitor.example/a",

                    domain:
                      "competitor.example",

                    h1:
                      "Competitor",
                  },
                ],
              }),

            run:
              run(),

            generator,
          });


        const lower =
          await executeSerpReplayV1({
            runtime:
              runtime({
                results: [
                  {
                    rank:
                      9,

                    url:
                      "https://competitor.example/a",

                    domain:
                      "competitor.example",

                    h1:
                      "Competitor",
                  },
                ],
              }),

            run:
              run(),

            generator,
          });


        expect(
          high.comparisons[
            0
          ]?.verdict
        ).toBe(
          lower.comparisons[
            0
          ]?.verdict
        );

        expect(
          high.comparisons[
            0
          ]?.competitor.rank
        ).toBe(
          1
        );

        expect(
          lower.comparisons[
            0
          ]?.competitor.rank
        ).toBe(
          9
        );
      }
    );


    it(
      "contains no ranking-score or ranking-probability implementation",
      () => {
        const source =
          readFileSync(
            new URL(
              "./serp-replay.ts",
              import.meta.url
            ),
            "utf8"
          );


        expect(
          source
        ).not.toMatch(
          /rankingScore\s*[:=]\s*[0-9]/
        );

        expect(
          source
        ).not.toMatch(
          /rankingProbability\s*[:=]\s*[0-9]/
        );

        expect(
          source
        ).not.toContain(
          "chanceToRank"
        );

        expect(
          source
        ).not.toContain(
          "probabilityOfRanking"
        );
      }
    );
  }
);
