import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildQueryGroupOutcomeSeriesV1,
  type QueryGroupObservedSignalV1,
} from "./outcome-query-groups";

import {
  buildActionOutcomeRowsFromEvidenceV1,
  buildQueryDiagnosisThroughCheckpointV1,
} from "./action-outcome-materializer";


function signal({
  checkpoint,
  position,
}: {
  checkpoint:
    QueryGroupObservedSignalV1[
      "checkpoint"
    ];

  position:
    number;
}):
  QueryGroupObservedSignalV1 {
  return {
    checkpoint,

    query:
      "credit monitoring comparison",

    intent:
      "INFORMATIONAL",

    cluster:
      "credit monitoring",

    subIntent:
      "comparison",

    sameMissionEvidence:
      true,

    sourceConfidence:
      1,

    pageUrl:
      "https://example.com/article",

    queryNodeId:
      "node-comparison",

    sectionId:
      null,

    sectionHeading:
      "Credit Monitoring Comparison",

    impressions:
      100,

    clicks:
      10,

    ctr:
      0.1,

    position,
  };
}


function action() {
  return {
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
      "https://example.com/article",

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
      null,

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
  };
}


const baseline = {
  liveRank:
    50,

  liveRankState:
    "FOUND",

  impressions:
    20,

  clicks:
    1,

  ctr:
    0.05,

  averagePosition:
    45,

  gscSnapshotDate:
    new Date(
      "2026-09-01T00:00:00.000Z"
    ),
};


const observations = [
  {
    checkpoint:
      "DAY_7" as const,

    source:
      "COMBINED",

    liveRank:
      30,

    liveRankState:
      "FOUND",

    impressions:
      50,

    clicks:
      3,

    ctr:
      0.06,

    averagePosition:
      29,

    gscSnapshotDate:
      new Date(
        "2026-09-08T00:00:00.000Z"
      ),

    pageUrl:
      "https://example.com/article",

    observedAt:
      new Date(
        "2026-09-08T12:00:00.000Z"
      ),
  },

  {
    checkpoint:
      "DAY_28" as const,

    source:
      "COMBINED",

    liveRank:
      8,

    liveRankState:
      "FOUND",

    impressions:
      300,

    clicks:
      30,

    ctr:
      0.1,

    averagePosition:
      8,

    gscSnapshotDate:
      new Date(
        "2026-09-29T00:00:00.000Z"
      ),

    pageUrl:
      "https://example.com/article",

    observedAt:
      new Date(
        "2026-09-29T12:00:00.000Z"
      ),
  },

  {
    checkpoint:
      "DAY_60" as const,

    source:
      "COMBINED",

    liveRank:
      18,

    liveRankState:
      "FOUND",

    impressions:
      400,

    clicks:
      32,

    ctr:
      0.08,

    averagePosition:
      18,

    gscSnapshotDate:
      new Date(
        "2026-10-31T00:00:00.000Z"
      ),

    pageUrl:
      "https://example.com/article",

    observedAt:
      new Date(
        "2026-10-31T12:00:00.000Z"
      ),
  },
];


describe(
  "action outcome materializer v1",
  () => {
    it(
      "cuts query outcome at the requested checkpoint",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",

              position:
                8,
            }),

            signal({
              checkpoint:
                "DAY_60",

              position:
                18,
            }),
          ]);


        const day28 =
          buildQueryDiagnosisThroughCheckpointV1({
            series,

            throughCheckpoint:
              "DAY_28",
          });


        const day60 =
          buildQueryDiagnosisThroughCheckpointV1({
            series,

            throughCheckpoint:
              "DAY_60",
          });


        expect(
          day28
            ?.latestCheckpoint
        ).toBe(
          "DAY_28"
        );

        expect(
          day28
            ?.counts
            .WINNING
        ).toBe(1);

        expect(
          day28
            ?.counts
            .DECAYING
        ).toBe(0);


        expect(
          day60
            ?.latestCheckpoint
        ).toBe(
          "DAY_60"
        );

        expect(
          day60
            ?.counts
            .DECAYING
        ).toBe(1);
      }
    );


    it(
      "does not carry an older query diagnosis into a missing checkpoint",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",

              position:
                8,
            }),
          ]);


        expect(
          buildQueryDiagnosisThroughCheckpointV1({
            series,

            throughCheckpoint:
              "DAY_60",
          })
        ).toBeNull();
      }
    );


    it(
      "materializes mature rows using only checkpoint-prefix evidence",
      () => {
        const querySeries =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",

              position:
                8,
            }),

            signal({
              checkpoint:
                "DAY_60",

              position:
                18,
            }),
          ]);


        const rows =
          buildActionOutcomeRowsFromEvidenceV1({
            action:
              action(),

            baseline,

            observations,

            querySeries,
          });


        expect(
          rows
        ).toHaveLength(2);

        expect(
          rows.map(
            (
              row
            ) =>
              row.outcome
                .checkpoint
          )
        ).toEqual([
          "DAY_28",
          "DAY_60",
        ]);


        const day28 =
          rows[0]!;

        const day60 =
          rows[1]!;


        expect(
          day28
            .diagnosis
            .queryOutcome
            ?.counts
            .WINNING
        ).toBe(1);

        expect(
          day28
            .diagnosis
            .queryOutcome
            ?.counts
            .DECAYING
        ).toBe(0);


        expect(
          day60
            .diagnosis
            .queryOutcome
            ?.counts
            .DECAYING
        ).toBe(1);


        expect(
          day28
            .diagnosis
            .bottleneck
            .primaryBottleneck
        ).not.toBe(
          "QUERY_GROUP_DECAY"
        );

        expect(
          day60
            .diagnosis
            .bottleneck
            .primaryBottleneck
        ).toBe(
          "QUERY_GROUP_DECAY"
        );
      }
    );


    it(
      "does not materialize early D7 rows into the mature dataset",
      () => {
        const rows =
          buildActionOutcomeRowsFromEvidenceV1({
            action:
              action(),

            baseline,

            observations: [
              observations[0]!,
            ],

            querySeries:
              null,
          });


        expect(
          rows
        ).toHaveLength(0);
      }
    );
  }
);
