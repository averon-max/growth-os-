import {
  normalizeHeadingKeyV1,
} from "./article-structure-stats-v1";

import {
  ContentGenerationError,
} from "./generator";

import type {
  GeneratedArticle,
} from "./types";


function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function countWords(
  markdown: string
): number {
  return markdown
    .replace(
      /[#>*_`\[\]()!-]/g,
      " "
    )
    .split(
      /\s+/
    )
    .filter(Boolean)
    .length;
}


function countPhrase(
  text: string,
  phrase: string
): number {
  const haystack =
    text.toLowerCase();

  const needle =
    phrase
      .toLowerCase()
      .trim();

  if (!needle) {
    return 0;
  }

  let count =
    0;

  let index =
    0;

  while (
    (
      index =
        haystack.indexOf(
          needle,
          index
        )
    ) !==
    -1
  ) {
    count +=
      1;

    index +=
      needle.length;
  }

  return count;
}


export function repairArticleMarkdown(
  markdown: string,
  h1: string
): string {
  const output:
    string[] = [];

  const headings =
    new Set<string>();

  let hasH2 =
    false;

  for (
    const rawLine of
    markdown.split("\n")
  ) {
    const line =
      rawLine.trimEnd();

    const match =
      /^(#{1,6})\s+(.+)$/.exec(
        line.trim()
      );

    if (!match) {
      output.push(line);
      continue;
    }

    let level =
      match[1].length;

    const heading =
      match[2].trim();

    let repairedHeading =
      heading;

    let key =
      normalizeHeadingKeyV1(
        repairedHeading
      );

    if (!key) {
      continue;
    }

    if (
      level === 1
    ) {
      if (
        key ===
        normalizeHeadingKeyV1(
          h1
        )
      ) {
        continue;
      }

      level =
        2;
    }

    if (
      level > 3
    ) {
      level =
        3;
    }

    if (
      level === 3 &&
      !hasH2
    ) {
      level =
        2;
    }

    if (
      headings.has(
        key
      )
    ) {
      /*
       * DUPLICATE_HEADING_DETERMINISTIC_REPAIR_V1
       *
       * Do not delete the section/subsection.
       * Keep its content and deterministically make the
       * reader-facing heading unique.
       */
      let suffix =
        1;

      do {
        repairedHeading =
          suffix ===
            1
            ? `${heading} — Additional Detail`
            : `${heading} — Additional Detail ${suffix}`;

        key =
          normalizeHeadingKeyV1(
            repairedHeading
          );

        suffix +=
          1;
      } while (
        headings.has(
          key
        )
      );
    }

    if (
      level === 2
    ) {
      hasH2 =
        true;
    }

    headings.add(key);

    output.push(
      `${"#".repeat(
        level
      )} ${repairedHeading}`
    );
  }

  return output
    .join("\n")
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


const BROKEN_ARTICLE_AGREEMENT_PATTERN =
  /\ba\s+changes\b/i;


export function repairHighConfidenceTextDefects(
  value:
    string
): string {
  return value.replace(
    /\ba\s+changes\b/gi,
    (match) =>
      match[0] === "A"
        ? "A change"
        : "a change"
  );
}


export interface ArticleAudit {
  score: number;
  wordCount: number;
  h2Count: number;
  h3Count: number;
  primaryKeywordDensityPct: number;
  issues: string[];
}


export function auditArticle({
  article,
  primaryKeyword,
}: {
  article:
    GeneratedArticle;

  primaryKeyword:
    string;
}): ArticleAudit {
  const issues:
    string[] = [];

  const lines =
    article.bodyMarkdown.split(
      "\n"
    );

  const h2Count =
    lines.filter(
      (line) =>
        /^##\s+/.test(
          line
        ) &&
        !/^###\s+/.test(
          line
        )
    ).length;

  const h3Count =
    lines.filter(
      (line) =>
        /^###\s+/.test(
          line
        )
    ).length;

  /*
   * FINAL_ARTICLE_TEXT_INTEGRITY_V1
   *
   * Audit the persisted page-level H1 together with rendered body
   * headings. Comparing H2 headings only with each other previously
   * allowed an H1/H2 duplicate to score 100 and reach IN_REVIEW.
   */
  const normalizedPageH1 =
    normalizeHeadingKeyV1(article.h1);

  const bodyHeadingKeys =
    lines
      .map((line) => /^#{1,6}\s+(.+)$/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => normalizeHeadingKeyV1(match[1]))
      .filter(Boolean);

  if (
    normalizedPageH1 &&
    bodyHeadingKeys.includes(normalizedPageH1)
  ) {
    issues.push("DUPLICATE_H1_BODY_HEADING");
  }

  if (new Set(bodyHeadingKeys).size !== bodyHeadingKeys.length) {
    issues.push("DUPLICATE_BODY_HEADING");
  }

  /*
   * Detect unambiguous spacing defects, not dictionary-based
   * spelling guesses. Strip fenced/inline code and URLs so a URL or
   * code literal cannot be misclassified as broken prose.
   */
  const proseOnly =
    article.bodyMarkdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`\n]*`/g, " ")
      .replace(/https?:\/\/[^\s)]+/g, " ");

  if (/ {3,}/.test(proseOnly)) {
    issues.push("BROKEN_ARTICLE_EXCESSIVE_SPACES");
  }

  if (/\p{L},(?=\p{Ll})/u.test(proseOnly)) {
    issues.push("BROKEN_ARTICLE_COMMA_SPACING");
  }

  const words =
    countWords(
      article.bodyMarkdown
    );

  const occurrences =
    countPhrase(
      `${article.title}\n${article.h1}\n${article.bodyMarkdown}`,
      primaryKeyword
    );

  const keywordWords =
    Math.max(
      1,
      primaryKeyword
        .trim()
        .split(/\s+/)
        .length
    );

  const density =
    words > 0
      ? (
          occurrences *
          keywordWords /
          words
        ) *
        100
      : 0;

  let score =
    100;


  const fullArticleText =
    [
      article.title,
      article.metaDescription,
      article.h1,
      article.bodyMarkdown,
    ].join(
      "\n"
    );

  if (
    BROKEN_ARTICLE_AGREEMENT_PATTERN.test(
      fullArticleText
    )
  ) {
    issues.push(
      "BROKEN_ARTICLE_AGREEMENT"
    );

    score -=
      15;
  }
  if (
    !article.title
      .toLowerCase()
      .includes(
        primaryKeyword
          .toLowerCase()
      )
  ) {
    issues.push(
      "PRIMARY_NOT_IN_TITLE"
    );
    score -=
      8;
  }

  if (
    !article.h1
      .toLowerCase()
      .includes(
        primaryKeyword
          .toLowerCase()
      )
  ) {
    issues.push(
      "PRIMARY_NOT_IN_H1"
    );
    score -=
      10;
  }

  if (
    article.metaDescription.length <
      80
  ) {
    issues.push(
      "META_TOO_SHORT"
    );
    score -=
      5;
  }

  if (
    article.metaDescription.length >
      165
  ) {
    issues.push(
      "META_TOO_LONG"
    );
    score -=
      5;
  }




  if (
    /^#\s+/m.test(
      article.bodyMarkdown
    )
  ) {
    issues.push(
      "BODY_CONTAINS_H1"
    );
    score -=
      20;
  }

  return {
    score:
      Math.max(
        0,
        score
      ),

    wordCount:
      words,

    h2Count,
    h3Count,

    primaryKeywordDensityPct:
      Math.round(
        density *
        100
      ) /
      100,

    issues,
  };
}


export function repairGeneratedArticle(
  article:
    GeneratedArticle
): GeneratedArticle {
  const title =
    repairHighConfidenceTextDefects(
      article.title.trim()
    );

  const h1 =
    repairHighConfidenceTextDefects(
      article.h1.trim()
    ) ||
    title;

  let metaDescription =
    repairHighConfidenceTextDefects(
      article
        .metaDescription
        .trim()
    );

  if (
    !title ||
    !h1 ||
    !article.bodyMarkdown
      .trim()
  ) {
    throw new ContentGenerationError(
      "Generated article is missing title, H1, or body content"
    );
  }

  if (
    metaDescription.length >
    165
  ) {
    const shortened =
      metaDescription
        .slice(0, 162)
        .replace(
          /\s+\S*$/,
          ""
        )
        .trim();

    metaDescription =
      `${shortened}…`;
  }

  return {
    title,
    metaDescription,
    h1,

    bodyMarkdown:
      repairArticleMarkdown(
        repairHighConfidenceTextDefects(
          article.bodyMarkdown
        ),
        h1
      ),
  };
}
