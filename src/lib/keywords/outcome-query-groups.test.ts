import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildQueryGroupCheckpointOutcomeV1,
  buildQueryGroupOutcomeSeriesV1,
  buildStableQueryGroupIdV1,
  compareQueryGroupBreadthV1,
  type QueryGroupObservedSignalV1,
} from "./outcome-query-groups";


function signal(
  overrides:
    Partial<QueryGroupObservedSignalV1> = {}
):
  QueryGroupObservedSignalV1 {
  return {
    checkpoint:
      "DAY_28",

    query:
      "how does credit monitoring work",

    intent:
      "INFORMATIONAL",

    cluster:
      "credit monitoring",

    subIntent:
      "how credit monitoring works",

    sameMissionEvidence:
      true,

    sourceConfidence:
      1,

    pageUrl:
      "https://example.com/credit-monitoring",

    queryNodeId:
      "query-how-it-works",

    sectionId:
      "section-how-it-works",

    sectionHeading:
      "How Credit Monitoring Works",

    impressions:
      100,

    clicks:
      10,

    ctr:
      0.1,

    position:
      10,

    ...overrides,
  };
}


describe(
  "query group outcome v1",
  () => {
    it(
      "builds stable IDs from existing intent cluster and sub-intent semantics",
      () => {
        expect(
          buildStableQueryGroupIdV1({
            intent:
              "INFORMATIONAL",

            cluster:
              " Credit   Monitoring ",

            subIntent:
              " How Credit Monitoring Works ",
          })
        ).toBe(
          "INFORMATIONAL::credit monitoring::how credit monitoring works"
        );
      }
    );


    it(
      "groups query-string variants without doing new semantic inference",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),

              signal({
                query:
                  "how credit monitoring works",

                impressions:
                  300,

                clicks:
                  30,

                ctr:
                  0.1,

                position:
                  20,

                queryNodeId:
                  "query-how-it-works-variant",
              }),
            ],
          });

        expect(
          result.queryGroupBreadth
        ).toBe(1);

        expect(
          result.groups[0]
            ?.memberQueryCount
        ).toBe(2);

        expect(
          result.groups[0]
            ?.queries
        ).toEqual([
          "how credit monitoring works",
          "how does credit monitoring work",
        ]);
      }
    );


    it(
      "aggregates position by impressions instead of averaging query positions blindly",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal({
                impressions:
                  100,

                clicks:
                  10,

                position:
                  10,
              }),

              signal({
                query:
                  "how credit monitoring works",

                impressions:
                  300,

                clicks:
                  30,

                position:
                  20,
              }),
            ],
          });

        expect(
          result.groups[0]
            ?.position
        ).toBe(17.5);

        expect(
          result.groups[0]
            ?.ctr
        ).toBe(0.1);

        expect(
          result.groups[0]
            ?.impressions
        ).toBe(400);

        expect(
          result.groups[0]
            ?.clicks
        ).toBe(40);
      }
    );


    it(
      "excludes foreign-mission demand from query breadth",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),

              signal({
                query:
                  "experian credit monitoring",

                cluster:
                  "experian",

                subIntent:
                  "experian credit monitoring",

                sameMissionEvidence:
                  false,

                impressions:
                  100000,

                clicks:
                  10000,

                position:
                  1,
              }),
            ],
          });

        expect(
          result.queryGroupBreadth
        ).toBe(1);

        expect(
          result.excludedForeignMissionQueries
        ).toBe(1);

        expect(
          result.totalImpressions
        ).toBe(100);
      }
    );


    it(
      "does not count rows with no observed metrics as breadth",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal({
                impressions:
                  null,

                clicks:
                  null,

                ctr:
                  null,

                position:
                  null,
              }),
            ],
          });

        expect(
          result.queryGroupBreadth
        ).toBe(0);

        expect(
          result.excludedNoMetricQueries
        ).toBe(1);

        expect(
          result.totalImpressions
        ).toBeNull();
      }
    );


    it(
      "preserves query to graph-node to section provenance",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),
            ],
          });

        expect(
          result.groups[0]
            ?.queryNodeIds
        ).toEqual([
          "query-how-it-works",
        ]);

        expect(
          result.groups[0]
            ?.sectionIds
        ).toEqual([
          "section-how-it-works",
        ]);

        expect(
          result.groups[0]
            ?.sectionHeadings
        ).toEqual([
          "How Credit Monitoring Works",
        ]);
      }
    );


    it(
      "measures real breadth expansion across checkpoints",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",
            }),

            signal({
              checkpoint:
                "DAY_60",
            }),

            signal({
              checkpoint:
                "DAY_60",

              query:
                "credit monitoring vs credit freeze",

              cluster:
                "credit monitoring comparisons",

              subIntent:
                "credit monitoring vs credit freeze",

              sectionId:
                "section-comparison",

              sectionHeading:
                "Credit Monitoring vs Credit Freeze",

              impressions:
                200,

              clicks:
                8,

              ctr:
                0.04,

              position:
                17,
            }),
          ]);

        expect(
          series.checkpoints.map(
            (
              checkpoint
            ) =>
              [
                checkpoint.checkpoint,
                checkpoint.queryGroupBreadth,
              ]
          )
        ).toEqual([
          [
            "DAY_28",
            1,
          ],
          [
            "DAY_60",
            2,
          ],
        ]);

        expect(
          series.comparisons[0]
            ?.direction
        ).toBe(
          "INCREASED"
        );

        expect(
          series.comparisons[0]
            ?.delta
        ).toBe(1);

        expect(
          series.comparisons[0]
            ?.gainedGroupIds
        ).toEqual([
          "INFORMATIONAL::credit monitoring comparisons::credit monitoring vs credit freeze",
        ]);
      }
    );


    it(
      "tracks lost groups without pretending why they disappeared",
      () => {
        const day28 =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),
            ],
          });

        const day56 =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_60",

            signals: [
              signal({
                checkpoint:
                  "DAY_60",

                query:
                  "credit monitoring benefits",

                subIntent:
                  "credit monitoring benefits",
              }),
            ],
          });

        const comparison =
          compareQueryGroupBreadthV1(
            day28,
            day56
          );

        expect(
          comparison.direction
        ).toBe(
          "UNCHANGED"
        );

        expect(
          comparison.gainedGroupIds
        ).toHaveLength(1);

        expect(
          comparison.lostGroupIds
        ).toHaveLength(1);

        expect(
          comparison.retainedGroupIds
        ).toHaveLength(0);
      }
    );


    it(
      "rejects duplicate query-page observations instead of double counting them",
      () => {
        expect(
          () =>
            buildQueryGroupCheckpointOutcomeV1({
              checkpoint:
                "DAY_28",

              signals: [
                signal(),
                signal(),
              ],
            })
        ).toThrow(
          "QUERY_GROUP_DUPLICATE_OBSERVATION"
        );
      }
    );


    it(
      "preserves missing CTR instead of manufacturing complete aggregation",
      () => {
        const result =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),

              signal({
                query:
                  "how credit monitoring services work",

                impressions:
                  50,

                clicks:
                  null,

                ctr:
                  null,

                position:
                  15,
              }),
            ],
          });

        expect(
          result.groups[0]
            ?.ctr
        ).toBeNull();
      }
    );


    it(
      "rejects backwards checkpoint comparisons",
      () => {
        const day56 =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_60",

            signals: [
              signal({
                checkpoint:
                  "DAY_60",
              }),
            ],
          });

        const day28 =
          buildQueryGroupCheckpointOutcomeV1({
            checkpoint:
              "DAY_28",

            signals: [
              signal(),
            ],
          });

        expect(
          () =>
            compareQueryGroupBreadthV1(
              day56,
              day28
            )
        ).toThrow(
          "QUERY_GROUP_COMPARISON_NOT_FORWARD"
        );
      }
    );
  }
);
