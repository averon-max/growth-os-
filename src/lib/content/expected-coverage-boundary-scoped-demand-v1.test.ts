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


describe(
  "ExpectedCoverage boundary-scoped demand V1",
  () => {
    const mission =
      createSearchMission({
        id:
          "mission-boundary-demand",

        websiteId:
          "site-1",

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
            "2026-10-07T00:00:00.000Z"
          ),

        version:
          1,
      });


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
              "definition",

            cluster:
              "credit monitoring",

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

          {
            query:
              "what is credit monitoring services",

            intent:
              "TRANSACTIONAL",

            subIntent:
              "services",

            cluster:
              "credit monitoring services",

            siteCoverage:
              "WEAK",

            source:
              "DATAFORSEO",

            sourceConfidence:
              0.9,

            searchVolume:
              110,
          },
        ],
      });


    const primary =
      graph.nodes.find(
        (
          node
        ) =>
          node.query ===
            "what is credit monitoring"
      );


    const services =
      graph.nodes.find(
        (
          node
        ) =>
          node.query ===
            "what is credit monitoring services"
      );


    if (
      !primary ||
      !services
    ) {
      throw new Error(
        "TEST_QUERY_NODE_MISSING"
      );
    }


    it(
      "does not let separate-page demand inflate a SAME_PAGE topic",
      () => {
        const coverage =
          buildExpectedCoverageModel({
            mission,

            queryGraph:
              graph,

            topics: [
              {
                topic:
                  "Definition of credit monitoring",

                missionRelevance:
                  1,

                queryNodeIds: [
                  primary.id,
                  services.id,
                ],

                evidenceRequirement:
                  "PRIMARY_SOURCE",
              },
            ],
          });


        const item =
          coverage.items[0];


        expect(
          item?.articleFit
        ).toBe(
          "SAME_PAGE"
        );


        expect(
          item?.queryDemand
        ).toEqual({
          queryNodes:
            1,

          knownSearchVolume:
            480,

          knownGscImpressions:
            null,
        });


        expect(
          item?.queryNodeIds
        ).toEqual([
          primary.id,
        ]);


        expect(
          coverage.requiredTopics
        ).toEqual([
          "Definition of credit monitoring",
        ]);
      }
    );


    it(
      "preserves demand for a genuinely SEPARATE_PAGE topic",
      () => {
        const coverage =
          buildExpectedCoverageModel({
            mission,

            queryGraph:
              graph,

            topics: [
              {
                topic:
                  "Credit monitoring services",

                missionRelevance:
                  0.5,

                queryNodeIds: [
                  services.id,
                ],

                evidenceRequirement:
                  "STANDARD",
              },
            ],
          });


        const item =
          coverage.items[0];


        expect(
          item?.articleFit
        ).toBe(
          "SEPARATE_PAGE"
        );


        expect(
          item?.queryDemand
            .knownSearchVolume
        ).toBe(
          110
        );


        expect(
          item?.queryNodeIds
        ).toEqual([
          services.id,
        ]);


        expect(
          coverage.excludedTopics
        ).toEqual([
          "Credit monitoring services",
        ]);
      }
    );
  }
);
