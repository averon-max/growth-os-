import {
  analyzeArticle,
  countExactPhrase,
  extractArticleHeadings,
} from "./article-analyzer";


/*
 * ARTICLE_STRUCTURE_CANONICAL_V1
 *
 * One structure interpretation of a persisted article body.
 *
 * Used by:
 * - Article Intelligence panel (UI)
 * - Final Readiness (production authority)
 *
 * Both delegate to article-analyzer.ts. No third parser.
 */

export interface ArticleBodyHeadingStructureV1 {
  readonly bodyH1Count: number;
  readonly h2Count: number;
  readonly h3Count: number;
  readonly duplicateHeadings:
    readonly string[];
}


export function normalizeHeadingKeyV1(
  value: string
): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}


export function deriveBodyHeadingStructureV1(
  bodyMarkdown: string
): ArticleBodyHeadingStructureV1 {
  const headings =
    extractArticleHeadings(
      bodyMarkdown
    );

  const seen =
    new Set<string>();

  const duplicates =
    new Set<string>();

  for (const heading of headings) {
    const key =
      normalizeHeadingKeyV1(
        heading.text
      );

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      duplicates.add(key);
    }

    seen.add(key);
  }

  return Object.freeze({
    bodyH1Count:
      headings.filter(
        (heading) =>
          heading.level === 1
      ).length,

    h2Count:
      headings.filter(
        (heading) =>
          heading.level === 2
      ).length,

    h3Count:
      headings.filter(
        (heading) =>
          heading.level === 3
      ).length,

    duplicateHeadings:
      Object.freeze([
        ...duplicates,
      ]),
  });
}


export interface ArticleStructureStatsV1 {
  readonly words: number;
  readonly characters: number;
  readonly h1: number;
  readonly h2: number;
  readonly h3: number;

  readonly keywordRows:
    readonly {
      keyword: string;
      mentions: number;
    }[];

  readonly usedKeywords: number;
  readonly coverage: number | null;
}


export function computeArticleStructureStatsV1({
  title,
  h1,
  bodyMarkdown,
  keywords,
}: {
  readonly title: string;
  readonly h1: string;
  readonly bodyMarkdown: string;
  readonly keywords:
    readonly string[];
}): ArticleStructureStatsV1 {
  const analysis =
    analyzeArticle({
      title,
      h1,
      bodyMarkdown,
      primaryKeyword: "",
      secondaryKeywords: [],
    });

  const cleanKeywords = [
    ...new Set(
      keywords
        .map(
          (keyword) =>
            keyword.trim()
        )
        .filter(Boolean)
    ),
  ];

  const searchable =
    [
      title,
      h1,
      bodyMarkdown,
    ].join("\n");

  const keywordRows =
    cleanKeywords.map(
      (keyword) => ({
        keyword,

        mentions:
          countExactPhrase(
            searchable,
            keyword
          ),
      })
    );

  const usedKeywords =
    keywordRows.filter(
      (item) =>
        item.mentions > 0
    ).length;

  return {
    words:
      analysis.wordCount,

    characters:
      bodyMarkdown.length,

    h1:
      analysis.structure
        .totalH1,

    h2:
      analysis.structure.h2,

    h3:
      analysis.structure.h3,

    keywordRows,

    usedKeywords,

    coverage:
      cleanKeywords.length > 0
        ? Math.round(
            (usedKeywords /
              cleanKeywords.length) *
              100
          )
        : null,
  };
}
