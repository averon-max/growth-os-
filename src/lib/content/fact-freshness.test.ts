import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFactFreshnessPolicy,
  defaultFactFreshnessPolicy,
  evaluateFactFreshness,
} from "./fact-freshness";


const governmentSource = {
  id:
    "cfpb",

  url:
    "https://consumerfinance.gov/example",

  publisher:
    "CFPB",

  sourceType:
    "PRIMARY_GOVERNMENT" as const,

  authorityTier:
    "A" as const,

  jurisdiction:
    "US",

  publishedAt:
    new Date(
      "2026-01-01T00:00:00.000Z"
    ),

  retrievedAt:
    new Date(
      "2026-09-21T00:00:00.000Z"
    ),
};


describe(
  "Fact Freshness V1",
  () => {
    it(
      "implements symbolic master TTL classes without inventing durations",
      () => {
        expect(
          defaultFactFreshnessPolicy(
            "DEFINITION"
          )
        ).toMatchObject({
          ttlClass:
            "LONG",

          maxAgeDays:
            null,
        });

        expect(
          defaultFactFreshnessPolicy(
            "STATISTIC"
          )
        ).toMatchObject({
          ttlClass:
            "SOURCE_DEPENDENT",

          maxAgeDays:
            null,
        });

        expect(
          defaultFactFreshnessPolicy(
            "LAW"
          )
        ).toMatchObject({
          ttlClass:
            "SHORT",

          primarySourceRequired:
            true,

          maxAgeDays:
            null,
        });

        expect(
          defaultFactFreshnessPolicy(
            "PRICE"
          ).ttlClass
        ).toBe(
          "SHORT"
        );

        expect(
          defaultFactFreshnessPolicy(
            "PRODUCT_FEATURE"
          ).ttlClass
        ).toBe(
          "SHORT"
        );

        expect(
          defaultFactFreshnessPolicy(
            "CURRENT_SERVICE_TERMS"
          ).ttlClass
        ).toBe(
          "SHORT"
        );
      }
    );


    it(
      "returns UNKNOWN when a numeric TTL has not been configured",
      () => {
        const result =
          evaluateFactFreshness({
            source:
              governmentSource,

            policy:
              defaultFactFreshnessPolicy(
                "LAW"
              ),

            asOf:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),
          });

        expect(
          result.status
        ).toBe(
          "UNKNOWN"
        );

        expect(
          result.evidence
        ).toContain(
          "NUMERIC_TTL_NOT_CONFIGURED"
        );
      }
    );


    it(
      "marks evidence stale only against an explicit TTL",
      () => {
        const policy =
          buildFactFreshnessPolicy({
            factType:
              "LAW",

            maxAgeDays:
              30,
          });

        const result =
          evaluateFactFreshness({
            source:
              governmentSource,

            policy,

            asOf:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),
          });

        expect(
          result.status
        ).toBe(
          "STALE"
        );

        expect(
          result.ageDays
        ).toBeGreaterThan(
          30
        );
      }
    );


    it(
      "does not use retrievedAt as fake publication freshness",
      () => {
        const result =
          evaluateFactFreshness({
            source: {
              ...governmentSource,

              publishedAt:
                undefined,

              updatedAt:
                undefined,

              retrievedAt:
                new Date(
                  "2026-09-21T00:00:00.000Z"
                ),
            },

            policy:
              buildFactFreshnessPolicy({
                factType:
                  "LAW",

                maxAgeDays:
                  30,
              }),

            asOf:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),
          });

        expect(
          result.status
        ).toBe(
          "UNKNOWN"
        );

        expect(
          result.freshnessAnchor
        ).toBeNull();
      }
    );
  }
);
