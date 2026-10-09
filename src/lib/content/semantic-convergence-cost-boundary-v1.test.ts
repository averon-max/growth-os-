import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


describe(
  "semantic convergence cost boundary V1",
  () => {
    it(
      "allows at most one deterministic semantic mutation pass",
      () => {
        const source =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/master-section-repair.ts"
            ),
            "utf8"
          );


        expect(
          source
        ).toContain(
          "SEMANTIC_CONVERGENCE_SINGLE_MUTATION_V1"
        );


        expect(
          source
        ).toMatch(
          /MAX_DETERMINISTIC_SEMANTIC_PASSES\s*=\s*4;/
        );



}
    );


    it(
      "explicitly tags the semantic verifier continuation request",
      () => {
        const source =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/gemini-generator.ts"
            ),
            "utf8"
          );


        expect(
          source
        ).toContain(
          "CONTENT_SEMANTIC_CONTINUATION_TELEMETRY_V1"
        );


        expect(
          source
        ).toContain(
          "runWithContentProviderDispatchMetaV1"
        );


        expect(
          source
        ).toMatch(
          /continuation:\s*true/
        );
      }
    );
  }
);
