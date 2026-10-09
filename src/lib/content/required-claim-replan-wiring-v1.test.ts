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
  "required claim replan V1 wiring",
  () => {
    it(
      "runs after conservative reconciliation and before evidence closure",
      () => {
        const reconciliation =
          source.indexOf(
            "[content evidence claim reconciliation]"
          );

        const replan =
          source.indexOf(
            "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"
          );

        const closure =
          source.indexOf(
            "[content evidence closure]"
          );

        expect(reconciliation)
          .toBeGreaterThanOrEqual(0);

        expect(replan)
          .toBeGreaterThan(reconciliation);

        expect(closure)
          .toBeGreaterThan(replan);
      }
    );

    it(
      "uses strict verification and verified excerpts",
      () => {
        const start =
          source.indexOf(
            "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"
          );

        const end =
          source.indexOf(
            "[content evidence claim replan]",
            start
          );

        const block =
          source.slice(
            start,
            end
          );

        expect(block)
          .toContain(
            "enrichLiveEvidenceGraphV1({"
          );

        expect(block)
          .toContain(
            '"VERIFIED_EXCERPT"'
          );

        expect(block)
          .toContain(
            '"SUPPORTS"'
          );

        expect(block)
          .toContain(
            "allowedSourceIds.has("
          );
      }
    );

    it(
      "does not rewrite section ownership",
      () => {
        const start =
          source.indexOf(
            "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"
          );

        const end =
          source.indexOf(
            "[content evidence claim replan]",
            start
          );

        const block =
          source.slice(
            start,
            end
          );

        expect(block)
          .not.toContain(
            "section.requiredClaimIds ="
          );

        expect(
          block
        ).not.toMatch(
          /\bclaim\.id\s*=(?!=)/
        );
      }
    );
  }
);
