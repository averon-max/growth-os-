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


function generation():
string {
  const source =
    readFileSync(
      join(
        process.cwd(),
        "src/lib/content/service.ts"
      ),
      "utf8"
    );


  const start =
    source.indexOf(
      "export async function generateArticleFromBrief("
    );


  const end =
    source.indexOf(
      "export async function approveArticle(",
      start
    );


  if (
    start <
      0 ||
    end <
      0
  ) {
    throw new Error(
      "Could not isolate generateArticleFromBrief."
    );
  }


  return source.slice(
    start,
    end
  );
}


describe(
  "Production Competitive SERP Replay V2",
  () => {
    it(
      "has one production orchestration call and no direct replay call",
      () => {
        const source =
          generation();


        expect(
          source.match(
            /await executeCompetitiveSerpReplayRepairV2\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );


        expect(
          source
        ).not.toContain(
          "await executeSerpReplayV1({"
        );
      }
    );


    it(
      "passes exact persisted runtime and accepted writer run",
      () => {
        const source =
          generation();


        expect(
          source
        ).toMatch(
          /executeCompetitiveSerpReplayRepairV2\(\{[\s\S]*contract:\s*articleGenerationContract,[\s\S]*runtime:\s*masterRuntimeInspection[\s\S]*\.runtime,[\s\S]*run:\s*acceptedMasterWriterRun,[\s\S]*context:\s*masterCriticContext/
        );
      }
    );


    it(
      "prevents repair of sections already repaired by final critics",
      () => {
        const source =
          generation();


        expect(
          source
        ).toContain(
          "alreadyRepairedSectionIndexes:"
        );


        expect(
          source
        ).toContain(
          "masterCriticRepairExecution"
        );
      }
    );


    it(
      "projects only the final accepted writer run",
      () => {
        const source =
          generation();


        const execution =
          source.indexOf(
            "await executeCompetitiveSerpReplayRepairV2({"
          );


        const replaceRun =
          source.indexOf(
            "acceptedMasterWriterRun =",
            execution
          );


        const projection =
          source.indexOf(
            "const generated = {",
            execution
          );


        expect(
          execution
        ).toBeGreaterThanOrEqual(
          0
        );


        expect(
          replaceRun
        ).toBeGreaterThan(
          execution
        );


        expect(
          projection
        ).toBeGreaterThan(
          replaceRun
        );
      }
    );


    it(
      "persists only the final replay against final article fingerprint",
      () => {
        const source =
          generation();


        expect(
          source.match(
            /await createSerpReplayArtifactV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );


        expect(
          source
        ).toMatch(
          /createSerpReplayArtifactV1\(\{[\s\S]*article:\s*acceptedMasterWriterRun\s*\.article,[\s\S]*replay:\s*masterSerpReplay/
        );
      }
    );


    it(
      "does not contain whole article competitive rewrite",
      () => {
        const executor =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/competitive-serp-replay-execution-v2.ts"
            ),
            "utf8"
          );


        expect(
          executor
        ).not.toContain(
          "rewriteArticle("
        );


        expect(
          executor
        ).not.toContain(
          "generateArticle("
        );


        /*
         * service.ts still retains the disabled legacy review
         * implementation for compatibility, but Competitive Replay
         * must never enable that path.
         */
        const source =
          generation();


        expect(
          source
        ).toContain(
          "const allowLegacyWholeArticleRewrite ="
        );

        expect(
          source
        ).toContain(
          "false as const"
        );
      }
    );
  }
);
