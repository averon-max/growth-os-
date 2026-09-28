import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function generation():
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


describe(
  "Production SERP Replay persistence boundary",
  () => {
    it(
      "persists exactly one successful artifact call site",
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
      }
    );


    it(
      "persists exactly one failed-attempt artifact call site",
      () => {
        const source =
          generation();


        expect(
          source.match(
            /await createSerpReplayFailureArtifactV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "binds successful artifact to pending ContentArticle and accepted article version",
      () => {
        const source =
          generation();


        expect(
          source
        ).toMatch(
          /createSerpReplayArtifactV1\(\{[\s\S]*contentArticleId:\s*pendingArticle\.id,[\s\S]*article:\s*acceptedMasterWriterRun\s*\.article,[\s\S]*replay:\s*masterSerpReplay/
        );
      }
    );


    it(
      "persists replay after execution and before downstream article projection",
      () => {
        const source =
          generation();

        const replay =
          source.indexOf(
            "await executeCompetitiveSerpReplayRepairV2({"
          );

        const persist =
          source.indexOf(
            "await createSerpReplayArtifactV1({"
          );

        const generated =
          source.indexOf(
            "const generated = {"
          );


        expect(
          replay
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          persist
        ).toBeGreaterThan(
          replay
        );

        expect(
          generated
        ).toBeGreaterThan(
          persist
        );
      }
    );


    it(
      "does not use replay status as ContentArticle control flow",
      () => {
        const source =
          generation();


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
      }
    );


    it(
      "does not mutate article content during artifact persistence",
      () => {
        const source =
          generation();

        const start =
          source.indexOf(
            "await executeCompetitiveSerpReplayRepairV2({"
          );

        const end =
          source.indexOf(
            "const generated = {",
            start
          );

        const area =
          source.slice(
            start,
            end
          );


        expect(
          area
        ).not.toContain(
          "rewriteArticle("
        );

        expect(
          area
        ).not.toContain(
          "repairSection("
        );

        expect(
          area
        ).not.toContain(
          "generateSection("
        );
      }
    );
  }
);
