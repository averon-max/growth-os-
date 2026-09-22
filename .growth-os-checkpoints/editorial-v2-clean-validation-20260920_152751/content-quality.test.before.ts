import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditArticle,
  repairArticleMarkdown,
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
      "detects extreme keyword repetition",
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
          audit.issues
        ).toContain(
          "POSSIBLE_KEYWORD_STUFFING"
        );
      }
    );
  }
);
