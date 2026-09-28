import {
  prisma,
} from "@/lib/prisma";

import {
  buildActionOutcomeDatasetRowV1,
  buildActionOutcomeDatasetV1,
  type ActionOutcomeActionInputV1,
  type ActionOutcomeBaselineInputV1,
  type ActionOutcomeObservationInputV1,
} from "./action-outcome-dataset";

import {
  buildLongitudinalOutcomeDiagnosisV1,
} from "./outcome-longitudinal-learning";

import {
  buildQueryOutcomeDiagnosisV1,
} from "./outcome-query-diagnosis";

import {
  buildOutcomeBottleneckDecisionV1,
} from "./outcome-bottleneck-engine";

import {
  buildArticleQueryOutcomeSeriesV1,
} from "./outcome-query-series-service";

import type {
  QueryGroupOutcomeSeriesV1,
} from "./outcome-query-groups";

import type {
  OutcomeCheckpoint,
  OutcomeLiveRankState,
  OutcomeObservationSource,
} from "./outcome-service";


export const ACTION_OUTCOME_MATERIALIZER_VERSION =
  "ACTION_OUTCOME_MATERIALIZER_V1" as const;


const CHECKPOINT_ORDER:
  Readonly<
    Record<
      OutcomeCheckpoint,
      number
    >
  > =
    Object.freeze({
      DAY_7:
        7,

      DAY_14:
        14,

      DAY_28:
        28,

      DAY_60:
        60,

      DAY_90:
        90,
    });


const MATURE_CHECKPOINTS =
  Object.freeze([
    "DAY_28",
    "DAY_60",
    "DAY_90",
  ] as const);


function checkpoint(
  value:
    string
): OutcomeCheckpoint {
  switch (
    value
  ) {
    case "DAY_7":
    case "DAY_14":
    case "DAY_28":
    case "DAY_60":
    case "DAY_90":
      return value;

    default:
      throw new Error(
        `ACTION_OUTCOME_INVALID_POST_ACTION_CHECKPOINT:${value}`
      );
  }
}


function source(
  value:
    string
): OutcomeObservationSource {
  switch (
    value
  ) {
    case "LIVE_SERP":
    case "GOOGLE_SEARCH_CONSOLE":
    case "COMBINED":
    case "MANUAL":
    case "NO_DATA":
      return value;

    case "ACTION_BASELINE":
      throw new Error(
        "ACTION_OUTCOME_POST_ACTION_HAS_BASELINE_SOURCE"
      );

    default:
      throw new Error(
        `ACTION_OUTCOME_UNKNOWN_OBSERVATION_SOURCE:${value}`
      );
  }
}


function liveRankState(
  value:
    string
): OutcomeLiveRankState {
  switch (
    value
  ) {
    case "FOUND":
    case "NOT_TOP_100":
    case "UNAVAILABLE":
      return value;

    default:
      throw new Error(
        `ACTION_OUTCOME_UNKNOWN_LIVE_RANK_STATE:${value}`
      );
  }
}


function numberOrNull(
  value:
    unknown
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const result =
    Number(
      value
    );

  return Number.isFinite(
    result
  )
    ? result
    : null;
}


function isMatureCheckpoint(
  value:
    OutcomeCheckpoint
): value is
  | "DAY_28"
  | "DAY_60"
  | "DAY_90" {
  return (
    value ===
      "DAY_28" ||
    value ===
      "DAY_60" ||
    value ===
      "DAY_90"
  );
}


/*
 * Build a query diagnosis using only evidence that existed
 * at or before the requested checkpoint.
 *
 * Future checkpoints are physically excluded before the
 * diagnosis engine runs.
 */
export function buildQueryDiagnosisThroughCheckpointV1({
  series,
  throughCheckpoint,
}: {
  series:
    Readonly<
      QueryGroupOutcomeSeriesV1
    >;

  throughCheckpoint:
    OutcomeCheckpoint;
}) {
  const maximumOrder =
    CHECKPOINT_ORDER[
      throughCheckpoint
    ];


  const checkpoints =
    series.checkpoints.filter(
      (
        item
      ) =>
        CHECKPOINT_ORDER[
          item.checkpoint
        ] <=
        maximumOrder
    );


  /*
   * Query evidence for the exact target checkpoint must
   * exist. We never carry an older query diagnosis forward
   * and relabel it as the current checkpoint.
   */
  if (
    !checkpoints.some(
      (
        item
      ) =>
        item.checkpoint ===
        throughCheckpoint
    )
  ) {
    return null;
  }


  const comparisons =
    series.comparisons.filter(
      (
        item
      ) =>
        CHECKPOINT_ORDER[
          item.toCheckpoint
        ] <=
        maximumOrder
    );


  const prefix:
    QueryGroupOutcomeSeriesV1 =
      Object.freeze({
        version:
          series.version,

        checkpoints:
          Object.freeze([
            ...checkpoints,
          ]),

        comparisons:
          Object.freeze([
            ...comparisons,
          ]),

        provenance:
          series.provenance,
      });


  return buildQueryOutcomeDiagnosisV1(
    prefix
  );
}


export function buildActionOutcomeRowsFromEvidenceV1({
  action,
  baseline,
  observations,
  querySeries,
}: {
  action:
    Readonly<
      ActionOutcomeActionInputV1
    >;

  baseline:
    Readonly<
      ActionOutcomeBaselineInputV1
    >;

  observations:
    readonly Readonly<
      ActionOutcomeObservationInputV1
    >[];

  querySeries:
    Readonly<
      QueryGroupOutcomeSeriesV1
    > |
    null;
}) {
  const ordered =
    [...observations]
      .sort(
        (
          a,
          b
        ) =>
          CHECKPOINT_ORDER[
            checkpoint(
              a.checkpoint
            )
          ] -
          CHECKPOINT_ORDER[
            checkpoint(
              b.checkpoint
            )
          ]
      );


  const rows:
    ReturnType<
      typeof buildActionOutcomeDatasetRowV1
    >[] =
      [];


  for (
    const observation
    of ordered
  ) {
    const currentCheckpoint =
      checkpoint(
        observation.checkpoint
      );


    if (
      !isMatureCheckpoint(
        currentCheckpoint
      )
    ) {
      continue;
    }


    const maximumOrder =
      CHECKPOINT_ORDER[
        currentCheckpoint
      ];


    /*
     * FUTURE-LEAKAGE BOUNDARY:
     *
     * DAY_28 receives D7/D14/D28 only.
     * DAY_60 receives D7/D14/D28/D60 only.
     * DAY_90 may receive the complete observed history.
     */
    const longitudinalPrefix =
      ordered
        .filter(
          (
            item
          ) =>
            CHECKPOINT_ORDER[
              checkpoint(
                item.checkpoint
              )
            ] <=
            maximumOrder
        )
        .map(
          (
            item
          ) => ({
            checkpoint:
              checkpoint(
                item.checkpoint
              ),

            source:
              source(
                item.source
              ),

            liveRank:
              item.liveRank,

            liveRankState:
              liveRankState(
                item.liveRankState
              ),

            impressions:
              item.impressions,

            clicks:
              item.clicks,

            ctr:
              item.ctr,

            averagePosition:
              item.averagePosition,
          })
        );


    const longitudinal =
      buildLongitudinalOutcomeDiagnosisV1({
        baseline: {
          liveRank:
            baseline.liveRank,

          liveRankState:
            liveRankState(
              baseline
                .liveRankState
            ),

          impressions:
            baseline.impressions,

          clicks:
            baseline.clicks,

          ctr:
            baseline.ctr,

          averagePosition:
            baseline
              .averagePosition,
        },

        observations:
          longitudinalPrefix,
      });


    if (
      longitudinal
        .latestCheckpoint !==
      currentCheckpoint
    ) {
      throw new Error(
        "ACTION_OUTCOME_LONGITUDINAL_PREFIX_MISMATCH"
      );
    }


    const queryDiagnosis =
      querySeries
        ? buildQueryDiagnosisThroughCheckpointV1({
            series:
              querySeries,

            throughCheckpoint:
              currentCheckpoint,
          })
        : null;


    const bottleneck =
      buildOutcomeBottleneckDecisionV1({
        longitudinal,

        queryOutcome:
          queryDiagnosis,
      });


    rows.push(
      buildActionOutcomeDatasetRowV1({
        action,

        baseline,

        observation,

        longitudinal,

        queryOutcome:
          queryDiagnosis,

        bottleneck,
      })
    );
  }


  return Object.freeze(
    rows
  );
}


export async function materializeActionOutcomeDatasetV1({
  workspaceId,
  websiteId,
  limit =
    500,
}: {
  workspaceId?:
    string;

  websiteId?:
    string;

  limit?:
    number;
} = {}) {
  const actions =
    await prisma
      .keywordOutcomeAction
      .findMany({
        where: {
          status:
            "EXECUTED",

          ...(workspaceId
            ? {
                workspaceId,
              }
            : {}),

          ...(websiteId
            ? {
                websiteId,
              }
            : {}),

          observations: {
            some: {
              checkpoint: {
                in: [
                  "DAY_28",
                  "DAY_60",
                  "DAY_90",
                ],
              },
            },
          },
        },

        orderBy: [
          {
            executedAt:
              "asc",
          },

          {
            id:
              "asc",
          },
        ],

        take:
          limit,

        select: {
          id:
            true,

          workspaceId:
            true,

          websiteId:
            true,

          keywordText:
            true,

          normalizedKeyword:
            true,

          market:
            true,

          language:
            true,

          device:
            true,

          decision:
            true,

          compatibilityStatus:
            true,

          targetPageUrl:
            true,

          source:
            true,

          status:
            true,

          executedAt:
            true,

          contentArticleId:
            true,

          appliedFixId:
            true,

          supersedesActionId:
            true,

          planSnapshot:
            true,

          evidence:
            true,

          compatibilitySnapshot:
            true,

          baselineLiveRank:
            true,

          baselineLiveRankState:
            true,

          baselineImpressions:
            true,

          baselineClicks:
            true,

          baselineCtr:
            true,

          baselineAveragePosition:
            true,

          baselineGscSnapshotDate:
            true,

          observations: {
            where: {
              checkpoint: {
                in: [
                  "DAY_7",
                  "DAY_14",
                  "DAY_28",
                  "DAY_60",
                  "DAY_90",
                ],
              },
            },

            orderBy: {
              observedAt:
                "asc",
            },

            select: {
              checkpoint:
                true,

              source:
                true,

              liveRank:
                true,

              liveRankState:
                true,

              impressions:
                true,

              clicks:
                true,

              ctr:
                true,

              averagePosition:
                true,

              gscSnapshotDate:
                true,

              pageUrl:
                true,

              observedAt:
                true,
            },
          },
        },
      });


  const rows:
    ReturnType<
      typeof buildActionOutcomeDatasetRowV1
    >[] =
      [];


  for (
    const action
    of actions
  ) {
    let querySeries:
      Readonly<
        QueryGroupOutcomeSeriesV1
      > |
      null =
        null;


    /*
     * QueryGraph/section provenance exists for generated
     * content articles. CMS fixes still receive longitudinal
     * ActionOutcome rows, but no invented query provenance.
     */
    if (
      action.contentArticleId
    ) {
      const article =
        await prisma
          .contentArticle
          .findUnique({
            where: {
              id:
                action
                  .contentArticleId,
            },

            select: {
              briefId:
                true,

              publishedUrl:
                true,
            },
          });


      if (
        article
          ?.publishedUrl
      ) {
        const queryOutcome =
          await buildArticleQueryOutcomeSeriesV1({
            briefId:
              article.briefId,

            publishedUrl:
              article
                .publishedUrl,
          });


        if (
          queryOutcome.status ===
            "READY" &&
          queryOutcome.result
        ) {
          querySeries =
            queryOutcome
              .result
              .series;
        }
      }
    }


    const actionInput:
      ActionOutcomeActionInputV1 =
        {
          id:
            action.id,

          workspaceId:
            action.workspaceId,

          websiteId:
            action.websiteId,

          keywordText:
            action.keywordText,

          normalizedKeyword:
            action
              .normalizedKeyword,

          market:
            action.market,

          language:
            action.language,

          device:
            action.device,

          decision:
            action.decision,

          compatibilityStatus:
            action
              .compatibilityStatus,

          targetPageUrl:
            action
              .targetPageUrl,

          source:
            action.source,

          status:
            action.status,

          executedAt:
            action.executedAt,

          contentArticleId:
            action
              .contentArticleId,

          appliedFixId:
            action.appliedFixId,

          supersedesActionId:
            action
              .supersedesActionId,

          planSnapshot:
            action.planSnapshot,

          evidence:
            action.evidence,

          compatibilitySnapshot:
            action
              .compatibilitySnapshot,
        };


    const baseline:
      ActionOutcomeBaselineInputV1 =
        {
          liveRank:
            action
              .baselineLiveRank,

          liveRankState:
            action
              .baselineLiveRankState,

          impressions:
            action
              .baselineImpressions,

          clicks:
            action
              .baselineClicks,

          ctr:
            numberOrNull(
              action
                .baselineCtr
            ),

          averagePosition:
            numberOrNull(
              action
                .baselineAveragePosition
            ),

          gscSnapshotDate:
            action
              .baselineGscSnapshotDate,
        };


    const observations:
      ActionOutcomeObservationInputV1[] =
        action
          .observations
          .map(
            (
              observation
            ) => ({
              checkpoint:
                checkpoint(
                  observation
                    .checkpoint
                ),

              source:
                source(
                  observation.source
                ),

              liveRank:
                observation.liveRank,

              liveRankState:
                liveRankState(
                  observation
                    .liveRankState
                ),

              impressions:
                observation
                  .impressions,

              clicks:
                observation.clicks,

              ctr:
                numberOrNull(
                  observation.ctr
                ),

              averagePosition:
                numberOrNull(
                  observation
                    .averagePosition
                ),

              gscSnapshotDate:
                observation
                  .gscSnapshotDate,

              pageUrl:
                observation.pageUrl,

              observedAt:
                observation
                  .observedAt,
            })
          );


    rows.push(
      ...buildActionOutcomeRowsFromEvidenceV1({
        action:
          actionInput,

        baseline,

        observations,

        querySeries,
      })
    );
  }


  const dataset =
    buildActionOutcomeDatasetV1(
      rows
    );


  return Object.freeze({
    version:
      ACTION_OUTCOME_MATERIALIZER_VERSION,

    actionCount:
      actions.length,

    rowCount:
      dataset.rowCount,

    dataset,

    provenance:
      Object.freeze({
        executedActionsOnly:
          true as const,

        matureCheckpointsOnly:
          true as const,

        matureCheckpoints:
          MATURE_CHECKPOINTS,

        checkpointPrefixOnly:
          true as const,

        futureLeakage:
          false as const,

        persistedDataset:
          false as const,

        learnedWinnabilityEnabled:
          false as const,
      }),
  });
}
