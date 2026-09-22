import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateBusinessCompatibility,
} from "./business-compatibility";

function fact(
  overrides: Partial<{
    id: string;
    type: string;
    claim: string;
    status: string;
    evidenceStatus: string;
  }> = {}
) {
  return {
    id:
      overrides.id ??
      "f1",

    type:
      overrides.type ??
      "CAPABILITY",

    claim:
      overrides.claim ??
      "We provide credit monitoring.",

    status:
      overrides.status ??
      "VERIFIED",

    evidenceStatus:
      overrides.evidenceStatus ??
      "FRESH",

    sourceUrl:
      null,

    sourceLabel:
      null,

    version:
      1,
  };
}

describe(
  "business compatibility",
  () => {
    it(
      "supports a keyword only with matching verified fresh evidence",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "credit monitoring",

            facts: [
              fact(),
            ],
          });

        expect(
          result.status
        ).toBe(
          "SUPPORTED"
        );

        expect(
          result.matchingFacts
        ).toHaveLength(
          1
        );
      }
    );

    it(
      "does not turn adjacent breach-scanning facts into credit-monitoring support",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "credit monitoring",

            facts: [
              fact({
                claim:
                  "Users can scan an email address for known data breaches.",
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "UNVERIFIED"
        );
      }
    );

    it(
      "allows informational treatment without claiming the product provides the service",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "what is credit monitoring",

            facts: [
              fact({
                claim:
                  "Users can scan an email address for known data breaches.",
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "EDUCATIONAL_ONLY"
        );
      }
    );

    it(
      "blocks an explicit verified conflict",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "credit monitoring",

            facts: [
              fact({
                claim:
                  "ScanMyCreds does not provide credit monitoring.",
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "CONFLICT"
        );
      }
    );

    it(
      "does not trust drifted evidence",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "credit monitoring",

            facts: [
              fact({
                evidenceStatus:
                  "DRIFTED",
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "UNVERIFIED"
        );

        expect(
          result.ignoredFacts.notFresh
        ).toBe(
          1
        );
      }
    );

    it(
      "does not infer free service from generic service support",
      () => {
        const result =
          evaluateBusinessCompatibility({
            keyword:
              "free credit monitoring",

            facts: [
              fact({
                claim:
                  "We provide credit monitoring.",
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "UNVERIFIED"
        );
      }
    );
  }
);
