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


const serp =
  readFileSync(
    "src/lib/content/serp-intelligence.ts",
    "utf8"
  );


describe(
  "Production competitor information gain wiring",
  () => {
    it(
      "uses already fetched competitor pages",
      () => {
        expect(
          planner
        ).toContain(
          "research\n          .serpIntelligence\n          .competitors"
        );

        expect(
          planner
        ).toContain(
          "buildCompetitorInformationGainV1({"
        );
      }
    );


    it(
      "feeds deterministic topic opportunity into the existing Original Value planner",
      () => {
        const gainIndex =
          planner.indexOf(
            "buildCompetitorInformationGainV1({"
          );

        const originalValueIndex =
          planner.indexOf(
            "planProductionOriginalValue({"
          );


        expect(
          gainIndex
        ).toBeGreaterThan(
          -1
        );

        expect(
          originalValueIndex
        ).toBeGreaterThan(
          gainIndex
        );

        expect(
          planner
        ).toContain(
          "opportunities:\n        deterministicTopicOpportunities"
        );
      }
    );


    it(
      "does not create a second Original Value planner",
      () => {
        expect(
          planner.match(
            /planProductionOriginalValue\(\{/g
          )?.length
        ).toBe(
          1
        );
      }
    );


    it(
      "records direct DOM competitor observations",
      () => {
        expect(
          serp
        ).toContain(
          "SERP_COMPETITOR_OBSERVABILITY_V1"
        );

        expect(
          serp
        ).toContain(
          "tableCount"
        );

        expect(
          serp
        ).toContain(
          "externalLinkCount"
        );

        expect(
          serp
        ).toContain(
          "schemaTypes"
        );
      }
    );
  }
);
