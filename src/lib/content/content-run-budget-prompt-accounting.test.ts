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


describe(
  "ContentRunBudget provider-prompt accounting",
  () => {
    const source =
      readFileSync(
        new URL(
          "./content-run-budget-v1.ts",
          import.meta.url
        ),
        "utf8"
      );


    it(
      "uses the real section generation prompt",
      () => {
        expect(
          source
        ).toMatch(
          /stage ===\s*"generateSection"[\s\S]*buildMasterSectionPrompt/
        );
      }
    );


    it(
      "uses the real section repair prompt",
      () => {
        expect(
          source
        ).toMatch(
          /stage ===\s*"repairSection"[\s\S]*buildMasterSectionRepairPrompt/
        );
      }
    );


    it(
      "wires provider-visible accounting into consume",
      () => {
        const consume =
          source.slice(
            source.indexOf(
              "function consume({"
            ),
            source.indexOf(
              "return Object.freeze({",
              source.indexOf(
                "function consume({"
              )
            )
          );

        expect(
          consume
        ).toContain(
          "estimateContentInputTokensForStageV1"
        );

        expect(
          consume
        ).not.toContain(
          "let chars ="
        );
      }
    );


    it(
      "keeps a conservative fallback for unknown methods",
      () => {
        expect(
          source
        ).toMatch(
          /return estimateRawArgsTokensV1\(\s*args\s*\)/
        );
      }
    );


    it(
      "keeps production article safety budgets finite and bounded",
      () => {
        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBeGreaterThan(
          0
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBeLessThanOrEqual(
          36
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxEstimatedInputTokens
        ).toBeGreaterThan(
          0
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxEstimatedInputTokens
        ).toBeLessThanOrEqual(
          140_000
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBeGreaterThan(
          0
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBeLessThanOrEqual(
          10
        );
      }
    );
  }
);
