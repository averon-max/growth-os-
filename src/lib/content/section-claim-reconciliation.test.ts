import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  assertSectionClaimReconciliationPassed,
  reconcileGeneratedSectionClaimsV1,
} from "./section-claim-reconciliation";


function contract({
  claimStatus =
    "VERIFIED",

  risk =
    "HIGH",

  category =
    "FINANCIAL",

  requiredClaims = [
    "claim-1",
  ],

  forbiddenClaims = [
    "claim-forbidden",
  ],

  assignedEvidence = [
    "ev-1",
  ],

  claimEvidence = [
    {
      id:
        "ev-1",

      claimId:
        "claim-1",

      sourceId:
        "source-1",

      relation:
        "SUPPORTS",

      kind:
        "VERIFIED_EXCERPT",

      excerpt:
        "Verified supporting excerpt.",
    },
  ],
}: {
  claimStatus?:
    | "VERIFIED"
    | "PARTIAL"
    | "UNSUPPORTED"
    | "CONTRADICTED"
    | "STALE"
    | "JURISDICTION_MISMATCH";

  risk?:
    "LOW" |
    "MEDIUM" |
    "HIGH";

  category?:
    | "FACT"
    | "STATISTIC"
    | "FINANCIAL"
    | "LEGAL"
    | "PRODUCT"
    | "PRICE"
    | "COMPARISON";

  requiredClaims?:
    string[];

  forbiddenClaims?:
    string[];

  assignedEvidence?:
    string[];

  claimEvidence?:
    Array<{
      id:
        string;

      claimId:
        string;

      sourceId:
        string;

      relation:
        "SUPPORTS" |
        "NEUTRAL" |
        "CONTRADICTS";

      kind:
        string;

      excerpt?:
        string;
    }>;
} = {}):
SectionGenerationContractV1 {
  return {
    version:
      "SECTION_GENERATION_CONTRACT_V1",

    sectionIndex:
      0,

    sectionNumber:
      1,

    totalSections:
      1,

    blueprint: {
      heading:
        "What Credit Monitoring Does",

      mission:
        "Explain the core function.",

      queryNodeIds:
        [],

      requiredClaims,

      forbiddenClaims,

      evidenceIds:
        assignedEvidence,

      internalLinks:
        [],

      expectedOutcome:
        "Reader understands the function.",
    },

    claimLedger: {
      version:
        "CLAIM_LEDGER_V1",

      claims: [
        {
          id:
            "claim-1",

          text:
            "Credit monitoring can detect changes in a credit report.",

          category,

          risk,

          jurisdiction:
            "US",

          evidenceIds:
            claimEvidence
              .filter(
                (evidence) =>
                  evidence.claimId ===
                  "claim-1"
              )
              .map(
                (evidence) =>
                  evidence.id
              ),

          status:
            claimStatus,
        },

        {
          id:
            "claim-forbidden",

          text:
            "Credit monitoring prevents all identity theft.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          jurisdiction:
            "US",

          evidenceIds:
            [],

          status:
            "UNSUPPORTED",
        },
      ],
    },

    evidenceGraph: {
      version:
        "EVIDENCE_GRAPH_V1",

      sources: [
        {
          id:
            "source-1",

          url:
            "https://example.com/source",

          publisher:
            "Example",

          sourceType:
            "PRIMARY_OFFICIAL",

          authorityTier:
            "B",

          jurisdiction:
            "US",

          retrievedAt:
            new Date(
              "2026-09-21T00:00:00.000Z"
            ),
        },
      ],

      claimEvidence,
    },
  } as unknown as
    SectionGenerationContractV1;
}


function section({
  claimIds = [
    "claim-1",
  ],

  evidenceIds = [
    "ev-1",
  ],
}: {
  claimIds?:
    string[];

  evidenceIds?:
    string[];
} = {}):
GeneratedSectionV1 {
  return {
    version:
      "GENERATED_SECTION_V1",

    heading:
      "What Credit Monitoring Does",

    bodyMarkdown:
      "Credit monitoring can detect changes in a credit report.",

    coveredQueryNodeIds:
      [],

    referencedClaimIds:
      claimIds,

    referencedEvidenceIds:
      evidenceIds,

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
        "What Credit Monitoring Does",

      modelName:
        "test-model",
    },
  };
}


describe(
  "Section Claim Reconciliation V1",
  () => {
    it(
      "passes when a required verified claim is linked to assigned declared SUPPORTS + VERIFIED_EXCERPT evidence",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract(),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "PASS"
        );

        expect(
          result.verifiedSupport
        ).toEqual([
          {
            claimId:
              "claim-1",

            evidenceIds: [
              "ev-1",
            ],

            sourceIds: [
              "source-1",
            ],
          },
        ]);

        expect(
          result.findings
        ).toEqual(
          []
        );
      }
    );


    it(
      "blocks when a required claim was not declared by the generated section",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract(),

            section:
              section({
                claimIds:
                  [],

                evidenceIds:
                  [],
              }),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "REQUIRED_CLAIM_NOT_REFERENCED"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks contradicted claims",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "CONTRADICTED",
              }),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "CONTRADICTED_CLAIM"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks unsupported HIGH-risk claims",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "UNSUPPORTED",

                risk:
                  "HIGH",
              }),

            section:
              section({
                evidenceIds:
                  [],
              }),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "UNSUPPORTED_HIGH_RISK_CLAIM"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks stale financial claims",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "STALE",

                category:
                  "FINANCIAL",
              }),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "STALE_FINANCIAL_OR_LEGAL_CLAIM"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks jurisdiction mismatch",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "JURISDICTION_MISMATCH",
              }),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "JURISDICTION_MISMATCH"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "warns on partial claims while preserving valid support provenance",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "PARTIAL",
              }),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "PARTIAL_CLAIM"
          )
        ).toBe(
          true
        );

        expect(
          result.verifiedSupport
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "warns on unsupported non-high-risk claims instead of inventing support",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "UNSUPPORTED",

                risk:
                  "LOW",

                category:
                  "FACT",
              }),

            section:
              section({
                evidenceIds:
                  [],
              }),
          });

        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "UNSUPPORTED_NON_HIGH_RISK_CLAIM"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks VERIFIED claims when supporting evidence exists upstream but the section did not declare reliance on it",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract(),

            section:
              section({
                evidenceIds:
                  [],
              }),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "VERIFIED_CLAIM_SUPPORT_NOT_RECONCILED"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not treat SEARCH_SNIPPET-style evidence as publication-grade support",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimEvidence: [
                  {
                    id:
                      "ev-1",

                    claimId:
                      "claim-1",

                    sourceId:
                      "source-1",

                    relation:
                      "SUPPORTS",

                    kind:
                      "SEARCH_SNIPPET",

                    excerpt:
                      "Search snippet.",
                  },
                ],
              }),

            section:
              section(),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "VERIFIED_CLAIM_SUPPORT_NOT_RECONCILED"
          )
        ).toBe(
          true
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "NON_PUBLICATION_GRADE_EVIDENCE_REFERENCED"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks contradicting evidence when a section declares reliance on it",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "CONTRADICTED",

                claimEvidence: [
                  {
                    id:
                      "ev-1",

                    claimId:
                      "claim-1",

                    sourceId:
                      "source-1",

                    relation:
                      "CONTRADICTS",

                    kind:
                      "VERIFIED_EXCERPT",

                    excerpt:
                      "The source contradicts this claim.",
                  },
                ],
              }),

            section:
              section(),
          });

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "CONTRADICTING_EVIDENCE_REFERENCED"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks evidence attached to a claim the generated section did not declare",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                requiredClaims:
                  [],

                assignedEvidence: [
                  "ev-other",
                ],

                claimEvidence: [
                  {
                    id:
                      "ev-other",

                    claimId:
                      "claim-other",

                    sourceId:
                      "source-1",

                    relation:
                      "SUPPORTS",

                    kind:
                      "VERIFIED_EXCERPT",

                    excerpt:
                      "Other claim support.",
                  },
                ],
              }),

            section:
              section({
                claimIds:
                  [],

                evidenceIds: [
                  "ev-other",
                ],
              }),
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (item) =>
              item.code ===
              "EVIDENCE_REFERENCES_UNDECLARED_CLAIM"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "allows an assigned source ID as context but never counts the source itself as claim verification",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                requiredClaims:
                  [],

                assignedEvidence: [
                  "source-1",
                ],

                claimEvidence:
                  [],
              }),

            section:
              section({
                claimIds:
                  [],

                evidenceIds: [
                  "source-1",
                ],
              }),
          });

        expect(
          result.status
        ).toBe(
          "PASS"
        );

        expect(
          result.verifiedSupport
        ).toEqual(
          []
        );
      }
    );


    it(
      "assertion throws only for BLOCK and permits WARN",
      () => {
        const blocked =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "CONTRADICTED",
              }),

            section:
              section(),
          });

        expect(
          () =>
            assertSectionClaimReconciliationPassed(
              blocked
            )
        ).toThrow(
          "SECTION_CLAIM_RECONCILIATION_BLOCKED"
        );


        const warned =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract({
                claimStatus:
                  "PARTIAL",
              }),

            section:
              section(),
          });

        expect(
          () =>
            assertSectionClaimReconciliationPassed(
              warned
            )
        ).not.toThrow();
      }
    );


    it(
      "freezes reconciliation output and support provenance",
      () => {
        const result =
          reconcileGeneratedSectionClaimsV1({
            contract:
              contract(),

            section:
              section(),
          });

        expect(
          Object.isFrozen(
            result
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.findings
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.verifiedSupport
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.verifiedSupport[0]
          )
        ).toBe(
          true
        );
      }
    );
  }
);
