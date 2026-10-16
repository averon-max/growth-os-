import {describe,expect,it} from "vitest";
import {proposeExistingArticleQueryOwnerRebindV1}
  from "./existing-article-query-owner-proposal-v1";
import type {MasterRuntimeSnapshotV1}
  from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1}
  from "./article-execution-plan-v1";

const article={
  title:"What Is Credit Monitoring? How It Works and Its Limits",
  h1:"What Is Credit Monitoring? How It Works and Its Limits",
  metaDescription:"Learn how credit monitoring works.",
  bodyMarkdown:"## What is credit monitoring?\n\nCredit monitoring tracks changes.\n\n"+
    "## Does credit monitoring affect your credit score?\n\n"+
    "Reviewing a credit report does not hurt the score. "+
    "[Source](https://www.consumerfinance.gov/example)",
};
const plan={sections:[
  {state:"WRITABLE",heading:"What is credit monitoring?"},
  {state:"WRITABLE",heading:"Does credit monitoring affect your credit score?"},
],requiredQuestions:[]} as unknown as ArticleExecutionPlanV1;
const runtime={
  mission:{location:"United States",language:"English",
    jurisdiction:"US",riskClass:"YMYL_FINANCE"},
  queryGraph:{
    version:"QUERY_GRAPH_V1",missionId:"mission-credit",missionIntent:"INFORMATIONAL",
    samePageNodeIds:["real-node-99"],
    nodes:[{id:"real-node-99",
      query:"does credit monitoring affect credit score",
      cluster:"credit monitoring basics",intent:"INFORMATIONAL",
      subIntent:"credit score impact",sourceConfidence:0.95,
      searchVolume:40}],
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
    sources:[{id:"source-score",url:"https://www.consumerfinance.gov/example",
      publisher:"CFPB",sourceType:"PRIMARY_GOVERNMENT"}],
    claimEvidence:[{id:"ev-score",claimId:"claim-score",
      sourceId:"source-score",kind:"VERIFIED_EXCERPT",
      relation:"SUPPORTS",excerpt:"Checking your own credit report does not lower your credit score."}],
  },
} as unknown as MasterRuntimeSnapshotV1;
const props=(r=runtime,p=plan,a=article)=>({
  article:a,runtime:r,plan:p,primaryKeyword:"what is credit monitoring",
  secondaryKeywords:[] as string[],replay:null,
});
describe("versioned existing article query ownership PROPOSAL, no mutation",()=>{
  it("proposes real same-page DataForSEO query node ID for unique evidenced exact H2",()=>{
    const res=proposeExistingArticleQueryOwnerRebindV1(props());
    expect(res.candidateCount).toBe(1);
    expect(res.proposals[0]).toMatchObject({
      nodeId:"real-node-99",
      observedQuery:"does credit monitoring affect credit score",
      proposedOwnerSectionIndex:1,
      proposedOwnerH2:"Does credit monitoring affect your credit score?",
      organicSearchVolume:40,
      confidence:"EXACT_AFTER_POSSESSIVE_NORMALIZATION",
    });
    expect(res.canClaimQueryBindingResolved).toBe(false);
    expect(res.signedResearchUpdated).toBe(false);
    expect(res.databaseUnchanged).toBe(true);
  });
  it("rejects fabricated keyword demand and duplicate existing owner",()=>{
    const noProof={...runtime,queryGraph:{...runtime.queryGraph,
      provenance:[{nodeId:"real-node-99",sources:["AI_MODEL"]}],
    }} as unknown as MasterRuntimeSnapshotV1;
    expect(proposeExistingArticleQueryOwnerRebindV1(
      props(noProof)).candidateCount).toBe(0);
    const alreadyOwned={...runtime,sectionBlueprints:{sections:[
      {heading:"What is credit monitoring?",queryNodeIds:[]},
      {heading:"Does credit monitoring affect your credit score?",
        queryNodeIds:["real-node-99"]},
    ]}} as unknown as MasterRuntimeSnapshotV1;
    const owned=proposeExistingArticleQueryOwnerRebindV1(props(alreadyOwned));
    expect(owned.candidateCount).toBe(0);
  });
  it("rejects a changed planning heading instead of silently retargeting",()=>{
    const different={sections:[
      {state:"WRITABLE",heading:"What is credit monitoring?"},
      {state:"WRITABLE",heading:"Does a new credit card impact your score?"},
    ],requiredQuestions:[]} as unknown as ArticleExecutionPlanV1;
    expect(proposeExistingArticleQueryOwnerRebindV1(
      props(runtime,different)).candidateCount).toBe(0);
  });
});