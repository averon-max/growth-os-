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
  buildQueryOutcomeDiagnosisV1,
} from "./outcome-query-diagnosis";


function signal({
  checkpoint,
  subIntent,
  position,
}: {
  checkpoint:
    QueryGroupObservedSignalV1[
      "checkpoint"
    ];

  subIntent:
    string;

  position:
    number | null;
}):
  QueryGroupObservedSignalV1 {
  return {
    checkpoint,

    query:
      subIntent,

    intent:
      "INFORMATIONAL",

    cluster:
      "credit monitoring",

    subIntent,

    sameMissionEvidence:
      true,

    sourceConfidence:
      1,

    pageUrl:
      "https://example.com/article",

    queryNodeId:
      `node-${subIntent}`,

    sectionId:
      null,

    sectionHeading:
      "Section",

    impressions:
      100,

    clicks:
      10,

    ctr:
      0.1,

    position,
  };
}


describe(
  "query outcome diagnosis v1",
  () => {
    it(
      "classifies top 10 as WINNING",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "definition",

              position:
                7,
            }),
          ]);


        expect(
          buildQueryOutcomeDiagnosisV1(
            series
          ).groups[0]
            ?.status
        ).toBe(
          "WINNING"
        );
      }
    );


    it(
      "classifies positions 11 to 20 as STRIKING_DISTANCE",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "limitations",

              position:
                15,
            }),
          ]);


        expect(
          buildQueryOutcomeDiagnosisV1(
            series
          ).groups[0]
            ?.status
        ).toBe(
          "STRIKING_DISTANCE"
        );
      }
    );


    it(
      "classifies newly observed groups outside top 20 as EMERGING",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_7",

              subIntent:
                "definition",

              position:
                12,
            }),

            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "definition",

              position:
                9,
            }),

            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "alerts",

              position:
                34,
            }),
          ]);


        const diagnosis =
          buildQueryOutcomeDiagnosisV1(
            series
          );


        expect(
          diagnosis.groups.find(
            (
              group
            ) =>
              group.subIntent ===
              "alerts"
          )?.status
        ).toBe(
          "EMERGING"
        );
      }
    );


    it(
      "uses bucket deterioration for DECAYING instead of tiny rank noise",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_7",

              subIntent:
                "definition",

              position:
                8,
            }),

            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "definition",

              position:
                15,
            }),
          ]);


        expect(
          buildQueryOutcomeDiagnosisV1(
            series
          ).groups[0]
            ?.status
        ).toBe(
          "DECAYING"
        );
      }
    );


    it(
      "classifies a disappeared previously observed group as LOST",
      () => {
        const series =
          buildQueryGroupOutcomeSeriesV1([
            signal({
              checkpoint:
                "DAY_7",

              subIntent:
                "limitations",

              position:
                14,
            }),

            signal({
              checkpoint:
                "DAY_28",

              subIntent:
                "alerts",

              position:
                30,
            }),
          ]);


        const diagnosis =
          buildQueryOutcomeDiagnosisV1(
            series
          );


        const lost =
          diagnosis.groups.find(
            (
              group
            ) =>
              group.subIntent ===
              "limitations"
          );


        expect(
          lost?.status
        ).toBe(
          "LOST"
        );

        expect(
          lost?.position
        ).toBeNull();

        expect(
          lost?.previousPosition
        ).toBe(
          14
        );
      }
    );


    it(
      "never adds causal inference score or probability",
      () => {
        const diagnosis =
          buildQueryOutcomeDiagnosisV1(
            buildQueryGroupOutcomeSeriesV1([])
          );


        expect(
          diagnosis
            .provenance
            .noCausalInference
        ).toBe(true);

        expect(
          diagnosis
            .provenance
            .noSeoScore
        ).toBe(true);

        expect(
          diagnosis
            .provenance
            .noRankingProbability
        ).toBe(true);
      }
    );
  }
);
