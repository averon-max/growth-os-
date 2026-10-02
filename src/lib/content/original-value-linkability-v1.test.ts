import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateOriginalValueLinkabilityV1,
} from "./original-value-linkability-v1";

import type {
  OriginalValueAsset,
} from "./original-value";


function asset(
  overrides:
    Partial<OriginalValueAsset> = {}
): OriginalValueAsset {
  return {
    id:
      "asset-1",

    type:
      "ORIGINAL_DIAGRAM",

    title:
      "Original diagram",

    description:
      "Original explanatory asset.",

    firstParty:
      true,

    verified:
      false,

    ...overrides,
  };
}


describe(
  "Original Value Linkability V1",
  () => {
    it(
      "recognizes a planned citation-worthy asset without pretending it is verified",
      () => {
        const result =
          evaluateOriginalValueLinkabilityV1([
            asset(),
          ]);

        expect(
          result.status
        ).toBe(
          "PASS"
        );

        expect(
          result
            .plannedLinkableAssetIds
        ).toEqual([
          "asset-1",
        ]);

        expect(
          result
            .verifiedLinkableAssetIds
        ).toEqual(
          []
        );
      }
    );


    it(
      "requires verification plus evidence ids for verified linkability",
      () => {
        const result =
          evaluateOriginalValueLinkabilityV1([
            asset({
              verified:
                true,

              evidenceIds: [
                "evidence-1",
              ],
            }),
          ]);

        expect(
          result
            .verifiedLinkableAssetIds
        ).toEqual([
          "asset-1",
        ]);
      }
    );


    it(
      "recognizes real first-party testing for review eligibility",
      () => {
        const result =
          evaluateOriginalValueLinkabilityV1([
            asset({
              type:
                "REAL_TEST",

              firstParty:
                true,
            }),
          ]);

        expect(
          result
            .firstPartyExperienceAssetIds
        ).toEqual([
          "asset-1",
        ]);
      }
    );
  }
);
