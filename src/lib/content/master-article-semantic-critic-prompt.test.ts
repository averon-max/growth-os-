import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMasterArticleSemanticCriticPrompt,
} from "./master-article-semantic-critic-prompt";


describe(
  "Master Article Semantic Critic Prompt",
  () => {
    it(
      "forbids scores, invention and unsupported comparison conclusions",
      () => {
        const prompt =
          buildMasterArticleSemanticCriticPrompt({
            contract: {
              h1Mission:
                "Explain accurately.",

              sectionContracts:
                [],
            } as never,

            run: {
              article: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",

                bodyMarkdown:
                  "Body",
              },

              sections:
                [],
            } as never,

            context: {
              originalityReferences:
                [],

              cannibalizationCandidates:
                [],
            },
          });


        expect(
          prompt
        ).toContain(
          "You do NOT assign numerical scores."
        );

        expect(
          prompt
        ).toContain(
          "You do NOT invent evidence, URLs, claims, query nodes, competitors, site pages, or facts."
        );

        expect(
          prompt
        ).toContain(
          "If originalityReferences is empty, return ZERO findings for ORIGINALITY."
        );

        expect(
          prompt
        ).toContain(
          "If cannibalizationCandidates is empty, return ZERO findings for CANNIBALIZATION."
        );
      }
    );


    it(
      "requires exactly five semantic review dimensions",
      () => {
        const prompt =
          buildMasterArticleSemanticCriticPrompt({
            contract: {
              h1Mission:
                "Mission",

              sectionContracts:
                [],
            } as never,

            run: {
              article: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",

                bodyMarkdown:
                  "Body",
              },

              sections:
                [],
            } as never,

            context: {
              originalityReferences:
                [],

              cannibalizationCandidates:
                [],
            },
          });


        expect(
          prompt
        ).toContain(
          "Return exactly FIVE reviews:"
        );

        expect(
          prompt
        ).toContain(
          "DEEP_INTENT"
        );

        expect(
          prompt
        ).toContain(
          "ORIGINALITY"
        );

        expect(
          prompt
        ).toContain(
          "EDITORIAL"
        );

        expect(
          prompt
        ).toContain(
          "SEMANTIC_DRIFT"
        );

        expect(
          prompt
        ).toContain(
          "CANNIBALIZATION"
        );
      }
    );


    it(
      "anchors missing required topics to the owning section and never for deferred topics",
      () => {
        const prompt =
          buildMasterArticleSemanticCriticPrompt({
            contract: {
              h1Mission:
                "Mission",

              sectionContracts:
                [],
            } as never,

            run: {
              article: {
                title:
                  "Title",

                metaDescription:
                  "Description",

                h1:
                  "H1",

                bodyMarkdown:
                  "Body",
              },

              sections:
                [],
            } as never,

            context: {
              originalityReferences:
                [],

              cannibalizationCandidates:
                [],
            },
          });


        /* section-anchored */
        expect(
          prompt
        ).toContain(
          "anchor the finding to the ONE section that owns it"
        );

        expect(
          prompt
        ).toContain(
          "with repairScope SECTION."
        );

        expect(
          prompt
        ).toContain(
          "Use an ARTICLE location with repairScope NONE only when the defect is genuinely article-wide"
        );

        expect(
          prompt
        ).toContain(
          "Never anchor a finding to a section merely to demand a topic listed in evidenceDeferredSections."
        );
      }
    );
  }
);
