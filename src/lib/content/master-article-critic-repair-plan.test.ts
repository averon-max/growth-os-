import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  aggregateMasterArticleCriticSuiteV1,
  createMasterArticleCriticFindingV1,
  finalizeMasterArticleCriticResultV1,
  type MasterArticleCriticFindingV1,
  type MasterArticleCriticId,
} from "./master-article-critic";

import {
  assertMasterArticleCriticRepairPlanExecutableV1,
  buildMasterArticleCriticRepairPlanV1,
  classifyMasterArticleCriticFindingRepairabilityV1,
} from "./master-article-critic-repair-plan";


function contract():
ArticleGenerationContractV1 {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    h1Mission:
      "Explain credit monitoring.",

    sectionContracts: [
      {
        version:
          "SECTION_GENERATION_CONTRACT_V1",

        sectionIndex:
          0,

        sectionNumber:
          1,

        blueprint: {
          heading:
            "How Credit Monitoring Works",
        },
      },

      {
        version:
          "SECTION_GENERATION_CONTRACT_V1",

        sectionIndex:
          1,

        sectionNumber:
          2,

        blueprint: {
          heading:
            "What Monitoring Cannot Do",
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


function sectionFinding({
  criticId = "EDITORIAL",
  code = "WEAK_EXPLANATION",
  severity = "BLOCK",
  sectionIndex = 0,
  sectionNumber = 1,
  heading = "How Credit Monitoring Works",
}: {
  criticId?:
    MasterArticleCriticId;

  code?:
    string;

  severity?:
    "WARN" | "BLOCK";

  sectionIndex?:
    number;

  sectionNumber?:
    number;

  heading?:
    string;
} = {}):
MasterArticleCriticFindingV1 {
  return createMasterArticleCriticFindingV1({
    criticId,

    code,

    severity,

    location: {
      scope:
        "SECTION",

      sectionIndex,

      sectionNumber,

      heading,
    },

    message:
      "Localized issue.",

    recommendation:
      "Repair this section only.",

    repairScope:
      "SECTION",
  });
}


function articleBlock({
  criticId,
  code,
}: {
  criticId:
    MasterArticleCriticId;

  code:
    string;
}):
MasterArticleCriticFindingV1 {
  return createMasterArticleCriticFindingV1({
    criticId,

    code,

    severity:
      "BLOCK",

    location: {
      scope:
        "ARTICLE",
    },

    message:
      "Upstream blocker.",

    recommendation:
      "Fix authoritative inputs.",

    repairScope:
      "NONE",
  });
}


function suite(
  findings:
    readonly MasterArticleCriticFindingV1[]
) {
  const ids:
    MasterArticleCriticId[] = [
      "INTENT",
      "COVERAGE",
      "EVIDENCE_YMYL",
      "ORIGINALITY",
      "EDITORIAL",
      "SEMANTIC_DRIFT",
      "CANNIBALIZATION",
      "INTERNAL_LINKS",
      "TECHNICAL_SEO",
    ];


  return aggregateMasterArticleCriticSuiteV1({
    results:
      ids.map(
        (
          criticId
        ) =>
          finalizeMasterArticleCriticResultV1({
            criticId,

            findings:
              findings.filter(
                (
                  finding
                ) =>
                  finding.criticId ===
                  criticId
              ),
          })
      ),
  });
}


describe(
  "Master Article Critic Repair Plan V1",
  () => {
    it(
      "classifies localized editorial defect as section repairable",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            sectionFinding()
          );


        expect(
          result.repairability
        ).toBe(
          "REPAIRABLE_SECTION"
        );
      }
    );


    it(
      "classifies localized deep intent defect as repairable",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            sectionFinding({
              criticId:
                "INTENT",

              code:
                "SECTION_INTENT_MISS",
            })
          );


        expect(
          result.repairability
        ).toBe(
          "REPAIRABLE_SECTION"
        );
      }
    );


    it(
      "never repairs insufficient originality context",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            articleBlock({
              criticId:
                "ORIGINALITY",

              code:
                "ORIGINALITY_INSUFFICIENT_CONTEXT",
            })
          );


        expect(
          result.repairability
        ).toBe(
          "UNREPAIRABLE_CONTEXT"
        );
      }
    );


    it(
      "never repairs insufficient cannibalization context",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            articleBlock({
              criticId:
                "CANNIBALIZATION",

              code:
                "CANNIBALIZATION_INSUFFICIENT_CONTEXT",
            })
          );


        expect(
          result.repairability
        ).toBe(
          "UNREPAIRABLE_CONTEXT"
        );
      }
    );


    it(
      "never asks the writer to repair evidence/YMYL authority",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            sectionFinding({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "VERIFIED_SUPPORT_MISSING",
            })
          );


        expect(
          result.repairability
        ).toBe(
          "UNREPAIRABLE_EVIDENCE"
        );
      }
    );


    it(
      "never hides a cannibalization conflict with text repair",
      () => {
        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            sectionFinding({
              criticId:
                "CANNIBALIZATION",

              code:
                "OVERLAPPING_PAGE_PURPOSE",
            })
          );


        expect(
          result.repairability
        ).toBe(
          "UNREPAIRABLE_CANNIBALIZATION"
        );
      }
    );


    it(
      "groups multiple repairable findings by exact section",
      () => {
        const plan =
          buildMasterArticleCriticRepairPlanV1({
            contract:
              contract(),

            suite:
              suite([
                sectionFinding({
                  criticId:
                    "EDITORIAL",

                  code:
                    "WEAK_EXPLANATION",
                }),

                sectionFinding({
                  criticId:
                    "SEMANTIC_DRIFT",

                  code:
                    "MISSION_DRIFT",
                }),

                sectionFinding({
                  criticId:
                    "COVERAGE",

                  code:
                    "QUERY_NOT_COVERED",

                  sectionIndex:
                    1,

                  sectionNumber:
                    2,

                  heading:
                    "What Monitoring Cannot Do",
                }),
              ]),
          });


        expect(
          plan.disposition
        ).toBe(
          "REPAIR_REQUIRED"
        );

        expect(
          plan.repairTasks
        ).toHaveLength(
          2
        );

        expect(
          plan.repairTasks[
            0
          ]?.findings
        ).toHaveLength(
          2
        );

        expect(
          plan.repairTasks[
            1
          ]?.findings
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "fails closed before any repair when one BLOCK is upstream-unrepairable",
      () => {
        const plan =
          buildMasterArticleCriticRepairPlanV1({
            contract:
              contract(),

            suite:
              suite([
                sectionFinding(),

                articleBlock({
                  criticId:
                    "ORIGINALITY",

                  code:
                    "ORIGINALITY_INSUFFICIENT_CONTEXT",
                }),
              ]),
          });


        expect(
          plan.disposition
        ).toBe(
          "BLOCK_UNREPAIRABLE"
        );

        expect(
          plan
            .blockingUnrepairableFindings
        ).toHaveLength(
          1
        );


        expect(
          () =>
            assertMasterArticleCriticRepairPlanExecutableV1(
              plan
            )
        ).toThrow(
          "MASTER_CRITIC_REPAIR_BLOCKED_UNREPAIRABLE"
        );
      }
    );


    it(
      "rejects forged section provenance",
      () => {
        expect(
          () =>
            buildMasterArticleCriticRepairPlanV1({
              contract:
                contract(),

              suite:
                suite([
                  sectionFinding({
                    heading:
                      "Invented Heading",
                  }),
                ]),
            })
        ).toThrow(
          "MASTER_CRITIC_REPAIR_SECTION_PROVENANCE_MISMATCH"
        );
      }
    );


    it(
      "returns NO_REPAIR_NEEDED for a clean suite",
      () => {
        const plan =
          buildMasterArticleCriticRepairPlanV1({
            contract:
              contract(),

            suite:
              suite(
                []
              ),
          });


        expect(
          plan.disposition
        ).toBe(
          "NO_REPAIR_NEEDED"
        );

        expect(
          plan.repairTasks
        ).toEqual(
          []
        );
      }
    );


    it(
      "keeps repairable WARN findings diagnostic without spending a repair call",
      () => {
        const plan =
          buildMasterArticleCriticRepairPlanV1({
            contract:
              contract(),

            suite:
              suite([
                sectionFinding({
                  severity:
                    "WARN",

                  criticId:
                    "EDITORIAL",

                  code:
                    "REDUNDANT_PROSE",
                }),
              ]),
          });


        expect(
          plan.disposition
        ).toBe(
          "NO_REPAIR_NEEDED"
        );


        expect(
          plan.repairTasks
        ).toEqual(
          []
        );


        expect(
          plan
            .blockingUnrepairableFindings
        ).toEqual(
          []
        );
      }
    );

    it(
      "freezes repair plan and section tasks",
      () => {
        const plan =
          buildMasterArticleCriticRepairPlanV1({
            contract:
              contract(),

            suite:
              suite([
                sectionFinding(),
              ]),
          });


        expect(
          Object.isFrozen(
            plan
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            plan.repairTasks
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            plan.repairTasks[
              0
            ]
          )
        ).toBe(
          true
        );
      }
    );
  }
);
