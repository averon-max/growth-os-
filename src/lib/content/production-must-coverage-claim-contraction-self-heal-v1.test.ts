import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const planner =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "MUST coverage survives claim contraction V1",
  () => {
    it(
      "does not equate a dropped factual claim with dropping mandatory user intent",
      () => {
        expect(
          planner
        ).toContain(
          "MUST_COVERAGE_SURVIVES_CLAIM_CONTRACTION_V1"
        );

        expect(
          planner
        ).toContain(
          "ownsMustExecutionCoverage"
        );

        expect(
          planner
        ).toContain(
          "shouldDeferForMissingEvidence"
        );

        expect(
          planner
        ).toMatch(
          /topicPriorityByLabel\.get\([\s\S]{0,120}?topic\.trim\(\)[\s\S]{0,120}?===\s*"MUST"/
        );

        expect(
          planner
        ).toMatch(
          /mandatoryQuestionLabelsV1\.has\([\s\S]{0,120}?question\.trim\(\)/
        );
      }
    );


    it(
      "keeps unsupported claims removed while preserving MUST section structure",
      () => {
        const requiredClaimsIndex =
          planner.indexOf(
            "const requiredClaimIds"
          );

        const unsupportedIndex =
          planner.indexOf(
            "const unsupportedRequiredClaimIds"
          );

        const mustCoverageIndex =
          planner.indexOf(
            "const ownsMustExecutionCoverage"
          );

        const stateIndex =
          planner.indexOf(
            "shouldDeferForMissingEvidence"
          );

        expect(
          requiredClaimsIndex
        ).toBeGreaterThan(
          -1
        );

        expect(
          unsupportedIndex
        ).toBeGreaterThan(
          requiredClaimsIndex
        );

        expect(
          mustCoverageIndex
        ).toBeGreaterThan(
          unsupportedIndex
        );

        expect(
          stateIndex
        ).toBeGreaterThan(
          unsupportedIndex
        );

        expect(
          planner
        ).toMatch(
          /const requiredClaimIds[\s\S]{0,500}?verifiedClaimIds\.has/
        );

        expect(
          planner
        ).toMatch(
          /shouldDeferForMissingEvidence\s*=\s*hasNoVerifiedRequiredClaim\s*&&\s*!ownsMustExecutionCoverage/
        );

        expect(
          planner
        ).toMatch(
          /state:\s*shouldDeferForMissingEvidence[\s\S]{0,100}?"DEFERRED_NO_EVIDENCE"[\s\S]{0,100}?"WRITABLE"/
        );
      }
    );


    it(
      "still permits optional unsupported scope to defer",
      () => {
        expect(
          planner
        ).toMatch(
          /hasNoVerifiedRequiredClaim\s*&&\s*!ownsMustExecutionCoverage/
        );
      }
    );
  }
);
