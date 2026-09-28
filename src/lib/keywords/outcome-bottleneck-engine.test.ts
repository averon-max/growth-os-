import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildOutcomeBottleneckDecisionV1,
  type BottleneckLongitudinalInputV1,
  type BottleneckQueryDiagnosisInputV1,
} from "./outcome-bottleneck-engine";


function longitudinal(
  overrides:
    Partial<
      BottleneckLongitudinalInputV1
    > = {}
):
  BottleneckLongitudinalInputV1 {
  return {
    phase:
      "ESTABLISHED",

    status:
      "IMPROVING",

    bottleneck:
      "NONE",

    nextAction:
      "HOLD_AND_OBSERVE",

    latestCheckpoint:
      "DAY_28",

    ...overrides,
  };
}


function queryDiagnosis(
  overrides:
    Partial<
      BottleneckQueryDiagnosisInputV1
    > = {}
):
  BottleneckQueryDiagnosisInputV1 {
  return {
    latestCheckpoint:
      "DAY_28",

    counts: {
      WINNING:
        0,

      EMERGING:
        0,

      STRIKING_DISTANCE:
        0,

      DECAYING:
        0,

      LOST:
        0,
    },

    groups:
      [],

    ...overrides,
  };
}


describe(
  "outcome bottleneck engine v1",
  () => {
    it(
      "collects more data when longitudinal evidence is insufficient",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal({
                status:
                  "INSUFFICIENT_EVIDENCE",

                nextAction:
                  "COLLECT_MORE_DATA",

                latestCheckpoint:
                  null,
              }),

            queryOutcome:
              null,
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "INSUFFICIENT_EVIDENCE"
        );

        expect(
          result.nextBestAction
        ).toBe(
          "COLLECT_MORE_DATA"
        );
      }
    );


    it(
      "never treats early evidence as a rewrite trigger",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal({
                phase:
                  "EARLY",

                status:
                  "EARLY_SIGNAL",

                latestCheckpoint:
                  "DAY_14",
              }),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    0,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    1,

                  DECAYING:
                    0,

                  LOST:
                    0,
                },

                groups: [
                  {
                    groupId:
                      "group-1",

                    status:
                      "STRIKING_DISTANCE",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "limitations",

                    sectionHeadings: [
                      "Credit Monitoring Limitations",
                    ],

                    position:
                      14,

                    previousPosition:
                      null,

                    impressions:
                      100,

                    clicks:
                      4,
                  },
                ],
              }),
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "EARLY_OBSERVATION"
        );

        expect(
          result.nextBestAction
        ).toBe(
          "HOLD_AND_OBSERVE"
        );
      }
    );


    it(
      "keeps SERP presentation as a page-level bottleneck",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal({
                status:
                  "MIXED",

                bottleneck:
                  "SERP_PRESENTATION",

                nextAction:
                  "REVIEW_SERP_PRESENTATION",
              }),

            queryOutcome:
              null,
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "SERP_PRESENTATION"
        );

        expect(
          result.actionScope
        ).toBe(
          "PAGE"
        );
      }
    );


    it(
      "prioritizes an observed lost query group",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal(),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    0,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    0,

                  DECAYING:
                    0,

                  LOST:
                    1,
                },

                groups: [
                  {
                    groupId:
                      "group-lost",

                    status:
                      "LOST",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "limitations",

                    sectionHeadings: [
                      "Limitations",
                    ],

                    position:
                      null,

                    previousPosition:
                      14,

                    impressions:
                      null,

                    clicks:
                      null,
                  },
                ],
              }),
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "QUERY_GROUP_LOSS"
        );

        expect(
          result.nextBestAction
        ).toBe(
          "INVESTIGATE_LOST_QUERY_GROUP"
        );
      }
    );


    it(
      "maps observed decay to its existing section",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal(),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    0,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    0,

                  DECAYING:
                    1,

                  LOST:
                    0,
                },

                groups: [
                  {
                    groupId:
                      "group-decay",

                    status:
                      "DECAYING",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "comparison",

                    sectionHeadings: [
                      "Credit Monitoring vs Credit Freeze",
                    ],

                    position:
                      17,

                    previousPosition:
                      8,

                    impressions:
                      500,

                    clicks:
                      20,
                  },
                ],
              }),
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "QUERY_GROUP_DECAY"
        );

        expect(
          result.actionScope
        ).toBe(
          "SECTION"
        );

        expect(
          result
            .affectedSectionHeadings
        ).toEqual([
          "Credit Monitoring vs Credit Freeze",
        ]);
      }
    );


    it(
      "strengthens an existing section for striking-distance demand",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal(),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    0,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    1,

                  DECAYING:
                    0,

                  LOST:
                    0,
                },

                groups: [
                  {
                    groupId:
                      "group-striking",

                    status:
                      "STRIKING_DISTANCE",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "comparison",

                    sectionHeadings: [
                      "Credit Monitoring vs Credit Freeze",
                    ],

                    position:
                      17.1,

                    previousPosition:
                      22,

                    impressions:
                      1940,

                    clicks:
                      52,
                  },
                ],
              }),
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "SECTION_GAP"
        );

        expect(
          result.nextBestAction
        ).toBe(
          "STRENGTHEN_EXISTING_SECTION"
        );

        expect(
          result.actionScope
        ).toBe(
          "SECTION"
        );
      }
    );


    it(
      "does not invent a section action when section provenance is unavailable",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal(),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    0,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    1,

                  DECAYING:
                    0,

                  LOST:
                    0,
                },

                groups: [
                  {
                    groupId:
                      "group-unmapped-section",

                    status:
                      "STRIKING_DISTANCE",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "alerts",

                    sectionHeadings:
                      [],

                    position:
                      18,

                    previousPosition:
                      null,

                    impressions:
                      600,

                    clicks:
                      12,
                  },
                ],
              }),
          });


        expect(
          result.nextBestAction
        ).toBe(
          "REVIEW_QUERY_COVERAGE"
        );

        expect(
          result.actionScope
        ).toBe(
          "QUERY_GROUP"
        );
      }
    );


    it(
      "keeps healthy observed performance in hold-and-observe",
      () => {
        const result =
          buildOutcomeBottleneckDecisionV1({
            longitudinal:
              longitudinal(),

            queryOutcome:
              queryDiagnosis({
                counts: {
                  WINNING:
                    1,

                  EMERGING:
                    0,

                  STRIKING_DISTANCE:
                    0,

                  DECAYING:
                    0,

                  LOST:
                    0,
                },

                groups: [
                  {
                    groupId:
                      "group-winning",

                    status:
                      "WINNING",

                    cluster:
                      "credit monitoring",

                    subIntent:
                      "definition",

                    sectionHeadings: [
                      "What Credit Monitoring Is",
                    ],

                    position:
                      6,

                    previousPosition:
                      9,

                    impressions:
                      2000,

                    clicks:
                      200,
                  },
                ],
              }),
          });


        expect(
          result.primaryBottleneck
        ).toBe(
          "NONE"
        );

        expect(
          result.nextBestAction
        ).toBe(
          "HOLD_AND_OBSERVE"
        );

        expect(
          result
            .provenance
            .noAutoApply
        ).toBe(true);
      }
    );
  }
);
