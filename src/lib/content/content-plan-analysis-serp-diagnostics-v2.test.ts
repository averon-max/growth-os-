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
      "./content-plan-analysis.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Legacy SERP coverage diagnostics V2",
  () => {
    it(
      "does not present raw SERP observations as canonical MUST requirements",
      () => {
        expect(
          source
        ).toContain(
          "LEGACY_SERP_COVERAGE_DIAGNOSTICS_V2"
        );

        expect(
          source
        ).toContain(
          "observedSerpTopics"
        );

        expect(
          source
        ).toContain(
          "observedSerpQuestions"
        );

        expect(
          source
        ).toContain(
          "SERP_OBSERVED_TOPIC_NOT_LEXICALLY_COVERED:"
        );

        expect(
          source
        ).toContain(
          "SERP_OBSERVED_QUESTION_NOT_LEXICALLY_COVERED:"
        );

        expect(
          source
        ).not.toContain(
          "REQUIRED_TOPIC_NOT_LEXICALLY_COVERED:"
        );

        expect(
          source
        ).not.toContain(
          "PLANNED_QUESTION_NOT_LEXICALLY_COVERED:"
        );
      }
    );
  }
);
