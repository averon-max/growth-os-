import {describe,expect,it} from "vitest";
import {countExactPhrase} from "./article-analyzer";
import {proposeOriginalSectionKeywordSentenceV1 as suggest}
  from "./same-article-quality-improvement-v1";

const original=[
  "Many services provide alerts when an account changes, but a notification does not prevent fraud.",
  "Free credit monitoring may provide notifications without a monthly subscription, although coverage and alert types can vary by service.",
  "Check each alert against records you recognize before deciding what to do.",
].join("\n\n");
const revised=[
  "Monitoring alerts help you review changes that affect your credit files.",
  "Different plans may cover separate events. Read the alerts and their limits carefully before choosing how to act.",
].join("\n\n");

describe("no-model original scoped phrase recovery",()=>{
 it("recovers one original fully phrased contextual sentence, not stuffed SEO tokens",()=>{
  const result=suggest({originalBody:original,currentBody:revised,
    missingKeyword:"free credit monitoring"});
  expect(result).not.toBeNull();
  expect(result?.restoredSentence).toContain("Free credit monitoring may provide");
  expect(countExactPhrase(result!.bodyMarkdown,"free credit monitoring")).toBe(1);
  expect(result?.bodyMarkdown).toContain(revised.split("\n\n")[0]);
  expect(result?.bodyMarkdown).toContain(revised.split("\n\n")[1]);
 });
 it("never adds a term absent from the source-reviewed original section",()=>{
  expect(suggest({originalBody:original,currentBody:revised,
    missingKeyword:"3 bureau credit monitoring"})).toBeNull();
 });
 it("never inserts duplicate phrase or changes body when already covered",()=>{
  expect(suggest({originalBody:original,currentBody:original,
    missingKeyword:"free credit monitoring"})).toBeNull();
 });
 it("fails closed if the phrase only appears in a heading or short fragment",()=>{
  expect(suggest({originalBody:"### Free credit monitoring\n\nSee more.",
    currentBody:revised,missingKeyword:"free credit monitoring"})).toBeNull();
 });
 it("refuses new term when there is no substantial matching paragraph",()=>{
  expect(suggest({
    originalBody:original,
    currentBody:"Short text.",missingKeyword:"free credit monitoring",
  })).toBeNull();
 });
});
