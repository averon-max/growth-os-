import {describe,expect,it} from "vitest";
import {removeUnsupportedPriceSentenceV1,
  inspectUnsupportedPriceSentenceRemovalV1,
  PRICE_NEUTRAL_COMPARISON_QUESTION_V1,
} from "./unsupported-price-sentence-recovery-v1";

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
  it("preserves section minimum depth with fact-free question instead of unsupported pricing",()=>{
    const direct=inspectUnsupportedPriceSentenceRemovalV1(base);
    expect(direct.supported).toBe(true);
    expect(direct.method).toBe("DELETE");
    const floor=direct.previousWords-2;
    expect((direct.resultingWords??0)).toBeLessThan(floor);
    const rescued=inspectUnsupportedPriceSentenceRemovalV1({
      ...base,sectionMinWords:floor,
    });
    expect(rescued.supported).toBe(true);
    expect(rescued.method).toBe("NEUTRAL_QUESTION");
    expect(rescued.bodyMarkdown).toContain(
      PRICE_NEUTRAL_COMPARISON_QUESTION_V1);
    expect(rescued.bodyMarkdown).not.toContain("$0 to $50");
    expect(rescued.resultingWords).toBeGreaterThanOrEqual(floor);
    expect(rescued.bodyMarkdown).toContain("3 bureau credit monitoring");
  });
  it("returns exact fail-closed reasons without weakening price evidence gates",()=>{
    expect(inspectUnsupportedPriceSentenceRemovalV1({
      ...base,sectionMinWords:500,
    }).reason).toMatch(/^PRICE_NEUTRAL_REPLACEMENT_UNSAFE:/);
    expect(inspectUnsupportedPriceSentenceRemovalV1({
      ...base,requiredClaimTexts:[price],
    }).reason).toBe("PRICE_IS_REQUIRED_SOURCE_BACKED_CLAIM");
    expect(inspectUnsupportedPriceSentenceRemovalV1({
      ...base,plannedKeywords:["$0 to $50 per month"],
    }).reason).toBe("PRICE_EDIT_LOST_PLANNED_KEYWORD");
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
  it("does not mistake one overlapping dollar amount and topical words for the rejected full range",()=>{
    const alternative="Credit monitoring can cost $0 with some free service options.";
    const result=inspectUnsupportedPriceSentenceRemovalV1({
      ...base,requiredClaimTexts:[alternative],
      sectionMinWords:190,
    });
    expect(result.supported).toBe(true);
    expect(result.reason).toBe("OK");
    expect(result.bodyMarkdown).not.toContain(price);
  });
  it("still protects required price range expressed with different prose",()=>{
    const result=inspectUnsupportedPriceSentenceRemovalV1({
      ...base,
      requiredClaimTexts:[
        "The monthly price of credit monitoring ranges from $0 up to $50 depending on coverage.",
      ],
    });
    expect(result.supported).toBe(false);
    expect(result.reason).toBe("PRICE_IS_REQUIRED_SOURCE_BACKED_CLAIM");
  });
  it("protects a required literal subclaim if deletion would erase it",()=>{
    const statement="Credit monitoring can cost anywhere from $0 to $50 per month";
    const result=inspectUnsupportedPriceSentenceRemovalV1({
      ...base,requiredClaimTexts:[statement],
    });
    expect(result.reason).toBe("PRICE_IS_REQUIRED_SOURCE_BACKED_CLAIM");
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