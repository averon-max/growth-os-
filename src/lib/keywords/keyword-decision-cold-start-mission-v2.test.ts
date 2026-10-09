import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildKeywordDecisionShadow,
} from "./keyword-decision";

import type {
  TopicAuthorityProfile,
} from "./topic-authority";


function coldAuthority(
  keyword: string
): TopicAuthorityProfile {
  return {
    keyword,

    strength:
      0,

    confidence:
      "LOW",

    relevantQueries:
      0,

    publishedSupportingPages:
      0,

    impressions:
      0,

    clicks:
      0,

    top3Queries:
      0,

    top10Queries:
      0,

    top20Queries:
      0,

    weightedPosition:
      null,

    components: {
      queryBreadth:
        0,

      searchVisibility:
        0,

      rankingFootprint:
        0,

      contentSupport:
        0,
    },

    evidence:
      [],
  };
}


describe(
  "AUTO cold-start exact mission V2",
  () => {
    it(
      "selects exact informational mission instead of higher scoring modifier",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "identity theft protection",

            topicIntent:
              "INFORMATIONAL",

            candidates: [
              {
                keyword:
                  "free identity theft protection",

                score:
                  52.3,

                intent:
                  "INFORMATIONAL",

                searchVolume:
                  5000,

                difficulty:
                  46,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  18,

                authority:
                  coldAuthority(
                    "free identity theft protection"
                  ),
              },

              {
                keyword:
                  "what is identity theft protection",

                score:
                  62.4,

                intent:
                  "INFORMATIONAL",

                searchVolume:
                  1200,

                difficulty:
                  null,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  18,

                authority:
                  coldAuthority(
                    "what is identity theft protection"
                  ),
              },

              {
                keyword:
                  "identity theft protection",

                score:
                  57.9,

                intent:
                  "INFORMATIONAL",

                searchVolume:
                  3000,

                difficulty:
                  null,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  18,

                authority:
                  coldAuthority(
                    "identity theft protection"
                  ),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "SELECTED"
        );

        expect(
          result.primary?.keyword
        ).toBe(
          "what is identity theft protection"
        );

        expect(
          result.primary?.eligible
        ).toBe(
          true
        );

        expect(
          result.primary?.intent
        ).toBe(
          "INFORMATIONAL"
        );

        expect(
          result.reasons
        ).toContain(
          "PRIMARY_PASSED_HARD_GATES"
        );
      }
    );


    it(
      "still returns NO_GO with no external keyword evidence",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "identity theft protection",

            topicIntent:
              "INFORMATIONAL",

            candidates: [
              {
                keyword:
                  "what is identity theft protection",

                score:
                  10,

                intent:
                  "INFORMATIONAL",

                searchVolume:
                  null,

                difficulty:
                  null,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  10,

                authority:
                  coldAuthority(
                    "what is identity theft protection"
                  ),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "NO_GO"
        );
      }
    );
  }
);
