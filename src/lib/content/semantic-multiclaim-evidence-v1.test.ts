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
  extractSectionSemanticProseUnitsV1,
  finalizeSectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";


function contract():
Readonly<SectionGenerationContractV1> {
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
        "Free, Paid, and Multi-Bureau Monitoring",

      mission:
        "Compare cost and bureau coverage.",

      requiredClaims: [
        "claim-cost",
        "claim-bureau",
      ],

      forbiddenClaims:
        [],

      evidenceIds: [
        "ev-cost",
        "ev-bureau",
        "ev-unrelated",
      ],

      queryNodeIds:
        [],

      internalLinks:
        [],

      expectedOutcome:
        "Reader understands both dimensions.",
    },

    claimLedger: {
      version:
        "CLAIM_LEDGER_V1",

      claims: [
        {
          id:
            "claim-cost",

          text:
            "Credit monitoring can be free or paid.",

          category:
            "PRICE",

          risk:
            "MEDIUM",

          evidenceIds: [
            "ev-cost",
          ],

          status:
            "VERIFIED",
        },

        {
          id:
            "claim-bureau",

          text:
            "Credit monitoring can differ by bureau coverage.",

          category:
            "COMPARISON",

          risk:
            "MEDIUM",

          evidenceIds: [
            "ev-bureau",
          ],

          status:
            "VERIFIED",
        },

        {
          id:
            "claim-unrelated",

          text:
            "An unrelated verified claim.",

          category:
            "FACT",

          risk:
            "LOW",

          evidenceIds: [
            "ev-unrelated",
          ],

          status:
            "VERIFIED",
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
            "A",

          retrievedAt:
            new Date(
              "2026-10-04T00:00:00.000Z"
            ),
        },
      ],

      claimEvidence: [
        {
          id:
            "ev-cost",

          claimId:
            "claim-cost",

          sourceId:
            "source-1",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Monitoring may be available free or for a fee.",
        },

        {
          id:
            "ev-bureau",

          claimId:
            "claim-bureau",

          sourceId:
            "source-1",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Monitoring products may differ in bureau coverage.",
        },

        {
          id:
            "ev-unrelated",

          claimId:
            "claim-unrelated",

          sourceId:
            "source-1",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Unrelated evidence.",
        },
      ],
    },
  } as unknown as
    SectionGenerationContractV1;
}


function generated():
Readonly<GeneratedSectionV1> {
  return {
    version:
      "GENERATED_SECTION_V1",

    bodyMarkdown:
      "Credit monitoring plans may be free or paid and can differ in which credit bureaus they monitor.",

    coveredQueryNodeIds:
      [],

    referencedClaimIds: [
      "claim-cost",
      "claim-bureau",
    ],

    referencedEvidenceIds: [
      "ev-cost",
      "ev-bureau",
    ],

    usedInternalLinks:
      [],

    assetUsed:
      null,

    provenance: {
      sectionIndex:
        0,

      sectionNumber:
        1,

      totalSections:
        1,

      modelName:
        "test-model",
    },
  } as unknown as
    GeneratedSectionV1;
}


function candidate(
  evidenceIds:
    string[]
) {
  const section =
    generated();

  const units =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        0,

      bodyMarkdown:
        section.bodyMarkdown,
    });

  return {
    units:
      units.map(
        (unit) => ({
          unitId:
            unit.id,

          classification:
            "SUPPORTED",

          matchedClaimId:
            "claim-cost",

          evidenceIds,

          rationale:
            "One prose unit contains two approved required claims.",
        })
      ),
  };
}


describe(
  "multi-claim semantic evidence",
  () => {
    it(
      "accepts evidence for two verified required claims in one prose unit",
      () => {
        const result =
          finalizeSectionSemanticVerificationV1({
            contract:
              contract(),

            section:
              generated(),

            modelName:
              "test-model",

            candidate:
              candidate([
                "ev-cost",
                "ev-bureau",
              ]),
          });

        expect(
          result.status
        ).toBe(
          "PASS"
        );
      }
    );


    it(
      "still rejects evidence for an unrelated claim",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                generated(),

              modelName:
                "test-model",

              candidate:
                candidate([
                  "ev-cost",
                  "ev-unrelated",
                ]),
            })
        ).toThrow(
          /SECTION_SEMANTIC_EVIDENCE_CLAIM_MISMATCH:ev-unrelated/
        );
      }
    );


    it(
      "still requires evidence for the primary matched claim",
      () => {
        expect(
          () =>
            finalizeSectionSemanticVerificationV1({
              contract:
                contract(),

              section:
                generated(),

              modelName:
                "test-model",

              candidate:
                candidate([
                  "ev-bureau",
                ]),
            })
        ).toThrow(
          /SECTION_SEMANTIC_PUBLICATION_EVIDENCE_REQUIRED/
        );
      }
    );
  }
);
