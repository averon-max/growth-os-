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


function plan() {
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
          "decision question",

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
          "Explain.",

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
          "Answer decision.",

        requiredQuestionIds: [
          "question-1",
        ],

        state:
          "WRITABLE",
      },
    ],
  });
}


function goodWriterRun() {
  return {
    finalCritics: {
      findings:
        [],
    },

    article: {
      sections: [
        {
          sectionId:
            "section-1",

          heading:
            "Definition",

          referencedEvidenceIds: [
            "evidence-1",
          ],
        },

        {
          sectionId:
            "section-2",

          heading:
            "How It Works",

          referencedEvidenceIds: [
            "evidence-2",
          ],
        },

        {
          sectionId:
            "section-3",

          heading:
            "Limitations",

          referencedEvidenceIds:
            [],
        },

        {
          sectionId:
            "section-4",

          heading:
            "Decision",

          referencedEvidenceIds:
            [],
        },
      ],
    },
  };
}


describe(
  "production final readiness adapter",
  () => {
    it(
      "passes only when canonical production artifacts are complete",
      () => {
        const result =
          buildProductionFinalArticleReadinessV1({
            plan:
              plan(),

            writerRun:
              goodWriterRun(),

            articleBodyMarkdown:
              buildCompliantArticleBody(plan()),

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
      }
    );


    it(
      "accepts actual production SERP Replay READY instead of rejecting it as unknown",
      () => {
        const result = buildProductionFinalArticleReadinessV1({
          plan: plan(),
          writerRun: goodWriterRun(),
          articleBodyMarkdown: buildCompliantArticleBody(plan()),
          contentGatePass: true,
          publicationPolicyPass: true,
          serpReplay: { status: "READY", blockers: [] },
          serpReplayWarning: null,
        });

        expect(result.status).toBe("PASS");
        expect(result.blockers).not.toContain(
          "FINAL_READINESS_SERP_REPLAY_FAILED"
        );
      }
    );

    it(
      "blocks an actual production SERP Replay BLOCK instead of accepting it",
      () => {
        const result = buildProductionFinalArticleReadinessV1({
          plan: plan(),
          writerRun: goodWriterRun(),
          articleBodyMarkdown: buildCompliantArticleBody(plan()),
          contentGatePass: true,
          publicationPolicyPass: true,
          serpReplay: { status: "BLOCK", blockers: ["SERP_REPLAY_BLOCK"] },
          serpReplayWarning: null,
        });

        expect(result.status).toBe("FAIL");
        expect(result.blockers).toContain(
          "FINAL_READINESS_SERP_REPLAY_FAILED"
        );
      }
    );

    it(
      "fails the historical shallow 249-word shape because coverage is missing",
      () => {
        const shallowWriterRun = {
          finalCritics: {
            findings: [
              {
                severity:
                  "BLOCK",

                code:
                  "TOPIC_COVERAGE_MISSING",
              },
            ],
          },

          article: {
            sections: [
              {
                sectionId:
                  "section-1",

                heading:
                  "Definition",

                referencedEvidenceIds: [
                  "evidence-1",
                ],
              },

              {
                sectionId:
                  "section-2",

                heading:
                  "How It Works",

                referencedEvidenceIds:
                  [],
              },
            ],
          },
        };

        const body =
          Array.from(
            {
              length:
                249,
            },
            () =>
              "word"
          ).join(
            " "
          );

        const result =
          buildProductionFinalArticleReadinessV1({
            plan:
              plan(),

            writerRun:
              shallowWriterRun,

            articleBodyMarkdown:
              body,

            contentGatePass:
              true,

            publicationPolicyPass:
              true,

            serpReplay: {
              status:
                "WARN",
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
          result.diagnostics
            .wordCount
        ).toBe(
          249
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

        expect(
          result.blockers.some(
            (
              blocker
            ) =>
              blocker.startsWith(
                "FINAL_READINESS_REQUIRED_TOPIC_MISSING:"
              )
          )
        ).toBe(
          true
        );

        expect(
          result.blockers.some(
            (
              blocker
            ) =>
              blocker.startsWith(
                "FINAL_READINESS_REQUIRED_QUESTION_MISSING:"
              )
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not convert insufficient SERP data into PASS",
      () => {
        const result =
          buildProductionFinalArticleReadinessV1({
            plan:
              plan(),

            writerRun:
              goodWriterRun(),

            articleBodyMarkdown:
              buildCompliantArticleBody(plan()),

            contentGatePass:
              true,

            publicationPolicyPass:
              true,

            serpReplay:
              null,

            serpReplayWarning:
              "insufficient competitor data",
          });

        expect(
          result.status
        ).toBe(
          "WARN"
        );
      }
    );


    it(
      "fails closed when final critics cannot be proven",
      () => {
        const run =
          goodWriterRun();

        const result =
          buildProductionFinalArticleReadinessV1({
            plan:
              plan(),

            writerRun: {
              article:
                run.article,
            },

            articleBodyMarkdown:
              buildCompliantArticleBody(plan()),

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
      }
    );
  }
);
