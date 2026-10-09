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
      "./search-blueprint.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Production primary metric authority V2",
  () => {
    it(
      "binds metrics to actual production primary",
      () => {
        const marker =
          source.indexOf(
            "PRODUCTION_PRIMARY_METRIC_AUTHORITY_V2"
          );

        expect(
          marker
        ).toBeGreaterThan(
          -1
        );

        const window =
          source.slice(
            marker,
            marker + 7000
          );

        expect(
          window
        ).toContain(
          "productionMetricCandidate"
        );

        expect(
          window
        ).toContain(
          ".ranked"
        );

        expect(
          window
        ).toContain(
          "normalizedProductionPrimaryForMetrics"
        );

        expect(
          window
        ).toContain(
          "const metricSource ="
        );

        expect(
          window
        ).toContain(
          "strategy.primary"
        );

        expect(
          window
        ).not.toContain(
          "selectedKeyword"
        );
      }
    );


    it(
      "does not use KeywordDecision primary as metric authority",
      () => {
        const marker =
          source.indexOf(
            "PRODUCTION_PRIMARY_METRIC_AUTHORITY_V2"
          );

        const window =
          source.slice(
            marker,
            marker + 7000
          );

        expect(
          window
        ).not.toMatch(
          /keywordDecision\s*\?\.\s*primary[\s\S]*?const metricSource/
        );
      }
    );
  }
);
