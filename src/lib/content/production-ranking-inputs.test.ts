import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSerpCompetitiveCoverageMap,
  collectObservedQueryUniverse,
} from "./production-ranking-inputs";


describe(
  "Production ranking inputs",
  () => {
    it(
      "builds query identity only from observed DataForSEO strings",
      () => {
        const result =
          collectObservedQueryUniverse({
            
            keywordContext: {
              topKeywords: [
                {
                  keyword:
                    "credit monitoring",
                },
              ],
            },



            dataForSeo: {
              relatedKeywords: {
                items: [
                  {
                    keyword:
                      "credit monitoring services",
                  },
                  {
                    keyword:
                      "credit monitoring cost",
                  },
                ],
              },

              fakeModelSuggestion:
                "how to monitor credit",
            },
          });

        expect(
          result
        ).toContain(
          "credit monitoring"
        );

        expect(
          result
        ).toContain(
          "credit monitoring services"
        );

        expect(
          result
        ).not.toContain(
          "how to monitor credit"
        );
      }
    );


    it(
      "builds a deterministic Top-10 competitive map",
      () => {
        const result =
          buildSerpCompetitiveCoverageMap({
            organic: [
              {
                rank:
                  1,

                domain:
                  "consumerfinance.gov",

                url:
                  "https://consumerfinance.gov/a",

                title:
                  "What Is Credit Monitoring?",

                description:
                  "Snippet",

                featuredSnippet:
                  true,
              },
              {
                rank:
                  2,

                domain:
                  "example.com",

                url:
                  "https://example.com/b",

                title:
                  "Credit Monitoring: How It Works",

                description:
                  "Snippet",

                featuredSnippet:
                  false,
              },
            ],

            questions: [
              {
                question:
                  "Is credit monitoring worth it?",
              },
            ],
          });

        expect(
          result.analyzedResults
        ).toBe(
          2
        );

        expect(
          result.governmentResults
        ).toBe(
          1
        );

        expect(
          result.featuredSnippetPresent
        ).toBe(
          true
        );

        expect(
          result.dominantTitleTerms.some(
            (
              item
            ) =>
              item.term ===
              "credit"
          )
        ).toBe(
          true
        );

        expect(
          result.observedQuestions
        ).toContain(
          "Is credit monitoring worth it?"
        );
      }
    );
  }
);
