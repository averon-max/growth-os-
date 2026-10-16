import {describe,expect,it} from "vitest";
import {previewObservedArticleJoinCopyeditV1}
  from "./article-copyedit-join-repair-v1";
import {inspectProseJoinAnomaliesV2}
  from "./article-search-readiness-v2";
describe("existing article copyedit preview never rewrites content facts or source links",()=>{
  const old=[
    "## Credit score",
    "Many creditcard companies let you read a score.",
    "That keeps thereview focused on the informationyou can access.",
    "Never make an assumptionto justify the level ofcoverage.",
    "The service whosecoverage changes should tell you how toreview the alert.",
    "Review the change relevant toa particular score.",
  ].join("\n\n");
  it("repairs only 8 known literal join defects from 2026-10-16 saved article",()=>{
    const res=previewObservedArticleJoinCopyeditV1(old);
    expect(res.changes).toHaveLength(8);
    expect(res.changedCharacters).toBe(8);
    expect(res.remainingKnownProseDefects).toEqual([]);
    expect(res.proposedBodyMarkdown).toContain("credit card companies");
    expect(res.proposedBodyMarkdown).toContain("to review the alert");
    expect(res.proposedBodyMarkdown).toContain("relevant to a particular");
    expect(res.proposedBodyMarkdown).toContain("## Credit score");
    expect(res.autoCommitAllowed).toBe(false);
    expect(res.freshReplayNeededIfApplied).toBe(true);
  });
  it("never rewrites source URLs, markdown link labels, inline code or fences",()=>{
    const body=[
      "## Source",
      "[Source informationyou](https://example.com/assumptionto/toreview)",
      "Visit https://example.org/path/creditcard/details",
      "Use \x60informationyou\x60 as an example code token.",
      "\x60\x60\x60json",
      "creditcard",
      "\x60\x60\x60",
      "Outside a fence, creditcard companies exist.",
    ].join("\n");
    const res=previewObservedArticleJoinCopyeditV1(body);
    expect(res.changes).toEqual([{
      before:"creditcard",after:"credit card",occurrences:1,
    }]);
    expect(res.proposedBodyMarkdown).toContain(
      "[Source informationyou](https://example.com/assumptionto/toreview)");
    expect(res.proposedBodyMarkdown).toContain(
      "https://example.org/path/creditcard/details");
    expect(res.proposedBodyMarkdown).toContain("\x60informationyou\x60");
    expect(res.proposedBodyMarkdown).toContain("\x60\x60\x60json\ncreditcard\n\x60\x60\x60");
  });
  it("does not touch clean article paragraphs",()=>{
    const body="## How it works\n\nReview your credit card account and make a careful decision.";
    const report=previewObservedArticleJoinCopyeditV1(body);
    expect(report.changes).toEqual([]);
    expect(report.proposedBodyMarkdown).toBe(body);
    expect(inspectProseJoinAnomaliesV2(body)).toEqual([]);
  });
});