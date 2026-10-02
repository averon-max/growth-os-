import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildClaimEvidenceFallbackQueriesV1,
  discoverClaimEvidenceFallbackSourcesV1,
} from "./live-evidence-verification";


describe(
  "claim-specific evidence fallback V1",
  () => {
    it(
      "builds at most three deterministic fallback queries",
      () => {
        const result =
          buildClaimEvidenceFallbackQueriesV1({
            primaryQuery:
              "what is credit monitoring",

            claimText:
              "Credit monitoring services can alert users when monitored credit information changes.",
          });


        expect(
          result.length
        ).toBeGreaterThan(
          0
        );

        expect(
          result.length
        ).toBeLessThanOrEqual(
          3
        );

        expect(
          result[0]
        ).toBe(
          "Credit monitoring services can alert users when monitored credit information changes."
        );

        expect(
          new Set(
            result
          ).size
        ).toBe(
          result.length
        );
      }
    );


    it(
      "discovers bounded real URLs without promoting snippets to evidence",
      async () => {
        const search =
          vi.fn(
            async (
              {
                keyword,
              }: {
                keyword:
                  string;
              }
            ) => ({
              organic: [
                {
                  url:
                    "https://www.consumerfinance.gov/example-credit-monitoring",

                  title:
                    `Evidence for ${keyword}`,

                  domain:
                    "consumerfinance.gov",
                },

                {
                  url:
                    "https://example.edu/research/credit-monitoring",

                  title:
                    "Research",

                  domain:
                    "example.edu",
                },
              ],
            })
          );


        const result =
          await discoverClaimEvidenceFallbackSourcesV1({
            claims: [
              {
                id:
                  "claim-alerts",

                text:
                  "Credit monitoring can alert consumers to changes.",
              },
            ],

            primaryQuery:
              "what is credit monitoring",

            locationName:
              "United States",

            languageName:
              "English",

            search:
              search as any,
          });


        expect(
          search.mock.calls.length
        ).toBeLessThanOrEqual(
          3
        );

        expect(
          result.length
        ).toBeGreaterThan(
          0
        );

        expect(
          result.length
        ).toBeLessThanOrEqual(
          4
        );

        expect(
          result.some(
            (
              source
            ) =>
              source.sourceType ===
              "PRIMARY_GOVERNMENT"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "never exceeds six fallback claims",
      async () => {
        const search =
          vi.fn(
            async () => ({
              organic:
                [],
            })
          );


        await discoverClaimEvidenceFallbackSourcesV1({
          claims: Array.from(
            {
              length:
                8,
            },
            (
              _,
              index
            ) => ({
              id:
                `claim-${index}`,

              text:
                `Claim number ${index} about credit monitoring.`,
            })
          ),

          primaryQuery:
            "what is credit monitoring",

          locationName:
            "United States",

          languageName:
            "English",

          search:
            search as any,
        });


        /*
         * 6 claims * maximum 3 deterministic queries.
         * No unbounded retry/search loop.
         */
        expect(
          search.mock.calls.length
        ).toBeLessThanOrEqual(
          18
        );
      }
    );
  }
);
