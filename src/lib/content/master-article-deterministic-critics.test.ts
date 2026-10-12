import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  DETERMINISTIC_MASTER_CRITIC_IDS,
  runDeterministicCoverageCriticV1,
  runDeterministicEvidenceYmylCriticV1,
  runDeterministicInternalLinksCriticV1,
  runDeterministicIntentCriticV1,
  runDeterministicMasterArticleCriticsV1,
  runDeterministicTechnicalSeoCriticV1,
} from "./master-article-deterministic-critics";


function contract():
ArticleGenerationContractV1 {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    h1Mission:
      "Explain credit monitoring accurately.",

    sectionContracts: [
      {
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
            "Explain detection.",

          queryNodeIds: [
            "query-1",
            "query-2",
          ],

          requiredClaims: [
            "claim-1",
          ],

          forbiddenClaims:
            [],

          evidenceIds: [
            "ev-1",
          ],

          internalLinks: [
            "/identity-theft",
          ],

          expectedOutcome:
            "Reader understands monitoring.",
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
                "Monitoring can detect certain changes.",
            },
          ],
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


function run():
MasterWriterRunV1 {
  return {
    version:
      "MASTER_WRITER_RUN_V1",

    shell: {
      title:
        "Credit Monitoring Explained",

      metaDescription:
        "Learn what credit monitoring does.",

      h1:
        "What Is Credit Monitoring?",
    },

    sections: [
      {
        version:
          "GENERATED_SECTION_V1",

        heading:
          "What Credit Monitoring Does",

        bodyMarkdown:
          "Credit monitoring can detect changes in a credit report.",

        coveredQueryNodeIds: [
          "query-1",
          "query-2",
        ],

        referencedClaimIds: [
          "claim-1",
        ],

        referencedEvidenceIds: [
          "ev-1",
        ],

        usedInternalLinks: [
          "/identity-theft",
        ],

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
      },
    ],

    reconciliations: [
      {
        status:
          "PASS",

        findings:
          [],

        verifiedSupport: [
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
        ],
      },
    ],

    semanticVerifications: [
      {
        status:
          "PASS",

        units:
          [],
      },
    ],

    repairs: [
      {
        attempted:
          false,

        attemptCount:
          0,
      },
    ],

    article: {
      title:
        "Credit Monitoring Explained",

      metaDescription:
        "Learn what credit monitoring does.",

      h1:
        "What Is Credit Monitoring?",

      bodyMarkdown:
        [
          "## What Credit Monitoring Does",
          "",
          "Credit monitoring can detect changes in a credit report.",
        ].join(
          "\n"
        ),
    },

    provenance: {},
  } as unknown as
    MasterWriterRunV1;
}


describe(
  "Deterministic Master Article Critics V1",
  () => {
    it(
      "uses the exact deterministic critic roster",
      () => {
        expect(
          DETERMINISTIC_MASTER_CRITIC_IDS
        ).toEqual([
          "INTENT",
          "COVERAGE",
          "EVIDENCE_YMYL",
          "INTERNAL_LINKS",
          "TECHNICAL_SEO",
        ]);
      }
    );


    it(
      "passes all five deterministic critics for a clean master-writer run",
      () => {
        const results =
          runDeterministicMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),
          });

        expect(
          results.map(
            (item) =>
              [
                item.criticId,
                item.status,
              ]
          )
        ).toEqual([
          [
            "INTENT",
            "PASS",
          ],

          [
            "COVERAGE",
            "PASS",
          ],

          [
            "EVIDENCE_YMYL",
            "PASS",
          ],

          [
            "INTERNAL_LINKS",
            "PASS",
          ],

          [
            "TECHNICAL_SEO",
            "PASS",
          ],
        ]);

        expect(
          results.every(
            (item) =>
              item.modelName ===
              null
          )
        ).toBe(
          true
        );
      }
    );


    it("warns on missing secondary exact phrases without suppressing required primary phrase", () => {
      const withSecondary = runDeterministicCoverageCriticV1({
        contract: contract(),
        run: run(),
        rankReadyKeywords: ["credit monitoring", "free credit monitoring"],
      });
      expect(withSecondary.findings.some(f => f.code === "RANK_READY_PLANNED_KEYWORD_MISSING" && f.severity === "WARN")).toBe(true);
      const withoutPrimary = runDeterministicCoverageCriticV1({
        contract: contract(),
        run: run(),
        rankReadyKeywords: ["missing primary phrase", "free credit monitoring"],
      });
      expect(withoutPrimary.findings.some(f => f.code === "RANK_READY_PLANNED_KEYWORD_MISSING" && f.severity === "BLOCK")).toBe(true);
    });

    it(
      "blocks total loss of assigned query coverage",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).coveredQueryNodeIds =
          [];


        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "SECTION_EXPECTED_COVERAGE_MISSING"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "warns on partial assigned query coverage",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).coveredQueryNodeIds = [
          "query-1",
        ];


        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.findings[0]
            ?.evidence
            .queryNodeIds
        ).toEqual([
          "query-2",
        ]);
      }
    );


    it(
      "blocks query coverage outside the section contract",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).coveredQueryNodeIds = [
          "query-1",
          "query-2",
          "invented-query",
        ];


        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "OUT_OF_CONTRACT_QUERY_COVERAGE"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks a verified required claim that lost accepted support provenance",
      () => {
        const candidate =
          run();

        (
          candidate.reconciliations[
            0
          ] as any
        ).verifiedSupport =
          [];


        const result =
          runDeterministicEvidenceYmylCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "VERIFIED_CLAIM_WITHOUT_RECONCILED_SUPPORT"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "preserves semantic NARROWER as an evidence/YMYL warning",
      () => {
        const candidate =
          run();

        (
          candidate.semanticVerifications[
            0
          ] as any
        ).status =
          "WARN";

        (
          candidate.semanticVerifications[
            0
          ] as any
        ).units = [
          {
            classification:
              "NARROWER",

            matchedClaimId:
              "claim-1",

            evidenceIds: [
              "ev-1",
            ],
          },
        ];


        const result =
          runDeterministicEvidenceYmylCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "WARN"
        );

        expect(
          result.findings[0]
            ?.evidence
            .claimIds
        ).toEqual([
          "claim-1",
        ]);

        expect(
          result.findings[0]
            ?.evidence
            .sourceIds
        ).toEqual([
          "source-1",
        ]);
      }
    );


    it(
      "blocks unapproved internal links",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).usedInternalLinks = [
          "/identity-theft",
          "/invented-page",
        ];


        const result =
          runDeterministicInternalLinksCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "UNAPPROVED_INTERNAL_LINK"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "warns when an approved internal-link opportunity is unused",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).usedInternalLinks =
          [];


        const result =
          runDeterministicInternalLinksCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "WARN"
        );
      }
    );


    it(
      "blocks body-level H1",
      () => {
        const candidate =
          run();

        (
          candidate.article as any
        ).bodyMarkdown =
          [
            "# Illegal Body H1",
            "",
            "## What Credit Monitoring Does",
            "",
            "Body.",
          ].join(
            "\n"
          );


        const result =
          runDeterministicTechnicalSeoCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "BODY_H1_PRESENT"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks canonical H2 sequence drift",
      () => {
        const candidate =
          run();

        (
          candidate.article as any
        ).bodyMarkdown =
          [
            "## Wrong Heading",
            "",
            "Body.",
          ].join(
            "\n"
          );


        const result =
          runDeterministicTechnicalSeoCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "CANONICAL_H2_SEQUENCE_MISMATCH"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks deterministic intent drift in canonical section heading",
      () => {
        const candidate =
          run();

        (
          candidate.sections[
            0
          ] as any
        ).heading =
          "Different Heading";


        const result =
          runDeterministicIntentCriticV1({
            contract:
              contract(),

            run:
              candidate,
          });


        expect(
          result.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result.findings.some(
            (finding) =>
              finding.code ===
              "CANONICAL_SECTION_HEADING_DRIFT"
          )
        ).toBe(
          true
        );
      }
    );
  }
);
