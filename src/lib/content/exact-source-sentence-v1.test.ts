import { describe, expect, it } from "vitest";
import { findExactSourceSentenceV1 } from "./exact-source-sentence-v1";
import {
  findVerifiedExcerptCandidateV1,
  selectVerifiedClaimSourcesV1,
} from "./live-evidence-verification";

const claim = "Credit monitoring has no impact on your credit scores.";
const navigation = "Full coverage car insuranceHome insuranceWhat does homeowners insurance cover?Types of insurance. Account sign in.";
const article = "Quick Answer Credit monitoring has no impact on your credit scores. While credit monitoring can cause soft inquiries, they do not affect your scores.";

describe("literal source sentence — safe citation", () => {
  it("extracts exactly the author-written claim, not site menus or two unrelated statements", () => {
    const bodyText = navigation + " " + article;
    const excerpt = findExactSourceSentenceV1({ claimText: claim, bodyText });
    expect(excerpt).toBe(claim);
    expect(findVerifiedExcerptCandidateV1({ claimText: claim, bodyText: excerpt! })?.excerpt)
      .toBe(claim);
  });

  it("chooses the short sentence in the canonical verified-source selector", () => {
    const sources = [{ id: "experian", url: "https://www.experian.com/blogs/ask-experian/example" }];
    const selected = selectVerifiedClaimSourcesV1({
      claimText: claim,
      sources,
      bodies: new Map([["experian", navigation + " " + article]]),
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.excerpt).toBe(claim);
  });

  it("never treats an opposite-polarity sentence as a verbatim answer", () => {
    const bodyText = "Credit monitoring has an impact on your credit scores. " +
      "A website menu shows credit monitoring alerts.";
    expect(findExactSourceSentenceV1({ claimText: claim, bodyText })).toBeNull();
  });

  it("requires a full word boundary rather than finding partial words in unrelated text", () => {
    expect(findExactSourceSentenceV1({
      claimText: claim,
      bodyText: "xCredit monitoring has no impact on your credit scores.",
    })).toBeNull();
  });

  it("does not make a short invented claim verifiable", () => {
    expect(findExactSourceSentenceV1({
      claimText: "Free score",
      bodyText: "Free score services and descriptions appear in a navigation menu.",
    })).toBeNull();
  });
});
