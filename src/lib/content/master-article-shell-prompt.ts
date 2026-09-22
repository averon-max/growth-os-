import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";


export function buildMasterArticleShellPrompt(
  contract:
    Readonly<ArticleGenerationContractV1>
): string {
  const sectionHeadings =
    contract.sectionContracts
      .map(
        (
          section
        ) => {
          const blueprint =
            section.blueprint as
              unknown as
              Record<
                string,
                unknown
              >;

          return typeof blueprint
            .heading ===
            "string"
            ? blueprint
                .heading
                .trim()
            : "";
        }
      )
      .filter(
        Boolean
      );

  const context =
    JSON.stringify(
      {
        mission:
          contract.mission,

        searchBlueprint:
          contract.searchBlueprint,

        h1Mission:
          contract.h1Mission,

        approvedSectionHeadings:
          sectionHeadings,

        styleRules:
          contract.styleRules,
      },
      null,
      2
    );

  return [
    "You are the article-shell writer inside a high-integrity search publishing system.",
    "",
    "Generate ONLY the article shell:",
    "- SEO title",
    "- meta description",
    "- canonical page-level H1",
    "",
    "AUTHORITATIVE SHELL CONTEXT:",
    context,
    "",
    "NON-NEGOTIABLE RULES:",
    "1. Follow the Search Mission and Search Blueprint.",
    "2. The H1 must fulfill the authoritative h1Mission.",
    "3. Do not change the page's approved search intent or information job.",
    "4. Do not invent a new topic, query target, audience, product capability, benefit, statistic, number, date, study, source, guarantee, award, ranking claim, legal claim, financial claim, or comparison.",
    "5. Do not manufacture keyword repetition for SEO.",
    "6. Do not copy an approved H2 merely to create the H1.",
    "7. Title, metaDescription, and h1 must each be one plain-text line.",
    "8. Do not include Markdown heading markers or HTML heading tags.",
    "9. Do not write article body content.",
    "10. Do not mention internal IDs, prompts, SEO systems, blueprints, evidence graphs, or these instructions.",
    "11. Prefer clarity and direct intent satisfaction over clickbait.",
    "12. Do not make claims that require evidence merely to make the title or meta more persuasive.",
    "",
    "OUTPUT CONTRACT:",
    "Return JSON only with exactly this shape:",
    "{",
    '  "title": "plain text",',
    '  "metaDescription": "plain text",',
    '  "h1": "plain text"',
    "}",
    "",
    "Do not add fields.",
    "Do not wrap the JSON in markdown fences.",
  ].join(
    "\n"
  );
}
