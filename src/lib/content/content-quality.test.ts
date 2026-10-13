import {
  normalizeMasterArticleProseSpacesV1,
} from "./master-article-composer";

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


describe("production page-level article integrity", () => {
  const base = {
    title: "Credit Monitoring Guide",
    h1: "What Is Credit Monitoring?",
    metaDescription: "A practical guide to understanding credit monitoring, report changes and alerts.",
    bodyMarkdown: "## Definition\nAn alert flags report changes.\n\n## Limitations\nReview the report.",
  };

  it("blocks H1 duplicated as a body H2 even without a markdown body H1", () => {
    const a = auditArticle({
      article: { ...base, bodyMarkdown: "## What Is Credit Monitoring?\nAn explanation.\n\n## Limitations\nDetails." },
      primaryKeyword: "credit monitoring",
    });
    expect(a.issues).toContain("DUPLICATE_H1_BODY_HEADING");
    expect(a.issues).not.toContain("BODY_CONTAINS_H1");
  });

  it("flags identical body headings and obvious spacing damage", () => {
    const a = auditArticle({
      article: { ...base, bodyMarkdown: "## Overview\nThis has   three spaces.\n\n## Overview\nDo not recognize,and investigate." },
      primaryKeyword: "credit monitoring",
    });
    expect(a.issues).toContain("DUPLICATE_BODY_HEADING");
    expect(a.issues).toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
    expect(a.issues).toContain("BROKEN_ARTICLE_COMMA_SPACING");
  });

  it("does not misclassify normal subheadings, URLs, and code samples", () => {
    const a = auditArticle({
      article: { ...base, bodyMarkdown: "## How It Works\nReview changes, and compare alerts.\n\n### Sources\nSee https://example.com/a,b for details.\n\n\`Example   spacing\`" },
      primaryKeyword: "credit monitoring",
    });
    expect(a.issues).not.toContain("DUPLICATE_H1_BODY_HEADING");
    expect(a.issues).not.toContain("DUPLICATE_BODY_HEADING");
    expect(a.issues).not.toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
    expect(a.issues).not.toContain("BROKEN_ARTICLE_COMMA_SPACING");
  });
});

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

describe("audit and Article Intelligence word count consistency", () => {
  it("does not count Markdown citation URLs as reader words", async () => {
    const { countWords } = await import("./article-analyzer");
    const article = {
      title: "Credit monitoring",
      metaDescription: "A guide to credit monitoring alerts and reports.",
      h1: "Credit monitoring",
      bodyMarkdown: "## Alerts\nCredit monitoring provides alerts. See [official source](https://www.example.com/some-long-url).",
    };
    const audit = auditArticle({article,primaryKeyword:"credit monitoring"});
    expect(audit.wordCount).toBe(countWords(article.bodyMarkdown));
  });
});

describe("canonical whitespace parity after Writer and SERP Replay", () => {
  const article = {
    title: "Credit monitoring guide",
    metaDescription: "How credit monitoring helps people follow report changes.",
    h1: "Credit monitoring guide",
  };

  it("does not reject legitimate nested Markdown indentation", () => {
    const bodyMarkdown = "## Monitoring alerts\n\n- Look for changes\n    - Check the date\n    - Review an unfamiliar item\n\n    Preserved indentation.";
    const a = auditArticle({
      article:{...article,bodyMarkdown},
      primaryKeyword:"credit monitoring",
    });
    expect(a.issues).not.toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
  });

  it("does not reject aligned tables, code or URLs after composition", () => {
    const bodyMarkdown = [
      "## Changes",
      "",
      "| Type    | Example    |",
      "| ------- | ---------- |",
      "| Inquiry | Report     |",
      "",
      "```ts",
      "const x = 'one   two';",
      "```",
      "",
      "Check `a   b` and https://example.com/a   to learn more.",
    ].join("\n");
    const composed = normalizeMasterArticleProseSpacesV1(bodyMarkdown);
    const a = auditArticle({
      article:{...article,bodyMarkdown:composed},
      primaryKeyword:"credit monitoring",
    });
    expect(a.issues).not.toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
  });

  it("still detects malformed prose that canonical composition can fix", () => {
    const bodyMarkdown = "## Monitoring\nThe service   checks report changes.";
    const a = auditArticle({
      article:{...article,bodyMarkdown},
      primaryKeyword:"credit monitoring",
    });
    expect(a.issues).toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
    const normalized=normalizeMasterArticleProseSpacesV1(bodyMarkdown);
    expect(normalized).toContain("service checks");
    expect(auditArticle({
      article:{...article,bodyMarkdown:normalized},
      primaryKeyword:"credit monitoring",
    }).issues).not.toContain("BROKEN_ARTICLE_EXCESSIVE_SPACES");
  });
});
