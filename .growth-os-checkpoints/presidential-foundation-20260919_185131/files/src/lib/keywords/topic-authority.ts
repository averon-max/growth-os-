export interface AuthorityKeywordSignal {
  keyword: string;
  impressions: number;
  clicks: number;
  position: number | null;
}

export interface AuthorityContentSignal {
  topic: string;
  published: boolean;
}

export interface TopicAuthorityEvidence {
  keyword: string;
  affinity: number;
  impressions: number;
  clicks: number;
  position: number | null;
}

export interface TopicAuthorityProfile {
  keyword: string;

  strength: number;

  confidence:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  relevantQueries: number;
  publishedSupportingPages: number;

  impressions: number;
  clicks: number;

  top3Queries: number;
  top10Queries: number;
  top20Queries: number;

  weightedPosition: number | null;

  components: {
    queryBreadth: number;
    searchVisibility: number;
    rankingFootprint: number;
    contentSupport: number;
  };

  evidence:
    TopicAuthorityEvidence[];
}

export interface TopicAuthorityShadowCandidate<T> {
  candidate: T;
  authority: TopicAuthorityProfile;
  originalScore: number;
  authorityBoost: number;
  shadowScore: number;
}

const STOPWORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "best",
    "by",
    "can",
    "do",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "with",
    "your",
  ]);

function clamp01(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function round(
  value: number,
  places = 4
): number {
  const scale =
    10 ** places;

  return (
    Math.round(
      value *
        scale
    ) /
    scale
  );
}

function normalize(
  value: string
): string {
  return value
    .toLocaleLowerCase(
      "en-US"
    )
    .normalize(
      "NFKD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s-]/g,
      " "
    )
    .replace(
      /-/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function stem(
  raw: string
): string {
  let value =
    raw.toLowerCase();

  if (
    value.length > 6 &&
    value.endsWith(
      "ing"
    )
  ) {
    value =
      value.slice(
        0,
        -3
      );
  } else if (
    value.length > 5 &&
    value.endsWith(
      "ies"
    )
  ) {
    value =
      `${value.slice(
        0,
        -3
      )}y`;
  } else if (
    value.length > 5 &&
    value.endsWith(
      "ers"
    )
  ) {
    value =
      value.slice(
        0,
        -3
      );
  } else if (
    value.length > 5 &&
    value.endsWith(
      "er"
    )
  ) {
    value =
      value.slice(
        0,
        -2
      );
  } else if (
    value.length > 5 &&
    value.endsWith(
      "ed"
    )
  ) {
    value =
      value.slice(
        0,
        -2
      );
  } else if (
    value.length > 4 &&
    value.endsWith(
      "s"
    ) &&
    !value.endsWith(
      "ss"
    )
  ) {
    value =
      value.slice(
        0,
        -1
      );
  }

  return value;
}

function tokens(
  value: string
): string[] {
  return Array.from(
    new Set(
      normalize(
        value
      )
        .split(
          " "
        )
        .map(
          stem
        )
        .filter(
          (token) =>
            token.length >=
              3 &&
            !STOPWORDS.has(
              token
            )
        )
    )
  );
}

export function topicAffinity(
  left: string,
  right: string
): number {
  const a =
    normalize(
      left
    );

  const b =
    normalize(
      right
    );

  if (
    !a ||
    !b
  ) {
    return 0;
  }

  if (
    a === b
  ) {
    return 1;
  }

  if (
    a.includes(
      b
    ) ||
    b.includes(
      a
    )
  ) {
    return 0.95;
  }

  const leftTokens =
    tokens(
      left
    );

  const rightTokens =
    tokens(
      right
    );

  if (
    leftTokens.length ===
      0 ||
    rightTokens.length ===
      0
  ) {
    return 0;
  }

  const rightSet =
    new Set(
      rightTokens
    );

  const shared =
    leftTokens.filter(
      (token) =>
        rightSet.has(
          token
        )
    ).length;

  /*
   * One generic shared token is not enough.
   *
   * Example:
   * "credit monitoring"
   * vs
   * "dark web monitoring"
   *
   * must NOT become strong topical evidence
   * merely because both contain "monitoring".
   */
  if (
    shared <
      2 &&
    Math.min(
      leftTokens.length,
      rightTokens.length
    ) >
      1
  ) {
    return 0;
  }

  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size;

  const leftCoverage =
    shared /
    leftTokens.length;

  const rightCoverage =
    shared /
    rightTokens.length;

  const jaccard =
    union > 0
      ? shared /
        union
      : 0;

  return round(
    clamp01(
      leftCoverage *
        0.4 +
        rightCoverage *
          0.35 +
        jaccard *
          0.25
    )
  );
}

function positionStrength(
  position:
    number | null
): number {
  if (
    position ===
      null ||
    !Number.isFinite(
      position
    ) ||
    position <= 0
  ) {
    return 0;
  }

  if (
    position <= 3
  ) {
    return 1;
  }

  if (
    position <= 10
  ) {
    return 0.82;
  }

  if (
    position <= 20
  ) {
    return 0.58;
  }

  if (
    position <= 50
  ) {
    return 0.3;
  }

  if (
    position <= 100
  ) {
    return 0.12;
  }

  return 0;
}

function logarithmicSignal(
  value: number,
  reference: number
): number {
  if (
    value <= 0
  ) {
    return 0;
  }

  return clamp01(
    Math.log1p(
      value
    ) /
      Math.log1p(
        reference
      )
  );
}

export function buildTopicAuthorityProfile({
  keyword,
  siteKeywords,
  contentTopics = [],
}: {
  keyword: string;

  siteKeywords:
    AuthorityKeywordSignal[];

  contentTopics?:
    AuthorityContentSignal[];
}): TopicAuthorityProfile {
  const evidence =
    siteKeywords
      .map(
        (signal) => ({
          signal,

          affinity:
            topicAffinity(
              keyword,
              signal.keyword
            ),
        })
      )
      .filter(
        ({
          affinity,
        }) =>
          affinity >=
          0.34
      )
      .map(
        ({
          signal,
          affinity,
        }) => ({
          keyword:
            signal.keyword,

          affinity,

          impressions:
            Math.max(
              0,
              signal.impressions
            ),

          clicks:
            Math.max(
              0,
              signal.clicks
            ),

          position:
            signal.position,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.impressions -
            a.impressions ||
          b.clicks -
            a.clicks ||
          b.affinity -
            a.affinity
      );

  const totalImpressions =
    evidence.reduce(
      (
        total,
        item
      ) =>
        total +
        item.impressions,
      0
    );

  const totalClicks =
    evidence.reduce(
      (
        total,
        item
      ) =>
        total +
        item.clicks,
      0
    );

  const ranked =
    evidence.filter(
      (item) =>
        item.position !==
          null &&
        item.position >
          0
    );

  const top3 =
    ranked.filter(
      (item) =>
        (
          item.position ??
          Infinity
        ) <= 3
    ).length;

  const top10 =
    ranked.filter(
      (item) =>
        (
          item.position ??
          Infinity
        ) <= 10
    ).length;

  const top20 =
    ranked.filter(
      (item) =>
        (
          item.position ??
          Infinity
        ) <= 20
    ).length;

  let weightedPosition:
    number | null =
      null;

  if (
    ranked.length >
    0
  ) {
    let weightedTotal =
      0;

    let weightTotal =
      0;

    for (
      const item
      of ranked
    ) {
      const weight =
        Math.max(
          1,
          item.impressions
        ) *
        Math.max(
          0.34,
          item.affinity
        );

      weightedTotal +=
        (
          item.position ??
          0
        ) *
        weight;

      weightTotal +=
        weight;
    }

    if (
      weightTotal >
      0
    ) {
      weightedPosition =
        round(
          weightedTotal /
            weightTotal,
          2
        );
    }
  }

  const supportingPages =
    contentTopics.filter(
      (item) =>
        item.published &&
        topicAffinity(
          keyword,
          item.topic
        ) >=
          0.34
    ).length;

  const queryBreadth =
    clamp01(
      evidence.length /
        8
    );

  const searchVisibility =
    logarithmicSignal(
      totalImpressions,
      5000
    );

  let rankingFootprint =
    0;

  if (
    evidence.length >
    0
  ) {
    const weightedRankStrength =
      evidence.reduce(
        (
          total,
          item
        ) =>
          total +
          positionStrength(
            item.position
          ) *
            Math.max(
              0.34,
              item.affinity
            ),
        0
      );

    const denominator =
      evidence.reduce(
        (
          total,
          item
        ) =>
          total +
          Math.max(
            0.34,
            item.affinity
          ),
        0
      );

    rankingFootprint =
      denominator >
        0
        ? clamp01(
            weightedRankStrength /
              denominator
          )
        : 0;
  }

  const contentSupport =
    clamp01(
      supportingPages /
        4
    );

  /*
   * Internal Growth OS evidence score.
   *
   * NOT a Google metric.
   * NOT a claimed ranking factor.
   *
   * It measures how much first-party evidence
   * we have that this website already has
   * topical search traction around the query.
   */
  const strength =
    round(
      clamp01(
        queryBreadth *
          0.3 +
        searchVisibility *
          0.3 +
        rankingFootprint *
          0.25 +
        contentSupport *
          0.15
      )
    );

  const evidencePoints =
    evidence.length +
    supportingPages;

  const confidence:
    TopicAuthorityProfile["confidence"] =
      evidencePoints >=
          6 &&
        (
          totalImpressions >=
            250 ||
          top20 >=
            3
        )
        ? "HIGH"
        : evidencePoints >=
              2 ||
            totalImpressions >=
              50
          ? "MEDIUM"
          : "LOW";

  return {
    keyword,

    strength,

    confidence,

    relevantQueries:
      evidence.length,

    publishedSupportingPages:
      supportingPages,

    impressions:
      totalImpressions,

    clicks:
      totalClicks,

    top3Queries:
      top3,

    top10Queries:
      top10,

    top20Queries:
      top20,

    weightedPosition,

    components: {
      queryBreadth:
        round(
          queryBreadth
        ),

      searchVisibility:
        round(
          searchVisibility
        ),

      rankingFootprint:
        round(
          rankingFootprint
        ),

      contentSupport:
        round(
          contentSupport
        ),
    },

    evidence:
      evidence.slice(
        0,
        20
      ),
  };
}

export function applyTopicAuthorityShadow<
  T extends {
    keyword: string;
    score: number;
  },
>({
  candidates,
  siteKeywords,
  contentTopics = [],
}: {
  candidates: T[];

  siteKeywords:
    AuthorityKeywordSignal[];

  contentTopics?:
    AuthorityContentSignal[];
}): Array<
  TopicAuthorityShadowCandidate<T>
> {
  return candidates
    .map(
      (
        candidate
      ) => {
        const authority =
          buildTopicAuthorityProfile({
            keyword:
              candidate.keyword,

            siteKeywords,

            contentTopics,
          });

        /*
         * Shadow only.
         *
         * Max +12 points is intentionally
         * bounded so authority can break
         * close decisions but cannot rescue
         * an otherwise terrible candidate.
         */
        const authorityBoost =
          round(
            authority.strength *
              12,
            2
          );

        return {
          candidate,

          authority,

          originalScore:
            candidate.score,

          authorityBoost,

          shadowScore:
            round(
              candidate.score +
                authorityBoost,
              2
            ),
        };
      }
    )
    .sort(
      (
        a,
        b
      ) =>
        b.shadowScore -
          a.shadowScore ||
        b.originalScore -
          a.originalScore
    );
}
