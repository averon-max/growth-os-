import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildStage7WinnabilityOverrides,
} from "./stage7-winnability";

import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  ClaimPublicationGate,
} from "./claim-publication-gate";


function gaps(
  evidenceGapCount:
    number
): GapAnalysis {
  return {
    version:
      "GAP_ENGINE_V1",

    missionId:
      "mission-1",

    gaps:
      [],

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
        evidenceGapCount,

      ACTION_GAP:
        0,

      ORIGINAL_VALUE_GAP:
        0,
    },

    criticalCount:
      0,

    majorCount:
      0,

    evidence:
      [],
  };
}


function ledger({
  verified,
  unsupported,
}: {
  verified:
    number;

  unsupported:
    number;
}): ClaimLedger {
  return {
    version:
      "CLAIM_LEDGER_V1",

    claims:
      [],

    counts: {
      VERIFIED:
        verified,

      PARTIAL:
        0,

      UNSUPPORTED:
        unsupported,

      CONTRADICTED:
        0,

      STALE:
        0,

      JURISDICTION_MISMATCH:
        0,
    },

    verified,

    unsupported,

    blockingCandidateCount:
      0,
  };
}


function gate(
  blockers:
    number
): ClaimPublicationGate {
  return {
    version:
      "CLAIM_PUBLICATION_GATE_V1",

    pass:
      blockers ===
      0,

    blockers:
      Array.from(
        {
          length:
            blockers,
        },
        (
          _,
          index
        ) => ({
          code:
            "UNSUPPORTED_HIGH_RISK_CLAIM" as const,

          claimId:
            `claim-${index}`,

          claim:
            "Test",

          category:
            "FINANCIAL" as const,

          status:
            "UNSUPPORTED" as const,
        })
      ),

    warnings:
      [],
  };
}


describe(
  "Stage 7 → Winnability",
  () => {
    it(
      "marks evidence opportunity favorable when a competitor evidence gap can be exploited with verified claims",
      () => {
        const result =
          buildStage7WinnabilityOverrides({
            gaps:
              gaps(
                2
              ),

            ledger:
              ledger({
                verified:
                  4,

                unsupported:
                  0,
              }),

            publicationGate:
              gate(
                0
              ),
          });

        expect(
          result
            .evidenceOpportunity
            ?.level
        ).toBe(
          "FAVORABLE"
        );
      }
    );


    it(
      "blocks evidence dimension when claim publication gate fails",
      () => {
        const result =
          buildStage7WinnabilityOverrides({
            gaps:
              gaps(
                1
              ),

            ledger:
              ledger({
                verified:
                  1,

                unsupported:
                  1,
              }),

            publicationGate:
              gate(
                1
              ),
          });

        expect(
          result
            .evidenceOpportunity
            ?.level
        ).toBe(
          "BLOCKED"
        );
      }
    );


    it(
      "does not invent evidence opportunity when neither gaps nor verified claims exist",
      () => {
        const result =
          buildStage7WinnabilityOverrides({
            gaps:
              gaps(
                0
              ),

            ledger:
              ledger({
                verified:
                  0,

                unsupported:
                  0,
              }),

            publicationGate:
              gate(
                0
              ),
          });

        expect(
          result
            .evidenceOpportunity
            ?.level
        ).toBe(
          "UNKNOWN"
        );
      }
    );
  }
);
