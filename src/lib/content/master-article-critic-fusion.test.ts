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
  finalizeMasterArticleSemanticCriticRunV1,
  type MasterArticleSemanticCriticCandidateV1,
  type MasterArticleSemanticCriticContextV1,
  type MasterArticleSemanticCriticGenerator,
} from "./master-article-semantic-critics";

import {
  assertMasterArticleCriticExecutionPassed,
  executeMasterArticleCriticsV1,
} from "./master-article-critic-fusion";


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
        heading:
          "What Credit Monitoring Does",

        bodyMarkdown:
          "Credit monitoring can detect changes in a credit report.",

        coveredQueryNodeIds: [
          "query-1",
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
  } as unknown as
    MasterWriterRunV1;
}


function context({
  originality = true,
  cannibalization = true,
}: {
  originality?:
    boolean;

  cannibalization?:
    boolean;
} = {}):
MasterArticleSemanticCriticContextV1 {
  return {
    originalityReferences:
      originality
        ? [
            {
              id:
                "ref-1",

              label:
                "Reference",

              text:
                "Comparison content.",
            },
          ]
        : [],

    cannibalizationCandidates:
      cannibalization
        ? [
            {
              id:
                "page-1",

              url:
                "/existing",

              title:
                "Existing",

              h1:
                "Existing",

              queryNodeIds: [
                "query-1",
              ],
        matchedQueries: [
          "query text",
        ],

        intentMatch:
          true,

        queryOverlap:
          1,

        matchedImpressions:
          1,

        missionAffinity:
          1,


              summary:
                "Existing page.",
            },
          ]
        : [],
  };
}


function cleanCandidate():
MasterArticleSemanticCriticCandidateV1 {
  return {
    reviews: [
      {
        reviewId:
          "DEEP_INTENT",

        findings:
          [],
      },

      {
        reviewId:
          "ORIGINALITY",

        findings:
          [],
      },

      {
        reviewId:
          "EDITORIAL",

        findings:
          [],
      },

      {
        reviewId:
          "SEMANTIC_DRIFT",

        findings:
          [],
      },

      {
        reviewId:
          "CANNIBALIZATION",

        findings:
          [],
      },
    ],
  };
}


function generator(
  candidate:
    MasterArticleSemanticCriticCandidateV1 =
      cleanCandidate()
):
MasterArticleSemanticCriticGenerator {
  return {
    modelName:
      "critic-model",

    async reviewMasterArticleSemantics(
      input
    ) {
      return finalizeMasterArticleSemanticCriticRunV1({
        contract:
          input.contract,

        context:
          input.context,

        modelName:
          "critic-model",

        candidate,
      });
    },
  };
}


describe(
  "Master Article Critic Fusion V1",
  () => {
    it(
      "fuses five deterministic critics and five semantic reviews into exactly nine final critics",
      async () => {
        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context(),
          });


        expect(
          execution.suite
            .results
            .map(
              (item) =>
                item.criticId
            )
        ).toEqual([
          "INTENT",
          "COVERAGE",
          "EVIDENCE_YMYL",
          "ORIGINALITY",
          "EDITORIAL",
          "SEMANTIC_DRIFT",
          "CANNIBALIZATION",
          "INTERNAL_LINKS",
          "TECHNICAL_SEO",
        ]);

        expect(
          execution.suite
            .status
        ).toBe(
          "PASS"
        );

        expect(
          execution.provenance
            .deterministicCriticCount
        ).toBe(
          5
        );

        expect(
          execution.provenance
            .semanticReviewCount
        ).toBe(
          5
        );

        expect(
          execution.provenance
            .finalCriticCount
        ).toBe(
          9
        );
      }
    );


    it(
      "merges DEEP_INTENT findings into the final INTENT critic without creating a tenth critic",
      async () => {
        const candidate =
          cleanCandidate();

        candidate.reviews[
          0
        ]!.findings.push({
          code:
            "SECTION_INTENT_MISS",

          severity:
            "BLOCK",

          location: {
            scope:
              "SECTION",

            sectionIndex:
              0,

            sectionNumber:
              1,

            heading:
              "What Credit Monitoring Does",
          },

          message:
            "Section misses its mission.",

          recommendation:
            "Repair this section.",

          repairScope:
            "SECTION",

          claimIds:
            [],

          evidenceIds:
            [],

          queryNodeIds: [
            "query-1",
          ],

          sourceIds:
            [],
        });


        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(
                candidate
              ),

            context:
              context(),
          });


        expect(
          execution.suite
            .results
        ).toHaveLength(
          9
        );

        const intent =
          execution.suite
            .results
            .find(
              (item) =>
                item.criticId ===
                "INTENT"
            );

        expect(
          intent?.status
        ).toBe(
          "BLOCK"
        );

        expect(
          intent?.findings
            .some(
              (finding) =>
                finding.code ===
                "SECTION_INTENT_MISS"
            )
        ).toBe(
          true
        );
      }
    );


    it(
      "fails closed for ORIGINALITY when real comparison references are absent",
      async () => {
        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context({
                originality:
                  false,
              }),
          });


        const originality =
          execution.suite
            .results
            .find(
              (item) =>
                item.criticId ===
                "ORIGINALITY"
            );


        expect(
          originality?.status
        ).toBe(
          "BLOCK"
        );

        expect(
          originality?.findings[
            0
          ]?.code
        ).toBe(
          "ORIGINALITY_INSUFFICIENT_CONTEXT"
        );

        expect(
          execution.suite
            .status
        ).toBe(
          "BLOCK"
        );
      }
    );


    it(
      "fails closed for CANNIBALIZATION when real site candidates are absent",
      async () => {
        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context({
                cannibalization:
                  false,
              }),
          });


        const result =
          execution.suite
            .results
            .find(
              (item) =>
                item.criticId ===
                "CANNIBALIZATION"
            );


        expect(
          result?.status
        ).toBe(
          "BLOCK"
        );

        expect(
          result?.findings[
            0
          ]?.code
        ).toBe(
          "CANNIBALIZATION_INSUFFICIENT_CONTEXT"
        );
      }
    );


    it(
      "preserves semantic section localization and provenance in final critic findings",
      async () => {
        const candidate =
          cleanCandidate();

        candidate.reviews[
          3
        ]!.findings.push({
          code:
            "CLAIM_DRIFT",

          severity:
            "WARN",

          location: {
            scope:
              "SECTION",

            sectionIndex:
              0,

            sectionNumber:
              1,

            heading:
              "What Credit Monitoring Does",
          },

          message:
            "Wording drifts from approved meaning.",

          recommendation:
            "Narrow the wording.",

          repairScope:
            "SECTION",

          claimIds: [
            "claim-1",
          ],

          evidenceIds: [
            "ev-1",
          ],

          queryNodeIds: [
            "query-1",
          ],

          sourceIds: [
            "source-1",
          ],
        });


        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(
                candidate
              ),

            context:
              context(),
          });


        const drift =
          execution.suite
            .results
            .find(
              (item) =>
                item.criticId ===
                "SEMANTIC_DRIFT"
            );


        expect(
          drift?.status
        ).toBe(
          "WARN"
        );

        expect(
          drift?.findings[
            0
          ]?.location
        ).toEqual({
          scope:
            "SECTION",

          sectionIndex:
            0,

          sectionNumber:
            1,

          heading:
            "What Credit Monitoring Does",
        });

        expect(
          drift?.findings[
            0
          ]?.evidence
            .claimIds
        ).toEqual([
          "claim-1",
        ]);
      }
    );


    it(
      "rejects a generator without semantic critic capability",
      async () => {
        await expect(
          executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator: {
              modelName:
                "not-enough",
            },

            context:
              context(),
          })
        ).rejects.toThrow(
          "MASTER_ARTICLE_SEMANTIC_CRITIC_CAPABILITY_REQUIRED"
        );
      }
    );


    it(
      "assertion passes only a non-blocking fused suite",
      async () => {
        const clean =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context(),
          });


        expect(
          () =>
            assertMasterArticleCriticExecutionPassed(
              clean
            )
        ).not.toThrow();


        const blocked =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context({
                originality:
                  false,
              }),
          });


        expect(
          () =>
            assertMasterArticleCriticExecutionPassed(
              blocked
            )
        ).toThrow(
          "MASTER_ARTICLE_CRITIC_SUITE_BLOCKED"
        );
      }
    );


    it(
      "freezes critic execution provenance",
      async () => {
        const execution =
          await executeMasterArticleCriticsV1({
            contract:
              contract(),

            run:
              run(),

            generator:
              generator(),

            context:
              context(),
          });


        expect(
          Object.isFrozen(
            execution
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            execution
              .deterministicResults
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            execution.provenance
          )
        ).toBe(
          true
        );
      }
    );
  }
);
