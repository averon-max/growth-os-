import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


function read(
  file:
    string
) {
  return readFileSync(
    join(
      process.cwd(),
      file
    ),
    "utf8"
  );
}


describe(
  "article query outcome production boundary",
  () => {
    const service =
      read(
        "src/lib/keywords/outcome-query-series-service.ts"
      );

    const route =
      read(
        "src/app/api/content/articles/[id]/analytics/route.ts"
      );


    it(
      "uses persisted immutable master runtime",
      () => {
        expect(
          service
        ).toContain(
          "inspectMasterRuntimeSnapshot"
        );

        expect(
          service
        ).toContain(
          "evidenceSnapshot"
        );
      }
    );


    it(
      "uses exact persisted checkpoint GSC date",
      () => {
        expect(
          service
        ).toContain(
          "gscSnapshotDate"
        );

        expect(
          service
        ).toContain(
          "exactSnapshotDateOnly:"
        );

        expect(
          service
        ).toContain(
          "rollingWindowUsed:"
        );
      }
    );


    it(
      "scopes metrics to published article URL",
      () => {
        expect(
          service
        ).toContain(
          "PUBLISHED_ARTICLE_URL"
        );

        expect(
          service
        ).toContain(
          "urlVariants"
        );
      }
    );


    it(
      "does not perform semantic or fuzzy matching",
      () => {
        expect(
          service
        ).toContain(
          "buildQueryOutcomeCheckpointFromGraphV1"
        );

        expect(
          service
        ).toContain(
          "fuzzyMatching:"
        );

        expect(
          service
        ).toContain(
          "semanticInference:"
        );
      }
    );


    it(
      "returns query outcome through article analytics",
      () => {
        expect(
          route
        ).toContain(
          "buildArticleQueryOutcomeSeriesV1"
        );

        expect(
          route
        ).toContain(
          "queryOutcome,"
        );
      }
    );
  }
);
