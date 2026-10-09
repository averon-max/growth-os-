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
  "production information gain -> Original Value wiring V1",
  () => {
    it(
      "uses competitor-enriched opportunities instead of raw Stage Plan topics",
      () => {
        const start =
          source.indexOf(
            "const originalValuePlan ="
          );


        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );


        const window =
          source.slice(
            start,
            start + 1600
          );


        expect(
          window
        ).toMatch(
          /opportunities:\s*deterministicTopicOpportunities/
        );


        expect(
          window
        ).not.toMatch(
          /opportunities:\s*plan\.topics/
        );
      }
    );
  }
);
