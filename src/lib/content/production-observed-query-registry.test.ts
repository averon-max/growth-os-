import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildCanonicalObservedQueryRegistry,
} from "./production-observed-query-registry";


describe(
  "Canonical Observed Query Registry",
  () => {
    it(
      "accepts actual keyword acquisition identities",
      () => {
        const registry =
          buildCanonicalObservedQueryRegistry([
            {
              items: [
                {
                  keyword:
                    "credit monitoring",

                  searchVolume:
                    1000,

                  cpc:
                    4.25,
                },

                {
                  keyword:
                    "credit monitoring services",

                  searchVolume:
                    500,
                },
              ],
            },
          ]);


        expect(
          registry
            .queryStrings
            .has(
              "credit monitoring"
            )
        ).toBe(
          true
        );


        expect(
          registry
            .queryStrings
            .has(
              "credit monitoring services"
            )
        ).toBe(
          true
        );


        expect(
          registry
            .queryMetrics
            .get(
              "credit monitoring"
            )
            ?.searchVolume
            .has(
              1000
            )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not treat generic query fields as observed keyword identities",
      () => {
        const registry =
          buildCanonicalObservedQueryRegistry([
            {
              semanticModelOutput: {
                query:
                  "how does credit monitoring work",
              },

              searchFeature: {
                question:
                  "how does credit monitoring work",
              },
            },
          ]);


        expect(
          registry.queryStrings.size
        ).toBe(
          0
        );
      }
    );


    it(
      "preserves missing metrics instead of inventing zero",
      () => {
        const registry =
          buildCanonicalObservedQueryRegistry([
            {
              keyword:
                "credit monitoring cost",
            },
          ]);


        const metrics =
          registry
            .queryMetrics
            .get(
              "credit monitoring cost"
            );


        expect(
          metrics
            ?.searchVolume
            .size
        ).toBe(
          0
        );


        expect(
          metrics
            ?.cpc
            .size
        ).toBe(
          0
        );
      }
    );
  }
);
