import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  finalizeGeneratedArticleShellV1,
  supportsMasterArticleShellGenerator,
} from "./master-article-shell-generator";


function contract():
ArticleGenerationContractV1 {
  return {
    version:
      "ARTICLE_GENERATION_CONTRACT_V1",

    sourceRuntimeVersion:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    mission: {
      id:
        "mission-1",
    },

    searchBlueprint: {
      missionId:
        "mission-1",
    },

    h1Mission:
      "Explain credit monitoring clearly and directly.",

    sectionContracts:
      [],

    styleRules:
      [],
  } as unknown as
    ArticleGenerationContractV1;
}


describe(
  "Master Article Shell Generator V1",
  () => {
    it(
      "finalizes a strict shell and preserves authoritative H1 mission provenance",
      () => {
        const input =
          contract();

        const result =
          finalizeGeneratedArticleShellV1({
            contract:
              input,

            modelName:
              "test-model",

            candidate: {
              title:
                "Credit Monitoring Explained",

              metaDescription:
                "Learn what credit monitoring does, what it can alert you to, and where its limitations begin.",

              h1:
                "What Is Credit Monitoring?",
            },
          });

        expect(
          result.version
        ).toBe(
          "ARTICLE_SHELL_V1"
        );

        expect(
          result.h1
        ).toBe(
          "What Is Credit Monitoring?"
        );

        expect(
          result.provenance
            .h1Mission
        ).toBe(
          input.h1Mission
        );

        expect(
          result.provenance
            .modelName
        ).toBe(
          "test-model"
        );
      }
    );


    it(
      "rejects unexpected model fields such as article body injection",
      () => {
        expect(
          () =>
            finalizeGeneratedArticleShellV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",

                bodyMarkdown:
                  "Injected body",
              },
            })
        ).toThrow(
          "ARTICLE_SHELL_GENERATION_UNEXPECTED_FIELD:bodyMarkdown"
        );
      }
    );


    it(
      "rejects markdown heading syntax in H1",
      () => {
        expect(
          () =>
            finalizeGeneratedArticleShellV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "# What Is Credit Monitoring?",
              },
            })
        ).toThrow(
          "ARTICLE_SHELL_GENERATION_H1_CONTAINS_HEADING_MARKUP"
        );
      }
    );


    it(
      "rejects multiline shell fields",
      () => {
        expect(
          () =>
            finalizeGeneratedArticleShellV1({
              contract:
                contract(),

              modelName:
                "test-model",

              candidate: {
                title:
                  "Line one\nLine two",

                metaDescription:
                  "Description",

                h1:
                  "H1",
              },
            })
        ).toThrow(
          "ARTICLE_SHELL_GENERATION_TITLE_MULTILINE"
        );
      }
    );


    it(
      "does not accept empty model identity",
      () => {
        expect(
          () =>
            finalizeGeneratedArticleShellV1({
              contract:
                contract(),

              modelName:
                " ",

              candidate: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",
              },
            })
        ).toThrow(
          "ARTICLE_SHELL_GENERATION_MODEL_REQUIRED"
        );
      }
    );


    it(
      "detects shell-generator capability",
      () => {
        expect(
          supportsMasterArticleShellGenerator({
            modelName:
              "test-model",

            async generateArticleShell() {
              return {};
            },
          })
        ).toBe(
          true
        );

        expect(
          supportsMasterArticleShellGenerator({
            modelName:
              "section-only",
          })
        ).toBe(
          false
        );
      }
    );
  }
);
