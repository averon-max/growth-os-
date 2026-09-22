import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSerpSnapshot,
  type SerpObservedPageType,
} from "./serp-observatory";

import {
  buildSerpStabilityReport,
  compareSerpSnapshots,
  domainChurn,
  meanAbsoluteRankMovement,
  pageTypeConsistency,
  top10UrlJaccard,
} from "./serp-stability";


function makeSnapshot({
  date,
  rows,
}: {
  date:
    string;

  rows:
    Array<{
      rank:
        number;

      url:
        string;

      domain:
        string;

      pageType:
        SerpObservedPageType;
    }>;
}) {
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
        date
      ),

    results:
      rows.map(
        (row) => ({
          ...row,

          intent:
            "INFORMATIONAL" as const,
        })
      ),
  });
}


const d0 =
  makeSnapshot({
    date:
      "2026-09-01T00:00:00.000Z",

    rows: [
      {
        rank: 1,
        url: "https://a.com/a",
        domain: "a.com",
        pageType: "ARTICLE",
      },
      {
        rank: 2,
        url: "https://b.com/b",
        domain: "b.com",
        pageType: "ARTICLE",
      },
      {
        rank: 3,
        url: "https://c.com/c",
        domain: "c.com",
        pageType: "GUIDE",
      },
      {
        rank: 4,
        url: "https://d.com/d",
        domain: "d.com",
        pageType: "ARTICLE",
      },
      {
        rank: 5,
        url: "https://e.com/e",
        domain: "e.com",
        pageType: "GUIDE",
      },
    ],
  });


const d3 =
  makeSnapshot({
    date:
      "2026-09-04T00:00:00.000Z",

    rows: [
      {
        rank: 1,
        url: "https://b.com/b",
        domain: "b.com",
        pageType: "ARTICLE",
      },
      {
        rank: 2,
        url: "https://a.com/a",
        domain: "a.com",
        pageType: "ARTICLE",
      },
      {
        rank: 3,
        url: "https://c.com/c",
        domain: "c.com",
        pageType: "GUIDE",
      },
      {
        rank: 4,
        url: "https://d.com/d",
        domain: "d.com",
        pageType: "ARTICLE",
      },
      {
        rank: 5,
        url: "https://f.com/f",
        domain: "f.com",
        pageType: "GUIDE",
      },
    ],
  });


const d7 =
  makeSnapshot({
    date:
      "2026-09-08T00:00:00.000Z",

    rows: [
      {
        rank: 1,
        url: "https://a.com/a",
        domain: "a.com",
        pageType: "ARTICLE",
      },
      {
        rank: 2,
        url: "https://b.com/b",
        domain: "b.com",
        pageType: "ARTICLE",
      },
      {
        rank: 3,
        url: "https://c.com/c",
        domain: "c.com",
        pageType: "GUIDE",
      },
      {
        rank: 4,
        url: "https://d.com/d",
        domain: "d.com",
        pageType: "ARTICLE",
      },
      {
        rank: 5,
        url: "https://f.com/f",
        domain: "f.com",
        pageType: "GUIDE",
      },
    ],
  });


describe(
  "SERP Stability V1",
  () => {
    it(
      "calculates top-10 URL Jaccard similarity",
      () => {
        expect(
          top10UrlJaccard(
            d0,
            d3
          )
        ).toBeCloseTo(
          4 / 6,
          4
        );
      }
    );


    it(
      "calculates mean absolute movement only for shared URLs",
      () => {
        expect(
          meanAbsoluteRankMovement(
            d0,
            d3
          )
        ).toBe(
          0.5
        );
      }
    );


    it(
      "reports new and removed domains",
      () => {
        expect(
          domainChurn({
            left:
              d0,

            right:
              d3,
          })
        ).toMatchObject({
          newDomains: [
            "f.com",
          ],

          removedDomains: [
            "e.com",
          ],
        });
      }
    );


    it(
      "measures page-type consistency instead of assuming intent stability",
      () => {
        expect(
          pageTypeConsistency(
            d0,
            d3
          )
        ).toBe(
          1
        );
      }
    );


    it(
      "creates D0 D3 D7 history milestones",
      () => {
        const report =
          buildSerpStabilityReport([
            d7,
            d0,
            d3,
          ]);

        expect(
          report.history.map(
            (point) =>
              point.targetMilestone
          )
        ).toEqual([
          0,
          3,
          7,
        ]);

        expect(
          report.snapshotCount
        ).toBe(
          3
        );
      }
    );


    it(
      "classifies repeated similar SERPs without claiming ranking probability",
      () => {
        const report =
          buildSerpStabilityReport([
            d0,
            d3,
            d7,
          ]);

        expect(
          report.averageTop10UrlOverlap
        ).not.toBeNull();

        expect(
          report.rankChurn
        ).toBe(
          "LOW"
        );

        expect(
          report.intentConsistency
        ).toBe(
          "HIGH"
        );

        expect([
          "STABLE",
          "MODERATELY_STABLE",
        ]).toContain(
          report.classification
        );
      }
    );


    it(
      "fails closed when snapshots belong to different markets",
      () => {
        const other =
          createSerpSnapshot({
            keyword:
              "what is credit monitoring",

            country:
              "CA",

            language:
              "en",

            device:
              "DESKTOP",

            capturedAt:
              new Date(
                "2026-09-04T00:00:00.000Z"
              ),

            results:
              [],
          });

        expect(
          () =>
            compareSerpSnapshots(
              d0,
              other
            )
        ).toThrow(
          "SERP_HISTORY_MARKET_MISMATCH"
        );
      }
    );


    it(
      "requires history before making a stability classification",
      () => {
        const report =
          buildSerpStabilityReport([
            d0,
          ]);

        expect(
          report.classification
        ).toBe(
          "INSUFFICIENT_HISTORY"
        );

        expect(
          report.averageTop10UrlOverlap
        ).toBeNull();

        expect(
          report.rankChurn
        ).toBe(
          "UNKNOWN"
        );
      }
    );
  }
);
