import {describe,expect,it} from "vitest";
import {countQualityArticleH3V1,eligibleForEvidenceBackedH3V1}
  from "./quality-improvement-h3-v1";
describe("Quality Writer true H3 structure detection",()=>{
  it("detects real nested Markdown headings after a zero-H3 initial article",()=>{
    const body="## Definition\n\n"+
      "### What monitoring covers\n\nSource-backed details.\n\n"+
      "### What alerts mean\n\nMore source-backed details.";
    expect(countQualityArticleH3V1(body)).toBe(2);
  });
  it("never treats literal escape text or H2/H4 as an actual H3",()=>{
    expect(countQualityArticleH3V1(
      "## General\n###\\s+not-a-heading\n"+
      "#### Not H3\n\n# Main title",
    )).toBe(0);
  });
  it("requires two substantive paragraphs with current evidence",()=>{
    const paragraphs=["Evidence based answer ".repeat(12),
      "Different verified explanation ".repeat(12)].join("\n\n");
    expect(eligibleForEvidenceBackedH3V1({
      bodyMarkdown:paragraphs,approvedClaimCount:2,
      verifiedEvidenceCount:2,
    })).toBe(true);
    expect(eligibleForEvidenceBackedH3V1({
      bodyMarkdown:paragraphs,approvedClaimCount:0,
      verifiedEvidenceCount:2,
    })).toBe(false);
    expect(eligibleForEvidenceBackedH3V1({
      bodyMarkdown:"Short answer.",approvedClaimCount:2,
      verifiedEvidenceCount:2,
    })).toBe(false);
  });
});
