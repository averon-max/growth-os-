import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  buildArticleShellV1,
  composeMasterArticleV1,
} from "./master-article-composer";


function contract():
ArticleGenerationContractV1 {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    sectionContracts: [
      {
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
        },
      },

      {
        version:
          "SECTION_GENERATION_CONTRACT_V1",

        sectionIndex:
          1,

        sectionNumber:
          2,

        totalSections:
          2,

        blueprint: {
          heading:
            "What Credit Monitoring Doesn't Do",
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


function generatedSection({
  index,
  heading,
  body,
}: {
  index:
    number;

  heading:
    string;

  body:
    string;
}):
GeneratedSectionV1 {
  return Object.freeze({
    version:
      "GENERATED_SECTION_V1",

    heading,

    bodyMarkdown:
      body,

    coveredQueryNodeIds:
      Object.freeze([]),

    referencedClaimIds:
      Object.freeze([]),

    referencedEvidenceIds:
      Object.freeze([]),

    usedInternalLinks:
      Object.freeze([]),

    assetUsed:
      null,

    provenance:
      Object.freeze({
        sourceContractVersion:
          "SECTION_GENERATION_CONTRACT_V1",

        sectionIndex:
          index,

        sectionNumber:
          index + 1,

        totalSections:
          2,

        blueprintHeading:
          heading,

        modelName:
          "test-model",
      }),
  });
}


describe(
  "Master Article Composer V1",
  () => {
    it(
      "builds a strict article shell without putting markdown H1 syntax into the h1 field",
      () => {
        const shell =
          buildArticleShellV1({
            title:
              "Credit Monitoring Explained",

            metaDescription:
              "Learn what credit monitoring does and where its limitations begin.",

            h1:
              "What Is Credit Monitoring?",
          });

        expect(
          shell.version
        ).toBe(
          "ARTICLE_SHELL_V1"
        );

        expect(
          shell.h1
        ).toBe(
          "What Is Credit Monitoring?"
        );

        expect(
          Object.isFrozen(
            shell
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "deterministically composes H2 sections in blueprint order",
      () => {
        const result =
          composeMasterArticleV1({
            contract:
              contract(),

            shell:
              buildArticleShellV1({
                title:
                  "Credit Monitoring Explained",

                metaDescription:
                  "Understand credit monitoring.",

                h1:
                  "What Is Credit Monitoring?",
              }),

            sections: [
              generatedSection({
                index:
                  0,

                heading:
                  "What Credit Monitoring Does",

                body:
                  "It can help surface relevant changes.",
              }),

              generatedSection({
                index:
                  1,

                heading:
                  "What Credit Monitoring Doesn't Do",

                body:
                  "It does not prevent every form of identity theft.",
              }),
            ],
          });

        expect(
          result.bodyMarkdown
        ).toBe(
          [
            "## What Credit Monitoring Does",
            "",
            "It can help surface relevant changes.",
            "",
            "## What Credit Monitoring Doesn't Do",
            "",
            "It does not prevent every form of identity theft.",
          ].join(
            "\n"
          )
        );

        expect(
          result.h1
        ).toBe(
          "What Is Credit Monitoring?"
        );

        expect(
          result.provenance
            .sectionCount
        ).toBe(
          2
        );
      }
    );


    it(
      "blocks incomplete article assembly",
      () => {
        expect(
          () =>
            composeMasterArticleV1({
              contract:
                contract(),

              shell:
                buildArticleShellV1({
                  title:
                    "Title",

                  metaDescription:
                    "Description",

                  h1:
                    "H1",
                }),

              sections: [
                generatedSection({
                  index:
                    0,

                  heading:
                    "What Credit Monitoring Does",

                  body:
                    "Body.",
                }),
              ],
            })
        ).toThrow(
          "ARTICLE_COMPOSER_SECTION_COUNT_MISMATCH"
        );
      }
    );


    it(
      "blocks reordered sections instead of silently sorting them",
      () => {
        expect(
          () =>
            composeMasterArticleV1({
              contract:
                contract(),

              shell:
                buildArticleShellV1({
                  title:
                    "Title",

                  metaDescription:
                    "Description",

                  h1:
                    "H1",
                }),

              sections: [
                generatedSection({
                  index:
                    1,

                  heading:
                    "What Credit Monitoring Doesn't Do",

                  body:
                    "Second.",
                }),

                generatedSection({
                  index:
                    0,

                  heading:
                    "What Credit Monitoring Does",

                  body:
                    "First.",
                }),
              ],
            })
        ).toThrow(
          "ARTICLE_COMPOSER_SECTION_ORDER_MISMATCH:0"
        );
      }
    );


    it(
      "blocks model or transport substitution of the canonical H2",
      () => {
        expect(
          () =>
            composeMasterArticleV1({
              contract:
                contract(),

              shell:
                buildArticleShellV1({
                  title:
                    "Title",

                  metaDescription:
                    "Description",

                  h1:
                    "H1",
                }),

              sections: [
                generatedSection({
                  index:
                    0,

                  heading:
                    "Invented Heading",

                  body:
                    "Body.",
                }),

                generatedSection({
                  index:
                    1,

                  heading:
                    "What Credit Monitoring Doesn't Do",

                  body:
                    "Body.",
                }),
              ],
            })
        ).toThrow(
          "ARTICLE_COMPOSER_HEADING_MISMATCH:0"
        );
      }
    );


    it(
      "keeps H1 and H2 ownership out of generated section bodies",
      () => {
        const shell =
          buildArticleShellV1({
            title:
              "Title",

            metaDescription:
              "Description",

            h1:
              "H1",
          });

        expect(
          () =>
            composeMasterArticleV1({
              contract:
                contract(),

              shell,

              sections: [
                generatedSection({
                  index:
                    0,

                  heading:
                    "What Credit Monitoring Does",

                  body:
                    "## Illegal replacement H2\n\nBody.",
                }),

                generatedSection({
                  index:
                    1,

                  heading:
                    "What Credit Monitoring Doesn't Do",

                  body:
                    "Body.",
                }),
              ],
            })
        ).toThrow(
          "ARTICLE_COMPOSER_SECTION_CONTAINS_H2:0"
        );
      }
    );


    it(
      "preserves system provenance and freezes the composed article",
      () => {
        const result =
          composeMasterArticleV1({
            contract:
              contract(),

            shell:
              buildArticleShellV1({
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",
              }),

            sections: [
              generatedSection({
                index:
                  0,

                heading:
                  "What Credit Monitoring Does",

                body:
                  "Body one.",
              }),

              generatedSection({
                index:
                  1,

                heading:
                  "What Credit Monitoring Doesn't Do",

                body:
                  "Body two.",
              }),
            ],
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
            result.sections
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
          result.provenance
            .modelNames
        ).toEqual([
          "test-model",
        ]);
      }
    );
  }
);
