import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";


function source(
  file:
    string
): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      file
    ),
    "utf8"
  );
}


describe(
  "Canonical observed query registry boundary",
  () => {
    it(
      "is used by the live assembler",
      () => {
        const assembler =
          source(
            "src/lib/content/production-master-live-research-assembler.ts"
          );


        expect(
          assembler
        ).toContain(
          "collectCanonicalObservedQueryEvidence"
        );


        expect(
          assembler
        ).toContain(
          "CANONICAL_OBSERVED_QUERY_REGISTRY_V1"
        );
      }
    );


    it(
      "is used by ranking inputs",
      () => {
        const ranking =
          source(
            "src/lib/content/production-ranking-inputs.ts"
          );


        expect(
          ranking
        ).toContain(
          "buildCanonicalObservedQueryRegistry"
        );


        expect(
          ranking
        ).not.toContain(
          'key ===\n            "query"'
        );
      }
    );
  }
);
