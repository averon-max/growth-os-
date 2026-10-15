import {describe,expect,it} from "vitest";
import {removeUnsupportedPriceSentenceV1}
  from "./unsupported-price-sentence-recovery-v1";

const price="Credit monitoring can cost anywhere from $0 to $50 per month, depending on the service and level of coverage.";
const intro="When comparing credit monitoring services, check which reports receive alerts and what each plan actually covers. ";
const filler=("A monitoring alert can identify changes that the consumer should verify against the underlying report. ").repeat(11);
const markdown=[
  intro+filler,
  price,
  "Free credit monitoring and 3 bureau credit monitoring are comparison phrases, not proof of pricing or bureau coverage.",
].join("\n\n");
const base={
  bodyMarkdown:markdown,sentence:price,
  plannedKeywords:["credit monitoring","free credit monitoring",
    "3 bureau credit monitoring"],
};
describe("source-safe external price sentence pruning",()=>{
  it("removes ONLY the price sentence while keeping all source/SEO structure",()=>{
    const result=removeUnsupportedPriceSentenceV1(base);
    expect(result).not.toBeNull();
    expect(result).not.toContain("$0 to $50");
    expect(result).toContain("Free credit monitoring and 3 bureau credit monitoring");
    expect(result).toContain("A monitoring alert can identify changes");
    expect(markdown.length-(result??"").length).toBeGreaterThan(50);
  });
  it("rejects missing, duplicate and non-numeric promotional claims",()=>{
    expect(removeUnsupportedPriceSentenceV1({
      ...base,sentence:"Totally different credit monitoring service costs $10 every month.",
    })).toBeNull();
    expect(removeUnsupportedPriceSentenceV1({
      ...base,bodyMarkdown:markdown+"\n\n"+price,
    })).toBeNull();
    expect(removeUnsupportedPriceSentenceV1({
      ...base,sentence:"Credit monitoring is absolutely amazing and better for everybody.",
    })).toBeNull();
  });
  it("protects required evidence-backed price claims and necessary keywords",()=>{
    expect(removeUnsupportedPriceSentenceV1({
      ...base,requiredClaimTexts:[
        "Credit monitoring can cost anywhere from $0 to $50 per month, depending on the service and level of coverage.",
      ],
    })).toBeNull();
    expect(removeUnsupportedPriceSentenceV1({
      ...base,plannedKeywords:["$0 to $50 per month"],
    })).toBeNull();
  });
  it("protects section depth and never deletes a heading or list",()=>{
    expect(removeUnsupportedPriceSentenceV1({
      ...base,sectionMinWords:500,
    })).toBeNull();
    expect(removeUnsupportedPriceSentenceV1({
      ...base,bodyMarkdown:markdown.replace(price,"## "+price),
    })).toBeNull();
  });
});