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
            "const acceptedMasterWriterRun ="
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
      "keeps repair/replay inside the existing rejection transaction before DRAFT",
      () => {
        const service =
          generationFunctionSource();


        const repairReplay =
          service.indexOf(
            "await executeMasterArticleCriticRepairReplayV1({"
          );

        const draft =
          service.lastIndexOf(
            '"DRAFT"'
          );

        const catchIndex =
          service.lastIndexOf(
            "} catch (error) {"
          );

        const rejected =
          service.lastIndexOf(
            '"REJECTED"'
          );


        expect(
          repairReplay
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          draft
        ).toBeGreaterThan(
          repairReplay
        );

        expect(
          catchIndex
        ).toBeGreaterThan(
          repairReplay
        );

        expect(
          rejected
        ).toBeGreaterThan(
          catchIndex
        );
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
      "does not re-enable legacy one-shot or whole-article rewrite",
      () => {
        const service =
          generationFunctionSource();


        expect(
          service
        ).not.toMatch(
          /generator\.generateArticle\s*\(/
        );


        expect(
          service
        ).toMatch(
          /allowLegacyWholeArticleRewrite\s*=\s*false/
        );


        expect(
          service
        ).toMatch(
          /allowLegacyWholeArticleRewrite\s*&&\s*\([\s\S]*shouldRewriteArticle/
        );


        expect(
          service
        ).not.toMatch(
          /allowLegacyWholeArticleRewrite\s*&&\s*shouldRewriteArticle\s*\(/
        );
      }
    );
  }
);
