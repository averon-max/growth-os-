import {describe,expect,it} from "vitest";
import {splitPersistedArticleByCanonicalH2V1}
  from "./existing-article-section-rebind-v1";
describe("current persisted article evidence scope",()=>{
  it("reads exact existing H2 sections and nested H3 without inventing headings",()=>{
    expect(splitPersistedArticleByCanonicalH2V1(
      "## What is monitoring?\n\nA factual answer.\n"+
      "### How alerts arrive\n\nA detailed explanation.\n\n"+
      "## What to do next?\n\nAct after the alert.",
      ["What is monitoring?","What to do next?"]
    )).toEqual([
      "A factual answer.\n### How alerts arrive\n\nA detailed explanation.",
      "Act after the alert.",
    ]);
  });
  it("refuses changed section count and headings",()=>{
    expect(()=>splitPersistedArticleByCanonicalH2V1(
      "## Title\n\nBody",["Title","Missing"]))
      .toThrow("QUALITY_REBIND_H2_COUNT_DRIFT");
    expect(()=>splitPersistedArticleByCanonicalH2V1(
      "## Wrong\n\nBody",["Correct"]))
      .toThrow("QUALITY_REBIND_H2_SCOPE_MISMATCH:0");
  });
  it("refuses article prose outside canonical sections",()=>{
    expect(()=>splitPersistedArticleByCanonicalH2V1(
      "Intro outside blueprint\n\n## Title\n\nBody",["Title"]))
      .toThrow("QUALITY_REBIND_UNOWNED_INTRO");
  });
});
