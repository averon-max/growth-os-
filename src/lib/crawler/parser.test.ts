import { describe, expect, it } from "vitest";
import { parsePage } from "./parser";
import { findExactSourceSentenceV1 } from "../content/exact-source-sentence-v1";
import { findVerifiedExcerptCandidateV1 } from "../content/live-evidence-verification";

describe("crawler readable body DOM boundaries", () => {
  const quote = "Credit monitoring has no impact on your credit scores.";
  it("preserves separation between headings, paragraphs and unrelated navigation", () => {
    const html = [
      "<html><head><title>Credit scores</title></head><body>",
      "<nav><div>Full coverage</div><div>Car insurance</div></nav>",
      "<main><h1>Does Credit Monitoring Hurt Your Credit Score?</h1>",
      "<h2>Quick Answer</h2><p>",
      quote,
      "</p><p>While credit monitoring can cause soft inquiries to appear, they won't affect your credit scores.</p>",
      "</main></body></html>",
    ].join("");
    const page = parsePage(html, "https://example.org");
    expect(page.bodyText).toContain("Quick Answer Credit monitoring");
    expect(page.bodyText).toContain("scores. While credit");
    expect(page.bodyText).not.toContain("AnswerCredit");
    const exact = findExactSourceSentenceV1({ claimText: quote, bodyText: page.bodyText });
    expect(exact).toBe(quote);
    expect(findVerifiedExcerptCandidateV1({ claimText: quote, bodyText: exact! })?.excerpt).toBe(quote);
  });
  it("keeps inline emphasis in prose without splitting words", () => {
    const p = parsePage("<body><p>Monitoring <strong>does not</strong> hurt your score.</p></body>", "https://example.org");
    expect(p.bodyText).toContain("Monitoring does not hurt your score.");
  });
});
