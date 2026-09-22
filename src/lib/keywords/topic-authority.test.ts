import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyTopicAuthorityShadow,
  buildTopicAuthorityProfile,
  topicAffinity,
} from "./topic-authority";

describe(
  "topic authority engine",
  () => {
    it(
      "does not confuse adjacent topics because of one generic shared token",
      () => {
        expect(
          topicAffinity(
            "credit monitoring",
            "dark web monitoring"
          )
        ).toBe(0);
      }
    );

    it(
      "recognizes genuine topical variants",
      () => {
        expect(
          topicAffinity(
            "identity theft protection",
            "identity protection"
          )
        ).toBeGreaterThan(
          0.5
        );
      }
    );

    it(
      "ignores unrelated high-impression queries",
      () => {
        const profile =
          buildTopicAuthorityProfile({
            keyword:
              "identity theft protection",

            siteKeywords: [
              {
                keyword:
                  "weather tomorrow",

                impressions:
                  100000,

                clicks:
                  5000,

                position:
                  1,
              },

              {
                keyword:
                  "identity theft protection",

                impressions:
                  150,

                clicks:
                  12,

                position:
                  9,
              },
            ],
          });

        expect(
          profile.impressions
        ).toBe(150);

        expect(
          profile.relevantQueries
        ).toBe(1);
      }
    );

    it(
      "gives stronger authority to a topic with search traction and rankings",
      () => {
        const strong =
          buildTopicAuthorityProfile({
            keyword:
              "identity theft protection",

            siteKeywords: [
              {
                keyword:
                  "identity theft protection",

                impressions:
                  800,

                clicks:
                  70,

                position:
                  6,
              },

              {
                keyword:
                  "identity theft protection guide",

                impressions:
                  300,

                clicks:
                  22,

                position:
                  9,
              },

              {
                keyword:
                  "identity theft prevention tips",

                impressions:
                  200,

                clicks:
                  10,

                position:
                  14,
              },
            ],

            contentTopics: [
              {
                topic:
                  "Identity Theft Protection Guide",

                published:
                  true,
              },

              {
                topic:
                  "Identity Theft Prevention",

                published:
                  true,
              },
            ],
          });

        const weak =
          buildTopicAuthorityProfile({
            keyword:
              "identity theft protection",

            siteKeywords: [],
            contentTopics: [],
          });

        expect(
          strong.strength
        ).toBeGreaterThan(
          weak.strength
        );

        expect(
          strong.top10Queries
        ).toBe(2);

        expect(
          strong.confidence
        ).not.toBe(
          "LOW"
        );
      }
    );

    it(
      "does not fabricate authority when evidence is absent",
      () => {
        const result =
          buildTopicAuthorityProfile({
            keyword:
              "credit monitoring",

            siteKeywords:
              [],

            contentTopics:
              [],
          });

        expect(
          result.strength
        ).toBe(0);

        expect(
          result.confidence
        ).toBe(
          "LOW"
        );

        expect(
          result.weightedPosition
        ).toBeNull();
      }
    );

    it(
      "can change a close decision in shadow mode without mutating original scores",
      () => {
        const candidates = [
          {
            keyword:
              "identity monitoring",

            score:
              70,
          },

          {
            keyword:
              "identity theft protection",

            score:
              68,
          },
        ];

        const shadow =
          applyTopicAuthorityShadow({
            candidates,

            siteKeywords: [
              {
                keyword:
                  "identity theft protection",

                impressions:
                  2500,

                clicks:
                  140,

                position:
                  5,
              },

              {
                keyword:
                  "identity theft protection guide",

                impressions:
                  900,

                clicks:
                  40,

                position:
                  8,
              },

              {
                keyword:
                  "identity theft prevention tips",

                impressions:
                  500,

                clicks:
                  25,

                position:
                  12,
              },
            ],

            contentTopics: [
              {
                topic:
                  "Identity Theft Protection",

                published:
                  true,
              },

              {
                topic:
                  "Identity Theft Prevention",

                published:
                  true,
              },
            ],
          });

        expect(
          shadow[0]
            ?.candidate
            .keyword
        ).toBe(
          "identity theft protection"
        );

        expect(
          candidates[0]
            ?.score
        ).toBe(70);

        expect(
          candidates[1]
            ?.score
        ).toBe(68);
      }
    );
  }
);
