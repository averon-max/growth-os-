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


function createBriefSource():
  string {
  const start =
    source.indexOf(
      "export async function createContentBrief("
    );

  const end =
    source.indexOf(
      "export async function generateArticleFromBrief("
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

  return source.slice(
    start,
    end
  );
}


describe(
  "Production Master live brief wiring boundary",
  () => {
    it(
      "runs the live Stage 1-8 planner before production runtime preparation",
      () => {
        const fn =
          createBriefSource();

        const planner =
          fn.indexOf(
            "await planProductionMasterArtifactsFromLiveSources({"
          );

        const prepare =
          fn.indexOf(
            "prepareProductionMasterBriefRuntime({"
          );

        const guard =
          fn.indexOf(
            "assertProductionMasterBriefReady("
          );

        expect(
          planner
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          planner
        ).toBeLessThan(
          prepare
        );

        expect(
          prepare
        ).toBeLessThan(
          guard
        );
      }
    );


    it(
      "feeds live artifacts and the planner SearchMission into the runtime boundary",
      () => {
        const fn =
          createBriefSource();

        expect(
          fn
        ).toContain(
          "liveMaster\n      ?.masterArtifacts"
        );

        expect(
          fn
        ).toContain(
          "liveMaster\n      ?.searchMissionInput"
        );

        expect(
          fn
        ).toContain(
          "masterArtifacts:\n        effectiveMasterArtifacts"
        );

        expect(
          fn
        ).toContain(
          "searchMissionInput:\n        effectiveSearchMission"
        );
      }
    );


    it(
      "does not synthesize an implicit SearchMission when production live planning is required",
      () => {
        const fn =
          createBriefSource();

        expect(
          fn
        ).toContain(
          "LIVE_STAGE_PLAN_SEARCH_MISSION_REQUIRED"
        );

        expect(
          fn
        ).toContain(
          "parseOptionalExplicitSearchMissionInput("
        );
      }
    );


    it(
      "does not re-enable the legacy one-shot article writer",
      () => {
        const fn =
          createBriefSource();

        expect(
          fn
        ).not.toMatch(
          /generator\.generateArticle\s*\(/
        );
      }
    );
  }
);
