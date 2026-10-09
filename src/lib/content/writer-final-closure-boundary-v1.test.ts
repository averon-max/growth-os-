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


const replay =
  readFileSync(
    "src/lib/content/serp-replay.ts",
    "utf8"
  );


describe(
  "Writer final closure boundaries",
  () => {
    it(
      "plans headings from information jobs rather than keyword quotas",
      () => {
        expect(
          planner
        ).toContain(
          "ADAPTIVE_INFORMATION_JOB_STRUCTURE_V1"
        );

        expect(
          planner
        ).toContain(
          "one genuinely distinct MAJOR information job"
        );

        expect(
          planner
        ).toContain(
          "Use H3 only for meaningful child jobs"
        );
      }
    );


    it(
      "bounds expensive final SERP pairwise replay",
      () => {
        expect(
          replay
        ).toContain(
          "SERP_REPLAY_PAIRWISE_COST_BOUND_V1"
        );

        expect(
          replay
        ).toContain(
          "competitors.slice("
        );
      }
    );
  }
);
