import {describe,expect,it} from "vitest";
import {analyzeArticle} from "./article-analyzer";
import {evaluateResearchRecoveryKeywordPolicyV1}
  from "./research-recovery-keyword-policy-v1";

const primary="credit monitoring";
const secondaries=[
  "credit monitoring alerts",
  "credit monitoring services",
  "identity theft monitoring",
  "credit report errors",
  "fraud alert",
];
const analyse=(bodyMarkdown:string,h1=primary)=>
  analyzeArticle({
    title:"Credit Monitoring Explained",h1,bodyMarkdown,
    primaryKeyword:primary,secondaryKeywords:secondaries,targets:null,
  });

describe("same-article SEO recovery keyword safeguards",()=>{
  const old=analyse(
    "Credit monitoring lets readers see credit monitoring alerts. "+
    "Credit monitoring services can be compared with identity theft monitoring. "+
    "Credit report errors and fraud alert issues are discussed.",
  );
  it("accepts a factually stronger article missing one optional exact variant, preserving primary and 80 percent coverage",()=>{
    const current=analyse(
      "Credit monitoring services check changes to your credit reports. "+
      "Credit monitoring alerts may require reviewing credit report errors. "+
      "Identity theft monitoring is a different service.",
    );
    const result=evaluateResearchRecoveryKeywordPolicyV1({
      previous:old,current,
    });
    expect(result.planned).toBe(6);
    expect(result.used).toBe(5);
    expect(result.requiredUsed).toBe(5);
    expect(result.pass).toBe(true);
    expect(result.lostPreviouslyUsed).toEqual(["fraud alert"]);
    expect(result.primaryInBody).toBe(true);
  });
  it("never turns missing primary prose placement into a free pass",()=>{
    const next=analyse(
      "Credit monitoring alerts can identify credit report errors. "+
      "Credit monitoring services and identity theft monitoring differ. "+
      "A fraud alert is an additional concept.",
    );
    // Primary exact phrase is included as a substring of variants only
    // when bounded: analyzer canonical exact-phrase counting decides.
    const broken=analyse(
      "Identity theft monitoring, credit report errors, and fraud alert "+
      "concepts are covered in this article.",
      "A Guide to Credit Reporting",
    );
    expect(evaluateResearchRecoveryKeywordPolicyV1({
      previous:old,current:broken,
    }).pass).toBe(false);
    expect(next.keywordCoverage.used).toBeGreaterThan(0);
  });
  it("blocks keyword coverage below the minimum regardless of the old draft",()=>{
    const sparse=analyse("Credit monitoring is a tool to review your report.");
    const decision=evaluateResearchRecoveryKeywordPolicyV1({
      previous:old,current:sparse,
    });
    expect(decision.pass).toBe(false);
    expect(decision.used).toBe(1);
    expect(decision.requiredUsed).toBe(5);
  });
  it("preserves all originally covered keyword variants when present",()=>{
    const decision=evaluateResearchRecoveryKeywordPolicyV1({
      previous:old,current:old,
    });
    expect(decision.pass).toBe(true);
    expect(decision.lostPreviouslyUsed).toEqual([]);
    expect(decision.regressedAgainstPrevious).toBe(false);
  });
});