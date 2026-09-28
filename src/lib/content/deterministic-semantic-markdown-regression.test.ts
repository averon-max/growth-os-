import {
  describe,
  expect,
  it,
} from "vitest";

import {
  deterministicSemanticDeleteRepairV1,
} from "./deterministic-semantic-repair";


describe(
  "semantic repair markdown mapping",
  () => {
    it(
      "maps plain semantic text back to bold-prefix markdown exactly",
      () => {
        const repaired =
          deterministicSemanticDeleteRepairV1({
            contract: {
              sectionIndex:
                1,

              sectionNumber:
                2,

              blueprint: {
                requiredClaims:
                  [],
              },
            } as any,

            section: {
              version:
                "GENERATED_SECTION_V1",

              bodyMarkdown:
                "**Credit monitoring** continuously checks reports. Reader guidance remains.",

              coveredQueryNodeIds:
                [],

              referencedClaimIds:
                [],

              referencedEvidenceIds:
                [],

              assetUsed:
                null,

              provenance: {
                sectionIndex:
                  1,
              },
            } as any,

            verification: {
              status:
                "BLOCK",

              units: [
                {
                  unitId:
                    "section-1-unit-0",

                  ordinal:
                    0,

                  text:
                    "Credit monitoring continuously checks reports.",

                  classification:
                    "UNSUPPORTED",

                  matchedClaimId:
                    null,

                  evidenceIds:
                    [],

                  rationale:
                    "unsupported",
                },

                {
                  unitId:
                    "section-1-unit-1",

                  ordinal:
                    1,

                  text:
                    "Reader guidance remains.",

                  classification:
                    "NOT_A_FACT",

                  matchedClaimId:
                    null,

                  evidenceIds:
                    [],

                  rationale:
                    "guidance",
                },
              ],
            } as any,
          });

        expect(
          repaired.bodyMarkdown
        ).not.toContain(
          "continuously checks reports"
        );

        expect(
          repaired.bodyMarkdown
        ).toContain(
          "Reader guidance remains."
        );
      }
    );
  }
);
