import {
  describe,
  expect,
  it,
} from "vitest";

import {
  brandAwareSubIntentV1,
  deriveQueryBoundaryEvidenceV1,
} from "./query-boundary-evidence-v1";


describe(
  "query boundary evidence V1",
  () => {
    it(
      "accepts an observed same-intent supporting question when no foreign SERP entity is present",
      () => {
        const evidence =
          deriveQueryBoundaryEvidenceV1({
            query:
              "does credit monitoring affect credit score",

            missionTopic:
              "credit monitoring",

            selectedQuestion:
              true,

            queryIntent:
              "INFORMATIONAL",

            missionIntent:
              "INFORMATIONAL",

            serpDomains: [
              "experian.com",
              "equifax.com",
              "creditkarma.com",
            ],
          });


        expect(
          evidence.foreignEntityEvidence
        ).toBe(
          false
        );


        expect(
          evidence.sameMissionEvidence
        ).toBe(
          true
        );
      }
    );


    it(
      "detects a foreign SERP brand and vetoes same-mission evidence",
      () => {
        const evidence =
          deriveQueryBoundaryEvidenceV1({
            query:
              "what is credit monitoring on credit karma",

            missionTopic:
              "credit monitoring",

            selectedQuestion:
              true,

            queryIntent:
              "INFORMATIONAL",

            missionIntent:
              "INFORMATIONAL",

            serpDomains: [
              "creditkarma.com",
              "experian.com",
            ],
          });


        expect(
          evidence.foreignEntityEvidence
        ).toBe(
          true
        );


        expect(
          evidence.matchedForeignBrands
        ).toContain(
          "creditkarma"
        );


        expect(
          evidence.sameMissionEvidence
        ).toBe(
          false
        );


        expect(
          brandAwareSubIntentV1({
            subIntent:
              "service explanation",

            foreignEntityEvidence:
              true,
          })
        ).toContain(
          "BRAND"
        );
      }
    );


    it(
      "does not treat a generic domain token already contained in the mission as foreign",
      () => {
        const evidence =
          deriveQueryBoundaryEvidenceV1({
            query:
              "what is credit monitoring",

            missionTopic:
              "credit monitoring",

            selectedQuestion:
              true,

            queryIntent:
              "INFORMATIONAL",

            missionIntent:
              "INFORMATIONAL",

            serpDomains: [
              "credit.com",
            ],
          });


        expect(
          evidence.foreignEntityEvidence
        ).toBe(
          false
        );
      }
    );
  }
);
