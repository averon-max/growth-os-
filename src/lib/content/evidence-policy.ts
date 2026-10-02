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
