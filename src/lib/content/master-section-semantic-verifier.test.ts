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
  assertSectionSemanticVerificationPassed,
  extractSectionSemanticProseUnitsV1,
  finalizeSectionSemanticVerificationV1,
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";


function contract():
SectionGenerationContractV1 {
  return {
    version:
      "SECTION_GENERATION_CONTRACT_V1",

    sectionIndex:
      2,

    sectionNumber:
      3,

    totalSections:
      4,

    blueprint: {
      heading:
        "What Credit Monitoring Does",

      mission:
        "Explain monitoring without overstating prevention.",

      queryNodeIds:
        [],

      requiredClaims: [
        "claim-detects",
      ],

      forbiddenClaims: [
        "claim-prevents",
      ],

      evidenceIds: [
        "ev-detects",
        "ev-prevents",
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
            "claim-detects",

          text:
            "Credit monitoring can detect changes in a credit report.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          jurisdiction:
            "US",

          evidenceIds: [
            "ev-detects",
          ],

          status:
            "VERIFIED",
        },

        {
          id:
            "claim-prevents",

          text:
            "Credit monitoring prevents identity theft.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          jurisdiction:
            "US",

          evidenceIds: [
            "ev-prevents",
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

      claimEvidence: [
        {
          id:
            "ev-detects",

          claimId:
            "claim-detects",

          sourceId:
            "source-1",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Monitoring can identify certain changes appearing in a credit report.",
        },

        {
          id:
            "ev-prevents",

          claimId:
            "claim-prevents",

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


function section(
  bodyMarkdown =
    "Credit monitoring can detect changes in a credit report. It does not guarantee prevention."
):
GeneratedSectionV1 {
  return {
    version:
      "GENERATED_SECTION_V1",

    heading:
      "What Credit Monitoring Does",

    bodyMarkdown,

    coveredQueryNodeIds:
      [],

    referencedClaimIds: [
      "claim-detects",
    ],

    referencedEvidenceIds: [
      "ev-detects",
    ],

    usedInternalLinks:
      [],

    assetUsed:
      null,

    provenance: {
      sourceContractVersion:
        "SECTION_GENERATION_CONTRACT_V1",

      sectionIndex:
        2,

      sectionNumber:
        3,

      totalSections:
        4,

      blueprintHeading:
        "What Credit Monitoring Does",

      modelName:
        "writer-model",
    },
  };
}


describe(
  "Master Section Semantic Verifier",
  () => {
    it(
      "deterministically enumerates every prose unit",
      () => {
        const units =
          extractSectionSemanticProseUnitsV1({
            sectionIndex:
              2,

            bodyMarkdown:
              "First factual sentence. Second factual sentence!\n\n- Third item.",
          });

        expect(
          units.map(
            (unit) => [
              unit.id,
              unit.text,
            ]
          )
        ).toEqual([
          [
            "section-2-unit-0",
            "First factual sentence.",
          ],

          [
            "section-2-unit-1",
            "Second factual sentence!",
          ],

          [
            "section-2-unit-2",
            "Third item.",
          ],
        ]);
      }
    );


    it(
      "ignores fenced code while preserving prose outside the fence",
      () => {
        const units =
          extractSectionSemanticProseUnitsV1({
            sectionIndex:
              2,

            bodyMarkdown:
              [
                "Visible sentence.",
                "```ts",
                "const price = 99;",
                "```",
                "Another visible sentence.",
              ].join(
                "\n"
              ),
          });

        expect(
          units.map(
            (unit) =>
              unit.text
          )
        ).toEqual([
          "Visible sentence.",
          "Another visible sentence.",
        ]);
      }
    );


    it(
      "passes a fully supported semantic unit and a non-factual unit",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              section(),

            modelName:
              "verifier-model",

            candidate: {
              units: [
                {
                  unitId:
                    "section-2-unit-0",

                  classification:
                    "SUPPORTED",

                  matchedClaimId:
                    "claim-detects",

                  evidenceIds: [
                    "ev-detects",
                  ],

                  rationale:
                    "Matches the approved detection claim.",
                },

                {
                  unitId:
                    "section-2-unit-1",

                  classification:
                    "NOT_A_FACT",

                  matchedClaimId:
                    null,

                  evidenceIds:
                    [],

                  rationale:
                    "This is cautious framing rather than a positive factual guarantee.",
                },
              ],
            },
          });

        expect(
          result.status
        ).toBe(
          "PASS"
        );

        expect(
          result.counts.supported
        ).toBe(
          1
        );

        expect(
          result.counts.notAFact
        ).toBe(
          1
        );
      }
    );


    it(
      "blocks unsupported prose",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              section(
                "Credit monitoring always raises your credit score."
              ),

            modelName:
              "verifier-model",

            candidate: {
              units: [
                {
                  unitId:
                    "section-2-unit-0",

                  classification:
                    "UNSUPPORTED",

                  matchedClaimId:
                    null,

                  evidenceIds:
                    [],

                  rationale:
                    "No approved claim authorizes this statement.",
                },
              ],
            },
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.counts.unsupported
        ).toBe(
          1
        );

        expect(
          () =>
            assertSectionSemanticVerificationPassed(
              result
            )
        ).toThrow(
          "SECTION_SEMANTIC_VERIFICATION_BLOCKED"
        );
      }
    );


    it(
      "blocks contradicted forbidden prose",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              section(
                "Credit monitoring prevents identity theft."
              ),

            modelName:
              "verifier-model",

            candidate: {
              units: [
                {
                  unitId:
                    "section-2-unit-0",

                  classification:
                    "CONTRADICTED",

                  matchedClaimId:
                    "claim-prevents",

                  evidenceIds: [
                    "ev-prevents",
                  ],

                  rationale:
                    "The authoritative evidence contradicts the prevention claim.",
                },
              ],
            },
          });

        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.counts.contradicted
        ).toBe(
          1
        );
      }
    );


    it(
      "treats narrower supported wording as WARN",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              section(
                "Credit monitoring may help you notice some changes in a credit report."
              ),

            modelName:
              "verifier-model",

            candidate: {
              units: [
                {
                  unitId:
                    "section-2-unit-0",

                  classification:
                    "NARROWER",

                  matchedClaimId:
                    "claim-detects",

                  evidenceIds: [
                    "ev-detects",
                  ],

                  rationale:
                    "The wording is narrower than the approved detection claim.",
                },
              ],
            },
          });

        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          () =>
            assertSectionSemanticVerificationPassed(
              result
            )
        ).not.toThrow();
      }
    );


    it(
      "requires one verifier result for every deterministic prose unit",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "claim-detects",

                    evidenceIds: [
                      "ev-detects",
                    ],

                    rationale:
                      "Supported.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_UNIT_COUNT_MISMATCH"
        );
      }
    );


    it(
      "rejects duplicate unit IDs",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "claim-detects",

                    evidenceIds: [
                      "ev-detects",
                    ],

                    rationale:
                      "Supported.",
                  },

                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "NOT_A_FACT",

                    matchedClaimId:
                      null,

                    evidenceIds:
                      [],

                    rationale:
                      "Duplicate.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_DUPLICATE_UNIT"
        );
      }
    );


    it(
      "rejects invented claim IDs",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(
                  "Invented factual sentence."
                ),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "invented-claim",

                    evidenceIds:
                      [],

                    rationale:
                      "Attempted invented provenance.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_CLAIM_OUTSIDE_SECTION:invented-claim"
        );
      }
    );


    it(
      "rejects invented evidence IDs",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(
                  "Credit monitoring can detect changes in a credit report."
                ),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "claim-detects",

                    evidenceIds: [
                      "invented-evidence",
                    ],

                    rationale:
                      "Attempted invented evidence.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_EVIDENCE_OUTSIDE_SECTION:invented-evidence"
        );
      }
    );


    it(
      "does not permit forbidden claims to be labeled supported",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(
                  "Credit monitoring prevents identity theft."
                ),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "claim-prevents",

                    evidenceIds: [
                      "ev-prevents",
                    ],

                    rationale:
                      "Invalid support attempt.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_FORBIDDEN_CLAIM_CANNOT_SUPPORT:claim-prevents"
        );
      }
    );


    it(
      "requires publication-grade supporting evidence for SUPPORTED",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                section(
                  "Credit monitoring can detect changes in a credit report."
                ),

              modelName:
                "verifier-model",

              candidate: {
                units: [
                  {
                    unitId:
                      "section-2-unit-0",

                    classification:
                      "SUPPORTED",

                    matchedClaimId:
                      "claim-detects",

                    evidenceIds:
                      [],

                    rationale:
                      "Claim without evidence.",
                  },
                ],
              },
            })
        ).toThrow(
          "SECTION_SEMANTIC_PUBLICATION_EVIDENCE_REQUIRED"
        );
      }
    );


    it(
      "freezes the semantic verification artifact",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              section(
                "Credit monitoring can detect changes in a credit report."
              ),

            modelName:
              "verifier-model",

            candidate: {
              units: [
                {
                  unitId:
                    "section-2-unit-0",

                  classification:
                    "SUPPORTED",

                  matchedClaimId:
                    "claim-detects",

                  evidenceIds: [
                    "ev-detects",
                  ],

                  rationale:
                    "Supported.",
                },
              ],
            },
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
            result.units
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.units[0]
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.counts
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "detects semantic verifier capability",
      () => {
        expect(
          supportsMasterSectionSemanticVerifier({
            modelName:
              "model",

            async verifySectionClaims() {
              throw new Error(
                "not called"
              );
            },
          })
        ).toBe(
          true
        );

        expect(
          supportsMasterSectionSemanticVerifier({
            modelName:
              "model",
          })
        ).toBe(
          false
        );
      }
    );
  }
);
