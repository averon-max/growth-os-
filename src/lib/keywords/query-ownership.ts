export type QueryOwnershipStatus =
  | "EXACT_TOPIC"
  | "TOPIC_EQUIVALENT"
  | "GENERIC_MODIFIER"
  | "UNREQUESTED_ENTITY_MODIFIER"
  | "DIFFERENT_TOPIC";

export interface QueryOwnershipAnalysis {
  status:
    QueryOwnershipStatus;

  topic:
    string;

  keyword:
    string;

  topicTokens:
    string[];

  keywordTokens:
    string[];

  modifiers:
    string[];

  reason:
    string;
}

export interface PrimaryCandidateLike {
  keyword:
    string;

  score:
    number;

  searchVolume?:
    number | null;

  impressions?:
    number;

  clicks?:
    number;
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
    "your",
  ]);

const GENERIC_MODIFIERS =
  new Set([
    "3",
    "three",
    "bureau",
    "bureaus",
    "best",
    "cheap",
    "cost",
    "costs",
    "definition",
    "free",
    "guide",
    "meaning",
    "online",
    "price",
    "prices",
    "pricing",
    "report",
    "reports",
    "review",
    "reviews",
    "service",
    "services",
    "software",
    "tool",
    "tools",
  ]);

function normalize(
  value: string
): string {
  return value
    .toLocaleLowerCase(
      "en-US"
    )
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
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function tokens(
  value: string
): string[] {
  return normalize(
    value
  )
    .split(
      " "
    )
    .filter(
      Boolean
    );
}

function semanticTokens(
  value: string
): string[] {
  return tokens(
    value
  ).filter(
    (token) =>
      !STOP_WORDS.has(
        token
      )
  );
}

function unique(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
    )
  );
}

export function isExplicitInformationalTopic(
  topic: string
): boolean {
  const value =
    normalize(
      topic
    );

  return (
    /^(what|why|how|when|where|who)\b/.test(
      value
    ) ||
    /\bwhat is\b/.test(
      value
    ) ||
    /\bwhat are\b/.test(
      value
    ) ||
    /\bhow to\b/.test(
      value
    )
  );
}

export function analyzeQueryOwnership({
  topic,
  keyword,
}: {
  topic:
    string;

  keyword:
    string;
}): QueryOwnershipAnalysis {
  const normalizedTopic =
    normalize(
      topic
    );

  const normalizedKeyword =
    normalize(
      keyword
    );

  const topicTokens =
    unique(
      semanticTokens(
        topic
      )
    );

  const keywordTokens =
    unique(
      semanticTokens(
        keyword
      )
    );

  if (
    normalizedTopic ===
    normalizedKeyword
  ) {
    return {
      status:
        "EXACT_TOPIC",

      topic,
      keyword,
      topicTokens,
      keywordTokens,

      modifiers:
        [],

      reason:
        "Keyword exactly matches the requested topic.",
    };
  }

  if (
    topicTokens.length ===
    0
  ) {
    return {
      status:
        "DIFFERENT_TOPIC",

      topic,
      keyword,
      topicTokens,
      keywordTokens,

      modifiers:
        keywordTokens,

      reason:
        "The topic has no stable semantic tokens for ownership analysis.",
    };
  }

  const keywordSet =
    new Set(
      keywordTokens
    );

  const containsTopic =
    topicTokens.every(
      (token) =>
        keywordSet.has(
          token
        )
    );

  if (
    !containsTopic
  ) {
    return {
      status:
        "DIFFERENT_TOPIC",

      topic,
      keyword,
      topicTokens,
      keywordTokens,

      modifiers:
        keywordTokens.filter(
          (token) =>
            !topicTokens.includes(
              token
            )
        ),

      reason:
        "Keyword does not contain the complete semantic topic.",
    };
  }

  const topicSet =
    new Set(
      topicTokens
    );

  const modifiers =
    keywordTokens.filter(
      (token) =>
        !topicSet.has(
          token
        )
    );

  if (
    modifiers.length ===
    0
  ) {
    return {
      status:
        "TOPIC_EQUIVALENT",

      topic,
      keyword,
      topicTokens,
      keywordTokens,
      modifiers,

      reason:
        "Keyword expresses the same semantic topic without a new entity modifier.",
    };
  }

  const genericOnly =
    modifiers.every(
      (token) =>
        GENERIC_MODIFIERS.has(
          token
        )
    );

  if (
    genericOnly
  ) {
    return {
      status:
        "GENERIC_MODIFIER",

      topic,
      keyword,
      topicTokens,
      keywordTokens,
      modifiers,

      reason:
        "Keyword adds only generic query modifiers.",
    };
  }

  return {
    status:
      "UNREQUESTED_ENTITY_MODIFIER",

    topic,
    keyword,
    topicTokens,
    keywordTokens,
    modifiers,

    reason:
      "Keyword introduces a specific entity/modifier that is not present in the requested topic.",
  };
}

function hasEvidence(
  candidate:
    PrimaryCandidateLike
): boolean {
  return (
    candidate.score >=
      5 ||
    (
      candidate
        .searchVolume ??
      0
    ) >
      0 ||
    (
      candidate
        .impressions ??
      0
    ) >
      0 ||
    (
      candidate
        .clicks ??
      0
    ) >
      0
  );
}

export function primaryOwnershipCandidates<
  T extends PrimaryCandidateLike
>({
  topic,
  candidates,
}: {
  topic:
    string;

  candidates:
    T[];
}): T[] {
  if (
    candidates.length ===
    0
  ) {
    return [];
  }

  const exact =
    candidates.find(
      (candidate) =>
        normalize(
          candidate.keyword
        ) ===
        normalize(
          topic
        )
    );

  if (
    !exact ||
    !hasEvidence(
      exact
    )
  ) {
    return candidates;
  }

  if (
    !isExplicitInformationalTopic(
      topic
    )
  ) {
    return candidates;
  }

  const filtered =
    candidates.filter(
      (candidate) =>
        analyzeQueryOwnership({
          topic,

          keyword:
            candidate.keyword,
        }).status !==
        "UNREQUESTED_ENTITY_MODIFIER"
    );

  return (
    filtered.length >
    0
  )
    ? filtered
    : candidates;
}

export function selectProductionPrimaryCandidate<
  T extends PrimaryCandidateLike
>({
  topic,
  candidates,
}: {
  topic: string;
  candidates: T[];
}): T | null {
  /*
   * HARD INVARIANT:
   *
   * Raw score, search volume, CPC, KD or topical authority
   * may NEVER resurrect a candidate rejected by query ownership.
   *
   * Eligibility happens before ranking.
   */
  const ownershipPool =
    primaryOwnershipCandidates({
      topic,
      candidates,
    });

  if (
    ownershipPool.length ===
    0
  ) {
    return null;
  }

  /*
   * Explicit informational missions are literal user jobs.
   *
   * "what is credit monitoring"
   * must never silently become
   * "experian credit monitoring",
   * "free credit monitoring",
   * etc.
   */
  if (
    isExplicitInformationalTopic(
      topic
    )
  ) {
    const exact =
      ownershipPool.find(
        (candidate) =>
          normalize(
            candidate.keyword
          ) ===
          normalize(
            topic
          )
      );

    if (
      exact
    ) {
      return exact;
    }
  }

  /*
   * For broader commercial/generic topics, choose the
   * highest-ranked candidate ONLY from the mission-safe pool.
   */
  return (
    ownershipPool[0] ??
    null
  );
}
