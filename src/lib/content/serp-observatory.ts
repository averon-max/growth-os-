import type {
  QueryIntent,
} from "./intent-boundary";


export const SERP_HISTORY_TARGET_DAYS =
  Object.freeze([
    0,
    3,
    7,
    14,
    28,
  ] as const);


export type SerpDevice =
  | "DESKTOP"
  | "MOBILE"
  | "TABLET";


export type SerpObservedPageType =
  | "ARTICLE"
  | "GUIDE"
  | "COMPARISON"
  | "PRODUCT"
  | "CATEGORY"
  | "TOOL"
  | "HOMEPAGE"
  | "FORUM"
  | "UGC"
  | "VIDEO"
  | "DATABASE"
  | "GOVERNMENT"
  | "OTHER"
  | "UNKNOWN";


export interface SerpObservedSource {
  label:
    string;

  url?:
    string | null;

  domain?:
    string | null;
}


export interface SerpObservedResult {
  rank:
    number;

  absoluteRank?:
    number | null;

  url:
    string;

  domain:
    string;

  title?:
    string | null;

  snippet?:
    string | null;

  pageType?:
    SerpObservedPageType | null;

  intent?:
    QueryIntent | null;

  h1?:
    string | null;

  h2?:
    readonly string[];

  h3?:
    readonly string[];

  topics?:
    readonly string[];

  entities?:
    readonly string[];

  questions?:
    readonly string[];

  claims?:
    readonly string[];

  sources?:
    readonly SerpObservedSource[];

  tables?:
    number | null;

  tools?:
    number | null;

  images?:
    number | null;

  videos?:
    number | null;

  author?:
    string | null;

  reviewer?:
    string | null;

  datePublished?:
    Date | null;

  dateModified?:
    Date | null;

  wordCount?:
    number | null;

  internalLinks?:
    number | null;

  externalLinks?:
    number | null;

  /*
   * External authority is optional evidence.
   * Stage 4 does not depend on the Backlinks subsystem.
   */
  referringDomains?:
    number | null;

  backlinks?:
    number | null;
}


export interface SerpAiOverview {
  present:
    boolean;

  references?:
    readonly {
      url:
        string;

      domain?:
        string | null;
    }[];
}


export interface SerpSnapshot {
  version:
    "SERP_SNAPSHOT_V1";

  keyword:
    string;

  country:
    string;

  language:
    string;

  device:
    SerpDevice;

  capturedAt:
    Date;

  results:
    readonly Readonly<SerpObservedResult>[];

  features:
    readonly string[];

  aiOverview:
    Readonly<SerpAiOverview>;

  fingerprint:
    string;
}


export interface CreateSerpSnapshotInput {
  keyword:
    string;

  country:
    string;

  language:
    string;

  device:
    SerpDevice;

  capturedAt:
    Date;

  results:
    SerpObservedResult[];

  features?:
    string[];

  aiOverview?:
    SerpAiOverview;
}


function requiredText(
  value: string,
  code: string
): string {
  const clean =
    value.trim();

  if (
    !clean
  ) {
    throw new Error(
      code
    );
  }

  return clean;
}


function normalizeUrl(
  value: string
): string {
  const clean =
    value.trim();

  try {
    const parsed =
      new URL(
        clean
      );

    parsed.hash =
      "";

    if (
      parsed.pathname !==
        "/" &&
      parsed.pathname.endsWith(
        "/"
      )
    ) {
      parsed.pathname =
        parsed.pathname.slice(
          0,
          -1
        );
    }

    return parsed.toString();
  } catch {
    return clean;
  }
}


function normalizeDomain(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}


function stableHash(
  value: string
): string {
  let hash =
    2166136261;

  for (
    let index =
      0;
    index <
      value.length;
    index +=
      1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>>
    0
  )
    .toString(
      36
    );
}


function freezeResult(
  result:
    SerpObservedResult
): Readonly<SerpObservedResult> {
  if (
    !Number.isInteger(
      result.rank
    ) ||
    result.rank <
      1
  ) {
    throw new Error(
      "SERP_RESULT_RANK_INVALID"
    );
  }

  const url =
    requiredText(
      result.url,
      "SERP_RESULT_URL_REQUIRED"
    );

  const domain =
    requiredText(
      result.domain,
      "SERP_RESULT_DOMAIN_REQUIRED"
    );

  return Object.freeze({
    ...result,

    url:
      normalizeUrl(
        url
      ),

    domain:
      normalizeDomain(
        domain
      ),

    h2:
      result.h2
        ? Object.freeze([
            ...result.h2,
          ])
        : undefined,

    h3:
      result.h3
        ? Object.freeze([
            ...result.h3,
          ])
        : undefined,

    topics:
      result.topics
        ? Object.freeze([
            ...result.topics,
          ])
        : undefined,

    entities:
      result.entities
        ? Object.freeze([
            ...result.entities,
          ])
        : undefined,

    questions:
      result.questions
        ? Object.freeze([
            ...result.questions,
          ])
        : undefined,

    claims:
      result.claims
        ? Object.freeze([
            ...result.claims,
          ])
        : undefined,

    sources:
      result.sources
        ? Object.freeze(
            result.sources.map(
              (source) =>
                Object.freeze({
                  ...source,
                })
            )
          )
        : undefined,
  });
}


export function buildSerpFingerprint({
  keyword,
  country,
  language,
  device,
  results,
  features,
  aiOverview,
}: {
  keyword:
    string;

  country:
    string;

  language:
    string;

  device:
    SerpDevice;

  results:
    readonly Readonly<SerpObservedResult>[];

  features:
    readonly string[];

  aiOverview:
    Readonly<SerpAiOverview>;
}): string {
  const top10 =
    results
      .filter(
        (result) =>
          result.rank <=
          10
      )
      .sort(
        (
          left,
          right
        ) =>
          left.rank -
          right.rank
      )
      .map(
        (result) => ({
          rank:
            result.rank,

          url:
            normalizeUrl(
              result.url
            ),

          domain:
            normalizeDomain(
              result.domain
            ),

          pageType:
            result.pageType ??
            null,

          intent:
            result.intent ??
            null,
        })
      );

  const canonical = {
    keyword:
      keyword
        .trim()
        .toLowerCase(),

    country:
      country
        .trim()
        .toLowerCase(),

    language:
      language
        .trim()
        .toLowerCase(),

    device,

    top10,

    features: [
      ...new Set(
        features.map(
          (feature) =>
            feature.trim()
        )
      ),
    ]
      .filter(
        Boolean
      )
      .sort(),

    aiOverview:
      aiOverview.present,
  };

  return stableHash(
    JSON.stringify(
      canonical
    )
  );
}


export function createSerpSnapshot(
  input:
    CreateSerpSnapshotInput
): Readonly<SerpSnapshot> {
  const keyword =
    requiredText(
      input.keyword,
      "SERP_SNAPSHOT_KEYWORD_REQUIRED"
    );

  const country =
    requiredText(
      input.country,
      "SERP_SNAPSHOT_COUNTRY_REQUIRED"
    );

  const language =
    requiredText(
      input.language,
      "SERP_SNAPSHOT_LANGUAGE_REQUIRED"
    );

  if (
    Number.isNaN(
      input.capturedAt.getTime()
    )
  ) {
    throw new Error(
      "SERP_SNAPSHOT_CAPTURED_AT_INVALID"
    );
  }

  const rankSet =
    new Set<number>();

  const results =
    input.results
      .map(
        freezeResult
      )
      .sort(
        (
          left,
          right
        ) =>
          left.rank -
          right.rank
      );

  for (
    const result
    of results
  ) {
    if (
      rankSet.has(
        result.rank
      )
    ) {
      throw new Error(
        "SERP_SNAPSHOT_DUPLICATE_RANK"
      );
    }

    rankSet.add(
      result.rank
    );
  }

  const features =
    Object.freeze([
      ...new Set(
        (
          input.features ??
          []
        )
          .map(
            (feature) =>
              feature.trim()
          )
          .filter(
            Boolean
          )
      ),
    ].sort());

  const aiOverview =
    Object.freeze({
      present:
        input.aiOverview
          ?.present ??
        false,

      references:
        input.aiOverview
          ?.references
        ? Object.freeze(
            input.aiOverview.references.map(
              (reference) =>
                Object.freeze({
                  url:
                    normalizeUrl(
                      reference.url
                    ),

                  domain:
                    reference.domain
                      ? normalizeDomain(
                          reference.domain
                        )
                      : null,
                })
            )
          )
        : undefined,
    });

  const fingerprint =
    buildSerpFingerprint({
      keyword,
      country,
      language,
      device:
        input.device,
      results,
      features,
      aiOverview,
    });

  return Object.freeze({
    version:
      "SERP_SNAPSHOT_V1" as const,

    keyword,

    country,

    language,

    device:
      input.device,

    capturedAt:
      new Date(
        input.capturedAt
      ),

    results:
      Object.freeze(
        results
      ),

    features,

    aiOverview,

    fingerprint,
  });
}


export function assertSameSerpMarket(
  snapshots:
    readonly Readonly<SerpSnapshot>[]
): void {
  if (
    snapshots.length <=
    1
  ) {
    return;
  }

  const first =
    snapshots[0];

  if (
    !first
  ) {
    return;
  }

  for (
    const snapshot
    of snapshots.slice(
      1
    )
  ) {
    if (
      snapshot.keyword
        .trim()
        .toLowerCase() !==
        first.keyword
          .trim()
          .toLowerCase() ||
      snapshot.country
        .trim()
        .toLowerCase() !==
        first.country
          .trim()
          .toLowerCase() ||
      snapshot.language
        .trim()
        .toLowerCase() !==
        first.language
          .trim()
          .toLowerCase() ||
      snapshot.device !==
        first.device
    ) {
      throw new Error(
        "SERP_HISTORY_MARKET_MISMATCH"
      );
    }
  }
}


export function daysFromFirstSnapshot({
  first,
  snapshot,
}: {
  first:
    Readonly<SerpSnapshot>;

  snapshot:
    Readonly<SerpSnapshot>;
}): number {
  return Math.max(
    0,
    Math.round(
      (
        snapshot.capturedAt.getTime() -
        first.capturedAt.getTime()
      ) /
        86_400_000
    )
  );
}
