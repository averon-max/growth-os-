import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ArticlePreWriterAnswerSupportErrorV2,
  assertArticlePreWriterAnswerSupportV2,
  inspectArticlePreWriterAnswerSupportV2,
  inspectArticlePreWriterRequiredCoverageV1,
} from "./article-prewriter-evidence-gate-v1";


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


function coverageOnlyPlan() {
  return {
    requiredTopics: [],
    requiredQuestions: [
      {
        id:
          "question-score-impact",
        priority:
          "MUST",
      },
    ],
    sections: [
      {
        state:
          "WRITABLE",
        requiredTopicIds:
          [],
        requiredQuestionIds: [
          "question-score-impact",
        ],
      },
    ],
  } as const;
}


function answerPlan({
  priority = "MUST",
  claimIds = [],
  evidenceIds = [],
}: {
  priority?: "MUST" | "SHOULD";
  claimIds?: string[];
  evidenceIds?: string[];
}) {
  return {
    requiredQuestions: [
      {
        id:
          "question-score-impact",
        priority,
      },
    ],

    sections: [
      {
        state:
          "WRITABLE",

        requiredQuestionIds: [
          "question-score-impact",
        ],

        requiredClaimIds:
          claimIds,

        evidenceIds:
          evidenceIds,
      },
    ],
  } as const;
}


describe(
  "Article PreWriter Answer Support V2",
  () => {
    it(
      "does not change legacy required-coverage semantics",
      () => {
        const inspection =
          inspectArticlePreWriterRequiredCoverageV1(
            coverageOnlyPlan()
          );

        expect(
          inspection.ready
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks MUST question when post-contraction claim/evidence disappeared",
      () => {
        const inspection =
          inspectArticlePreWriterAnswerSupportV2(
            answerPlan({})
          );

        expect(
          inspection.ready
        ).toBe(
          false
        );

        expect(
          inspection
            .unsupportedRequiredQuestionIds
        ).toEqual([
          "question-score-impact",
        ]);
      }
    );


    it(
      "passes MUST question when claim and verified evidence survive",
      () => {
        const inspection =
          inspectArticlePreWriterAnswerSupportV2(
            answerPlan({
              claimIds: [
                "claim-score-impact",
              ],

              evidenceIds: [
                "verified-excerpt-score-impact",
              ],
            })
          );

        expect(
          inspection.ready
        ).toBe(
          true
        );
      }
    );


    it(
      "does not require material claim support for SHOULD-only advisory question",
      () => {
        const inspection =
          inspectArticlePreWriterAnswerSupportV2(
            answerPlan({
              priority:
                "SHOULD",
            })
          );

        expect(
          inspection.ready
        ).toBe(
          true
        );
      }
    );


    it(
      "emits typed upstream recovery error",
      () => {
        expect(
          () =>
            assertArticlePreWriterAnswerSupportV2(
              answerPlan({})
            )
        ).toThrow(
          ArticlePreWriterAnswerSupportErrorV2
        );

        try {
          assertArticlePreWriterAnswerSupportV2(
            answerPlan({})
          );
        } catch (error) {
          const typed =
            error as
              ArticlePreWriterAnswerSupportErrorV2;

          expect(
            typed.code
          ).toBe(
            "ARTICLE_PREWRITER_REQUIRED_ANSWER_SUPPORT_LOST"
          );

          expect(
            typed
              .unsupportedRequiredQuestionIds
          ).toEqual([
            "question-score-impact",
          ]);
        }
      }
    );


    it(
      "is wired after required coverage and before ResearchPack/Writer boundary",
      () => {
        const coverage =
          service.indexOf(
            "assertArticlePreWriterRequiredCoverageV1("
          );

        const answerSupport =
          service.indexOf(
            "assertArticlePreWriterAnswerSupportV2("
          );

        const researchPack =
          service.indexOf(
            "const researchPack ="
          );

        expect(
          coverage
        ).toBeGreaterThan(
          -1
        );

        expect(
          answerSupport
        ).toBeGreaterThan(
          coverage
        );

        expect(
          researchPack
        ).toBeGreaterThan(
          answerSupport
        );
      }
    );
  }
);
