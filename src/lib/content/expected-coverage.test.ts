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


const mission =
  createSearchMission({
    id:
      "mission-credit-monitoring-v1",

    websiteId:
      "site-1",

    topic:
      "what is credit monitoring",

    audience:
      "US consumers",

    readerGoal:
      "Understand what credit monitoring is, how it works, and its limitations.",

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
          0.95,

        searchVolume:
          5400,

        sameMissionEvidence:
          true,
      },

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
          0.85,

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
    ],
  });


function nodeId(
  query: string
): string {
  const node =
    queryGraph.nodes.find(
      (item) =>
        item.query ===
        query
    );

  if (
    !node
  ) {
    throw new Error(
      `missing test node ${query}`
    );
  }

  return node.id;
}


describe(
  "Expected Coverage V1",
  () => {
    it(
      "classifies mission-critical same-page information as REQUIRED",
      () => {
        const model =
          buildExpectedCoverageModel({
            mission,

            queryGraph,

            topics: [
              {
                topic:
                  "Definition",

                missionRelevance:
                  1,

                queryNodeIds: [
                  nodeId(
                    "what is credit monitoring"
                  ),
                ],

                serpOccurrences:
                  9,

                serpEligibleResults:
                  10,

                paaFrequency:
                  1,

                evidenceRequirement:
                  "STANDARD",
              },
            ],
          });

        expect(
          model.requiredTopics
        ).toEqual([
          "Definition",
        ]);

        expect(
          model.items[0]
            ?.queryDemand
            .knownSearchVolume
        ).toBe(
          5400
        );
      }
    );


    it(
      "keeps supporting information distinct from required coverage",
      () => {
        const model =
          buildExpectedCoverageModel({
            mission,

            queryGraph,

            topics: [
              {
                topic:
                  "Fraud alerts",

                missionRelevance:
                  0.55,

                serpOccurrences:
                  4,

                serpEligibleResults:
                  10,

                evidenceRequirement:
                  "VERIFIED_SOURCE",

                articleFit:
                  "SAME_PAGE",
              },
            ],
          });

        expect(
          model.supportingTopics
        ).toContain(
          "Fraud alerts"
        );
      }
    );


    it(
      "excludes distinct-intent demand from the article",
      () => {
        const model =
          buildExpectedCoverageModel({
            mission,

            queryGraph,

            topics: [
              {
                topic:
                  "Best credit monitoring services",

                missionRelevance:
                  0.5,

                queryNodeIds: [
                  nodeId(
                    "best credit monitoring services"
                  ),
                ],

                serpOccurrences:
                  8,

                serpEligibleResults:
                  10,

                evidenceRequirement:
                  "VERIFIED_SOURCE",
              },
            ],
          });

        expect(
          model.excludedTopics
        ).toEqual([
          "Best credit monitoring services",
        ]);
      }
    );


    it(
      "does not invent demand when metrics are unavailable",
      () => {
        const model =
          buildExpectedCoverageModel({
            mission,

            queryGraph,

            topics: [
              {
                topic:
                  "Alert response",

                missionRelevance:
                  0.3,

                evidenceRequirement:
                  "STANDARD",

                articleFit:
                  "SAME_PAGE",
              },
            ],
          });

        const item =
          model.items[0];

        expect(
          item?.queryDemand
            .knownSearchVolume
        ).toBeNull();

        expect(
          item?.queryDemand
            .knownGscImpressions
        ).toBeNull();

        expect(
          item?.serpFrequency
        ).toBeNull();
      }
    );


    it(
      "never converts competitor structure into word or heading targets",
      () => {
        const source =
          buildExpectedCoverageModel.toString();

        expect(
          source
        ).not.toContain(
          "wordCountTarget"
        );

        expect(
          source
        ).not.toContain(
          "h2Target"
        );

        expect(
          source
        ).not.toContain(
          "h3Target"
        );
      }
    );
  }
);
