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
  "query outcome graph adapter production boundary",
  () => {
    const adapter =
      read(
        "src/lib/keywords/outcome-query-graph-adapter.ts"
      );


    it(
      "uses canonical QueryGraph normalization",
      () => {
        expect(
          adapter
        ).toContain(
          "normalizeQueryGraphObservedQueryV1"
        );
      }
    );


    it(
      "does not implement fuzzy or AI query attribution",
      () => {
        expect(
          adapter
        ).toContain(
          "EXACT_QUERY_GRAPH_NORMALIZED_QUERY_ONLY"
        );

        expect(
          adapter
        ).toContain(
          "fuzzyMatching:"
        );

        expect(
          adapter
        ).toContain(
          "false as const"
        );
      }
    );


    it(
      "keeps unmapped observed queries",
      () => {
        expect(
          adapter
        ).toContain(
          "unmappedQueries"
        );

        expect(
          adapter
        ).toContain(
          "unmappedQueryCount"
        );
      }
    );


    it(
      "does not invent section identifiers",
      () => {
        expect(
          adapter
        ).toContain(
          "inventedSectionIds:"
        );

        expect(
          adapter
        ).toContain(
          "sectionId:"
        );

        expect(
          adapter
        ).toContain(
          "null"
        );
      }
    );


    it(
      "uses QueryGraph mission boundaries",
      () => {
        expect(
          adapter
        ).toContain(
          "samePageNodeIds"
        );

        expect(
          adapter
        ).toContain(
          "sameMissionEvidence:"
        );
      }
    );
  }
);
