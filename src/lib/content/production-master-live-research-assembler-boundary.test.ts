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


function source():
string {
  return readFileSync(
    join(
      process.cwd(),
      "src/lib/content/production-master-live-research-assembler.ts"
    ),
    "utf8"
  );
}


describe(
  "Production Master Live Research Assembler boundary",
  () => {
    it(
      "has no provider or persistence side effects",
      () => {
        const text =
          source();


        expect(
          text
        ).not.toMatch(
          /\bfetch\s*\(/
        );

        expect(
          text
        ).not.toMatch(
          /\bprisma\./
        );

        expect(
          text
        ).not.toMatch(
          /generateArticle\s*\(/
        );

        expect(
          text
        ).not.toMatch(
          /generateBrief\s*\(/
        );
      }
    );


    it(
      "does not silently default unavailable query metrics to zero",
      () => {
        const text =
          source();


        expect(
          text
        ).not.toMatch(
          /searchVolume\s*:\s*0\b/
        );

        expect(
          text
        ).not.toMatch(
          /gscImpressions\s*:\s*0\b/
        );

        expect(
          text
        ).not.toMatch(
          /gscClicks\s*:\s*0\b/
        );

        expect(
          text
        ).not.toMatch(
          /gscPosition\s*:\s*0\b/
        );

        expect(
          text
        ).not.toMatch(
          /cpc\s*:\s*0\b/
        );
      }
    );


    it(
      "routes only through the canonical source assembler",
      () => {
        const text =
          source();


        expect(
          text
        ).toContain(
          "buildProductionMasterArtifactsFromSources"
        );

        expect(
          text
        ).toContain(
          "assertProductionMasterSourceBundle"
        );
      }
    );


    it(
      "requires current live SERP identity and observed query evidence",
      () => {
        const text =
          source();


        expect(
          text
        ).toContain(
          "LIVE_ASSEMBLY_SERP_KEYWORD_MISMATCH"
        );

        expect(
          text
        ).toContain(
          "LIVE_ASSEMBLY_QUERY_NOT_OBSERVED"
        );

        expect(
          text
        ).toContain(
          "LIVE_ASSEMBLY_QUERY_METRIC_MISMATCH"
        );

        expect(
          text
        ).toContain(
          "LIVE_ASSEMBLY_PRIMARY_QUERY_SIGNAL_MISSING"
        );
      }
    );
  }
);
