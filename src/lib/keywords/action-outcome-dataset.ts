export const ACTION_OUTCOME_DATASET_VERSION =
  "ACTION_OUTCOME_DATASET_V1" as const;


export type ActionOutcomeExecutionKindV1 =
  | "CONTENT_PUBLISH"
  | "CMS_FIX";


export type ActionOutcomeCheckpointV1 =
  | "DAY_7"
  | "DAY_14"
  | "DAY_28"
  | "DAY_60"
  | "DAY_90";


export interface ActionOutcomeActionInputV1 {
  id:
    string;

  workspaceId:
    string;

  websiteId:
    string;

  keywordText:
    string;

  normalizedKeyword:
    string;

  market:
    string;

  language:
    string;

  device:
    string;

  decision:
    "CREATE" |
    "UPDATE" |
    "SKIP";

  compatibilityStatus:
    string;

  targetPageUrl:
    string | null;

  source:
    string;

  status:
    string;

  executedAt:
    Date | null;

  contentArticleId:
    string | null;

  appliedFixId:
    string | null;

  supersedesActionId:
    string | null;

  planSnapshot:
    unknown;

  evidence:
    unknown;

  compatibilitySnapshot:
    unknown;
}


export interface ActionOutcomeBaselineInputV1 {
  liveRank:
    number | null;

  liveRankState:
    string;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  averagePosition:
    number | null;

  gscSnapshotDate:
    Date | null;
}


export interface ActionOutcomeObservationInputV1 {
  checkpoint:
    ActionOutcomeCheckpointV1;

  source:
    string;

  liveRank:
    number | null;

  liveRankState:
    string;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  averagePosition:
    number | null;

  gscSnapshotDate:
    Date | null;

  pageUrl:
    string | null;

  observedAt:
    Date;
}


export interface ActionOutcomeLongitudinalInputV1 {
  version:
    string;

  phase:
    string;

  status:
    string;

  bottleneck:
    string;

  nextAction:
    string;

  latestCheckpoint:
    string | null;

  observationCount:
    number;

  trends:
    unknown;

  evidence:
    unknown;
}


export interface ActionOutcomeQueryInputV1 {
  version:
    string;

  latestCheckpoint:
    string | null;

  previousCheckpoint:
    string | null;

  counts: Readonly<{
    WINNING:
      number;

    EMERGING:
      number;

    STRIKING_DISTANCE:
      number;

    DECAYING:
      number;

    LOST:
      number;
  }>;

  groups:
    readonly Readonly<{
      groupId:
        string;

      status:
        string;

      cluster:
        string;

      subIntent:
        string;

      position:
        number | null;

      previousPosition:
        number | null;

      impressions:
        number | null;

      clicks:
        number | null;

      sectionHeadings:
        readonly string[];
    }>[];
}


export interface ActionOutcomeBottleneckInputV1 {
  version:
    string;

  primaryBottleneck:
    string;

  nextBestAction:
    string;

  actionScope:
    string;

  affectedGroupId:
    string | null;

  affectedCluster:
    string | null;

  affectedSubIntent:
    string | null;

  affectedSectionHeadings:
    readonly string[];

  reason:
    string;
}


function executionKind(
  action:
    Readonly<
      ActionOutcomeActionInputV1
    >
): ActionOutcomeExecutionKindV1 {
  const article =
    Boolean(
      action.contentArticleId
    );

  const fix =
    Boolean(
      action.appliedFixId
    );


  if (
    article ===
    fix
  ) {
    throw new Error(
      "ACTION_OUTCOME_EXECUTION_REFERENCE_INVALID"
    );
  }


  return article
    ? "CONTENT_PUBLISH"
    : "CMS_FIX";
}


function iso(
  value:
    Date | null
): string | null {
  return value
    ? value.toISOString()
    : null;
}


function stableJson(
  value:
    unknown
): string {
  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return JSON.stringify(
      value
    );
  }


  if (
    Array.isArray(
      value
    )
  ) {
    return `[${value
      .map(
        stableJson
      )
      .join(",")}]`;
  }


  const object =
    value as Record<
      string,
      unknown
    >;


  return `{${Object
    .keys(
      object
    )
    .sort()
    .map(
      (
        key
      ) =>
        `${JSON.stringify(
          key
        )}:${stableJson(
          object[key]
        )}`
    )
    .join(",")}}`;
}


function fingerprint(
  value:
    unknown
): string {
  /*
   * Stable deterministic non-cryptographic artifact identity.
   *
   * This is NOT security-sensitive and NOT a quality score.
   */
  const input =
    stableJson(
      value
    );

  let hash =
    2166136261;


  for (
    let index =
      0;
    index <
    input.length;
    index +=
      1
  ) {
    hash ^=
      input.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }


  return `fnv1a32:${(
    hash >>>
    0
  )
    .toString(16)
    .padStart(
      8,
      "0"
    )}`;
}


export function buildActionOutcomeDatasetRowV1({
  action,
  baseline,
  observation,
  longitudinal,
  queryOutcome,
  bottleneck,
}: {
  action:
    Readonly<
      ActionOutcomeActionInputV1
    >;

  baseline:
    Readonly<
      ActionOutcomeBaselineInputV1
    >;

  observation:
    Readonly<
      ActionOutcomeObservationInputV1
    >;

  longitudinal:
    Readonly<
      ActionOutcomeLongitudinalInputV1
    >;

  queryOutcome:
    Readonly<
      ActionOutcomeQueryInputV1
    > |
    null;

  bottleneck:
    Readonly<
      ActionOutcomeBottleneckInputV1
    >;
}) {
  if (
    action.status !==
      "EXECUTED" ||
    !action.executedAt
  ) {
    throw new Error(
      "ACTION_OUTCOME_REQUIRES_EXECUTED_ACTION"
    );
  }


  if (
    longitudinal
      .latestCheckpoint !==
    observation.checkpoint
  ) {
    throw new Error(
      "ACTION_OUTCOME_LONGITUDINAL_CHECKPOINT_MISMATCH"
    );
  }


  if (
    queryOutcome
      ?.latestCheckpoint &&
    queryOutcome
      .latestCheckpoint !==
      observation.checkpoint
  ) {
    throw new Error(
      "ACTION_OUTCOME_QUERY_CHECKPOINT_MISMATCH"
    );
  }


  const kind =
    executionKind(
      action
    );


  const payload =
    Object.freeze({
      version:
        ACTION_OUTCOME_DATASET_VERSION,

      action:
        Object.freeze({
          actionId:
            action.id,

          workspaceId:
            action.workspaceId,

          websiteId:
            action.websiteId,

          revisionOfActionId:
            action.supersedesActionId,

          keywordText:
            action.keywordText,

          normalizedKeyword:
            action.normalizedKeyword,

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
            action.targetPageUrl,

          source:
            action.source,

          planSnapshot:
            action.planSnapshot,

          evidence:
            action.evidence,

          compatibilitySnapshot:
            action
              .compatibilitySnapshot,
        }),

      execution:
        Object.freeze({
          kind,

          executedAt:
            iso(
              action.executedAt
            ),

          contentArticleId:
            action
              .contentArticleId,

          appliedFixId:
            action
              .appliedFixId,
        }),

      baseline:
        Object.freeze({
          liveRank:
            baseline.liveRank,

          liveRankState:
            baseline
              .liveRankState,

          impressions:
            baseline
              .impressions,

          clicks:
            baseline.clicks,

          ctr:
            baseline.ctr,

          averagePosition:
            baseline
              .averagePosition,

          gscSnapshotDate:
            iso(
              baseline
                .gscSnapshotDate
            ),
        }),

      outcome:
        Object.freeze({
          checkpoint:
            observation
              .checkpoint,

          source:
            observation.source,

          observedAt:
            observation
              .observedAt
              .toISOString(),

          gscSnapshotDate:
            iso(
              observation
                .gscSnapshotDate
            ),

          pageUrl:
            observation.pageUrl,

          liveRank:
            observation.liveRank,

          liveRankState:
            observation
              .liveRankState,

          impressions:
            observation
              .impressions,

          clicks:
            observation.clicks,

          ctr:
            observation.ctr,

          averagePosition:
            observation
              .averagePosition,
        }),

      diagnosis:
        Object.freeze({
          longitudinal:
            Object.freeze({
              version:
                longitudinal
                  .version,

              phase:
                longitudinal
                  .phase,

              status:
                longitudinal
                  .status,

              bottleneck:
                longitudinal
                  .bottleneck,

              nextAction:
                longitudinal
                  .nextAction,

              latestCheckpoint:
                longitudinal
                  .latestCheckpoint,

              observationCount:
                longitudinal
                  .observationCount,

              trends:
                longitudinal
                  .trends,

              evidence:
                longitudinal
                  .evidence,
            }),

          queryOutcome:
            queryOutcome
              ? Object.freeze({
                  version:
                    queryOutcome
                      .version,

                  latestCheckpoint:
                    queryOutcome
                      .latestCheckpoint,

                  previousCheckpoint:
                    queryOutcome
                      .previousCheckpoint,

                  counts:
                    queryOutcome
                      .counts,

                  groups:
                    queryOutcome
                      .groups,
                })
              : null,

          bottleneck:
            Object.freeze({
              version:
                bottleneck.version,

              primaryBottleneck:
                bottleneck
                  .primaryBottleneck,

              nextBestAction:
                bottleneck
                  .nextBestAction,

              actionScope:
                bottleneck
                  .actionScope,

              affectedGroupId:
                bottleneck
                  .affectedGroupId,

              affectedCluster:
                bottleneck
                  .affectedCluster,

              affectedSubIntent:
                bottleneck
                  .affectedSubIntent,

              affectedSectionHeadings:
                Object.freeze([
                  ...bottleneck
                    .affectedSectionHeadings,
                ]),

              reason:
                bottleneck.reason,
            }),
        }),

      provenance:
        Object.freeze({
          sourceActionImmutableRevision:
            true as const,

          checkpointObservationOnly:
            true as const,

          exactObservedMetrics:
            true as const,

          deterministicDerivedArtifact:
            true as const,

          noCausalInference:
            true as const,

          noSeoScore:
            true as const,

          noRankingProbability:
            true as const,

          notTrainingReadyByDefault:
            true as const,
        }),
    });


  return Object.freeze({
    ...payload,

    fingerprint:
      fingerprint(
        payload
      ),
  });
}


export function buildActionOutcomeDatasetV1(
  rows:
    readonly ReturnType<
      typeof buildActionOutcomeDatasetRowV1
    >[]
) {
  const seen =
    new Set<string>();


  const ordered =
    [...rows]
      .sort(
        (
          a,
          b
        ) =>
          a.action
            .actionId
            .localeCompare(
              b.action
                .actionId
            ) ||
          a.outcome
            .checkpoint
            .localeCompare(
              b.outcome
                .checkpoint
            )
      );


  for (
    const row
    of ordered
  ) {
    const key =
      `${row.action.actionId}:${row.outcome.checkpoint}`;


    if (
      seen.has(
        key
      )
    ) {
      throw new Error(
        "ACTION_OUTCOME_DUPLICATE_ACTION_CHECKPOINT"
      );
    }


    seen.add(
      key
    );
  }


  return Object.freeze({
    version:
      ACTION_OUTCOME_DATASET_VERSION,

    rowCount:
      ordered.length,

    rows:
      Object.freeze(
        ordered
      ),

    provenance:
      Object.freeze({
        immutableDerivedDataset:
          true as const,

        appendOnlyPersistenceNotYetEnabled:
          true as const,

        learnedWinnabilityNotYetEnabled:
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
