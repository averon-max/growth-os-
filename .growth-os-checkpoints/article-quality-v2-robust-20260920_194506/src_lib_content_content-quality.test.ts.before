import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditArticle,
  repairArticleMarkdown,
  repairGeneratedArticle,
} from "./content-quality";


describe(
  "content quality",
  () => {
    it(
      "removes body H1 and repairs orphan H3",
      () => {
        const repaired =
          repairArticleMarkdown(
            [
              "# Main Topic",
              "",
              "### Orphan heading",
              "",
              "Text",
              "",
              "## Real section",
              "",
              "### Detail",
            ].join(
              "\n"
            ),
            "Main Topic"
          );

        expect(
          repaired
        ).not.toContain(
          "# Main Topic"
        );

        expect(
          repaired
        ).toContain(
          "## Orphan heading"
        );

        expect(
          repaired
        ).toContain(
          "### Detail"
        );
      }
    );

    it(
      "keeps keyword density observational without a universal stuffing threshold",
      () => {
        const repeated =
          Array.from(
            {
              length:
                100,
            },
            () =>
              "email breach"
          ).join(
            " "
          );

        const audit =
          auditArticle({
            primaryKeyword:
              "email breach",

            article: {
              title:
                "Email Breach Guide",

              h1:
                "Email Breach Guide",

              metaDescription:
                "A practical guide to understanding email breaches, account exposure, security risks, and the steps to take after an incident.",

              bodyMarkdown:
                `## Overview\n${repeated}\n\n## Actions\n${repeated}`,
            },
          });

        expect(
          audit.primaryKeywordDensityPct
        ).toBeGreaterThan(
          3.5
        );

        expect(
          audit.issues
        ).not.toContain(
          "POSSIBLE_KEYWORD_STUFFING"
        );
      }
    );
  }
);


describe(
  "high-confidence article text integrity",
  () => {
    it(
      "detects and repairs high-confidence article agreement defects",
      () => {
        const broken = {
          title:
            "Credit Monitoring Guide",

          h1:
            "Credit Monitoring Guide",

          metaDescription:
            "A practical guide explaining credit monitoring, alerts, reports, identity risks, and how consumers can review changes safely.",

          bodyMarkdown:
            [
              "## Overview",
              "",
              "A changes to your credit file may trigger an alert.",
              "",
              "## Next steps",
              "",
              "Review the alert and verify the activity.",
            ].join(
              "\n"
            ),
        };

        const before =
          auditArticle({
            article:
              broken,

            primaryKeyword:
              "credit monitoring",
          });

        expect(
          before.issues
        ).toContain(
          "BROKEN_ARTICLE_AGREEMENT"
        );

        expect(
          before.score
        ).toBeLessThan(
          100
        );

        const repaired =
          repairGeneratedArticle(
            broken
          );

        expect(
          repaired.bodyMarkdown
        ).toContain(
          "A change to your credit file"
        );

        expect(
          repaired.bodyMarkdown
        ).not.toMatch(
          /\ba\s+changes\b/i
        );

        const after =
          auditArticle({
            article:
              repaired,

            primaryKeyword:
              "credit monitoring",
          });

        expect(
          after.issues
        ).not.toContain(
          "BROKEN_ARTICLE_AGREEMENT"
        );
      }
    );
  }
);
