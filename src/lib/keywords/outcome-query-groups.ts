import type {
  OutcomeCheckpoint,
} from "./outcome-service";


export const QUERY_GROUP_OUTCOME_VERSION =
  "QUERY_GROUP_OUTCOME_V1" as const;


export type QueryGroupIntentV1 =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "NAVIGATIONAL"
  | "LOCAL";


export type QueryBreadthDirectionV1 =
  | "INCREASED"
  | "DECREASED"
  | "UNCHANGED";


export interface QueryGroupObservedSignalV1 {
  checkpoint:
    OutcomeCheckpoint;

  query:
    string;

  intent:
    QueryGroupIntentV1;

  cluster:
    string;

  subIntent:
    string;

  /*
   * Must come from the existing QueryGraph /
   * mission boundary.
   *
   * Query Group Outcome does NOT infer whether
   * a query belongs to the mission.
   */
  sameMissionEvidence:
    boolean;

  sourceConfidence:
    number;

  pageUrl:
    string | null;

  queryNodeId?:
    string | null;

  sectionId?:
    string | null;

  sectionHeading?:
    string | null;

  /*
   * Real observed search metrics only.
   * Missing data remains null.
   */
  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  position:
    number | null;
}


export interface QueryGroupOutcomeV1 {
  groupId:
    string;

  intent:
    QueryGroupIntentV1;

  cluster:
    string;

  subIntent:
    string;

  queries:
    readonly string[];

  pageUrls:
    readonly string[];

  queryNodeIds:
    readonly string[];

  sectionIds:
    readonly string[];

  sectionHeadings:
    readonly string[];

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  position:
    number | null;

  memberQueryCount:
    number;

  minSourceConfidence:
    number;

  maxSourceConfidence:
    number;
}


export interface QueryGroupCheckpointOutcomeV1 {
  version:
    typeof QUERY_GROUP_OUTCOME_VERSION;

  checkpoint:
    OutcomeCheckpoint;

  queryGroupBreadth:
    number;

  top3Groups:
    number;

  top10Groups:
    number;

  top20Groups:
    number;

  totalImpressions:
    number | null;

  totalClicks:
    number | null;

  groups:
    readonly Readonly<QueryGroupOutcomeV1>[];

  excludedForeignMissionQueries:
    number;

  excludedNoMetricQueries:
    number;

  provenance: Readonly<{
    groupingSemantics:
      "EXISTING_QUERY_GRAPH_INTENT_CLUSTER_SUBINTENT";

    noSemanticInference:
      true;

    noSeoScore:
      true;

    noRankingProbability:
      true;

    observedMetricsOnly:
      true;
  }>;
}


export interface QueryBreadthComparisonV1 {
  fromCheckpoint:
    OutcomeCheckpoint;

  toCheckpoint:
    OutcomeCheckpoint;

  fromBreadth:
    number;

  toBreadth:
    number;

  delta:
    number;

  direction:
    QueryBreadthDirectionV1;

  gainedGroupIds:
    readonly string[];

  lostGroupIds:
    readonly string[];

  retainedGroupIds:
    readonly string[];
}


export interface QueryGroupOutcomeSeriesV1 {
  version:
    typeof QUERY_GROUP_OUTCOME_VERSION;

  checkpoints:
    readonly Readonly<QueryGroupCheckpointOutcomeV1>[];

  comparisons:
    readonly Readonly<QueryBreadthComparisonV1>[];

  provenance: Readonly<{
    immutableDerivedSeries:
      true;

    noCausalInference:
      true;

    noSemanticInference:
      true;

    noSeoScore:
      true;
  }>;
}


const CHECKPOINT_ORDER:
  Readonly<Record<
    OutcomeCheckpoint,
    number
  >> =
    Object.freeze({
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


function normalizedText(
  value:
    string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}


function canonicalQuery(
  value:
    string
) {
  return normalizedText(
    value
  );
}


function stableValues(
  values:
    Iterable<string>
) {
  return Object.freeze(
    [
      ...new Set(
        values
      ),
    ].sort(
      (
        a,
        b
      ) =>
        a.localeCompare(
          b
        )
    )
  );
}


function assertOptionalMetric(
  value:
    number | null,
  {
    name,
    minimum,
    maximum,
    integer = false,
  }: {
    name:
      string;

    minimum:
      number;

    maximum?:
      number;

    integer?:
      boolean;
  }
) {
  if (
    value ===
    null
  ) {
    return;
  }


  if (
    !Number.isFinite(
      value
    ) ||
    value <
      minimum ||
    (
      maximum !==
        undefined &&
      value >
        maximum
    ) ||
    (
      integer &&
      !Number.isInteger(
        value
      )
    )
  ) {
    throw new Error(
      `QUERY_GROUP_INVALID_METRIC:${name}`
    );
  }
}


function assertSignal(
  signal:
    Readonly<QueryGroupObservedSignalV1>
) {
  if (
    canonicalQuery(
      signal.query
    ).length ===
    0
  ) {
    throw new Error(
      "QUERY_GROUP_QUERY_REQUIRED"
    );
  }


  if (
    normalizedText(
      signal.cluster
    ).length ===
    0
  ) {
    throw new Error(
      "QUERY_GROUP_CLUSTER_REQUIRED"
    );
  }


  if (
    normalizedText(
      signal.subIntent
    ).length ===
    0
  ) {
    throw new Error(
      "QUERY_GROUP_SUBINTENT_REQUIRED"
    );
  }


  if (
    !Number.isFinite(
      signal.sourceConfidence
    ) ||
    signal.sourceConfidence <
      0 ||
    signal.sourceConfidence >
      1
  ) {
    throw new Error(
      "QUERY_GROUP_INVALID_SOURCE_CONFIDENCE"
    );
  }


  assertOptionalMetric(
    signal.impressions,
    {
      name:
        "impressions",

      minimum:
        0,

      integer:
        true,
    }
  );


  assertOptionalMetric(
    signal.clicks,
    {
      name:
        "clicks",

      minimum:
        0,

      integer:
        true,
    }
  );


  assertOptionalMetric(
    signal.ctr,
    {
      name:
        "ctr",

      minimum:
        0,

      maximum:
        1,
    }
  );


  assertOptionalMetric(
    signal.position,
    {
      name:
        "position",

      minimum:
        Number.EPSILON,
    }
  );
}


function hasObservedMetric(
  signal:
    Readonly<QueryGroupObservedSignalV1>
) {
  return (
    signal.impressions !==
      null ||
    signal.clicks !==
      null ||
    signal.ctr !==
      null ||
    signal.position !==
      null
  );
}


export function buildStableQueryGroupIdV1({
  intent,
  cluster,
  subIntent,
}: {
  intent:
    QueryGroupIntentV1;

  cluster:
    string;

  subIntent:
    string;
}) {
  const normalizedCluster =
    normalizedText(
      cluster
    );

  const normalizedSubIntent =
    normalizedText(
      subIntent
    );


  if (
    !normalizedCluster
  ) {
    throw new Error(
      "QUERY_GROUP_CLUSTER_REQUIRED"
    );
  }


  if (
    !normalizedSubIntent
  ) {
    throw new Error(
      "QUERY_GROUP_SUBINTENT_REQUIRED"
    );
  }


  return [
    intent,
    normalizedCluster,
    normalizedSubIntent,
  ].join(
    "::"
  );
}


function nullableSum(
  values:
    readonly (
      number | null
    )[]
) {
  const observed =
    values.filter(
      (
        value
      ): value is number =>
        value !==
        null
    );


  if (
    observed.length ===
    0
  ) {
    return null;
  }


  return observed.reduce(
    (
      total,
      value
    ) =>
      total +
      value,
    0
  );
}


function aggregateCtr(
  signals:
    readonly Readonly<QueryGroupObservedSignalV1>[]
) {
  /*
   * Do not average CTR percentages.
   *
   * Only compute group CTR when every member has both
   * impressions and clicks. Otherwise aggregation would
   * manufacture completeness.
   */
  if (
    signals.some(
      (
        signal
      ) =>
        signal.impressions ===
          null ||
        signal.clicks ===
          null
    )
  ) {
    return null;
  }


  const impressions =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        (
          signal.impressions ??
          0
        ),
      0
    );


  const clicks =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        (
          signal.clicks ??
          0
        ),
      0
    );


  if (
    impressions ===
    0
  ) {
    return null;
  }


  return (
    clicks /
    impressions
  );
}


function aggregatePosition(
  signals:
    readonly Readonly<QueryGroupObservedSignalV1>[]
) {
  /*
   * Search Console average position is impression-weighted.
   * Preserve that property at group level.
   *
   * Rows without both position and positive impressions do
   * not contribute to the weighted position.
   */
  const weighted =
    signals.filter(
      (
        signal
      ) =>
        signal.position !==
          null &&
        signal.impressions !==
          null &&
        signal.impressions >
          0
    );


  if (
    weighted.length ===
    0
  ) {
    return null;
  }


  const impressions =
    weighted.reduce(
      (
        total,
        signal
      ) =>
        total +
        (
          signal.impressions ??
          0
        ),
      0
    );


  if (
    impressions ===
    0
  ) {
    return null;
  }


  const weightedPosition =
    weighted.reduce(
      (
        total,
        signal
      ) =>
        total +
        (
          (
            signal.position ??
            0
          ) *
          (
            signal.impressions ??
            0
          )
        ),
      0
    );


  return (
    weightedPosition /
    impressions
  );
}


function buildGroup(
  signals:
    readonly Readonly<QueryGroupObservedSignalV1>[]
):
  Readonly<QueryGroupOutcomeV1> {
  const first =
    signals[0];


  if (
    !first
  ) {
    throw new Error(
      "QUERY_GROUP_EMPTY_GROUP"
    );
  }


  const groupId =
    buildStableQueryGroupIdV1({
      intent:
        first.intent,

      cluster:
        first.cluster,

      subIntent:
        first.subIntent,
    });


  for (
    const signal
    of signals
  ) {
    const candidateId =
      buildStableQueryGroupIdV1({
        intent:
          signal.intent,

        cluster:
          signal.cluster,

        subIntent:
          signal.subIntent,
      });


    if (
      candidateId !==
      groupId
    ) {
      throw new Error(
        "QUERY_GROUP_MIXED_GROUP_INPUT"
      );
    }
  }


  return Object.freeze({
    groupId,

    intent:
      first.intent,

    cluster:
      first.cluster.trim(),

    subIntent:
      first.subIntent.trim(),

    queries:
      stableValues(
        signals.map(
          (
            signal
          ) =>
            canonicalQuery(
              signal.query
            )
        )
      ),

    pageUrls:
      stableValues(
        signals
          .map(
            (
              signal
            ) =>
              signal.pageUrl
                ?.trim() ??
              ""
          )
          .filter(
            Boolean
          )
      ),

    queryNodeIds:
      stableValues(
        signals
          .map(
            (
              signal
            ) =>
              signal.queryNodeId
                ?.trim() ??
              ""
          )
          .filter(
            Boolean
          )
      ),

    sectionIds:
      stableValues(
        signals
          .map(
            (
              signal
            ) =>
              signal.sectionId
                ?.trim() ??
              ""
          )
          .filter(
            Boolean
          )
      ),

    sectionHeadings:
      stableValues(
        signals
          .map(
            (
              signal
            ) =>
              signal.sectionHeading
                ?.trim() ??
              ""
          )
          .filter(
            Boolean
          )
      ),

    impressions:
      nullableSum(
        signals.map(
          (
            signal
          ) =>
            signal.impressions
        )
      ),

    clicks:
      nullableSum(
        signals.map(
          (
            signal
          ) =>
            signal.clicks
        )
      ),

    ctr:
      aggregateCtr(
        signals
      ),

    position:
      aggregatePosition(
        signals
      ),

    memberQueryCount:
      new Set(
        signals.map(
          (
            signal
          ) =>
            canonicalQuery(
              signal.query
            )
        )
      ).size,

    minSourceConfidence:
      Math.min(
        ...signals.map(
          (
            signal
          ) =>
            signal.sourceConfidence
        )
      ),

    maxSourceConfidence:
      Math.max(
        ...signals.map(
          (
            signal
          ) =>
            signal.sourceConfidence
        )
      ),
  });
}


export function buildQueryGroupCheckpointOutcomeV1({
  checkpoint,
  signals,
}: {
  checkpoint:
    OutcomeCheckpoint;

  signals:
    readonly Readonly<QueryGroupObservedSignalV1>[];
}):
  Readonly<QueryGroupCheckpointOutcomeV1> {
  const seenRows =
    new Set<string>();


  const accepted:
    QueryGroupObservedSignalV1[] =
      [];


  let excludedForeignMissionQueries =
    0;


  let excludedNoMetricQueries =
    0;


  for (
    const signal
    of signals
  ) {
    assertSignal(
      signal
    );


    if (
      signal.checkpoint !==
      checkpoint
    ) {
      throw new Error(
        `QUERY_GROUP_CHECKPOINT_MISMATCH:${signal.checkpoint}:${checkpoint}`
      );
    }


    const duplicateKey =
      [
        checkpoint,
        canonicalQuery(
          signal.query
        ),
        normalizedText(
          signal.pageUrl ??
          ""
        ),
      ].join(
        "::"
      );


    if (
      seenRows.has(
        duplicateKey
      )
    ) {
      throw new Error(
        `QUERY_GROUP_DUPLICATE_OBSERVATION:${canonicalQuery(signal.query)}`
      );
    }


    seenRows.add(
      duplicateKey
    );


    if (
      !signal.sameMissionEvidence
    ) {
      excludedForeignMissionQueries +=
        1;

      continue;
    }


    if (
      !hasObservedMetric(
        signal
      )
    ) {
      excludedNoMetricQueries +=
        1;

      continue;
    }


    accepted.push(
      signal
    );
  }


  const buckets =
    new Map<
      string,
      QueryGroupObservedSignalV1[]
    >();


  for (
    const signal
    of accepted
  ) {
    const groupId =
      buildStableQueryGroupIdV1({
        intent:
          signal.intent,

        cluster:
          signal.cluster,

        subIntent:
          signal.subIntent,
      });


    const bucket =
      buckets.get(
        groupId
      ) ??
      [];


    bucket.push(
      signal
    );


    buckets.set(
      groupId,
      bucket
    );
  }


  const groups =
    Object.freeze(
      [
        ...buckets.values(),
      ]
        .map(
          buildGroup
        )
        .sort(
          (
            a,
            b
          ) =>
            a.groupId.localeCompare(
              b.groupId
            )
        )
    );


  const positioned =
    groups.filter(
      (
        group
      ) =>
        group.position !==
        null
    );


  return Object.freeze({
    version:
      QUERY_GROUP_OUTCOME_VERSION,

    checkpoint,

    queryGroupBreadth:
      groups.length,

    top3Groups:
      positioned.filter(
        (
          group
        ) =>
          (
            group.position ??
            Infinity
          ) <=
          3
      ).length,

    top10Groups:
      positioned.filter(
        (
          group
        ) =>
          (
            group.position ??
            Infinity
          ) <=
          10
      ).length,

    top20Groups:
      positioned.filter(
        (
          group
        ) =>
          (
            group.position ??
            Infinity
          ) <=
          20
      ).length,

    totalImpressions:
      nullableSum(
        groups.map(
          (
            group
          ) =>
            group.impressions
        )
      ),

    totalClicks:
      nullableSum(
        groups.map(
          (
            group
          ) =>
            group.clicks
        )
      ),

    groups,

    excludedForeignMissionQueries,

    excludedNoMetricQueries,

    provenance:
      Object.freeze({
        groupingSemantics:
          "EXISTING_QUERY_GRAPH_INTENT_CLUSTER_SUBINTENT",

        noSemanticInference:
          true,

        noSeoScore:
          true,

        noRankingProbability:
          true,

        observedMetricsOnly:
          true,
      }),
  });
}


export function compareQueryGroupBreadthV1(
  from:
    Readonly<QueryGroupCheckpointOutcomeV1>,
  to:
    Readonly<QueryGroupCheckpointOutcomeV1>
):
  Readonly<QueryBreadthComparisonV1> {
  if (
    CHECKPOINT_ORDER[
      to.checkpoint
    ] <=
    CHECKPOINT_ORDER[
      from.checkpoint
    ]
  ) {
    throw new Error(
      "QUERY_GROUP_COMPARISON_NOT_FORWARD"
    );
  }


  const fromIds =
    new Set(
      from.groups.map(
        (
          group
        ) =>
          group.groupId
      )
    );


  const toIds =
    new Set(
      to.groups.map(
        (
          group
        ) =>
          group.groupId
      )
    );


  const gainedGroupIds =
    stableValues(
      [
        ...toIds,
      ].filter(
        (
          id
        ) =>
          !fromIds.has(
            id
          )
      )
    );


  const lostGroupIds =
    stableValues(
      [
        ...fromIds,
      ].filter(
        (
          id
        ) =>
          !toIds.has(
            id
          )
      )
    );


  const retainedGroupIds =
    stableValues(
      [
        ...toIds,
      ].filter(
        (
          id
        ) =>
          fromIds.has(
            id
          )
      )
    );


  const delta =
    to.queryGroupBreadth -
    from.queryGroupBreadth;


  return Object.freeze({
    fromCheckpoint:
      from.checkpoint,

    toCheckpoint:
      to.checkpoint,

    fromBreadth:
      from.queryGroupBreadth,

    toBreadth:
      to.queryGroupBreadth,

    delta,

    direction:
      delta >
        0
        ? "INCREASED"
        : delta <
            0
          ? "DECREASED"
          : "UNCHANGED",

    gainedGroupIds,

    lostGroupIds,

    retainedGroupIds,
  });
}


export function buildQueryGroupOutcomeSeriesV1(
  signals:
    readonly Readonly<QueryGroupObservedSignalV1>[]
):
  Readonly<QueryGroupOutcomeSeriesV1> {
  const grouped =
    new Map<
      OutcomeCheckpoint,
      QueryGroupObservedSignalV1[]
    >();


  for (
    const signal
    of signals
  ) {
    const bucket =
      grouped.get(
        signal.checkpoint
      ) ??
      [];


    bucket.push(
      signal
    );


    grouped.set(
      signal.checkpoint,
      bucket
    );
  }


  const checkpoints =
    Object.freeze(
      [
        ...grouped.entries(),
      ]
        .sort(
          (
            [a],
            [b]
          ) =>
            CHECKPOINT_ORDER[
              a
            ] -
            CHECKPOINT_ORDER[
              b
            ]
        )
        .map(
          (
            [
              checkpoint,
              checkpointSignals,
            ]
          ) =>
            buildQueryGroupCheckpointOutcomeV1({
              checkpoint,

              signals:
                checkpointSignals,
            })
        )
    );


  const comparisons:
    QueryBreadthComparisonV1[] =
      [];


  for (
    let index = 1;
    index <
    checkpoints.length;
    index +=
      1
  ) {
    const previous =
      checkpoints[
        index -
        1
      ];


    const current =
      checkpoints[
        index
      ];


    if (
      previous &&
      current
    ) {
      comparisons.push(
        compareQueryGroupBreadthV1(
          previous,
          current
        )
      );
    }
  }


  return Object.freeze({
    version:
      QUERY_GROUP_OUTCOME_VERSION,

    checkpoints,

    comparisons:
      Object.freeze(
        comparisons
      ),

    provenance:
      Object.freeze({
        immutableDerivedSeries:
          true,

        noCausalInference:
          true,

        noSemanticInference:
          true,

        noSeoScore:
          true,
      }),
  });
}
