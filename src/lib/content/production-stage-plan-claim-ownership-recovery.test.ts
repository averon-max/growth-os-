import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Stage Plan claim ownership recovery V5",
  () => {
    it(
      "detects duplicate section ownership before evidence assignment",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_CLAIM_OWNERSHIP_RECOVERY_V5"
        );

        expect(
          source
        ).toContain(
          "sections[].requiredClaimIds duplicate-owner:"
        );

        expect(
          source
        ).toContain(
          "inspectStagePlanClaimOwnership"
        );
      }
    );


    it(
      "rejects section claim ids not declared in claims",
      () => {
        expect(
          source
        ).toContain(
          "sections[].requiredClaimIds unknown:"
        );
      }
    );


    it(
      "does not silently dedupe ownership by choosing the first section",
      () => {
        expect(
          source
        ).toContain(
          "We do NOT lexically guess a replacement owner"
        );

        expect(
          source
        ).toContain(
          "we do NOT"
        );
      }
    );


    it(
      "teaches bounded recovery that one claim has at most one owner",
      () => {
        expect(
          source
        ).toContain(
          "Each claim id may appear in requiredClaimIds of AT MOST ONE section."
        );
      }
    );
  }
);
