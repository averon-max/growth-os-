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



function stripComments(
  value: string
): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}


function inOrder(
  source: string,
  markers: readonly string[]
): boolean {
  let at = -1;

  for (const marker of markers) {
    const next = source.indexOf(marker, at + 1);

    if (next < 0) {
      return false;
    }

    at = next;
  }

  return true;
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
      "passes the effective persisted runtime and accepted writer run",
      () => {
        const source = generation();
        const at = source.indexOf(
          "await executeCompetitiveSerpReplayRepairV2({"
        );

        expect(at).toBeGreaterThanOrEqual(0);

        const call = source.slice(at, at + 1800);

        expect(call).toMatch(/contract:\s*articleGenerationContract\b/);
        expect(call).toMatch(/runtime:\s*effectiveMasterRuntime\b/);
        expect(call).toMatch(/run:\s*acceptedMasterWriterRun\b/);
        expect(call).toMatch(/context:\s*masterCriticContext\b/);

        expect(source.slice(at, at + 4000)).toMatch(
          /acceptedMasterWriterRun\s*=\s*[\s\S]{0,60}competitiveReplayExecution\s*\.run/
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
      "contains no executable whole-article rewrite after the Master Writer",
      () => {
        const executor = readFileSync(
          join(
            process.cwd(),
            "src/lib/content/competitive-serp-replay-execution-v2.ts"
          ),
          "utf8"
        );

        expect(executor).not.toContain("rewriteArticle(");
        expect(executor).not.toContain("generateArticle(");

        const source = stripComments(generation());
        const writer = source.indexOf("await executeMasterWriterV1({");

        expect(writer).toBeGreaterThanOrEqual(0);
        expect(source.slice(writer)).not.toContain("rewriteArticle(");
        expect(source).not.toContain("allowLegacyWholeArticleRewrite");
      }
    );
  }
);
