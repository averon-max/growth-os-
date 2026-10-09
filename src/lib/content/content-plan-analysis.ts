import {
  analyzeArticle,
  countExactPhrase,
  type ArticleAnalyzerResult,
} from "./article-analyzer";

import {
  extractExternalEvidenceSources,
  type ExternalEvidenceSource,
} from "./external-evidence-sources";

type UnknownRecord =
  Record<string, unknown>;

export interface ContentPlanCoverageItem {
  text: string;
  covered: boolean;
}

export interface ContentPlanCoverage {
  total: number;
  covered: number;
  missing: number;
  coveragePct: number | null;
  items: ContentPlanCoverageItem[];
}

export interface ContentPlanAnalysis {
  article:
    ArticleAnalyzerResult;

  planAvailable:
    boolean;

  confidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | null;

  topics:
    ContentPlanCoverage;

  questions:
    ContentPlanCoverage;

  contentGaps:
    string[];

  benchmarkObservation: {
    eligiblePages:
      number | null;

    observedMedianWordCount:
      number | null;

    observedMedianH2:
      number | null;

    observedMedianH3:
      number | null;
  };

  externalEvidenceSources?:
    ExternalEvidenceSource[];

  warnings:
    string[];
}

export interface AnalyzeArticleAgainstPlanInput {
  title: string;
  metaDescription?: string | null;
  h1: string;
  bodyMarkdown: string;

  primaryKeyword: string;
  secondaryKeywords?: string[];

  /**
   * The immutable ContentEvidenceSnapshot.plan.
   *
   * Deliberately unknown here so old snapshots
   * cannot crash the analyzer if the plan schema
   * evolves.
   */
  plan?: unknown;
}

function record(
  value: unknown
): UnknownRecord | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function stringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item ===
          "string"
    )
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function finiteNumber(
  value: unknown
): number | null {
  return typeof value ===
      "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function confidence(
  value: unknown
):
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | null {
  return value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW"
    ? value
    : null;
}


const COVERAGE_STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "could",
    "do",
    "does",
    "for",
    "from",
    "guide",
    "how",
    "in",
    "introduction",
    "is",
    "me",
    "my",
    "of",
    "on",
    "our",
    "overview",
    "should",
    "the",
    "to",
    "understanding",
    "what",
    "when",
    "where",
    "who",
    "why",
    "with",
    "would",
    "you",
    "your",
    "basics",
  ]);

function coverageTokens(
  value:
    string
): string[] {
  return value
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .split(
      /\s+/
    )
    .map(
      (token) =>
        token.trim()
    )
    .filter(
      (token) =>
        token.length >=
          3 &&
        !COVERAGE_STOP_WORDS.has(
          token
        )
    );
}

function hasCoverageEvidence(
  corpus:
    string,
  target:
    string
): boolean {
  if (
    countExactPhrase(
      corpus,
      target
    ) >
    0
  ) {
    return true;
  }

  const targetTokens =
    Array.from(
      new Set(
        coverageTokens(
          target
        )
      )
    );

  if (
    targetTokens.length ===
    0
  ) {
    return true;
  }

  const corpusTokens =
    new Set(
      coverageTokens(
        corpus
      )
    );

  const matched =
    targetTokens.filter(
      (token) =>
        corpusTokens.has(
          token
        )
    ).length;

  const required =
    targetTokens.length <=
      2
      ? targetTokens.length
      : Math.ceil(
          targetTokens.length *
            0.8
        );

  return matched >=
    required;
}

function coverage(
  corpus: string,
  values: string[]
): ContentPlanCoverage {
  /*
   * COVERAGE_SEMANTIC_NORMALIZATION_V2
   *
   * Coverage is an information check, NOT an exact-keyword
   * repetition check.
   *
   * Examples that MUST match:
   *
   * "How Does Credit Monitoring Work?"
   * "How Credit Monitoring Works"
   *
   * "Why Do I Need to Monitor My Credit?"
   * "Why Monitor Your Credit?"
   *
   * We intentionally keep this deterministic. No extra model
   * call is allowed merely to decide lexical coverage.
   */
  const grammaticalStopWords =
    new Set([
      "i",
      "you",
      "your",
      "we",
      "they",
      "it",
      "its",
      "what",
      "why",
      "when",
      "where",
      "who",
      "which",
      "need",
      "needs",
      "understand",
    ]);

  const normalizeToken = (
    raw:
      string
  ): string => {
    let token =
      raw
        .toLocaleLowerCase(
          "en-US"
        )
        .replace(
          /['’]s$/u,
          ""
        );

    if (
      token.endsWith(
        "ies"
      ) &&
      token.length >
        4
    ) {
      token =
        `${token.slice(0, -3)}y`;
    } else if (
      token.endsWith(
        "ing"
      ) &&
      token.length >
        5
    ) {
      token =
        token.slice(
          0,
          -3
        );
    } else if (
      token.endsWith(
        "ed"
      ) &&
      token.length >
        4
    ) {
      token =
        token.slice(
          0,
          -2
        );
    } else if (
      token.endsWith(
        "es"
      ) &&
      token.length >
        4
    ) {
      token =
        token.slice(
          0,
          -2
        );
    } else if (
      token.endsWith(
        "s"
      ) &&
      token.length >
        3
    ) {
      token =
        token.slice(
          0,
          -1
        );
    }

    return token;
  };

  const tokens = (
    value:
      string
  ): string[] =>
    value
      .toLocaleLowerCase(
        "en-US"
      )
      .replace(
        /['’]s\b/gu,
        ""
      )
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .split(
        /\s+/u
      )
      .map(
        normalizeToken
      )
      .filter(
        (token) =>
          token.length >
            1 &&
          !COVERAGE_STOP_WORDS
            .has(
              token
            ) &&
          !grammaticalStopWords
            .has(
              token
            )
      );

  const corpusTokens =
    new Set(
      tokens(
        corpus
      )
    );

  const unique =
    new Map<
      string,
      string
    >();

  for (
    const raw
    of values
  ) {
    const text =
      raw.trim();

    if (!text) {
      continue;
    }

    const key =
      text
        .toLocaleLowerCase(
          "en-US"
        )
        .replace(
          /\s+/g,
          " "
        );

    if (
      !unique.has(
        key
      )
    ) {
      unique.set(
        key,
        text
      );
    }
  }

  const items =
    Array.from(
      unique.values()
    ).map(
      (text) => {
        const required =
          Array.from(
            new Set(
              tokens(
                text
              )
            )
          );

        const matches =
          required.filter(
            (token) =>
              corpusTokens.has(
                token
              )
          ).length;

        /*
         * One-word concepts remain exact after normalization.
         *
         * Two-word concepts require both concepts.
         *
         * Longer information jobs tolerate grammatical /
         * morphological variation while still requiring
         * substantial concept overlap.
         */
        const covered =
          required.length ===
            0
            ? false
            : required.length <=
                2
              ? matches ===
                required.length
              : matches /
                    required.length >=
                  0.75;

        return {
          text,
          covered,
        };
      }
    );

  const covered =
    items.filter(
      (item) =>
        item.covered
    ).length;

  return {
    total:
      items.length,

    covered,

    missing:
      items.length -
      covered,

    coveragePct:
      items.length >
        0
        ? Math.round(
            (
              covered /
              items.length
            ) *
              100
          )
        : null,

    items,
  };
}

export function analyzeArticleAgainstPlan(
  input:
    AnalyzeArticleAgainstPlanInput
): ContentPlanAnalysis {
  const root =
    record(
      input.plan
    );

  const architecture =
    record(
      root?.architecture
    );

  const benchmark =
    record(
      root?.benchmark
    );

  /*
   * LEGACY_SERP_COVERAGE_DIAGNOSTICS_V2
   *
   * FinalContentPlan architecture contains observed SERP
   * topics and questions. They are diagnostics, not canonical
   * MUST requirements.
   *
   * Canonical MUST authority belongs to ArticleExecutionPlan
   * and FinalArticleReadiness.
   */
  const observedSerpTopics =
    stringArray(
      architecture
        ?.requiredTopics
    );

  const observedSerpQuestions =
    stringArray(
      architecture
        ?.questionsToAnswer
    );

  const contentGaps =
    stringArray(
      architecture
        ?.contentGaps
    );

  const article =
    analyzeArticle({
      title:
        input.title,

      metaDescription:
        input.metaDescription,

      h1:
        input.h1,

      bodyMarkdown:
        input.bodyMarkdown,

      primaryKeyword:
        input.primaryKeyword,

      secondaryKeywords:
        input.secondaryKeywords,

      /*
       * Important:
       *
       * FinalContentPlan explicitly says
       * competitor H2/H3/word counts are
       * descriptive observations, not targets.
       *
       * Therefore we MUST NOT convert benchmark
       * medians into analyzer target ranges.
       */
      targets:
        null,
    });

  const corpus = [
    input.title,
    input.h1,
    input.bodyMarkdown,
  ].join(
    "\n"
  );

  const topics =
    coverage(
      corpus,
      observedSerpTopics
    );

  const questionCoverage =
    coverage(
      corpus,
      observedSerpQuestions
    );

  const warnings:
    string[] = [];

  for (
    const item
    of topics.items
  ) {
    if (
      !item.covered
    ) {
      warnings.push(
        `SERP_OBSERVED_TOPIC_NOT_LEXICALLY_COVERED: ${item.text}`
      );
    }
  }

  for (
    const item
    of questionCoverage.items
  ) {
    if (
      !item.covered
    ) {
      warnings.push(
        `SERP_OBSERVED_QUESTION_NOT_LEXICALLY_COVERED: ${item.text}`
      );
    }
  }

  for (
    const issue
    of article.issues
  ) {
    if (
      issue.severity !==
      "INFO"
    ) {
      warnings.push(
        `ARTICLE_${issue.severity}: ${issue.code}`
      );
    }
  }

  return {
    article,

    externalEvidenceSources:
      extractExternalEvidenceSources(
        input.plan
      ),

    planAvailable:
      Boolean(root),

    confidence:
      confidence(
        root?.confidence
      ),

    topics,

    questions:
      questionCoverage,

    contentGaps,

    benchmarkObservation: {
      eligiblePages:
        finiteNumber(
          benchmark
            ?.eligiblePages
        ),

      observedMedianWordCount:
        finiteNumber(
          benchmark
            ?.observedMedianWordCount
        ),

      observedMedianH2:
        finiteNumber(
          benchmark
            ?.observedMedianH2
        ),

      observedMedianH3:
        finiteNumber(
          benchmark
            ?.observedMedianH3
        ),
    },

    warnings:
      Array.from(
        new Set(
          warnings
        )
      ),
  };
}
