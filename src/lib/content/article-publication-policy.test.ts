import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateArticlePublicationPolicy,
} from "./article-publication-policy";

import type {
  ContentPlanAnalysis,
} from "./content-plan-analysis";

function article(
  bodyMarkdown:
    string
) {
  return {
    title:
      "What Is Credit Monitoring?",

    metaDescription:
      "Learn how credit monitoring works.",

    h1:
      "What Is Credit Monitoring?",

    bodyMarkdown,
  };
}

function intelligence(
  warnings:
    string[] = []
): ContentPlanAnalysis {
  return {
    planAvailable:
      true,

    confidence:
      "HIGH",

    topics: {
      total:
        1,
      covered:
        1,
      missing:
        0,
      coveragePct:
        100,
      items:
        [],
    },

    questions: {
      total:
        1,
      covered:
        1,
      missing:
        0,
      coveragePct:
        100,
      items:
        [],
    },

    contentGaps:
      [],

    benchmarkObservation: {
      eligiblePages:
        null,
      observedMedianWordCount:
        null,
      observedMedianH2:
        null,
      observedMedianH3:
        null,
    },

    warnings,

    article:
      {} as
        ContentPlanAnalysis["article"],
  };
}

describe(
  "article publication policy",
  () => {
    it(
      "passes a clean evidence-backed article",
      () => {
        const result =
          evaluateArticlePublicationPolicy({
            article:
              article(
                "Credit monitoring helps users review changes to their credit files."
              ),

            intelligence:
              intelligence(),
          });

        expect(
          result.pass
        ).toBe(
          true
        );
      }
    );

    it(
      "blocks genuinely missing planned questions",
      () => {
        const result =
          evaluateArticlePublicationPolicy({
            article:
              article(
                "Credit monitoring overview."
              ),

            intelligence:
              intelligence([
                "PLANNED_QUESTION_NOT_LEXICALLY_COVERED: How does it work?",
              ]),
          });

        expect(
          result.blockingIssues
        ).toContain(
          "PLANNED_QUESTION_COVERAGE_MISSING"
        );
      }
    );

    it(
      "blocks unsupported external pricing evidence",
      () => {
        const result =
          evaluateArticlePublicationPolicy({
            article:
              article(
                "Premium plans cost between $10 and $30 per month."
              ),

            intelligence:
              intelligence(),
          });

        expect(
          result.pass
        ).toBe(
          false
        );

        expect(
          result.blockingIssues
        ).toContain(
          "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
        );
      }
    );

    it(
      "blocks missing immutable plan evidence",
      () => {
        const value =
          intelligence();

        value.planAvailable =
          false;

        const result =
          evaluateArticlePublicationPolicy({
            article:
              article(
                "Credit monitoring overview."
              ),

            intelligence:
              value,
          });

        expect(
          result.blockingIssues
        ).toContain(
          "CONTENT_PLAN_EVIDENCE_UNAVAILABLE"
        );
      }
    );
  }
);
