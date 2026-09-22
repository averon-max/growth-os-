import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  TopicAuthorityProfile,
} from "./topic-authority";

import {
  buildKeywordDecisionShadow,
} from "./keyword-decision";

function authority(
  overrides: Partial<TopicAuthorityProfile> = {}
): TopicAuthorityProfile {
  return {
    keyword:
      "identity theft protection",

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

    ...overrides,
  };
}

describe(
  "keyword decision engine v2",
  () => {
    it(
      "prefers a real GSC near-win over a superficially attractive unsupported keyword",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "identity theft protection",

            topicIntent:
              "COMMERCIAL",

            candidates: [
              {
                keyword:
                  "identity theft protection",

                score:
                  62,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  1200,

                difficulty:
                  48,

                existingPosition:
                  12,

                impressions:
                  1800,

                clicks:
                  54,

                businessRelevance:
                  18,

                authority:
                  authority({
                    strength:
                      0.62,

                    confidence:
                      "HIGH",

                    relevantQueries:
                      7,

                    impressions:
                      3200,

                    top20Queries:
                      5,
                  }),
              },

              {
                keyword:
                  "best identity protection service",

                score:
                  69,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  4000,

                difficulty:
                  82,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  15,

                authority:
                  authority(),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "SELECTED"
        );

        expect(
          result.primary
            ?.keyword
        ).toBe(
          "identity theft protection"
        );
      }
    );

    it(
      "hard blocks an intent mismatch",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "what is identity theft",

            topicIntent:
              "INFORMATIONAL",

            candidates: [
              {
                keyword:
                  "identity theft protection pricing",

                score:
                  90,

                intent:
                  "TRANSACTIONAL",

                searchVolume:
                  5000,

                difficulty:
                  20,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  20,

                authority:
                  authority({
                    strength:
                      0.8,

                    confidence:
                      "HIGH",
                  }),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "NO_GO"
        );

        expect(
          result.ranked[0]
            ?.blockers
        ).toContain(
          "INTENT_MISMATCH"
        );
      }
    );

    it(
      "returns NO_GO instead of manufacturing content when evidence is absent",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "credit monitoring",

            topicIntent:
              "COMMERCIAL",

            candidates: [
              {
                keyword:
                  "credit monitoring",

                score:
                  50,

                intent:
                  "COMMERCIAL",

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
                  12,

                authority:
                  authority(),
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

    it(
      "does not automatically reject high KD when the site already has strong traction",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "identity theft protection",

            topicIntent:
              "COMMERCIAL",

            candidates: [
              {
                keyword:
                  "identity theft protection",

                score:
                  70,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  3000,

                difficulty:
                  84,

                existingPosition:
                  8,

                impressions:
                  4200,

                clicks:
                  180,

                businessRelevance:
                  20,

                authority:
                  authority({
                    strength:
                      0.78,

                    confidence:
                      "HIGH",

                    relevantQueries:
                      9,
                  }),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "SELECTED"
        );

        expect(
          result.primary
            ?.components
            .difficulty
        ).toBeGreaterThan(
          -8
        );
      }
    );

    it(
      "requires secondary keywords to share intent and meaningful topical affinity",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "identity theft protection",

            topicIntent:
              "COMMERCIAL",

            candidates: [
              {
                keyword:
                  "identity theft protection",

                score:
                  75,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  2000,

                difficulty:
                  40,

                existingPosition:
                  9,

                impressions:
                  2200,

                clicks:
                  90,

                businessRelevance:
                  20,

                authority:
                  authority({
                    strength:
                      0.7,

                    confidence:
                      "HIGH",

                    relevantQueries:
                      6,
                  }),
              },

              {
                keyword:
                  "identity theft protection service",

                score:
                  66,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  800,

                difficulty:
                  38,

                existingPosition:
                  16,

                impressions:
                  700,

                clicks:
                  18,

                businessRelevance:
                  18,

                authority:
                  authority({
                    strength:
                      0.55,

                    confidence:
                      "MEDIUM",

                    relevantQueries:
                      3,
                  }),
              },

              {
                keyword:
                  "identity theft login",

                score:
                  80,

                intent:
                  "NAVIGATIONAL",

                searchVolume:
                  6000,

                difficulty:
                  10,

                existingPosition:
                  null,

                impressions:
                  0,

                clicks:
                  0,

                businessRelevance:
                  10,

                authority:
                  authority(),
              },

              {
                keyword:
                  "dark web monitoring",

                score:
                  76,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  5000,

                difficulty:
                  30,

                existingPosition:
                  14,

                impressions:
                  800,

                clicks:
                  25,

                businessRelevance:
                  18,

                authority:
                  authority({
                    strength:
                      0.5,

                    confidence:
                      "MEDIUM",
                  }),
              },
            ],
          });

        expect(
          result.secondary.map(
            (item) =>
              item.keyword
          )
        ).toContain(
          "identity theft protection service"
        );

        expect(
          result.secondary.map(
            (item) =>
              item.keyword
          )
        ).not.toContain(
          "identity theft login"
        );

        expect(
          result.secondary.map(
            (item) =>
              item.keyword
          )
        ).not.toContain(
          "dark web monitoring"
        );
      }
    );

    it(
      "hard blocks candidates with zero business relevance",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "credit monitoring",

            topicIntent:
              "COMMERCIAL",

            candidates: [
              {
                keyword:
                  "credit monitoring",

                score:
                  95,

                intent:
                  "COMMERCIAL",

                searchVolume:
                  10000,

                difficulty:
                  5,

                existingPosition:
                  4,

                impressions:
                  10000,

                clicks:
                  1000,

                businessRelevance:
                  0,

                authority:
                  authority({
                    strength:
                      1,

                    confidence:
                      "HIGH",
                  }),
              },
            ],
          });

        expect(
          result.status
        ).toBe(
          "NO_GO"
        );

        expect(
          result.ranked[0]
            ?.blockers
        ).toContain(
          "NO_BUSINESS_RELEVANCE"
        );
      }
    );
  }
);
