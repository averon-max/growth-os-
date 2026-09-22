import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMasterSectionRepairPrompt,
} from "./master-section-repair-prompt";


describe(
  "Master Section Repair Prompt",
  () => {
    it(
      "forbids article-wide mutation and invented evidence",
      () => {
        const prompt =
          buildMasterSectionRepairPrompt({
            contract: {
              sectionIndex:
                0,

              sectionNumber:
                1,

              totalSections:
                1,

              blueprint: {
                heading:
                  "Section",

                mission:
                  "Explain.",

                requiredClaims: [
                  "claim-1",
                ],

                forbiddenClaims:
                  [],

                evidenceIds: [
                  "ev-1",
                ],
              },

              hardRules: {},

              claimLedger: {
                claims:
                  [],
              },

              evidenceGraph: {
                sources:
                  [],

                claimEvidence:
                  [],
              },
            } as never,

            section: {
              heading:
                "Section",

              bodyMarkdown:
                "Bad sentence.",

              coveredQueryNodeIds:
                [],

              referencedClaimIds:
                [],

              referencedEvidenceIds:
                [],

              usedInternalLinks:
                [],

              assetUsed:
                null,
            } as never,

            reconciliation: {
              status:
                "BLOCK",
            } as never,

            semanticVerification:
              null,

            attempt:
              1,
          });

        expect(
          prompt
        ).toContain(
          "You are NOT rewriting the article."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H1."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H2."
        );

        expect(
          prompt
        ).toContain(
          "Never invent a fact"
        );

        expect(
          prompt
        ).toContain(
          "remove it or narrow it instead of fabricating support"
        );
      }
    );
  }
);
