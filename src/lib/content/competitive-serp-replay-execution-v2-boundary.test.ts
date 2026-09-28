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


const source =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/competitive-serp-replay-execution-v2.ts"
    ),
    "utf8"
  );


describe(
  "Competitive SERP Replay Execution V2 boundary",
  () => {
    it(
      "uses deterministic repair planning",
      () => {
        expect(
          source
        ).toContain(
          "buildCompetitiveReplayRepairPlanV2({"
        );
      }
    );


    it(
      "executes at most initial and final SERP replay",
      () => {
        expect(
          source.match(
            /await executeSerpReplayV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          2
        );
      }
    );


    it(
      "repairs sections only",
      () => {
        expect(
          source
        ).toContain(
          ".repairSection({"
        );

        expect(
          source
        ).not.toContain(
          "rewriteArticle("
        );

        expect(
          source
        ).not.toContain(
          "generateArticle("
        );
      }
    );


    it(
      "forbids a second repair",
      () => {
        expect(
          source
        ).toContain(
          "COMPETITIVE_REPLAY_SECOND_REPAIR_FORBIDDEN"
        );

        expect(
          source
        ).toContain(
          "repairSuppressedByPriorRepair"
        );
      }
    );


    it(
      "re-verifies section semantics after repair",
      () => {
        expect(
          source
        ).toContain(
          "verifyAndRepairGeneratedSectionV1({"
        );
      }
    );


    it(
      "replays all article critics after content mutation",
      () => {
        expect(
          source
        ).toContain(
          "await executeMasterArticleCriticsV1({"
        );

        expect(
          source
        ).toContain(
          "assertMasterArticleCriticExecutionPassed("
        );
      }
    );


    it(
      "never persists replay artifacts itself",
      () => {
        expect(
          source
        ).not.toContain(
          "createSerpReplayArtifactV1("
        );

        expect(
          source
        ).not.toContain(
          "prisma."
        );
      }
    );
  }
);
