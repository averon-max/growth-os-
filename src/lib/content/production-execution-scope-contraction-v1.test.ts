import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectArticlePreWriterEvidenceV1,
} from "./article-prewriter-evidence-gate-v1";

import type {
  ArticleExecutionPlanV1,
} from "./article-execution-plan-v1";


const planner =
  readFileSync(
    "src/lib/content/production-master-live-stage-planner.ts",
    "utf8"
  );


function plan({
  topicPriority,
}: {
  topicPriority:
    "MUST" | "SHOULD";
}): ArticleExecutionPlanV1 {
  return {
    version:
      "ARTICLE_EXECUTION_PLAN_V1",

    websiteId:
      "website-1",

    topic:
      "what is credit monitoring",

    primaryQuery:
      "what is credit monitoring",

    intent:
      "INFORMATIONAL",

    pageType:
      "ARTICLE",

    riskClass:
      "MEDIUM",

    pageAction:
      "CREATE",

    requiredTopics: [
      {
        id:
          "topic-required",

        label:
          "Definition",

        priority:
          "MUST",
      },

      {
        id:
          "topic-optional",

        label:
          "Comparison",

        priority:
          topicPriority,
      },
    ],

    requiredQuestions:
      [],

    requiredEntities:
      [],

    verifiedEvidenceIds: [
      "evidence-definition",
    ],

    lengthPlan: {
      preferredMin:
        200,

      preferredMax:
        520,

      rationale:
        "test fixture",
    },

    sections: [
      {
        id:
          "section-1",

        heading:
          "What is credit monitoring?",

        level:
          2,

        mission:
          "Define the topic.",

        requiredTopicIds: [
          "topic-required",
        ],

        requiredQuestionIds:
          [],

        requiredEntityIds:
          [],

        requiredClaimIds: [
          "claim-definition",
        ],

        evidenceIds: [
          "evidence-definition",
        ],

        targetWords: {
          min:
            100,

          preferred:
            180,

          max:
            260,
        },

        state:
          "WRITABLE",
      },

      {
        id:
          "section-2",

        heading:
          "How it differs",

        level:
          2,

        mission:
          "Provide an optional comparison.",

        requiredTopicIds: [
          "topic-optional",
        ],

        requiredQuestionIds:
          [],

        requiredEntityIds:
          [],

        requiredClaimIds:
          [],

        evidenceIds:
          [],

        targetWords: {
          min:
            100,

          preferred:
            180,

          max:
            260,
        },

        state:
          "DEFERRED_NO_EVIDENCE",
      },
    ],
  } as ArticleExecutionPlanV1;
}


describe(
  "production execution scope contraction V1",
  () => {
    it(
      "wires template semantic roles into MUST/SHOULD coverage",
      () => {
        expect(
          planner
        ).toContain(
          "TEMPLATE_ROLE_COVERAGE_PRIORITY_V1"
        );

        expect(
          planner
        ).toContain(
          "requiredTemplateRoleIds"
        );

        expect(
          planner
        ).toContain(
          "topicPriorityByLabel.get"
        );

        expect(
          planner
        ).toContain(
          "questionPriorityByLabel.get"
        );

        /*
         * Missing ownership remains fail-closed.
         */
        /*
         * EVIDENCE_AWARE_COVERAGE_OWNERSHIP_V1
         *
         * The old implementation asserted the literal fallback
         * expression used while every unresolved ownership job
         * remained MUST.
         *
         * Production now preserves that fail-closed default through
         * plannedTopicPriorityV1/plannedQuestionPriorityV1 while
         * allowing only a secondary evidence-orphaned MUST job to
         * contract to SHOULD.
         *
         * Primary section ownership remains protected.
         */
        expect(
          planner
        ).toContain(
          "EVIDENCE_AWARE_COVERAGE_OWNERSHIP_V1"
        );

        expect(
          planner
        ).toContain(
          "plannedTopicPriorityV1"
        );

        expect(
          planner
        ).toContain(
          "plannedQuestionPriorityV1"
        );

        expect(
          planner
        ).toContain(
          "resolveExecutionTopicPriorityV1"
        );

        expect(
          planner
        ).toContain(
          "resolveExecutionQuestionPriorityV1"
        );

        expect(
          planner
        ).toContain(
          '"section-1"'
        );

        expect(
          planner
        ).toContain(
          '"MUST";'
        );
      }
    );


    it(
      "contracts post-evidence section claims instead of deferring a mixed supported section",
      () => {
        expect(
          planner
        ).toContain(
          "EVIDENCE_AWARE_EXECUTION_SCOPE_CONTRACTION_V1"
        );

        expect(
          planner
        ).toContain(
          "plannedRequiredClaimIds"
        );

        expect(
          planner
        ).toContain(
          "unsupportedRequiredClaimIds"
        );

        expect(
          planner
        ).toContain(
          "hasNoVerifiedRequiredClaim"
        );

        expect(
          planner
        ).not.toContain(
          "hasUnsupportedRequiredClaim"
        );
      }
    );


    it(
      "allows a deferred SHOULD-only section while preserving a writable MUST section",
      () => {
        const result =
          inspectArticlePreWriterEvidenceV1(
            plan({
              topicPriority:
                "SHOULD",
            })
          );

        expect(
          result.ready
        ).toBe(
          true
        );

        expect(
          result.writableSectionCount
        ).toBe(
          1
        );

        expect(
          result.deferredRequiredSectionIds
        ).toEqual(
          []
        );
      }
    );


    it(
      "still blocks the exact same deferred section when its owned topic is MUST",
      () => {
        const result =
          inspectArticlePreWriterEvidenceV1(
            plan({
              topicPriority:
                "MUST",
            })
          );

        expect(
          result.ready
        ).toBe(
          false
        );

        expect(
          result.deferredRequiredSectionIds
        ).toEqual([
          "section-2",
        ]);
      }
    );
  }
);
