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
      "./production-master-source-assembler.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Production Master Source Assembler boundary",
  () => {
    it(
      "delegates artifact construction to canonical Stage 1-8 builders",
      () => {
        expect(
          source
        ).toContain(
          "buildProductionMasterArtifacts("
        );
      }
    );


    it(
      "does not reconstruct runtime from legacy planning artifacts",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bfinalPlan\b/
        );


        expect(
          source
        ).not.toMatch(
          /\bsearchBlueprintShadow\b/
        );
      }
    );


    it(
      "does not contain synthetic metric defaults",
      () => {
        expect(
          source
        ).not.toMatch(
          /searchVolume\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /gscImpressions\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /gscClicks\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /gscPosition\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /cpc\s*:\s*0/
        );
      }
    );


    it(
      "does not perform network or database IO",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bfetch\s*\(/
        );


        expect(
          source
        ).not.toMatch(
          /\bprisma\./
        );


        expect(
          source
        ).not.toMatch(
          /api\.dataforseo\.com/
        );
      }
    );
  }
);
