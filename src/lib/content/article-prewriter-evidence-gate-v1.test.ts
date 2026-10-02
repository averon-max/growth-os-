import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  assertArticlePreWriterEvidenceReadyV1,
  inspectArticlePreWriterEvidenceV1,
} from "./article-prewriter-evidence-gate-v1";


function plan(
  deferred:
    boolean
) {
  return buildArticleExecutionPlanV1({
    websiteId:
      "site",

    topic:
      "generic topic",

    primaryQuery:
      "generic query",

    intent:
      "INFORMATIONAL",

    pageType:
      "EXPLAINER",

    riskClass:
      "STANDARD",

    pageAction:
      "CREATE",

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
          "limitations",

        priority:
          "MUST",
      },
    ],

    requiredQuestions:
      [],

    sections: [
      {
        id:
          "section-1",

        heading:
          "Definition",

        level:
          2,

        mission:
          "Define the topic.",

        requiredTopicIds: [
          "topic-1",
        ],

        requiredClaimIds: [
          "claim-1",
        ],

        evidenceIds: [
          "ev-1",
        ],

        state:
          "WRITABLE",
      },

      {
        id:
          "section-2",

        heading:
          "Limitations",

        level:
          2,

        mission:
          "Explain limitations.",

        requiredTopicIds: [
          "topic-2",
        ],

        requiredClaimIds: [
          "claim-2",
        ],

        evidenceIds:
          deferred
            ? []
            : [
                "ev-2",
              ],

        state:
          deferred
            ? "DEFERRED_NO_EVIDENCE"
            : "WRITABLE",
      },
    ],
  });
}


describe(
  "ARTICLE_PREWRITER_EVIDENCE_GATE_V1",
  () => {
    it(
      "blocks deferred MUST coverage before Writer",
      () => {
        const result =
          inspectArticlePreWriterEvidenceV1(
            plan(
              true
            )
          );

        expect(
          result.ready
        ).toBe(
          false
        );

        expect(
          result
            .deferredRequiredSectionIds
        ).toEqual([
          "section-2",
        ]);

        expect(
          () =>
            assertArticlePreWriterEvidenceReadyV1(
              plan(
                true
              )
            )
        ).toThrow(
          /ARTICLE_PREWRITER_REQUIRED_EVIDENCE_DEFERRED/
        );
      }
    );


    it(
      "allows complete writable plan",
      () => {
        expect(
          () =>
            assertArticlePreWriterEvidenceReadyV1(
              plan(
                false
              )
            )
        ).not.toThrow();
      }
    );
  }
);
