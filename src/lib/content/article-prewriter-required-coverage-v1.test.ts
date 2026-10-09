import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertArticlePreWriterRequiredCoverageV1,
  inspectArticlePreWriterRequiredCoverageV1,
} from "./article-prewriter-evidence-gate-v1";


function productionFailurePlan() {
  return {
    requiredTopics: [
      {
        id:
          "topic-definition",

        priority:
          "MUST",
      },

      {
        id:
          "topic-credit-score-relationship",

        priority:
          "MUST",
      },

      {
        id:
          "topic-optional",

        priority:
          "SHOULD",
      },
    ],

    requiredQuestions: [
      {
        id:
          "question-credit-score",

        priority:
          "MUST",
      },
    ],

    sections: [
      {
        id:
          "section-1",

        state:
          "WRITABLE",

        requiredTopicIds: [
          "topic-definition",
        ],

        requiredQuestionIds:
          [],
      },

      /*
       * Exact production class:
       *
       * This section still semantically owns the MUST job,
       * but evidence contraction made it non-writable.
       *
       * A deferred owner is NOT Writer-visible coverage.
       */
      {
        id:
          "section-4",

        state:
          "DEFERRED_NO_EVIDENCE",

        requiredTopicIds: [
          "topic-credit-score-relationship",
        ],

        requiredQuestionIds: [
          "question-credit-score",
        ],
      },
    ],
  };
}


describe(
  "Article PreWriter required coverage V1",
  () => {
    it(
      "blocks when MUST topic/question exist only in deferred scope",
      () => {
        const inspection =
          inspectArticlePreWriterRequiredCoverageV1(
            productionFailurePlan()
          );

        expect(
          inspection.ready
        ).toBe(
          false
        );

        expect(
          inspection
            .missingRequiredTopicIds
        ).toEqual([
          "topic-credit-score-relationship",
        ]);

        expect(
          inspection
            .missingRequiredQuestionIds
        ).toEqual([
          "question-credit-score",
        ]);

        expect(
          () =>
            assertArticlePreWriterRequiredCoverageV1(
              productionFailurePlan()
            )
        ).toThrow(
          /ARTICLE_PREWRITER_REQUIRED_COVERAGE_LOST/
        );
      }
    );


    it(
      "passes when every MUST job has a WRITABLE owner",
      () => {
        const plan =
          productionFailurePlan();

        plan.sections.push({
          id:
            "section-recovered",

          state:
            "WRITABLE",

          requiredTopicIds: [
            "topic-credit-score-relationship",
          ],

          requiredQuestionIds: [
            "question-credit-score",
          ],
        });

        const inspection =
          inspectArticlePreWriterRequiredCoverageV1(
            plan
          );

        expect(
          inspection.ready
        ).toBe(
          true
        );

        expect(
          () =>
            assertArticlePreWriterRequiredCoverageV1(
              plan
            )
        ).not.toThrow();
      }
    );


    it(
      "does not fail for SHOULD-only lost coverage",
      () => {
        const plan =
          productionFailurePlan();

        plan.requiredTopics =
          plan.requiredTopics
            .filter(
              (topic) =>
                topic.id !==
                "topic-credit-score-relationship"
            );

        plan.requiredQuestions =
          [];

        expect(
          inspectArticlePreWriterRequiredCoverageV1(
            plan
          ).ready
        ).toBe(
          true
        );
      }
    );


    it(
      "is wired before Writer contract construction",
      () => {
        const service =
          readFileSync(
            new URL(
              "./service.ts",
              import.meta.url
            ),
            "utf8"
          );

        const gateIndex =
          service.indexOf(
            "ARTICLE_PREWRITER_REQUIRED_COVERAGE_PRODUCTION_WIRING_V1"
          );

        const writerIndex =
          service.indexOf(
            "const baseArticleGenerationContract"
          );

        expect(
          gateIndex
        ).toBeGreaterThan(
          -1
        );

        expect(
          writerIndex
        ).toBeGreaterThan(
          gateIndex
        );
      }
    );
  }
);
