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
      "PRODUCTION_MASTER_WRITER_TEST_BOUNDARY_NOT_FOUND"
    );
  }

  return source.slice(
    start,
    end
  );
}


describe(
  "Production Master Writer Boundary",
  () => {
    it(
      "requires the persisted production master runtime before generation",
      () => {
        const source =
          generationFunctionSource();

        expect(
          source
        ).toContain(
          "inspectProductionMasterRuntimePlan("
        );

        expect(
          source
        ).toContain(
          "PRODUCTION_MASTER_RUNTIME_BLOCKED"
        );

        expect(
          source
        ).toContain(
          "inspectMasterRuntimeSnapshot("
        );
      }
    );


    it(
      "builds the writer contract from validated persisted master runtime",
      () => {
        const source =
          generationFunctionSource();

        expect(
          source
        ).toContain(
          "buildArticleGenerationContractV1("
        );

        expect(
          source
        ).toContain(
          "masterRuntimeInspection"
        );

        expect(
          source
        ).toContain(
          ".runtime"
        );
      }
    );


    it(
      "uses executeMasterWriterV1 as the production article generator",
      () => {
        const source =
          generationFunctionSource();

        expect(
          source
        ).toContain(
          "executeMasterWriterV1({"
        );

        expect(
          source
        ).toContain(
          "articleGenerationContract"
        );
      }
    );


    it(
      "contains no legacy one-shot generateArticle fallback",
      () => {
        const source =
          generationFunctionSource();

        expect(
          source
        ).not.toContain(
          "generator.generateArticle("
        );

        expect(
          source
        ).not.toMatch(
          /generateArticle\s*\(\s*\{/
        );
      }
    );


    it(
      "does not allow legacy whole-article rewrite to mutate master output",
      () => {
        const source =
          generationFunctionSource();

        expect(
          source
        ).toMatch(
          /allowLegacyWholeArticleRewrite\s*=\s*false/
        );

        expect(
          source
        ).toMatch(
          /allowLegacyWholeArticleRewrite\s*&&\s*\(\s*shouldRewriteArticle\s*\(/
        );
      }
    );
  }
);
