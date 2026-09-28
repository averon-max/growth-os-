import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "../content/search-mission";

import {
  buildQueryGraph,
} from "../content/query-graph";

import {
  buildQueryOutcomeSeriesFromCheckpointRowsV1,
} from "./outcome-query-series-service";


function graph() {
  const mission =
    createSearchMission({
      id:
        "mission-series",

      websiteId:
        "website-1",

      topic:
        "credit monitoring",

      audience:
        "US consumers",

      readerGoal:
        "Understand credit monitoring.",

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
          "2026-09-21T00:00:00.000Z"
        ),

      version:
        1,
    });


  return buildQueryGraph({
    mission,

    missionIntent:
      "INFORMATIONAL",

    signals: [
      {
        query:
          "how does credit monitoring work",

        intent:
          "INFORMATIONAL",

        subIntent:
          "HOW_IT_WORKS",

        cluster:
          "CREDIT_MONITORING",

        siteCoverage:
          "WEAK",

        source:
          "DATAFORSEO",

        sourceConfidence:
          0.9,

        sameMissionEvidence:
          true,
      },
    ],
  });
}


describe(
  "article query outcome checkpoint series",
  () => {
    it(
      "builds forward query-group progression",
      () => {
        const queryGraph =
          graph();

        const node =
          queryGraph.nodes[0]!;

        const result =
          buildQueryOutcomeSeriesFromCheckpointRowsV1({
            queryGraph,

            sections: [
              {
                heading:
                  "How Credit Monitoring Works",

                queryNodeIds: [
                  node.id,
                ],
              },
            ],

            checkpoints: [
              {
                checkpoint:
                  "DAY_7",

                gscSnapshotDate:
                  "2026-10-01",

                rows: [
                  {
                    query:
                      "how does credit monitoring work",

                    pageUrl:
                      "https://example.com/article",

                    impressions:
                      20,

                    clicks:
                      1,

                    ctr:
                      0.05,

                    position:
                      24,
                  },
                ],
              },

              {
                checkpoint:
                  "DAY_28",

                gscSnapshotDate:
                  "2026-10-22",

                rows: [
                  {
                    query:
                      "how does credit monitoring work",

                    pageUrl:
                      "https://example.com/article",

                    impressions:
                      100,

                    clicks:
                      10,

                    ctr:
                      0.1,

                    position:
                      9,
                  },
                ],
              },
            ],
          });


        expect(
          result
            .series
            .checkpoints
        ).toHaveLength(2);

        expect(
          result
            .series
            .comparisons
        ).toHaveLength(1);

        expect(
          result
            .series
            .comparisons[0]
            ?.fromCheckpoint
        ).toBe(
          "DAY_7"
        );

        expect(
          result
            .series
            .comparisons[0]
            ?.toCheckpoint
        ).toBe(
          "DAY_28"
        );

        expect(
          result
            .series
            .comparisons[0]
            ?.retainedGroupIds
        ).toHaveLength(1);
      }
    );


    it(
      "keeps unmodeled observed queries outside semantic groups",
      () => {
        const result =
          buildQueryOutcomeSeriesFromCheckpointRowsV1({
            queryGraph:
              graph(),

            sections:
              [],

            checkpoints: [
              {
                checkpoint:
                  "DAY_28",

                gscSnapshotDate:
                  "2026-10-22",

                rows: [
                  {
                    query:
                      "identity theft recovery checklist",

                    pageUrl:
                      "https://example.com/article",

                    impressions:
                      80,

                    clicks:
                      4,

                    ctr:
                      0.05,

                    position:
                      17,
                  },
                ],
              },
            ],
          });


        expect(
          result
            .checkpoints[0]
            ?.unmappedQueryCount
        ).toBe(1);

        expect(
          result
            .series
            .checkpoints
        ).toHaveLength(0);

        expect(
          result
            .provenance
            .semanticInference
        ).toBe(false);
      }
    );
  }
);
