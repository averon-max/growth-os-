import {describe,expect,it} from "vitest";
import {probeSavedArticleJoinIntegrityV1,
  simulateQueryOwnerBindingWithoutPersistenceV1}
  from "./existing-article-postcommit-integrity-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";

const article={
  title:"What Is Credit Monitoring? How It Works and Its Limits",
  h1:"What Is Credit Monitoring? How It Works and Its Limits",
  metaDescription:"Credit monitoring guide.",
  bodyMarkdown:"## What is credit monitoring?\n\nCredit monitoring tracks report changes.\n\n"+
    "## Does credit monitoring affect your credit score?\n\n"+
    "Checking your credit report does not affect your score. "+
    "[Source](https://www.consumerfinance.gov/example)",
};
const runtime={
  mission:{location:"United States",language:"English",
    jurisdiction:"US",riskClass:"YMYL_FINANCE"},
  queryGraph:{
    version:"QUERY_GRAPH_V1",missionId:"mission-credit",
    missionIntent:"INFORMATIONAL",samePageNodeIds:["real-node-99"],
    nodes:[{id:"real-node-99",query:"does credit monitoring affect credit score",
      cluster:"credit monitoring basics",intent:"INFORMATIONAL",
      subIntent:"credit score impact",sourceConfidence:0.95,searchVolume:40}],
    provenance:[{nodeId:"real-node-99",sources:["DATAFORSEO"]}],
  },
  sectionBlueprints:{sections:[
    {heading:"What is credit monitoring?",queryNodeIds:[],
      requiredClaims:[],evidenceIds:[]},
    {heading:"Does credit monitoring affect your credit score?",
      queryNodeIds:[],requiredClaims:["claim-score"],
      evidenceIds:["ev-score"]},
  ]},
  evidenceGraph:{
    sources:[{id:"score",url:"https://www.consumerfinance.gov/example",
      publisher:"CFPB",sourceType:"PRIMARY_GOVERNMENT"}],
    claimEvidence:[{id:"ev-score",claimId:"claim-score",sourceId:"score",
      kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
      excerpt:"Checking your own credit report does not lower your credit score."}],
  },
} as unknown as MasterRuntimeSnapshotV1;
const plan={requiredQuestions:[],sections:[
  {state:"WRITABLE",heading:"What is credit monitoring?"},
  {state:"WRITABLE",heading:"Does credit monitoring affect your credit score?"},
]} as unknown as ArticleExecutionPlanV1;
describe("independent saved source text detection",()=>{
  it("detects earlier log's literal merged words without trusting copyedit preview",()=>{
    const text="Many creditcard companies allow score viewing, "+
      "keeping thereview focused on informationyou can access. "+
      "This is relevant toa particular applicant.";
    const report=probeSavedArticleJoinIntegrityV1(text);
    expect(report.exactLiteralHits.map(x=>x.token))
      .toEqual(["creditcard","thereview","informationyou","toa"]);
    expect(report.totalLiteralHits).toBe(4);
    expect(report.independentScannerDisagrees).toBe(false);
  });
  it("does not mark clean article as needing correction",()=>{
    const report=probeSavedArticleJoinIntegrityV1(
      "Many credit card companies let customers review their own scores.");
    expect(report.totalLiteralHits).toBe(0);
  });
});
describe("immutable in-memory QueryGraph owner rebind simulation",()=>{
  it("removes ONLY the missing binding finding when the real node is virtually assigned",()=>{
    const input={article,runtime,plan,
      primaryKeyword:"what is credit monitoring",
      secondaryKeywords:[] as string[],replay:null};
    const before=JSON.stringify(runtime);
    const result=simulateQueryOwnerBindingWithoutPersistenceV1(input);
    expect(result.eligible).toBe(true);
    if(result.eligible){
      expect(result.queryNodeId).toBe("real-node-99");
      expect(result.warningWouldClear).toBe(true);
      expect(result.beforeFindingCodes).toContain("QUERY_BINDING_REVIEW_REQUIRED");
      expect(result.afterFindingCodes).not.toContain("QUERY_BINDING_REVIEW_REQUIRED");
      expect(result.researchUnchanged).toBe(true);
      expect(result.databaseUnchanged).toBe(true);
    }
    expect(JSON.stringify(runtime)).toBe(before);
    expect(runtime.sectionBlueprints.sections[1]!.queryNodeIds).toEqual([]);
  });
  it("does not claim binding is approved when evidence absent",()=>{
    const changed={...runtime,evidenceGraph:{sources:[],claimEvidence:[]}}
      as unknown as MasterRuntimeSnapshotV1;
    const result=simulateQueryOwnerBindingWithoutPersistenceV1({
      article,runtime:changed,plan,
      primaryKeyword:"what is credit monitoring",
      secondaryKeywords:[],replay:null,
    });
    expect(result.eligible).toBe(false);
    expect(result.researchUnchanged).toBe(true);
  });
});
