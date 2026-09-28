import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  buildCompetitiveReplayRepairPlanV2,
} from "./competitive-serp-replay-repair-plan-v2";


function contract():
Readonly<
  ArticleGenerationContractV1
> {
  return {
    sectionContracts: [
      {
        sectionIndex:
          0,

        sectionNumber:
          1,

        blueprint: {
          heading:
            "Setup",

          evidenceIds: [
            "ev-setup",
          ],
        },
      },

      {
        sectionIndex:
          1,

        sectionNumber:
          2,

        blueprint: {
          heading:
            "Security",

          evidenceIds: [
            "ev-security",
          ],
        },
      },
    ],
  } as unknown as ArticleGenerationContractV1;
}


describe(
  "Competitive SERP Replay Repair Plan V2",
  () => {
    it(
      "localizes a losing dimension through existing section evidence",
      () => {
        const plan =
          buildCompetitiveReplayRepairPlanV2({
            contract:
              contract(),

            replay: {
              status:
                "BLOCK",

              comparisons: [
                {
                  competitor: {
                    url:
                      "https://competitor.example/guide",
                  },

                  verdict:
                    "COMPETITOR_STRONGER",

                  blockingDimensions: [
                    "EVIDENCE",
                  ],

                  dimensions: [
                    {
                      dimension:
                        "EVIDENCE",

                      verdict:
                        "COMPETITOR_STRONGER",

                      reason:
                        "Competitor supports the security explanation more clearly.",

                      articleEvidenceIds: [
                        "ev-security",
                      ],

                      competitorEvidenceIds: [
                        "competitor-source",
                      ],
                    },
                  ],
                },
              ],
            },
          });


        expect(
          plan.disposition
        ).toBe(
          "REPAIRABLE_SECTIONS"
        );


        expect(
          plan.tasks
        ).toHaveLength(
          1
        );


        expect(
          plan.tasks[0]
            ?.sectionIndex
        ).toBe(
          1
        );


        expect(
          plan.tasks[0]
            ?.heading
        ).toBe(
          "Security"
        );


        expect(
          plan.tasks[0]
            ?.dimensions
        ).toEqual([
          "EVIDENCE",
        ]);
      }
    );


    it(
      "refuses to guess a section without an evidence bridge",
      () => {
        const plan =
          buildCompetitiveReplayRepairPlanV2({
            contract:
              contract(),

            replay: {
              status:
                "BLOCK",

              comparisons: [
                {
                  competitor: {
                    url:
                      "https://competitor.example/guide",
                  },

                  blockingDimensions: [
                    "COVERAGE",
                  ],

                  dimensions: [
                    {
                      dimension:
                        "COVERAGE",

                      verdict:
                        "COMPETITOR_STRONGER",

                      reason:
                        "Competitor covers an information job more completely.",

                      articleEvidenceIds:
                        [],
                    },
                  ],
                },
              ],
            },
          });


        expect(
          plan.disposition
        ).toBe(
          "BLOCK_UNLOCALIZED"
        );


        expect(
          plan.tasks
        ).toHaveLength(
          0
        );


        expect(
          plan.unlocalized
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "refuses ambiguous evidence ownership",
      () => {
        const ambiguous =
          {
            sectionContracts: [
              {
                sectionIndex:
                  0,

                sectionNumber:
                  1,

                blueprint: {
                  heading:
                    "One",

                  evidenceIds: [
                    "ev-shared",
                  ],
                },
              },

              {
                sectionIndex:
                  1,

                sectionNumber:
                  2,

                blueprint: {
                  heading:
                    "Two",

                  evidenceIds: [
                    "ev-shared",
                  ],
                },
              },
            ],
          } as unknown as
            ArticleGenerationContractV1;


        const plan =
          buildCompetitiveReplayRepairPlanV2({
            contract:
              ambiguous,

            replay: {
              status:
                "BLOCK",

              comparisons: [
                {
                  competitor: {
                    url:
                      "https://competitor.example",
                  },

                  blockingDimensions: [
                    "EVIDENCE",
                  ],

                  dimensions: [
                    {
                      dimension:
                        "EVIDENCE",

                      verdict:
                        "COMPETITOR_STRONGER",

                      reason:
                        "Evidence weaker.",

                      articleEvidenceIds: [
                        "ev-shared",
                      ],
                    },
                  ],
                },
              ],
            },
          });


        expect(
          plan.disposition
        ).toBe(
          "BLOCK_UNLOCALIZED"
        );

        expect(
          plan.tasks
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "does nothing when replay is READY",
      () => {
        const plan =
          buildCompetitiveReplayRepairPlanV2({
            contract:
              contract(),

            replay: {
              status:
                "READY",

              comparisons:
                [],
            },
          });


        expect(
          plan.disposition
        ).toBe(
          "NO_REPAIR_NEEDED"
        );

        expect(
          plan.tasks
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "does not turn insufficient context into a repair",
      () => {
        const plan =
          buildCompetitiveReplayRepairPlanV2({
            contract:
              contract(),

            replay: {
              status:
                "INSUFFICIENT_CONTEXT",
            },
          });


        expect(
          plan.disposition
        ).toBe(
          "INSUFFICIENT_CONTEXT"
        );
      }
    );
  }
);
