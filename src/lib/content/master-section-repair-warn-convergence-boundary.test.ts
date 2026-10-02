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
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "semantic repair WARN convergence boundary",
  () => {
    it(
      "continues deterministic repair only while semantic status is BLOCK",
      () => {
        expect(
          source
        ).toContain(
          "SEMANTIC_WARN_CONVERGENCE_TERMINAL_V1"
        );

        expect(
          source
        ).toMatch(
          /finalSemantic\.status\s*!==\s*"BLOCK"/u
        );
      }
    );


    it(
      "does not retain the old PASS-only loop exit",
      () => {
        expect(
          source
        ).not.toMatch(
          /finalSemantic\.status\s*===\s*"PASS"\s*\)\s*\{\s*break;/u
        );
      }
    );
  }
);
