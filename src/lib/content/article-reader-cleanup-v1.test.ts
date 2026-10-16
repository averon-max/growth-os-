import {describe,expect,it} from "vitest";
import {previewArticleWithoutInlineSourceLabelsV1}
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