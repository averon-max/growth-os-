import { describe, expect, it } from "vitest";
import {
  composeScoreImpactClosurePreviewV1,
  SCORE_IMPACT_DIRECT_CLAIM_V1,
  SCORE_IMPACT_HEADING_V1,
} from "./score-impact-closure-preview-v1";

const sections = [
  { heading: "What Is Credit Monitoring?", bodyMarkdown: "Original definition." },
  { heading: "How Credit Monitoring Works", bodyMarkdown: "Original mechanism." },
  { heading: "Important Limitations of Credit Monitoring", bodyMarkdown: "Original limits." },
  { heading: SCORE_IMPACT_HEADING_V1, bodyMarkdown: "Original evasive section." },
  { heading: "What to Check Before Choosing a Service", bodyMarkdown: "Original checklist." },
];

describe("offline score-impact closure preview", () => {
  it("preserves the four good sections byte-for-byte and replaces only the broken question", () => {
    const result = composeScoreImpactClosurePreviewV1({
      h1: "What Is Credit Monitoring?",
      sections,
      verifiedDirectQuote: SCORE_IMPACT_DIRECT_CLAIM_V1,
    });
    expect(result.changedSectionIndexes).toEqual([3]);
    for (const index of [0, 1, 2, 4]) {
      expect(result.sectionHashesAfter[index]).toBe(result.sectionHashesBefore[index]);
      expect(result.markdown).toContain(sections[index]!.bodyMarkdown);
    }
    expect(result.markdown).toContain("**No. Credit monitoring itself does not lower your credit score.**");
    expect(result.markdown.match(/^## /gm)).toHaveLength(5);
    expect(result.markdown.match(/^### /gm)).toHaveLength(2);
    expect(result.readiness).toBe("REVIEW_ONLY");
  });

  it("fails closed without a verbatim verified source quotation", () => {
    expect(() => composeScoreImpactClosurePreviewV1({
      h1: "What Is Credit Monitoring?",
      sections,
      verifiedDirectQuote: null,
    })).toThrow("CLOSURE_PREVIEW_DIRECT_CLAIM_NOT_VERIFIED");
  });

  it("does not accept a different original section layout", () => {
    expect(() => composeScoreImpactClosurePreviewV1({
      h1: "What Is Credit Monitoring?",
      sections: sections.slice(0, 4),
      verifiedDirectQuote: SCORE_IMPACT_DIRECT_CLAIM_V1,
    })).toThrow("CLOSURE_PREVIEW_CHECKPOINT_SECTIONS_INVALID");
  });
});
