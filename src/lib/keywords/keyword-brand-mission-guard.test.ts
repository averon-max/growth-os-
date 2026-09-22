import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildKeywordDecisionShadow,
} from "./keyword-decision";

import {
  selectProductionPrimaryCandidate,
} from "./query-ownership";

import type {
  TopicAuthorityProfile,
} from "./topic-authority";


function authority({
  keyword,
  strength = 0,
}: {
  keyword: string;
  strength?: number;
}): TopicAuthorityProfile {
  return {
    keyword,

    strength,

    confidence:
      strength > 0.5
        ? "HIGH"
        : "LOW",

    relevantQueries:
      strength > 0
        ? 10
        : 0,

    publishedSupportingPages:
      strength > 0
        ? 10
        : 0,

    impressions:
      strength > 0
        ? 100000
        : 0,

    clicks:
      strength > 0
        ? 10000
        : 0,

    top3Queries:
      strength > 0
        ? 5
        : 0,

    top10Queries:
      strength > 0
        ? 10
        : 0,

    top20Queries:
      strength > 0
        ? 10
        : 0,

    weightedPosition:
      strength > 0
        ? 2
        : null,

    components: {
      queryBreadth:
        strength,

      searchVisibility:
        strength,

      rankingFootprint:
        strength,

      contentSupport:
        strength,
    },

    evidence:
      [],
  };
}


describe(
  "brand mission hard gate",
  () => {
    it(
      "cannot be overridden by extreme raw score",
      () => {
        const selected =
          selectProductionPrimaryCandidate({
            topic:
              "what is credit monitoring",

            candidates: [
              {
                keyword:
                  "experian credit monitoring",

                score:
                  999999,

                searchVolume:
                  1000000,

                impressions:
                  1000000,

                clicks:
                  100000,
              },

              {
                keyword:
                  "what is credit monitoring",

                score:
                  0,

                searchVolume:
                  null,

                impressions:
                  0,

                clicks:
                  0,
              },
            ],
          });

        expect(
          selected?.keyword
        ).toBe(
          "what is credit monitoring"
        );
      }
    );


    it(
      "cannot be resurrected by volume or topical authority inside keyword decision",
      () => {
        const result =
          buildKeywordDecisionShadow({
            topic:
              "what is credit monitoring",

            topicIntent:
              "INFORMATIONAL",

            candidates: [
              {
                keyword:
                  "experian credit monitoring",

                score:
                  100,

                intent:
                  "INFORMATIONAL",

                searchVolume:
                  1000000,

                difficulty:
                  1,

                existingPosition:
                  1,

                impressions:
                  1000000,

                clicks:
                  100000,

                businessRelevance:
                  20,

                authority:
                  authority({
                    keyword:
                      "experian credit monitoring",

                    strength:
                      1,
                  }),
              },

              {
                keyword:
                  "what is credit monitoring",

                score:
                  1,

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
                  12,

                authority:
                  authority({
                    keyword:
                      "what is credit monitoring",
                  }),
              },
            ],
          });

        expect(
          result.primary
            ?.keyword
        ).toBe(
          "what is credit monitoring"
        );

        const foreignBrand =
          result.ranked.find(
            (candidate) =>
              candidate.keyword ===
              "experian credit monitoring"
          );

        expect(
          foreignBrand
            ?.eligible
        ).toBe(
          false
        );

        expect(
          foreignBrand
            ?.blockers
        ).toContain(
          "UNREQUESTED_ENTITY_MODIFIER"
        );

        expect(
          result.secondary.map(
            (candidate) =>
              candidate.keyword
          )
        ).not.toContain(
          "experian credit monitoring"
        );
      }
    );
  }
);
