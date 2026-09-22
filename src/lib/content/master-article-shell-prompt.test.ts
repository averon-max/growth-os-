import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  buildMasterArticleShellPrompt,
} from "./master-article-shell-prompt";


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

      userJob:
        "Understand credit monitoring",
    },

    searchBlueprint: {
      missionId:
        "mission-1",

      action:
        "CREATE",
    },

    h1Mission:
      "Explain credit monitoring clearly and directly.",

    styleRules: [
      "DIRECT_ANSWER_FIRST",
    ],

    sectionContracts: [
      {
        blueprint: {
          heading:
            "What Credit Monitoring Does",
        },
      },

      {
        blueprint: {
          heading:
            "What Credit Monitoring Doesn't Do",
        },
      },
    ],
  } as unknown as
    ArticleGenerationContractV1;
}


describe(
  "Master Article Shell Prompt V1",
  () => {
    it(
      "includes the authoritative mission, blueprint, H1 mission and section structure",
      () => {
        const prompt =
          buildMasterArticleShellPrompt(
            contract()
          );

        expect(
          prompt
        ).toContain(
          "Understand credit monitoring"
        );

        expect(
          prompt
        ).toContain(
          "Explain credit monitoring clearly and directly."
        );

        expect(
          prompt
        ).toContain(
          "What Credit Monitoring Does"
        );

        expect(
          prompt
        ).toContain(
          "DIRECT_ANSWER_FIRST"
        );
      }
    );


    it(
      "asks only for title meta and canonical H1",
      () => {
        const prompt =
          buildMasterArticleShellPrompt(
            contract()
          );

        expect(
          prompt
        ).toContain(
          "Generate ONLY the article shell"
        );

        expect(
          prompt
        ).toContain(
          '"title"'
        );

        expect(
          prompt
        ).toContain(
          '"metaDescription"'
        );

        expect(
          prompt
        ).toContain(
          '"h1"'
        );

        expect(
          prompt
        ).toContain(
          "Do not write article body content."
        );
      }
    );


    it(
      "explicitly prohibits fabricated persuasive claims",
      () => {
        const prompt =
          buildMasterArticleShellPrompt(
            contract()
          );

        expect(
          prompt
        ).toContain(
          "Do not invent a new topic"
        );

        expect(
          prompt
        ).toContain(
          "Do not make claims that require evidence"
        );
      }
    );


    it(
      "does not resurrect the legacy complete-article instruction",
      () => {
        const prompt =
          buildMasterArticleShellPrompt(
            contract()
          );

        expect(
          prompt.toLowerCase()
        ).not.toContain(
          "write a complete article"
        );
      }
    );
  }
);
