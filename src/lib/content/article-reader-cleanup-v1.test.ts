import {describe,expect,it} from "vitest";
import {previewArticleWithoutInlineSourceLabelsV1,
  draftSavedArticleSectionReferenceLayoutV1}
  from "./article-reader-cleanup-v1";
describe("visible article source label cleanup, original saved source untouched",()=>{
  it("moves two common FTC source formats outside running copy",()=>{
    const raw=[
      "## What to do after an alert?",
      "",
      "Contact the bureau. [Source: consumer.ftc.gov](https://consumer.ftc.gov/a). Keep copies.",
      "",
      "Ask the reporting company too. Source: [FTC](https://consumer.ftc.gov/b). Keep a record.",
    ].join("\n");
    const actual=previewArticleWithoutInlineSourceLabelsV1(raw);
    expect(actual.readerMarkdown).not.toContain("Source:");
    expect(actual.readerMarkdown).toContain("Contact the bureau.");
    expect(actual.readerMarkdown).toContain("Keep copies.");
    expect(actual.researchLinks.map(x=>x.url))
      .toEqual(["https://consumer.ftc.gov/a","https://consumer.ftc.gov/b"]);
    expect(raw).toContain("Source:");
    expect(actual.originalUnchanged).toBe(true);
  });
  it("leaves contextual citations and original headings unchanged",()=>{
    const raw="## Credit score\n\nRead [CFPB information](https://www.consumerfinance.gov/info) for details.";
    const actual=previewArticleWithoutInlineSourceLabelsV1(raw);
    expect(actual.readerMarkdown).toBe(raw);
    expect(actual.researchLinks).toHaveLength(0);
  });
});
describe("deterministic source format candidate for current signed article",()=>{
  it("relocates intrusive FTC references to their own H2 end; never drops or retargets a link",()=>{
    const body=[
      "## What is credit monitoring?",
      "",
      "Credit monitoring sends alerts. [Source: equifax.com](https://www.equifax.com/info) It watches reports.",
      "",
      "## What should you do after an alert?",
      "",
      "Contact the bureau. [Source: consumer.ftc.gov](https://consumer.ftc.gov/a) Keep records.",
      "",
      "Then check [CFPB advice](https://www.consumerfinance.gov/info).",
      "",
      "Source: [FTC](https://consumer.ftc.gov/b)",
    ].join("\n");
    const proposed=draftSavedArticleSectionReferenceLayoutV1(body);
    expect(proposed.changed).toBe(true);
    expect(proposed.movedSourceLabels).toBe(3);
    expect(proposed.h2Count).toBe(2);
    expect(proposed.sections.map(x=>x.movedSourceLabels)).toEqual([1,2]);
    expect(proposed.everyH2RetainsItsOwnUrls).toBe(true);
    expect(proposed.sections.map(x=>x.proposedUrlCount)).toEqual([1,3]);
    expect(proposed.sourceLabelsStillInline).toBe(false);
    expect(proposed.proposedBodyMarkdown).toContain("**References:**");
    expect(proposed.proposedBodyMarkdown).not.toContain("Source:");
    expect(proposed.proposedBodyMarkdown).toContain("Contact the bureau. Keep records.");
    expect(proposed.proposedBodyMarkdown).toContain(
      "[CFPB advice](https://www.consumerfinance.gov/info)");
    expect(proposed.safeToAutoCommit).toBe(false);
    expect(body).toContain("[Source: consumer.ftc.gov]");
  });
  it("is no-op on clean article with contextual hyperlinks",()=>{
    const raw="## Credit score\n\nCheck [CFPB](https://www.consumerfinance.gov/x).";
    const result=draftSavedArticleSectionReferenceLayoutV1(raw);
    expect(result.changed).toBe(false);
    expect(result.proposedBodyMarkdown).toBe(raw);
    expect(result.everyH2RetainsItsOwnUrls).toBe(true);
  });
});
