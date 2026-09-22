import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GapAnalysis,
} from "./gap-engine";

import {
  assessCommodityRisk,
  buildOriginalValuePlan,
} from "./original-value";


const gaps:
  GapAnalysis = {
    version:
      "GAP_ENGINE_V1",

    missionId:
      "mission-1",

    gaps: [
      {
        type:
          "ORIGINAL_VALUE_GAP",

        topic:
          "What monitoring can and cannot detect",

        severity:
          "MAJOR",

        coverageRole:
          "REQUIRED",

        evidence: [
          "DEFENSIBLE_UNIQUE_ASSET_OPPORTUNITY",
        ],

        opportunity:
          "Build a detection matrix.",
      },
    ],

    byType: {
      MISSION_GAP:
        0,

      EXPECTED_GAP:
        0,

      DEPTH_GAP:
        0,

      CLARITY_GAP:
        0,

      EVIDENCE_GAP:
        0,

      ACTION_GAP:
        0,

      ORIGINAL_VALUE_GAP:
        1,
    },

    criticalCount:
      0,

    majorCount:
      1,

    evidence: [
      "EXPECTED_COVERAGE_MODEL",
    ],
  };


describe(
  "Original Value V1",
  () => {
    it(
      "rejects a plan with no defensible original value",
      () => {
        const plan =
          buildOriginalValuePlan({
            missionId:
              "mission-1",

            gaps,

            assets:
              [],
          });

        expect(
          plan.strength
        ).toBe(
          "NONE"
        );

        expect(
          plan.gate
        ).toBe(
          "REJECTED"
        );

        expect(
          plan.issues
        ).toContain(
          "CRITICAL:NO_DEFENSIBLE_ORIGINAL_VALUE"
        );
      }
    );


    it(
      "accepts a verified useful comparison matrix as defensible original value",
      () => {
        const plan =
          buildOriginalValuePlan({
            missionId:
              "mission-1",

            gaps,

            assets: [
              {
                id:
                  "asset-detection-matrix",

                type:
                  "COMPARISON_MATRIX",

                title:
                  "What credit monitoring can and cannot detect",

                description:
                  "Event → where it appears → whether monitoring sees it → alert → consumer action.",

                firstParty:
                  false,

                verified:
                  true,

                evidenceIds: [
                  "cfpb-monitoring",
                  "ftc-credit-report",
                ],
              },
            ],

            commoditySignals: {
              semanticOverlapWithTopResults:
                0.45,

              genericParagraphRatio:
                0.3,

              originalTables:
                1,

              newSynthesis:
                1,
            },
          });

        expect(
          plan.strength
        ).toBe(
          "DEFENSIBLE"
        );

        expect(
          plan.gate
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "marks verified first-party plus multiple assets as strong",
      () => {
        const plan =
          buildOriginalValuePlan({
            missionId:
              "mission-1",

            gaps,

            assets: [
              {
                id:
                  "asset-telemetry",

                type:
                  "FIRST_PARTY_TELEMETRY",

                title:
                  "First-party exposure data",

                description:
                  "Verified aggregate first-party observations.",

                firstParty:
                  true,

                verified:
                  true,
              },

              {
                id:
                  "asset-matrix",

                type:
                  "COMPARISON_MATRIX",

                title:
                  "Detection matrix",

                description:
                  "Original practical comparison framework.",

                firstParty:
                  false,

                verified:
                  true,
              },
            ],

            commoditySignals: {
              firstPartyAssets:
                1,

              originalTables:
                1,

              newSynthesis:
                1,

              semanticOverlapWithTopResults:
                0.3,

              genericParagraphRatio:
                0.2,
            },
          });

        expect(
          plan.strength
        ).toBe(
          "STRONG"
        );

        expect(
          plan.gate
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "detects high commodity risk when content is mostly SERP summary with no unique signals",
      () => {
        const assessment =
          assessCommodityRisk({
            semanticOverlapWithTopResults:
              0.9,

            genericParagraphRatio:
              0.8,

            uniqueClaims:
              0,

            uniqueExamples:
              0,

            firstPartyAssets:
              0,

            originalTables:
              0,

            newSynthesis:
              0,

            newWorkflow:
              0,
          });

        expect(
          assessment.risk
        ).toBe(
          "HIGH"
        );

        expect(
          assessment.evidence
        ).toContain(
          "COULD_BE_SUMMARY_OF_EXISTING_RESULTS"
        );
      }
    );


    it(
      "keeps commodity risk unknown when there is no evidence",
      () => {
        expect(
          assessCommodityRisk(
            {}
          ).risk
        ).toBe(
          "UNKNOWN"
        );
      }
    );
  }
);
