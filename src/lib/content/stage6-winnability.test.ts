import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  OriginalValuePlan,
} from "./original-value";

import {
  buildStage6WinnabilityOverrides,
} from "./stage6-winnability";


function gapAnalysis(
  count: number
): GapAnalysis {
  return {
    version:
      "GAP_ENGINE_V1",

    missionId:
      "mission-1",

    gaps:
      Array.from(
        {
          length:
            count,
        },
        (
          _,
          index
        ) => ({
          type:
            index ===
            0
              ? "MISSION_GAP" as const
              : "DEPTH_GAP" as const,

          topic:
            `Topic ${index}`,

          severity:
            "MAJOR" as const,

          coverageRole:
            "REQUIRED" as const,

          evidence: [
            "TEST",
          ],

          opportunity:
            "Improve content.",
        })
      ),

    byType: {
      MISSION_GAP:
        count >
        0
          ? 1
          : 0,

      EXPECTED_GAP:
        0,

      DEPTH_GAP:
        Math.max(
          0,
          count -
            1
        ),

      CLARITY_GAP:
        0,

      EVIDENCE_GAP:
        0,

      ACTION_GAP:
        0,

      ORIGINAL_VALUE_GAP:
        0,
    },

    criticalCount:
      0,

    majorCount:
      count,

    evidence: [
      "TEST",
    ],
  };
}


function originalValue(
  strength:
    OriginalValuePlan["strength"]
): OriginalValuePlan {
  return {
    version:
      "ORIGINAL_VALUE_PLAN_V1",

    missionId:
      "mission-1",

    strength,

    gate:
      strength ===
      "NONE"
        ? "REJECTED"
        : strength ===
          "WEAK"
          ? "REVIEW"
          : "PASS",

    assets:
      [],

    commodity: {
      risk:
        "UNKNOWN",

      evidence:
        [],
    },

    issues:
      strength ===
      "NONE"
        ? [
            "CRITICAL:NO_DEFENSIBLE_ORIGINAL_VALUE",
          ]
        : [],

    evidence:
      [],
  };
}


describe(
  "Stage 6 → Winnability",
  () => {
    it(
      "feeds real market gaps into CONTENT_OPPORTUNITY",
      () => {
        const result =
          buildStage6WinnabilityOverrides({
            gaps:
              gapAnalysis(
                4
              ),

            originalValue:
              originalValue(
                "DEFENSIBLE"
              ),
          });

        expect(
          result
            .contentOpportunity
            ?.level
        ).toBe(
          "FAVORABLE"
        );
      }
    );


    it(
      "hard blocks original-value opportunity when there is no defensible plan",
      () => {
        const result =
          buildStage6WinnabilityOverrides({
            gaps:
              gapAnalysis(
                2
              ),

            originalValue:
              originalValue(
                "NONE"
              ),
          });

        expect(
          result
            .originalValueOpportunity
            ?.level
        ).toBe(
          "BLOCKED"
        );
      }
    );


    it(
      "does not pretend that absence of market gaps is a positive opportunity",
      () => {
        const result =
          buildStage6WinnabilityOverrides({
            gaps:
              gapAnalysis(
                0
              ),

            originalValue:
              originalValue(
                "DEFENSIBLE"
              ),
          });

        expect(
          result
            .contentOpportunity
            ?.level
        ).toBe(
          "UNFAVORABLE"
        );
      }
    );
  }
);
