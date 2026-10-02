import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function generationFunctionSource():
string {
  const source =
    readFileSync(
      new URL(
        "./service.ts",
        import.meta.url
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
    start < 0 ||
    end < 0
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
  "Production SERP Replay boundary",
  () => {
    it(
      "executes Competitive SERP Replay orchestration exactly once",
      () => {
        const source =
          generationFunctionSource();


        expect(
          source.match(
            /await executeCompetitiveSerpReplayRepairV2\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "runs after final critic repair/replay acceptance and before article projection",
      () => {
        const source =
          generationFunctionSource();


        const writer =
          source.indexOf(
            "await executeMasterWriterV1({"
          );

        const initialCritics =
          source.indexOf(
            "await executeMasterArticleCriticsV1({"
          );

        const criticRepairReplay =
          source.indexOf(
            "await executeMasterArticleCriticRepairReplayV1({"
          );

        const acceptedRun =
          source.indexOf(
            "let acceptedMasterWriterRun ="
          );

        const serpReplay =
          source.indexOf(
            "await executeCompetitiveSerpReplayRepairV2({"
          );

        const generated =
          source.indexOf(
            "const generated = {"
          );


        expect(
          writer
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          initialCritics
        ).toBeGreaterThan(
          writer
        );

        expect(
          criticRepairReplay
        ).toBeGreaterThan(
          initialCritics
        );

        expect(
          acceptedRun
        ).toBeGreaterThan(
          criticRepairReplay
        );

        expect(
          serpReplay
        ).toBeGreaterThan(
          acceptedRun
        );

        expect(
          generated
        ).toBeGreaterThan(
          serpReplay
        );
      }
    );


    it(
      "uses the effective persisted runtime and the accepted post-critic writer run",
      () => {
        const source = generationFunctionSource();
        const at = source.indexOf(
          "await executeCompetitiveSerpReplayRepairV2({"
        );

        expect(at).toBeGreaterThanOrEqual(0);

        const call = source.slice(at, at + 1800);

        expect(call).toMatch(/runtime:\s*effectiveMasterRuntime\b/);
        expect(call).toMatch(/run:\s*acceptedMasterWriterRun\b/);
        expect(call).toMatch(/siteDomain:\s*serpReplaySiteDomain\b/);
      }
    );


    it(
      "derives own-site exclusion from the real website URL without guessing",
      () => {
        const source =
          generationFunctionSource();


        expect(
          source
        ).toMatch(
          /new URL\(\s*brief\.website\.url\s*\)\.hostname/
        );


        expect(
          source
        ).toContain(
          "serpReplaySiteDomain =\n        null"
        );
      }
    );


    it(
      "keeps READY WARN BLOCK and INSUFFICIENT_CONTEXT diagnostic",
      () => {
        const source =
          generationFunctionSource();


        expect(
          source
        ).not.toMatch(
          /masterSerpReplay(?:\?)?\.status\s*===/
        );


        expect(
          source
        ).not.toMatch(
          /masterSerpReplay(?:\?)?\.status\s*!==/
        );


        expect(
          source
        ).not.toMatch(
          /masterSerpReplay[\s\S]{0,180}status:\s*"REJECTED"/
        );


        expect(
          source
        ).not.toMatch(
          /masterSerpReplay[\s\S]{0,180}status:\s*"IN_REVIEW"/
        );
      }
    );


    it(
      "does not mutate or regenerate article content from SERP Replay",
      () => {
        const source =
          generationFunctionSource();

        const start =
          source.indexOf(
            "let masterSerpReplay:"
          );

        const end =
          source.indexOf(
            "const generated = {",
            start
          );


        const replayArea =
          source.slice(
            start,
            end
          );


        expect(
          replayArea
        ).not.toContain(
          "rewriteArticle("
        );

        expect(
          replayArea
        ).not.toContain(
          "repairSection("
        );

        expect(
          replayArea
        ).not.toContain(
          "generateSection("
        );

        expect(
          replayArea
        ).not.toContain(
          "generateArticle("
        );
      }
    );


    it(
      "does not add a ranking score probability or winner",
      () => {
        const source =
          generationFunctionSource();

        const start =
          source.indexOf(
            "let masterSerpReplay:"
          );

        const end =
          source.indexOf(
            "const generated = {",
            start
          );


        const replayArea =
          source.slice(
            start,
            end
          );


        expect(
          replayArea
        ).not.toContain(
          "rankingScore:"
        );

        expect(
          replayArea
        ).not.toContain(
          "rankingProbability:"
        );

        expect(
          replayArea
        ).not.toContain(
          "chanceToRank"
        );

        expect(
          replayArea
        ).not.toContain(
          "winner:"
        );
      }
    );


    it(
      "does not turn a replay provider/parser failure into fabricated READY",
      () => {
        const source =
          generationFunctionSource();


        expect(
          source
        ).toContain(
          '[content serp replay] diagnostic unavailable'
        );


        expect(
          source
        ).toContain(
          "masterSerpReplayWarning"
        );


        expect(
          source
        ).not.toMatch(
          /catch[\s\S]{0,500}masterSerpReplay\s*=\s*[\s\S]{0,200}status:\s*"READY"/
        );
      }
    );


    it(
      "keeps downstream article projection bound to the accepted MasterWriterRun",
      () => {
        const source =
          generationFunctionSource();

        const generatedStart =
          source.indexOf(
            "const generated = {"
          );

        const generatedEnd =
          source.indexOf(
            "\n    };",
            generatedStart
          );

        const generated =
          source.slice(
            generatedStart,
            generatedEnd
          );


        expect(
          generated
        ).toContain(
          "acceptedMasterWriterRun"
        );


        expect(
          generated
        ).not.toContain(
          "masterSerpReplay"
        );
      }
    );


    it(
      "completes critics and replay before Final Readiness and IN_REVIEW persistence",
      () => {
        const source = generationFunctionSource();
        const readiness = source.indexOf(
          "FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1"
        );

        expect(readiness).toBeGreaterThanOrEqual(0);

        expect(
          inOrder(source, [
            "await executeMasterWriterV1({",
            "await executeMasterArticleCriticsV1({",
            "await executeMasterArticleCriticRepairReplayV1({",
            "await executeCompetitiveSerpReplayRepairV2({",
            "FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1",
          ])
        ).toBe(true);

        expect(source.lastIndexOf("IN_REVIEW")).toBeGreaterThan(readiness);
      }
    );


    it(
      "order helper rejects an inverted lifecycle (mutation sanity)",
      () => {
        expect(inOrder("A B", ["A", "B"])).toBe(true);
        expect(inOrder("B A", ["A", "B"])).toBe(false);
        expect(inOrder("A", ["A", "B"])).toBe(false);
      }
    );
  }
);
