import {
  crawlWebsite,
  type CrawledPage,
} from "@/lib/crawler/crawler";


export type ContentCrawlOwnershipSignalV1 =
  | "NONE"
  | "POSSIBLE_OWNER"
  | "STRONG_OWNER"
  | "MULTIPLE_POSSIBLE_OWNERS";


export interface ContentCrawlCandidateV1 {
  readonly url:
    string;

  readonly score:
    number;

  readonly title:
    string | null;

  readonly h1:
    string | null;

  readonly canonical:
    string | null;

  readonly robots:
    string | null;

  readonly wordCount:
    number;

  readonly internalLinkCount:
    number;

  readonly noindex:
    boolean;
}


export interface ContentCrawlPreflightV1 {
  readonly version:
    "CONTENT_REAL_CRAWL_PREFLIGHT_V1";

  readonly status:
    | "AVAILABLE"
    | "PARTIAL"
    | "UNAVAILABLE";

  readonly query:
    string;

  readonly pagesCrawled:
    number;

  readonly usablePages:
    number;

  readonly ownershipSignal:
    ContentCrawlOwnershipSignalV1;

  readonly candidates:
    readonly Readonly<ContentCrawlCandidateV1>[];

  readonly promptContext:
    string;

  readonly warning:
    string | null;
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "with",
  ]);


function normalize(
  value:
    string
): string {
  return value
    .toLocaleLowerCase(
      "en-US"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function queryTokens(
  value:
    string
): readonly string[] {
  return [
    ...new Set(
      normalize(
        value
      )
        .split(
          " "
        )
        .filter(
          (token) =>
            token.length >
              2 &&
            !STOP_WORDS.has(
              token
            )
        )
    ),
  ];
}


function tokenCoverage({
  query,
  value,
}: {
  query:
    readonly string[];

  value:
    string;
}): number {
  if (
    query.length ===
    0
  ) {
    return 0;
  }

  const haystack =
    new Set(
      normalize(
        value
      ).split(
        " "
      )
    );

  const matched =
    query.filter(
      (token) =>
        haystack.has(
          token
        )
    ).length;

  return matched /
    query.length;
}


function scorePage({
  query,
  page,
}: {
  query:
    string;

  page:
    CrawledPage;
}): number {
  if (
    !page.parsed
  ) {
    return 0;
  }

  const normalizedQuery =
    normalize(
      query
    );

  const tokens =
    queryTokens(
      query
    );

  const title =
    page.parsed.title ??
    "";

  const h1 =
    page.parsed.h1 ??
    "";

  const url =
    page.url;

  let score =
    0;

  if (
    normalize(
      title
    ).includes(
      normalizedQuery
    )
  ) {
    score +=
      40;
  }

  if (
    normalize(
      h1
    ).includes(
      normalizedQuery
    )
  ) {
    score +=
      35;
  }

  if (
    normalize(
      url
    ).includes(
      normalizedQuery
    )
  ) {
    score +=
      15;
  }

  score +=
    Math.round(
      tokenCoverage({
        query:
          tokens,

        value:
          `${title} ${h1}`,
      }) *
      25
    );

  score +=
    Math.round(
      tokenCoverage({
        query:
          tokens,

        value:
          url,
      }) *
      10
    );

  return Math.min(
    100,
    score
  );
}


function noindex(
  robots:
    string | null
): boolean {
  return Boolean(
    robots &&
    /\bnoindex\b/i.test(
      robots
    )
  );
}


export function buildContentCrawlPreflightFromPagesV1({
  query,
  pages,
  warning = null,
}: {
  query:
    string;

  pages:
    readonly CrawledPage[];

  warning?:
    string | null;
}): Readonly<ContentCrawlPreflightV1> {
  const usable =
    pages.filter(
      (page) =>
        page.statusCode >=
          200 &&
        page.statusCode <
          400 &&
        Boolean(
          page.parsed
        )
    );

  const candidates =
    usable
      .map(
        (
          page
        ): Readonly<ContentCrawlCandidateV1> => {
          const parsed =
            page.parsed!;

          return Object.freeze({
            url:
              page.url,

            score:
              scorePage({
                query,
                page,
              }),

            title:
              parsed.title,

            h1:
              parsed.h1,

            canonical:
              parsed.canonical,

            robots:
              parsed.robots,

            wordCount:
              parsed.wordCount,

            internalLinkCount:
              parsed.internalLinks
                .length,

            noindex:
              noindex(
                parsed.robots
              ),
          });
        }
      )
      .filter(
        (
          candidate
        ) =>
          candidate.score >
          0
      )
      .sort(
        (
          left,
          right
        ) =>
          right.score -
          left.score
      )
      .slice(
        0,
        5
      );

  const meaningful =
    candidates.filter(
      (
        candidate
      ) =>
        !candidate.noindex &&
        candidate.score >=
          45
    );

  const strongest =
    meaningful[0];

  const ownershipSignal:
    ContentCrawlOwnershipSignalV1 =
      meaningful.length >=
      2
        ? "MULTIPLE_POSSIBLE_OWNERS"
        : strongest &&
            strongest.score >=
              75
          ? "STRONG_OWNER"
          : strongest
            ? "POSSIBLE_OWNER"
            : "NONE";

  const status:
    ContentCrawlPreflightV1["status"] =
      usable.length ===
      0
        ? "UNAVAILABLE"
        : warning
          ? "PARTIAL"
          : "AVAILABLE";

  /*
   * IMPORTANT:
   * Never send entire crawled bodyText to the LLM.
   *
   * The crawler may inspect real pages, but generation receives
   * only compact ownership/internal-link metadata.
   */
  const contextLines =
    [
      "REAL_CRAWL_PREFLIGHT_V1",
      `query=${query}`,
      `status=${status}`,
      `pagesCrawled=${pages.length}`,
      `usablePages=${usable.length}`,
      `ownershipSignal=${ownershipSignal}`,
      ...candidates.map(
        (
          candidate,
          index
        ) =>
          [
            `candidate${index + 1}`,
            `score=${candidate.score}`,
            `url=${candidate.url}`,
            `title=${candidate.title ?? ""}`,
            `h1=${candidate.h1 ?? ""}`,
            `canonical=${candidate.canonical ?? ""}`,
            `robots=${candidate.robots ?? ""}`,
            `words=${candidate.wordCount}`,
            `internalLinks=${candidate.internalLinkCount}`,
          ].join(
            "|"
          )
      ),
      "RULE=This is real site ownership context only. Existing Content Intelligence retains CREATE/UPDATE/MERGE/NO_GO decision authority.",
    ];

  return Object.freeze({
    version:
      "CONTENT_REAL_CRAWL_PREFLIGHT_V1",

    status,

    query,

    pagesCrawled:
      pages.length,

    usablePages:
      usable.length,

    ownershipSignal,

    candidates:
      Object.freeze([
        ...candidates,
      ]),

    promptContext:
      contextLines
        .join(
          "\n"
        )
        .slice(
          0,
          4_000
        ),

    warning,
  });
}


export async function runContentCrawlPreflightV1({
  websiteUrl,
  query,
}: {
  websiteUrl:
    string;

  query:
    string;
}): Promise<
  Readonly<ContentCrawlPreflightV1>
> {
  try {
    const pages =
      await crawlWebsite(
        websiteUrl,
        {
          maxPages:
            25,

          maxDepth:
            2,

          concurrency:
            3,

          timeoutMs:
            8_000,

          maxResponseSize:
            2 *
            1024 *
            1024,
        }
      );

    const failed =
      pages.filter(
        (
          page
        ) =>
          Boolean(
            page.error
          )
      ).length;

    return buildContentCrawlPreflightFromPagesV1({
      query,
      pages,

      warning:
        failed >
        0
          ? `${failed} crawled page(s) failed.`
          : null,
    });
  } catch (
    error
  ) {
    const warning =
      error instanceof
      Error
        ? error.message
        : "Unknown crawl failure";

    return buildContentCrawlPreflightFromPagesV1({
      query,

      pages:
        [],

      warning:
        `CONTENT_REAL_CRAWL_UNAVAILABLE:${warning}`,
    });
  }
}
