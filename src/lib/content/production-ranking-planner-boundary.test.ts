import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


const planner =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "src/lib/content/production-master-live-stage-planner.ts"
    ),
    "utf8"
  );


describe(
  "Production ranking planner boundary",
  () => {
    it(
      "locks QueryGraph identities to observed live queries",
      () => {
        expect(
          planner
        ).toContain(
          "OBSERVED_QUERY_LOCK_V1"
        );

        expect(
          planner
        ).toContain(
          "observedQuerySet.has"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_UNOBSERVED_QUERY_REJECTED"
        );
      }
    );


    it(
      "never uses the model primary query as canonical MasterBlueprint identity",
      () => {
        expect(
          planner
        ).not.toContain(
          "primaryQuery: plan.primaryQuery.trim()"
        );

        expect(
          planner
        ).toMatch(
          /primaryQuery:[\s\S]{0,120}research[\s\S]{0,80}\.keyword/
        );
      }
    );


    it(
      "injects live Top-10 SERP competitive coverage into semantic planning",
      () => {
        expect(
          planner
        ).toContain(
          "buildSerpCompetitiveCoveragePrompt"
        );

        expect(
          planner
        ).toContain(
          "STRICT OBSERVED QUERY IDENTITY CONTRACT"
        );
      }
    );
  }
);
