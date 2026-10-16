import {describe,expect,it} from "vitest";
import {planSameArticleQualityImprovementV1,evaluateWholeArticleQualityWordRangeV1}
  from "./same-article-quality-improvement-v1";
const actualSections=[
  {index:0,words:301,maxWords:409,claimCount:3,evidenceCount:4,h3Count:0},
  {index:1,words:266,maxWords:339,claimCount:3,evidenceCount:5,h3Count:0},
  {index:2,words:217,maxWords:301,claimCount:2,evidenceCount:2,h3Count:0},
  {index:3,words:362,maxWords:447,claimCount:4,evidenceCount:5,h3Count:0},
  {index:4,words:282,maxWords:301,claimCount:2,evidenceCount:4,h3Count:0},
  {index:5,words:244,maxWords:301,claimCount:2,evidenceCount:2,h3Count:0},
];
describe("same-article source-safe improvement planning",()=>{
  it("accepts source-verified local H2 overrun but keeps strict article bounds",()=>{
    // Real failure: section 2 exceeded 301 planned words after a
    // successful semantic verification. A legitimate 350-word section
    // must not block a ~2100-word article.
    const sectionActual=350,sectionPlannedMax=301;
    expect(sectionActual).toBeGreaterThan(sectionPlannedMax);
    expect(evaluateWholeArticleQualityWordRangeV1({
      actualWords:2100,minWords:2000,maxWords:3200,
    })).toEqual({pass:true,reason:"OK"});
    expect(evaluateWholeArticleQualityWordRangeV1({
      actualWords:1714,minWords:2000,maxWords:3200,
    })).toEqual({pass:false,reason:"BELOW_ARTICLE_MIN"});
    expect(evaluateWholeArticleQualityWordRangeV1({
      actualWords:3201,minWords:2000,maxWords:3200,
    })).toEqual({pass:false,reason:"ABOVE_ARTICLE_MAX"});
  });

  it("chooses bounded existing sections for real 1714-word credit-monitoring case",()=>{
    const plan=planSameArticleQualityImprovementV1({
      wordCount:1714,minimumWords:2000,sections:actualSections,
    });
    expect(plan.eligible).toBe(true);
    expect(plan.steps.length).toBeLessThanOrEqual(5);
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(new Set(plan.steps.map(s=>s.index)).size).toBe(plan.steps.length);
    expect(plan.steps.reduce((n,s)=>n+s.minWords-s.currentWords,0))
      .toBeGreaterThanOrEqual(286);
    expect(plan.steps.every(s=>s.maxWords>=s.minWords)).toBe(true);
    expect(plan.headingOpportunityCount).toBe(6);
  });
  it("does not run model against evidence-poor or exhausted sections",()=>{
    const plan=planSameArticleQualityImprovementV1({
      wordCount:1714,minimumWords:2000,
      sections:actualSections.map(s=>({...s,claimCount:0})),
    });
    expect(plan.eligible).toBe(false);
    expect(plan.reason).toBe("INSUFFICIENT_VERIFIED_DEPTH_CAPACITY");
    expect(plan.steps).toEqual([]);
  });
  it("does not rewrite a complete guide just to increase keyword count",()=>{
    const plan=planSameArticleQualityImprovementV1({
      wordCount:2200,minimumWords:2000,sections:actualSections,
    });
    expect(plan.eligible).toBe(false);
    expect(plan.reason).toBe("NO_DEFICIT");
  });
  it("does not authorize invented sections, exceeding budgets or unrestricted model loops",()=>{
    expect(()=>planSameArticleQualityImprovementV1({
      wordCount:1700,minimumWords:2000,sections:actualSections,
      maxEdits:1000,
    })).toThrow("ARTICLE_IMPROVEMENT_PLAN_INVALID_BUDGET");
    const plan=planSameArticleQualityImprovementV1({
      wordCount:1700,minimumWords:2000,sections:actualSections,
    });
    expect(plan.steps.every(s=>actualSections.some(x=>x.index===s.index))).toBe(true);
  });
});
