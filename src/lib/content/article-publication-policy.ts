import type {
  GeneratedArticle,
} from "./types";

import type {
  ContentPlanAnalysis,
} from "./content-plan-analysis";

import {
  auditExternalEvidenceClaims,
  type ExternalEvidenceFinding,
} from "./evidence-policy";

export interface ArticlePublicationPolicyResult {
  pass:
    boolean;

  blockingIssues:
    string[];

  planWarnings:
    string[];

  evidenceFindings:
    ExternalEvidenceFinding[];
}

function unique(
  values:
    string[]
): string[] {
  return Array.from(
    new Set(
      values
    )
  );
}

export function evaluateArticlePublicationPolicy({
  article,
  intelligence,
}: {
  article:
    GeneratedArticle;

  intelligence:
    ContentPlanAnalysis;
}): ArticlePublicationPolicyResult {
  const blockingIssues:
    string[] =
      [];

  if (
    !intelligence
      .planAvailable
  ) {
    blockingIssues.push(
      "CONTENT_PLAN_EVIDENCE_UNAVAILABLE"
    );
  }

  const planWarnings =
    intelligence
      .warnings
      .filter(
        (warning) =>
          warning.startsWith(
            "REQUIRED_TOPIC_NOT_LEXICALLY_COVERED:"
          ) ||
          warning.startsWith(
            "PLANNED_QUESTION_NOT_LEXICALLY_COVERED:"
          )
      );

  /*
   * SEMANTIC_COVERAGE_AUTHORITY_V2
   *
   * content-plan-analysis coverage() is explicitly lexical.
   *
   * Lexical mismatch remains useful observability, but it cannot
   * be publication authority because:
   * - query variants need not be repeated verbatim;
   * - the Master Writer owns approved section missions;
   * - section semantic verification owns material factual safety;
   * - final critics own semantic completeness/originality;
   * - evidence policy remains a hard publication gate.
   *
   * Therefore REQUIRED_TOPIC_NOT_LEXICALLY_COVERED and
   * PLANNED_QUESTION_NOT_LEXICALLY_COVERED stay in planWarnings
   * but do NOT become hard blockers by themselves.
   */


  const evidenceFindings =
    auditExternalEvidenceClaims(
      article,
      intelligence.externalEvidenceSources ??
        []
    );

  blockingIssues.push(
    ...evidenceFindings.map(
      (finding) =>
        finding.code
    )
  );

  const normalized =
    unique(
      blockingIssues
    );

  return {
    pass:
      normalized.length ===
      0,

    blockingIssues:
      normalized,

    planWarnings,

    evidenceFindings,
  };
}

export function formatArticlePublicationPolicyFailure(
  result:
    ArticlePublicationPolicyResult
): string {
  return [
    "ARTICLE_PUBLICATION_POLICY_FAILED",
    ...result.blockingIssues,
  ].join(
    ": "
  );
}

export class ArticlePublicationPolicyError
  extends Error {
  readonly issues:
    string[];

  readonly evidenceFindings:
    ExternalEvidenceFinding[];

  readonly planWarnings:
    string[];

  constructor(
    result:
      ArticlePublicationPolicyResult
  ) {
    super(
      formatArticlePublicationPolicyFailure(
        result
      )
    );

    this.name =
      "ArticlePublicationPolicyError";

    this.issues =
      result.blockingIssues;

    this.evidenceFindings =
      result.evidenceFindings;

    this.planWarnings =
      result.planWarnings;
  }
}

export function assertArticlePublicationPolicyPassed(
  result:
    ArticlePublicationPolicyResult
): void {
  if (
    !result.pass
  ) {
    throw new ArticlePublicationPolicyError(
      result
    );
  }
}
