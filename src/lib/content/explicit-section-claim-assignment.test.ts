import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assignVerifiedEvidenceToExplicitSectionsV2,
} from "./live-evidence-verification";


describe(
  "explicit section claim assignment V2",
  () => {
    const claims = [
      {
        id:
          "definition",

        text:
          "Credit monitoring services track changes to credit reports.",
      },

      {
        id:
          "alerts",

        text:
          "Credit monitoring services can alert users when information changes.",
      },
    ];


    const evidenceGraph =
      {
        sources: [
          {
            id:
              "source-definition",

            url:
              "https://example.com/definition",

            publisher:
              "Example",

            sourceType:
              "PRIMARY_OFFICIAL",

            authorityTier:
              "B",

            retrievedAt:
              new Date(),
          },
        ],

        claimEvidence: [
          {
            id:
              "ev-definition",

            claimId:
              "definition",

            sourceId:
              "source-definition",

            relation:
              "SUPPORTS",

            kind:
              "VERIFIED_EXCERPT",

            excerpt:
              "Credit monitoring lets consumers track activity on a credit report.",
          },

          {
            id:
              "ev-alerts",

            claimId:
              "alerts",

            sourceId:
              "source-definition",

            relation:
              "SUPPORTS",

            kind:
              "SEARCH_SNIPPET",

            excerpt:
              "Discovery only.",
          },
        ],
      } as any;


    it(
      "keeps definition in the explicitly-owned definition section",
      () => {
        const result =
          assignVerifiedEvidenceToExplicitSectionsV2({
            sections: [
              {
                requiredClaimIds: [
                  "definition",
                ],
              },

              {
                requiredClaimIds: [
                  "alerts",
                ],
              },
            ],

            claims,

            evidenceGraph,
          });


        expect(
          result[0]
            ?.requiredClaims
        ).toEqual([
          "definition",
        ]);


        expect(
          result[0]
            ?.evidenceIds
        ).toEqual([
          "ev-definition",
        ]);


        /*
         * SEARCH_SNIPPET must never create publication authority.
         */
        expect(
          result[1]
            ?.requiredClaims
        ).toEqual([]);


        expect(
          result[1]
            ?.evidenceIds
        ).toEqual([]);
      }
    );


    it(
      "rejects duplicate claim ownership",
      () => {
        expect(
          () =>
            assignVerifiedEvidenceToExplicitSectionsV2({
              sections: [
                {
                  requiredClaimIds: [
                    "definition",
                  ],
                },

                {
                  requiredClaimIds: [
                    "definition",
                  ],
                },
              ],

              claims,

              evidenceGraph,
            })
        ).toThrow(
          "SECTION_CLAIM_ASSIGNMENT_DUPLICATE_OWNER:definition"
        );
      }
    );


    it(
      "rejects invented claim IDs",
      () => {
        expect(
          () =>
            assignVerifiedEvidenceToExplicitSectionsV2({
              sections: [
                {
                  requiredClaimIds: [
                    "invented-claim",
                  ],
                },
              ],

              claims,

              evidenceGraph,
            })
        ).toThrow(
          "SECTION_CLAIM_ASSIGNMENT_UNKNOWN_CLAIM:invented-claim"
        );
      }
    );
  }
);
