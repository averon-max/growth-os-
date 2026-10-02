import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildProductionFinalArticleReadinessV1,
} from "./production-final-article-readiness-adapter-v1";


describe(
  "Final Readiness real Master Writer shape V1",
  () => {
    it(
      "maps provenance.sectionIndex to execution-plan IDs and consumes separate final critics",
      () => {
        const plan = {
          requiredTopics: [
            {
              id:
                "topic-1",

              priority:
                "MUST",
            },
          ],

          requiredQuestions: [
            {
              id:
                "question-1",

              priority:
                "MUST",
            },
          ],

          requiredEntities:
            [],

          sections: [
            {
              id:
                "section-1",

              heading:
                "Definition",

              state:
                "WRITABLE",

              requiredTopicIds: [
                "topic-1",
              ],

              requiredQuestionIds:
                [],

              requiredEntityIds:
                [],

              evidenceIds: [
                "evidence-1",
              ],
            },

            {
              id:
                "section-2",

              heading:
                "Decision",

              state:
                "WRITABLE",

              requiredTopicIds:
                [],

              requiredQuestionIds: [
                "question-1",
              ],

              requiredEntityIds:
                [],

              evidenceIds:
                [],
            },
          ],
        } as any;


        const sections = [
          {
            version:
              "GENERATED_SECTION_V1",

            heading:
              "Definition",

            bodyMarkdown:
              "Credit monitoring watches for relevant changes.",

            referencedEvidenceIds: [
              "evidence-1",
            ],

            provenance: {
              sectionIndex:
                0,
            },
          },

          {
            version:
              "GENERATED_SECTION_V1",

            heading:
              "Decision",

            bodyMarkdown:
              "The decision depends on the alerts a person needs.",

            referencedEvidenceIds:
              [],

            provenance: {
              sectionIndex:
                1,
            },
          },
        ];


        const result =
          buildProductionFinalArticleReadinessV1({
            plan,

            writerRun: {
              version:
                "MASTER_WRITER_RUN_V1",

              sections,

              article: {
                sections,

                referencedEvidenceIds: [
                  "evidence-1",
                ],
              },
            },

            finalCritics: {
              version:
                "MASTER_ARTICLE_CRITIC_EXECUTION_V1",

              suite: {
                status:
                  "WARN",

                findings: [
                  {
                    severity:
                      "WARN",

                    code:
                      "NON_BLOCKING_WARNING",
                  },
                ],

                counts: {
                  findings:
                    1,

                  warnFindings:
                    1,

                  blockFindings:
                    0,
                },
              },
            },

            articleBodyMarkdown: [
              "## Definition",
              "",
              "Credit monitoring watches for relevant changes.",
              "",
              "## Decision",
              "",
              "The decision depends on the alerts a person needs.",
            ].join(
              "\n"
            ),

            contentGatePass:
              true,

            publicationPolicyPass:
              true,

            serpReplay:
              null,

            serpReplayWarning:
              null,
          });


        expect(
          result.diagnostics
            .renderedSections
        ).toBe(
          2
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "WRITER_SECTION_LOSS:"
              )
          )
        ).toBe(
          false
        );


        expect(
          result.blockers
        ).not.toContain(
          "FINAL_READINESS_REQUIRED_TOPIC_MISSING:topic-1"
        );


        expect(
          result.blockers
        ).not.toContain(
          "FINAL_READINESS_REQUIRED_QUESTION_MISSING:question-1"
        );


        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_MAJOR_SEMANTIC_FINDINGS:"
              )
          )
        ).toBe(
          false
        );


        expect(
          result.status
        ).not.toBe(
          "FAIL"
        );
      }
    );
  }
);
