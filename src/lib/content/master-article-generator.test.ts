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
  supportsMasterArticleGenerator,
} from "./master-article-generator";


function contract({
  requiredClaims = [
    "claim-1",
  ],
  forbiddenClaims = [
    "claim-forbidden",
  ],
}: {
  requiredClaims?:
    string[];

  forbiddenClaims?:
    string[];
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
      2,

    blueprint: {
      heading:
        "What Credit Monitoring Does",

      mission:
        "Explain the detection function.",

      queryNodeIds: [
        "q1",
        "q2",
      ],

      requiredClaims,

      forbiddenClaims,

      evidenceIds: [
        "ev-1",
        "ev-2",
      ],

      asset:
        "asset-1",

      internalLinks: [
        "/identity-theft-protection",
      ],

      expectedOutcome:
        "Reader understands the core function.",
    },

    mission: {},
    queryGraph: {},
    serpResearch: null,
    expectedCoverage: {},
    gaps: {},
    originalValue: {},
    evidenceGraph: {},
    claimLedger: {},
    searchBlueprint: {},
    internalLinkPlan: [],
    styleRules: [],

    hardRules: {
      canonicalH1OwnedByArticle:
        true,

      bodyMayContainH1:
        false,

      mayInventMetrics:
        false,

      mayInventEvidence:
        false,

      mayInventClaims:
        false,

      mayInventHeadingTargets:
        false,

      preserveSectionOrder:
        true,
    },
  } as unknown as
    SectionGenerationContractV1;
}


describe(
  "Master Article Generator V1",
  () => {
    it(
      "finalizes one generated section from its authoritative section contract",
      () => {
        const result =
          finalizeGeneratedSectionV1({
            contract:
              contract(),

            modelName:
              "test-model",

            candidate: {
              bodyMarkdown:
                "Credit monitoring watches for relevant changes and alerts the user.\n\n### What an alert means\n\nAn alert can prompt further review.",

              coveredQueryNodeIds: [
                "q1",
              ],

              referencedClaimIds: [
                "claim-1",
              ],

              referencedEvidenceIds: [
                "ev-1",
              ],

              usedInternalLinks: [
                "/identity-theft-protection",
              ],

              assetUsed:
                "asset-1",
            },
          });

        expect(
          result.version
        ).toBe(
          "GENERATED_SECTION_V1"
        );

        expect(
          result.heading
        ).toBe(
          "What Credit Monitoring Does"
        );

        expect(
          result.provenance
            .sectionIndex
        ).toBe(
          0
        );

        expect(
          result.provenance
            .modelName
        ).toBe(
          "test-model"
        );

        expect(
          result.referencedClaimIds
        ).toEqual([
          "claim-1",
        ]);
      }
    );


    it(
      "never accepts an H1 inside a generated section body",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "# Illegal page H1\n\nBody.",

                referencedClaimIds: [
                  "claim-1",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_BODY_CONTAINS_H1"
        );
      }
    );


    it(
      "keeps the canonical H2 under deterministic composer ownership",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "## Model-created H2\n\nBody.",

                referencedClaimIds: [
                  "claim-1",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_BODY_CONTAINS_H2"
        );
      }
    );


    it(
      "blocks query drift outside the section blueprint",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                ],

                coveredQueryNodeIds: [
                  "q-outside",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_QUERY_OUTSIDE_BLUEPRINT:q-outside"
        );
      }
    );


    it(
      "blocks evidence that was not assigned to the section",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                ],

                referencedEvidenceIds: [
                  "ev-outside",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_EVIDENCE_OUTSIDE_BLUEPRINT:ev-outside"
        );
      }
    );


    it(
      "requires every blueprint-required claim to be declared",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract({
                  requiredClaims: [
                    "claim-1",
                    "claim-2",
                  ],
                }),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_REQUIRED_CLAIM_MISSING:claim-2"
        );
      }
    );


    it(
      "blocks claims outside the approved required-claim set",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                  "claim-outside",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_CLAIM_OUTSIDE_BLUEPRINT:claim-outside"
        );
      }
    );


    it(
      "blocks unapproved internal links and original-value assets",
      () => {
        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                ],

                usedInternalLinks: [
                  "/invented-page",
                ],
              },
            })
        ).toThrow(
          "SECTION_GENERATION_INTERNAL_LINK_OUTSIDE_BLUEPRINT:/invented-page"
        );

        expect(
          () =>
            finalizeGeneratedSectionV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                bodyMarkdown:
                  "Valid body.",

                referencedClaimIds: [
                  "claim-1",
                ],

                assetUsed:
                  "invented-asset",
              },
            })
        ).toThrow(
          "SECTION_GENERATION_ASSET_OUTSIDE_BLUEPRINT:invented-asset"
        );
      }
    );


    it(
      "freezes generated output and system-owned provenance",
      () => {
        const result =
          finalizeGeneratedSectionV1({
            contract:
              contract(),

            modelName:
              "test-model",

            candidate: {
              bodyMarkdown:
                "Valid body.",

              referencedClaimIds: [
                "claim-1",
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
            result.provenance
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.referencedClaimIds
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "detects the new master section writer capability without changing the legacy generator",
      () => {
        expect(
          supportsMasterArticleGenerator({
            modelName:
              "test-model",

            async generateSection() {
              return {};
            },
          })
        ).toBe(
          true
        );

        expect(
          supportsMasterArticleGenerator({
            modelName:
              "legacy-only",
          })
        ).toBe(
          false
        );
      }
    );
  }
);
