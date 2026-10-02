import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const engine =
  readFileSync(
    "src/lib/content/content-suggestions-v1.ts",
    "utf8"
  );

const route =
  readFileSync(
    "src/app/api/content/suggestions/route.ts",
    "utf8"
  );

const ui =
  readFileSync(
    "src/components/dashboard/content-create-button.tsx",
    "utf8"
  );


describe(
  "Content Suggestions V1",
  () => {
    it(
      "never imports the paid keyword provider",
      () => {
        expect(
          engine
        ).not.toContain(
          "dataforseo-provider"
        );

        expect(
          engine
        ).not.toContain(
          "fetchRelatedKeywords"
        );

        expect(
          route
        ).not.toContain(
          "fetchRelatedKeywords"
        );
      }
    );


    it(
      "never calls the paid explore endpoint from Create Content",
      () => {
        expect(
          ui
        ).not.toContain(
          "/api/keywords/explore"
        );

        expect(
          ui
        ).toContain(
          "/api/content/suggestions"
        );
      }
    );


    it(
      "explicitly reports no paid API usage",
      () => {
        expect(
          engine
        ).toContain(
          "paidApiUsed:"
        );

        expect(
          engine
        ).toContain(
          "false"
        );
      }
    );
  }
);
