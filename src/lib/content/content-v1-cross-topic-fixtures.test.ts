import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  buildProductionFinalArticleReadinessV1,
} from "./production-final-article-readiness-adapter-v1";

import {
  buildCompliantArticleBody,
} from "./article-readiness-test-body";


type Fixture = {
  name: string;
  topic: string;
  primaryQuery: string;
  intent:
    | "INFORMATIONAL"
    | "COMMERCIAL_INVESTIGATION"
    | "HOW_TO";
  pageType:
    | "GUIDE"
    | "COMPARISON"
    | "HOW_TO";
  requiredTopics: readonly {
    id: string;
    label: string;
  }[];
  requiredQuestions: readonly {
    id: string;
    label: string;
  }[];
  sections: readonly {
    id: string;
    heading: string;
    requiredTopicIds?: readonly string[];
    requiredQuestionIds?: readonly string[];
    evidenceIds?: readonly string[];
  }[];
};


const FIXTURES:
  readonly Fixture[] =
[
  {
    name:
      "canonical tag",

    topic:
      "canonical tags",

    primaryQuery:
      "what is a canonical tag",

    intent:
      "INFORMATIONAL",

    pageType:
      "GUIDE",

    requiredTopics: [
      {
        id:
          "canonical-definition",

        label:
          "canonical tag definition",
      },
      {
        id:
          "canonical-purpose",

        label:
          "why canonical tags are used",
      },
      {
        id:
          "canonical-implementation",

        label:
          "canonical implementation",
      },
    ],

    requiredQuestions: [
      {
        id:
          "canonical-question",

        label:
          "when should a canonical tag be used",
      },
    ],

    sections: [
      {
        id:
          "canonical-section-definition",

        heading:
          "What Is a Canonical Tag?",

        requiredTopicIds: [
          "canonical-definition",
        ],

        evidenceIds: [
          "canonical-evidence-1",
        ],
      },
      {
        id:
          "canonical-section-purpose",

        heading:
          "Why Canonical Tags Matter",

        requiredTopicIds: [
          "canonical-purpose",
        ],

        evidenceIds: [
          "canonical-evidence-2",
        ],
      },
      {
        id:
          "canonical-section-implementation",

        heading:
          "How to Implement Canonical Tags",

        requiredTopicIds: [
          "canonical-implementation",
        ],

        evidenceIds: [
          "canonical-evidence-3",
        ],
      },
      {
        id:
          "canonical-section-decision",

        heading:
          "When to Use a Canonical Tag",

        requiredQuestionIds: [
          "canonical-question",
        ],
      },
    ],
  },


  {
    name:
      "CRM for plumbers",

    topic:
      "CRM software for plumbing businesses",

    primaryQuery:
      "best crm for plumbers",

    intent:
      "COMMERCIAL_INVESTIGATION",

    pageType:
      "COMPARISON",

    requiredTopics: [
      {
        id:
          "crm-needs",

        label:
          "plumbing business CRM requirements",
      },
      {
        id:
          "crm-comparison",

        label:
          "CRM comparison criteria",
      },
      {
        id:
          "crm-selection",

        label:
          "selection framework",
      },
    ],

    requiredQuestions: [
      {
        id:
          "crm-question",

        label:
          "which CRM fits a plumbing business",
      },
    ],

    sections: [
      {
        id:
          "crm-section-needs",

        heading:
          "What Plumbers Need From a CRM",

        requiredTopicIds: [
          "crm-needs",
        ],

        evidenceIds: [
          "crm-evidence-1",
        ],
      },
      {
        id:
          "crm-section-comparison",

        heading:
          "How to Compare CRM Options",

        requiredTopicIds: [
          "crm-comparison",
        ],

        evidenceIds: [
          "crm-evidence-2",
        ],
      },
      {
        id:
          "crm-section-selection",

        heading:
          "Choosing the Right CRM",

        requiredTopicIds: [
          "crm-selection",
        ],

        evidenceIds: [
          "crm-evidence-3",
        ],
      },
      {
        id:
          "crm-section-decision",

        heading:
          "Which CRM Is the Best Fit?",

        requiredQuestionIds: [
          "crm-question",
        ],
      },
    ],
  },


  {
    name:
      "Next.js structured data",

    topic:
      "structured data in Next.js",

    primaryQuery:
      "how to add structured data to a Next.js site",

    intent:
      "HOW_TO",

    pageType:
      "HOW_TO",

    requiredTopics: [
      {
        id:
          "schema-foundation",

        label:
          "structured data fundamentals",
      },
      {
        id:
          "nextjs-implementation",

        label:
          "Next.js implementation",
      },
      {
        id:
          "schema-validation",

        label:
          "validation and testing",
      },
    ],

    requiredQuestions: [
      {
        id:
          "schema-question",

        label:
          "how should JSON-LD be added safely",
      },
    ],

    sections: [
      {
        id:
          "schema-section-foundation",

        heading:
          "How Structured Data Works",

        requiredTopicIds: [
          "schema-foundation",
        ],

        evidenceIds: [
          "schema-evidence-1",
        ],
      },
      {
        id:
          "schema-section-nextjs",

        heading:
          "Add JSON-LD in Next.js",

        requiredTopicIds: [
          "nextjs-implementation",
        ],

        evidenceIds: [
          "schema-evidence-2",
        ],
      },
      {
        id:
          "schema-section-validation",

        heading:
          "Validate the Markup",

        requiredTopicIds: [
          "schema-validation",
        ],

        evidenceIds: [
          "schema-evidence-3",
        ],
      },
      {
        id:
          "schema-section-safety",

        heading:
          "Implementation Checklist",

        requiredQuestionIds: [
          "schema-question",
        ],
      },
    ],
  },
];


function makePlan(
  fixture:
    Fixture
) {
  return buildArticleExecutionPlanV1({
    websiteId:
      "fixture-site",

    topic:
      fixture.topic,

    primaryQuery:
      fixture.primaryQuery,

    intent:
      fixture.intent,

    pageType:
      fixture.pageType,

    riskClass:
      "STANDARD",

    pageAction:
      "CREATE_NEW",

    requiredTopics:
      fixture.requiredTopics.map(
        (
          requirement
        ) => ({
          ...requirement,

          priority:
            "MUST" as const,
        })
      ),

    requiredQuestions:
      fixture.requiredQuestions.map(
        (
          requirement
        ) => ({
          ...requirement,

          priority:
            "MUST" as const,
        })
      ),

    sections:
      fixture.sections.map(
        (
          section
        ) => ({
          id:
            section.id,

          heading:
            section.heading,

          level:
            2 as const,

          mission:
            `Satisfy the information job: ${section.heading}`,

          requiredTopicIds:
            [
              ...(
                section
                  .requiredTopicIds ??
                []
              ),
            ],

          requiredQuestionIds:
            [
              ...(
                section
                  .requiredQuestionIds ??
                []
              ),
            ],

          evidenceIds:
            [
              ...(
                section
                  .evidenceIds ??
                []
              ),
            ],

          state:
            "WRITABLE" as const,
        })
      ),
  });
}


function writerRunFromPlan(
  plan:
    ReturnType<
      typeof makePlan
    >
) {
  return {
    finalCritics: {
      findings:
        [],
    },

    article: {
      sections:
        plan.sections
          .filter(
            (
              section
            ) =>
              section.state ===
              "WRITABLE"
          )
          .map(
            (
              section
            ) => ({
              sectionId:
                section.id,

              heading:
                section.heading,

              referencedEvidenceIds:
                [
                  ...section
                    .evidenceIds,
                ],
            })
          ),
    },
  };
}


describe(
  "CONTENT V1 cross-topic fixtures",
  () => {
    for (
      const fixture
      of FIXTURES
    ) {
      it(
        `${fixture.name}: passes the same generic readiness contract`,
        () => {
          const plan =
            makePlan(
              fixture
            );

          const result =
            buildProductionFinalArticleReadinessV1({
              plan,

              writerRun:
                writerRunFromPlan(
                  plan
                ),

              articleBodyMarkdown:
                buildCompliantArticleBody(plan),

              contentGatePass:
                true,

              publicationPolicyPass:
                true,

              serpReplay: {
                status:
                  "PASS",
              },

              serpReplayWarning:
                null,
            });

          expect(
            result.status
          ).toBe(
            "PASS"
          );

          expect(
            result.blockers
          ).toEqual(
            []
          );

          expect(
            result.diagnostics
              .expectedWritableSections
          ).toBe(
            fixture.sections.length
          );

          expect(
            result.diagnostics
              .renderedSections
          ).toBe(
            fixture.sections.length
          );
        }
      );
    }


    it(
      "contains no credit-monitoring-specific authority",
      () => {
        const serialized =
          JSON.stringify(
            FIXTURES
          ).toLowerCase();

        expect(
          serialized
        ).not.toContain(
          "credit monitoring"
        );

        expect(
          serialized
        ).not.toContain(
          "credit-monitoring"
        );
      }
    );


    it(
      "fails any topic when one canonical section is lost",
      () => {
        for (
          const fixture
          of FIXTURES
        ) {
          const plan =
            makePlan(
              fixture
            );

          const writerRun =
            writerRunFromPlan(
              plan
            );

          const result =
            buildProductionFinalArticleReadinessV1({
              plan,

              writerRun: {
                ...writerRun,

                article: {
                  sections:
                    writerRun
                      .article
                      .sections
                      .slice(
                        0,
                        -1
                      ),
                },
              },

              articleBodyMarkdown:
                "Still a long article ".repeat(
                  200
                ),

              contentGatePass:
                true,

              publicationPolicyPass:
                true,

              serpReplay: {
                status:
                  "PASS",
              },

              serpReplayWarning:
                null,
            });

          expect(
            result.status
          ).toBe(
            "FAIL"
          );

          expect(
            result.blockers.some(
              (
                blocker
              ) =>
                blocker.startsWith(
                  "WRITER_SECTION_LOSS:"
                )
            )
          ).toBe(
            true
          );
        }
      }
    );
  }
);
