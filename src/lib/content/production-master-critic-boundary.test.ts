import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function source(
  name:
    string
): string {
  return readFileSync(
    new URL(
      name,
      import.meta.url
    ),
    "utf8"
  );
}


function generationFunctionSource():
string {
  const service =
    source(
      "./service.ts"
    );

  const start =
    service.indexOf(
      "export async function generateArticleFromBrief("
    );

  const end =
    service.indexOf(
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


  return service.slice(
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
  "Production Master Article Critic + Repair Boundary",
  () => {
    it(
      "runs Master Writer, initial critics and repair/replay exactly once",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service.match(
            /await executeMasterWriterV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );


        expect(
          service.match(
            /await executeMasterArticleCriticsV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );


        expect(
          service.match(
            /await executeMasterArticleCriticRepairReplayV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "builds critic context from the validated persisted runtime",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service
        ).toMatch(
          /buildMasterArticleSemanticCriticContextV1\([\s\S]*masterRuntimeInspection[\s\S]*\.runtime[\s\S]*\)/
        );


        expect(
          service
        ).not.toMatch(
          /originalityReferences\s*:\s*\[/
        );


        expect(
          service
        ).not.toMatch(
          /cannibalizationCandidates\s*:\s*\[/
        );
      }
    );


    it(
      "orders writer -> context -> initial critics -> repair/replay -> accepted article",
      () => {
        const service =
          generationFunctionSource();


        const writer =
          service.indexOf(
            "await executeMasterWriterV1({"
          );

        const context =
          service.indexOf(
            "buildMasterArticleSemanticCriticContextV1("
          );

        const initialCritics =
          service.indexOf(
            "await executeMasterArticleCriticsV1({"
          );

        const repairReplay =
          service.indexOf(
            "await executeMasterArticleCriticRepairReplayV1({"
          );

        const acceptedRun =
          service.indexOf(
            "let acceptedMasterWriterRun ="
          );

        const generated =
          service.indexOf(
            "const generated = {"
          );


        expect(
          writer
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          context
        ).toBeGreaterThan(
          writer
        );

        expect(
          initialCritics
        ).toBeGreaterThan(
          context
        );

        expect(
          repairReplay
        ).toBeGreaterThan(
          initialCritics
        );

        expect(
          acceptedRun
        ).toBeGreaterThan(
          repairReplay
        );

        expect(
          generated
        ).toBeGreaterThan(
          acceptedRun
        );
      }
    );


    it(
      "does not assert the initial critic result directly in service",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service
        ).not.toContain(
          "assertMasterArticleCriticExecutionPassed("
        );


        const engine =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          engine
        ).toContain(
          "assertMasterArticleCriticExecutionPassed("
        );


        expect(
          engine
        ).toMatch(
          /const finalCritics[\s\S]*await executeMasterArticleCriticsV1\(\{[\s\S]*assertMasterArticleCriticExecutionPassed\(\s*finalCritics/
        );
      }
    );


    it(
      "projects the article from the post-replay accepted MasterWriterRun",
      () => {
        const service =
          generationFunctionSource();

        const generatedStart =
          service.indexOf(
            "const generated = {"
          );

        const generatedEnd =
          service.indexOf(
            "\n    };",
            generatedStart
          );


        const generatedBlock =
          service.slice(
            generatedStart,
            generatedEnd
          );


        expect(
          generatedBlock
        ).toContain(
          "acceptedMasterWriterRun"
        );


        expect(
          generatedBlock
        ).not.toContain(
          "masterWriterRun\n"
        );
      }
    );


    it(
      "forbids flattened article mutation after final critic replay",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service
        ).not.toContain(
          "repairGeneratedArticle("
        );


        expect(
          service
        ).toMatch(
          /const repaired\s*=\s*reviewedArticle;/
        );
      }
    );


    it(
      "keeps critic repair/replay inside the rejection transaction and before Final Readiness / IN_REVIEW",
      () => {
        const service = generationFunctionSource();

        const repairReplay = service.indexOf(
          "await executeMasterArticleCriticRepairReplayV1({"
        );
        const readiness = service.indexOf(
          "FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1"
        );
        const catchIndex = service.lastIndexOf("} catch (error) {");
        const rejected = service.lastIndexOf('"REJECTED"');

        expect(repairReplay).toBeGreaterThanOrEqual(0);
        expect(readiness).toBeGreaterThan(repairReplay);
        expect(service.lastIndexOf('"IN_REVIEW"')).toBeGreaterThan(readiness);
        expect(catchIndex).toBeGreaterThan(repairReplay);
        expect(rejected).toBeGreaterThan(catchIndex);

        expect(
          inOrder(service, [
            "await executeMasterWriterV1({",
            "await executeMasterArticleCriticsV1({",
            "await executeMasterArticleCriticRepairReplayV1({",
            "FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1",
          ])
        ).toBe(true);
      }
    );


    it(
      "order helper rejects an inverted lifecycle (mutation sanity)",
      () => {
        expect(inOrder("A B", ["A", "B"])).toBe(true);
        expect(inOrder("B A", ["A", "B"])).toBe(false);
      }
    );


    it(
      "does not derive URL ownership late or synthesize critic context",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service
        ).not.toContain(
          "evaluateUrlOwnership("
        );


        expect(
          service
        ).not.toMatch(
          /originalityReferences\s*:\s*\[/
        );


        expect(
          service
        ).not.toMatch(
          /cannibalizationCandidates\s*:\s*\[/
        );
      }
    );


    it(
      "contains no executable legacy one-shot or whole-article rewrite after the Master Writer",
      () => {
        const service = stripComments(generationFunctionSource());
        const writer = service.indexOf("await executeMasterWriterV1({");

        expect(writer).toBeGreaterThanOrEqual(0);
        expect(service).not.toMatch(/generator\.generateArticle\s*\(/);
        expect(service.slice(writer)).not.toContain("rewriteArticle(");
        expect(service).not.toContain("allowLegacyWholeArticleRewrite");
      }
    );
  }
);
