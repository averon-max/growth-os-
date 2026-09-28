import type {
  QueryGroupOutcomeSeriesV1,
  QueryGroupOutcomeV1,
} from "./outcome-query-groups";


export const QUERY_OUTCOME_DIAGNOSIS_VERSION =
  "QUERY_OUTCOME_DIAGNOSIS_V1" as const;


export type QueryOutcomeStatusV1 =
  | "WINNING"
  | "EMERGING"
  | "STRIKING_DISTANCE"
  | "DECAYING"
  | "LOST";


export interface QueryOutcomeGroupDiagnosisV1 {
  groupId:
    string;

  status:
    QueryOutcomeStatusV1;

  checkpoint:
    string;

  intent:
    string;

  cluster:
    string;

  subIntent:
    string;

  queries:
    readonly string[];

  queryNodeIds:
    readonly string[];

  sectionHeadings:
    readonly string[];

  position:
    number | null;

  previousPosition:
    number | null;

  impressions:
    number | null;

  clicks:
    number | null;

  reason:
    string;
}


function positionBucket(
  position:
    number | null
):
  | "TOP_3"
  | "TOP_10"
  | "TOP_20"
  | "BEYOND_20"
  | "UNKNOWN" {
  if (
    position ===
    null
  ) {
    return "UNKNOWN";
  }

  if (
    position <=
    3
  ) {
    return "TOP_3";
  }

  if (
    position <=
    10
  ) {
    return "TOP_10";
  }

  if (
    position <=
    20
  ) {
    return "TOP_20";
  }

  return "BEYOND_20";
}


function bucketIndex(
  position:
    number | null
): number | null {
  switch (
    positionBucket(
      position
    )
  ) {
    case "TOP_3":
      return 0;

    case "TOP_10":
      return 1;

    case "TOP_20":
      return 2;

    case "BEYOND_20":
      return 3;

    case "UNKNOWN":
      return null;
  }
}


function currentStatus({
  group,
  previous,
  gained,
}: {
  group:
    Readonly<QueryGroupOutcomeV1>;

  previous:
    Readonly<QueryGroupOutcomeV1> |
    null;

  gained:
    boolean;
}): {
  status:
    QueryOutcomeStatusV1;

  reason:
    string;
} {
  const currentBucket =
    bucketIndex(
      group.position
    );

  const previousBucket =
    bucketIndex(
      previous
        ?.position ??
      null
    );


  /*
   * DECAYING is deliberately based on a real bucket
   * deterioration rather than tiny position noise.
   *
   * Example:
   * TOP_10 -> TOP_20
   * TOP_20 -> BEYOND_20
   */
  if (
    previousBucket !==
      null &&
    currentBucket !==
      null &&
    currentBucket >
      previousBucket
  ) {
    return {
      status:
        "DECAYING",

      reason:
        "OBSERVED_POSITION_BUCKET_WORSENED",
    };
  }


  if (
    group.position !==
      null &&
    group.position <=
      10
  ) {
    return {
      status:
        "WINNING",

      reason:
        "OBSERVED_TOP_10_GROUP",
    };
  }


  if (
    group.position !==
      null &&
    group.position <=
      20
  ) {
    return {
      status:
        "STRIKING_DISTANCE",

      reason:
        "OBSERVED_POSITION_11_TO_20",
    };
  }


  if (
    gained
  ) {
    return {
      status:
        "EMERGING",

      reason:
        "GROUP_NEWLY_OBSERVED_AT_LATEST_CHECKPOINT",
    };
  }


  return {
    status:
      "EMERGING",

    reason:
      "OBSERVED_GROUP_BEYOND_TOP_20_OR_POSITION_UNAVAILABLE",
  };
}


export function buildQueryOutcomeDiagnosisV1(
  series:
    Readonly<QueryGroupOutcomeSeriesV1>
) {
  const latest =
    series.checkpoints.at(
      -1
    ) ??
    null;

  const previous =
    series.checkpoints.at(
      -2
    ) ??
    null;


  if (
    !latest
  ) {
    return Object.freeze({
      version:
        QUERY_OUTCOME_DIAGNOSIS_VERSION,

      latestCheckpoint:
        null,

      previousCheckpoint:
        null,

      groups:
        Object.freeze([]),

      counts:
        Object.freeze({
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
        }),

      provenance:
        Object.freeze({
          observedEvidenceOnly:
            true as const,

          noCausalInference:
            true as const,

          noSeoScore:
            true as const,

          noRankingProbability:
            true as const,
        }),
    });
  }


  const latestComparison =
    series.comparisons.at(
      -1
    ) ??
    null;


  const gainedIds =
    new Set(
      latestComparison
        ?.gainedGroupIds ??
      []
    );

  const lostIds =
    new Set(
      latestComparison
        ?.lostGroupIds ??
      []
    );


  const previousById =
    new Map(
      (
        previous
          ?.groups ??
        []
      ).map(
        (
          group
        ) => [
          group.groupId,
          group,
        ] as const
      )
    );


  const groups:
    QueryOutcomeGroupDiagnosisV1[] =
      [];


  for (
    const group
    of latest.groups
  ) {
    const previousGroup =
      previousById.get(
        group.groupId
      ) ??
      null;


    const classification =
      currentStatus({
        group,

        previous:
          previousGroup,

        gained:
          gainedIds.has(
            group.groupId
          ),
      });


    groups.push({
      groupId:
        group.groupId,

      status:
        classification.status,

      checkpoint:
        latest.checkpoint,

      intent:
        group.intent,

      cluster:
        group.cluster,

      subIntent:
        group.subIntent,

      queries:
        group.queries,

      queryNodeIds:
        group.queryNodeIds,

      sectionHeadings:
        group.sectionHeadings,

      position:
        group.position,

      previousPosition:
        previousGroup
          ?.position ??
        null,

      impressions:
        group.impressions,

      clicks:
        group.clicks,

      reason:
        classification.reason,
    });
  }


  if (
    previous
  ) {
    for (
      const group
      of previous.groups
    ) {
      if (
        !lostIds.has(
          group.groupId
        )
      ) {
        continue;
      }


      groups.push({
        groupId:
          group.groupId,

        status:
          "LOST",

        checkpoint:
          latest.checkpoint,

        intent:
          group.intent,

        cluster:
          group.cluster,

        subIntent:
          group.subIntent,

        queries:
          group.queries,

        queryNodeIds:
          group.queryNodeIds,

        sectionHeadings:
          group.sectionHeadings,

        /*
         * LOST means the group was not observed in the
         * latest mapped checkpoint. Do not carry the old
         * position forward as though it were current.
         */
        position:
          null,

        previousPosition:
          group.position,

        impressions:
          null,

        clicks:
          null,

        reason:
          "GROUP_PRESENT_PREVIOUS_CHECKPOINT_NOT_OBSERVED_LATEST",
      });
    }
  }


  const counts:
    Record<
      QueryOutcomeStatusV1,
      number
    > = {
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
    };


  for (
    const group
    of groups
  ) {
    counts[
      group.status
    ] +=
      1;
  }


  return Object.freeze({
    version:
      QUERY_OUTCOME_DIAGNOSIS_VERSION,

    latestCheckpoint:
      latest.checkpoint,

    previousCheckpoint:
      previous
        ?.checkpoint ??
      null,

    groups:
      Object.freeze(
        groups
      ),

    counts:
      Object.freeze(
        counts
      ),

    provenance:
      Object.freeze({
        observedEvidenceOnly:
          true as const,

        noCausalInference:
          true as const,

        noSeoScore:
          true as const,

        noRankingProbability:
          true as const,
      }),
  });
}
