import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const seo =
  readFileSync(
    new URL(
      "./seo-strategy.ts",
      import.meta.url
    ),
    "utf8"
  );

const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );

describe(
  "keyword production authority V2",
  () => {
    it(
      "uses selected Keyword Decision winner as production authority",
      () => {
        expect(seo).toContain(
          "KEYWORD_DECISION_PRODUCTION_AUTHORITY_V2"
        );

        expect(seo).toContain(
          "const canonicalProductionPrimaryCandidate ="
        );

        expect(seo).toContain(
          'keywordDecisionShadow.status ===\n      "SELECTED"'
        );

        expect(seo).toContain(
          "const primary =\n    canonicalProductionPrimaryCandidate ??"
        );
      }
    );

    it(
      "stops AUTO NO_GO before article generation",
      () => {
        expect(service).toContain(
          "BEST_OPPORTUNITY_NO_GO_EARLY_STOP_V2"
        );

        expect(service).toContain(
          "CONTENT_BEST_OPPORTUNITY_NO_ELIGIBLE_WINNER"
        );

        const gate =
          service.indexOf(
            "BEST_OPPORTUNITY_NO_GO_EARLY_STOP_V2"
          );

        const stage =
          service.indexOf(
            "STAGE 9N-B4"
          );

        expect(gate).toBeGreaterThan(-1);
        expect(stage).toBeGreaterThan(gate);
      }
    );

    it(
      "preserves exact keyword lock",
      () => {
        expect(service).toContain(
          "CONTENT_EXACT_KEYWORD_PRODUCTION_LOCK_V1"
        );

        expect(service).toContain(
          "assertExactKeywordDidNotDriftV1"
        );
      }
    );
  }
);
