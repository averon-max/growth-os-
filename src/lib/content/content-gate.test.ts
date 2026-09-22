import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildBootstrapBusinessFactRegistry,
} from "./business-facts";

import {
  evaluateContentGate,
} from "./content-gate";

import type {
  GeneratedArticle,
} from "./types";

import type {
  ArticleAudit,
} from "./content-quality";


const registry =
  buildBootstrapBusinessFactRegistry({
    businessName:
      "ScanMyCreds",

    websiteUrl:
      "https://scanmycreds.com",

    industry:
      "credit monitoring and identity protection",
  });


function audit(
  issues:
    string[] = []
): ArticleAudit {
  return {
    score:
      100,

    wordCount:
      900,

    h2Count:
      0,

    h3Count:
      0,

    primaryKeywordDensityPct:
      0.7,

    issues,
  };
}


function article(
  bodyMarkdown:
    string,
  overrides:
    Partial<GeneratedArticle> = {}
): GeneratedArticle {
  return {
    title:
      "Check If Your Email Was Compromised",

    metaDescription:
      "Learn practical steps to check whether your email may have been exposed and what to do next.",

    h1:
      "How to Check If Your Email Was Compromised",

    bodyMarkdown,

    ...overrides,
  };
}


describe(
  "content gate",
  () => {
    it(
      "blocks unsupported product metrics and capabilities",
      () => {
        const result =
          evaluateContentGate({
            article:
              article(
                "## Check exposure\nScanMyCreds searches billions of compromised records."
              ),

            primaryKeyword:
              "how to check if my email was compromised",

            audit:
              audit(),

            registry,
          });

        expect(
          result.pass
        ).toBe(
          false
        );

        expect(
          result.blockingIssues
        ).toContain(
          "UNVERIFIED_PRODUCT_METRIC"
        );

        expect(
          result.blockingIssues
        ).toContain(
          "UNVERIFIED_PRODUCT_CAPABILITY"
        );
      }
    );


    it(
      "allows a plain brand mention without inventing capabilities",
      () => {
        const result =
          evaluateContentGate({
            article:
              article(
                "## Next steps\nYou can visit ScanMyCreds for more information."
              ),

            primaryKeyword:
              "how to check if my email was compromised",

            audit:
              audit(),

            registry,
          });

        expect(
          result.pass
        ).toBe(
          true
        );
      }
    );


    it(
      "does not block only because an exact primary phrase is missing",
      () => {
        const result =
          evaluateContentGate({
            article:
              article(
                "## Signs\nReview unexpected sign-ins and security changes.",
                {
                  title:
                    "If Your Email Was Compromised: What to Do Next",

                  h1:
                    "If Your Email Was Compromised",
                }
              ),

            primaryKeyword:
              "how to check if my email was compromised",

            audit:
              audit([
                "PRIMARY_NOT_IN_TITLE",
                "PRIMARY_NOT_IN_H1",
              ]),

            registry,
          });

        expect(
          result.blockingIssues
        ).not.toContain(
          "PRIMARY_NOT_IN_TITLE"
        );

        expect(
          result.warnings
        ).toContain(
          "PRIMARY_NOT_IN_TITLE"
        );
      }
    );


    it(
      "blocks a second H1 inside body markdown",
      () => {
        const result =
          evaluateContentGate({
            article:
              article(
                "# Duplicate H1\nBody."
              ),

            primaryKeyword:
              "how to check if my email was compromised",

            audit:
              audit([
                "BODY_CONTAINS_H1",
              ]),

            registry,
          });

        expect(
          result.pass
        ).toBe(
          false
        );

        expect(
          result.blockingIssues
        ).toContain(
          "BODY_CONTAINS_H1"
        );
      }
    );
  }
);
