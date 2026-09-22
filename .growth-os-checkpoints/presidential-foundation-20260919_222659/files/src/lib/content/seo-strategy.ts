import {
  buildKeywordDecisionShadow,
} from "@/lib/keywords/keyword-decision";

import {
  applyTopicAuthorityShadow,
} from "@/lib/keywords/topic-authority";

import { prisma } from "@/lib/prisma";

import {
  fetchRelatedKeywords,
  type RelatedKeywordResult,
} from "@/lib/keywords/dataforseo-provider";

import {
  fetchTrendingQueries,
} from "@/lib/keywords/trends-provider";

import {
  getWebsiteKeywordContext,
} from "./keyword-context";

import type {
  ContentOutlineSection,
  ContentSearchIntent,
  ContentStrategy,
  ContentStrategyKeyword,
  KeywordContextItem,
  KeywordTrendAnalysis,
} from "./types";


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "by",
    "for",
    "from",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
  ]);


function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function round(
  value: number,
  decimals = 2
): number {
  const factor =
    10 ** decimals;

  return Math.round(
    value * factor
  ) / factor;
}


function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
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


function tokens(
  value: string
): string[] {
  return normalize(value)
    .split(" ")
    .filter(
      (token) =>
        token.length > 1 &&
        !STOP_WORDS.has(
          token
        )
    );
}


export function keywordSimilarity(
  a: string,
  b: string
): number {
  const left =
    new Set(
      tokens(a)
    );

  const right =
    new Set(
      tokens(b)
    );

  if (
    left.size === 0 ||
    right.size === 0
  ) {
    return normalize(a) ===
      normalize(b)
      ? 1
      : 0;
  }

  let intersection =
    0;

  for (
    const token of left
  ) {
    if (
      right.has(token)
    ) {
      intersection +=
        1;
    }
  }

  const union =
    new Set([
      ...left,
      ...right,
    ]).size;

  return union === 0
    ? 0
    : intersection /
        union;
}


export function classifySearchIntent(
  query: string
): ContentSearchIntent {
  const value =
    normalize(query);

  const transactional =
    [
      "buy",
      "purchase",
      "pricing",
      "price",
      "subscribe",
      "subscription",
      "download",
      "hire",
      "service",
      "software",
      "tool",
    ];

  const commercial =
    [
      "best",
      "top",
      "review",
      "reviews",
      "vs",
      "versus",
      "alternative",
      "alternatives",
      "compare",
      "comparison",
      "recommended",
    ];

  const navigational =
    [
      "login",
      "log in",
      "sign in",
      "official",
      "dashboard",
      "support",
    ];

  if (
    transactional.some(
      (term) =>
        value.includes(term)
    )
  ) {
    return "TRANSACTIONAL";
  }

  if (
    commercial.some(
      (term) =>
        value.includes(term)
    )
  ) {
    return "COMMERCIAL";
  }

  if (
    navigational.some(
      (term) =>
        value.includes(term)
    )
  ) {
    return "NAVIGATIONAL";
  }

  return "INFORMATIONAL";
}


export function computeTrendAnalysis(
  input:
    Array<{
      year: number;
      month: number;
      searchVolume: number;
    }>
): KeywordTrendAnalysis {
  const points =
    [...input]
      .filter(
        (point) =>
          Number.isFinite(
            point.searchVolume
          )
      )
      .sort(
        (a, b) =>
          a.year !== b.year
            ? a.year - b.year
            : a.month - b.month
      )
      .slice(-12);

  if (
    points.length === 0
  ) {
    return {
      points: [],
      average12m:
        null,
      average3m:
        null,
      previous3mAverage:
        null,
      momentumPct:
        null,
      peakVolume:
        null,
      latestVolume:
        null,
      seasonal:
        false,
    };
  }

  const average = (
    values: number[]
  ) =>
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    Math.max(
      1,
      values.length
    );

  const volumes =
    points.map(
      (point) =>
        point.searchVolume
    );

  const recent =
    volumes.slice(-3);

  const previous =
    volumes.slice(-6, -3);

  const average12m =
    average(volumes);

  const average3m =
    average(recent);

  const previous3mAverage =
    previous.length > 0
      ? average(previous)
      : null;

  const momentumPct =
    previous3mAverage !==
      null &&
    previous3mAverage > 0
      ? (
          (
            average3m -
            previous3mAverage
          ) /
          previous3mAverage
        ) *
        100
      : null;

  const variance =
    average(
      volumes.map(
        (volume) =>
          (
            volume -
            average12m
          ) ** 2
      )
    );

  const deviation =
    Math.sqrt(
      variance
    );

  const cv =
    average12m > 0
      ? deviation /
        average12m
      : 0;

  return {
    points,

    average12m:
      round(
        average12m,
        1
      ),

    average3m:
      round(
        average3m,
        1
      ),

    previous3mAverage:
      previous3mAverage ===
      null
        ? null
        : round(
            previous3mAverage,
            1
          ),

    momentumPct:
      momentumPct === null
        ? null
        : round(
            momentumPct,
            1
          ),

    peakVolume:
      Math.max(
        ...volumes
      ),

    latestVolume:
      volumes[
        volumes.length -
          1
      ],

    seasonal:
      points.length >=
        6 &&
      cv >=
        0.35,
  };
}


interface Candidate {
  keyword: string;
  sources: Set<string>;
  volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  monthly:
    RelatedKeywordResult["monthlySearches"];
  position: number | null;
  impressions: number;
  clicks: number;
}


function addCandidate(
  candidates:
    Map<
      string,
      Candidate
    >,
  incoming:
    Candidate
) {
  const key =
    normalize(
      incoming.keyword
    );

  if (!key) {
    return;
  }

  const current =
    candidates.get(key);

  if (!current) {
    candidates.set(
      key,
      incoming
    );

    return;
  }

  for (
    const source of
    incoming.sources
  ) {
    current.sources.add(
      source
    );
  }

  current.volume =
    current.volume ??
    incoming.volume;

  current.difficulty =
    current.difficulty ??
    incoming.difficulty;

  current.cpc =
    current.cpc ??
    incoming.cpc;

  current.position =
    current.position ??
    incoming.position;

  current.impressions =
    Math.max(
      current.impressions,
      incoming.impressions
    );

  current.clicks =
    Math.max(
      current.clicks,
      incoming.clicks
    );

  if (
    current.monthly.length ===
      0 &&
    incoming.monthly.length >
      0
  ) {
    current.monthly =
      incoming.monthly;
  }
}


function bestExistingKeyword(
  keyword: string,
  existing:
    KeywordContextItem[]
): KeywordContextItem | null {
  let best:
    KeywordContextItem | null =
      null;

  let bestSimilarity =
    0;

  for (
    const candidate of
    existing
  ) {
    const similarity =
      keywordSimilarity(
        keyword,
        candidate.keyword
      );

    if (
      similarity >
      bestSimilarity
    ) {
      best =
        candidate;

      bestSimilarity =
        similarity;
    }
  }

  return bestSimilarity >=
    0.5
    ? best
    : null;
}


function topicalAuthority(
  keyword: string,
  existing:
    KeywordContextItem[]
): number {
  if (
    existing.length === 0
  ) {
    return 0.35;
  }

  return clamp(
    Math.max(
      ...existing.map(
        (item) =>
          keywordSimilarity(
            keyword,
            item.keyword
          )
      )
    ),
    0,
    1
  );
}


function gscOpportunity(
  keyword:
    KeywordContextItem | null
): number {
  if (!keyword) {
    return 0;
  }

  let positionScore =
    0.25;

  if (
    keyword.position !==
    null
  ) {
    if (
      keyword.position >=
        4 &&
      keyword.position <=
        20
    ) {
      positionScore =
        1;
    } else if (
      keyword.position >
        20 &&
      keyword.position <=
        50
    ) {
      positionScore =
        0.72;
    } else if (
      keyword.position >=
        1 &&
      keyword.position < 4
    ) {
      positionScore =
        0.35;
    } else {
      positionScore =
        0.4;
    }
  }

  const impressionScore =
    clamp(
      Math.log10(
        Math.max(
          1,
          keyword.impressions
        )
      ) /
        4,
      0,
      1
    );

  const ctr =
    keyword.impressions > 0
      ? keyword.clicks /
        keyword.impressions
      : 0;

  const ctrOpportunity =
    keyword.impressions >=
      20 &&
    ctr < 0.03
      ? 1
      : 0.3;

  return clamp(
    positionScore *
      0.5 +
      impressionScore *
        0.3 +
      ctrOpportunity *
        0.2,
    0,
    1
  );
}


function duplicateMatch(
  topic: string,
  keyword: string,
  briefs:
    Array<{
      id: string;
      topic: string;
      primaryKeyword: string;
      articles:
        Array<{
          status: string;
          publishedUrl:
            string | null;
        }>;
    }>
) {
  let best:
    typeof briefs[number] | null =
      null;

  let similarity =
    0;

  for (
    const brief of briefs
  ) {
    const score =
      Math.max(
        keywordSimilarity(
          topic,
          brief.topic
        ),
        keywordSimilarity(
          keyword,
          brief.primaryKeyword
        ),
        keywordSimilarity(
          topic,
          brief.primaryKeyword
        )
      );

    if (
      score >
      similarity
    ) {
      best =
        brief;

      similarity =
        score;
    }
  }

  return {
    brief:
      best,
    similarity,
  };
}


function scoreCandidate({
  candidate,
  topic,
  topicIntent,
  businessName,
  industry,
  existingKeywords,
  briefs,
  maxVolume,
  maxCpc,
  trending,
}: {
  candidate: Candidate;
  topic: string;
  topicIntent:
    ContentSearchIntent;
  businessName: string;
  industry: string;
  existingKeywords:
    KeywordContextItem[];

  briefs:
    Array<{
      id: string;
      topic: string;
      primaryKeyword: string;
      articles:
        Array<{
          status: string;
          publishedUrl:
            string | null;
        }>;
    }>;

  maxVolume: number;
  maxCpc: number;
  trending:
    Set<string>;
}): ContentStrategyKeyword {
  const intent =
    classifySearchIntent(
      candidate.keyword
    );

  const trend =
    computeTrendAnalysis(
      candidate.monthly
    );

  const existing =
    bestExistingKeyword(
      candidate.keyword,
      existingKeywords
    );

  const intentSimilarity =
    keywordSimilarity(
      candidate.keyword,
      topic
    );

  const intentMatch =
    clamp(
      intentSimilarity *
        0.72 +
      (
        intent ===
        topicIntent
          ? 0.28
          : 0
      ),
      0,
      1
    );

  const businessRelevance =
    clamp(
      keywordSimilarity(
        candidate.keyword,
        topic
      ) *
        0.68 +
      Math.max(
        keywordSimilarity(
          candidate.keyword,
          businessName
        ),
        keywordSimilarity(
          candidate.keyword,
          industry
        )
      ) *
        0.32,
      0,
      1
    );

  const rankability =
    candidate.difficulty ===
    null
      ? 0.5
      : clamp(
          1 -
            candidate.difficulty /
              100,
          0,
          1
        );

  const demand =
    candidate.volume ===
      null ||
    maxVolume <= 0
      ? 0.2
      : clamp(
          Math.log1p(
            candidate.volume
          ) /
            Math.log1p(
              maxVolume
            ),
          0,
          1
        );

  let trendMomentum =
    trend.momentumPct ===
    null
      ? 0.45
      : clamp(
          (
            trend.momentumPct +
            30
          ) /
            80,
          0,
          1
        );

  if (
    trending.has(
      normalize(
        candidate.keyword
      )
    )
  ) {
    trendMomentum =
      Math.max(
        trendMomentum,
        0.9
      );
  }

  const gsc =
    gscOpportunity(
      existing
    );

  const commercial =
    candidate.cpc ===
      null
      ? 0.2
      : clamp(
          candidate.cpc /
            Math.max(
              0.01,
              maxCpc
            ),
          0,
          1
        );

  const authority =
    topicalAuthority(
      candidate.keyword,
      existingKeywords
    );

  const duplicate =
    duplicateMatch(
      topic,
      candidate.keyword,
      briefs
    );

  let penalties =
    0;

  const reasons:
    string[] = [];

  if (
    intent !==
      topicIntent &&
    intentSimilarity <
      0.35
  ) {
    penalties +=
      25;

    reasons.push(
      "intent mismatch"
    );
  }

  if (
    duplicate.similarity >=
    0.82
  ) {
    penalties +=
      45;

    reasons.push(
      "strong existing-content overlap"
    );
  } else if (
    duplicate.similarity >=
    0.65
  ) {
    penalties +=
      20;

    reasons.push(
      "possible cannibalization"
    );
  }

  if (
    existing?.position !==
      null &&
    existing?.position !==
      undefined &&
    existing.position <=
      5 &&
    keywordSimilarity(
      existing.keyword,
      candidate.keyword
    ) >=
      0.8
  ) {
    penalties +=
      10;

    reasons.push(
      "already ranking strongly"
    );
  }

  if (
    candidate.volume !==
    null
  ) {
    reasons.push(
      `volume ${candidate.volume}`
    );
  }

  if (
    candidate.difficulty !==
    null
  ) {
    reasons.push(
      `difficulty ${candidate.difficulty}`
    );
  }

  if (
    trend.momentumPct !==
      null
  ) {
    reasons.push(
      `3m momentum ${trend.momentumPct}%`
    );
  }

  if (
    trending.has(
      normalize(
        candidate.keyword
      )
    )
  ) {
    reasons.push(
      "Google Trends rising/top query"
    );
  }

  if (
    existing &&
    existing.impressions > 0
  ) {
    reasons.push(
      `GSC ${existing.impressions} impressions`
    );
  }

  const breakdown = {
    intentMatch:
      round(
        intentMatch *
          25
      ),

    businessRelevance:
      round(
        businessRelevance *
          20
      ),

    rankability:
      round(
        rankability *
          15
      ),

    demand:
      round(
        demand *
          10
      ),

    trendMomentum:
      round(
        trendMomentum *
          10
      ),

    gscOpportunity:
      round(
        gsc *
          10
      ),

    commercialValue:
      round(
        commercial *
          5
      ),

    topicalAuthority:
      round(
        authority *
          5
      ),

    penalties:
      round(
        penalties
      ),
  };

  const score =
    clamp(
      breakdown.intentMatch +
        breakdown.businessRelevance +
        breakdown.rankability +
        breakdown.demand +
        breakdown.trendMomentum +
        breakdown.gscOpportunity +
        breakdown.commercialValue +
        breakdown.topicalAuthority -
        breakdown.penalties,
      0,
      100
    );

  return {
    keyword:
      candidate.keyword,

    score:
      round(
        score,
        1
      ),

    source:
      Array.from(
        candidate.sources
      ),

    searchVolume:
      candidate.volume,

    difficulty:
      candidate.difficulty,

    cpc:
      candidate.cpc,

    existingPosition:
      existing?.position ??
      candidate.position,

    impressions:
      existing?.impressions ??
      candidate.impressions,

    clicks:
      existing?.clicks ??
      candidate.clicks,

    intent,

    trend,

    breakdown,

    reasons,
  };
}


export function normalizeOutline(
  outline: ContentOutlineSection[],
  strategy: ContentStrategy
): ContentOutlineSection[] {
  const result: ContentOutlineSection[] = [];
  const seen = new Set<string>();

  let hasParentH2 = false;

  for (const raw of outline) {
    const heading = raw.heading
      .replace(/^#{1,6}\s*/, "")
      .trim();

    const key = normalize(heading);

    if (!heading || !key || seen.has(key)) {
      continue;
    }

    let level: 2 | 3 =
      raw.level === 3
        ? 3
        : 2;

    if (level === 3 && !hasParentH2) {
      level = 2;
    }

    if (level === 2) {
      hasParentH2 = true;
    }

    seen.add(key);

    result.push({
      heading,
      level,
      summary: raw.summary.trim(),
    });
  }

  if (result.some((section) => section.level === 2)) {
    return result;
  }

  const semanticTopics = [
    strategy.primary.keyword,
    ...strategy.secondary.map((item) => item.keyword),
    ...strategy.supporting.map((item) => item.keyword),
  ];

  const uniqueTopics: string[] = [];
  const topicKeys = new Set<string>();

  for (const topic of semanticTopics) {
    const key = normalize(topic);

    if (!key || topicKeys.has(key)) {
      continue;
    }

    topicKeys.add(key);
    uniqueTopics.push(topic);
  }

  return uniqueTopics.map((topic, index) => ({
    heading:
      index === 0
        ? `Understanding ${topic}`
        : topic,

    level: 2 as const,

    summary:
      index === 0
        ? `Answer the primary search intent for ${topic} directly.`
        : `Cover this distinct semantic subtopic only if it materially helps satisfy the search intent.`,
  }));
}

export async function buildContentStrategy({
  websiteId,
  topic,
  businessName,
}: {
  websiteId: string;
  topic: string;
  businessName: string;
}): Promise<ContentStrategy> {
  const [
    context,
    website,
    briefs,
    trends,
  ] =
    await Promise.all([
      getWebsiteKeywordContext(
        websiteId
      ).catch(
        () => null
      ),

      prisma.website.findUnique({
        where: {
          id:
            websiteId,
        },

        select: {
          business: {
            select: {
              industry:
                true,
            },
          },
        },
      }),

      prisma.contentBrief.findMany({
        where: {
          websiteId,
        },

        select: {
          id: true,
          topic: true,
          primaryKeyword:
            true,

          articles: {
            select: {
              status: true,
              publishedUrl:
                true,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          50,
      }),

      fetchTrendingQueries(
        topic,
        "US"
      ).catch(
        () => null
      ),
    ]);

  let related:
    RelatedKeywordResult[] =
      [];

  try {
    related =
      (
        await fetchRelatedKeywords(
          topic
        )
      ).slice(
        0,
        40
      );
  } catch (error) {
    console.warn(
      "[content strategy] related keywords unavailable:",
      error instanceof Error
        ? error.message
        : "unknown error"
    );
  }

  const existing =
    context?.topKeywords ??
    [];

  const candidates =
    new Map<
      string,
      Candidate
    >();

  addCandidate(
    candidates,
    {
      keyword:
        topic,

      sources:
        new Set([
          "TOPIC",
        ]),

      volume:
        null,

      difficulty:
        null,

      cpc:
        null,

      monthly:
        [],

      position:
        null,

      impressions:
        0,

      clicks:
        0,
    }
  );

  for (
    const keyword of
    existing
  ) {
    addCandidate(
      candidates,
      {
        keyword:
          keyword.keyword,

        sources:
          new Set([
            "SITE_KEYWORD",
            "GSC",
          ]),

        volume:
          keyword.volume,

        difficulty:
          keyword.difficulty,

        cpc:
          null,

        monthly:
          [],

        position:
          keyword.position,

        impressions:
          keyword.impressions,

        clicks:
          keyword.clicks,
      }
    );
  }

  for (
    const keyword of
    related
  ) {
    addCandidate(
      candidates,
      {
        keyword:
          keyword.keyword,

        sources:
          new Set([
            "DATAFORSEO_RELATED",
          ]),

        volume:
          keyword.searchVolume,

        difficulty:
          keyword.keywordDifficulty,

        cpc:
          keyword.cpc,

        monthly:
          keyword.monthlySearches,

        position:
          null,

        impressions:
          0,

        clicks:
          0,
      }
    );
  }

  const trendSet =
    new Set<string>();

  for (
    const item of [
      ...(trends?.topQueries ??
        []),
      ...(trends?.risingQueries ??
        []),
    ]
  ) {
    const keyword =
      typeof item ===
      "string"
        ? item
        : (
            "query" in item &&
            typeof item.query ===
              "string"
              ? item.query
              : ""
          );

    if (!keyword) {
      continue;
    }

    trendSet.add(
      normalize(
        keyword
      )
    );

    addCandidate(
      candidates,
      {
        keyword,

        sources:
          new Set([
            "GOOGLE_TRENDS",
          ]),

        volume:
          null,

        difficulty:
          null,

        cpc:
          null,

        monthly:
          [],

        position:
          null,

        impressions:
          0,

        clicks:
          0,
      }
    );
  }

  const values =
    Array.from(
      candidates.values()
    );

  const maxVolume =
    Math.max(
      1,
      ...values.map(
        (item) =>
          item.volume ??
          0
      )
    );

  const maxCpc =
    Math.max(
      0.01,
      ...values.map(
        (item) =>
          item.cpc ??
          0
      )
    );

  const topicIntent =
    classifySearchIntent(
      topic
    );

  const industry =
    website?.business
      .industry ??
    "";

  const scored =
    values
      .map(
        (candidate) =>
          scoreCandidate({
            candidate,
            topic,
            topicIntent,
            businessName,
            industry,
            existingKeywords:
              existing,
            briefs,
            maxVolume,
            maxCpc,
            trending:
              trendSet,
          })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const authorityShadow =
    applyTopicAuthorityShadow({
      candidates:
        scored,

      siteKeywords:
        existing.map(
          (item) => ({
            keyword:
              item.keyword,

            impressions:
              item.impressions,

            clicks:
              item.clicks,

            position:
              item.position,
          })
        ),

      contentTopics:
        briefs.map(
          (brief) => ({
            topic:
              brief.topic,

            published:
              brief.articles.some(
                (article) =>
                  article.status ===
                    "PUBLISHED" ||
                  Boolean(
                    article.publishedUrl
                  )
              ),
          })
        ),
    });

  console.info(
    "[content strategy shadow] topic authority",
    {
      topic,

      productionPrimary:
        scored[0]?.keyword ??
        topic,

      shadowPrimary:
        authorityShadow[0]
          ?.candidate
          .keyword ??
        topic,

      changed:
        Boolean(
          scored[0] &&
          authorityShadow[0] &&
          scored[0].keyword !==
            authorityShadow[0]
              .candidate
              .keyword
        ),

      topCandidates:
        authorityShadow
          .slice(0, 10)
          .map(
            (item) => ({
              keyword:
                item.candidate
                  .keyword,

              productionScore:
                item.originalScore,

              authorityStrength:
                item.authority
                  .strength,

              authorityConfidence:
                item.authority
                  .confidence,

              authorityBoost:
                item.authorityBoost,

              shadowScore:
                item.shadowScore,

              relevantQueries:
                item.authority
                  .relevantQueries,

              impressions:
                item.authority
                  .impressions,

              clicks:
                item.authority
                  .clicks,

              top3:
                item.authority
                  .top3Queries,

              top10:
                item.authority
                  .top10Queries,

              top20:
                item.authority
                  .top20Queries,

              weightedPosition:
                item.authority
                  .weightedPosition,

              supportingPages:
                item.authority
                  .publishedSupportingPages,
            })
          ),
    }
  );

  const keywordDecisionShadow =
    buildKeywordDecisionShadow({
      topic,

      topicIntent,

      candidates:
        authorityShadow.map(
          (item) => ({
            keyword:
              item.candidate.keyword,

            score:
              item.candidate.score,

            intent:
              item.candidate.intent,

            searchVolume:
              item.candidate.searchVolume,

            difficulty:
              item.candidate.difficulty,

            existingPosition:
              item.candidate.existingPosition,

            impressions:
              item.candidate.impressions,

            clicks:
              item.candidate.clicks,

            businessRelevance:
              item.candidate.breakdown
                .businessRelevance,

            authority:
              item.authority,
          })
        ),
    });

  console.info(
    "[content strategy shadow] keyword decision",
    {
      topic,

      status:
        keywordDecisionShadow.status,

      confidence:
        keywordDecisionShadow.confidence,

      productionPrimary:
        scored[0]?.keyword ??
        topic,

      decisionPrimary:
        keywordDecisionShadow.primary
          ?.keyword ??
        null,

      changed:
        Boolean(
          scored[0] &&
          keywordDecisionShadow.primary &&
          scored[0].keyword !==
            keywordDecisionShadow.primary.keyword
        ),

      secondary:
        keywordDecisionShadow.secondary.map(
          (item) =>
            item.keyword
        ),

      topCandidates:
        keywordDecisionShadow.ranked
          .slice(0, 10)
          .map(
            (item) => ({
              keyword:
                item.keyword,

              eligible:
                item.eligible,

              decisionScore:
                item.decisionScore,

              originalScore:
                item.originalScore,

              evidenceConfidence:
                item.evidenceConfidence,

              difficulty:
                item.metrics.difficulty,

              impressions:
                item.metrics.impressions,

              clicks:
                item.metrics.clicks,

              position:
                item.metrics.existingPosition,

              authority:
                item.metrics.authorityStrength,

              blockers:
                item.blockers,

              reasons:
                item.reasons,
            })
          ),
    }
  );

  const primary =
    scored[0] ?? {
      keyword:
        topic,
      score:
        50,
      source: [
        "TOPIC",
      ],
      searchVolume:
        null,
      difficulty:
        null,
      cpc:
        null,
      existingPosition:
        null,
      impressions:
        0,
      clicks:
        0,
      intent:
        topicIntent,
      trend:
        computeTrendAnalysis(
          []
        ),
      breakdown: {
        intentMatch:
          25,
        businessRelevance:
          20,
        rankability:
          7.5,
        demand:
          2,
        trendMomentum:
          4.5,
        gscOpportunity:
          0,
        commercialValue:
          1,
        topicalAuthority:
          1.75,
        penalties:
          0,
      },
      reasons: [
        "topic fallback",
      ],
    };

  const secondary =
    scored
      .filter(
        (item) =>
          normalize(
            item.keyword
          ) !==
            normalize(
              primary.keyword
            ) &&
          item.score >=
            42 &&
          (
            item.intent ===
              primary.intent ||
            keywordSimilarity(
              item.keyword,
              primary.keyword
            ) >=
              0.25
          )
      )
      .slice(
        0,
        8
      );

  const secondarySet =
    new Set(
      secondary.map(
        (item) =>
          normalize(
            item.keyword
          )
      )
    );

  const supporting =
    scored
      .filter(
        (item) =>
          normalize(
            item.keyword
          ) !==
            normalize(
              primary.keyword
            ) &&
          !secondarySet.has(
            normalize(
              item.keyword
            )
          ) &&
          item.score >=
            30
      )
      .slice(
        0,
        8
      );

  const selected =
    new Set([
      normalize(
        primary.keyword
      ),
      ...secondary.map(
        (item) =>
          normalize(
            item.keyword
          )
      ),
      ...supporting.map(
        (item) =>
          normalize(
            item.keyword
          )
      ),
    ]);

  const excluded =
    scored
      .filter(
        (item) =>
          !selected.has(
            normalize(
              item.keyword
            )
          )
      )
      .slice(
        0,
        12
      );

  const duplicate =
    duplicateMatch(
      topic,
      primary.keyword,
      briefs
    );

  const alreadyPublished =
    duplicate.brief
      ?.articles.some(
        (article) =>
          article.status ===
            "PUBLISHED" ||
          Boolean(
            article.publishedUrl
          )
      ) ??
    false;

  const action:
    ContentStrategy["action"] =
      duplicate.brief &&
      duplicate.similarity >=
        0.82 &&
      alreadyPublished
        ? {
            type:
              "UPDATE_EXISTING",

            existingBriefId:
              duplicate.brief.id,

            existingTopic:
              duplicate.brief.topic,

            similarity:
              round(
                duplicate.similarity,
                2
              ),

            reason:
              "A published page already targets substantially the same intent. Update it rather than create a competing URL.",
          }
        : duplicate.brief &&
          duplicate.similarity >=
            0.65
          ? {
              type:
                "MERGE_OR_UPDATE",

              existingBriefId:
                duplicate.brief.id,

              existingTopic:
                duplicate.brief.topic,

              similarity:
                round(
                  duplicate.similarity,
                  2
                ),

              reason:
                "Existing content overlaps this cluster. Review or merge it before creating another indexable page.",
            }
          : {
              type:
                "CREATE_NEW",

              existingBriefId:
                null,

              existingTopic:
                null,

              similarity:
                round(
                  duplicate.similarity,
                  2
                ),

              reason:
                "No strong existing-content overlap was found.",
            };

  return {
    topic,

    searchIntent:
      primary.intent,

    action,

    primary,
    secondary,
    supporting,
    excluded,

    headingPolicy: {
      h1:
        1,

      h2:
        "AS_NEEDED",

      h3:
        "ONLY_WHEN_NEEDED",

      maxDepth:
        3,

      noOrphanH3:
        true,

      noDuplicateHeadings:
        true,

      noHeadingForKeywordStuffing:
        true,
    },

    qualityRequirements: {
      oneH1:
        true,
      directAnswer:
        true,
      noKeywordStuffing:
        true,
      semanticHeadings:
        true,
      internalLinks:
        true,
      sourceEvidenceWhenNeeded:
        true,
      articleSchema:
        true,
      breadcrumbSchema:
        true,
      authorMetadata:
        true,
      datePublished:
        true,
      dateModified:
        true,
    },

    measurementPlan: {
      searchConsole:
        true,
      rankTracking:
        true,
      ga4:
        true,
      cloudflareVerifiedBots:
        true,
      aiCrawlerReadiness:
        true,
    },
  };
}
