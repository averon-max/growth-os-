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

  if (
    planWarnings.some(
      (warning) =>
        warning.startsWith(
          "REQUIRED_TOPIC_NOT_LEXICALLY_COVERED:"
        )
    )
  ) {
    blockingIssues.push(
      "REQUIRED_TOPIC_COVERAGE_MISSING"
    );
  }

  if (
    planWarnings.some(
      (warning) =>
        warning.startsWith(
          "PLANNED_QUESTION_NOT_LEXICALLY_COVERED:"
        )
    )
  ) {
    blockingIssues.push(
      "PLANNED_QUESTION_COVERAGE_MISSING"
    );
  }

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
