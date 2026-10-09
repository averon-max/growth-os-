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


describe(
  "secondary cluster production projection V2",
  () => {
    it(
      "keeps the production marker",
      () => {
        expect(
          service
        ).toContain(
          "SECONDARY_CLUSTER_PRODUCTION_PROJECTION_V2"
        );
      }
    );


    it(
      "projects only primary plus approved secondary keywords into relatedKeywords",
      () => {
        const start =
          service.indexOf(
            "const relatedKeywords:"
          );

        expect(start).toBeGreaterThan(-1);

        const block =
          service.slice(
            start,
            start + 1200
          );

        expect(
          block
        ).toContain(
          "strategy.primary"
        );

        expect(
          block
        ).toContain(
          "...strategy.secondary"
        );

        expect(
          block
        ).not.toContain(
          "...strategy.supporting"
        );
      }
    );


    it(
      "does not expose supporting candidates in the article strategy prompt",
      () => {
        const start =
          service.indexOf(
            "function strategyPrompt"
          );

        const end =
          service.indexOf(
            "export async function createContentBrief",
            start
          );

        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);

        const block =
          service.slice(
            start,
            end
          );

        expect(
          block
        ).toContain(
          "Secondary keywords:"
        );

        expect(
          block
        ).not.toContain(
          "Supporting concepts:"
        );

        expect(
          block
        ).not.toContain(
          "const supporting ="
        );
      }
    );


    it(
      "preserves downstream QueryGraph SAME_PAGE authority",
      () => {
        expect(
          service
        ).toContain(
          "QueryGraph remains downstream SAME_PAGE authority"
        );
      }
    );
  }
);
