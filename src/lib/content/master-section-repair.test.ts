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
      "repairs a semantically blocked section deterministically without model rewrite",
      async () => {
        let semanticCalls =
          0;

        let repairCalls =
          0;


        const bad =
          generated({
            body:
              "Credit monitoring detects changes. Unsupported invented detail.",

            claims: [
              "claim-1",
            ],

            evidence: [
              "ev-1",
            ],
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
                semanticCalls +=
                  1;


                if (
                  semanticCalls ===
                  1
                ) {
                  return {
                    version:
                      "SECTION_SEMANTIC_VERIFICATION_V1",

                    status:
                      "BLOCK",

                    sectionIndex:
                      0,

                    sectionNumber:
                      1,

                    unitCount:
                      2,

                    units: [
                      {
                        unitId:
                          "section-0-unit-0",

                        ordinal:
                          0,

                        text:
                          "Credit monitoring detects changes.",

                        classification:
                          "SUPPORTED",

                        matchedClaimId:
                          "claim-1",

                        evidenceIds: [
                          "ev-1",
                        ],

                        rationale:
                          "Required claim survives with assigned evidence.",
                      },

                      {
                        unitId:
                          "section-0-unit-1",

                        ordinal:
                          1,

                        text:
                          "Unsupported invented detail.",

                        classification:
                          "UNSUPPORTED",

                        matchedClaimId:
                          null,

                        evidenceIds:
                          [],

                        rationale:
                          "Invented material detail has no authority.",
                      },
                    ],

                    counts: {
                      notAFact:
                        0,

                      supported:
                        1,

                      narrower:
                        0,

                      unsupported:
                        1,

                      contradicted:
                        0,
                    },

                    provenance: {
                      sourceContractVersion:
                        "SECTION_GENERATION_CONTRACT_V1",

                      generatedSectionVersion:
                        "GENERATED_SECTION_V1",

                      modelName:
                        "test-model",
                    },
                  } as any;
                }


                expect(
                  candidate.bodyMarkdown
                ).toBe(
                  "Credit monitoring detects changes."
                );


                return {
                  version:
                    "SECTION_SEMANTIC_VERIFICATION_V1",

                  status:
                    "PASS",

                  sectionIndex:
                    0,

                  sectionNumber:
                    1,

                  unitCount:
                    1,

                  units: [
                    {
                      unitId:
                        "section-0-unit-0",

                      ordinal:
                        0,

                      text:
                        "Credit monitoring detects changes.",

                      classification:
                        "SUPPORTED",

                      matchedClaimId:
                        "claim-1",

                      evidenceIds: [
                        "ev-1",
                      ],

                      rationale:
                        "Required claim remains supported.",
                    },
                  ],

                  counts: {
                    notAFact:
                      0,

                    supported:
                      1,

                    narrower:
                      0,

                    unsupported:
                      0,

                    contradicted:
                      0,
                  },

                  provenance: {
                    sourceContractVersion:
                      "SECTION_GENERATION_CONTRACT_V1",

                    generatedSectionVersion:
                      "GENERATED_SECTION_V1",

                    modelName:
                      "test-model",
                  },
                } as any;
              },


              async repairSection() {
                repairCalls +=
                  1;

                throw new Error(
                  "SEMANTIC_REPAIR_MUST_NOT_CALL_MODEL"
                );
              },
            },
          });


        expect(
          semanticCalls
        ).toBe(
          2
        );


        expect(
          repairCalls
        ).toBe(
          0
        );


        expect(
          result.section
            .bodyMarkdown
        ).toBe(
          "Credit monitoring detects changes."
        );


        expect(
          result.repair
            .trigger
        ).toBe(
          "SEMANTIC"
        );


        expect(
          result.repair
            .attempted
        ).toBe(
          true
        );


        expect(
          result.repair
            .attemptCount
        ).toBe(
          1
        );


        expect(
          result.repair
            .modelName
        ).toBeNull();


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
      "escalates once to model self-heal when deterministic semantic repair still fails re-verification",
      async () => {
        let semanticCalls =
          0;

        let repairCalls =
          0;


        const bad =
          generated({
            body:
              "Credit monitoring detects changes. Unsupported invented detail.",

            claims: [
              "claim-1",
            ],

            evidence: [
              "ev-1",
            ],
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
                semanticCalls +=
                  1;


                if (
                  semanticCalls ===
                  1
                ) {
                  return {
                    version:
                      "SECTION_SEMANTIC_VERIFICATION_V1",

                    status:
                      "BLOCK",

                    sectionIndex:
                      0,

                    sectionNumber:
                      1,

                    unitCount:
                      2,

                    units: [
                      {
                        unitId:
                          "section-0-unit-0",

                        ordinal:
                          0,

                        text:
                          "Credit monitoring detects changes.",

                        classification:
                          "SUPPORTED",

                        matchedClaimId:
                          "claim-1",

                        evidenceIds: [
                          "ev-1",
                        ],

                        rationale:
                          "Required claim initially survives.",
                      },

                      {
                        unitId:
                          "section-0-unit-1",

                        ordinal:
                          1,

                        text:
                          "Unsupported invented detail.",

                        classification:
                          "UNSUPPORTED",

                        matchedClaimId:
                          null,

                        evidenceIds:
                          [],

                        rationale:
                          "Unsupported detail must be deleted.",
                      },
                    ],

                    counts: {
                      notAFact:
                        0,

                      supported:
                        1,

                      narrower:
                        0,

                      unsupported:
                        1,

                      contradicted:
                        0,
                    },

                    provenance: {
                      sourceContractVersion:
                        "SECTION_GENERATION_CONTRACT_V1",

                      generatedSectionVersion:
                        "GENERATED_SECTION_V1",

                      modelName:
                        "test-model",
                    },
                  } as any;
                }


                expect(
                  candidate.bodyMarkdown
                ).toBe(
                  "Credit monitoring detects changes."
                );


                /*
                 * Simulate an independent verifier disagreeing
                 * after deterministic deletion.
                 *
                 * The pipeline must still fail closed.
                 */
                return {
                  version:
                    "SECTION_SEMANTIC_VERIFICATION_V1",

                  status:
                    "BLOCK",

                  sectionIndex:
                    0,

                  sectionNumber:
                    1,

                  unitCount:
                    1,

                  units: [
                    {
                      unitId:
                        "section-0-unit-0",

                      ordinal:
                        0,

                      text:
                        "Credit monitoring detects changes.",

                      classification:
                        "UNSUPPORTED",

                      matchedClaimId:
                        null,

                      evidenceIds:
                        [],

                      rationale:
                        "Final independent verifier still blocks the surviving prose.",
                    },
                  ],

                  counts: {
                    notAFact:
                      0,

                    supported:
                      0,

                    narrower:
                      0,

                    unsupported:
                      1,

                    contradicted:
                      0,
                  },

                  provenance: {
                    sourceContractVersion:
                      "SECTION_GENERATION_CONTRACT_V1",

                    generatedSectionVersion:
                      "GENERATED_SECTION_V1",

                    modelName:
                      "test-model",
                  },
                } as any;
              },


              async repairSection() {
                repairCalls +=
                  1;

                throw new Error(
                  "SEMANTIC_REPAIR_MUST_NOT_CALL_MODEL"
                );
              },
            },
          })
        ).rejects.toThrow(
          "SECTION_SELF_HEAL_MODEL_REWRITE_FAILED:SEMANTIC"
        );


        expect(
          semanticCalls
        ).toBe(
          2
        );


        expect(
          repairCalls
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
