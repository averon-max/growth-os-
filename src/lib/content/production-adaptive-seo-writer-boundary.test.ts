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
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


const writer =
  readFileSync(
    new URL(
      "./master-section-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


const planAnalysis =
  readFileSync(
    new URL(
      "./content-plan-analysis.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Master Writer V3 adaptive SEO boundary",
  () => {
    it(
      "keeps one primary mission without secondary keyword quotas",
      () => {
        expect(
          planner
        ).toContain(
          "ADAPTIVE_SEO_COVERAGE_POLICY_V2"
        );

        expect(
          planner
        ).toContain(
          "exactly ONE canonical primary query"
        );

        expect(
          planner
        ).toContain(
          "There is NO required numeric count of secondary queries."
        );

        expect(
          planner
        ).toContain(
          "smallest sufficient set"
        );
      }
    );


    it(
      "uses live SERP length only as descriptive evidence",
      () => {
        expect(
          planner
        ).toContain(
          "LIVE_SERP_EDITORIAL_CONTEXT_V2"
        );

        expect(
          planner
        ).toContain(
          "medianWordCount="
        );

        expect(
          planner
        ).toContain(
          "They are NOT mandatory targets."
        );

        expect(
          planner
        ).toContain(
          "There is NO fixed article word-count target"
        );
      }
    );


    it(
      "stops writer on semantic completion instead of word count",
      () => {
        expect(
          writer
        ).toContain(
          "SEMANTIC_COMPLETION_STOP_RULE_V3"
        );

        expect(
          writer
        ).toContain(
          "STOP writing the section"
        );

        expect(
          writer
        ).toContain(
          "Never repeat an exact query phrase"
        );
      }
    );


    it(
      "does not convert historical SERP medians into analyzer targets",
      () => {
        expect(
          planAnalysis
        ).toMatch(
          /targets:\s*null/
        );
      }
    );
  }
);
