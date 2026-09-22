import {
  prisma,
} from "@/lib/prisma";

export type BusinessCompatibilityStatus =
  | "SUPPORTED"
  | "EDUCATIONAL_ONLY"
  | "UNVERIFIED"
  | "CONFLICT";

export interface BusinessCompatibilityFact {
  id: string;
  type: string;
  claim: string;
  status: string;
  evidenceStatus: string;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  version?: number | null;
}

export interface BusinessCompatibilityResult {
  status:
    BusinessCompatibilityStatus;

  keyword:
    string;

  reason:
    string;

  verifiedFreshFacts:
    number;

  matchingFacts:
    Array<{
      id:
        string;

      type:
        string;

      claim:
        string;

      sourceUrl:
        string | null;

      sourceLabel:
        string | null;
    }>;

  ignoredFacts: {
    proposed:
      number;

    rejected:
      number;

    archived:
      number;

    notFresh:
      number;
  };
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
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "your",
    "my",
  ]);

const PRODUCT_FACT_TYPES =
  new Set([
    "CAPABILITY",
    "DIFFERENTIATOR",
    "POLICY",
    "COMPLIANCE",
    "DATA_SOURCE",
  ]);

function stemToken(
  input: string
): string {
  let token =
    input
      .toLowerCase()
      .trim();

  if (
    token.length >
      5 &&
    token.endsWith(
      "ing"
    )
  ) {
    token =
      token.slice(
        0,
        -3
      );
  } else if (
    token.length >
      4 &&
    token.endsWith(
      "ies"
    )
  ) {
    token =
      `${token.slice(
        0,
        -3
      )}y`;
  } else if (
    token.length >
      4 &&
    token.endsWith(
      "ed"
    )
  ) {
    token =
      token.slice(
        0,
        -2
      );
  } else if (
    token.length >
      4 &&
    token.endsWith(
      "s"
    )
  ) {
    token =
      token.slice(
        0,
        -1
      );
  }

  return token;
}

function tokens(
  input: string
): string[] {
  return input
    .toLowerCase()
    .replace(
      /[^a-z0-9\s-]/g,
      " "
    )
    .split(
      /\s+/
    )
    .map(
      (
        token
      ) =>
        stemToken(
          token
        )
    )
    .filter(
      (
        token
      ) =>
        token.length >
          1 &&
        !STOP_WORDS.has(
          token
        )
    );
}

function factMatchesKeyword(
  factClaim: string,
  keyword: string
): boolean {
  const keywordTokens =
    tokens(
      keyword
    );

  if (
    keywordTokens.length ===
    0
  ) {
    return false;
  }

  const factTokens =
    new Set(
      tokens(
        factClaim
      )
    );

  return keywordTokens.every(
    (
      token
    ) =>
      factTokens.has(
        token
      )
  );
}

function containsExplicitNegation(
  claim: string
): boolean {
  const normalized =
    claim
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );

  return (
    /\bdoes not\b/.test(
      normalized
    ) ||
    /\bdo not\b/.test(
      normalized
    ) ||
    /\bdoesn't\b/.test(
      normalized
    ) ||
    /\bdon't\b/.test(
      normalized
    ) ||
    /\bnot offer\b/.test(
      normalized
    ) ||
    /\bnot provide\b/.test(
      normalized
    ) ||
    /\bnever offers?\b/.test(
      normalized
    ) ||
    /\bnever provides?\b/.test(
      normalized
    )
  );
}

export function isClearlyInformationalKeyword(
  keyword: string
): boolean {
  const value =
    keyword
      .trim()
      .toLowerCase();

  return (
    /^(what|why|how|when|where|who)\b/.test(
      value
    ) ||
    /^(guide|meaning|definition|understanding)\b/.test(
      value
    ) ||
    /\bhow to\b/.test(
      value
    ) ||
    /\bwhat is\b/.test(
      value
    ) ||
    /\bwhat are\b/.test(
      value
    )
  );
}

export function evaluateBusinessCompatibility({
  keyword,
  facts,
}: {
  keyword: string;
  facts:
    BusinessCompatibilityFact[];
}): BusinessCompatibilityResult {
  const ignoredFacts = {
    proposed:
      0,

    rejected:
      0,

    archived:
      0,

    notFresh:
      0,
  };

  const usable:
    BusinessCompatibilityFact[] =
    [];

  for (
    const fact of
    facts
  ) {
    if (
      fact.status ===
      "PROPOSED"
    ) {
      ignoredFacts.proposed +=
        1;

      continue;
    }

    if (
      fact.status ===
      "REJECTED"
    ) {
      ignoredFacts.rejected +=
        1;

      continue;
    }

    if (
      fact.status ===
      "ARCHIVED"
    ) {
      ignoredFacts.archived +=
        1;

      continue;
    }

    if (
      fact.status !==
        "VERIFIED" ||
      fact.evidenceStatus !==
        "FRESH"
    ) {
      ignoredFacts.notFresh +=
        1;

      continue;
    }

    usable.push(
      fact
    );
  }

  const matching =
    usable.filter(
      (
        fact
      ) =>
        PRODUCT_FACT_TYPES.has(
          fact.type
        ) &&
        factMatchesKeyword(
          fact.claim,
          keyword
        )
    );

  const conflicts =
    matching.filter(
      (
        fact
      ) =>
        containsExplicitNegation(
          fact.claim
        )
    );

  const positiveMatches =
    matching.filter(
      (
        fact
      ) =>
        !containsExplicitNegation(
          fact.claim
        )
    );

  const toEvidence =
    (
      list:
        BusinessCompatibilityFact[]
    ) =>
      list.map(
        (
          fact
        ) => ({
          id:
            fact.id,

          type:
            fact.type,

          claim:
            fact.claim,

          sourceUrl:
            fact.sourceUrl ??
            null,

          sourceLabel:
            fact.sourceLabel ??
            null,
        })
      );

  if (
    conflicts.length >
    0
  ) {
    return {
      status:
        "CONFLICT",

      keyword,

      reason:
        "Проверенные актуальные данные бизнеса прямо противоречат этому предложению. Создавать продуктовую или коммерческую страницу по такому запросу нельзя.",

      verifiedFreshFacts:
        usable.length,

      matchingFacts:
        toEvidence(
          conflicts
        ),

      ignoredFacts,
    };
  }

  if (
    positiveMatches.length >
    0
  ) {
    return {
      status:
        "SUPPORTED",

      keyword,

      reason:
        "Проверенные актуальные Business Facts подтверждают, что тема соответствует реальным возможностям или политике бизнеса.",

      verifiedFreshFacts:
        usable.length,

      matchingFacts:
        toEvidence(
          positiveMatches
        ),

      ignoredFacts,
    };
  }

  if (
    isClearlyInformationalKeyword(
      keyword
    )
  ) {
    return {
      status:
        "EDUCATIONAL_ONLY",

      keyword,

      reason:
        "Запрос явно информационный, но Business Facts не подтверждают, что бизнес предоставляет эту услугу. Допустим только образовательный материал без неподтверждённых продуктовых заявлений.",

      verifiedFreshFacts:
        usable.length,

      matchingFacts:
        [],

      ignoredFacts,
    };
  }

  return {
    status:
      "UNVERIFIED",

    keyword,

    reason:
      "Проверенные актуальные Business Facts не подтверждают, что бизнес предоставляет продукт, услугу или возможность, подразумеваемую этим запросом.",

    verifiedFreshFacts:
      usable.length,

    matchingFacts:
      [],

    ignoredFacts,
  };
}

export async function evaluateBusinessCompatibilityForWebsite({
  websiteId,
  keyword,
}: {
  websiteId: string;
  keyword: string;
}): Promise<BusinessCompatibilityResult> {
  const website =
    await prisma.website.findUnique({
      where: {
        id:
          websiteId,
      },

      select: {
        businessId:
          true,
      },
    });

  if (
    !website
  ) {
    throw new Error(
      "Website not found while evaluating business compatibility."
    );
  }

  const facts =
    await prisma.businessFact.findMany({
      where: {
        businessId:
          website.businessId,
      },

      select: {
        id:
          true,

        type:
          true,

        claim:
          true,

        status:
          true,

        evidenceStatus:
          true,

        sourceUrl:
          true,

        sourceLabel:
          true,

        version:
          true,
      },

      orderBy: [
        {
          createdAt:
            "asc",
        },
        {
          version:
            "asc",
        },
      ],
    });

  return evaluateBusinessCompatibility({
    keyword,

    facts:
      facts.map(
        (
          fact
        ) => ({
          ...fact,

          type:
            String(
              fact.type
            ),

          status:
            String(
              fact.status
            ),

          evidenceStatus:
            String(
              fact.evidenceStatus
            ),
        })
      ),
  });
}
