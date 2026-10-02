import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  evaluateFinalArticleReadinessV1,
} from "./final-article-readiness-v1";


function fixturePlan() {
  return buildArticleExecutionPlanV1({
    websiteId:
      "site",

    topic:
      "generic informational topic",

    primaryQuery:
      "generic informational query",

    intent:
      "INFORMATIONAL",

    pageType:
      "GUIDE",

    riskClass:
      "STANDARD",

    pageAction:
      "CREATE_NEW",

    requiredTopics: [
      {
        id:
          "topic-1",

        label:
          "definition",

        priority:
          "MUST",
      },

      {
        id:
          "topic-2",

        label:
          "mechanism",

        priority:
          "MUST",
      },

      {
        id:
          "topic-3",

        label:
          "limitations",

        priority:
          "MUST",
      },
    ],

    requiredQuestions: [
      {
        id:
          "question-1",

        label:
          "main decision question",

        priority:
          "MUST",
      },
    ],

    sections: [
      {
        id:
          "section-1",

        heading:
          "Definition",

        level:
          2,

        mission:
          "Define.",

        requiredTopicIds: [
          "topic-1",
        ],

        evidenceIds: [
          "evidence-1",
        ],

        state:
          "WRITABLE",
      },

      {
        id:
          "section-2",

        heading:
          "How It Works",

        level:
          2,

        mission:
          "Explain mechanism.",

        requiredTopicIds: [
          "topic-2",
        ],

        evidenceIds: [
          "evidence-2",
        ],

        state:
          "WRITABLE",
      },

      {
        id:
          "section-3",

        heading:
          "Limitations",

        level:
          2,

        mission:
          "Explain limitations.",

        requiredTopicIds: [
          "topic-3",
        ],

        state:
          "WRITABLE",
      },

      {
        id:
          "section-4",

        heading:
          "Decision",

        level:
          2,

        mission:
          "Answer the decision question.",

        requiredQuestionIds: [
          "question-1",
        ],

        state:
          "WRITABLE",
      },
    ],
  });
}


describe(
  "FINAL_ARTICLE_READINESS_V1",
  () => {
    it(
      "rejects a shallow article because research coverage was lost, not because of word count",
      () => {
        const result =
          evaluateFinalArticleReadinessV1({
            plan:
              fixturePlan(),

            articleWordCount:
              249,

            renderedSections: [
              {
                sectionId:
                  "section-1",

                heading:
                  "Definition",
              },

              {
                sectionId:
                  "section-2",

                heading:
                  "How It Works",
              },
            ],

            resolvedTopicIds: [
              "topic-1",
            ],

            resolvedQuestionIds:
              [],

            resolvedEntityIds:
              [],

            preservedEvidenceIds: [
              "evidence-1",
            ],

            materialClaimsSupported:
              true,

            riskPolicyCompliance:
              true,

            intentComplete:
              false,

            originalValueCompliance:
              true,

            duplicateHeadingCheck:
              true,

            majorSemanticFindingCount:
              3,

            publicationPolicyPass:
              true,

            serpReplayStatus:
              "WARN",
          });


        expect(
          result.status
        ).toBe(
          "FAIL"
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "WRITER_SECTION_LOSS:"
              )
          )
        ).toBe(
          true
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_REQUIRED_TOPIC_MISSING:"
              )
          )
        ).toBe(
          true
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_REQUIRED_QUESTION_MISSING:"
              )
          )
        ).toBe(
          true
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.includes(
                "WORD"
              )
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "allows a shorter article when every required information job is actually complete",
      () => {
        const result =
          evaluateFinalArticleReadinessV1({
            plan:
              fixturePlan(),

            articleWordCount:
              720,

            renderedSections: [
              {
                sectionId:
                  "section-1",

                heading:
                  "Definition",
              },

              {
                sectionId:
                  "section-2",

                heading:
                  "How It Works",
              },

              {
                sectionId:
                  "section-3",

                heading:
                  "Limitations",
              },

              {
                sectionId:
                  "section-4",

                heading:
                  "Decision",
              },
            ],

            resolvedTopicIds: [
              "topic-1",
              "topic-2",
              "topic-3",
            ],

            resolvedQuestionIds: [
              "question-1",
            ],

            resolvedEntityIds:
              [],

            preservedEvidenceIds: [
              "evidence-1",
              "evidence-2",
            ],

            materialClaimsSupported:
              true,

            riskPolicyCompliance:
              true,

            intentComplete:
              true,

            originalValueCompliance:
              true,

            duplicateHeadingCheck:
              true,

            majorSemanticFindingCount:
              0,

            publicationPolicyPass:
              true,

            serpReplayStatus:
              "PASS",
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
      }
    );


    it(
      "treats missing competitor data honestly instead of fabricating a verdict",
      () => {
        const plan =
          fixturePlan();

        const result =
          evaluateFinalArticleReadinessV1({
            plan,

            articleWordCount:
              plan.lengthPlan
                .preferredMin,

            renderedSections:
              plan.sections.map(
                (section) => ({
                  sectionId:
                    section.id,

                  heading:
                    section.heading,
                })
              ),

            resolvedTopicIds: [
              "topic-1",
              "topic-2",
              "topic-3",
            ],

            resolvedQuestionIds: [
              "question-1",
            ],

            resolvedEntityIds:
              [],

            preservedEvidenceIds: [
              "evidence-1",
              "evidence-2",
            ],

            materialClaimsSupported:
              true,

            riskPolicyCompliance:
              true,

            intentComplete:
              true,

            originalValueCompliance:
              true,

            duplicateHeadingCheck:
              true,

            majorSemanticFindingCount:
              0,

            publicationPolicyPass:
              true,

            serpReplayStatus:
              "INSUFFICIENT_DATA",
          });


        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.warnings
        ).toContain(
          "SERP_REPLAY_INSUFFICIENT_COMPETITOR_DATA"
        );
      }
    );
  }
);
