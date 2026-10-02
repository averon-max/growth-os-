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
  "Master Writer provider-prompt budget accounting",
  () => {
    const source =
      readFileSync(
        new URL(
          "./content-run-budget-v1.ts",
          import.meta.url
        ),
        "utf8"
      );


    const expectedStages = [
      [
        "generateArticleShell",
        "buildMasterArticleShellPrompt",
      ],
      [
        "generateSection",
        "buildMasterSectionPrompt",
      ],
      [
        "verifySectionClaims",
        "buildMasterSectionSemanticVerificationPrompt",
      ],
      [
        "repairSection",
        "buildMasterSectionRepairPrompt",
      ],
      [
        "reviewMasterArticleSemantics",
        "buildMasterArticleSemanticCriticPrompt",
      ],
      [
        "compareSerpReplayPair",
        "buildSerpReplayPairwisePrompt",
      ],
    ] as const;


    it(
      "accounts every current Master Writer provider call from its real prompt",
      () => {
        for (
          const [
            stage,
            builder,
          ]
          of expectedStages
        ) {
          const stageIndex =
            source.indexOf(
              `"${stage}"`
            );

          expect(
            stageIndex
          ).toBeGreaterThan(
            -1
          );

          const following =
            source.slice(
              stageIndex,
              stageIndex + 1000
            );

          expect(
            following
          ).toContain(
            builder
          );
        }
      }
    );


    it(
      "retains conservative fallback for non-mapped methods",
      () => {
        expect(
          source
        ).toMatch(
          /return estimateRawArgsTokensV1\(\s*args\s*\)/
        );
      }
    );


    it(
      "keeps production request and repair limits while article cumulative token cap is disabled",
      () => {
        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxModelCalls
        ).toBe(
          64
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxEstimatedInputTokens
        ).toBe(
          Number.MAX_SAFE_INTEGER
        );

        expect(
          ARTICLE_GENERATION_BUDGET_V1
            .maxRepairCalls
        ).toBe(
          2
        );
      }
    );


    it(
      "does not map legacy whole-article writer methods into Master Writer accounting",
      () => {
        const estimator =
          source.slice(
            source.indexOf(
              "export function estimateContentInputTokensForStageV1"
            ),
            source.indexOf(
              "function freezeSnapshot("
            )
          );

        expect(
          estimator
        ).not.toContain(
          'stage ===\n      "generateArticle"'
        );

        expect(
          estimator
        ).not.toContain(
          'stage ===\n      "rewriteArticle"'
        );

        expect(
          estimator
        ).not.toContain(
          'stage ===\n      "critiqueArticle"'
        );
      }
    );
  }
);
