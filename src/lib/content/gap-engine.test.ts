import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ExpectedCoverageModel,
} from "./expected-coverage";

import {
  buildGapAnalysis,
} from "./gap-engine";


const expected:
  ExpectedCoverageModel = {
    version:
      "EXPECTED_COVERAGE_V1",

    missionId:
      "mission-1",

    queryGraphVersion:
      "QUERY_GRAPH_V1",

    items: [
      {
        topic:
          "Definition",

        role:
          "REQUIRED",

        missionRelevance:
          1,

        queryDemand: {
          queryNodes:
            1,

          knownSearchVolume:
            5000,

          knownGscImpressions:
            null,
        },

        serpFrequency:
          0.9,

        paaFrequency:
          1,

        evidenceRequirement:
          "STANDARD",

        articleFit:
          "SAME_PAGE",

        queryNodeIds: [
          "q1",
        ],

        evidence: [
          "QUERY_GRAPH",
        ],
      },

      {
        topic:
          "Limitations",

        role:
          "REQUIRED",

        missionRelevance:
          0.9,

        queryDemand: {
          queryNodes:
            1,

          knownSearchVolume:
            null,

          knownGscImpressions:
            null,
        },

        serpFrequency:
          0.7,

        paaFrequency:
          2,

        evidenceRequirement:
          "VERIFIED_SOURCE",

        articleFit:
          "SAME_PAGE",

        queryNodeIds: [
          "q2",
        ],

        evidence: [
          "SERP_FREQUENCY",
        ],
      },

      {
        topic:
          "Alert response",

        role:
          "OPPORTUNITY",

        missionRelevance:
          0.3,

        queryDemand: {
          queryNodes:
            0,

          knownSearchVolume:
            null,

          knownGscImpressions:
            null,
        },

        serpFrequency:
          0.2,

        paaFrequency:
          1,

        evidenceRequirement:
          "STANDARD",

        articleFit:
          "SAME_PAGE",

        queryNodeIds:
          [],

        evidence: [
          "PAA",
        ],
      },
    ],

    requiredTopics: [
      "Definition",
      "Limitations",
    ],

    supportingTopics:
      [],

    opportunityTopics: [
      "Alert response",
    ],

    excludedTopics:
      [],

    evidence: [
      "MISSION",
    ],
  };


describe(
  "Gap Engine V1",
  () => {
    it(
      "keeps distinct gap types instead of collapsing everything into coverage percent",
      () => {
        const result =
          buildGapAnalysis({
            expectedCoverage:
              expected,

            observations: [
              {
                topic:
                  "Definition",

                competitorCoverage:
                  "NONE",

                competitorClarity:
                  "WEAK",

                competitorEvidence:
                  "WEAK",

                competitorAction:
                  "NOT_APPLICABLE",

                originalValueOpportunity:
                  false,
              },

              {
                topic:
                  "Limitations",

                competitorCoverage:
                  "WEAK",

                competitorClarity:
                  "WEAK",

                competitorEvidence:
                  "WEAK",

                competitorAction:
                  "WEAK",

                originalValueOpportunity:
                  true,
              },

              {
                topic:
                  "Alert response",

                competitorCoverage:
                  "STRONG",

                competitorClarity:
                  "STRONG",

                competitorEvidence:
                  "STRONG",

                competitorAction:
                  "WEAK",

                originalValueOpportunity:
                  true,
              },
            ],
          });

        expect(
          result.gaps.map(
            (gap) =>
              gap.type
          )
        ).toEqual(
          expect.arrayContaining([
            "MISSION_GAP",
            "EXPECTED_GAP",
            "DEPTH_GAP",
            "CLARITY_GAP",
            "EVIDENCE_GAP",
            "ACTION_GAP",
            "ORIGINAL_VALUE_GAP",
          ])
        );
      }
    );


    it(
      "makes missing required mission coverage critical",
      () => {
        const result =
          buildGapAnalysis({
            expectedCoverage:
              expected,

            observations: [
              {
                topic:
                  "Definition",

                competitorCoverage:
                  "NONE",

                competitorClarity:
                  "STRONG",

                competitorEvidence:
                  "STRONG",

                competitorAction:
                  "NOT_APPLICABLE",

                originalValueOpportunity:
                  false,
              },
            ],
          });

        const gap =
          result.gaps.find(
            (item) =>
              item.type ===
              "MISSION_GAP"
          );

        expect(
          gap?.severity
        ).toBe(
          "CRITICAL"
        );
      }
    );


    it(
      "does not invent gaps when competitor quality evidence is absent",
      () => {
        const result =
          buildGapAnalysis({
            expectedCoverage:
              expected,

            observations:
              [],
          });

        expect(
          result.gaps
        ).toHaveLength(
          0
        );
      }
    );
  }
);
