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
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "production primary live research authority V1",
  () => {
    it(
      "runs live master research on the selected strategy primary instead of the raw topic seed",
      () => {
        const start =
          source.indexOf(
            "await planProductionMasterArtifactsFromLiveSources({"
          );

        const end =
          source.indexOf(
            "const effectiveSearchMission =",
            start
          );

        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );


        const window =
          source.slice(
            start,
            end
          );


        expect(
          window
        ).toContain(
          "PRODUCTION_PRIMARY_LIVE_RESEARCH_AUTHORITY_V1"
        );

        expect(
          window
        ).toMatch(
          /keyword:\s*strategy\.primary\.keyword/
        );

        expect(
          window
        ).not.toMatch(
          /keyword:\s*input\.topic/
        );
      }
    );
  }
);
