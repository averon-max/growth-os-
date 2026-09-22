import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSerpSnapshot,
} from "./serp-observatory";


function snapshot(
  capturedAt:
    string
) {
  return createSerpSnapshot({
    keyword:
      "what is credit monitoring",

    country:
      "US",

    language:
      "en",

    device:
      "DESKTOP",

    capturedAt:
      new Date(
        capturedAt
      ),

    features: [
      "people_also_ask",
      "ai_overview",
    ],

    aiOverview: {
      present:
        true,

      references: [
        {
          url:
            "https://consumerfinance.gov/example",
          domain:
            "consumerfinance.gov",
        },
      ],
    },

    results: [
      {
        rank:
          1,

        url:
          "https://example.com/a/",

        domain:
          "www.example.com",

        title:
          "Example A",

        snippet:
          "Example",

        pageType:
          "ARTICLE",

        intent:
          "INFORMATIONAL",
      },

      {
        rank:
          2,

        url:
          "https://example.org/b",

        domain:
          "example.org",

        pageType:
          "GUIDE",

        intent:
          "INFORMATIONAL",
      },
    ],
  });
}


describe(
  "SERP Observatory V1",
  () => {
    it(
      "creates the master SERP snapshot contract",
      () => {
        const value =
          snapshot(
            "2026-09-21T00:00:00.000Z"
          );

        expect(
          value.version
        ).toBe(
          "SERP_SNAPSHOT_V1"
        );

        expect(
          value.keyword
        ).toBe(
          "what is credit monitoring"
        );

        expect(
          value.country
        ).toBe(
          "US"
        );

        expect(
          value.language
        ).toBe(
          "en"
        );

        expect(
          value.device
        ).toBe(
          "DESKTOP"
        );

        expect(
          value.results
        ).toHaveLength(
          2
        );

        expect(
          value.aiOverview.present
        ).toBe(
          true
        );

        expect(
          value.fingerprint
        ).toBeTruthy();
      }
    );


    it(
      "fingerprint represents SERP state rather than capture timestamp",
      () => {
        const first =
          snapshot(
            "2026-09-21T00:00:00.000Z"
          );

        const second =
          snapshot(
            "2026-09-24T00:00:00.000Z"
          );

        expect(
          first.fingerprint
        ).toBe(
          second.fingerprint
        );
      }
    );


    it(
      "changes fingerprint when ranking state changes",
      () => {
        const first =
          snapshot(
            "2026-09-21T00:00:00.000Z"
          );

        const second =
          createSerpSnapshot({
            keyword:
              "what is credit monitoring",

            country:
              "US",

            language:
              "en",

            device:
              "DESKTOP",

            capturedAt:
              new Date(
                "2026-09-24T00:00:00.000Z"
              ),

            features: [
              "people_also_ask",
              "ai_overview",
            ],

            aiOverview: {
              present:
                true,
            },

            results: [
              {
                rank:
                  1,

                url:
                  "https://example.org/b",

                domain:
                  "example.org",

                pageType:
                  "GUIDE",

                intent:
                  "INFORMATIONAL",
              },

              {
                rank:
                  2,

                url:
                  "https://example.com/a",

                domain:
                  "example.com",

                pageType:
                  "ARTICLE",

                intent:
                  "INFORMATIONAL",
              },
            ],
          });

        expect(
          first.fingerprint
        ).not.toBe(
          second.fingerprint
        );
      }
    );


    it(
      "fails closed on duplicate organic ranks",
      () => {
        expect(
          () =>
            createSerpSnapshot({
              keyword:
                "credit monitoring",

              country:
                "US",

              language:
                "en",

              device:
                "DESKTOP",

              capturedAt:
                new Date(),

              results: [
                {
                  rank:
                    1,

                  url:
                    "https://a.com",

                  domain:
                    "a.com",
                },

                {
                  rank:
                    1,

                  url:
                    "https://b.com",

                  domain:
                    "b.com",
                },
              ],
            })
        ).toThrow(
          "SERP_SNAPSHOT_DUPLICATE_RANK"
        );
      }
    );


    it(
      "does not manufacture enrichment or backlink data",
      () => {
        const value =
          createSerpSnapshot({
            keyword:
              "credit monitoring",

            country:
              "US",

            language:
              "en",

            device:
              "MOBILE",

            capturedAt:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),

            results: [
              {
                rank:
                  1,

                url:
                  "https://example.com",

                domain:
                  "example.com",
              },
            ],
          });

        expect(
          value.results[0]
            ?.wordCount
        ).toBeUndefined();

        expect(
          value.results[0]
            ?.referringDomains
        ).toBeUndefined();

        expect(
          value.results[0]
            ?.backlinks
        ).toBeUndefined();

        expect(
          value.results[0]
            ?.author
        ).toBeUndefined();
      }
    );
  }
);
