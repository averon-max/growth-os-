export const OUTCOME_BOTTLENECK_VERSION =
  "OUTCOME_BOTTLENECK_V1" as const;


export type OutcomePrimaryBottleneckV1 =
  | "INSUFFICIENT_EVIDENCE"
  | "EARLY_OBSERVATION"
  | "SERP_PRESENTATION"
  | "QUERY_GROUP_LOSS"
  | "QUERY_GROUP_DECAY"
  | "SECTION_GAP"
  | "SEARCH_VISIBILITY"
  | "MIXED_SIGNALS"
  | "NONE";


export type OutcomeNextBestActionV1 =
  | "COLLECT_MORE_DATA"
  | "HOLD_AND_OBSERVE"
  | "REVIEW_SERP_PRESENTATION"
  | "INVESTIGATE_LOST_QUERY_GROUP"
  | "REVIEW_DECAYING_SECTION"
  | "STRENGTHEN_EXISTING_SECTION"
  | "REVIEW_QUERY_COVERAGE"
  | "INVESTIGATE_VISIBILITY"
  | "REVIEW_MIXED_SIGNALS";


export type OutcomeActionScopeV1 =
  | "OBSERVATION"
  | "PAGE"
  | "QUERY_GROUP"
  | "SECTION";


export interface BottleneckLongitudinalInputV1 {
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
}


export interface BottleneckQueryGroupInputV1 {
  groupId:
    string;

  status:
    | "WINNING"
    | "EMERGING"
    | "STRIKING_DISTANCE"
    | "DECAYING"
    | "LOST";

  cluster:
    string;

  subIntent:
    string;

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
}


export interface BottleneckQueryDiagnosisInputV1 {
  latestCheckpoint:
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
    readonly Readonly<
      BottleneckQueryGroupInputV1
    >[];
}


function bestGroup(
  groups:
    readonly Readonly<
      BottleneckQueryGroupInputV1
    >[],
  status:
    BottleneckQueryGroupInputV1[
      "status"
    ]
):
  Readonly<
    BottleneckQueryGroupInputV1
  > |
  null {
  const candidates =
    groups
      .filter(
        (
          group
        ) =>
          group.status ===
          status
      )
      .sort(
        (
          a,
          b
        ) => {
          const impressionDelta =
            (
              b.impressions ??
              -1
            ) -
            (
              a.impressions ??
              -1
            );

          if (
            impressionDelta !==
            0
          ) {
            return impressionDelta;
          }

          const aPosition =
            a.position ??
            a.previousPosition ??
            Infinity;

          const bPosition =
            b.position ??
            b.previousPosition ??
            Infinity;

          if (
            aPosition !==
            bPosition
          ) {
            return (
              aPosition -
              bPosition
            );
          }

          return a.groupId.localeCompare(
            b.groupId
          );
        }
      );

  return (
    candidates[0] ??
    null
  );
}


function decision({
  primaryBottleneck,
  nextBestAction,
  actionScope,
  group = null,
  reason,
}: {
  primaryBottleneck:
    OutcomePrimaryBottleneckV1;

  nextBestAction:
    OutcomeNextBestActionV1;

  actionScope:
    OutcomeActionScopeV1;

  group?:
    Readonly<
      BottleneckQueryGroupInputV1
    > |
    null;

  reason:
    string;
}) {
  return Object.freeze({
    version:
      OUTCOME_BOTTLENECK_VERSION,

    primaryBottleneck,

    nextBestAction,

    actionScope,

    affectedGroupId:
      group?.groupId ??
      null,

    affectedCluster:
      group?.cluster ??
      null,

    affectedSubIntent:
      group?.subIntent ??
      null,

    affectedSectionHeadings:
      Object.freeze(
        [
          ...(
            group
              ?.sectionHeadings ??
            []
          ),
        ]
      ),

    reason,

    provenance:
      Object.freeze({
        deterministic:
          true as const,

        observedEvidenceOnly:
          true as const,

        noCausalInference:
          true as const,

        noSeoScore:
          true as const,

        noRankingProbability:
          true as const,

        noAutoApply:
          true as const,

        noNewArticleByDefault:
          true as const,
      }),
  });
}


export function buildOutcomeBottleneckDecisionV1({
  longitudinal,
  queryOutcome,
}: {
  longitudinal:
    Readonly<
      BottleneckLongitudinalInputV1
    > |
    null;

  queryOutcome:
    Readonly<
      BottleneckQueryDiagnosisInputV1
    > |
    null;
}) {
  /*
   * No page-level evidence means there is not enough
   * evidence to safely prescribe an SEO intervention.
   */
  if (
    !longitudinal ||
    longitudinal.status ===
      "INSUFFICIENT_EVIDENCE" ||
    longitudinal.nextAction ===
      "COLLECT_MORE_DATA"
  ) {
    return decision({
      primaryBottleneck:
        "INSUFFICIENT_EVIDENCE",

      nextBestAction:
        "COLLECT_MORE_DATA",

      actionScope:
        "OBSERVATION",

      reason:
        "PAGE_LEVEL_OUTCOME_EVIDENCE_INSUFFICIENT",
    });
  }


  /*
   * D7/D14 are deliberately observation-first.
   * Early movement is not a rewrite trigger.
   */
  if (
    longitudinal.phase ===
      "EARLY" ||
    longitudinal.status ===
      "EARLY_SIGNAL"
  ) {
    return decision({
      primaryBottleneck:
        "EARLY_OBSERVATION",

      nextBestAction:
        "HOLD_AND_OBSERVE",

      actionScope:
        "OBSERVATION",

      reason:
        "EARLY_CHECKPOINT_NOT_AN_INTERVENTION_TRIGGER",
    });
  }


  /*
   * A page-level presentation pattern is more specific
   * than generic query opportunity labels.
   */
  if (
    longitudinal.bottleneck ===
      "SERP_PRESENTATION" ||
    longitudinal.nextAction ===
      "REVIEW_SERP_PRESENTATION"
  ) {
    return decision({
      primaryBottleneck:
        "SERP_PRESENTATION",

      nextBestAction:
        "REVIEW_SERP_PRESENTATION",

      actionScope:
        "PAGE",

      reason:
        "OBSERVED_IMPRESSION_CTR_PRESENTATION_PATTERN",
    });
  }


  if (
    queryOutcome
  ) {
    const lost =
      bestGroup(
        queryOutcome.groups,
        "LOST"
      );

    if (
      lost
    ) {
      return decision({
        primaryBottleneck:
          "QUERY_GROUP_LOSS",

        nextBestAction:
          "INVESTIGATE_LOST_QUERY_GROUP",

        actionScope:
          "QUERY_GROUP",

        group:
          lost,

        reason:
          "PREVIOUSLY_OBSERVED_QUERY_GROUP_NOT_OBSERVED_LATEST",
      });
    }


    const decaying =
      bestGroup(
        queryOutcome.groups,
        "DECAYING"
      );

    if (
      decaying
    ) {
      return decision({
        primaryBottleneck:
          "QUERY_GROUP_DECAY",

        nextBestAction:
          "REVIEW_DECAYING_SECTION",

        actionScope:
          decaying
              .sectionHeadings
              .length >
            0
            ? "SECTION"
            : "QUERY_GROUP",

        group:
          decaying,

        reason:
          decaying
              .sectionHeadings
              .length >
            0
            ? "OBSERVED_QUERY_GROUP_DECAY_MAPPED_TO_EXISTING_SECTION"
            : "OBSERVED_QUERY_GROUP_DECAY_WITHOUT_UNIQUE_SECTION_MAPPING",
      });
    }


    const striking =
      bestGroup(
        queryOutcome.groups,
        "STRIKING_DISTANCE"
      );

    if (
      striking
    ) {
      const mappedSection =
        striking
          .sectionHeadings
          .length >
        0;

      return decision({
        primaryBottleneck:
          "SECTION_GAP",

        nextBestAction:
          mappedSection
            ? "STRENGTHEN_EXISTING_SECTION"
            : "REVIEW_QUERY_COVERAGE",

        actionScope:
          mappedSection
            ? "SECTION"
            : "QUERY_GROUP",

        group:
          striking,

        reason:
          mappedSection
            ? "OBSERVED_POSITION_11_TO_20_WITH_EXISTING_SECTION_PROVENANCE"
            : "OBSERVED_POSITION_11_TO_20_WITHOUT_UNIQUE_SECTION_PROVENANCE",
      });
    }
  }


  if (
    longitudinal.bottleneck ===
      "SEARCH_VISIBILITY" ||
    longitudinal.nextAction ===
      "INVESTIGATE_VISIBILITY"
  ) {
    return decision({
      primaryBottleneck:
        "SEARCH_VISIBILITY",

      nextBestAction:
        "INVESTIGATE_VISIBILITY",

      actionScope:
        "PAGE",

      reason:
        "PAGE_LEVEL_VISIBILITY_PATTERN",
    });
  }


  if (
    longitudinal.status ===
      "DECLINING" ||
    longitudinal.nextAction ===
      "INVESTIGATE_DECLINE" ||
    longitudinal.bottleneck ===
      "MIXED_SIGNALS" ||
    longitudinal.nextAction ===
      "REVIEW_MIXED_SIGNALS"
  ) {
    return decision({
      primaryBottleneck:
        "MIXED_SIGNALS",

      nextBestAction:
        "REVIEW_MIXED_SIGNALS",

      actionScope:
        "PAGE",

      reason:
        "PAGE_LEVEL_DECLINE_OR_MIXED_SIGNAL_WITHOUT_MORE_SPECIFIC_QUERY_BOTTLENECK",
    });
  }


  return decision({
    primaryBottleneck:
      "NONE",

    nextBestAction:
      "HOLD_AND_OBSERVE",

    actionScope:
      "OBSERVATION",

    reason:
      "NO_ACTIONABLE_BOTTLENECK_IN_OBSERVED_EVIDENCE",
  });
}
