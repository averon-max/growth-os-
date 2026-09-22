export type ArticleAnalyzerSeverity =
  | "BLOCKER"
  | "WARNING"
  | "INFO";

export type ArticleAnalyzerRangeState =
  | "BELOW"
  | "WITHIN"
  | "ABOVE"
  | "NO_TARGET";

export interface ArticleAnalyzerRange {
  min: number;
  max: number;
}

export interface ArticleAnalyzerTargets {
  wordCount?: ArticleAnalyzerRange | null;
  h2?: ArticleAnalyzerRange | null;
  h3?: ArticleAnalyzerRange | null;
}

export interface ArticleAnalyzerInput {
  title: string;
  metaDescription?: string | null;
  h1: string;
  bodyMarkdown: string;

  primaryKeyword: string;
  secondaryKeywords?: string[];

  /**
   * These targets MUST come from upstream evidence
   * such as the SERP/content blueprint.
   *
   * The analyzer never invents SEO targets.
   */
  targets?: ArticleAnalyzerTargets | null;
}

export interface ArticleHeading {
  level: number;
  text: string;
  source: "MARKDOWN" | "HTML";
}

export interface ArticleKeywordUsage {
  keyword: string;
  role: "PRIMARY" | "SECONDARY";

  bodyMentions: number;
  h1Mentions: number;
  headingMentions: number;

  used: boolean;
}

export interface ArticleAnalyzerIssue {
  code:
    | "MISSING_H1"
    | "BODY_CONTAINS_H1"
    | "INVALID_H1_COUNT"
    | "PRIMARY_NOT_IN_TITLE"
    | "PRIMARY_NOT_IN_H1"
    | "PRIMARY_NOT_IN_BODY"
    | "WORD_COUNT_BELOW_TARGET"
    | "WORD_COUNT_ABOVE_TARGET"
    | "H2_BELOW_TARGET"
    | "H2_ABOVE_TARGET"
    | "H3_BELOW_TARGET"
    | "H3_ABOVE_TARGET";

  severity: ArticleAnalyzerSeverity;
  message: string;
  actual?: number;
  expectedMin?: number;
  expectedMax?: number;
}

export interface ArticleAnalyzerResult {
  wordCount: number;

  structure: {
    totalH1: number;
    canonicalH1: number;
    bodyH1: number;
    h2: number;
    h3: number;
    otherHeadings: number;
    questionHeadings: number;
    headings: ArticleHeading[];
  };

  keywordCoverage: {
    planned: number;
    used: number;
    missing: number;
    coveragePct: number | null;
    totalExactMentions: number;
    items: ArticleKeywordUsage[];
  };

  primaryKeywordPlacement: {
    inTitle: boolean;
    inH1: boolean;
    inBody: boolean;
  };

  targetAlignment: {
    wordCount: {
      actual: number;
      target: ArticleAnalyzerRange | null;
      state: ArticleAnalyzerRangeState;
    };
    h2: {
      actual: number;
      target: ArticleAnalyzerRange | null;
      state: ArticleAnalyzerRangeState;
    };
    h3: {
      actual: number;
      target: ArticleAnalyzerRange | null;
      state: ArticleAnalyzerRangeState;
    };
  };

  issues: ArticleAnalyzerIssue[];

  /**
   * True means deterministic blockers are absent.
   *
   * This is NOT an SEO ranking score and does not mean
   * the article is guaranteed to rank.
   */
  structurallyValid: boolean;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countExactPhrase(
  text: string,
  phrase: string
): number {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);

  if (
    normalizedText.length === 0 ||
    normalizedPhrase.length === 0
  ) {
    return 0;
  }

  const haystack = ` ${normalizedText} `;
  const needle = ` ${normalizedPhrase} `;

  let count = 0;
  let cursor = 0;

  while (cursor < haystack.length) {
    const index = haystack.indexOf(
      needle,
      cursor
    );

    if (index === -1) {
      break;
    }

    count += 1;
    cursor = index + needle.length;
  }

  return count;
}

function stripInlineMarkdown(
  value: string
): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, " ");
}

function plainBodyText(
  markdown: string
): string {
  const lines = markdown.split(/\r?\n/);

  let inFence = false;

  const output: string[] = [];

  for (const rawLine of lines) {
    const trimmed =
      rawLine.trim();

    if (
      trimmed.startsWith("```") ||
      trimmed.startsWith("~~~")
    ) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const withoutHeading =
      rawLine.replace(
        /^\s{0,3}#{1,6}\s+/,
        ""
      );

    output.push(
      stripInlineMarkdown(
        withoutHeading
      )
    );
  }

  return output
    .join("\n")
    .replace(
      /https?:\/\/\S+/gi,
      " "
    );
}

export function countWords(
  markdown: string
): number {
  const plain =
    plainBodyText(markdown);

  return (
    plain.match(
      /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu
    )?.length ?? 0
  );
}

function cleanHeadingText(
  value: string
): string {
  return stripInlineMarkdown(value)
    .replace(/\s+#+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(
  value: string
): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractArticleHeadings(
  markdown: string
): ArticleHeading[] {
  const headings: ArticleHeading[] = [];

  const lines =
    markdown.split(/\r?\n/);

  let inFence = false;

  for (const line of lines) {
    const trimmed =
      line.trim();

    if (
      trimmed.startsWith("```") ||
      trimmed.startsWith("~~~")
    ) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match =
      line.match(
        /^\s{0,3}(#{1,6})\s+(.+?)\s*$/
      );

    if (!match) {
      continue;
    }

    const markers =
      match[1];

    const rawText =
      match[2];

    if (
      !markers ||
      !rawText
    ) {
      continue;
    }

    const text =
      cleanHeadingText(rawText);

    if (!text) {
      continue;
    }

    headings.push({
      level: markers.length,
      text,
      source: "MARKDOWN",
    });
  }

  const htmlHeadingRegex =
    /<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

  let htmlMatch:
    RegExpExecArray | null;

  while (
    (htmlMatch =
      htmlHeadingRegex.exec(
        markdown
      )) !== null
  ) {
    const levelRaw =
      htmlMatch[1];

    const content =
      htmlMatch[2];

    if (
      !levelRaw ||
      content === undefined
    ) {
      continue;
    }

    const level =
      Number(levelRaw);

    const headingText =
      stripHtml(content);

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6 ||
      !headingText
    ) {
      continue;
    }

    headings.push({
      level,
      text: headingText,
      source: "HTML",
    });
  }

  return headings;
}

function normalizeRange(
  range:
    | ArticleAnalyzerRange
    | null
    | undefined
): ArticleAnalyzerRange | null {
  if (!range) {
    return null;
  }

  if (
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max)
  ) {
    return null;
  }

  const min =
    Math.max(
      0,
      Math.round(
        Math.min(
          range.min,
          range.max
        )
      )
    );

  const max =
    Math.max(
      min,
      Math.round(
        Math.max(
          range.min,
          range.max
        )
      )
    );

  return {
    min,
    max,
  };
}

function rangeState(
  actual: number,
  range:
    | ArticleAnalyzerRange
    | null
    | undefined
): {
  actual: number;
  target: ArticleAnalyzerRange | null;
  state: ArticleAnalyzerRangeState;
} {
  const target =
    normalizeRange(range);

  if (!target) {
    return {
      actual,
      target: null,
      state: "NO_TARGET",
    };
  }

  if (actual < target.min) {
    return {
      actual,
      target,
      state: "BELOW",
    };
  }

  if (actual > target.max) {
    return {
      actual,
      target,
      state: "ABOVE",
    };
  }

  return {
    actual,
    target,
    state: "WITHIN",
  };
}

function uniquePlannedKeywords(
  primaryKeyword: string,
  secondaryKeywords: string[]
): Array<{
  keyword: string;
  role: "PRIMARY" | "SECONDARY";
}> {
  const result: Array<{
    keyword: string;
    role: "PRIMARY" | "SECONDARY";
  }> = [];

  const seen =
    new Set<string>();

  const add = (
    keyword: string,
    role: "PRIMARY" | "SECONDARY"
  ) => {
    const trimmed =
      keyword.trim();

    const normalized =
      normalizeText(trimmed);

    if (
      !trimmed ||
      !normalized ||
      seen.has(normalized)
    ) {
      return;
    }

    seen.add(normalized);

    result.push({
      keyword: trimmed,
      role,
    });
  };

  add(
    primaryKeyword,
    "PRIMARY"
  );

  for (
    const keyword
    of secondaryKeywords
  ) {
    add(
      keyword,
      "SECONDARY"
    );
  }

  return result;
}

function pushRangeIssue(
  issues: ArticleAnalyzerIssue[],
  input: {
    state: ArticleAnalyzerRangeState;
    target: ArticleAnalyzerRange | null;
    actual: number;
  },
  codes: {
    below:
      | "WORD_COUNT_BELOW_TARGET"
      | "H2_BELOW_TARGET"
      | "H3_BELOW_TARGET";
    above:
      | "WORD_COUNT_ABOVE_TARGET"
      | "H2_ABOVE_TARGET"
      | "H3_ABOVE_TARGET";
    label: string;
  }
): void {
  if (
    !input.target ||
    input.state === "NO_TARGET" ||
    input.state === "WITHIN"
  ) {
    return;
  }

  if (input.state === "BELOW") {
    issues.push({
      code: codes.below,
      severity: "WARNING",
      message:
        `${codes.label} is below the evidence-derived target range.`,
      actual: input.actual,
      expectedMin:
        input.target.min,
      expectedMax:
        input.target.max,
    });

    return;
  }

  issues.push({
    code: codes.above,
    severity: "WARNING",
    message:
      `${codes.label} is above the evidence-derived target range.`,
    actual: input.actual,
    expectedMin:
      input.target.min,
    expectedMax:
      input.target.max,
  });
}

export function analyzeArticle(
  input: ArticleAnalyzerInput
): ArticleAnalyzerResult {
  const title =
    input.title.trim();

  const h1 =
    input.h1.trim();

  const bodyMarkdown =
    input.bodyMarkdown ?? "";

  const primaryKeyword =
    input.primaryKeyword.trim();

  const secondaryKeywords =
    input.secondaryKeywords ?? [];

  const headings =
    extractArticleHeadings(
      bodyMarkdown
    );

  const bodyH1 =
    headings.filter(
      (heading) =>
        heading.level === 1
    ).length;

  const canonicalH1 =
    h1 ? 1 : 0;

  const totalH1 =
    canonicalH1 + bodyH1;

  const h2 =
    headings.filter(
      (heading) =>
        heading.level === 2
    ).length;

  const h3 =
    headings.filter(
      (heading) =>
        heading.level === 3
    ).length;

  const otherHeadings =
    headings.filter(
      (heading) =>
        heading.level >= 4
    ).length;

  const questionHeadings =
    headings.filter(
      (heading) =>
        /\?\s*$/.test(
          heading.text
        )
    ).length;

  const wordCount =
    countWords(
      bodyMarkdown
    );

  const plannedKeywords =
    uniquePlannedKeywords(
      primaryKeyword,
      secondaryKeywords
    );

  const headingText =
    headings
      .map(
        (heading) =>
          heading.text
      )
      .join("\n");

  const keywordItems:
    ArticleKeywordUsage[] =
      plannedKeywords.map(
        (item) => {
          const bodyMentions =
            countExactPhrase(
              bodyMarkdown,
              item.keyword
            );

          const h1Mentions =
            countExactPhrase(
              h1,
              item.keyword
            );

          const headingMentions =
            countExactPhrase(
              headingText,
              item.keyword
            );

          return {
            keyword:
              item.keyword,
            role:
              item.role,
            bodyMentions,
            h1Mentions,
            headingMentions,
            used:
              bodyMentions > 0 ||
              h1Mentions > 0,
          };
        }
      );

  const usedKeywords =
    keywordItems.filter(
      (item) =>
        item.used
    ).length;

  const plannedCount =
    keywordItems.length;

  const missingKeywords =
    plannedCount -
    usedKeywords;

  const totalExactMentions =
    keywordItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.bodyMentions +
        item.h1Mentions,
      0
    );

  const primaryInTitle =
    primaryKeyword.length > 0 &&
    countExactPhrase(
      title,
      primaryKeyword
    ) > 0;

  const primaryInH1 =
    primaryKeyword.length > 0 &&
    countExactPhrase(
      h1,
      primaryKeyword
    ) > 0;

  const primaryInBody =
    primaryKeyword.length > 0 &&
    countExactPhrase(
      bodyMarkdown,
      primaryKeyword
    ) > 0;

  const wordAlignment =
    rangeState(
      wordCount,
      input.targets
        ?.wordCount
    );

  const h2Alignment =
    rangeState(
      h2,
      input.targets?.h2
    );

  const h3Alignment =
    rangeState(
      h3,
      input.targets?.h3
    );

  const issues:
    ArticleAnalyzerIssue[] = [];

  if (!h1) {
    issues.push({
      code: "MISSING_H1",
      severity: "BLOCKER",
      message:
        "The canonical article H1 is missing.",
      actual: 0,
      expectedMin: 1,
      expectedMax: 1,
    });
  }

  if (bodyH1 > 0) {
    issues.push({
      code: "BODY_CONTAINS_H1",
      severity: "BLOCKER",
      message:
        "The article body contains an additional H1. Growth OS requires one canonical H1.",
      actual: bodyH1,
      expectedMin: 0,
      expectedMax: 0,
    });
  }

  if (totalH1 !== 1) {
    issues.push({
      code: "INVALID_H1_COUNT",
      severity: "BLOCKER",
      message:
        "The article must resolve to exactly one H1.",
      actual: totalH1,
      expectedMin: 1,
      expectedMax: 1,
    });
  }

  if (
    primaryKeyword &&
    !primaryInTitle
  ) {
    issues.push({
      code: "PRIMARY_NOT_IN_TITLE",
      severity: "WARNING",
      message:
        "The primary keyword is not explicitly present in the title. Review intent and wording instead of forcing repetition.",
    });
  }

  if (
    primaryKeyword &&
    !primaryInH1
  ) {
    issues.push({
      code: "PRIMARY_NOT_IN_H1",
      severity: "WARNING",
      message:
        "The primary keyword is not explicitly present in the canonical H1.",
    });
  }

  if (
    primaryKeyword &&
    !primaryInBody
  ) {
    issues.push({
      code: "PRIMARY_NOT_IN_BODY",
      severity: "WARNING",
      message:
        "The primary keyword has no exact body mention.",
    });
  }

  pushRangeIssue(
    issues,
    wordAlignment,
    {
      below:
        "WORD_COUNT_BELOW_TARGET",
      above:
        "WORD_COUNT_ABOVE_TARGET",
      label:
        "Word count",
    }
  );

  pushRangeIssue(
    issues,
    h2Alignment,
    {
      below:
        "H2_BELOW_TARGET",
      above:
        "H2_ABOVE_TARGET",
      label:
        "H2 count",
    }
  );

  pushRangeIssue(
    issues,
    h3Alignment,
    {
      below:
        "H3_BELOW_TARGET",
      above:
        "H3_ABOVE_TARGET",
      label:
        "H3 count",
    }
  );

  return {
    wordCount,

    structure: {
      totalH1,
      canonicalH1,
      bodyH1,
      h2,
      h3,
      otherHeadings,
      questionHeadings,
      headings,
    },

    keywordCoverage: {
      planned:
        plannedCount,
      used:
        usedKeywords,
      missing:
        missingKeywords,
      coveragePct:
        plannedCount > 0
          ? Math.round(
              (usedKeywords /
                plannedCount) *
                100
            )
          : null,
      totalExactMentions,
      items:
        keywordItems,
    },

    primaryKeywordPlacement: {
      inTitle:
        primaryInTitle,
      inH1:
        primaryInH1,
      inBody:
        primaryInBody,
    },

    targetAlignment: {
      wordCount:
        wordAlignment,
      h2:
        h2Alignment,
      h3:
        h3Alignment,
    },

    issues,

    structurallyValid:
      !issues.some(
        (issue) =>
          issue.severity ===
          "BLOCKER"
      ),
  };
}
