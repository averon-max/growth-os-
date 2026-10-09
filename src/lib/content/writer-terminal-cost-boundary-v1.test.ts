import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARTICLE_GENERATION_BUDGET_V1,
} from "./content-run-budget-v1";


const repairSource =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


const criticSource =
  readFileSync(
    new URL(
      "./master-article-critic-repair-execution.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Writer terminal cost boundary V1",
  () => {
    it(
      "hard-bounds physical article calls and repair operations",
      () => {
        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBeGreaterThanOrEqual(
          8
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBeLessThanOrEqual(
          36
        );


        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBeGreaterThanOrEqual(
          1
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBeLessThanOrEqual(
          10
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBeLessThan(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        );
      }
    );


    it(
      "keeps deterministic semantic cleanup bounded without model regeneration",
      () => {
        const match =
          repairSource.match(
            /MAX_DETERMINISTIC_SEMANTIC_PASSES\s*=\s*(\d+)/
          );


        expect(
          match
        ).not.toBeNull();


        const value =
          Number(
            match?.[1]
          );


        expect(
          value
        ).toBeGreaterThanOrEqual(
          1
        );

        expect(
          value
        ).toBeLessThanOrEqual(
          4
        );


        expect(
          repairSource
        ).not.toContain(
          "MAX_SEMANTIC_MODEL_REPAIR_PASSES"
        );
      }
    );


    it(
      "keeps critic recovery section-local",
      () => {
        expect(
          criticSource
        ).toContain(
          "MASTER_CRITIC_SINGLE_REPAIR_CYCLE_V1"
        );


        expect(
          criticSource
        ).not.toContain(
          "MASTER_CRITIC_REPAIR_SECOND_PASS_FORBIDDEN"
        );


        expect(
          criticSource
        ).not.toContain(
          "rewriteArticle("
        );


        expect(
          criticSource
        ).not.toContain(
          "generateArticle("
        );
      }
    );
  }
);
