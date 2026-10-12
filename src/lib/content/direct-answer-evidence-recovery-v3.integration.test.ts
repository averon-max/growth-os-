import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../crawler/crawler", () => ({
  fetchSinglePage: vi.fn(),
}));

import { fetchSinglePage, type CrawledPage } from "../crawler/crawler";
import {
  discoverClaimEvidenceFallbackSourcesV1,
  enrichLiveEvidenceGraphV1,
  assignVerifiedEvidenceToExplicitSectionsV2,
} from "./live-evidence-verification";
import {
  eligibleForDirectAnswerEvidenceRecoveryV3,
  directAnswerEvidenceSearchProbeV3,
} from "./direct-answer-evidence-recovery-v3";
import {
  assertArticlePreWriterAnswerSupportV2,
} from "./article-prewriter-evidence-gate-v1";
import {
  assertPreWriterMissionAuthorityV1,
} from "./article-prewriter-mission-authority-gate-v1";

const heading = "Does Credit Monitoring Affect Your Credit Score?";
const questionId = "question-score";
const claim = {
  id: "claim-score-inquiry",
  text: "Credit monitoring does not affect your credit score.",
};
const sourceUrl = "https://example.org/credit-monitoring-score";
const readerText = (statement: string): string =>
  [
    statement,
    "This is a simulated source page for a deterministic integration test.",
    "No live website, provider or search request is ever performed.",
    ...Array.from({ length: 14 }, () =>
      "The rest of this page has background text for testing the crawler minimum text length."),
  ].join(" ");

function mockSourcePage(statement: string): void {
  vi.mocked(fetchSinglePage).mockResolvedValue({
    url: sourceUrl,
    statusCode: 200,
    contentType: "text/html",
    responseTime: 1,
    depth: 0,
    parsed: { bodyText: readerText(statement) } as CrawledPage["parsed"],
  });
}

function lockedPlan(evidenceIds: readonly string[], requiredClaimIds: readonly string[]) {
  return {
    requiredQuestions: [{ id: questionId, priority: "MUST" }],
    sections: [{
      heading,
      state: "WRITABLE",
      requiredQuestionIds: [questionId],
      requiredClaimIds,
      evidenceIds,
    }],
  };
}

async function sourceRecovery() {
  const requiredRoles = new Set<string>(["DEFINITION"]);
  expect(eligibleForDirectAnswerEvidenceRecoveryV3({
    heading,
    questions: [],
    roles: ["OPTIONAL"],
    requiredRoles,
  })).toBe(true);

  const probe = directAnswerEvidenceSearchProbeV3({
    heading,
    questions: [],
  });
  expect(probe).toBe(heading);

  const search = vi.fn(async () => ({
    organic: [{ url: sourceUrl, title: "Credit monitoring and scores" }],
  }));

  const sources = await discoverClaimEvidenceFallbackSourcesV1({
    claims: [{ id: claim.id, text: probe }],
    primaryQuery: "what is credit monitoring",
    locationName: "United States",
    languageName: "English",
    existingUrls: [],
    search,
  });

  expect(search).toHaveBeenCalled();
  expect(search.mock.calls[0]).toEqual([{
    keyword: heading,
    locationName: "United States",
    languageName: "English",
  }]);
  expect(sources).toHaveLength(1);

  const graph = await enrichLiveEvidenceGraphV1({
    graph: { sources, claimEvidence: [] },
    claims: [claim],
  });

  const section = assignVerifiedEvidenceToExplicitSectionsV2({
    sections: [{ requiredClaimIds: [claim.id] }],
    claims: [claim],
    evidenceGraph: graph,
  })[0]!;

  return { graph, section };
}

describe("question evidence recovery through real verifier and pre-writer gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes an excerpt from a fetched source and authorizes only its assigned claim", async () => {
    mockSourcePage(claim.text);
    const { graph, section } = await sourceRecovery();
    expect(graph.claimEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        claimId: claim.id,
        relation: "SUPPORTS",
        kind: "VERIFIED_EXCERPT",
      }),
    ]));
    expect(section.requiredClaims).toEqual([claim.id]);
    expect(section.evidenceIds).toHaveLength(1);
    expect(vi.mocked(fetchSinglePage)).toHaveBeenCalledTimes(1);

    expect(() => assertPreWriterMissionAuthorityV1({
      blueprints: [{ heading, requiredClaims: [claim.id] }],
      sections: [{ heading, state: "WRITABLE", requiredClaimIds: section.requiredClaims }],
    })).not.toThrow();

    expect(() => assertArticlePreWriterAnswerSupportV2(
      lockedPlan(section.evidenceIds, section.requiredClaims),
    )).not.toThrow();
  });

  it("blocks the writer when fetched evidence contradicts the required answer", async () => {
    mockSourcePage("Credit monitoring affects your credit score.");
    const { graph, section } = await sourceRecovery();
    expect(graph.claimEvidence.filter(
      item => item.kind === "VERIFIED_EXCERPT" &&
        item.relation === "SUPPORTS" &&
        item.claimId === claim.id,
    )).toHaveLength(0);
    expect(section.requiredClaims).toEqual([claim.id]);
    expect(section.evidenceIds).toHaveLength(0);

    expect(() => assertArticlePreWriterAnswerSupportV2(
      lockedPlan(section.evidenceIds, section.requiredClaims),
    )).toThrow("ARTICLE_PREWRITER_REQUIRED_ANSWER_SUPPORT_LOST");
  });

  it("blocks the writer if contraction removes a claim while leaving its question writable", () => {
    expect(() => assertPreWriterMissionAuthorityV1({
      blueprints: [{ heading, requiredClaims: [claim.id] }],
      sections: [{ heading, state: "WRITABLE", requiredClaimIds: [] }],
    })).toThrow("ARTICLE_PREWRITER_MISSION_AUTHORITY_LOST");
  });
});
