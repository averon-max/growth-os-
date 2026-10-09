import type {
  GeneratedArticle,
} from "./types";

import {
  findExternalEvidenceSupport,
  type ExternalEvidenceSource,
} from "./external-evidence-sources";

export type ExternalEvidenceIssueCode =
  | "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
  | "EXTERNAL_LEGAL_REQUIRES_EVIDENCE"
  | "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
  | "EXTERNAL_ABSOLUTE_CLAIM_REQUIRES_EVIDENCE";

export interface ExternalEvidenceFinding {
  code:
    ExternalEvidenceIssueCode;

  sentence:
    string;

  reason:
    string;
}

function stripMarkdown(
  value:
    string
): string {
  return value
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      " $1 "
    )
    .replace(
      /```[\s\S]*?```/g,
      " "
    )
    .replace(
      /[`*_>#]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function sentences(
  article:
    GeneratedArticle
): string[] {
  const value =
    stripMarkdown(
      [
        article.title,
        article.metaDescription,
        article.h1,
        article.bodyMarkdown,
      ].join(
        "\n"
      )
    );

  return (
    value.match(
      /[^.!?]+(?:[.!?]+|$)/g
    ) ??
    []
  )
    .map(
      (sentence) =>
        sentence.trim()
    )
    .filter(
      (sentence) =>
        sentence.length >=
        12
    );
}

/*
 * RANKING_CONTEXT_CLASSIFIER_V1
 *
 * The lexical ranking markers below intentionally remain broad:
 * best / top N / leading / most popular / etc.
 *
 * But a sentence that explicitly rejects a universal ranking,
 * or states that the "best" choice depends on user-specific
 * criteria, is not itself an external ranking assertion.
 *
 * This exemption is deliberately narrow. It does NOT exempt:
 *
 *   "X is the best service."
 *   "The top 3 services are A, B and C."
 *   "X is a leading provider."
 *   "A, B and C are widely recognized platforms."
 */
function isNonRankingContextStatement(
  sentence:
    string
): boolean {
  const value =
    sentence
      .replace(
        /[“”]/g,
        '"'
      )
      .replace(
        /[‘’]/g,
        "'"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  /*
   * "The best option depends on your needs/scope/context..."
   *
   * This says no universal winner exists; the selection is
   * conditional on user-specific criteria.
   */
  if (
    /\bbest\b.{0,120}\bdepends?\s+on\b/i.test(
      value
    )
  ) {
    return true;
  }


  /*
   * Explicit rejection of a universal ranking:
   *
   * "there is no universal best..."
   * "there is no single best..."
   * "no single service is best..."
   */
  if (
    /\b(?:there\s+(?:is|are)\s+)?no\s+(?:single\s+|universal\s+)*(?:best|top\s+\d+)\b/i.test(
      value
    )
  ) {
    return true;
  }


  if (
    /\bno\s+(?:single\s+)?(?:service|provider|product|option|choice|tool|platform)\s+is\s+(?:the\s+)?best\b/i.test(
      value
    )
  ) {
    return true;
  }


  /*
   * "rather than a universal top three"
   * "instead of a universal best"
   */
  if (
    /\b(?:rather\s+than|instead\s+of)\s+(?:an?\s+)?(?:single\s+|universal\s+)*(?:best|top\s+\d+)\b/i.test(
      value
    )
  ) {
    return true;
  }


  /*
   * Direct negation:
   *
   * "not the best for everyone"
   * "isn't universally the best"
   */
  if (
    /\b(?:is|are|was|were|isn't|aren't|isnt|arent)\s+not?\s+(?:universally\s+)?(?:the\s+)?best\b/i.test(
      value
    )
  ) {
    return true;
  }


  return false;
}


/*
 * NON_RANKING_BEST_USAGE_V1
 *
 * Bare "best" is ambiguous.
 *
 * This policy must require evidence for actual rankings such as:
 *   "X is the best service"
 *   "top 3 providers"
 *   "widely recognized"
 *
 * But ordinary explanatory/advisory English is not a ranking:
 *   "not necessarily the best fit"
 *   "best understood as"
 *   "best used as"
 *   "best way to"
 *   "best practices"
 *
 * Strong external-ranking markers always remain fail-closed.
 */
const STRONG_EXTERNAL_RANKING_MARKER_V1 =
  /\b(?:top\s+\d+|leading|most popular|widely recognized|highest[- ]rated|number one|#1)\b/i;


const NON_RANKING_BEST_USAGE_PATTERNS_V1 =
  [
    /\b(?:not necessarily|not always|may not be|might not be|is not|isn't|are not|aren't)\s+(?:the\s+)?best\s+fit\b/i,

    /\bbest\s+understood\s+as\b/i,

    /\bbest\s+used\s+as\b/i,

    /*
     * NON_RANKING_INTERPRETIVE_PASSIVE_BEST_V1
     *
     * Interpretive language such as:
     *   "a score is best read together with..."
     *   "the result is best interpreted in context..."
     *
     * is guidance about interpretation, not an external ranking.
     *
     * Strong ranking markers are still checked first.
     */
    /\b(?:is|are|was|were|be|been|being)\s+best\s+(?:read|understood|viewed|seen|considered|interpreted|treated|described)\b/i,

    /\bbest\s+way\s+to\b/i,

    /\bbest\s+practices?\b/i,
      /\bthe\s+best\s+approach\s+is\s+one\s+(?:that\s+)?you\s+can\b/i,

    /\bthe\s+best\s+approach\s+depends\s+on\b/i,


    /*
     * ADVISORY_BEST_NON_RANKING_V2
     *
     * "best" does not automatically mean an external ranking.
     *
     * Personal-fit language:
     *   "best matches your priorities"
     *
     * Explicit anti-ranking advice:
     *   "avoid relying on a generic 'best' label"
     *
     * are not claims that a provider is objectively ranked #1.
     *
     * STRONG_EXTERNAL_RANKING_MARKER_V1 executes first, so actual:
     * - top N
     * - #1 / number one
     * - highest-rated
     * - most popular
     * - leading
     * - widely recognized
     *
     * remain fail-closed.
     */
    /\bbest\s+matches?\s+(?:your|their|the|a|an)\s+(?:priorities|needs|preferences|situation|goals|use\s+case)\b/i,

    /\b(?:avoid|never|do\s+not|don't)\s+(?:relying|rely)\s+on\s+(?:(?:a|an|the)\s+)?(?:generic\s+)?["“”'‘’]?best["“”'‘’]?\s+(?:label|claim|ranking)\b/i,

] as const;


function isNonRankingBestUsageV1(
  sentence:
    string
): boolean {
  if (
    STRONG_EXTERNAL_RANKING_MARKER_V1.test(
      sentence
    )
  ) {
    return false;
  }


  return NON_RANKING_BEST_USAGE_PATTERNS_V1.some(
    (
      pattern
    ) =>
      pattern.test(
        sentence
      )
  );
}


const RULES:
  Array<{
    code:
      ExternalEvidenceIssueCode;

    reason:
      string;

    pattern:
      RegExp;
  }> =
  [
    {
      code:
        "EXTERNAL_PRICE_REQUIRES_EVIDENCE",

      reason:
        "Specific external pricing or monetary claims require source evidence before approval.",

      pattern:
        /(?:[$€£]\s?\d|\b\d+(?:\.\d+)?\s*(?:usd|cad|eur|gbp|dollars?)\b|\bbetween\s+\$?\d+\s+(?:and|to)\s+\$?\d+)/i,
    },

    {
      code:
        "EXTERNAL_LEGAL_REQUIRES_EVIDENCE",

      reason:
        "Legal or regulatory claims require source evidence before approval.",

      pattern:
        /\b(?:fair credit reporting act|fcra|federal law|state law|permissible purpose|legally allowed|legally required|legally prohibited|illegal|lawful)\b/i,
    },

    {
      code:
        "EXTERNAL_RANKING_REQUIRES_EVIDENCE",

      reason:
        "Rankings, best-of claims, or broad third-party recognition claims require source evidence.",

      pattern:
        /\b(?:top\s+\d+|best|leading|most popular|widely recognized|highest[- ]rated|number one|#1)\b/i,
    },

    {
      code:
        "EXTERNAL_ABSOLUTE_CLAIM_REQUIRES_EVIDENCE",

      reason:
        "Precise timing, completeness, or prevention claims require source evidence.",

      pattern:
        /\b(?:immediate alert|immediately alerts?|daily credit score|daily alerts?|complete view|prevents? new creditors|simultaneously)\b/i,
    },
  ];


/*
 * NON_RANKING_BEST_CONTEXT_V1
 *
 * "best" is not automatically a commercial/ranking superlative.
 *
 * Examples that MUST NOT require ranking evidence:
 * - "best understood as..."
 * - "best viewed as..."
 * - "best considered as..."
 * - "the best option depends on..."
 * - "there is no single best..."
 *
 * Actual claims such as "X is the best service" remain evidence-sensitive.
 */
function isNonRankingBestContextV1(
  sentence:
    string
): boolean {
  const value =
    sentence
      .toLocaleLowerCase(
        "en-US"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    /\bbest\s+(?:understood|viewed|seen|considered|thought\s+of|treated|described)\s+as\b/i
      .test(
        value
      )
  ) {
    return true;
  }


  if (
    /\b(?:there\s+is|there's|there\s+isn't|there\s+is\s+not|no)\s+(?:one\s+|single\s+)?best\b/i
      .test(
        value
      )
  ) {
    return true;
  }


  if (
    /\bbest\b[^.!?]{0,100}\bdepends\s+on\b/i
      .test(
        value
      )
  ) {
    return true;
  }


  if (
    /\brather\s+than\s+(?:a|an|the)\s+universal\b/i
      .test(
        value
      )
  ) {
    return true;
  }


  return false;
}

/*
 * NEGATED_GENERIC_BEST_V1
 *
 * "not ... universally best", "not necessarily one best", "no single
 * best" explicitly DENY a ranking. They are not a best-of claim and
 * need no source evidence.
 *
 * The exemption is deliberately narrow:
 * - a negation must precede a generic qualifier + best/top
 * - after removing that phrase, no other "best" may remain
 * - any concrete ranking marker keeps the sentence evidence-gated
 */
function isNegatedGenericBestV1(
  sentence:
    string
): boolean {
  const value =
    sentence
      .toLocaleLowerCase(
        "en-US"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const negatedGeneric =
    /\b(?:not|no|never|isn't|aren't|without|rather than|instead of)\b[^.;!?]{0,60}?\b(?:universally|single|one|necessarily|objectively|overall|ultimate)\s+(?:best|top)\b/i;

  if (
    !negatedGeneric.test(
      value
    )
  ) {
    return false;
  }

  const remainder =
    value.replace(
      negatedGeneric,
      " "
    );

  if (
    /\bbest\b/i.test(
      remainder
    )
  ) {
    return false;
  }

  if (
    /\b(?:top\s+\d+|leading|most popular|widely recognized|highest[- ]rated|number one|#1)\b/i
      .test(
        remainder
      )
  ) {
    return false;
  }

  return true;
}


export function auditExternalEvidenceClaims(
  article:
    GeneratedArticle,
  sources:
    ExternalEvidenceSource[] = []
): ExternalEvidenceFinding[] {
  const findings:
    ExternalEvidenceFinding[] =
      [];

  const seen =
    new Set<string>();

  for (
    const sentence
    of sentences(
      article
    )
  ) {
    if (
      sentence
        .trim()
        .endsWith(
          "?"
        )
    ) {
      continue;
    }

    if (
      /\bscanmycreds\b/i.test(
        sentence
      )
    ) {
      continue;
    }

    for (
      const rule
      of RULES
    ) {
      if (
        !rule.pattern.test(
          sentence
        )
      ) {
        continue;
      }


      /*
       * EXTERNAL_RANKING_FALSE_POSITIVE_GUARD_V1
       *
       * Only the ranking rule receives this exemption.
       * Price/legal/absolute evidence requirements are unchanged.
       */
      if (
        rule.code ===
          "EXTERNAL_RANKING_REQUIRES_EVIDENCE" &&
        isNonRankingContextStatement(
          sentence
        )
      ) {
        continue;
      }


      /*
       * "best" can be explanatory English rather than a ranking.
       * Skip ONLY clearly non-ranking contexts.
       * Real best/top/ranking claims continue through evidence policy.
       */
      if (
        rule.code ===
          "EXTERNAL_RANKING_REQUIRES_EVIDENCE" &&
        isNonRankingBestContextV1(
          sentence
        )
      ) {
        continue;
      }


      /*
       * RANKING_CONTEXT_FALSE_POSITIVE_GUARD_V1
       *
       * Actual rankings remain evidence-gated.
       * Advisory/explanatory uses of "best" are not rankings.
       */
      if (
        rule.code ===
          "EXTERNAL_RANKING_REQUIRES_EVIDENCE" &&
        isNonRankingBestUsageV1(
          sentence
        )
      ) {
        continue;
      }


      /*
       * NEGATED_GENERIC_BEST_V1
       * Ranking rule only. A sentence that denies a universal best
       * option is not a ranking claim.
       */
      if (
        rule.code ===
          "EXTERNAL_RANKING_REQUIRES_EVIDENCE" &&
        isNegatedGenericBestV1(
          sentence
        )
      ) {
        continue;
      }


      const support =
        findExternalEvidenceSupport({
          sentence,

          code:
            rule.code,

          sources,
        });

      if (
        support.supported
      ) {
        continue;
      }

      const key =
        `${rule.code}:${sentence.toLowerCase()}`;

      if (
        seen.has(
          key
        )
      ) {
        continue;
      }

      seen.add(
        key
      );

      findings.push({
        code:
          rule.code,

        sentence:
          sentence.slice(
            0,
            320
          ),

        reason:
          rule.reason,
      });
    }
  }

  return findings;
}
