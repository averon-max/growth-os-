import {
  describe,
  expect,
  it,
} from "vitest";

import {
  classifySearchIntent,
  computeTrendAnalysis,
  keywordSimilarity,
} from "./seo-strategy";


describe(
  "content strategy",
  () => {
    it(
      "classifies intent",
      () => {
        expect(
          classifySearchIntent(
            "how to check if my email was compromised"
          )
        ).toBe(
          "INFORMATIONAL"
        );

        expect(
          classifySearchIntent(
            "best identity theft protection"
          )
        ).toBe(
          "COMMERCIAL"
        );

        expect(
          classifySearchIntent(
            "identity protection pricing"
          )
        ).toBe(
          "TRANSACTIONAL"
        );
      }
    );

    it(
      "detects related keyword wording",
      () => {
        expect(
          keywordSimilarity(
            "check if email was compromised",
            "check compromised email"
          )
        ).toBeGreaterThan(
          0.7
        );
      }
    );

    it(
      "calculates recent trend momentum",
      () => {
        const trend =
          computeTrendAnalysis([
            {
              year: 2026,
              month: 1,
              searchVolume:
                100,
            },
            {
              year: 2026,
              month: 2,
              searchVolume:
                100,
            },
            {
              year: 2026,
              month: 3,
              searchVolume:
                100,
            },
            {
              year: 2026,
              month: 4,
              searchVolume:
                150,
            },
            {
              year: 2026,
              month: 5,
              searchVolume:
                170,
            },
            {
              year: 2026,
              month: 6,
              searchVolume:
                180,
            },
          ]);

        expect(
          trend.momentumPct ??
          0
        ).toBeGreaterThan(
          0
        );
      }
    );

    it(
      "does not impose numerical heading counts",
      async () => {
        const source =
          await import("./seo-strategy");

        expect(
          "buildHeadingBudget" in source
        ).toBe(
          false
        );
      }
    );
  }
);
