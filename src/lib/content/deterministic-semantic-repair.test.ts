import {
  describe,
  expect,
  it,
} from "vitest";

import {
  deterministicSemanticDeleteRepairV1,
} from "./deterministic-semantic-repair";


describe(
  "deterministic semantic repair",
  () => {
    it(
      "deletes blocked prose without rewriting supported prose",
      () => {
        const section =
          {
            version:
              "GENERATED_SECTION_V1",

            heading:
              "Example",

            bodyMarkdown:
              [
                "Supported claim.",
                "",
                "Unsupported invented detail.",
                "",
                "Useful framing.",
              ].join(
                "\n"
              ),

            coveredQueryNodeIds:
              [],

            referencedClaimIds:
              [
                "claim-1",
              ],

            referencedEvidenceIds:
              [
                "evidence-1",
              ],

            usedInternalLinks:
              [],

            assetUsed:
              null,

            provenance: {
              sourceContractVersion:
                "SECTION_GENERATION_CONTRACT_V1",

              sectionIndex:
                0,

              sectionNumber:
                1,

              totalSections:
                1,

              blueprintHeading:
                "Example",

              modelName:
                "test-model",
            },
          } as const;


        const contract =
          {
            sectionIndex:
              0,

            blueprint: {
              requiredClaims:
                [
                  "claim-1",
                ],
            },
          } as any;


        const verification =
          {
            status:
              "BLOCK",

            units: [
              {
                unitId:
                  "section-0-unit-0",

                classification:
                  "SUPPORTED",

                matchedClaimId:
                  "claim-1",

                evidenceIds:
                  [
                    "evidence-1",
                  ],
              },

              {
                unitId:
                  "section-0-unit-1",

                classification:
                  "UNSUPPORTED",

                matchedClaimId:
                  null,

                evidenceIds:
                  [],
              },

              {
                unitId:
                  "section-0-unit-2",

                classification:
                  "NOT_A_FACT",

                matchedClaimId:
                  null,

                evidenceIds:
                  [],
              },
            ],
          } as any;


        const repaired =
          deterministicSemanticDeleteRepairV1({
            contract,

            section,

            verification,
          });


        expect(
          repaired.bodyMarkdown
        ).toContain(
          "Supported claim."
        );


        expect(
          repaired.bodyMarkdown
        ).toContain(
          "Useful framing."
        );


        expect(
          repaired.bodyMarkdown
        ).not.toContain(
          "Unsupported invented detail."
        );


        /*
         * Deterministic surgery never changes structured authority.
         */
        expect(
          repaired
            .referencedClaimIds
        ).toEqual(
          [
            "claim-1",
          ]
        );


        expect(
          repaired
            .referencedEvidenceIds
        ).toEqual(
          [
            "evidence-1",
          ]
        );
      }
    );


    it(
      "fails closed when a required claim has no surviving supported prose",
      () => {
        const section =
          {
            version:
              "GENERATED_SECTION_V1",

            heading:
              "Example",

            bodyMarkdown:
              "Unsupported claim.",

            coveredQueryNodeIds:
              [],

            referencedClaimIds:
              [
                "claim-1",
              ],

            referencedEvidenceIds:
              [],

            usedInternalLinks:
              [],

            assetUsed:
              null,

            provenance: {
              sourceContractVersion:
                "SECTION_GENERATION_CONTRACT_V1",

              sectionIndex:
                0,

              sectionNumber:
                1,

              totalSections:
                1,

              blueprintHeading:
                "Example",

              modelName:
                "test-model",
            },
          } as const;


        expect(
          () =>
            deterministicSemanticDeleteRepairV1({
              contract: {
                sectionIndex:
                  0,

                blueprint: {
                  requiredClaims:
                    [
                      "claim-1",
                    ],
                },
              } as any,

              section,

              verification: {
                status:
                  "BLOCK",

                units: [
                  {
                    unitId:
                      "section-0-unit-0",

                    classification:
                      "UNSUPPORTED",

                    matchedClaimId:
                      null,

                    evidenceIds:
                      [],
                  },
                ],
              } as any,
            })
        ).toThrow(
          "SECTION_DETERMINISTIC_SEMANTIC_REQUIRED_CLAIM_NOT_SURVIVING:claim-1"
        );
      }
    );
  }
);
