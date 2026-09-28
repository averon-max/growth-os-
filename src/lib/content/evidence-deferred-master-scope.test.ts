import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evidenceDeferredHeadingAffinityV1,
  resolveEvidenceDeferredMasterScopeV1,
} from "./evidence-deferred-master-scope";


describe(
  "Evidence Deferred Master Scope V1",
  () => {
    it(
      "maps equivalent free-vs-paid headings",
      () => {
        expect(
          evidenceDeferredHeadingAffinityV1(
            "Free vs. Paid Credit Monitoring Options",
            "Free credit monitoring versus paid services"
          )
        ).toBeGreaterThanOrEqual(
          0.6
        );
      }
    );


    it(
      "defers only a zero-authority matching Master section",
      () => {
        const result =
          resolveEvidenceDeferredMasterScopeV1({
            blueprints: [
              {
                heading:
                  "What Is Credit Monitoring?",

                requiredClaims: [
                  "claim-definition",
                ],

                evidenceIds: [
                  "verified-excerpt-1",
                ],
              },

              {
                heading:
                  "Free vs. Paid Credit Monitoring Options",

                requiredClaims:
                  [],

                evidenceIds:
                  [],
              },
            ],

            deferredSections: [
              {
                heading:
                  "Free credit monitoring versus paid services",

                summary:
                  "Comparison requires verified external evidence.",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual([
          1,
        ]);

        expect(
          result.deferredSections[
            0
          ]?.heading
        ).toBe(
          "Free vs. Paid Credit Monitoring Options"
        );
      }
    );


    it(
      "never defers a section that owns publication authority",
      () => {
        const result =
          resolveEvidenceDeferredMasterScopeV1({
            blueprints: [
              {
                heading:
                  "Free vs. Paid Credit Monitoring Options",

                requiredClaims: [
                  "claim-free",
                ],

                evidenceIds: [
                  "verified-excerpt-free",
                ],
              },
            ],

            deferredSections: [
              {
                heading:
                  "Free credit monitoring versus paid services",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual(
          []
        );
      }
    );


    it(
      "does not remove an unrelated no-evidence explanatory section",
      () => {
        const result =
          resolveEvidenceDeferredMasterScopeV1({
            blueprints: [
              {
                heading:
                  "What to do next",

                requiredClaims:
                  [],

                evidenceIds:
                  [],
              },
            ],

            deferredSections: [
              {
                heading:
                  "Free credit monitoring versus paid services",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual(
          []
        );
      }
    );
  }
);
