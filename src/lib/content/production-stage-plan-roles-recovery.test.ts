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
    "src/lib/content/production-master-live-stage-planner.ts",
    "utf8"
  );


describe(
  "Stage Plan semantic-role completeness recovery",
  () => {
    it(
      "treats missing section roles as incomplete structured output",
      () => {
        expect(
          planner
        ).toContain(
          "TEMPLATE_ROLE_COMPLETENESS_RECOVERY_V1"
        );

        expect(
          planner
        ).toContain(
          '"sections[].roles"'
        );

        expect(
          planner
        ).toContain(
          "!Array.isArray(\n              section.roles"
        );
      }
    );


    it(
      "asks the one bounded recovery to restore roles",
      () => {
        const retryIndex =
          planner.indexOf(
            "STAGE_PLAN_COMPLETENESS_RETRY_V4:"
          );

        expect(
          retryIndex
        ).toBeGreaterThan(
          -1
        );

        const retryWindow =
          planner.slice(
            retryIndex,
            retryIndex +
              6000
          );

        expect(
          retryWindow
        ).toContain(
          "Every section must contain roles:"
        );

        expect(
          retryWindow
        ).toContain(
          "Every section must contain requiredClaimIds:"
        );
      }
    );


    it(
      "does not introduce an additional repair loop",
      () => {
        expect(
          planner.match(
            /STAGE_PLAN_COMPLETENESS_RETRY_V4:/g
          )?.length
        ).toBe(
          1
        );
      }
    );
  }
);
