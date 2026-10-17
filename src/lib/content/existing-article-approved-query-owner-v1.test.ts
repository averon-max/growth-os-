import {describe,expect,it} from "vitest";
import {evaluateApprovedExistingArticleQueryOwnerV1,
  HUMAN_OWNER_APPROVAL_ATTESTATION_V1}
  from "./existing-article-approved-query-owner-v1";
import {proposeExistingArticleQueryOwnerRebindV1}
  from "./existing-article-query-owner-proposal-v1";
import {buildSerpReplayArticleFingerprintV1}
  from "./serp-replay-fingerprint";
import type {MasterRuntimeSnapshotV1}
  from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1}
  from "./article-execution-plan-v1";

const article={
  title:"What Is Credit Monitoring?",
  metaDescription:"Learn whether monitoring affects your credit score.",
  h1:"What Is Credit Monitoring?",
  bodyMarkdown:"## What is credit monitoring?\n\nReports can be monitored.\n\n"+
    "## Does credit monitoring affect your credit score?\n\n"+
    "Looking at your own report does not lower your score. "+
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
    version:"QUERY_GRAPH_V1",missionId:"credit",
    missionIntent:"INFORMATIONAL",samePageNodeIds:["existing-real-node"],
    nodes:[{id:"existing-real-node",
      query:"does credit monitoring affect credit score",
      cluster:"credit monitoring basics",intent:"INFORMATIONAL",
      subIntent:"credit score",sourceConfidence:0.9,searchVolume:40}],
    provenance:[{nodeId:"existing-real-node",sources:["DATAFORSEO"]}],
  },
  sectionBlueprints:{sections:[
    {heading:"What is credit monitoring?",queryNodeIds:[],
      requiredClaims:[],evidenceIds:[]},
    {heading:"Does credit monitoring affect your credit score?",
      queryNodeIds:[],requiredClaims:["claim1"],evidenceIds:["ev1"]},
  ]},
  evidenceGraph:{
    sources:[{id:"s1",publisher:"CFPB",sourceType:"PRIMARY_GOVERNMENT",
      url:"https://www.consumerfinance.gov/example"}],
    claimEvidence:[{id:"ev1",claimId:"claim1",sourceId:"s1",
      kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
      excerpt:"Requesting a copy of your credit report does not hurt your score."}],
  },
} as unknown as MasterRuntimeSnapshotV1;
const fingerprint=buildSerpReplayArticleFingerprintV1(article);
const replay={executionStatus:"SUCCEEDED",replayStatus:"WARN",
  articleFingerprint:fingerprint,articleFingerprintAlgo:"SHA256_V1",
  warnings:["SERP_REPLAY_MISSING_DATA:historical-result"],blockers:[]};
const props={articleId:"article-one",evidenceSnapshotId:"evidence-one",
  replayArtifactId:"replay-one",article,runtime,plan,
  primaryKeyword:"what is credit monitoring",secondaryKeywords:[],replay};
const proposal=proposeExistingArticleQueryOwnerRebindV1(props);
const candidate=proposal.proposals[0]!;
const record={
  decisionVersion:"QUERY_OWNER_HUMAN_APPROVAL_V1",decision:"APPROVED",
  contentArticleId:props.articleId,evidenceSnapshotId:props.evidenceSnapshotId,
  sourceReplayArtifactId:props.replayArtifactId,
  queryNodeId:candidate.nodeId,observedQuery:candidate.observedQuery,
  ownerSectionIndex:candidate.proposedOwnerSectionIndex,
  ownerHeading:candidate.proposedOwnerH2,
  sourceArticleFingerprint:proposal.sourceArticleFingerprint,
  sourceQueryGraphSha256:proposal.sourceQueryGraphSha256,
  sourceSectionBlueprintSha256:proposal.sourceSectionBlueprintSha256,
  sourceExecutionPlanSha256:proposal.sourceExecutionPlanSha256,
  reviewerAttestation:HUMAN_OWNER_APPROVAL_ATTESTATION_V1,
};
describe("approved owner overlay cannot alter signed research",()=>{
  it("applies exact human-reviewed node to the in-memory copy only",()=>{
    const before=JSON.stringify(runtime);
    const result=evaluateApprovedExistingArticleQueryOwnerV1({
      ...props,review:record,
    });
    expect(result.valid).toBe(true);
    if(!result.valid)throw new Error("EXPECTED_REVIEW_VALID");
    expect(result.runtime.sectionBlueprints.sections[1]?.queryNodeIds)
      .toEqual(["existing-real-node"]);
    expect(runtime.sectionBlueprints.sections[1]?.queryNodeIds).toEqual([]);
    expect(JSON.stringify(runtime)).toBe(before);
    expect(result.originalResearchChanged).toBe(false);
  });
  it("rejects changed article, replay, evidence, node or missing attestation",()=>{
    const variants=[
      {review:{...record,sourceArticleFingerprint:"0".repeat(64)}},
      {review:{...record,sourceReplayArtifactId:"different"}},
      {review:{...record,sourceExecutionPlanSha256:"0".repeat(64)}},
      {review:{...record,queryNodeId:"guessed-node"}},
      {review:{...record,reviewerAttestation:"UNVERIFIED"}},
      {review:{...record,evidenceSnapshotId:"another"}},
    ];
    for(const variant of variants){
      expect(evaluateApprovedExistingArticleQueryOwnerV1({
        ...props,...variant,
      }).valid).toBe(false);
    }
  });
  it("never upgrades to approved from the what-if proposal alone",()=>{
    expect(evaluateApprovedExistingArticleQueryOwnerV1({
      ...props,review:null,
    }).valid).toBe(false);
  });
});
