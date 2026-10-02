import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyCompetitorInformationGainV1,
  buildCompetitorInformationGainV1,
} from "./competitor-information-gain-v1";

import type {
  CompetitorPageAnalysis,
} from "./serp-intelligence";


function page({
  rank,
  headings,
  tableCount = 0,
  externalLinkCount = 0,
}: {
  readonly rank:
    number;

  readonly headings:
    readonly string[];

  readonly tableCount?:
    number;

  readonly externalLinkCount?:
    number;
}): CompetitorPageAnalysis {
  return {
    rank,

    domain:
      `site${rank}.example`,

    url:
      `https://site${rank}.example/page`,

    fetched:
      true,

    statusCode:
      200,

    pageType:
      "ARTICLE",

    title:
      headings[0] ??
      null,

    h1:
      headings[0] ??
      null,

    h2:
      [
        ...headings.slice(
          1
        ),
      ],

    h3:
      [],

    wordCount:
      1000,

    schemaTypes:
      [
        "Article",
      ],

    tableCount,

    imageCount:
      1,

    videoCount:
      0,

    detailsCount:
      0,

    externalLinkCount,

    authorSignal:
      true,

    dateSignal:
      true,

    error:
      null,
  };
}


describe(
  "Competitor Information Gain V1",
  () => {
    it(
      "distinguishes strong, weak and missing mission-topic coverage from fetched pages",
      () => {
        const result =
          buildCompetitorInformationGainV1({
            competitors: [
              page({
                rank:
                  1,

                headings: [
                  "Credit monitoring guide",
                  "How credit monitoring works",
                  "Credit monitoring limitations",
                ],
              }),

              page({
                rank:
                  2,

                headings: [
                  "Credit monitoring explained",
                  "How credit monitoring works",
                ],
              }),

              page({
                rank:
                  3,

                headings: [
                  "Credit monitoring basics",
                  "How credit monitoring works",
                ],
              }),
            ],

            topics: [
              "How credit monitoring works",
              "Credit monitoring limitations",
              "Decision criteria",
            ],
          });


        expect(
          result
            .topicCoverage
            .find(
              (
                item
              ) =>
                item.topic ===
                "How credit monitoring works"
            )
            ?.coverage
        ).toBe(
          "STRONG"
        );


        expect(
          result
            .topicCoverage
            .find(
              (
                item
              ) =>
                item.topic ===
                "Credit monitoring limitations"
            )
            ?.coverage
        ).toBe(
          "WEAK"
        );


        expect(
          result
            .topicCoverage
            .find(
              (
                item
              ) =>
                item.topic ===
                "Decision criteria"
            )
            ?.coverage
        ).toBe(
          "NONE"
        );


        expect(
          result
            .informationGainTopics
        ).toEqual(
          expect.arrayContaining([
            "Credit monitoring limitations",
            "Decision criteria",
          ])
        );
      }
    );


    it(
      "does not confuse parent-topic overlap with subtopic coverage",
      () => {
        const result =
          buildCompetitorInformationGainV1({
            competitors: [
              page({
                rank:
                  1,

                headings: [
                  "Credit monitoring explained",
                ],
              }),

              page({
                rank:
                  2,

                headings: [
                  "Credit monitoring guide",
                ],
              }),

              page({
                rank:
                  3,

                headings: [
                  "Credit monitoring limitations",
                ],
              }),
            ],

            topics: [
              "Credit monitoring limitations",
            ],
          });


        expect(
          result
            .topicCoverage[0]
            ?.matchedPages
        ).toBe(
          1
        );


        expect(
          result
            .topicCoverage[0]
            ?.coverage
        ).toBe(
          "WEAK"
        );
      }
    );


    it(
      "does not claim missing coverage when too few pages were fetched",
      () => {
        const result =
          buildCompetitorInformationGainV1({
            competitors: [
              page({
                rank:
                  1,

                headings: [
                  "Credit monitoring",
                ],
              }),
            ],

            topics: [
              "Decision criteria",
            ],
          });


        expect(
          result.confidence
        ).toBe(
          "INSUFFICIENT"
        );

        expect(
          result
            .topicCoverage[0]
            ?.coverage
        ).toBe(
          "UNKNOWN"
        );

        expect(
          result
            .informationGainTopics
        ).toEqual(
          []
        );
      }
    );


    it(
      "observes asset formats without calling them original or high quality",
      () => {
        const result =
          buildCompetitorInformationGainV1({
            competitors: [
              page({
                rank:
                  1,

                headings: [
                  "Guide",
                ],

                tableCount:
                  1,

                externalLinkCount:
                  3,
              }),

              page({
                rank:
                  2,

                headings: [
                  "Guide",
                ],
              }),
            ],

            topics: [
              "Guide",
            ],
          });


        expect(
          result
            .assetCoverage
            .find(
              (
                item
              ) =>
                item.signal ===
                "TABLE"
            )
            ?.pagesWithSignal
        ).toBe(
          1
        );


        expect(
          JSON.stringify(
            result
          ).toLowerCase()
        ).not.toContain(
          "qualityscore"
        );
      }
    );


    it(
      "promotes only existing mission topics into original-value consideration",
      () => {
        const informationGain =
          buildCompetitorInformationGainV1({
            competitors: [
              page({
                rank:
                  1,

                headings: [
                  "Definition",
                ],
              }),

              page({
                rank:
                  2,

                headings: [
                  "Definition",
                ],
              }),
            ],

            topics: [
              "Definition",
              "Limitations",
            ],
          });


        const result =
          applyCompetitorInformationGainV1({
            opportunities: [
              {
                topic:
                  "Definition",

                competitorCoverage:
                  "UNKNOWN" as const,

                originalValueOpportunity:
                  false,

                marker:
                  1,
              },

              {
                topic:
                  "Limitations",

                competitorCoverage:
                  "UNKNOWN" as const,

                originalValueOpportunity:
                  false,

                marker:
                  2,
              },
            ],

            informationGain,
          });


        expect(
          result.map(
            (
              item
            ) =>
              item.topic
          )
        ).toEqual([
          "Definition",
          "Limitations",
        ]);


        expect(
          result[0]
            ?.competitorCoverage
        ).toBe(
          "STRONG"
        );


        expect(
          result[1]
            ?.competitorCoverage
        ).toBe(
          "NONE"
        );


        expect(
          result[1]
            ?.originalValueOpportunity
        ).toBe(
          true
        );
      }
    );
  }
);
