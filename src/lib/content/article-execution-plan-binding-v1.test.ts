import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  ArticleExecutionPlanBindingErrorV1,
  bindArticleExecutionPlanToGenerationContractV1,
  parsePersistedArticleExecutionPlanV1,
} from "./article-execution-plan-binding-v1";

import {
  buildMasterSectionPrompt,
} from "./master-section-prompt";


function plan() {
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
          "how does it work",

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
          "Define the topic.",

        requiredTopicIds: [
          "topic-1",
        ],

        requiredQuestionIds: [
          "question-1",
        ],

        requiredClaimIds: [
          "claim-1",
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
          [],

        state:
          "DEFERRED_NO_EVIDENCE",
      },
    ],
  });
}


function contract():
Readonly<ArticleGenerationContractV1> {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    h1Mission:
      "Answer the query.",

    sectionContracts: [
      {
        version:
          "SECTION_GENERATION_CONTRACT_V1",

        sectionIndex:
          0,

        sectionNumber:
          1,

        totalSections:
          1,

        blueprint: {
          heading:
            "Definition",

          mission:
            "Define the topic.",

          requiredClaims: [
            "claim-1",
          ],

          evidenceIds: [
            "evidence-1",
          ],
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


describe(
  "ArticleExecutionPlan -> existing Master Writer binding",
  () => {
    it(
      "binds only WRITABLE sections and preserves exact ownership + depth authority",
      () => {
        const bound =
          bindArticleExecutionPlanToGenerationContractV1({
            plan:
              plan(),

            contract:
              contract(),
          });


        expect(
          bound.sectionContracts
            .length
        ).toBe(
          1
        );


        const authority =
          bound.sectionContracts[
            0
          ]
            .executionPlanAuthority;


        expect(
          authority.sectionId
        ).toBe(
          "section-1"
        );


        expect(
          authority.requiredTopics
        ).toEqual([
          {
            id:
              "topic-1",

            label:
              "definition",
          },
        ]);


        expect(
          authority.requiredQuestions
        ).toEqual([
          {
            id:
              "question-1",

            label:
              "how does it work",
          },
        ]);


        expect(
          authority.requiredClaimIds
        ).toEqual([
          "claim-1",
        ]);


        expect(
          authority.evidenceIds
        ).toEqual([
          "evidence-1",
        ]);


        expect(
          authority.targetWords
            .preferred
        ).toBeGreaterThan(
          authority.targetWords
            .min
        );
      }
    );


    it(
      "fails before Writer when section count shrinks unexpectedly",
      () => {
        const badContract = {
          ...contract(),

          sectionContracts:
            [],
        } as unknown as
          ArticleGenerationContractV1;


        expect(
          () =>
            bindArticleExecutionPlanToGenerationContractV1({
              plan:
                plan(),

              contract:
                badContract,
            })
        ).toThrow(
          ArticleExecutionPlanBindingErrorV1
        );


        expect(
          () =>
            bindArticleExecutionPlanToGenerationContractV1({
              plan:
                plan(),

              contract:
                badContract,
            })
        ).toThrow(
          /ARTICLE_EXECUTION_PLAN_WRITER_SECTION_COUNT_MISMATCH/
        );
      }
    );


    it(
      "fails on heading drift instead of pairing the wrong information job",
      () => {
        const original =
          contract();

        const bad = {
          ...original,

          sectionContracts: [
            {
              ...original
                .sectionContracts[
                  0
                ],

              blueprint: {
                ...original
                  .sectionContracts[
                    0
                  ]
                  .blueprint,

                heading:
                  "Different Heading",
              },
            },
          ],
        } as unknown as
          ArticleGenerationContractV1;


        expect(
          () =>
            bindArticleExecutionPlanToGenerationContractV1({
              plan:
                plan(),

              contract:
                bad,
            })
        ).toThrow(
          /ARTICLE_EXECUTION_PLAN_WRITER_HEADING_MISMATCH/
        );
      }
    );


    it(
      "fails on claim/evidence drift",
      () => {
        const original =
          contract();

        const bad = {
          ...original,

          sectionContracts: [
            {
              ...original
                .sectionContracts[
                  0
                ],

              blueprint: {
                ...original
                  .sectionContracts[
                    0
                  ]
                  .blueprint,

                evidenceIds:
                  [],
              },
            },
          ],
        } as unknown as
          ArticleGenerationContractV1;


        expect(
          () =>
            bindArticleExecutionPlanToGenerationContractV1({
              plan:
                plan(),

              contract:
                bad,
            })
        ).toThrow(
          /ARTICLE_EXECUTION_PLAN_WRITER_EVIDENCE_DRIFT/
        );
      }
    );


    it(
      "survives JSON persistence without reconstructing coverage",
      () => {
        const original =
          plan();

        const persisted =
          JSON.parse(
            JSON.stringify(
              original
            )
          );


        const parsed =
          parsePersistedArticleExecutionPlanV1(
            persisted
          );


        expect(
          parsed
        ).toEqual(
          original
        );
      }
    );


    it(
      "exposes coverage labels and soft targetWords to the existing section Writer prompt",
      () => {
        const bound =
          bindArticleExecutionPlanToGenerationContractV1({
            plan:
              plan(),

            contract:
              contract(),
          });


        const prompt =
          buildMasterSectionPrompt(
            bound.sectionContracts[
              0
            ]
          );


        expect(
          prompt
        ).toContain(
          "executionPlanAuthority"
        );

        expect(
          prompt
        ).toContain(
          "definition"
        );

        expect(
          prompt
        ).toContain(
          "how does it work"
        );

        expect(
          prompt
        ).toContain(
          "targetWords"
        );

        expect(
          prompt
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_DEPTH_POLICY_V1"
        );

        expect(
          prompt
        ).toContain(
          "SOFT editorial depth budget"
        );
      }
    );
  }
);
