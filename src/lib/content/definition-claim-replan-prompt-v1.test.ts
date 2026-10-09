import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


describe(
  "definition claim replan prompt V1",
  () => {
    it(
      "requires definition jobs to remain definitions",
      () => {
        const source =
          readFileSync(
            new URL(
              "./production-master-live-stage-planner.ts",
              import.meta.url
            ),
            "utf8"
          );


        expect(
          source
        ).toContain(
          "replacement MUST remain a definition"
        );


        expect(
          source
        ).toContain(
          "state what the subject IS"
        );


        expect(
          source
        ).toContain(
          "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"
        );
      }
    );
  }
);
