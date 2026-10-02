import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function source(
  relative: string
): string {
  return readFileSync(
    new URL(
      relative,
      import.meta.url
    ),
    "utf8"
  );
}


describe(
  "CONTENT V1 closure boundaries",
  () => {
    it(
      "Article Intelligence uses the canonical analyzer and no private parser",
      () => {
        const ui =
          source(
            "../../components/dashboard/article-structure-stats.tsx"
          );

        expect(ui).toContain(
          "computeArticleStructureStatsV1"
        );

        expect(ui).not.toContain(
          "new RegExp("
        );

        expect(ui).not.toContain(
          "function countHeading"
        );
      }
    );

    it(
      "Final Readiness no longer treats word count as diagnostic-only",
      () => {
        const readiness =
          source(
            "./final-article-readiness-v1.ts"
          );

        expect(readiness).not.toContain(
          "ARTICLE_WORD_COUNT_IS_DIAGNOSTIC_ONLY_V1\n"
        );

        expect(readiness).toContain(
          "FINAL_READINESS_LENGTH_DEFICIT"
        );

        expect(readiness).toContain(
          "FINAL_READINESS_H2_BELOW_PLAN"
        );
      }
    );

    it(
      "retry of a REJECTED generation reuses one logical Article row",
      () => {
        const service =
          source("./service.ts");

        const start =
          service.indexOf(
            "export async function generateArticleFromBrief"
          );

        const end =
          service.indexOf(
            "export async function approveArticle",
            start
          );

        const window =
          service.slice(start, end);

        expect(window).toContain(
          "REJECTED_RETRY_REUSES_LOGICAL_ARTICLE_V1"
        );

        expect(window).toContain(
          "reusableRejectedArticle"
        );

        expect(
          (
            window.match(
              /contentArticle\.create\(/g
            ) ?? []
          ).length
        ).toBe(1);
      }
    );

    it(
      "Stage planner enforces the template H2 floor through the existing bounded retry",
      () => {
        const planner =
          source(
            "./production-master-live-stage-planner.ts"
          );

        expect(planner).toContain(
          "TEMPLATE_H2_PLANNING_MINIMUM_RECOVERY_V1"
        );

        expect(planner).toContain(
          ".h2PlanningRange.min"
        );
      }
    );
  }
);
