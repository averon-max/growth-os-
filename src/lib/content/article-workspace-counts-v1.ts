import {
  countExactPhrase,
  extractArticleHeadings,
} from "./article-analyzer";

export interface ArticleWorkspaceHeadingV1 {
  readonly level: number;
  readonly text: string;
  readonly source: "PAGE" | "BODY";
}

export interface ArticleWorkspaceKeywordInputV1 {
  readonly keyword: string;
  readonly role?: string;
}

export interface ArticleWorkspaceKeywordRowV1 {
  readonly keyword: string;
  readonly role: "Primary" | "Secondary";
  readonly mentions: number;
}

export interface ArticleWorkspaceKeywordCountsV1 {
  readonly rows: readonly ArticleWorkspaceKeywordRowV1[];
  readonly total: number;
  readonly used: number;
  readonly missing: number;
  readonly totalMentions: number;
  readonly coveragePct: number | null;
}

export function getArticleWorkspaceHeadingsV1(
  h1: string,
  bodyMarkdown: string
): ArticleWorkspaceHeadingV1[] {
  const result: ArticleWorkspaceHeadingV1[] = [];

  if (h1.trim()) {
    result.push({
      level: 1,
      text: h1.trim(),
      source: "PAGE",
    });
  }

  for (const heading of extractArticleHeadings(bodyMarkdown)) {
    result.push({
      level: heading.level,
      text: heading.text,
      source: "BODY",
    });
  }

  return result;
}

function normalizeKeywordV1(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function countArticleWorkspaceKeywordsV1(input: {
  readonly title: string;
  readonly h1: string;
  readonly bodyMarkdown: string;
  readonly primaryKeyword: string;
  readonly plannedKeywords: readonly ArticleWorkspaceKeywordInputV1[];
}): ArticleWorkspaceKeywordCountsV1 {
  const primary =
    input.primaryKeyword.trim() ||
    input.plannedKeywords.find(
      (item) => item.role?.toLocaleLowerCase("en-US") === "primary"
    )?.keyword.trim() ||
    "";

  const candidates: Array<{
    keyword: string;
    role: "Primary" | "Secondary";
  }> = [];

  if (primary) {
    candidates.push({
      keyword: primary,
      role: "Primary",
    });
  }

  for (const item of input.plannedKeywords) {
    const keyword = item.keyword.trim();
    if (!keyword) continue;

    candidates.push({
      keyword,
      role:
        normalizeKeywordV1(keyword) === normalizeKeywordV1(primary)
          ? "Primary"
          : "Secondary",
    });
  }

  const seen = new Set<string>();
  const rows: ArticleWorkspaceKeywordRowV1[] = [];

  for (const item of candidates) {
    const normalized = normalizeKeywordV1(item.keyword);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    rows.push({
      keyword: item.keyword,
      role: item.role,
      mentions:
        countExactPhrase(input.title, item.keyword) +
        countExactPhrase(input.h1, item.keyword) +
        countExactPhrase(input.bodyMarkdown, item.keyword),
    });
  }

  const used = rows.filter((item) => item.mentions > 0).length;

  return {
    rows,
    total: rows.length,
    used,
    missing: rows.length - used,
    totalMentions: rows.reduce((sum, item) => sum + item.mentions, 0),
    coveragePct:
      rows.length > 0
        ? Math.round((used / rows.length) * 100)
        : null,
  };
}
