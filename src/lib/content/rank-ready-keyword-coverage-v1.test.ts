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
  runDeterministicCoverageCriticV1,
} from "./master-article-deterministic-critics";


function contract():
Readonly<ArticleGenerationContractV1> {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    h1Mission:
      "Explain credit monitoring.",

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
            "How Credit Monitoring Works",

          mission:
            "Explain how credit monitoring works.",

          queryNodeIds:
            [],
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


function run(
  bodyMarkdown:
    string
): Readonly<MasterWriterRunV1> {
  return {
    article: {
      title:
        "Credit Monitoring Guide",

      metaDescription:
        "Guide.",

      h1:
        "Credit Monitoring",

      bodyMarkdown,
    },

    sections: [
      {
        sectionIndex:
          0,

        sectionNumber:
          1,

        bodyMarkdown:
          bodyMarkdown,

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

        provenance: {
          modelName:
            "test",
        },
      },
    ],

    reconciliations:
      [],

    semanticVerifications:
      [],
  } as unknown as
    MasterWriterRunV1;
}


describe(
  "Rank Ready Keyword Coverage V1",
  () => {
    it(
      "blocks heading-only planned keyword coverage",
      () => {
        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              run(
                [
                  "## Free Credit Monitoring",
                  "",
                  "This section explains available monitoring options.",
                ].join(
                  "\n"
                )
              ),

            rankReadyKeywords: [
              "free credit monitoring",
            ],
          });


        const finding =
          result.findings.find(
            (item) =>
              item.code ===
              "RANK_READY_PLANNED_KEYWORD_MISSING"
          );


        expect(
          finding
        ).toBeDefined();

        expect(
          finding?.severity
        ).toBe(
          "BLOCK"
        );

        expect(
          finding?.repairScope
        ).toBe(
          "SECTION"
        );
      }
    );


    it(
      "accepts one natural body-prose execution",
      () => {
        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              run(
                [
                  "## Monitoring Options",
                  "",
                  "Free credit monitoring can help you watch for important changes in your credit file.",
                ].join(
                  "\n"
                )
              ),

            rankReadyKeywords: [
              "free credit monitoring",
            ],
          });


        expect(
          result.findings.filter(
            (item) =>
              item.code ===
              "RANK_READY_PLANNED_KEYWORD_MISSING"
          )
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "does not require repetition or density",
      () => {
        const result =
          runDeterministicCoverageCriticV1({
            contract:
              contract(),

            run:
              run(
                "Credit monitoring helps users watch for relevant changes."
              ),

            rankReadyKeywords: [
              "credit monitoring",
              "credit monitoring",
            ],
          });


        expect(
          result.findings.filter(
            (item) =>
              item.code ===
              "RANK_READY_PLANNED_KEYWORD_MISSING"
          )
        ).toHaveLength(
          0
        );
      }
    );
  }
);
