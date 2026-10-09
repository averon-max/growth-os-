import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARTICLE_GENERATION_BUDGET_V1,
} from "./content-run-budget-v1";


const repairSource =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "critic verify-only soft depth V2",
  () => {
    it(
      "does not reject a semantically safe critic repair only for soft section depth",
      () => {
        expect(
          repairSource
        ).toContain(
          "CRITIC_VERIFY_ONLY_DEPTH_GUIDANCE_V2"
        );

        expect(
          repairSource
        ).not.toContain(
          "VERIFY_ONLY_AFTER_CRITIC"
        );

        expect(
          repairSource
        ).toContain(
          "assertSectionSemanticVerificationPassed"
        );

        expect(
          repairSource
        ).toContain(
          "assertSectionClaimReconciliationPassed"
        );
      }
    );


    it(
      "keeps the real spend caps while reserving calls for final replay",
      () => {
        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBe(
          36
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxEstimatedInputTokens
        ).toBe(
          140_000
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBe(
          10
        );
      }
    );
  }
);
