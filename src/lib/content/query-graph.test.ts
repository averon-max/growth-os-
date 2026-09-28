import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  buildQueryGraph,
} from "./query-graph";


const mission =
  createSearchMission({
    id:
      "mission-credit-monitoring-v1",

    websiteId:
      "website-scanmycreds",

    topic:
      "what is credit monitoring",

    audience:
      "US consumers concerned about fraud and identity theft",

    readerGoal:
      "Understand what credit monitoring is, how it works, its limits, and what to do after an alert.",

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


describe(
  "QueryGraph V1",
  () => {
    it(
      "implements QueryNode without inventing unavailable metrics",
      () => {
        const graph =
          buildQueryGraph({
            mission,

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
                  "MANUAL",

                sourceConfidence:
                  1,

                sameMissionEvidence:
                  true,
              },
            ],
          });

        const node =
          graph.nodes[0];

        expect(
          node
        ).toBeDefined();

        expect(
          node?.missionId
        ).toBe(
          mission.id
        );

        expect(
          node?.searchVolume
        ).toBeUndefined();

        expect(
          node?.gscImpressions
        ).toBeUndefined();

        expect(
          node?.cpc
        ).toBeUndefined();
      }
    );


    it(
      "deduplicates query strings and preserves source provenance",
      () => {
        const graph =
          buildQueryGraph({
            mission,

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
                  0.95,

                gscImpressions:
                  120,

                sameMissionEvidence:
                  true,
              },

              {
                query:
                  "What Is Credit Monitoring",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "DEFINITION",

                cluster:
                  "CREDIT_MONITORING",

                siteCoverage:
                  "WEAK",

                source:
                  "DATAFORSEO",

                sourceConfidence:
                  0.9,

                searchVolume:
                  5400,

                sameMissionEvidence:
                  true,
              },
            ],
          });

        expect(
          graph.nodes
        ).toHaveLength(
          1
        );

        expect(
          graph.nodes[0]
            ?.gscImpressions
        ).toBe(
          120
        );

        expect(
          graph.nodes[0]
            ?.searchVolume
        ).toBe(
          5400
        );

        expect(
          graph.provenance[0]
            ?.sources
        ).toEqual(
          expect.arrayContaining([
            "GSC",
            "DATAFORSEO",
          ])
        );
      }
    );


    it(
      "routes same mission, alternate intent and cluster demand separately",
      () => {
        const graph =
          buildQueryGraph({
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
                  "FUNCTION",

                cluster:
                  "CREDIT_MONITORING",

                siteCoverage:
                  "NONE",

                source:
                  "PAA",

                sourceConfidence:
                  0.8,

                sameMissionEvidence:
                  true,
              },

              {
                query:
                  "best credit monitoring services",

                intent:
                  "COMMERCIAL",

                subIntent:
                  "EVALUATION",

                cluster:
                  "CREDIT_MONITORING_SERVICES",

                siteCoverage:
                  "NONE",

                source:
                  "DATAFORSEO",

                sourceConfidence:
                  0.9,
              },

              {
                query:
                  "credit monitoring limitations",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "LIMITATIONS",

                cluster:
                  "CREDIT_PROTECTION",

                siteCoverage:
                  "NONE",

                source:
                  "SERP_QUESTION",

                sourceConfidence:
                  0.75,

                missionOverlap:
                  0.5,

                queryOverlap:
                  0.4,
              },
            ],
          });

        expect(
          graph.samePageNodeIds
        ).toHaveLength(
          1
        );

        expect(
          graph.separatePageNodeIds
        ).toHaveLength(
          1
        );

        expect(
          graph.clusterNodeIds
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "keeps competitor branded demand visible but prevents mission ownership",
      () => {
        const graph =
          buildQueryGraph({
            mission,

            missionIntent:
              "INFORMATIONAL",

            signals: [
              {
                query:
                  "experian credit monitoring",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "COMPETITOR_BRAND",

                cluster:
                  "COMPETITOR_INTELLIGENCE",

                siteCoverage:
                  "NONE",

                source:
                  "COMPETITOR_QUERY",

                sourceConfidence:
                  1,

                searchVolume:
                  999999,

                gscImpressions:
                  999999,

                missionOverlap:
                  1,

                queryOverlap:
                  1,

                serpUrlOverlap:
                  1,

                serpPageTypeOverlap:
                  1,
              },
            ],
          });

        expect(
          graph.nodes
        ).toHaveLength(
          1
        );

        expect(
          graph.uncertainNodeIds
        ).toHaveLength(
          1
        );

        expect(
          graph.boundaries[0]
            ?.primaryEligible
        ).toBe(
          false
        );

        expect(
          graph.boundaries[0]
            ?.reasons
        ).toContain(
          "UNREQUESTED_ENTITY_MODIFIER"
        );
      }
    );


    it(
      "detects cannibalization ownership as MERGE",
      () => {
        const graph =
          buildQueryGraph({
            mission,

            missionIntent:
              "INFORMATIONAL",

            signals: [
              {
                query:
                  "credit monitoring meaning",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "DEFINITION",

                cluster:
                  "CREDIT_MONITORING",

                siteCoverage:
                  "STRONG",

                source:
                  "GSC",

                sourceConfidence:
                  0.95,

                existingOwnerUrls: [
                  "/credit-monitoring",
                  "/credit-monitoring-guide",
                ],

                missionOverlap:
                  0.9,

                queryOverlap:
                  0.8,
              },
            ],
          });

        expect(
          graph.mergeNodeIds
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "creates deterministic relationships between observed queries",
      () => {
        const input = {
          mission,

          missionIntent:
            "INFORMATIONAL" as const,

          signals: [
            {
              query:
                "credit monitoring limitations",

              intent:
                "INFORMATIONAL" as const,

              subIntent:
                "LIMITATIONS",

              cluster:
                "CREDIT_MONITORING",

              siteCoverage:
                "NONE" as const,

              source:
                "PAA" as const,

              sourceConfidence:
                0.8,

              missionOverlap:
                0.6,

              queryOverlap:
                0.5,
            },

            {
              query:
                "credit monitoring vs credit freeze",

              intent:
                "INFORMATIONAL" as const,

              subIntent:
                "COMPARISON",

              cluster:
                "CREDIT_PROTECTION",

              siteCoverage:
                "NONE" as const,

              source:
                "RELATED_SEARCH" as const,

              sourceConfidence:
                0.85,

              missionOverlap:
                0.4,

              queryOverlap:
                0.4,
            },
          ],
        };

        const first =
          buildQueryGraph(
            input
          );

        const second =
          buildQueryGraph(
            input
          );

        expect(
          first.nodes.map(
            (node) =>
              node.id
          )
        ).toEqual(
          second.nodes.map(
            (node) =>
              node.id
          )
        );

        expect(
          first.edges
        ).toEqual(
          second.edges
        );

        expect(
          first.edges.some(
            (edge) =>
              edge.relationship ===
              "COMPARISON"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "accepts LOCAL as a first-class query intent",
      () => {
        const graph =
          buildQueryGraph({
            mission,

            missionIntent:
              "INFORMATIONAL",

            signals: [
              {
                query:
                  "credit monitoring service near me",

                intent:
                  "LOCAL",

                subIntent:
                  "LOCAL_SERVICE",

                cluster:
                  "CREDIT_MONITORING_SERVICES",

                siteCoverage:
                  "NONE",

                source:
                  "DATAFORSEO",

                sourceConfidence:
                  0.9,
              },
            ],
          });

        expect(
          graph.nodes[0]
            ?.intent
        ).toBe(
          "LOCAL"
        );

        expect(
          graph.separatePageNodeIds
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "rejects fake confidence values instead of silently normalizing them",
      () => {
        expect(
          () =>
            buildQueryGraph({
              mission,

              missionIntent:
                "INFORMATIONAL",

              signals: [
                {
                  query:
                    "credit monitoring",

                  intent:
                    "INFORMATIONAL",

                  subIntent:
                    "DEFINITION",

                  cluster:
                    "CREDIT_MONITORING",

                  siteCoverage:
                    "NONE",

                  source:
                    "MANUAL",

                  sourceConfidence:
                    1.5,
                },
              ],
            })
        ).toThrow(
          "QUERY_GRAPH_SOURCE_CONFIDENCE_INVALID"
        );
      }
    );
  }
);
