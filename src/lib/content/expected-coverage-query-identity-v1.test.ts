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

import {
  buildExpectedCoverageModel,
} from "./expected-coverage";


function buildFixture() {
  const mission =
    createSearchMission({
      id:
        "mission-demand-bridge-v1",

      websiteId:
        "website-1",

      topic:
        "credit monitoring",

      audience:
        "US consumers",

      readerGoal:
        "Understand what credit monitoring is.",

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
          "2026-10-06T00:00:00.000Z"
        ),

      version:
        1,
    });


  const queryGraph =
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
            "DATAFORSEO",

          sourceConfidence:
            0.9,

          searchVolume:
            480,

          sameMissionEvidence:
            true,
        },
      ],
    });


  return {
    mission,
    queryGraph,
  };
}


describe(
  "Expected Coverage observed-query identity bridge V1",
  () => {
    it(
      "resolves an exact observed query identity to the canonical node and its real demand",
      () => {
        const {
          mission,
          queryGraph,
        } =
          buildFixture();


        const coverage =
          buildExpectedCoverageModel({
            mission,
            queryGraph,

            topics: [
              {
                topic:
                  "What credit monitoring is",

                missionRelevance:
                  1,

                queryIdentities: [
                  "what is credit monitoring",
                ],

                evidenceRequirement:
                  "VERIFIED_SOURCE",
              },
            ],
          });


        expect(
          coverage.items
        ).toHaveLength(
          1
        );


        expect(
          coverage.items[0]
            ?.queryDemand
            .queryNodes
        ).toBe(
          1
        );


        expect(
          coverage.items[0]
            ?.queryDemand
            .knownSearchVolume
        ).toBe(
          480
        );


        expect(
          coverage.items[0]
            ?.queryNodeIds
        ).toEqual([
          queryGraph.nodes[0]
            ?.id,
        ]);


        expect(
          coverage.items[0]
            ?.articleFit
        ).toBe(
          "SAME_PAGE"
        );


        expect(
          coverage.requiredTopics
        ).toContain(
          "What credit monitoring is"
        );
      }
    );


    it(
      "fails closed when semantic planning references a query identity absent from QueryGraph",
      () => {
        const {
          mission,
          queryGraph,
        } =
          buildFixture();


        expect(
          () =>
            buildExpectedCoverageModel({
              mission,
              queryGraph,

              topics: [
                {
                  topic:
                    "Invented topic",

                  missionRelevance:
                    1,

                  queryIdentities: [
                    "query that was never observed",
                  ],

                  evidenceRequirement:
                    "STANDARD",
                },
              ],
            })
        ).toThrow(
          "EXPECTED_COVERAGE_QUERY_IDENTITY_UNKNOWN:query that was never observed"
        );
      }
    );
  }
);
