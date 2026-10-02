import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );

const briefRoute =
  readFileSync(
    new URL(
      "../../app/api/content/briefs/route.ts",
      import.meta.url
    ),
    "utf8"
  );

const createUi =
  readFileSync(
    new URL(
      "../../components/dashboard/content-create-button.tsx",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "PASS 2D-2 production wiring",
  () => {
    it(
      "uses existing strategy primary for BEST_OPPORTUNITY",
      () => {
        expect(
          service
        ).toContain(
          "CONTENT_BEST_OPPORTUNITY_PRODUCTION_WINNER_V1"
        );

        expect(
          service
        ).toContain(
          "strategy.primary.keyword"
        );

        expect(
          service
        ).toContain(
          "assertBestOpportunityWinnerAppliedV1"
        );
      }
    );


    it(
      "runs the existing real crawler before brief creation",
      () => {
        const crawl =
          briefRoute.indexOf(
            "runContentCrawlPreflightV1({"
          );

        const brief =
          briefRoute.indexOf(
            "createContentBrief("
          );

        expect(
          crawl
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          brief
        ).toBeGreaterThan(
          crawl
        );
      }
    );


    it(
      "does not send full crawled bodies to the Writer",
      () => {
        expect(
          briefRoute
        ).toMatch(
          /crawlPreflight\s*\.promptContext/
        );

        expect(
          briefRoute
        ).not.toContain(
          "bodyText:"
        );
      }
    );


    it(
      "wires the two modes through the create UI",
      () => {
        expect(
          createUi
        ).toContain(
          '"EXACT_KEYWORD"'
        );

        expect(
          createUi
        ).toContain(
          '"BEST_OPPORTUNITY"'
        );

        expect(
          createUi
        ).toContain(
          "Use exact keyword"
        );
      }
    );
  }
);
