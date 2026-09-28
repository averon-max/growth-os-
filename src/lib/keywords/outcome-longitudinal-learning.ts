import type {
  OutcomeCheckpoint,
  OutcomeLiveRankState,
  OutcomeObservationSource,
} from "./outcome-service";


export const LONGITUDINAL_OUTCOME_VERSION =
  "LONGITUDINAL_OUTCOME_V1" as const;


export type LongitudinalOutcomePhase =
  | "NO_OBSERVATIONS"
  | "EARLY"
  | "ESTABLISHED"
  | "LONG_HORIZON";


export type LongitudinalDirection =
  | "IMPROVED"
  | "DECLINED"
  | "INCREASED"
  | "DECREASED"
  | "UNCHANGED"
  | "UNKNOWN";


export type LongitudinalOutcomeStatus =
  | "INSUFFICIENT_EVIDENCE"
  | "EARLY_SIGNAL"
  | "IMPROVING"
  | "DECLINING"
  | "STALLED"
  | "MIXED";


export type OutcomeBottleneckV1 =
  | "INSUFFICIENT_EVIDENCE"
  | "SERP_PRESENTATION"
  | "SEARCH_VISIBILITY"
  | "MIXED_SIGNALS"
  | "NONE";


export type OutcomeNextActionV1 =
  | "COLLECT_MORE_DATA"
  | "HOLD_AND_OBSERVE"
  | "REVIEW_SERP_PRESENTATION"
  | "INVESTIGATE_VISIBILITY"
  | "INVESTIGATE_DECLINE"
  | "REVIEW_MIXED_SIGNALS";


export interface LongitudinalOutcomeBaselineV1 {
  liveRank:
    number | null;

  liveRankState:
    OutcomeLiveRankState;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  averagePosition:
    number | null;
}


export interface LongitudinalOutcomeObservationV1 {
  checkpoint:
    OutcomeCheckpoint;

  source:
    OutcomeObservationSource;

  liveRank:
    number | null;

  liveRankState:
    OutcomeLiveRankState;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  averagePosition:
    number | null;

  observedAt?:
    Date | null;
}


export interface LongitudinalTrendSetV1 {
  rankFromBaseline:
    LongitudinalDirection;

  rankSincePrevious:
    LongitudinalDirection;

  impressionsFromBaseline:
    LongitudinalDirection;

  impressionsSincePrevious:
    LongitudinalDirection;

  clicksFromBaseline:
    LongitudinalDirection;

  clicksSincePrevious:
    LongitudinalDirection;

  ctrFromBaseline:
    LongitudinalDirection;

  ctrSincePrevious:
    LongitudinalDirection;

  averagePositionFromBaseline:
    LongitudinalDirection;

  averagePositionSincePrevious:
    LongitudinalDirection;
}


export interface LongitudinalOutcomeDiagnosisV1 {
  version:
    typeof LONGITUDINAL_OUTCOME_VERSION;

  phase:
    LongitudinalOutcomePhase;

  status:
    LongitudinalOutcomeStatus;

  bottleneck:
    OutcomeBottleneckV1;

  nextAction:
    OutcomeNextActionV1;

  latestCheckpoint:
    OutcomeCheckpoint | null;

  observationCount:
    number;

  trends:
    Readonly<LongitudinalTrendSetV1>;

  evidence:
    readonly string[];

  provenance: Readonly<{
    checkpointSequence:
      readonly OutcomeCheckpoint[];

    noCausalInference:
      true;

    noSeoScore:
      true;

    usesObservedMetricsOnly:
      true;
  }>;
}


const CHECKPOINT_ORDER:
  Readonly<Record<
    OutcomeCheckpoint,
    number
  >> = Object.freeze({
    DAY_7:
      7,

    DAY_14:
      14,

    DAY_28:
      28,

    DAY_60:
      56,

    DAY_90:
      90,
  });


function assertRankState({
  rank,
  state,
  label,
}: {
  rank:
    number | null;

  state:
    OutcomeLiveRankState;

  label:
    string;
}) {
  if (
    state ===
      "FOUND"
  ) {
    if (
      rank ===
        null ||
      !Number.isFinite(
        rank
      ) ||
      rank <
        1
    ) {
      throw new Error(
        `LONGITUDINAL_OUTCOME_INVALID_FOUND_RANK:${label}`
      );
    }

    return;
  }


  if (
    rank !==
    null
  ) {
    throw new Error(
      `LONGITUDINAL_OUTCOME_NON_FOUND_RANK_MUST_BE_NULL:${label}`
    );
  }
}


function numericDirection(
  baseline:
    number | null,
  current:
    number | null
):
  LongitudinalDirection {
  if (
    baseline ===
      null ||
    current ===
      null
  ) {
    return "UNKNOWN";
  }


  if (
    current >
    baseline
  ) {
    return "INCREASED";
  }


  if (
    current <
    baseline
  ) {
    return "DECREASED";
  }


  return "UNCHANGED";
}


function positionDirection(
  baseline:
    number | null,
  current:
    number | null
):
  LongitudinalDirection {
  if (
    baseline ===
      null ||
    current ===
      null
  ) {
    return "UNKNOWN";
  }


  if (
    current <
    baseline
  ) {
    return "IMPROVED";
  }


  if (
    current >
    baseline
  ) {
    return "DECLINED";
  }


  return "UNCHANGED";
}


function rankDirection({
  baselineState,
  baselineRank,
  currentState,
  currentRank,
}: {
  baselineState:
    OutcomeLiveRankState;

  baselineRank:
    number | null;

  currentState:
    OutcomeLiveRankState;

  currentRank:
    number | null;
}):
  LongitudinalDirection {
  if (
    baselineState ===
      "UNAVAILABLE" ||
    currentState ===
      "UNAVAILABLE"
  ) {
    return "UNKNOWN";
  }


  if (
    baselineState ===
      "NOT_TOP_100" &&
    currentState ===
      "FOUND"
  ) {
    return "IMPROVED";
  }


  if (
    baselineState ===
      "FOUND" &&
    currentState ===
      "NOT_TOP_100"
  ) {
    return "DECLINED";
  }


  if (
    baselineState ===
      "NOT_TOP_100" &&
    currentState ===
      "NOT_TOP_100"
  ) {
    return "UNCHANGED";
  }


  return positionDirection(
    baselineRank,
    currentRank
  );
}


function phaseFor(
  checkpoint:
    OutcomeCheckpoint | null
):
  LongitudinalOutcomePhase {
  if (
    checkpoint ===
    null
  ) {
    return "NO_OBSERVATIONS";
  }


  if (
    checkpoint ===
      "DAY_7" ||
    checkpoint ===
      "DAY_14"
  ) {
    return "EARLY";
  }


  if (
    checkpoint ===
      "DAY_28"
  ) {
    return "ESTABLISHED";
  }


  return "LONG_HORIZON";
}


function hasObservedSearchEvidence(
  observation:
    Readonly<LongitudinalOutcomeObservationV1>
) {
  return (
    observation.liveRankState !==
      "UNAVAILABLE" ||
    observation.impressions !==
      null ||
    observation.clicks !==
      null ||
    observation.ctr !==
      null ||
    observation.averagePosition !==
      null
  );
}


function unchangedOrUnknown(
  value:
    LongitudinalDirection
) {
  return (
    value ===
      "UNCHANGED" ||
    value ===
      "UNKNOWN"
  );
}


function isPositive(
  value:
    LongitudinalDirection
) {
  return (
    value ===
      "IMPROVED" ||
    value ===
      "INCREASED"
  );
}


function isNegative(
  value:
    LongitudinalDirection
) {
  return (
    value ===
      "DECLINED" ||
    value ===
      "DECREASED"
  );
}


function evidenceLine(
  label:
    string,
  baseline:
    number | null,
  current:
    number | null
) {
  return (
    `${label}: baseline=${baseline ?? "unavailable"}, latest=${current ?? "unavailable"}`
  );
}


export function buildLongitudinalOutcomeDiagnosisV1({
  baseline,
  observations,
}: {
  baseline:
    Readonly<LongitudinalOutcomeBaselineV1>;

  observations:
    readonly Readonly<LongitudinalOutcomeObservationV1>[];
}):
  Readonly<LongitudinalOutcomeDiagnosisV1> {
  assertRankState({
    rank:
      baseline.liveRank,

    state:
      baseline.liveRankState,

    label:
      "BASELINE",
  });


  const seen =
    new Set<OutcomeCheckpoint>();


  const ordered =
    [...observations]
      .map(
        (
          observation
        ) => {
          assertRankState({
            rank:
              observation.liveRank,

            state:
              observation.liveRankState,

            label:
              observation.checkpoint,
          });


          if (
            seen.has(
              observation.checkpoint
            )
          ) {
            throw new Error(
              `LONGITUDINAL_OUTCOME_DUPLICATE_CHECKPOINT:${observation.checkpoint}`
            );
          }


          seen.add(
            observation.checkpoint
          );


          return observation;
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          CHECKPOINT_ORDER[
            a.checkpoint
          ] -
          CHECKPOINT_ORDER[
            b.checkpoint
          ]
      );


  const latest =
    ordered.at(
      -1
    ) ??
    null;


  const previous =
    ordered.at(
      -2
    ) ??
    null;


  const phase =
    phaseFor(
      latest?.checkpoint ??
      null
    );


  const emptyTrends:
    Readonly<LongitudinalTrendSetV1> =
      Object.freeze({
        rankFromBaseline:
          "UNKNOWN",

        rankSincePrevious:
          "UNKNOWN",

        impressionsFromBaseline:
          "UNKNOWN",

        impressionsSincePrevious:
          "UNKNOWN",

        clicksFromBaseline:
          "UNKNOWN",

        clicksSincePrevious:
          "UNKNOWN",

        ctrFromBaseline:
          "UNKNOWN",

        ctrSincePrevious:
          "UNKNOWN",

        averagePositionFromBaseline:
          "UNKNOWN",

        averagePositionSincePrevious:
          "UNKNOWN",
      });


  if (
    latest ===
    null
  ) {
    return Object.freeze({
      version:
        LONGITUDINAL_OUTCOME_VERSION,

      phase,

      status:
        "INSUFFICIENT_EVIDENCE",

      bottleneck:
        "INSUFFICIENT_EVIDENCE",

      nextAction:
        "COLLECT_MORE_DATA",

      latestCheckpoint:
        null,

      observationCount:
        0,

      trends:
        emptyTrends,

      evidence:
        Object.freeze([]),

      provenance:
        Object.freeze({
          checkpointSequence:
            Object.freeze([]),

          noCausalInference:
            true,

          noSeoScore:
            true,

          usesObservedMetricsOnly:
            true,
        }),
    });
  }


  if (
    !hasObservedSearchEvidence(
      latest
    )
  ) {
    return Object.freeze({
      version:
        LONGITUDINAL_OUTCOME_VERSION,

      phase,

      status:
        "INSUFFICIENT_EVIDENCE",

      bottleneck:
        "INSUFFICIENT_EVIDENCE",

      nextAction:
        "COLLECT_MORE_DATA",

      latestCheckpoint:
        latest.checkpoint,

      observationCount:
        ordered.length,

      trends:
        emptyTrends,

      evidence:
        Object.freeze([
          `${latest.checkpoint}: no live-rank or GSC metrics were available.`,
        ]),

      provenance:
        Object.freeze({
          checkpointSequence:
            Object.freeze(
              ordered.map(
                (
                  observation
                ) =>
                  observation.checkpoint
              )
            ),

          noCausalInference:
            true,

          noSeoScore:
            true,

          usesObservedMetricsOnly:
            true,
        }),
    });
  }


  const trends:
    Readonly<LongitudinalTrendSetV1> =
      Object.freeze({
        rankFromBaseline:
          rankDirection({
            baselineState:
              baseline.liveRankState,

            baselineRank:
              baseline.liveRank,

            currentState:
              latest.liveRankState,

            currentRank:
              latest.liveRank,
          }),

        rankSincePrevious:
          previous
            ? rankDirection({
                baselineState:
                  previous.liveRankState,

                baselineRank:
                  previous.liveRank,

                currentState:
                  latest.liveRankState,

                currentRank:
                  latest.liveRank,
              })
            : "UNKNOWN",

        impressionsFromBaseline:
          numericDirection(
            baseline.impressions,
            latest.impressions
          ),

        impressionsSincePrevious:
          previous
            ? numericDirection(
                previous.impressions,
                latest.impressions
              )
            : "UNKNOWN",

        clicksFromBaseline:
          numericDirection(
            baseline.clicks,
            latest.clicks
          ),

        clicksSincePrevious:
          previous
            ? numericDirection(
                previous.clicks,
                latest.clicks
              )
            : "UNKNOWN",

        ctrFromBaseline:
          numericDirection(
            baseline.ctr,
            latest.ctr
          ),

        ctrSincePrevious:
          previous
            ? numericDirection(
                previous.ctr,
                latest.ctr
              )
            : "UNKNOWN",

        averagePositionFromBaseline:
          positionDirection(
            baseline.averagePosition,
            latest.averagePosition
          ),

        averagePositionSincePrevious:
          previous
            ? positionDirection(
                previous.averagePosition,
                latest.averagePosition
              )
            : "UNKNOWN",
      });


  const evidence =
    Object.freeze([
      `Latest checkpoint: ${latest.checkpoint}.`,
      `Latest source: ${latest.source}.`,
      `Live rank state: baseline=${baseline.liveRankState}, latest=${latest.liveRankState}.`,
      evidenceLine(
        "Live rank",
        baseline.liveRank,
        latest.liveRank
      ),
      evidenceLine(
        "Impressions",
        baseline.impressions,
        latest.impressions
      ),
      evidenceLine(
        "Clicks",
        baseline.clicks,
        latest.clicks
      ),
      evidenceLine(
        "CTR",
        baseline.ctr,
        latest.ctr
      ),
      evidenceLine(
        "Average position",
        baseline.averagePosition,
        latest.averagePosition
      ),
    ]);


  let status:
    LongitudinalOutcomeStatus;

  let bottleneck:
    OutcomeBottleneckV1;

  let nextAction:
    OutcomeNextActionV1;


  if (
    phase ===
    "EARLY"
  ) {
    status =
      "EARLY_SIGNAL";

    bottleneck =
      "NONE";

    nextAction =
      "HOLD_AND_OBSERVE";
  } else {
    const presentationPattern =
      trends.impressionsFromBaseline ===
        "INCREASED" &&
      trends.ctrFromBaseline ===
        "DECREASED" &&
      trends.clicksFromBaseline !==
        "INCREASED";


    const visibilityPattern =
      phase ===
        "LONG_HORIZON" &&
      latest.liveRankState ===
        "NOT_TOP_100" &&
      (
        latest.impressions ===
          null ||
        latest.impressions ===
          0
      );


    const decliningPattern =
      (
        trends.rankFromBaseline ===
          "DECLINED" ||
        trends.averagePositionFromBaseline ===
          "DECLINED"
      ) &&
      (
        trends.impressionsFromBaseline ===
          "DECREASED" ||
        trends.clicksFromBaseline ===
          "DECREASED"
      );


    const improvingPattern =
      (
        trends.rankFromBaseline ===
          "IMPROVED" &&
        (
          trends.impressionsFromBaseline ===
            "INCREASED" ||
          trends.clicksFromBaseline ===
            "INCREASED"
        )
      ) ||
      (
        trends.impressionsFromBaseline ===
          "INCREASED" &&
        trends.clicksFromBaseline ===
          "INCREASED"
      );


    const trendValues = [
      trends.rankFromBaseline,
      trends.impressionsFromBaseline,
      trends.clicksFromBaseline,
      trends.ctrFromBaseline,
      trends.averagePositionFromBaseline,
    ];


    const knownTrendCount =
      trendValues.filter(
        (
          value
        ) =>
          value !==
          "UNKNOWN"
      ).length;


    const stalledPattern =
      phase ===
        "LONG_HORIZON" &&
      knownTrendCount >
        0 &&
      trendValues.every(
        unchangedOrUnknown
      );


    const hasPositive =
      trendValues.some(
        isPositive
      );


    const hasNegative =
      trendValues.some(
        isNegative
      );


    if (
      presentationPattern
    ) {
      status =
        "MIXED";

      bottleneck =
        "SERP_PRESENTATION";

      nextAction =
        "REVIEW_SERP_PRESENTATION";
    } else if (
      visibilityPattern
    ) {
      status =
        "STALLED";

      bottleneck =
        "SEARCH_VISIBILITY";

      nextAction =
        "INVESTIGATE_VISIBILITY";
    } else if (
      decliningPattern
    ) {
      status =
        "DECLINING";

      bottleneck =
        "MIXED_SIGNALS";

      nextAction =
        "INVESTIGATE_DECLINE";
    } else if (
      improvingPattern
    ) {
      status =
        "IMPROVING";

      bottleneck =
        "NONE";

      nextAction =
        "HOLD_AND_OBSERVE";
    } else if (
      stalledPattern
    ) {
      status =
        "STALLED";

      bottleneck =
        "SEARCH_VISIBILITY";

      nextAction =
        "INVESTIGATE_VISIBILITY";
    } else if (
      hasPositive &&
      hasNegative
    ) {
      status =
        "MIXED";

      bottleneck =
        "MIXED_SIGNALS";

      nextAction =
        "REVIEW_MIXED_SIGNALS";
    } else {
      status =
        "MIXED";

      bottleneck =
        "MIXED_SIGNALS";

      nextAction =
        "REVIEW_MIXED_SIGNALS";
    }
  }


  return Object.freeze({
    version:
      LONGITUDINAL_OUTCOME_VERSION,

    phase,

    status,

    bottleneck,

    nextAction,

    latestCheckpoint:
      latest.checkpoint,

    observationCount:
      ordered.length,

    trends,

    evidence,

    provenance:
      Object.freeze({
        checkpointSequence:
          Object.freeze(
            ordered.map(
              (
                observation
              ) =>
                observation.checkpoint
            )
          ),

        noCausalInference:
          true,

        noSeoScore:
          true,

        usesObservedMetricsOnly:
          true,
      }),
  });
}
