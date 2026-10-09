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
  "local claim-owner optional evidence-role contraction",
  () => {
    it(
      "keeps claim ownership repair atomic without inventing evidence",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_LOCAL_OPTIONAL_EVIDENCE_ROLE_CONTRACTION_V1"
        );

        expect(
          source
        ).toContain(
          "requiredRoleIdsForLocalRepairV1"
        );

        expect(
          source
        ).toContain(
          "evidenceSensitiveRoleIdsForLocalRepairV1"
        );

        expect(
          source
        ).toContain(
          "requiredClaimIds.length ==="
        );

        expect(
          source
        ).toContain(
          "!requiredRoleIdsForLocalRepairV1"
        );

        expect(
          source
        ).toContain(
          "Never invent a replacement claim."
        );

        expect(
          source
        ).toContain(
          "Never remove a REQUIRED template role."
        );
      }
    );


    it(
      "still revalidates the repaired Stage Plan fail closed",
      () => {
        const marker =
          source.indexOf(
            "STAGE_PLAN_LOCAL_OPTIONAL_EVIDENCE_ROLE_CONTRACTION_V1"
          );

        const tail =
          source.slice(
            marker,
            marker + 7000
          );

        expect(
          tail
        ).toContain(
          "inspectStagePlanCompleteness"
        );

        expect(
          tail
        ).toContain(
          "inspectStagePlanClaimOwnership"
        );

        expect(
          tail
        ).toContain(
          "inspectStagePlanCoverageOwnership"
        );

        expect(
          tail
        ).toContain(
          "LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_INCOMPLETE"
        );
      }
    );
  }
);
