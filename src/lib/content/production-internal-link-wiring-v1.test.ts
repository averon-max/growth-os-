import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const planner =
  readFileSync(
    "src/lib/content/production-master-live-stage-planner.ts",
    "utf8"
  );


const adapter =
  readFileSync(
    "src/lib/content/production-master-live-source-adapter.ts",
    "utf8"
  );


describe(
  "Production Internal Link Wiring V1",
  () => {
    it(
      "loads existing crawl pages in production",
      () => {
        expect(
          adapter
        ).toContain(
          "getInternalLinkCandidatesForWebsiteV1"
        );

        expect(
          adapter
        ).toContain(
          "internalLinkCandidates"
        );
      }
    );


    it(
      "assigns approved URLs to section blueprints",
      () => {
        expect(
          planner
        ).toContain(
          "PRODUCTION_INTERNAL_LINK_SELECTION_V1"
        );

        expect(
          planner
        ).toContain(
          "internalLinksBySectionId.get("
        );
      }
    );


    it(
      "records approved targets in master blueprint",
      () => {
        expect(
          planner
        ).toContain(
          "internalLinkTargets:"
        );

        expect(
          planner
        ).toContain(
          ".approvedTargetUrls"
        );
      }
    );


    it(
      "does not invent a CREATE source URL",
      () => {
        expect(
          planner
        ).toContain(
          "articleTargetUrl:\n        null"
        );

        expect(
          planner
        ).toContain(
          ".concretePlan"
        );
      }
    );
  }
);
