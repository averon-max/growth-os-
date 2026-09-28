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
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


const writer =
  readFileSync(
    new URL(
      "./master-section-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "production section ownership + SEO policy",
  () => {
    it(
      "uses explicit planner claim ownership",
      () => {
        expect(
          planner
        ).toContain(
          "SECTION_CLAIM_OWNERSHIP_V2"
        );


        expect(
          planner
        ).toContain(
          "requiredClaimIds"
        );


        expect(
          planner
        ).toContain(
          "assignVerifiedEvidenceToExplicitSectionsV2"
        );


        expect(
          planner
        ).not.toContain(
          "assignVerifiedEvidenceToSectionsV1({"
        );
      }
    );


    it(
      "does not optimize against arbitrary word or density quotas",
      () => {
        expect(
          planner
        ).toContain(
          "There is NO fixed SEO word-count target."
        );


        expect(
          planner
        ).toContain(
          "There is NO keyword-density target."
        );


        expect(
          writer
        ).toContain(
          "There is no arbitrary word-count target."
        );


        expect(
          writer
        ).toContain(
          "There is no keyword-density target."
        );
      }
    );
  }
);
