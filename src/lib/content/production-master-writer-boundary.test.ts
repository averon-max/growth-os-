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
      "contains no executable whole-article rewrite that can mutate master output",
      () => {
        const source = stripComments(generationFunctionSource());
        const writer = source.indexOf("executeMasterWriterV1({");

        expect(writer).toBeGreaterThanOrEqual(0);
        expect(source.slice(writer)).not.toContain("rewriteArticle(");
        expect(source).not.toContain("allowLegacyWholeArticleRewrite");
      }
    );
  }
);
