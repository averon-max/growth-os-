import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildLongitudinalOutcomeDiagnosisV1,
  type LongitudinalOutcomeBaselineV1,
  type LongitudinalOutcomeObservationV1,
} from "./outcome-longitudinal-learning";


function baseline(
  overrides:
    Partial<LongitudinalOutcomeBaselineV1> = {}
):
  LongitudinalOutcomeBaselineV1 {
  return {
    liveRank:
      null,

    liveRankState:
      "NOT_TOP_100",

    impressions:
      0,

    clicks:
      0,

    ctr:
      null,

    averagePosition:
      null,

    ...overrides,
  };
}


function observation(
  checkpoint:
    LongitudinalOutcomeObservationV1["checkpoint"],
  overrides:
    Partial<LongitudinalOutcomeObservationV1> = {}
):
  LongitudinalOutcomeObservationV1 {
  return {
    checkpoint,

    source:
      "COMBINED",

    liveRank:
      null,

    liveRankState:
      "NOT_TOP_100",

    impressions:
      0,

    clicks:
      0,

    ctr:
      null,

    averagePosition:
      null,

    ...overrides,
  };
}


describe(
  "longitudinal outcome learning v1",
  () => {
    it(
      "fails safely when no checkpoint evidence exists",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline(),

            observations:
              [],
          });

        expect(
          result.status
        ).toBe(
          "INSUFFICIENT_EVIDENCE"
        );

        expect(
          result.nextAction
        ).toBe(
          "COLLECT_MORE_DATA"
        );

        expect(
          result.latestCheckpoint
        ).toBeNull();

        expect(
          result.provenance.noCausalInference
        ).toBe(true);

        expect(
          result.provenance.noSeoScore
        ).toBe(true);
      }
    );


    it(
      "treats D7 and D14 as early signal rather than a rewrite trigger",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline(),

            observations: [
              observation(
                "DAY_14",
                {
                  liveRank:
                    42,

                  liveRankState:
                    "FOUND",

                  impressions:
                    180,

                  clicks:
                    8,

                  ctr:
                    0.044,

                  averagePosition:
                    36.2,
                }
              ),
            ],
          });

        expect(
          result.phase
        ).toBe(
          "EARLY"
        );

        expect(
          result.status
        ).toBe(
          "EARLY_SIGNAL"
        );

        expect(
          result.nextAction
        ).toBe(
          "HOLD_AND_OBSERVE"
        );
      }
    );


    it(
      "recognizes improving established search outcomes",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline({
                liveRank:
                  44,

                liveRankState:
                  "FOUND",

                impressions:
                  100,

                clicks:
                  4,

                ctr:
                  0.04,

                averagePosition:
                  38,
              }),

            observations: [
              observation(
                "DAY_28",
                {
                  liveRank:
                    19,

                  liveRankState:
                    "FOUND",

                  impressions:
                    420,

                  clicks:
                    24,

                  ctr:
                    0.057,

                  averagePosition:
                    21,
                }
              ),
            ],
          });

        expect(
          result.status
        ).toBe(
          "IMPROVING"
        );

        expect(
          result.bottleneck
        ).toBe(
          "NONE"
        );

        expect(
          result.nextAction
        ).toBe(
          "HOLD_AND_OBSERVE"
        );

        expect(
          result.trends.rankFromBaseline
        ).toBe(
          "IMPROVED"
        );

        expect(
          result.trends.impressionsFromBaseline
        ).toBe(
          "INCREASED"
        );
      }
    );


    it(
      "detects a SERP presentation pattern without claiming causation",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline({
                impressions:
                  100,

                clicks:
                  10,

                ctr:
                  0.1,
              }),

            observations: [
              observation(
                "DAY_28",
                {
                  impressions:
                    300,

                  clicks:
                    10,

                  ctr:
                    0.033,
                }
              ),
            ],
          });

        expect(
          result.status
        ).toBe(
          "MIXED"
        );

        expect(
          result.bottleneck
        ).toBe(
          "SERP_PRESENTATION"
        );

        expect(
          result.nextAction
        ).toBe(
          "REVIEW_SERP_PRESENTATION"
        );

        expect(
          result.provenance.noCausalInference
        ).toBe(true);
      }
    );


    it(
      "treats long-horizon no-visibility as an investigation target, not a ranking prediction",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline(),

            observations: [
              observation(
                "DAY_28"
              ),

              observation(
                "DAY_60"
              ),

              observation(
                "DAY_90"
              ),
            ],
          });

        expect(
          result.phase
        ).toBe(
          "LONG_HORIZON"
        );

        expect(
          result.status
        ).toBe(
          "STALLED"
        );

        expect(
          result.bottleneck
        ).toBe(
          "SEARCH_VISIBILITY"
        );

        expect(
          result.nextAction
        ).toBe(
          "INVESTIGATE_VISIBILITY"
        );
      }
    );


    it(
      "detects a mature decline from observed rank and search demand",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline({
                liveRank:
                  9,

                liveRankState:
                  "FOUND",

                impressions:
                  1000,

                clicks:
                  100,

                ctr:
                  0.1,

                averagePosition:
                  8.5,
              }),

            observations: [
              observation(
                "DAY_60",
                {
                  liveRank:
                    24,

                  liveRankState:
                    "FOUND",

                  impressions:
                    550,

                  clicks:
                    38,

                  ctr:
                    0.069,

                  averagePosition:
                    21.2,
                }
              ),
            ],
          });

        expect(
          result.status
        ).toBe(
          "DECLINING"
        );

        expect(
          result.nextAction
        ).toBe(
          "INVESTIGATE_DECLINE"
        );

        expect(
          result.trends.rankFromBaseline
        ).toBe(
          "DECLINED"
        );

        expect(
          result.trends.impressionsFromBaseline
        ).toBe(
          "DECREASED"
        );
      }
    );


    it(
      "keeps unavailable observations distinct from zero evidence",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline({
                liveRank:
                  null,

                liveRankState:
                  "UNAVAILABLE",

                impressions:
                  null,

                clicks:
                  null,

                ctr:
                  null,

                averagePosition:
                  null,
              }),

            observations: [
              observation(
                "DAY_28",
                {
                  source:
                    "NO_DATA",

                  liveRank:
                    null,

                  liveRankState:
                    "UNAVAILABLE",

                  impressions:
                    null,

                  clicks:
                    null,

                  ctr:
                    null,

                  averagePosition:
                    null,
                }
              ),
            ],
          });

        expect(
          result.status
        ).toBe(
          "INSUFFICIENT_EVIDENCE"
        );

        expect(
          result.nextAction
        ).toBe(
          "COLLECT_MORE_DATA"
        );
      }
    );


    it(
      "sorts checkpoint evidence deterministically",
      () => {
        const result =
          buildLongitudinalOutcomeDiagnosisV1({
            baseline:
              baseline(),

            observations: [
              observation(
                "DAY_90"
              ),

              observation(
                "DAY_7"
              ),

              observation(
                "DAY_60"
              ),

              observation(
                "DAY_28"
              ),

              observation(
                "DAY_14"
              ),
            ],
          });

        expect(
          result.provenance
            .checkpointSequence
        ).toEqual([
          "DAY_7",
          "DAY_14",
          "DAY_28",
          "DAY_60",
          "DAY_90",
        ]);
      }
    );


    it(
      "rejects duplicate checkpoints instead of silently merging them",
      () => {
        expect(
          () =>
            buildLongitudinalOutcomeDiagnosisV1({
              baseline:
                baseline(),

              observations: [
                observation(
                  "DAY_28"
                ),

                observation(
                  "DAY_28"
                ),
              ],
            })
        ).toThrow(
          "LONGITUDINAL_OUTCOME_DUPLICATE_CHECKPOINT:DAY_28"
        );
      }
    );


    it(
      "rejects invented numeric rank for NOT_TOP_100",
      () => {
        expect(
          () =>
            buildLongitudinalOutcomeDiagnosisV1({
              baseline:
                baseline(),

              observations: [
                observation(
                  "DAY_28",
                  {
                    liveRank:
                      100,

                    liveRankState:
                      "NOT_TOP_100",
                  }
                ),
              ],
            })
        ).toThrow(
          "LONGITUDINAL_OUTCOME_NON_FOUND_RANK_MUST_BE_NULL:DAY_28"
        );
      }
    );
  }
);
