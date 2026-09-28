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
  buildQueryOutcomeCheckpointFromGraphV1,
} from "./outcome-query-graph-adapter";


function graph() {
  const mission =
    createSearchMission({
      id:
        "mission-1",

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

      {
        query:
          "best credit monitoring service",

        intent:
          "COMMERCIAL",

        subIntent:
          "BEST_SERVICES",

        cluster:
          "CREDIT_MONITORING_PRODUCTS",

        siteCoverage:
          "NONE",

        source:
          "DATAFORSEO",

        sourceConfidence:
          0.8,

        sameMissionEvidence:
          false,
      },
    ],
  });
}


describe(
  "query outcome graph adapter v1",
  () => {
    it(
      "maps observed GSC demand only by exact QueryGraph normalization",
      () => {
        const queryGraph =
          graph();

        const node =
          queryGraph.nodes.find(
            (
              item
            ) =>
              item.normalizedQuery ===
              "how does credit monitoring work"
          );

        expect(
          node
        ).toBeTruthy();


        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph,

            sections: [
              {
                heading:
                  "How Credit Monitoring Works",

                queryNodeIds: [
                  node!.id,
                ],
              },
            ],

            rows: [
              {
                query:
                  "How does credit-monitoring work?",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  100,

                clicks:
                  10,

                ctr:
                  0.1,

                position:
                  12,
              },
            ],
          });


        expect(
          result.mappedQueryCount
        ).toBe(1);

        expect(
          result.unmappedQueryCount
        ).toBe(0);

        expect(
          result.outcome
            .queryGroupBreadth
        ).toBe(1);

        expect(
          result.outcome
            .groups[0]
            ?.queryNodeIds
        ).toEqual([
          node!.id,
        ]);

        expect(
          result.outcome
            .groups[0]
            ?.sectionHeadings
        ).toEqual([
          "How Credit Monitoring Works",
        ]);
      }
    );


    it(
      "keeps previously unmodeled GSC demand explicitly unmapped",
      () => {
        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph:
              graph(),

            sections:
              [],

            rows: [
              {
                query:
                  "credit monitoring after identity theft",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  250,

                clicks:
                  15,

                ctr:
                  0.06,

                position:
                  18,
              },
            ],
          });


        expect(
          result.mappedQueryCount
        ).toBe(0);

        expect(
          result.unmappedQueryCount
        ).toBe(1);

        expect(
          result.unmappedQueries[0]
            ?.query
        ).toBe(
          "credit monitoring after identity theft"
        );

        expect(
          result.outcome
            .queryGroupBreadth
        ).toBe(0);

        expect(
          result.provenance
            .fuzzyMatching
        ).toBe(false);

        expect(
          result.provenance
            .semanticInference
        ).toBe(false);
      }
    );


    it(
      "uses persisted mission boundary instead of query similarity",
      () => {
        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph:
              graph(),

            sections:
              [],

            rows: [
              {
                query:
                  "best credit monitoring service",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  1000,

                clicks:
                  100,

                ctr:
                  0.1,

                position:
                  3,
              },
            ],
          });


        expect(
          result.mappedQueryCount
        ).toBe(1);

        expect(
          result.outcome
            .excludedForeignMissionQueries
        ).toBe(1);

        expect(
          result.outcome
            .queryGroupBreadth
        ).toBe(0);
      }
    );


    it(
      "aggregates duplicate GSC dimension rows before Query Group evaluation",
      () => {
        const queryGraph =
          graph();

        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph,

            sections:
              [],

            rows: [
              {
                query:
                  "how does credit monitoring work",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  100,

                clicks:
                  10,

                ctr:
                  0.1,

                position:
                  10,
              },

              {
                query:
                  "how does credit monitoring work",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  300,

                clicks:
                  30,

                ctr:
                  0.1,

                position:
                  20,
              },
            ],
          });


        expect(
          result.outcome
            .groups[0]
            ?.impressions
        ).toBe(400);

        expect(
          result.outcome
            .groups[0]
            ?.clicks
        ).toBe(40);

        expect(
          result.outcome
            .groups[0]
            ?.position
        ).toBe(17.5);

        expect(
          result.outcome
            .groups[0]
            ?.ctr
        ).toBe(0.1);
      }
    );


    it(
      "derives aggregate CTR from real observed clicks and impressions",
      () => {
        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph:
              graph(),

            sections:
              [],

            rows: [
              {
                query:
                  "how does credit monitoring work",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  100,

                clicks:
                  10,

                ctr:
                  null,

                position:
                  10,
              },
            ],
          });


        expect(
          result.outcome
            .groups[0]
            ?.ctr
        ).toBe(0.1);
      }
    );


    it(
      "preserves missing CTR when click evidence is unavailable",
      () => {
        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph:
              graph(),

            sections:
              [],

            rows: [
              {
                query:
                  "how does credit monitoring work",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  100,

                clicks:
                  null,

                ctr:
                  null,

                position:
                  10,
              },
            ],
          });


        expect(
          result.outcome
            .groups[0]
            ?.ctr
        ).toBeNull();

        expect(
          result.outcome
            .groups[0]
            ?.clicks
        ).toBeNull();
      }
    );


    it(
      "does not invent a section id or choose between ambiguous section assignments",
      () => {
        const queryGraph =
          graph();

        const node =
          queryGraph.nodes.find(
            (
              item
            ) =>
              item.normalizedQuery ===
              "how does credit monitoring work"
          );

        expect(
          node
        ).toBeTruthy();


        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              "DAY_28",

            queryGraph,

            sections: [
              {
                heading:
                  "How It Works",

                queryNodeIds: [
                  node!.id,
                ],
              },

              {
                heading:
                  "Monitoring Mechanics",

                queryNodeIds: [
                  node!.id,
                ],
              },
            ],

            rows: [
              {
                query:
                  "how does credit monitoring work",

                pageUrl:
                  "https://example.com/credit-monitoring",

                impressions:
                  100,

                clicks:
                  5,

                ctr:
                  0.05,

                position:
                  15,
              },
            ],
          });


        expect(
          result.outcome
            .groups[0]
            ?.sectionIds
        ).toEqual([]);

        expect(
          result.outcome
            .groups[0]
            ?.sectionHeadings
        ).toEqual([]);

        expect(
          result
            .ambiguousSectionQueryNodeIds
        ).toEqual([
          node!.id,
        ]);

        expect(
          result.provenance
            .inventedSectionIds
        ).toBe(false);
      }
    );
  }
);
