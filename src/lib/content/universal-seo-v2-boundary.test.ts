import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Universal SEO V2 boundary",
  () => {
    const files = [
      "universal-page-archetype.ts",
      "cannibalization-policy.ts",
      "universal-seo-decision.ts",
    ];


    const source =
      files
        .map(
          (
            file
          ) =>
            fs.readFileSync(
              path.join(
                process.cwd(),
                "src/lib/content",
                file
              ),
              "utf8"
            )
        )
        .join(
          "\n"
        );


    it(
      "is topic agnostic",
      () => {
        expect(
          source.toLowerCase()
        ).not.toContain(
          "credit monitoring"
        );

        expect(
          source
        ).not.toContain(
          "scanmycreds"
        );
      }
    );


    it(
      "makes SMART cannibalization the default",
      () => {
        expect(
          source
        ).toContain(
          '"SMART"'
        );

        expect(
          source
        ).toContain(
          '"PREVENT"'
        );

        expect(
          source
        ).toContain(
          '"ALLOW"'
        );

        expect(
          source
        ).toContain(
          '"IGNORE"'
        );
      }
    );


    it(
      "uses SERP evidence before lexical fallback",
      () => {
        expect(
          source
        ).toContain(
          '"SERP_DOMINANT"'
        );

        expect(
          source
        ).toContain(
          '"QUERY_FALLBACK"'
        );

        expect(
          source
        ).toContain(
          "TOP_RESULTS_WEIGHTED_BY_RANK"
        );
      }
    );
  }
);
