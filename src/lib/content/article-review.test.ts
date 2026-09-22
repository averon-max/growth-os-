import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertArticleCriticsPassed,
  shouldRewriteArticle,
  summarizeArticleCritiques,
} from "./article-review";

import type {
  ArticleCritiqueResult,
} from "./generator";

function critique(
  overrides:
    Partial<ArticleCritiqueResult> = {}
): ArticleCritiqueResult {
  return {
    role:
      "EDITORIAL",

    pass:
      true,

    findings:
      [],

    ...overrides,
  };
}

describe(
  "Presidential article review governance",
  () => {
    it(
      "passes when critics have no major findings",
      () => {
        const result =
          summarizeArticleCritiques([
            critique({
              findings: [
                {
                  code:
                    "SMALL_STYLE_NOTE",

                  severity:
                    "MINOR",

                  message:
                    "Small style issue.",

                  evidence:
                    "Example.",

                  instruction:
                    "Tighten wording.",
                },
              ],
            }),
          ]);

        expect(
          result.pass
        ).toBe(true);

        expect(
          shouldRewriteArticle(
            result
          )
        ).toBe(false);

        expect(
          () =>
            assertArticleCriticsPassed(
              result
            )
        ).not.toThrow();
      }
    );

    it(
      "requires rewrite for a major finding",
      () => {
        const result =
          summarizeArticleCritiques([
            critique({
              role:
                "SEARCH_INTENT",

              pass:
                false,

              findings: [
                {
                  code:
                    "INTENT_NOT_SATISFIED",

                  severity:
                    "MAJOR",

                  message:
                    "The page does not answer the main job.",

                  evidence:
                    "The introduction avoids the requested answer.",

                  instruction:
                    "Answer the query directly before expanding.",
                },
              ],
            }),
          ]);

        expect(
          result.pass
        ).toBe(false);

        expect(
          shouldRewriteArticle(
            result
          )
        ).toBe(true);
      }
    );

    it(
      "fails closed when blocker survives final review",
      () => {
        const result =
          summarizeArticleCritiques([
            critique({
              role:
                "FACT_CLAIM",

              pass:
                false,

              findings: [
                {
                  code:
                    "UNSUPPORTED_PRODUCT_CAPABILITY",

                  severity:
                    "BLOCKER",

                  message:
                    "Unsupported capability.",

                  evidence:
                    "The article claims continuous monitoring.",

                  instruction:
                    "Remove the capability unless verified.",
                },
              ],
            }),
          ]);

        expect(
          () =>
            assertArticleCriticsPassed(
              result
            )
        ).toThrow(
          /ARTICLE_CRITIC_GATE_FAILED/
        );
      }
    );

    it(
      "deduplicates repeated findings",
      () => {
        const finding = {
          code:
            "GENERIC_INTRO",

          severity:
            "MAJOR" as const,

          message:
            "Generic intro.",

          evidence:
            "In today's digital world...",

          instruction:
            "Replace with direct answer.",
        };

        const result =
          summarizeArticleCritiques([
            critique({
              findings: [
                finding,
              ],
            }),

            critique({
              findings: [
                finding,
              ],
            }),
          ]);

        expect(
          result.findings
        ).toHaveLength(1);
      }
    );

    it(
      "orders blocker before major before minor",
      () => {
        const result =
          summarizeArticleCritiques([
            critique({
              findings: [
                {
                  code:
                    "MINOR_ONE",

                  severity:
                    "MINOR",

                  message:
                    "Minor.",

                  evidence:
                    "Minor.",

                  instruction:
                    "Fix.",
                },

                {
                  code:
                    "BLOCKER_ONE",

                  severity:
                    "BLOCKER",

                  message:
                    "Blocker.",

                  evidence:
                    "Blocker.",

                  instruction:
                    "Fix.",
                },

                {
                  code:
                    "MAJOR_ONE",

                  severity:
                    "MAJOR",

                  message:
                    "Major.",

                  evidence:
                    "Major.",

                  instruction:
                    "Fix.",
                },
              ],
            }),
          ]);

        expect(
          result.findings.map(
            (finding) =>
              finding.severity
          )
        ).toEqual([
          "BLOCKER",
          "MAJOR",
          "MINOR",
        ]);
      }
    );
  }
);
