import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  OpportunityDiagnosis,
} from "./opportunity-diagnosis";

import {
  buildOpportunityActionPlan,
  decideOpportunityAction,
} from "./opportunity-action-plan";

function diagnosis(
  overrides: Partial<OpportunityDiagnosis> = {}
): OpportunityDiagnosis {
  return {
    keyword:
      "credit monitoring",

    market:
      "US",

    domain:
      "example.com",

    liveRank:
      null,

    rankingStatus:
      "NOT_TOP_100",

    ownPage: {
      url:
        "https://example.com/features",

      title:
        "Example Features",

      h1:
        "Our Features",

      wordCount:
        500,

      relevanceScore:
        0.15,

      inboundInternalLinks:
        5,
    },

    competitors: [
      {
        rank:
          1,
        domain:
          "competitor-a.com",
        url:
          "https://competitor-a.com/page",
        title:
          "Credit Monitoring",
        fetched:
          true,
        h1:
          "Credit Monitoring",
        wordCount:
          2000,
      },
      {
        rank:
          2,
        domain:
          "competitor-b.com",
        url:
          "https://competitor-b.com/page",
        title:
          "Credit Monitoring Service",
        fetched:
          true,
        h1:
          "Credit Monitoring Service",
        wordCount:
          3000,
      },
    ],

    serpPattern:
      "Google shows a mix of service and informational pages for this search.",

    topicGaps:
      [],

    observedCompetitorMedianWordCount:
      2500,

    findings: [
      {
        code:
          "NOT_VISIBLE_TOP_100",
        severity:
          "HIGH",
        title:
          "Not visible",
        explanation:
          "Not found.",
        evidence:
          [],
      },
      {
        code:
          "WEAK_TARGET_PAGE",
        severity:
          "HIGH",
        title:
          "Weak target",
        explanation:
          "Weak page.",
        evidence:
          [],
      },
    ],

    actions:
      [],

    ownPagesInspected:
      8,

    competitorPagesFetched:
      2,

    observedAt:
      new Date(
        0
      ).toISOString(),

    limitations:
      [],

    ...overrides,
  };
}

describe(
  "opportunity action plan",
  () => {
    it(
      "chooses CREATE when the best existing page is barely related",
      () => {
        expect(
          decideOpportunityAction(
            diagnosis()
          )
        ).toBe(
          "CREATE"
        );
      }
    );

    it(
      "chooses UPDATE when a page already has meaningful topical alignment",
      () => {
        const input =
          diagnosis({
            ownPage: {
              url:
                "https://example.com/credit",

              title:
                "Credit Monitoring",

              h1:
                "Credit Monitoring",

              wordCount:
                800,

              relevanceScore:
                0.55,

              inboundInternalLinks:
                3,
            },

            findings:
              [],
          });

        expect(
          decideOpportunityAction(
            input
          )
        ).toBe(
          "UPDATE"
        );
      }
    );

    it(
      "chooses SKIP instead of inventing work when the page is already aligned",
      () => {
        const input =
          diagnosis({
            ownPage: {
              url:
                "https://example.com/credit-monitoring",

              title:
                "Credit Monitoring",

              h1:
                "Credit Monitoring",

              wordCount:
                900,

              relevanceScore:
                0.9,

              inboundInternalLinks:
                4,
            },

            findings: [
              {
                code:
                  "NOT_VISIBLE_TOP_100",

                severity:
                  "HIGH",

                title:
                  "Not visible",

                explanation:
                  "Not found.",

                evidence:
                  [],
              },
            ],
          });

        expect(
          decideOpportunityAction(
            input
          )
        ).toBe(
          "SKIP"
        );
      }
    );

    it(
      "does not invent content sections when no consensus gap exists",
      () => {
        const plan =
          buildOpportunityActionPlan(
            diagnosis()
          );

        expect(
          plan.evidenceBackedTopics
        ).toEqual(
          []
        );

        expect(
          plan.steps.some(
            (
              step
            ) =>
              step.type ===
              "ADD_EVIDENCE_BACKED_TOPIC"
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "adds a topic only when diagnosis provides consensus evidence",
      () => {
        const plan =
          buildOpportunityActionPlan(
            diagnosis({
              topicGaps: [
                {
                  topic:
                    "What credit monitoring can detect",

                  competitorCoverage:
                    2,

                  evidence: [
                    "What credit monitoring can detect",
                    "What can credit monitoring detect",
                  ],
                },
              ],
            })
          );

        expect(
          plan.evidenceBackedTopics
        ).toHaveLength(
          1
        );

        expect(
          plan.steps.some(
            (
              step
            ) =>
              step.type ===
              "ADD_EVIDENCE_BACKED_TOPIC"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "never converts competitor word count into a target",
      () => {
        const plan =
          buildOpportunityActionPlan(
            diagnosis()
          );

        expect(
          plan.observations
            .competitorMedianWordCount
        ).toBe(
          2500
        );

        expect(
          plan.observations
            .wordCountRule
            .toLowerCase()
        ).toContain(
          "never"
        );
      }
    );
  }
);
