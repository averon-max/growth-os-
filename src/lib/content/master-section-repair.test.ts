import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  finalizeGeneratedSectionV1,
  type GeneratedSectionV1,
} from "./master-article-generator";

import {
  extractSectionSemanticProseUnitsV1,
  finalizeSectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import {
  supportsMasterSectionRepairGenerator,
  verifyAndRepairGeneratedSectionV1,
} from "./master-section-repair";


function contract():
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
        "Explain detection without claiming prevention.",

      queryNodeIds:
        [],

      requiredClaims: [
        "claim-1",
      ],

      forbiddenClaims: [
        "claim-2",
      ],

      evidenceIds: [
        "ev-1",
        "ev-2",
      ],

      internalLinks:
        [],

      expectedOutcome:
        "Reader understands detection versus prevention.",
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

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          jurisdiction:
            "US",

          evidenceIds: [
            "ev-1",
          ],

          status:
            "VERIFIED",
        },

        {
          id:
            "claim-2",

          text:
            "Credit monitoring prevents identity theft.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          jurisdiction:
            "US",

          evidenceIds: [
            "ev-2",
          ],

          status:
            "CONTRADICTED",
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
            "https://example.com",

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
            "VERIFIED_EXCERPT",

          excerpt:
            "Monitoring can detect certain report changes.",
        },

        {
          id:
            "ev-2",

          claimId:
            "claim-2",

          sourceId:
            "source-1",

          relation:
            "CONTRADICTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Monitoring does not itself prevent identity theft.",
        },
      ],
    },
  } as unknown as
    SectionGenerationContractV1;
}


function generated({
  body,
  claims = [
    "claim-1",
  ],
  evidence = [
    "ev-1",
  ],
}: {
  body:
    string;

  claims?:
    string[];

  evidence?:
    string[];
}):
Readonly<GeneratedSectionV1> {
  return finalizeGeneratedSectionV1({
    contract:
      contract(),

    modelName:
      "test-model",

    candidate: {
      bodyMarkdown:
        body,

      referencedClaimIds:
        claims,

      referencedEvidenceIds:
        evidence,
    },
  });
}


function semantic({
  section,
  classification,
}: {
  section:
    Readonly<GeneratedSectionV1>;

  classification:
    "SUPPORTED" |
    "UNSUPPORTED" |
    "CONTRADICTED";
}) {
  const units =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        0,

      bodyMarkdown:
        section.bodyMarkdown,
    });

  return finalizeSectionSemanticVerificationV1({
    contract:
      contract(),

    section,

    modelName:
      "test-model",

    candidate: {
      units:
        units.map(
          (unit) => ({
            unitId:
              unit.id,

            classification,

            matchedClaimId:
              classification ===
              "SUPPORTED"
                ? "claim-1"
                : classification ===
                  "CONTRADICTED"
                  ? "claim-2"
                  : null,

            evidenceIds:
              classification ===
              "SUPPORTED"
                ? [
                    "ev-1",
                  ]
                : classification ===
                  "CONTRADICTED"
                  ? [
                      "ev-2",
                    ]
                  : [],

            rationale:
              "Test semantic decision.",
          })
        ),
    },
  });
}


describe(
  "Targeted Section Repair V1",
  () => {
    it(
      "does not repair an already clean section",
      async () => {
        let repairs =
          0;

        const section =
          generated({
            body:
              "Credit monitoring can detect changes in a credit report.",
          });

        const result =
          await verifyAndRepairGeneratedSectionV1({
            contract:
              contract(),

            section,

            generator: {
              modelName:
                "test-model",

              async verifySectionClaims({
                section:
                  candidate,
              }) {
                return semantic({
                  section:
                    candidate,

                  classification:
                    "SUPPORTED",
                });
              },

              async repairSection() {
                repairs +=
                  1;

                throw new Error(
                  "should not repair"
                );
              },
            },
          });

        expect(
          repairs
        ).toBe(
          0
        );

        expect(
          result.repair.attempted
        ).toBe(
          false
        );

        expect(
          result.repair.attemptCount
        ).toBe(
          0
        );

        expect(
          result.semanticVerification
            .status
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "repairs only a semantically blocked section exactly once",
      async () => {
        let verificationCalls =
          0;

        let repairs =
          0;

        const bad =
          generated({
            body:
              "Credit monitoring always improves your credit score.",
          });

        const result =
          await verifyAndRepairGeneratedSectionV1({
            contract:
              contract(),

            section:
              bad,

            generator: {
              modelName:
                "test-model",

              async verifySectionClaims({
                section:
                  candidate,
              }) {
                verificationCalls +=
                  1;

                return semantic({
                  section:
                    candidate,

                  classification:
                    verificationCalls ===
                      1
                      ? "UNSUPPORTED"
                      : "SUPPORTED",
                });
              },

              async repairSection(
                input
              ) {
                repairs +=
                  1;

                expect(
                  input.attempt
                ).toBe(
                  1
                );

                expect(
                  input.semanticVerification
                    ?.status
                ).toBe(
                  "BLOCK"
                );

                return generated({
                  body:
                    "Credit monitoring can detect changes in a credit report.",
                });
              },
            },
          });

        expect(
          repairs
        ).toBe(
          1
        );

        expect(
          verificationCalls
        ).toBe(
          2
        );

        expect(
          result.repair.attempted
        ).toBe(
          true
        );

        expect(
          result.repair.trigger
        ).toBe(
          "SEMANTIC"
        );

        expect(
          result.repair.attemptCount
        ).toBe(
          1
        );

        expect(
          result.semanticVerification
            .status
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "repairs deterministic reconciliation failure before semantic verification",
      async () => {
        let verificationCalls =
          0;

        let repairs =
          0;

        const bad =
          generated({
            body:
              "Credit monitoring detects changes.",

            claims: [
              "claim-1",
            ],

            evidence:
              [],
          });

        const result =
          await verifyAndRepairGeneratedSectionV1({
            contract:
              contract(),

            section:
              bad,

            generator: {
              modelName:
                "test-model",

              async verifySectionClaims({
                section:
                  candidate,
              }) {
                verificationCalls +=
                  1;

                return semantic({
                  section:
                    candidate,

                  classification:
                    "SUPPORTED",
                });
              },

              async repairSection(
                input
              ) {
                repairs +=
                  1;

                expect(
                  input.reconciliation
                    .status
                ).toBe(
                  "BLOCK"
                );

                expect(
                  input.semanticVerification
                ).toBeNull();

                return generated({
                  body:
                    "Credit monitoring can detect changes in a credit report.",
                });
              },
            },
          });

        expect(
          repairs
        ).toBe(
          1
        );

        expect(
          verificationCalls
        ).toBe(
          1
        );

        expect(
          result.repair.trigger
        ).toBe(
          "RECONCILIATION"
        );

        expect(
          result.reconciliation
            .status
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "fails closed when the repaired section still fails semantic verification",
      async () => {
        let repairs =
          0;

        const bad =
          generated({
            body:
              "Credit monitoring always improves your credit score.",
          });

        await expect(
          verifyAndRepairGeneratedSectionV1({
            contract:
              contract(),

            section:
              bad,

            generator: {
              modelName:
                "test-model",

              async verifySectionClaims({
                section:
                  candidate,
              }) {
                return semantic({
                  section:
                    candidate,

                  classification:
                    "UNSUPPORTED",
                });
              },

              async repairSection() {
                repairs +=
                  1;

                return generated({
                  body:
                    "Credit monitoring always improves your credit score.",
                });
              },
            },
          })
        ).rejects.toThrow(
          "SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC"
        );

        expect(
          repairs
        ).toBe(
          1
        );
      }
    );


    it(
      "fails closed when repair does not restore deterministic claim provenance",
      async () => {
        const bad =
          generated({
            body:
              "Credit monitoring detects changes.",

            claims: [
              "claim-1",
            ],

            evidence:
              [],
          });

        await expect(
          verifyAndRepairGeneratedSectionV1({
            contract:
              contract(),

            section:
              bad,

            generator: {
              modelName:
                "test-model",

              async verifySectionClaims({
                section:
                  candidate,
              }) {
                return semantic({
                  section:
                    candidate,

                  classification:
                    "SUPPORTED",
                });
              },

              async repairSection() {
                return generated({
                  body:
                    "Credit monitoring detects changes.",

                  claims: [
                    "claim-1",
                  ],

                  evidence:
                    [],
                });
              },
            },
          })
        ).rejects.toThrow(
          "SECTION_TARGETED_REPAIR_EXHAUSTED:RECONCILIATION"
        );
      }
    );


    it(
      "detects repair generator capability",
      () => {
        expect(
          supportsMasterSectionRepairGenerator({
            modelName:
              "test-model",

            async repairSection() {
              throw new Error(
                "not called"
              );
            },
          })
        ).toBe(
          true
        );

        expect(
          supportsMasterSectionRepairGenerator({
            modelName:
              "test-model",
          })
        ).toBe(
          false
        );
      }
    );
  }
);
