import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildActionOutcomeDatasetRowV1,
  buildActionOutcomeDatasetV1,
} from "./action-outcome-dataset";


function input() {
  return {
    action: {
      id:
        "action-1",

      workspaceId:
        "workspace-1",

      websiteId:
        "website-1",

      keywordText:
        "credit monitoring",

      normalizedKeyword:
        "credit monitoring",

      market:
        "United States",

      language:
        "en",

      device:
        "desktop",

      decision:
        "CREATE" as const,

      compatibilityStatus:
        "SUPPORTED",

      targetPageUrl:
        "https://example.com/credit-monitoring",

      source:
        "GROWTH_OS_ACTION_PLAN_V1",

      status:
        "EXECUTED",

      executedAt:
        new Date(
          "2026-09-01T00:00:00.000Z"
        ),

      contentArticleId:
        "article-1",

      appliedFixId:
        null as string | null,

      supersedesActionId:
        null,

      planSnapshot: {
        decision:
          "CREATE",
      },

      evidence: {
        source:
          "observed",
      },

      compatibilitySnapshot: {
        status:
          "SUPPORTED",
      },
    },

    baseline: {
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

      gscSnapshotDate:
        new Date(
          "2026-09-01T00:00:00.000Z"
        ),
    },

    observation: {
      checkpoint:
        "DAY_28" as const,

      source:
        "COMBINED",

      liveRank:
        18,

      liveRankState:
        "FOUND",

      impressions:
        500,

      clicks:
        30,

      ctr:
        0.06,

      averagePosition:
        17,

      gscSnapshotDate:
        new Date(
          "2026-09-29T00:00:00.000Z"
        ),

      pageUrl:
        "https://example.com/credit-monitoring",

      observedAt:
        new Date(
          "2026-09-29T12:00:00.000Z"
        ),
    },

    longitudinal: {
      version:
        "LONGITUDINAL_OUTCOME_V1",

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

      observationCount:
        3,

      trends: {
        rankFromBaseline:
          "IMPROVED",
      },

      evidence: [
        "OBSERVED",
      ],
    },

    queryOutcome: {
      version:
        "QUERY_OUTCOME_DIAGNOSIS_V1",

      latestCheckpoint:
        "DAY_28",

      previousCheckpoint:
        "DAY_14",

      counts: {
        WINNING:
          1,

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
            "WINNING",

          cluster:
            "credit monitoring",

          subIntent:
            "definition",

          position:
            7,

          previousPosition:
            12,

          impressions:
            300,

          clicks:
            24,

          sectionHeadings: [
            "What Is Credit Monitoring?",
          ],
        },
      ],
    },

    bottleneck: {
      version:
        "OUTCOME_BOTTLENECK_V1",

      primaryBottleneck:
        "NONE",

      nextBestAction:
        "HOLD_AND_OBSERVE",

      actionScope:
        "OBSERVATION",

      affectedGroupId:
        null,

      affectedCluster:
        null,

      affectedSubIntent:
        null,

      affectedSectionHeadings:
        [],

      reason:
        "NO_ACTIONABLE_BOTTLENECK_IN_OBSERVED_EVIDENCE",
    },
  };
}


describe(
  "action outcome dataset v1",
  () => {
    it(
      "creates an immutable observed action-outcome row",
      () => {
        const row =
          buildActionOutcomeDatasetRowV1(
            input()
          );


        expect(
          row.action.actionId
        ).toBe(
          "action-1"
        );

        expect(
          row.execution.kind
        ).toBe(
          "CONTENT_PUBLISH"
        );

        expect(
          row.outcome.checkpoint
        ).toBe(
          "DAY_28"
        );

        expect(
          row.provenance
            .noCausalInference
        ).toBe(true);

        expect(
          row.provenance
            .notTrainingReadyByDefault
        ).toBe(true);
      }
    );


    it(
      "produces the same fingerprint for identical evidence",
      () => {
        const a =
          buildActionOutcomeDatasetRowV1(
            input()
          );

        const b =
          buildActionOutcomeDatasetRowV1(
            input()
          );


        expect(
          a.fingerprint
        ).toBe(
          b.fingerprint
        );
      }
    );


    it(
      "rejects an action that was not executed",
      () => {
        const value =
          input();

        value.action.status =
          "PLANNED";


        expect(
          () =>
            buildActionOutcomeDatasetRowV1(
              value
            )
        ).toThrow(
          "ACTION_OUTCOME_REQUIRES_EXECUTED_ACTION"
        );
      }
    );


    it(
      "rejects ambiguous execution references",
      () => {
        const value =
          input();

        value.action.appliedFixId =
          "fix-1";


        expect(
          () =>
            buildActionOutcomeDatasetRowV1(
              value
            )
        ).toThrow(
          "ACTION_OUTCOME_EXECUTION_REFERENCE_INVALID"
        );
      }
    );


    it(
      "rejects checkpoint mismatch instead of relabeling evidence",
      () => {
        const value =
          input();

        value.longitudinal
          .latestCheckpoint =
          "DAY_60";


        expect(
          () =>
            buildActionOutcomeDatasetRowV1(
              value
            )
        ).toThrow(
          "ACTION_OUTCOME_LONGITUDINAL_CHECKPOINT_MISMATCH"
        );
      }
    );


    it(
      "rejects duplicate action checkpoint dataset rows",
      () => {
        const row =
          buildActionOutcomeDatasetRowV1(
            input()
          );


        expect(
          () =>
            buildActionOutcomeDatasetV1([
              row,
              row,
            ])
        ).toThrow(
          "ACTION_OUTCOME_DUPLICATE_ACTION_CHECKPOINT"
        );
      }
    );


    it(
      "does not silently enable learned winnability",
      () => {
        const dataset =
          buildActionOutcomeDatasetV1([
            buildActionOutcomeDatasetRowV1(
              input()
            ),
          ]);


        expect(
          dataset
            .provenance
            .learnedWinnabilityNotYetEnabled
        ).toBe(true);

        expect(
          dataset
            .provenance
            .appendOnlyPersistenceNotYetEnabled
        ).toBe(true);
      }
    );
  }
);
