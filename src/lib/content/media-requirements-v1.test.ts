import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMediaRequirementsForAssignedAssetV1,
  isMediaRequirementReadyV1,
  parseMediaRequirementsV1,
} from "./media-requirements-v1";

import type {
  OriginalValueAsset,
} from "./original-value";


function asset(
  overrides:
    Partial<OriginalValueAsset>
): OriginalValueAsset {
  return {
    id:
      "asset-1",

    type:
      "ORIGINAL_DIAGRAM",

    title:
      "Original diagram",

    description:
      "Explain the process visually.",

    firstParty:
      true,

    verified:
      true,

    evidenceIds: [
      "evidence-1",
    ],

    ...overrides,
  };
}


describe(
  "Media Requirements V1",
  () => {
    it(
      "maps verified original diagram to READY DIAGRAM",
      () => {
        const result =
          buildMediaRequirementsForAssignedAssetV1({
            sectionId:
              "section-2",

            asset:
              asset({}),
          });


        expect(
          result
        ).toHaveLength(
          1
        );

        expect(
          result[0]
        ).toMatchObject({
          sectionId:
            "section-2",

          assetId:
            "asset-1",

          type:
            "DIAGRAM",

          status:
            "READY",
        });
      }
    );


    it(
      "keeps an unverified real-screenshot plan blocked from Writer use",
      () => {
        const result =
          buildMediaRequirementsForAssignedAssetV1({
            sectionId:
              "section-1",

            asset:
              asset({
                type:
                  "REAL_SCREENSHOTS",

                verified:
                  false,
              }),
          });


        expect(
          result[0]
            ?.type
        ).toBe(
          "SCREENSHOT"
        );

        expect(
          result[0]
            ?.status
        ).toBe(
          "REQUIRES_VERIFICATION"
        );

        expect(
          isMediaRequirementReadyV1(
            result[0]!
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "creates CHART only from verified data/research/telemetry assets",
      () => {
        const verified =
          buildMediaRequirementsForAssignedAssetV1({
            sectionId:
              "section-1",

            asset:
              asset({
                type:
                  "FIRST_PARTY_DATASET",

                verified:
                  true,
              }),
          });


        const unverified =
          buildMediaRequirementsForAssignedAssetV1({
            sectionId:
              "section-1",

            asset:
              asset({
                type:
                  "FIRST_PARTY_DATASET",

                verified:
                  false,
              }),
          });


        expect(
          verified[0]
            ?.type
        ).toBe(
          "CHART"
        );

        expect(
          unverified
        ).toEqual(
          []
        );
      }
    );


    it(
      "does not infer photo or video media from REAL_TEST or CASE_STUDY",
      () => {
        for (
          const type
          of [
            "REAL_TEST",
            "CASE_STUDY",
          ] as const
        ) {
          expect(
            buildMediaRequirementsForAssignedAssetV1({
              sectionId:
                "section-1",

              asset:
                asset({
                  type,
                }),
            })
          ).toEqual(
            []
          );
        }
      }
    );


    it(
      "parses persisted requirements and supports legacy missing field",
      () => {
        expect(
          parseMediaRequirementsV1(
            undefined
          )
        ).toEqual(
          []
        );


        const current =
          buildMediaRequirementsForAssignedAssetV1({
            sectionId:
              "section-1",

            asset:
              asset({}),
          });


        expect(
          parseMediaRequirementsV1(
            current
          )
        ).toEqual(
          current
        );
      }
    );
  }
);
