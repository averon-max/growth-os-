export const EXTERNAL_EVIDENCE_VERSION =
  "EXTERNAL_EVIDENCE_V1" as const;

export type ExternalEvidenceLevel =
  | "VERIFIED_EXCERPT"
  | "SEARCH_SNIPPET"
  | "REFERENCE_ONLY";

export type ExternalEvidenceAuthority =
  | "GOVERNMENT"
  | "CREDIT_BUREAU"
  | "FINANCIAL_INSTITUTION"
  | "PUBLISHER"
  | "OTHER";

export type ExternalEvidenceDiscovery =
  | "VERIFIED_RESEARCH"
  | "SERP_ORGANIC"
  | "AI_OVERVIEW_REFERENCE";

export type EvidenceRequiredClaimCode =
  | "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
  | "EXTERNAL_LEGAL_REQUIRES_EVIDENCE"
  | "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
  | "EXTERNAL_ABSOLUTE_CLAIM_REQUIRES_EVIDENCE";

export interface ExternalEvidenceSource {
  id: string;

  url:
    string;

  domain:
    string;

  title:
    string | null;

  excerpt:
    string | null;

  evidenceLevel:
    ExternalEvidenceLevel;

  authority:
    ExternalEvidenceAuthority;

  discoveredBy:
    ExternalEvidenceDiscovery[];
}

export interface ExternalEvidenceSupport {
  supported:
    boolean;

  sourceId:
    string | null;

  overlap:
    number;

  reason:
    string;
}

type UnknownRecord =
  Record<string, unknown>;

function record(
  value:
    unknown
): UnknownRecord | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function stringValue(
  value:
    unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : null;
}

function normalizeDomain(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}

function domainFromUrl(
  url:
    string
): string {
  try {
    return normalizeDomain(
      new URL(
        url
      ).hostname
    );
  } catch {
    return "";
  }
}

function canonicalUrl(
  value:
    string
): string {
  try {
    const url =
      new URL(
        value
      );

    url.hash =
      "";

    if (
      url.pathname !==
        "/" &&
      url.pathname.endsWith(
        "/"
      )
    ) {
      url.pathname =
        url.pathname.slice(
          0,
          -1
        );
    }

    return url.toString();
  } catch {
    return value
      .trim();
  }
}

function stableHash(
  value:
    string
): string {
  let hash =
    2166136261;

  for (
    let i = 0;
    i <
    value.length;
    i += 1
  ) {
    hash ^=
      value.charCodeAt(
        i
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
  ).toString(
    36
  );
}

export function externalEvidenceSourceId(
  url:
    string
): string {
  return `EXT_${stableHash(
    canonicalUrl(
      url
    ).toLowerCase()
  )}`;
}

function authorityForDomain(
  rawDomain:
    string
): ExternalEvidenceAuthority {
  const domain =
    normalizeDomain(
      rawDomain
    );

  if (
    domain.endsWith(
      ".gov"
    ) ||
    domain ===
      "consumerfinance.gov"
  ) {
    return "GOVERNMENT";
  }

  if (
    domain ===
      "equifax.com" ||
    domain.endsWith(
      ".equifax.com"
    ) ||
    domain ===
      "experian.com" ||
    domain.endsWith(
      ".experian.com"
    ) ||
    domain ===
      "transunion.com" ||
    domain.endsWith(
      ".transunion.com"
    )
  ) {
    return "CREDIT_BUREAU";
  }

  if (
    domain.includes(
      "bank"
    ) ||
    domain ===
      "discover.com" ||
    domain.endsWith(
      ".discover.com"
    )
  ) {
    return "FINANCIAL_INSTITUTION";
  }

  if (
    domain ===
      "cnbc.com" ||
    domain.endsWith(
      ".cnbc.com"
    ) ||
    domain ===
      "lendingtree.com" ||
    domain.endsWith(
      ".lendingtree.com"
    )
  ) {
    return "PUBLISHER";
  }

  return "OTHER";
}

function validEvidenceLevel(
  value:
    unknown
): ExternalEvidenceLevel | null {
  return value ===
      "VERIFIED_EXCERPT" ||
    value ===
      "SEARCH_SNIPPET" ||
    value ===
      "REFERENCE_ONLY"
    ? value
    : null;
}

function validDiscovery(
  value:
    unknown
): ExternalEvidenceDiscovery | null {
  return value ===
      "VERIFIED_RESEARCH" ||
    value ===
      "SERP_ORGANIC" ||
    value ===
      "AI_OVERVIEW_REFERENCE"
    ? value
    : null;
}

function sanitizeEmbeddedSource(
  value:
    unknown
): ExternalEvidenceSource | null {
  const source =
    record(
      value
    );

  if (!source) {
    return null;
  }

  const rawUrl =
    stringValue(
      source.url
    );

  if (!rawUrl) {
    return null;
  }

  const url =
    canonicalUrl(
      rawUrl
    );

  const domain =
    normalizeDomain(
      stringValue(
        source.domain
      ) ??
      domainFromUrl(
        url
      )
    );

  const evidenceLevel =
    validEvidenceLevel(
      source.evidenceLevel
    );

  if (!evidenceLevel) {
    return null;
  }

  const discoveredBy =
    Array.isArray(
      source.discoveredBy
    )
      ? source
          .discoveredBy
          .map(
            validDiscovery
          )
          .filter(
            (
              item
            ): item is ExternalEvidenceDiscovery =>
              item !==
              null
          )
      : [];

  return {
    id:
      externalEvidenceSourceId(
        url
      ),

    url,

    domain,

    title:
      stringValue(
        source.title
      ),

    excerpt:
      stringValue(
        source.excerpt
      ),

    evidenceLevel,

    authority:
      authorityForDomain(
        domain
      ),

    discoveredBy:
      Array.from(
        new Set(
          discoveredBy
        )
      ),
  };
}

function mergeDiscovery(
  current:
    ExternalEvidenceDiscovery[],
  next:
    ExternalEvidenceDiscovery
): ExternalEvidenceDiscovery[] {
  return Array.from(
    new Set([
      ...current,
      next,
    ])
  );
}

export function extractExternalEvidenceSources(
  plan:
    unknown
): ExternalEvidenceSource[] {
  const root =
    record(
      plan
    );

  if (!root) {
    return [];
  }

  if (
    Array.isArray(
      root.externalEvidenceSources
    )
  ) {
    const embedded =
      root
        .externalEvidenceSources
        .map(
          sanitizeEmbeddedSource
        )
        .filter(
          (
            source
          ): source is ExternalEvidenceSource =>
            source !==
            null
        );

    if (
      embedded.length >
      0
    ) {
      return embedded;
    }
  }

  const byUrl =
    new Map<
      string,
      ExternalEvidenceSource
    >();

  const serpSnapshot =
    record(
      root.serpSnapshot
    );

  const organic =
    Array.isArray(
      serpSnapshot?.organic
    )
      ? serpSnapshot.organic
      : [];

  for (
    const raw
    of organic
  ) {
    const item =
      record(
        raw
      );

    if (!item) {
      continue;
    }

    const rawUrl =
      stringValue(
        item.url
      );

    if (!rawUrl) {
      continue;
    }

    const url =
      canonicalUrl(
        rawUrl
      );

    const domain =
      normalizeDomain(
        stringValue(
          item.domain
        ) ??
        domainFromUrl(
          url
        )
      );

    const excerpt =
      stringValue(
        item.description
      );

    byUrl.set(
      url,
      {
        id:
          externalEvidenceSourceId(
            url
          ),

        url,

        domain,

        title:
          stringValue(
            item.title
          ),

        excerpt,

        evidenceLevel:
          excerpt
            ? "SEARCH_SNIPPET"
            : "REFERENCE_ONLY",

        authority:
          authorityForDomain(
            domain
          ),

        discoveredBy: [
          "SERP_ORGANIC",
        ],
      }
    );
  }

  const searchFeatures =
    record(
      root.searchFeatures
    );

  const references =
    Array.isArray(
      searchFeatures
        ?.aiOverviewReferences
    )
      ? searchFeatures
          .aiOverviewReferences
      : [];

  for (
    const raw
    of references
  ) {
    const item =
      record(
        raw
      );

    if (!item) {
      continue;
    }

    const rawUrl =
      stringValue(
        item.url
      );

    if (!rawUrl) {
      continue;
    }

    const url =
      canonicalUrl(
        rawUrl
      );

    const existing =
      byUrl.get(
        url
      );

    if (existing) {
      byUrl.set(
        url,
        {
          ...existing,

          discoveredBy:
            mergeDiscovery(
              existing
                .discoveredBy,
              "AI_OVERVIEW_REFERENCE"
            ),
        }
      );

      continue;
    }

    const domain =
      normalizeDomain(
        stringValue(
          item.domain
        ) ??
        domainFromUrl(
          url
        )
      );

    byUrl.set(
      url,
      {
        id:
          externalEvidenceSourceId(
            url
          ),

        url,

        domain,

        title:
          stringValue(
            item.title
          ),

        excerpt:
          null,

        evidenceLevel:
          "REFERENCE_ONLY",

        authority:
          authorityForDomain(
            domain
          ),

        discoveredBy: [
          "AI_OVERVIEW_REFERENCE",
        ],
      }
    );
  }

  return Array.from(
    byUrl.values()
  );
}

export function withExternalEvidenceSources<
  T extends
    Record<string, unknown>
>(
  plan:
    T
): T & {
  externalEvidenceVersion:
    typeof EXTERNAL_EVIDENCE_VERSION;

  externalEvidenceSources:
    ExternalEvidenceSource[];
} {
  return {
    ...plan,

    externalEvidenceVersion:
      EXTERNAL_EVIDENCE_VERSION,

    externalEvidenceSources:
      extractExternalEvidenceSources(
        plan
      ),
  };
}

function compact(
  value:
    string,
  max:
    number
): string {
  const normalized =
    value
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return normalized.slice(
    0,
    max
  );
}

export function externalEvidenceSourcesPrompt(
  sources:
    ExternalEvidenceSource[]
): string {
  const header = [
    "EXTERNAL SOURCE PROVENANCE — EXTERNAL_EVIDENCE_V1",
    "Only VERIFIED_EXCERPT records are publication-grade evidence for sensitive external claims.",
    "SEARCH_SNIPPET records are discovery context only and must not be treated as verified factual support.",
    "REFERENCE_ONLY records prove only that a referenced URL exists in the captured search context; they do not support factual claims.",
    "Never upgrade an evidence level, invent a quote, or combine multiple weak sources into a stronger claim.",
    "When a VERIFIED_EXCERPT supports a claim, preserve its stable source ID in critic evidence.",
  ];

  if (
    sources.length ===
    0
  ) {
    return [
      ...header,
      "- No external source records are available.",
    ].join(
      "\n"
    );
  }

  const rows =
    sources.map(
      (
        source
      ) => {
        const excerpt =
          source.excerpt
            ? compact(
                source.excerpt,
                500
              )
            : "NONE";

        return [
          `- [${source.id}] level=${source.evidenceLevel} authority=${source.authority}`,
          `  domain=${source.domain || "unknown"}`,
          `  url=${source.url}`,
          `  title=${source.title ?? "unknown"}`,
          `  excerpt=${excerpt}`,
          `  discoveredBy=${source.discoveredBy.join(",") || "unknown"}`,
        ].join(
          "\n"
        );
      }
    );

  return [
    ...header,
    ...rows,
  ].join(
    "\n"
  );
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
    "can",
    "do",
    "does",
    "for",
    "from",
    "has",
    "have",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "may",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "these",
    "they",
    "this",
    "to",
    "was",
    "were",
    "when",
    "with",
    "you",
    "your",
  ]);

function normalizeText(
  value:
    string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9$€£.%]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function evidenceTokens(
  value:
    string
): string[] {
  return (
    normalizeText(
      value
    ).match(
      /[a-z0-9]+(?:\.[0-9]+)?/g
    ) ??
    []
  ).filter(
    (token) =>
      token.length >=
        3 &&
      !STOP_WORDS.has(
        token
      )
  );
}

function lexicalOverlap(
  claim:
    string,
  evidence:
    string
): number {
  const claimTokens =
    Array.from(
      new Set(
        evidenceTokens(
          claim
        )
      )
    );

  if (
    claimTokens.length ===
    0
  ) {
    return 0;
  }

  const evidenceSet =
    new Set(
      evidenceTokens(
        evidence
      )
    );

  const matched =
    claimTokens.filter(
      (token) =>
        evidenceSet.has(
          token
        )
    ).length;

  return matched /
    claimTokens.length;
}

function moneyTokens(
  value:
    string
): string[] {
  const matches =
    value.match(
      /(?:[$€£]\s?\d+(?:\.\d{1,2})?)|(?:\b\d+(?:\.\d{1,2})?\s*(?:usd|cad|eur|gbp|dollars?)\b)/gi
    ) ??
    [];

  return matches.map(
    (item) =>
      item
        .toLowerCase()
        .replace(
          /\s+/g,
          ""
        )
  );
}

function rankingMarker(
  value:
    string
): boolean {
  return /\b(?:top\s+\d+|best|leading|most popular|widely recognized|highest[- ]rated|number one)\b|#1/i.test(
    value
  );
}

function legalMarker(
  value:
    string
): boolean {
  return /\b(?:fair credit reporting act|fcra|federal law|state law|permissible purpose|legally allowed|legally required|legally prohibited|illegal|lawful)\b/i.test(
    value
  );
}

const ABSOLUTE_MARKERS = [
  "immediate alert",
  "immediately alert",
  "immediately alerts",
  "daily credit score",
  "daily alerts",
  "complete view",
  "prevents new creditors",
  "prevent new creditors",
  "simultaneously",
];

function absoluteMarkers(
  value:
    string
): string[] {
  const normalized =
    normalizeText(
      value
    );

  return ABSOLUTE_MARKERS.filter(
    (marker) =>
      normalized.includes(
        marker
      )
  );
}

export function findExternalEvidenceSupport({
  sentence,
  code,
  sources,
}: {
  sentence:
    string;

  code:
    EvidenceRequiredClaimCode;

  sources:
    ExternalEvidenceSource[];
}): ExternalEvidenceSupport {
  let best:
    ExternalEvidenceSupport = {
      supported:
        false,

      sourceId:
        null,

      overlap:
        0,

      reason:
        "No publication-grade VERIFIED_EXCERPT supports this claim.",
    };

  for (
    const source
    of sources
  ) {
    if (
      source.evidenceLevel !==
        "VERIFIED_EXCERPT" ||
      !source.excerpt
    ) {
      continue;
    }

    const overlap =
      lexicalOverlap(
        sentence,
        source.excerpt
      );

    if (
      overlap >
      best.overlap
    ) {
      best = {
        supported:
          false,

        sourceId:
          source.id,

        overlap,

        reason:
          "A verified excerpt exists but does not sufficiently support the claim.",
      };
    }

    if (
      code ===
      "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
    ) {
      const claimMoney =
        moneyTokens(
          sentence
        );

      const sourceMoney =
        new Set(
          moneyTokens(
            source.excerpt
          )
        );

      if (
        claimMoney.length ===
          0 ||
        !claimMoney.every(
          (amount) =>
            sourceMoney.has(
              amount
            )
        ) ||
        overlap <
          0.35
      ) {
        continue;
      }
    }

    if (
      code ===
      "EXTERNAL_LEGAL_REQUIRES_EVIDENCE"
    ) {
      if (
        source.authority !==
          "GOVERNMENT" ||
        !legalMarker(
          sentence
        ) ||
        !legalMarker(
          source.excerpt
        ) ||
        overlap <
          0.4
      ) {
        continue;
      }
    }

    if (
      code ===
      "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
    ) {
      if (
        !rankingMarker(
          source.excerpt
        ) ||
        overlap <
          0.5
      ) {
        continue;
      }
    }

    if (
      code ===
      "EXTERNAL_ABSOLUTE_CLAIM_REQUIRES_EVIDENCE"
    ) {
      const markers =
        absoluteMarkers(
          sentence
        );

      const sourceNormalized =
        normalizeText(
          source.excerpt
        );

      if (
        markers.length ===
          0 ||
        !markers.every(
          (marker) =>
            sourceNormalized.includes(
              marker
            )
        ) ||
        overlap <
          0.4
      ) {
        continue;
      }
    }

    return {
      supported:
        true,

      sourceId:
        source.id,

      overlap:
        Math.round(
          overlap *
          1000
        ) /
        1000,

      reason:
        "The claim is supported by a publication-grade VERIFIED_EXCERPT.",
    };
  }

  return {
    ...best,

    overlap:
      Math.round(
        best.overlap *
        1000
      ) /
      1000,
  };
}
