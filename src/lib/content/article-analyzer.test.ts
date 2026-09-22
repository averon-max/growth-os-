import {
  describe,
  expect,
  it,
} from "vitest";

import {
  analyzeArticle,
  countExactPhrase,
  extractArticleHeadings,
} from "./article-analyzer";

describe(
  "article analyzer",
  () => {
    it(
      "measures real article structure without inventing an SEO score",
      () => {
        const result =
          analyzeArticle({
            title:
              "Identity Theft Protection Guide",
            h1:
              "Identity Theft Protection Guide",
            bodyMarkdown: `
## How identity theft protection works

Identity theft protection helps people monitor suspicious activity.

### Credit monitoring

Credit monitoring can surface changes.

### Dark web monitoring

Dark web monitoring can surface exposed credentials.

## What should you monitor?

Review your accounts and alerts.
`,
            primaryKeyword:
              "identity theft protection",
            secondaryKeywords: [
              "credit monitoring",
              "dark web monitoring",
            ],
            targets: {
              h2: {
                min: 2,
                max: 4,
              },
              h3: {
                min: 2,
                max: 5,
              },
            },
          });

        expect(
          result.structure.totalH1
        ).toBe(1);

        expect(
          result.structure.bodyH1
        ).toBe(0);

        expect(
          result.structure.h2
        ).toBe(2);

        expect(
          result.structure.h3
        ).toBe(2);

        expect(
          result.structure
            .questionHeadings
        ).toBe(1);

        expect(
          result.keywordCoverage
            .planned
        ).toBe(3);

        expect(
          result.keywordCoverage
            .used
        ).toBe(3);

        expect(
          result.keywordCoverage
            .coveragePct
        ).toBe(100);

        expect(
          result.targetAlignment.h2
            .state
        ).toBe("WITHIN");

        expect(
          result.targetAlignment.h3
            .state
        ).toBe("WITHIN");

        expect(
          result.structurallyValid
        ).toBe(true);
      }
    );

    it(
      "blocks a second H1 inside the article body",
      () => {
        const result =
          analyzeArticle({
            title:
              "Credit Monitoring",
            h1:
              "Credit Monitoring",
            bodyMarkdown: `
# Duplicate H1

## What credit monitoring does

Credit monitoring tracks changes.
`,
            primaryKeyword:
              "credit monitoring",
          });

        expect(
          result.structure.totalH1
        ).toBe(2);

        expect(
          result.structure.bodyH1
        ).toBe(1);

        expect(
          result.issues.map(
            (issue) =>
              issue.code
          )
        ).toContain(
          "BODY_CONTAINS_H1"
        );

        expect(
          result.issues.map(
            (issue) =>
              issue.code
          )
        ).toContain(
          "INVALID_H1_COUNT"
        );

        expect(
          result.structurallyValid
        ).toBe(false);
      }
    );

    it(
      "counts exact phrases case-insensitively without matching inside longer words",
      () => {
        expect(
          countExactPhrase(
            "Credit Monitoring and credit monitoring. Credit-monitoring is hyphenated.",
            "credit monitoring"
          )
        ).toBe(2);

        expect(
          countExactPhrase(
            "monitor monitoring monitored",
            "monitor"
          )
        ).toBe(1);
      }
    );

    it(
      "compares structure only with explicit evidence-derived ranges",
      () => {
        const result =
          analyzeArticle({
            title:
              "SEO Content Guide",
            h1:
              "SEO Content Guide",
            bodyMarkdown: `
## One

SEO content appears here.

## Two

More SEO content.

## Three

More content.
`,
            primaryKeyword:
              "SEO content",
            targets: {
              h2: {
                min: 5,
                max: 8,
              },
              h3: {
                min: 0,
                max: 2,
              },
              wordCount: {
                min: 100,
                max: 500,
              },
            },
          });

        expect(
          result.targetAlignment.h2
            .state
        ).toBe("BELOW");

        expect(
          result.targetAlignment.h3
            .state
        ).toBe("WITHIN");

        expect(
          result.targetAlignment
            .wordCount.state
        ).toBe("BELOW");

        expect(
          result.issues.map(
            (issue) =>
              issue.code
          )
        ).toContain(
          "H2_BELOW_TARGET"
        );

        expect(
          result.issues.map(
            (issue) =>
              issue.code
          )
        ).toContain(
          "WORD_COUNT_BELOW_TARGET"
        );
      }
    );

    it(
      "deduplicates planned keywords and exposes missing phrases instead of fabricating semantic coverage",
      () => {
        const result =
          analyzeArticle({
            title:
              "Identity Protection",
            h1:
              "Identity Protection",
            bodyMarkdown: `
## Monitoring

Credit monitoring is useful.
`,
            primaryKeyword:
              "identity protection",
            secondaryKeywords: [
              "credit monitoring",
              "Credit Monitoring",
              "dark web monitoring",
            ],
          });

        expect(
          result.keywordCoverage
            .planned
        ).toBe(3);

        expect(
          result.keywordCoverage
            .used
        ).toBe(2);

        expect(
          result.keywordCoverage
            .missing
        ).toBe(1);

        const darkWeb =
          result.keywordCoverage.items.find(
            (item) =>
              item.keyword ===
              "dark web monitoring"
          );

        expect(
          darkWeb?.used
        ).toBe(false);
      }
    );

    it(
      "extracts markdown and HTML headings",
      () => {
        const headings =
          extractArticleHeadings(`
## Markdown H2
### Markdown H3

<h2>HTML H2</h2>
<h3><strong>HTML H3</strong></h3>
`);

        expect(
          headings.map(
            (heading) => [
              heading.level,
              heading.text,
            ]
          )
        ).toEqual([
          [
            2,
            "Markdown H2",
          ],
          [
            3,
            "Markdown H3",
          ],
          [
            2,
            "HTML H2",
          ],
          [
            3,
            "HTML H3",
          ],
        ]);
      }
    );
  }
);
