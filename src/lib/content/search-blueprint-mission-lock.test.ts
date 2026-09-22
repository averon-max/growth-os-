import {
  describe,
  expect,
  it,
} from "vitest";

import {
  shouldPreserveProductionPrimaryMission,
} from "./search-blueprint";


function decision({
  status = "NO_GO",
  confidence = "LOW",
  keyword =
    "what is credit monitoring",
  eligible = true,
  intent = "INFORMATIONAL",
}: {
  status?: string;
  confidence?: string;
  keyword?: string;
  eligible?: boolean;
  intent?: string;
} = {}) {
  return {
    status,
    confidence,

    ranked: [
      {
        keyword:
          "experian credit monitoring",

        eligible: true,

        intent:
          "INFORMATIONAL",
      },

      {
        keyword,
        eligible,
        intent,
      },
    ],
  };
}


describe(
  "manual topic mission lock",
  () => {
    it(
      "preserves an eligible informational production primary when alternative evidence is low confidence",
      () => {
        expect(
          shouldPreserveProductionPrimaryMission({
            productionPrimary:
              "what is credit monitoring",

            searchIntent:
              "INFORMATIONAL",

            keywordDecision:
              decision(),
          })
        ).toBe(true);
      }
    );


    it(
      "does not preserve an ineligible production primary",
      () => {
        expect(
          shouldPreserveProductionPrimaryMission({
            productionPrimary:
              "what is credit monitoring",

            searchIntent:
              "INFORMATIONAL",

            keywordDecision:
              decision({
                eligible: false,
              }),
          })
        ).toBe(false);
      }
    );


    it(
      "does not override an intent mismatch",
      () => {
        expect(
          shouldPreserveProductionPrimaryMission({
            productionPrimary:
              "what is credit monitoring",

            searchIntent:
              "INFORMATIONAL",

            keywordDecision:
              decision({
                intent:
                  "NAVIGATIONAL",
              }),
          })
        ).toBe(false);
      }
    );


    it(
      "does not suppress a higher-confidence decision",
      () => {
        expect(
          shouldPreserveProductionPrimaryMission({
            productionPrimary:
              "what is credit monitoring",

            searchIntent:
              "INFORMATIONAL",

            keywordDecision:
              decision({
                confidence:
                  "HIGH",
              }),
          })
        ).toBe(false);
      }
    );
  }
);
