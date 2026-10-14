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


describe(
  "Master Article Critic Repair Execution V1",
  () => {
    it(
      "reuses the existing SectionRepairInputV1 instead of introducing a second writer API",
      () => {
        const repairSource =
          source(
            "./master-section-repair.ts"
          );


        expect(
          repairSource
        ).toContain(
          "criticFindings?:"
        );


        expect(
          repairSource
        ).toContain(
          "MasterArticleCriticFindingV1"
        );
      }
    );


    it(
      "passes validated critic findings into the existing section repair prompt",
      () => {
        const promptSource =
          source(
            "./master-section-repair-prompt.ts"
          );


        expect(
          promptSource
        ).toContain(
          "FINAL ARTICLE CRITIC FINDINGS FOR THIS SECTION"
        );


        expect(
          promptSource
        ).toContain(
          "Critic findings are repair instructions, NOT new factual authority."
        );


        expect(
          promptSource
        ).toContain(
          "...criticFindingsBlock"
        );
      }
    );


    it(
      "classifies upstream blockers before any repair capability or model call",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        const plan =
          execution.indexOf(
            "buildMasterArticleCriticRepairPlanV1({"
          );

        const assertion =
          execution.indexOf(
            "assertMasterArticleCriticRepairPlanExecutableV1("
          );

        const capability =
          execution.indexOf(
            "supportsMasterSectionRepairGenerator("
          );

        const repair =
          execution.indexOf(
            ".repairSection({"
          );


        expect(
          plan
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          assertion
        ).toBeGreaterThan(
          plan
        );

        expect(
          capability
        ).toBeGreaterThan(
          assertion
        );

        expect(
          repair
        ).toBeGreaterThan(
          capability
        );
      }
    );


    it(
      "uses verification-only validation after the critic-owned repair",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          execution
        ).toContain(
          "MASTER_CRITIC_SINGLE_REPAIR_CYCLE_V1"
        );


        expect(
          execution
        ).toContain(
          "verifyGeneratedSectionOnlyV1({"
        );


        expect(
          execution
        ).toMatch(
          /verifyGeneratedSectionOnlyV1\(\{[\s\S]*generator:\s*repairGenerator/
        );


        expect(
          execution
        ).toContain(
          "MASTER_CRITIC_SINGLE_MODEL_OWNER_V1"
        );
      }
    );

    it(
      "reuses canonical structural reconciliation and semantic verification after critic repair",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          execution
        ).toContain(
          "verifyGeneratedSectionOnlyV1({"
        );


        expect(
          execution
        ).toMatch(
          /verified\s*\.reconciliation/
        );


        expect(
          execution
        ).toMatch(
          /verified\s*\.semanticVerification/
        );
      }
    );

    it(
      "recomposes with the original article shell and repaired approved sections",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          execution
        ).toMatch(
          /composeMasterArticleV1\(\{[\s\S]*contract,[\s\S]*shell:\s*run\.shell,[\s\S]*sections:\s*frozenSections/
        );


        expect(
          execution
        ).not.toContain(
          "generateArticleShell("
        );
      }
    );


    it(
      "re-runs the complete nine-critic execution after repair",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        const repair =
          execution.indexOf(
            ".repairSection({"
          );

        const replay =
          execution.lastIndexOf(
            "await executeMasterArticleCriticsV1({"
          );

        const finalAssert =
          execution.lastIndexOf(
            "assertMasterArticleCriticExecutionPassed("
          );


        expect(
          replay
        ).toBeGreaterThan(
          repair
        );

        expect(
          finalAssert
        ).toBeGreaterThan(
          replay
        );
      }
    );


    it(
      "contains no recursive critic repair loop or whole-article rewrite",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          execution
        ).not.toContain(
          "rewriteArticle("
        );


        expect(
          execution
        ).not.toContain(
          "generateArticle("
        );


        expect(
          execution.match(
            /executeMasterArticleCriticRepairReplayV1\(/g
          ) ??
          []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "keeps critic repair audit separate from original 9I-F writer repair provenance",
      () => {
        const execution =
          source(
            "./master-article-critic-repair-execution.ts"
          );


        expect(
          execution
        ).toContain(
          "MASTER_ARTICLE_CRITIC_SECTION_REPAIR_AUDIT_V1"
        );


        expect(
          execution
        ).toContain(
          "wholeArticleRewriteCount:"
        );


        expect(
          execution
        ).toContain(
          "repairs:\n      Object.freeze(["
        );
      }
    );
  }
);

describe("optional coverage self-healing production wiring", () => {
  it("does not erase a rejected article on retry", () => {
    const service=source("./service.ts");
    const beginning=service.indexOf("const pendingArticle =");
    const createStart=service.indexOf(": await prisma.contentArticle.create({",beginning);
    const ending=service.indexOf("try {",createStart);
    expect(beginning).toBeGreaterThanOrEqual(0);
    expect(createStart).toBeGreaterThan(beginning);
    expect(ending).toBeGreaterThan(createStart);

    // Reusing a rejected article MUST preserve its existing paid-for body.
    const retry=service.slice(beginning,createStart);
    expect(retry).toContain("prisma.contentArticle.update({");
    expect(retry).not.toMatch(/bodyMarkdown:\s*""/);
    expect(retry).not.toMatch(/title:\s*""/);
    expect(retry).toMatch(/status:\s*"GENERATING"/);

    // A genuinely NEW article starts empty, as it should.
    const fresh=service.slice(createStart,ending);
    expect(fresh).toContain("prisma.contentArticle.create({");
    expect(fresh).toMatch(/bodyMarkdown:\s*""/);
  });

  it("preserves an accepted article when optional coverage repair cannot pass", () => {
    const service=source("./service.ts");
    expect(service).toContain("OPTIONAL_KEYWORD_COVERAGE_RECOVERY_V1");
    expect(service).toContain('masterCriticExecution.suite.status !== "BLOCK"');
    expect(service).toContain("run: masterWriterRun");
    expect(service).toContain("finalCritics: masterCriticExecution");
  });

  it("rolls back an unsafe optional keyword-only edit to the already accepted article", () => {
    const repair=source("./master-article-critic-repair-execution.ts");
    const start=repair.indexOf("if (optionalKeywordRepair) {");
    const end=repair.indexOf("const residualPlan =",start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const optional=repair.slice(start,end);
    expect(optional).toContain("OPTIONAL_KEYWORD_REPAIR_DID_NOT_IMPROVE_SAFELY");
    expect(optional).toContain('finalCritics.suite.status === "BLOCK"');
    expect(optional).toContain("missingCount(finalCritics) >= missingCount(initialCritics)");
    expect(optional).toContain("assertMasterArticleCriticExecutionPassed(initialCritics)");
    expect(optional).toContain("run,");
    expect(optional).toContain("finalCritics: initialCritics,");
    expect(optional).toContain("repairs: Object.freeze([])");
    expect(optional).toContain("repairedSectionCount: 0");
    expect(optional).not.toContain("throw new ContentGenerationError(");
  });
});
