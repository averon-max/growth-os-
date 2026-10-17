import { describe, expect, it } from "vitest";
import {
  findVerifiedExcerptCandidateV1,
  assignVerifiedEvidenceToSectionsV1,
} from "./live-evidence-verification";
import {
  inspectArticlePreWriterAnswerSupportV2,
} from "./article-prewriter-evidence-gate-v1";

describe("Required answer evidence recovery", () => {
  const claimId = "claim-score-effect";
  const questionId = "question-score-impact";
  const sourceId = "source-score";

  const claim =
    "Checking your credit through a credit monitoring service does not hurt your credit score.";

  const supportedBody =
    "Checking your credit through a credit monitoring service does not hurt your credit score. This is a soft inquiry.";

  function inspect(body: string) {
    const verified = findVerifiedExcerptCandidateV1({
      claimText: claim,
      bodyText: body,
    });

    const graph = {
      sources: [{
        id: sourceId,
        url: "https://example.org/credit-monitoring",
        publisher: "Fixture",
        sourceType: "REPUTABLE_SECONDARY" as const,
        authorityTier: "C" as const,
        retrievedAt: new Date(),
      }],
      claimEvidence: verified ? [{
        id: "evidence-score",
        claimId,
        sourceId,
        relation: "SUPPORTS" as const,
        kind: "VERIFIED_EXCERPT" as const,
        excerpt: verified.excerpt,
      }] : [],
    };

    const assignments = assignVerifiedEvidenceToSectionsV1({
      sections: [{
        heading: "Does Credit Monitoring Affect Your Credit Score?",
        mission: "Explain credit score impact.",
        expectedOutcome: "Reader understands the score effect.",
      }],
      claims: [{ id: claimId, text: claim }],
      evidenceGraph: graph,
    });

    const section = assignments[0];

    const inspection = inspectArticlePreWriterAnswerSupportV2({
      requiredQuestions: [{
        id: questionId,
        priority: "MUST",
      }],
      sections: [{
        state: "WRITABLE",
        requiredQuestionIds: [questionId],
        requiredClaimIds: section?.requiredClaims ?? [],
        evidenceIds: section?.evidenceIds ?? [],
      }],
    });

    return { verified, assignments, inspection };
  }

  it("accepts a supported score-impact answer", () => {
    const result = inspect(supportedBody);

    expect(result.verified).not.toBeNull();
    expect(result.assignments[0]?.requiredClaims)
      .toContain(claimId);
    expect(result.assignments[0]?.evidenceIds)
      .toContain("evidence-score");
    expect(result.inspection.ready).toBe(true);
  });

  it("rejects opposite evidence without authorizing Writer", () => {
    const result = inspect(
      "Checking your credit through a credit monitoring service does hurt your credit score."
    );

    expect(result.verified).toBeNull();
    expect(result.inspection.ready).toBe(false);
    expect(result.inspection.unsupportedRequiredQuestionIds)
      .toContain(questionId);
  });

  it("rejects missing evidence without authorizing Writer", () => {
    const result = inspect(
      "Credit monitoring services have different features."
    );

    expect(result.verified).toBeNull();
    expect(result.inspection.ready).toBe(false);
  });
});
