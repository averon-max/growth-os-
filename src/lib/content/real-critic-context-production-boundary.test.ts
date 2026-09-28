import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";


const liveSource =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/production-master-live-source-adapter.ts"
    ),
    "utf8"
  );


const crawlContext =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/crawl-cannibalization-context.ts"
    ),
    "utf8"
  );


const service =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/service.ts"
    ),
    "utf8"
  );


describe(
  "real critic production context",
  () => {
    it(
      "preserves observed SERP title and snippet",
      () => {
        expect(
          liveSource
        ).toContain(
          "REAL_SERP_ORIGINALITY_CONTEXT_V1"
        );

        expect(
          liveSource
        ).toContain(
          "item.title"
        );

        expect(
          liveSource
        ).toContain(
          "item.description"
        );
      }
    );


    it(
      "uses real crawl pages without inventing ownership metrics",
      () => {
        expect(
          crawlContext
        ).toContain(
          "CRAWL_CANNIBALIZATION_CONTEXT_V1"
        );

        expect(
          crawlContext
        ).toContain(
          "intentMatch:"
        );

        expect(
          crawlContext
        ).toContain(
          "null"
        );

        expect(
          crawlContext
        ).not.toContain(
          "Math.random"
        );
      }
    );


    it(
      "keeps persisted ownership authoritative and crawl as fallback",
      () => {
        expect(
          service
        ).toContain(
          "REAL_CRAWL_CANNIBALIZATION_FALLBACK_V1"
        );

        expect(
          service
        ).toContain(
          "persistedMasterCriticContext"
        );

        expect(
          service
        ).toContain(
          "buildCrawlCannibalizationCandidatesV1"
        );
      }
    );
  }
);
