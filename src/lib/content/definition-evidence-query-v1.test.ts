import {
  describe,
  expect,
  it,
} from "vitest";

import {
  discoverClaimEvidenceFallbackSourcesV1,
} from "./live-evidence-verification";


describe(
  "definition evidence query V1",
  () => {
    it(
      "searches a natural what-is query before generic lexical fallbacks",
      async () => {
        const seenQueries:
          string[] =
            [];


        const sources =
          await discoverClaimEvidenceFallbackSourcesV1({
            claims: [
              {
                id:
                  "claim-definition",

                text:
                  "Credit monitoring is a service that tracks specified changes in credit information.",

                category:
                  "FACT",

                risk:
                  "MEDIUM",
              },
            ] as never,

            primaryQuery:
              "credit monitoring",

            locationName:
              "United States",

            languageName:
              "English",

            search:
              async (
                input
              ) => {
                seenQueries.push(
                  input.keyword
                );


                if (
                  input.keyword ===
                  "what is credit monitoring"
                ) {
                  return {
                    organic: [
                      {
                        url:
                          "https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-monitoring-service-en-1365/",

                        domain:
                          "consumerfinance.gov",
                      },
                    ],
                  } as never;
                }


                return {
                  organic: [],
                } as never;
              },
          });


        expect(
          seenQueries[0]
        ).toBe(
          "what is credit monitoring"
        );


        expect(
          sources.some(
            (
              source
            ) =>
              source.url.includes(
                "consumerfinance.gov"
              )
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not classify non-definition claims as definition queries",
      async () => {
        const seenQueries:
          string[] =
            [];


        await discoverClaimEvidenceFallbackSourcesV1({
          claims: [
            {
              id:
                "claim-alert",

              text:
                "Credit monitoring can alert consumers to changes.",

              category:
                "FACT",

              risk:
                "LOW",
            },
          ] as never,

          primaryQuery:
            "credit monitoring",

          locationName:
            "United States",

          languageName:
            "English",

          search:
            async (
              input
            ) => {
              seenQueries.push(
                input.keyword
              );

              return {
                organic: [],
              } as never;
            },
        });


        expect(
          seenQueries[0]
        ).not.toBe(
          "what is credit monitoring"
        );
      }
    );
  }
);
