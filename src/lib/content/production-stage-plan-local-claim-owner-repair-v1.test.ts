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
  "localized Stage Plan claim ownership recovery",
  () => {
    it(
      "repairs duplicate ownership locally",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_LOCAL_CLAIM_OWNER_REPAIR_V1"
        );

        expect(
          source
        ).toContain(
          "collectDuplicateStagePlanClaimOwnershipV1"
        );

        expect(
          source
        ).toContain(
          "applyStagePlanClaimOwnerChoicesV1"
        );
      }
    );


    it(
      "allows only existing owners",
      () => {
        expect(
          source
        ).toContain(
          "ownerSectionIndex MUST be one of the supplied CURRENT owners."
        );

        expect(
          source
        ).toContain(
          "Never choose a non-owner section."
        );
      }
    );


    it(
      "does not make claim category sole authority",
      () => {
        expect(
          source
        ).toContain(
          "Claim category is context only; never decide from category alone."
        );
      }
    );


    it(
      "prevents local repair followed by full regeneration",
      () => {
        expect(
          source
        ).toContain(
          "!localClaimOwnerRepairAttemptedV1"
        );

        expect(
          source
        ).toContain(
          "LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_INCOMPLETE"
        );
      }
    );


    it(
      "revalidates all Stage Plan ownership contracts",
      () => {
        const marker =
          source.indexOf(
            "[content stage planner] local claim owner repair"
          );

        const window =
          source.slice(
            Math.max(
              0,
              marker - 3000
            ),
            marker
          );

        expect(
          window
        ).toContain(
          "inspectStagePlanCompleteness"
        );

        expect(
          window
        ).toContain(
          "inspectStagePlanClaimOwnership"
        );

        expect(
          window
        ).toContain(
          "inspectStagePlanCoverageOwnership"
        );
      }
    );
  }
);
