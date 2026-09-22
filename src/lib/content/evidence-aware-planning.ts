export type EvidenceSensitiveCategory =
  | "PRICE"
  | "RANKING"
  | "COMPARISON"
  | "LEGAL_CONSENT"
  | "ABSOLUTE_CLAIM";


export interface EvidenceAwareOutlineSection {
  heading: string;
  level: 2 | 3;
  summary: string;
}


interface ExternalEvidenceLike {
  evidenceLevel?: unknown;
  title?: unknown;
  excerpt?: unknown;
  domain?: unknown;
}


function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}


function sourceText(
  source:
    ExternalEvidenceLike
): string {
  return [
    source.title,
    source.excerpt,
    source.domain,
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value ===
          "string"
    )
    .join(" ")
    .toLowerCase();
}


function verifiedSources(
  sources:
    unknown
): ExternalEvidenceLike[] {
  if (
    !Array.isArray(
      sources
    )
  ) {
    return [];
  }

  return sources.filter(
    (
      item
    ): item is ExternalEvidenceLike => {
      const source =
        asRecord(item);

      return Boolean(
        source &&
        source.evidenceLevel ===
          "VERIFIED_EXCERPT" &&
        typeof source.excerpt ===
          "string" &&
        source.excerpt.trim()
      );
    }
  );
}


const CATEGORY_PATTERNS:
  Record<
    EvidenceSensitiveCategory,
    RegExp
  > = {
    PRICE:
      /\b(price|prices|pricing|cost|costs|fee|fees|paid|paying|subscription|premium|trial|free)\b/i,

    RANKING:
      /\b(top|best|rank|ranked|ranking|leading|most popular|widely recognized)\b/i,

    COMPARISON:
      /\b(compare|comparison|compared|versus|vs|better than|cheaper|cheapest)\b/i,

    LEGAL_CONSENT:
      /\b(fcra|fair credit reporting act|legal|law|laws|regulation|regulatory|permissible purpose|consent|permission|unauthorized|without (?:(?:your|me) )?(?:knowledge|knowing))\b/i,

    ABSOLUTE_CLAIM:
      /\b(guarantee|guaranteed|always|never|immediately|instant|instantly|complete protection|prevents all|every bureau|all three bureaus)\b/i,
  };


export function sensitiveEvidenceCategories(
  text:
    string
): EvidenceSensitiveCategory[] {
  return (
    Object.entries(
      CATEGORY_PATTERNS
    ) as Array<
      [
        EvidenceSensitiveCategory,
        RegExp,
      ]
    >
  )
    .filter(
      (
        [
          ,
          pattern,
        ]
      ) =>
        pattern.test(
          text
        )
    )
    .map(
      (
        [
          category,
        ]
      ) =>
        category
    );
}


export function hasVerifiedEvidenceForText({
  text,
  externalEvidenceSources,
}: {
  text: string;
  externalEvidenceSources: unknown;
}): boolean {
  const categories =
    sensitiveEvidenceCategories(
      text
    );

  if (
    categories.length ===
    0
  ) {
    return true;
  }

  const sources =
    verifiedSources(
      externalEvidenceSources
    );

  if (
    sources.length ===
    0
  ) {
    return false;
  }

  return categories.every(
    (category) => {
      const pattern =
        CATEGORY_PATTERNS[
          category
        ];

      return sources.some(
        (source) =>
          pattern.test(
            sourceText(
              source
            )
          )
      );
    }
  );
}


export function countVerifiedExternalEvidence(
  externalEvidenceSources:
    unknown
): number {
  return verifiedSources(
    externalEvidenceSources
  ).length;
}


export function buildEvidenceAwareOutline({
  outline,
  externalEvidenceSources,
}: {
  outline:
    EvidenceAwareOutlineSection[];

  externalEvidenceSources:
    unknown;
}): {
  outline:
    EvidenceAwareOutlineSection[];

  deferredSections:
    EvidenceAwareOutlineSection[];

  verifiedExcerptCount:
    number;
} {
  const kept:
    EvidenceAwareOutlineSection[] =
      [];

  const deferred:
    EvidenceAwareOutlineSection[] =
      [];

  let currentH2Kept =
    true;

  for (
    const section
    of outline
  ) {
    if (
      section.level ===
      2
    ) {
      const allowed =
        hasVerifiedEvidenceForText({
          text: [
            section.heading,
            section.summary,
          ].join(" "),

          externalEvidenceSources,
        });

      currentH2Kept =
        allowed;

      if (
        allowed
      ) {
        kept.push(
          section
        );
      } else {
        deferred.push(
          section
        );
      }

      continue;
    }

    if (
      !currentH2Kept
    ) {
      deferred.push(
        section
      );

      continue;
    }

    const allowed =
      hasVerifiedEvidenceForText({
        text: [
          section.heading,
          section.summary,
        ].join(" "),

        externalEvidenceSources,
      });

    if (
      allowed
    ) {
      kept.push(
        section
      );
    } else {
      deferred.push(
        section
      );
    }
  }

  return {
    outline:
      kept,

    deferredSections:
      deferred,

    verifiedExcerptCount:
      countVerifiedExternalEvidence(
        externalEvidenceSources
      ),
  };
}


export function filterEvidenceAwareQuestions({
  questions,
  externalEvidenceSources,
}: {
  questions:
    string[];

  externalEvidenceSources:
    unknown;
}): {
  questions:
    string[];

  deferredQuestions:
    string[];

  verifiedExcerptCount:
    number;
} {
  const allowed:
    string[] =
      [];

  const deferred:
    string[] =
      [];

  for (
    const question
    of questions
  ) {
    if (
      hasVerifiedEvidenceForText({
        text:
          question,

        externalEvidenceSources,
      })
    ) {
      allowed.push(
        question
      );
    } else {
      deferred.push(
        question
      );
    }
  }

  return {
    questions:
      allowed,

    deferredQuestions:
      deferred,

    verifiedExcerptCount:
      countVerifiedExternalEvidence(
        externalEvidenceSources
      ),
  };
}
